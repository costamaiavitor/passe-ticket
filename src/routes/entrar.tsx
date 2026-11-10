import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { GoogleButton } from "@/components/google-button";
import { AuthShell, Field, SubmitButton, useSubmit } from "@/components/auth-form";
import { login } from "@/services/auth";

export const Route = createFileRoute("/entrar")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } =>
    typeof s["redirect"] === "string" && s["redirect"].startsWith("/") ? { redirect: s["redirect"] } : {},
  head: () => ({
    meta: [
      { title: "Entrar — Booticket" },
      { name: "description", content: "Acesse sua conta Booticket." },
      { property: "og:title", content: "Entrar — Booticket" },
      { property: "og:description", content: "Acesse sua conta Booticket." },
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
  const goNext = useCallback(() => navigate({ to: redirect ?? "/" }), [navigate, redirect]);
  return (
    <AuthShell title="Entrar" subtitle="Bem-vindo de volta." footer={<>Não tem conta? <Link to="/cadastro" search={redirect ? { redirect } : {}} className="text-foreground underline">Criar conta</Link></>}>
      <GoogleButton onSuccess={goNext} />
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <Field label="E-mail" name="email" type="email" required autoComplete="email" />
        <Field label="Senha" name="password" type="password" required autoComplete="current-password" />
        <div className="-mt-2 text-right"><Link to="/esqueci-senha" className="text-xs text-muted-foreground underline hover:text-foreground">Esqueci minha senha</Link></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <SubmitButton loading={loading}>Entrar</SubmitButton>
      </form>
    </AuthShell>
  );
}
