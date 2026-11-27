// Situações de celular na vida real: sem internet na porta, internet lenta, app instalado, voltar/avançar.
import { buyPaid } from "../api";
import { expect, loggedBuyer, state, test } from "../fixtures";

test("sem internet na porta: o ingresso abre com o QR Code", async ({ page, context, ip, browserName }) => {
  test.skip(browserName === "firefox", "o Firefox do Playwright não simula sem-internet com service worker");
  const s = state();
  const me = await loggedBuyer(page, ip);
  await buyPaid(me.token, s.main.id, s.main.pista, [{ name: me.name, cpf: me.cpf }]);
  await page.goto("/ingressos");
  await expect(page.locator("article")).toHaveCount(1);
  // Espera o app guardar os ingressos e o service worker ficar pronto.
  await page.waitForFunction(() => !!localStorage.getItem("bt-offline-tickets"));
  await page.evaluate(() => navigator.serviceWorker?.ready);
  await context.setOffline(true);
  await page.goto("/ingressos").catch(() => undefined);
  await expect(page.getByText(s.main.title).first()).toBeVisible();
  await expect(page.locator("img.qr, img[alt*='QR']").first()).toBeVisible();
  await context.setOffline(false);
});

test("internet lenta (3G): a página do evento abre e dá para escolher ingresso", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "simulação de 3G só existe no Chrome");
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 50_000, uploadThroughput: 20_000 });
  const s = state();
  const t0 = Date.now();
  await page.goto(`/eventos/${s.main.id}`, { timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Adicionar um ingresso Pista — 1º lote" })).toBeVisible({ timeout: 45_000 });
  test.info().annotations.push({ type: "tempo-3g", description: `${Math.round((Date.now() - t0) / 1000)} s até poder escolher ingresso` });
});

test("voltar e avançar no navegador não quebra a compra", async ({ page, ip }) => {
  const s = state();
  await loggedBuyer(page, ip);
  await page.goto("/");
  await page.goto(`/eventos/${s.main.id}`);
  await page.getByRole("button", { name: "Adicionar um ingresso Pista — 1º lote" }).click();
  await page.goBack();
  await page.goForward();
  await expect(page.getByRole("button", { name: "Adicionar um ingresso Pista — 1º lote" })).toBeVisible();
});

test("manifesto do app e ícones existem (para instalar pelo navegador)", async ({ page }) => {
  await page.goto("/");
  const href = await page.locator("link[rel=manifest]").getAttribute("href");
  expect(href).toBeTruthy();
  const m = await (await page.request.get(href!)).json();
  expect(m.name).toBeTruthy();
  for (const i of m.icons) expect((await page.request.get(i.src)).status(), i.src).toBe(200);
  expect((await page.request.get("/sw.js")).status()).toBe(200);
  expect((await page.request.get("/offline.html")).status()).toBe(200);
});

test("página /app: botão de instalar ou passo a passo aparece no celular", async ({ page, isMobile }) => {
  test.skip(!isMobile, "só no celular");
  await page.goto("/app");
  await expect(page.getByRole("button", { name: /instalar/i }).first()).toBeVisible();
});

test("compartilhar link do evento: a prévia tem título e imagem", async ({ request }) => {
  const s = state();
  const html = await (await request.get(`/eventos/${s.main.id}`)).text();
  expect(html).toMatch(/<meta[^>]+property="og:title"[^>]+QA Festa Principal|QA Festa Principal[^<]*<\/title>/);
  expect(html).toMatch(/property="og:image"/);
});
