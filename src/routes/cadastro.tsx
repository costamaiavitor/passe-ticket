import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell, Field, SubmitButton, useSubmit } from "@/components/auth-form";
import { register } from "@/services/auth";

export const Route = createFileRoute("/cadastro")({
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
  const [done, setDone] = useState(false);
  const { error, loading, onSubmit } = useSubmit(async (fd) => {
    await register({
      name: String(fd.get("name")), email: String(fd.get("email")),
      cpf: String(fd.get("cpf")).replace(/\D/g, ""), password: String(fd.get("password")),
    });
    setDone(true);
  });
  if (done)
    return <AuthShell title="Confirme seu e-mail" subtitle="Enviamos um link de confirmação para sua caixa de entrada." footer={<Link to="/entrar" className="text-foreground underline">Ir para o login</Link>}>{null}</AuthShell>;
  return (
    <AuthShell title="Criar conta" subtitle="Leva menos de um minuto." footer={<>Já tem conta? <Link to="/entrar" className="text-foreground underline">Entrar</Link></>}>
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
