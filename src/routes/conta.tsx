import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Trash2 } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { RequireAuth } from "@/components/require-auth";
import { Field } from "@/components/auth-form";
import { Button } from "@/components/ui/button";
import { Loading, Rise, RiseWords } from "@/components/motion";
import { deleteMyAccount, deletionCheck } from "@/services/auth";
import type { AuthUser } from "@/types";

// Minha conta: dados básicos e "Excluir minha conta" (exigido pela App Store, Google Play e LGPD).
export const Route = createFileRoute("/conta")({
  head: () => ({ meta: [{ title: "Minha conta — BooTickets" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-page py-12">
        <h1 className="text-3xl font-semibold tracking-tight"><RiseWords text="Minha conta" /></h1>
        <RequireAuth>{(user) => <Account user={user} />}</RequireAuth>
      </main>
      <SiteFooter />
    </div>
  ),
});

function Account({ user }: { user: AuthUser }) {
  return (
    <div className="mt-8 max-w-2xl space-y-8">
      <Rise>
        <dl className="grid gap-4 rounded-xl border bg-card p-5 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-muted-foreground">Nome</dt><dd className="mt-0.5 font-medium">{user.name}</dd></div>
          <div><dt className="text-xs text-muted-foreground">E-mail</dt><dd className="mt-0.5 break-all font-medium">{user.email}</dd></div>
        </dl>
      </Rise>
      <Rise i={1}><DeleteAccount /></Rise>
    </div>
  );
}

function DeleteAccount() {
  const navigate = useNavigate();
  const check = useQuery({ queryKey: ["account-deletion"], queryFn: deletionCheck });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const m = useMutation({
    mutationFn: () => deleteMyAccount({ confirm, ...(check.data?.needsPassword ? { password } : {}) }),
    onSuccess: () => {
      toast.success("Sua conta foi excluída. Obrigado por ter usado o BooTickets.");
      navigate({ to: "/" });
    },
  });
  const typed = confirm.trim().toUpperCase() === "EXCLUIR";
  const ready = typed && (!check.data?.needsPassword || password.length > 0);

  return (
    <section className="rounded-xl border border-destructive/30 bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Trash2 className="size-5 text-destructive" />Excluir minha conta</h2>
      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
        <p>Ao excluir sua conta, seus dados pessoais (nome, e-mail, CPF e chave Pix) são apagados e você não consegue mais entrar com ela.</p>
        <p><strong className="text-foreground">Isso não pode ser desfeito.</strong> Se quiser usar o BooTickets de novo, vai precisar criar outra conta.</p>
        <p>As compras já pagas ficam guardadas só como registro de pagamento, sem o seu nome, porque a lei obriga a guardar.</p>
        <p>Se você tem ingressos para eventos que ainda vão acontecer, transfira para outra pessoa ou devolva antes.</p>
      </div>

      {check.isLoading ? <Loading rows={2} className="mt-5" /> : check.error ? (
        <p className="mt-5 text-sm text-destructive">{check.error.message}</p>
      ) : check.data?.blockers.length ? (
        <div className="mt-5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium"><AlertTriangle className="size-4 text-amber-500" />Ainda não dá para excluir a conta:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">{check.data.blockers.map((b) => <li key={b}>{b}</li>)}</ul>
        </div>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); if (ready) m.mutate(); }}>
          {check.data?.needsPassword && (
            <Field label="Sua senha" name="password" type="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
          <Field label='Para confirmar, digite EXCLUIR' name="confirm" autoComplete="off" required
            value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <Button type="submit" variant="destructive" disabled={!ready || m.isPending}>
            {m.isPending ? "Excluindo…" : "Excluir minha conta para sempre"}
          </Button>
          {m.error && <p className="text-sm text-destructive">{m.error.message}</p>}
        </form>
      )}
    </section>
  );
}
