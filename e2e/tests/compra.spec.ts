// O caminho do dinheiro: escolher ingresso, titulares, pagar, ver o QR, devolver e transferir.
import type { Page } from "@playwright/test";
import { api, buyPaid, cpf, fmtCpf, newBuyer } from "../api";
import { audit, expect, loggedBuyer, state, test } from "../fixtures";

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\s/g, " ");
const norm = (s: string) => s.replace(/\s/g, " ");

async function addTickets(page: Page, lot: string, n: number) {
  for (let i = 0; i < n; i++) await page.getByRole("button", { name: `Adicionar um ingresso ${lot}` }).click();
}
async function continuar(page: Page) {
  // No celular existe também a barra fixa de baixo; o botão do quadro de ingressos é o principal.
  await page.locator("#ingressos").getByRole("button", { name: /continuar|entrar para comprar/i }).click();
}
async function fillHolders(page: Page, holders: { name: string; cpf: string }[], accept = true) {
  const names = page.getByPlaceholder("Nome completo");
  const cpfs = page.getByPlaceholder("CPF");
  for (let i = 0; i < holders.length; i++) {
    await names.nth(i).fill(holders[i]!.name);
    await cpfs.nth(i).fill(holders[i]!.cpf);
  }
  if (accept) await page.locator("#ingressos input[type=checkbox]").last().check();
  await page.getByRole("button", { name: /ir para pagamento/i }).click();
}

test("compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem", async ({ page, ip, issues }) => {
  void issues;
  const s = state();
  const me = await loggedBuyer(page, ip);
  await page.goto(`/eventos/${s.main.id}`);
  await addTickets(page, "Pista — 1º lote", 2);
  // Conta: 2 × R$ 50 = R$ 100 + 11% = R$ 111
  await expect(page.locator("#ingressos")).toContainText(norm(brl(11100)));
  await continuar(page);
  await fillHolders(page, [{ name: me.name, cpf: fmtCpf(me.cpf) }, { name: "Amigo Teste Silva", cpf: fmtCpf(cpf()) }]);
  await expect(page).toHaveURL(/checkout/);
  await expect(page.locator("main")).toContainText(norm(brl(11100)));
  await audit(page, "checkout");
  await page.getByRole("button", { name: "Simular pagamento aprovado" }).click();
  await expect(page.getByText(/aprovad|confirmad|pago/i).first()).toBeVisible();
  await page.goto("/ingressos");
  await expect(page.getByText(s.main.title).first()).toBeVisible();
  await expect(page.locator("article")).toHaveCount(2);
  await expect(page.locator("article canvas, article svg, article img[alt*=QR i]").first()).toBeVisible();
  await audit(page, "meus ingressos com 2 ingressos");
});

test("misturar Pista, Meia e Camarote na mesma compra soma certo", async ({ page, ip }) => {
  const s = state();
  await loggedBuyer(page, ip);
  await page.goto(`/eventos/${s.main.id}`);
  await addTickets(page, "Pista — 1º lote", 1);
  await addTickets(page, "Meia-entrada — 1º lote", 1);
  await addTickets(page, "Camarote — 1º lote", 1);
  // 50 + 25 + 120 = 195; +11% = 216,45
  await expect(page.locator("#ingressos")).toContainText(norm(brl(21645)));
  await page.getByRole("button", { name: "Tirar um ingresso Camarote — 1º lote" }).click();
  await expect(page.locator("#ingressos")).toContainText(norm(brl(8325)));
});

