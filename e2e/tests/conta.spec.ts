// Cadastro, login, sair e "esqueci a senha" pela tela, com erros comuns de quem digita.
import { cpf, fmtCpf, newBuyer } from "../api";
import { expect, test } from "../fixtures";

const uniq = () => `tela-${Date.now()}-${Math.floor(Math.random() * 1e6)}@teste.dev`;

async function fillRegister(page: import("@playwright/test").Page, d: { name: string; email: string; cpf: string; password: string }) {
  await page.getByLabel("Nome completo").fill(d.name);
  await page.getByLabel("E-mail").fill(d.email);
  await page.getByLabel("CPF").fill(d.cpf);
  await page.getByLabel("Senha", { exact: true }).fill(d.password);
  await page.getByRole("button", { name: "Criar conta" }).click();
}

test("cadastro novo pela tela entra direto na conta", async ({ page }) => {
  await page.goto("/cadastro");
  await fillRegister(page, { name: "Maria Teste da Silva", email: uniq(), cpf: fmtCpf(cpf()), password: "senhaforte123" });
  await expect(page).not.toHaveURL(/cadastro/);
  await page.goto("/ingressos");
  await expect(page.getByText(/você ainda não tem ingressos/i)).toBeVisible();
});

test("cadastro com CPF digitado sem pontos também funciona", async ({ page }) => {
  await page.goto("/cadastro");
  await fillRegister(page, { name: "João Sem Pontos", email: uniq(), cpf: cpf(), password: "senhaforte123" });
  await expect(page).not.toHaveURL(/cadastro/);
});

test("cadastro com CPF inválido mostra erro claro", async ({ page }) => {
  await page.goto("/cadastro");
  await fillRegister(page, { name: "Pedro Erro", email: uniq(), cpf: "123.456.789-00", password: "senhaforte123" });
  await expect(page.getByText(/cpf/i).filter({ hasText: /inválid|confira/i }).first()).toBeVisible();
});

test("cadastro com e-mail já usado avisa", async ({ page }) => {
  const b = await newBuyer();
  await page.goto("/cadastro");
  await fillRegister(page, { name: "Duplicado Teste", email: b.email, cpf: fmtCpf(cpf()), password: "senhaforte123" });
  await expect(page.getByText(/já existe|já tem|já cadastrado/i).first()).toBeVisible();
});

test("cadastro com CPF já usado avisa", async ({ page }) => {
  const b = await newBuyer();
  await page.goto("/cadastro");
  await fillRegister(page, { name: "Duplicado Cpf", email: uniq(), cpf: fmtCpf(b.cpf), password: "senhaforte123" });
  await expect(page.getByText(/cpf/i).filter({ hasText: /já|outra conta/i }).first()).toBeVisible();
});

test("cadastro com senha curta não passa", async ({ page }) => {
  await page.goto("/cadastro");
  await fillRegister(page, { name: "Senha Curta", email: uniq(), cpf: fmtCpf(cpf()), password: "123" });
  await expect(page).toHaveURL(/cadastro/);
});

test("cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois", async ({ page }) => {
  const email = uniq();
  await page.goto("/cadastro");
  await fillRegister(page, { name: "Caixa Alta", email: `  ${email.toUpperCase()}`, cpf: fmtCpf(cpf()), password: "senhaforte123" });
  await expect(page).not.toHaveURL(/cadastro/);
  await page.context().clearCookies();
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("senhaforte123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/entrar/);
});

test("login com senha errada mostra erro e não entra", async ({ page }) => {
  const b = await newBuyer();
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(b.email);
  await page.getByLabel("Senha", { exact: true }).fill("senha-errada-1");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText(/incorret|inválid|errad/i).first()).toBeVisible();
  await expect(page).toHaveURL(/entrar/);
});

test("login certo, recarregar a página continua logado, e sair funciona", async ({ page }) => {
  const b = await newBuyer();
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(b.email);
  await page.getByLabel("Senha", { exact: true }).fill(b.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/entrar/);
  await page.goto("/ingressos");
  await page.reload();
  await expect(page.getByText(/você ainda não tem ingressos/i)).toBeVisible();
  // Sair (pode estar num menu no celular)
  const sair = page.getByRole("button", { name: /sair/i }).or(page.getByRole("menuitem", { name: /sair/i }));
  if (!(await sair.first().isVisible().catch(() => false))) {
    await page.getByRole("button", { name: /menu|conta|perfil/i }).first().click().catch(() => undefined);
  }
  await sair.first().click();
  await page.goto("/ingressos");
  await expect(page.getByText(/entrar|faça login/i).first()).toBeVisible();
});

test("página protegida manda para o login e volta depois", async ({ page }) => {
  const b = await newBuyer();
  await page.goto("/ingressos");
  await page.waitForLoadState("networkidle");
  if (!/entrar/.test(page.url())) await page.locator("main").getByRole("link", { name: /entrar/i }).first().click();
  await expect(page).toHaveURL(/entrar/);
  await page.getByLabel("E-mail").fill(b.email);
  await page.getByLabel("Senha", { exact: true }).fill(b.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/ingressos/);
});

test("esqueci a senha responde ok sem revelar se o e-mail existe", async ({ page }) => {
  await page.goto("/esqueci-senha");
  await page.getByLabel("E-mail").fill("ninguem-tem-esse@teste.dev");
  await page.getByRole("button").filter({ hasText: /enviar|link|redefinir/i }).first().click();
  await expect(page.getByText(/enviamos|se .* conta|verifique/i).first()).toBeVisible();
});

test("mostrar/ocultar senha funciona", async ({ page }) => {
  await page.goto("/entrar");
  const pw = page.getByLabel("Senha", { exact: true });
  await pw.fill("minhasenha");
  await expect(pw).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: /mostrar|exibir|ver senha/i }).first().click();
  await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute("type", "text");
});
