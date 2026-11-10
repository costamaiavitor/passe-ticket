import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell, Field, SubmitButton, useSubmit } from "@/components/auth-form";
import { resetPassword } from "@/services/auth";

export const Route = createFileRoute("/redefinir-senha")({
  validateSearch: (s: Record<string, unknown>): { token?: string } => (typeof s["token"] === "string" ? { token: s["token"] } : {}),
  head: () => ({ meta: [{ title: "Nova senha — Booticket" }, { name: "robots", content: "noindex" }] }),
  component: Reset,
});

function Reset() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const { error, loading, onSubmit } = useSubmit(async (fd) => {
    const password = String(fd.get("password"));
    if (password !== String(fd.get("confirm"))) throw new Error("As senhas não são iguais.");
    await resetPassword(token ?? "", password);
    navigate({ to: "/" });
  });

  if (!token)
    return (
      <AuthShell title="Link incompleto" subtitle="Abra o link exatamente como chegou no seu e-mail."
        footer={<Link to="/esqueci-senha" className="text-foreground underline">Pedir um novo link</Link>}>
        <span />
      </AuthShell>
    );

  return (
    <AuthShell title="Criar nova senha" subtitle="Escolha uma senha com pelo menos 8 caracteres."
      footer={<Link to="/esqueci-senha" className="text-foreground underline">Pedir um novo link</Link>}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nova senha" name="password" type="password" required minLength={8} autoComplete="new-password" />
        <Field label="Repita a nova senha" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <SubmitButton loading={loading}>Salvar nova senha</SubmitButton>
      </form>
    </AuthShell>
  );
}