test("sem conta: 'Entrar para comprar' leva ao login e volta para o evento", async ({ page }) => {
  const s = state();
  const b = await newBuyer();
  await page.goto(`/eventos/${s.main.id}`);
  await addTickets(page, "Pista — 1º lote", 1);
  await continuar(page);
  await expect(page).toHaveURL(/entrar/);
  await page.getByLabel("E-mail").fill(b.email);
  await page.getByLabel("Senha", { exact: true }).fill(b.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(new RegExp(s.main.id));
});

test("titular com CPF inválido: mostra erro e não cria pedido", async ({ page, ip }) => {
  const s = state();
  await loggedBuyer(page, ip);
  await page.goto(`/eventos/${s.main.id}`);
  await addTickets(page, "Pista — 1º lote", 1);
  await continuar(page);
  await fillHolders(page, [{ name: "Fulano de Tal", cpf: "111.111.111-11" }]);
  await expect(page.getByText(/cpf/i).filter({ hasText: /inválid|confira/i }).first()).toBeVisible();
  await expect(page).not.toHaveURL(/checkout/);
});

test("sem marcar o aceite dos Termos não vai para o pagamento", async ({ page, ip }) => {
  const s = state();
  const me = await loggedBuyer(page, ip);
  await page.goto(`/eventos/${s.main.id}`);
  await addTickets(page, "Pista — 1º lote", 1);
  await continuar(page);
  await fillHolders(page, [{ name: me.name, cpf: fmtCpf(me.cpf) }], false);
  await page.waitForTimeout(800);
  await expect(page).not.toHaveURL(/checkout/);
});

test("mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso", async ({ page, ip }) => {
  const s = state();
  const me = await loggedBuyer(page, ip);
  await page.goto(`/eventos/${s.main.id}`);
  await addTickets(page, "Pista — 1º lote", 5);
  await continuar(page);
  const h = { name: me.name, cpf: fmtCpf(me.cpf) };
  await fillHolders(page, [h, h, h, h, h]);
  await expect(page.locator("#ingressos").getByText(/cpf|limite|máximo/i).first()).toBeVisible();
  await expect(page).not.toHaveURL(/checkout/);
});

test("cupom QA10 dá 10% de desconto e cupom errado mostra erro", async ({ page, ip }) => {
  const s = state();
  await loggedBuyer(page, ip);
  await page.goto(`/eventos/${s.main.id}`);
  await addTickets(page, "Pista — 1º lote", 2);
  await page.getByRole("button", { name: /tenho um cupom/i }).click();
  const box = page.getByPlaceholder("Código do cupom");
  await box.fill("NAOEXISTE");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.locator("#ingressos .text-destructive").first()).toBeVisible();
  await box.fill("qa10");
  await page.getByRole("button", { name: "Aplicar" }).click();
  // 100 - 10 = 90; taxa 11% de 90 = 9,90 → 99,90 (ou taxa sobre 100 = 11 → 101). Confere que o total mudou.
  await expect(page.locator("#ingressos")).toContainText("Cupom QA10");
  await expect(page.locator("#ingressos")).not.toContainText(norm(brl(11100)));
});

test("evento esgotado não deixa comprar e avisa", async ({ page, ip }) => {
  const s = state();
  await loggedBuyer(page, ip);
  await page.goto(`/eventos/${s.soldOut.id}`);
  await expect(page.getByText(/esgotad/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Adicionar um ingresso/ })).toHaveCount(0);
});

test("últimos ingressos: não deixa escolher mais do que tem", async ({ page, ip }) => {
  const s = state();
  await loggedBuyer(page, ip);
  await page.goto(`/eventos/${s.few.id}`);
  const plus = page.getByRole("button", { name: "Adicionar um ingresso Pista — 1º lote" });
  for (let i = 0; i < 6; i++) if (await plus.isEnabled()) await plus.click();
  const n = Number(await page.locator("#ingressos [aria-live=polite]").first().innerText());
  expect(n).toBeLessThanOrEqual(3);
});

test("evento privado: senha errada não libera, senha certa libera os ingressos", async ({ page, ip }) => {
  const s = state();
  await loggedBuyer(page, ip);
  await page.goto(`/eventos/${s.priv.id}`);
  const code = page.getByPlaceholder("Palavra-senha");
  await code.fill("errada");
  await page.getByRole("button", { name: "Liberar" }).click();
  await expect(page.getByText(/palavra-senha incorreta/i).first()).toBeVisible();
  await code.fill("segredo");
  await page.getByRole("button", { name: "Liberar" }).click();
  await expect(page.getByRole("button", { name: "Adicionar um ingresso Pista — 1º lote" })).toBeEnabled();
});

test("evento grátis: dá para pegar ingresso sem pagar", async ({ page, ip }) => {
  const s = state();
  const me = await loggedBuyer(page, ip);
  await page.goto(`/eventos/${s.free.id}`);
  // Evento com um tipo só já vem com 1 ingresso escolhido.
  const qty = page.locator("#ingressos [aria-live=polite]").first();
  if ((await qty.innerText()).trim() === "0") await addTickets(page, "Gratuito — 1º lote", 1);
  await continuar(page);
  await fillHolders(page, [{ name: me.name, cpf: fmtCpf(me.cpf) }]);
  await expect(page).toHaveURL(/checkout/);
  await expect(page.getByText(/pagamento confirmado|ingressos .* disponíveis/i).first()).toBeVisible();
  await page.goto("/ingressos");
  await expect(page.getByText(s.free.title).first()).toBeVisible();
});

test("clique duplo em 'Ir para pagamento' não cria dois pedidos", async ({ page, ip }) => {
  const s = state();
  const me = await loggedBuyer(page, ip);
  await page.goto(`/eventos/${s.main.id}`);
  await addTickets(page, "Pista — 1º lote", 1);
  await continuar(page);
  await page.getByPlaceholder("Nome completo").first().fill(me.name);
  await page.getByPlaceholder("CPF").first().fill(fmtCpf(me.cpf));
  await page.locator("#ingressos input[type=checkbox]").last().check();
  await page.getByRole("button", { name: /ir para pagamento/i }).dblclick();
  await expect(page).toHaveURL(/checkout/);
  const orders = await api<any[]>("/orders", { token: me.token });
  const pending = (orders.body ?? []).filter((o: any) => o.status === "pending");
  expect(pending.length, "pedidos criados com o clique duplo").toBe(1);
});

