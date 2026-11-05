import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell, Field, SubmitButton, useSubmit } from "@/components/auth-form";
import { register } from "@/services/auth";

export const Route = createFileRoute("/cadastro")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } =>
    typeof s["redirect"] === "string" && s["redirect"].startsWith("/") ? { redirect: s["redirect"] } : {},
  head: () => ({
    meta: [
      { title: "Criar conta — Passe" },
      { name: "description", content: "Crie sua conta para comprar e vender ingressos." },
      { property: "og:title", content: "Criar conta — Passe" },
      { property: "og:description", content: "Crie sua conta para comprar e vender ingressos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Register,
});

function Register() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { error, loading, onSubmit } = useSubmit(async (fd) => {
    await register({
      name: String(fd.get("name")), email: String(fd.get("email")),
      cpf: String(fd.get("cpf")).replace(/\D/g, ""), password: String(fd.get("password")),
    });
    navigate({ to: redirect ?? "/" });
  });
  return (
    <AuthShell title="Criar conta" subtitle="Leva menos de um minuto." footer={<>Já tem conta? <Link to="/entrar" search={redirect ? { redirect } : {}} className="text-foreground underline">Entrar</Link></>}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nome completo" name="name" required autoComplete="name" />
        <Field label="E-mail" name="email" type="email" required autoComplete="email" />
        <Field label="CPF" name="cpf" required inputMode="numeric" pattern="\d{3}\.?\d{3}\.?\d{3}-?\d{2}" placeholder="000.000.000-00" />
        <Field label="Senha" name="password" type="password" required minLength={8} autoComplete="new-password" />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <SubmitButton loading={loading}>Criar conta</SubmitButton>
      </form>
    </AuthShell>
  );
}
