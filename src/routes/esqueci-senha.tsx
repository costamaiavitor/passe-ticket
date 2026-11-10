import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { AuthShell, Field, SubmitButton, useSubmit } from "@/components/auth-form";
import { forgotPassword } from "@/services/auth";

export const Route = createFileRoute("/esqueci-senha")({
  head: () => ({ meta: [{ title: "Esqueci minha senha — Booticket" }, { name: "robots", content: "noindex" }] }),
  component: Forgot,
});

function Forgot() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { error, loading, onSubmit } = useSubmit(async (fd) => {
    const email = String(fd.get("email")).trim();
    await forgotPassword(email);
    setSentTo(email);
  });

  if (sentTo)
    return (
      <AuthShell title="Confira seu e-mail" subtitle="O link para criar uma nova senha está a caminho."
        footer={<Link to="/entrar" className="text-foreground underline">Voltar para o login</Link>}>
        <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          <MailCheck className="mb-3 size-8 text-primary" />
          Se existir uma conta com <strong className="text-foreground">{sentTo}</strong>, você vai receber um e-mail com um link que vale por 1 hora.
          Não chegou? Olhe a caixa de spam ou tente de novo em alguns minutos.
        </div>
      </AuthShell>
    );

  return (
    <AuthShell title="Esqueci minha senha" subtitle="Informe seu e-mail e enviaremos um link para criar uma nova senha."
      footer={<>Lembrou? <Link to="/entrar" className="text-foreground underline">Entrar</Link></>}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="E-mail" name="email" type="email" required autoComplete="email" />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <SubmitButton loading={loading}>Enviar link</SubmitButton>
      </form>
    </AuthShell>
  );
}