test("voltar do pagamento e cancelar o pedido devolve os ingressos", async ({ page, ip }) => {
  const s = state();
  const me = await loggedBuyer(page, ip);
  await page.goto(`/eventos/${s.main.id}`);
  await addTickets(page, "Camarote — 1º lote", 1);
  await continuar(page);
  await fillHolders(page, [{ name: me.name, cpf: fmtCpf(me.cpf) }]);
  await expect(page).toHaveURL(/checkout/);
  await page.getByRole("button", { name: "Cancelar pedido" }).click();
  await expect(page.getByText(/cancelad/i).first()).toBeVisible();
});

test("recarregar a página do pagamento não perde o pedido", async ({ page, ip }) => {
  const s = state();
  const me = await loggedBuyer(page, ip);
  await page.goto(`/eventos/${s.main.id}`);
  await addTickets(page, "Pista — 1º lote", 1);
  await continuar(page);
  await fillHolders(page, [{ name: me.name, cpf: fmtCpf(me.cpf) }]);
  await expect(page).toHaveURL(/checkout/);
  await page.reload();
  await expect(page.getByRole("button", { name: "Simular pagamento aprovado" })).toBeVisible();
});

test("pedido de outra pessoa não abre", async ({ page, ip, issues }) => {
  const s = state();
  const other = await newBuyer();
  const o = await api<{ id: string }>("/orders", { token: other.token, body: { eventId: s.main.id, items: [{ batchId: s.main.pista, holders: [{ name: other.name, cpf: other.cpf }] }], acceptTerms: true } });
  await loggedBuyer(page, ip);
  await page.goto(`/checkout/${o.body.id}`);
  await expect(page.getByRole("button", { name: "Simular pagamento aprovado" })).toHaveCount(0);
  issues.network.length = 0;
});

test("devolver a compra em Meus ingressos cancela os ingressos", async ({ page, ip }) => {
  const s = state();
  const me = await loggedBuyer(page, ip);
  await buyPaid(me.token, s.main.id, s.main.pista, [{ name: me.name, cpf: me.cpf }]);
  await page.goto("/ingressos");
  await expect(page.locator("article")).toHaveCount(1);
  await page.getByRole("button", { name: "Devolver esta compra" }).click();
  await page.getByRole("button", { name: "Confirmar devolução" }).click();
  await expect(page.getByText(/devolução feita/i).first()).toBeVisible();
  await expect(page.locator("article")).toHaveCount(0, { timeout: 15_000 });
});

test("transferir ingresso: a outra pessoa recebe e aceita", async ({ browser, page, ip }) => {
  const s = state();
  const me = await loggedBuyer(page, ip);
  const friend = await newBuyer("amigo");
  await buyPaid(me.token, s.main.id, s.main.pista, [{ name: me.name, cpf: me.cpf }]);
  await page.goto("/ingressos");
  await page.getByRole("button", { name: /transferir/i }).first().click();
  await page.getByPlaceholder(/cpf/i).last().fill(fmtCpf(friend.cpf));
  await page.getByRole("button", { name: /enviar|transferir|confirmar/i }).last().click();
  await expect(page.getByText(/aguardando|enviad|pendente/i).first()).toBeVisible();

  const ctx = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const p2 = await ctx.newPage();
  await p2.request.post("/api/v1/auth/login", { data: { email: friend.email, password: friend.password } });
  await p2.goto("/ingressos");
  await p2.getByRole("button", { name: /aceitar/i }).first().click();
  await expect(p2.locator("article").filter({ hasText: s.main.title })).toHaveCount(1);
  await ctx.close();
});

test("nomes com acento, emoji e muito compridos aparecem direito no ingresso", async ({ page, ip }) => {
  const s = state();
  const me = await loggedBuyer(page, ip);
  const names = ["José Antônio da Conceição Ñuñez", "Maria 🎉 da Festa", "A".repeat(110)];
  for (const n of names) {
    const c = cpf();
    await buyPaid(me.token, s.main.id, s.main.meia, [{ name: n, cpf: c }]);
  }
  await page.goto("/ingressos");
  for (const n of names.slice(0, 2)) await expect(page.getByText(n).first()).toBeVisible();
  await audit(page, "ingressos com nomes difíceis");
});

test("nome de titular com código malicioso não roda no navegador (XSS)", async ({ page, ip }) => {
  const s = state();
  const me = await loggedBuyer(page, ip);
  const evil = `<img src=x onerror="window.__xss=1">Hacker`;
  await buyPaid(me.token, s.main.id, s.main.meia, [{ name: evil, cpf: cpf() }]);
  await page.goto("/ingressos");
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
});
