// Base dos testes: cada teste é uma "pessoa" diferente (IP próprio) e coleta, sozinho, os problemas da página:
// erros no console, chamadas que falharam, imagens quebradas, coisas saindo da tela, botões pequenos demais
// para o dedo e problemas graves de acessibilidade.
import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { api, fakeIp, newBuyer, type QaState } from "./api";

export const state = (): QaState => JSON.parse(readFileSync(new URL("./.state.json", import.meta.url), "utf8"));

interface Issues { console: string[]; network: string[] }

export const test = base.extend<{ issues: Issues; ip: string }>({
  ip: async ({}, use) => { await use(fakeIp()); },
  // Automático: vale para todo teste, mesmo os que não pedem "issues".
  issues: [async ({ page }, use, info) => {
    const issues: Issues = { console: [], network: [] };
    // "Failed to load resource" é o navegador avisando de um 4xx esperado (ex.: 401 de quem não entrou); os 5xx são pegos abaixo.
    // Erros que vêm de dentro do mapa do Google (iframe) não são do BooTickets.
    const thirdParty = (t: string) => /google\.com|gstatic|googleapis/.test(t);
    page.on("console", async (m) => {
      if (m.type() !== "error" || m.text().includes("Failed to load resource")) return;
      let t = m.text();
      if (t.includes("JSHandle@")) t = (await Promise.all(m.args().map((a) => a.jsonValue().then((v) => JSON.stringify(v)).catch(() => "?")))).join(" ");
      if (!thirdParty(t)) issues.console.push(t.slice(0, 300));
    });
    page.on("pageerror", (e) => { if (!thirdParty(e.message + (e.stack ?? ""))) issues.console.push(`ERRO JS: ${e.message.slice(0, 300)}`); });
    page.on("response", (r) => {
      const url = r.url();
      // 401 da sessão (quem não está logado) e 4xx esperados nos testes de erro não contam.
      if (r.status() >= 500 || (r.status() === 404 && !url.includes("/api/"))) issues.network.push(`${r.status()} ${r.request().method()} ${url}`);
    });
    page.on("requestfailed", (r) => {
      if (!r.url().startsWith(info.project.use.baseURL ?? "http://localhost:8080")) return; // terceiros (Google Fonts/Maps) não contam
      const err = r.failure()?.errorText ?? "";
      if (!/ERR_ABORTED|NS_BINDING_ABORTED|cancelled|Load request cancelled/i.test(err)) issues.network.push(`FALHOU ${r.url()} (${err})`);
    });
    await use(issues);
    // Falhou? Guarda o texto da tela e o endereço, para entender o que o comprador estava vendo.
    if (info.status !== info.expectedStatus) {
      const text = await page.locator("body").innerText({ timeout: 2000 }).catch(() => "(sem texto)");
      await info.attach("tela", { body: `${page.url()}

${text.slice(0, 1500)}` });
    }
    if (issues.console.length) await info.attach("erros-console", { body: issues.console.join("\n") });
    expect.soft(issues.console, "Erros no console do navegador").toEqual([]);
    expect.soft(issues.network, "Chamadas que falharam (5xx / arquivo não encontrado)").toEqual([]);
  }, { auto: true }],
});
export { expect };

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1200) < 768;

/** Confere a página inteira como um comprador veria. Usa expect.soft: acha vários problemas de uma vez. */
export async function audit(page: Page, label: string) {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  // Rola até o fim para carregar tudo o que aparece ao rolar (animações de entrada, imagens).
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);

  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const overflow = document.documentElement.scrollWidth - vw;
    const wide: string[] = [];
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.position === "fixed") continue;
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      // Algo saindo pela direita da tela (e que não está dentro de uma área com rolagem própria).
      if (b.right > vw + 2) {
        let p: HTMLElement | null = el.parentElement, clipped = false;
        while (p && p !== document.body) {
          const o = getComputedStyle(p).overflowX;
          if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") { clipped = true; break; }
          p = p.parentElement;
        }
        if (!clipped) wide.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.split(" ").slice(0, 3).join(".") : ""} (${Math.round(b.right - vw)}px fora) "${(el.innerText ?? "").slice(0, 40)}"`);
      }
    }
    const broken = Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith("data:")).map((i) => i.src);
    const small: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("button, a[href], input, select, [role=button]"))) {
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (!b.width || !b.height || cs.visibility === "hidden" || el.closest("footer")) continue;
      if (el.tagName === "A" && cs.display === "inline" && el.closest("p, li, span, dd, label")) continue; // link no meio do texto
      if (el.tagName === "INPUT" && el.closest("label")) continue; // a caixa conta junto com o texto dela
      if (b.height < 24 || b.width < 24) small.push(`${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 30)}" ${Math.round(b.width)}x${Math.round(b.height)}`);
    }
    const noName = Array.from(document.querySelectorAll<HTMLElement>("button, a[href]"))
      .filter((el) => el.getBoundingClientRect().width > 0 && !(el.innerText || "").trim() && !el.getAttribute("aria-label") && !el.getAttribute("title") && !el.querySelector("img[alt]:not([alt=''])"))
      .map((el) => el.outerHTML.slice(0, 120));
    return { overflow, wide: wide.slice(0, 8), broken, small: small.slice(0, 10), noName: noName.slice(0, 5), title: document.title };
  });

  expect.soft(r.overflow, `[${label}] A página tem rolagem para o lado (${r.overflow}px a mais que a tela). Elementos: ${r.wide.join(" | ")}`).toBeLessThanOrEqual(1);
  expect.soft(r.wide, `[${label}] Elementos saindo da tela`).toEqual([]);
  expect.soft(r.broken, `[${label}] Imagens quebradas`).toEqual([]);
  expect.soft(r.noName, `[${label}] Botões/links sem texto nem nome (leitor de tela não sabe o que é)`).toEqual([]);
  if (isMobile(page)) expect.soft(r.small, `[${label}] Botões pequenos demais para o dedo (menos de 24px)`).toEqual([]);
  expect.soft(r.title.length, `[${label}] Página sem título na aba`).toBeGreaterThan(3);

  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).disableRules(["color-contrast"]).analyze().catch(() => null);
  if (axe) {
    const bad = axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious")
      .map((v) => `${v.id}: ${v.help} (${v.nodes.length}x) ex: ${v.nodes[0]?.target.join(" ")}`);
    expect.soft(bad, `[${label}] Acessibilidade (problemas graves)`).toEqual([]);
  }
}

/** Entra na conta pela API (cookie de sessão fica no navegador) e devolve o comprador. */
export async function loggedBuyer(page: Page, ip: string) {
  const b = await newBuyer();
  const r = await page.request.post("/api/v1/auth/login", { data: { email: b.email, password: b.password }, headers: { "x-forwarded-for": ip } });
  expect(r.status(), "login pela API").toBe(200);
  return b;
}

export { api };
