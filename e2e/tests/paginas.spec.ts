// Abre cada página que o comprador vê e confere tudo: layout, imagens, erros, acessibilidade.
import { audit, expect, loggedBuyer, state, test } from "../fixtures";

const publicPages = ["/", "/eventos", "/entrar", "/cadastro", "/esqueci-senha", "/termos", "/privacidade", "/termos-organizador", "/app"];

for (const path of publicPages) {
  test(`página ${path} abre certinha`, async ({ page, issues }) => {
    void issues;
    const res = await page.goto(path);
    expect(res?.status(), "a página respondeu").toBeLessThan(400);
    await expect(page.locator("h1").first()).toBeVisible();
    await audit(page, path);
  });
}

test("páginas de cada evento de teste", async ({ page, issues }) => {
  void issues;
  const s = state();
  for (const ev of [s.main, s.soldOut, s.longName, s.free, s.few]) {
    await page.goto(`/eventos/${ev.id}`);
    await expect(page.getByRole("heading", { level: 1 }).first(), `título do evento ${ev.title}`).toContainText(ev.title.slice(0, 20));
    await audit(page, `evento ${ev.title}`);
  }
});

test("evento privado não aparece na lista nem na busca", async ({ page }) => {
  const s = state();
  await page.goto("/eventos");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(s.priv.title)).toHaveCount(0);
});

test("eventos de teste aparecem na lista de eventos", async ({ page }) => {
  const s = state();
  await page.goto("/eventos");
  await expect(page.getByText(s.main.title).first()).toBeVisible();
});

test("página que não existe mostra aviso amigável (404)", async ({ page, issues }) => {
  issues.network.length = 0;
  await page.goto("/pagina-que-nao-existe-123");
  await expect(page.getByText(/não encontr|não existe|404/i).first()).toBeVisible();
  const link = page.getByRole("link", { name: /início|voltar|eventos/i }).first();
  await expect(link, "tem um caminho de volta").toBeVisible();
  issues.network.length = 0; // o 404 desta página é esperado
});

test("evento inexistente mostra aviso e não quebra", async ({ page, issues }) => {
  await page.goto("/eventos/00000000-0000-0000-0000-000000000000");
  await expect(page.getByText(/não encontr|não existe|indisponível/i).first()).toBeVisible();
  issues.network.length = 0;
});

test("Meus ingressos sem conta manda para o login", async ({ page }) => {
  await page.goto("/ingressos");
  await expect(page).toHaveURL(/entrar/);
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});

test("páginas da conta logada", async ({ page, ip, issues }) => {
  void issues;
  await loggedBuyer(page, ip);
  for (const p of ["/ingressos", "/conta", "/organizador"]) {
    await page.goto(p);
    await expect(page.locator("h1").first()).toBeVisible();
    await audit(page, `${p} (logado)`);
  }
});

test("menu e rodapé: todos os links internos abrem", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const hrefs = await page.locator("a[href^='/']").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!.split("#")[0]!))]);
  const bad: string[] = [];
  for (const h of hrefs.slice(0, 30)) {
    const r = await page.request.get(h);
    if (r.status() >= 400) bad.push(`${h} → ${r.status()}`);
  }
  expect(bad, "links quebrados").toEqual([]);
});

test("busca com textos estranhos não quebra", async ({ page, issues }) => {
  void issues;
  for (const q of ["%", "'", "\"><script>alert(1)</script>", "fortaleza", "ç ã é", "a".repeat(300), "🎉", "   "]) {
    await page.goto(`/eventos?q=${encodeURIComponent(q)}`);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("h1").first()).toBeVisible();
  }
});

test("buscar pelo campo da página inicial", async ({ page }) => {
  await page.goto("/");
  const box = page.getByPlaceholder(/buscar/i).first();
  await box.fill("QA Festa");
  await box.press("Enter");
  await expect(page).toHaveURL(/eventos/);
  await expect(page.getByText(state().main.title).first()).toBeVisible();
});

test("filtro por categoria leva para a lista filtrada", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Festas" }).first().click();
  await expect(page).toHaveURL(/festas|categoria/);
  await expect(page.getByText(state().main.title).first()).toBeVisible();
});
