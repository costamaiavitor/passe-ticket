import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell, Field, SubmitButton, useSubmit } from "@/components/auth-form";
import { login } from "@/services/auth";

export const Route = createFileRoute("/entrar")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } =>
    typeof s["redirect"] === "string" && s["redirect"].startsWith("/") ? { redirect: s["redirect"] } : {},
  head: () => ({
    meta: [
      { title: "Entrar — Passe" },
      { name: "description", content: "Acesse sua conta Passe." },
      { property: "og:title", content: "Entrar — Passe" },
      { property: "og:description", content: "Acesse sua conta Passe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { error, loading, onSubmit } = useSubmit(async (fd) => {
    await login(String(fd.get("email")), String(fd.get("password")));
    navigate({ to: redirect ?? "/" });
  });
  return (
    <AuthShell title="Entrar" subtitle="Bem-vindo de volta." footer={<>Não tem conta? <Link to="/cadastro" search={redirect ? { redirect } : {}} className="text-foreground underline">Criar conta</Link></>}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="E-mail" name="email" type="email" required autoComplete="email" />
        <Field label="Senha" name="password" type="password" required autoComplete="current-password" />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <SubmitButton loading={loading}>Entrar</SubmitButton>
      </form>
    </AuthShell>
  );
}
