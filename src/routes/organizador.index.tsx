import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { CalendarPlus, ExternalLink, MapPin, QrCode, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { addStaff, becomeOrganizer, myEventsQuery, payoutInfoQuery, removeEvent, removeStaff, savePayoutInfo, staffQuery } from "@/services/organizer";
import { hasRole } from "@/services/session";
import { brl, fmtDate, fmtTime } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { AuthUser, OrganizerEvent } from "@/types";

export const Route = createFileRoute("/organizador/")({
  head: () => ({ meta: [{ title: "Meus eventos — Passe" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-page px-5 py-8 md:py-12">
        <RequireAuth>{(user) => (hasRole(user, "organizer") ? <Dashboard /> : <BecomeOrganizer user={user} />)}</RequireAuth>
      </main>
      <SiteFooter />
    </div>
  ),
});

function BecomeOrganizer({ user }: { user: AuthUser }) {
  const m = useMutation({ mutationFn: becomeOrganizer });
  return (
    <section className="mx-auto max-w-lg rounded-xl border bg-card p-6 text-center md:p-10">
      <span className="mx-auto grid size-12 place-items-center rounded-lg bg-primary text-primary-foreground"><CalendarPlus className="size-6" /></span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Venda ingressos no Passe</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Crie seu evento em poucos minutos. Cada ingresso sai com QR Code único, e a sua equipe valida a entrada pelo celular.
      </p>
      <ul className="mt-6 space-y-2 text-left text-sm">
        <li className="flex gap-2"><span className="text-primary">✓</span>Pix com confirmação automática</li>
        <li className="flex gap-2"><span className="text-primary">✓</span>Lotes com preço e quantidade que você define</li>
        <li className="flex gap-2"><span className="text-primary">✓</span>Portaria com leitor de QR e controle de entradas</li>
      </ul>
      {m.error && <p className="mt-4 text-sm text-destructive">{m.error.message}</p>}
      <Button className="mt-6 w-full" size="lg" disabled={m.isPending} onClick={() => m.mutate()}>
        {m.isPending ? "Aguarde…" : "Quero criar eventos"}
      </Button>
      <p className="mt-3 text-xs text-muted-foreground">Conta: {user.email}</p>
    </section>
  );
}

function Dashboard() {
  const { data, isLoading, error } = useQuery(myEventsQuery());
  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Meus eventos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acompanhe vendas e entradas de cada evento.</p>
        </div>
        <Button asChild className="hidden sm:inline-flex"><Link to="/organizador/novo"><CalendarPlus />Criar evento</Link></Button>
      </div>

      <PayoutInfoCard />

      {isLoading && <p className="mt-8 text-sm text-muted-foreground">Carregando…</p>}
      {error && <p className="mt-8 text-sm text-destructive">{error.message}</p>}
      {data && !data.length && (
        <div className="mt-8 rounded-xl border p-8 text-center md:p-10">
          <p className="font-medium">Você ainda não criou nenhum evento</p>
          <p className="mt-1 text-sm text-muted-foreground">Leva poucos minutos: nome, data, local e os lotes de ingresso.</p>
          <Button asChild className="mt-5"><Link to="/organizador/novo"><CalendarPlus />Criar meu primeiro evento</Link></Button>
        </div>
      )}
      {!!data?.length && (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((e) => <OrganizerEventCard key={e.id} ev={e} />)}
        </div>
      )}

      {/* No celular o botão principal fica fixo embaixo, ao alcance do polegar. */}
      {!!data?.length && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 p-4 backdrop-blur sm:hidden">
          <Button asChild size="lg" className="w-full"><Link to="/organizador/novo"><CalendarPlus />Criar evento</Link></Button>
        </div>
      )}
    </>
  );
}

/** Chave Pix para receber os repasses das vendas. */
function PayoutInfoCard() {
  const qc = useQueryClient();
  const { data } = useQuery(payoutInfoQuery());
  const [editing, setEditing] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [holder, setHolder] = useState("");
  const save = useMutation({
    mutationFn: () => savePayoutInfo({ pixKey, holder }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["payout-info"] }); setEditing(false); toast.success("Dados para receber salvos."); },
  });
  if (!data) return null;
  const missing = !data.pixKey;
  if (!editing && !missing)
    return (
      <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
        <span className="min-w-0 truncate text-muted-foreground">Repasses via Pix para <span className="text-foreground">{data.pixKey}</span> ({data.holder})</span>
        <Button variant="ghost" size="sm" onClick={() => { setPixKey(data.pixKey); setHolder(data.holder); setEditing(true); }}>Alterar</Button>
      </div>
    );
  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="mt-5 rounded-xl border border-primary/40 bg-card p-4">
      <p className="font-medium">Onde você quer receber as vendas?</p>
      <p className="mt-1 text-xs text-muted-foreground">O Passe repassa o valor dos ingressos vendidos por Pix. A taxa de serviço de 10% é paga pelo comprador.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input required minLength={3} value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="Chave Pix (CPF, CNPJ, e-mail, celular…)"
          className="h-10 rounded-md border bg-surface px-3 text-sm outline-none focus:border-primary/50" />
        <input required minLength={3} value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Nome do titular da conta"
          className="h-10 rounded-md border bg-surface px-3 text-sm outline-none focus:border-primary/50" />
      </div>
      {save.error && <p className="mt-2 text-sm text-destructive">{save.error.message}</p>}
      <div className="mt-3 flex gap-2">
        <Button type="submit" size="sm" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
        {!missing && <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>}
      </div>
    </form>
  );
}

const STATUS: Record<OrganizerEvent["status"], { label: string; cls: string }> = {
  published: { label: "Publicado", cls: "bg-primary/15 text-primary" },
  review: { label: "Em análise", cls: "bg-warning/15 text-warning" },
  rejected: { label: "Não aprovado", cls: "bg-destructive/15 text-destructive" },
  draft: { label: "Rascunho", cls: "bg-elevated text-muted-foreground" },
  cancelled: { label: "Cancelado", cls: "bg-destructive/15 text-destructive" },
};

function OrganizerEventCard({ ev }: { ev: OrganizerEvent }) {
  const [staffOpen, setStaffOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const capacity = ev.batches.reduce((s, b) => s + b.total, 0);
  const pct = capacity ? Math.min(100, Math.round((ev.stats.ticketsSold / capacity) * 100)) : 0;
  const st = STATUS[ev.status];
  return (
    <article className="overflow-hidden rounded-xl border bg-card">
      <div className="relative h-28">
        {ev.coverUrl ? <img src={ev.coverUrl} alt="" className="size-full object-cover" /> : <div className="size-full bg-elevated" />}
        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
        <span className={cn("absolute left-3 top-3 rounded-full px-2 py-0.5 text-xs font-medium", st.cls)}>{st.label}</span>
      </div>
      <div className="p-5">
        <h2 className="font-medium leading-snug">{ev.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{fmtDate(ev.startsAt)} · {fmtTime(ev.startsAt)}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-3.5" />{ev.venue}, {ev.city}</p>

        {ev.status === "review" && (
          <p className="mt-4 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
            Aguardando aprovação do Passe. Você recebe um e-mail quando o evento entrar no ar.
          </p>
        )}
        {ev.status === "rejected" && (
          <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Não aprovado{ev.reviewNote ? `: ${ev.reviewNote}` : "."} Responda o e-mail que enviamos para ajustar.
          </p>
        )}

        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Stat label="Vendidos" value={`${ev.stats.ticketsSold}`} />
          <Stat label="Receita" value={brl(ev.stats.revenue)} />
          <Stat label="Entradas" value={`${ev.stats.checkedIn}`} />
        </dl>
        {ev.stats.revenue > 0 && (
          <div className="mt-2 flex justify-between rounded-lg bg-surface px-3 py-2 text-xs">
            <span className="text-muted-foreground">Já recebido <span className="text-foreground">{brl(ev.stats.paidOut)}</span></span>
            <span className="text-muted-foreground">A receber <span className="font-semibold text-primary">{brl(ev.stats.toReceive)}</span></span>
          </div>
        )}

        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground"><span>Lotação</span><span>{ev.stats.ticketsSold} de {capacity}</span></div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-elevated"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => setStaffOpen(true)}><Users />Equipe</Button>
          <Button asChild variant="outline" size="sm"><Link to="/eventos/$id" params={{ id: ev.slug }}><ExternalLink />Ver página</Link></Button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/portaria"><QrCode />Leitor</Link></Button>
          {ev.status !== "cancelled" && (
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setRemoveOpen(true)}><Trash2 />Remover</Button>
          )}
        </div>
      </div>
      <StaffDialog eventId={ev.id} title={ev.title} open={staffOpen} onOpenChange={setStaffOpen} />
      <RemoveDialog ev={ev} open={removeOpen} onOpenChange={setRemoveOpen} />
    </article>
  );
}

function RemoveDialog({ ev, open, onOpenChange }: { ev: OrganizerEvent; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const sold = ev.stats.ticketsSold;
  const m = useMutation({
    mutationFn: () => removeEvent(ev.id),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["organizer-events"] });
      void qc.invalidateQueries({ queryKey: ["events"] });
      onOpenChange(false);
      if (r.deleted) toast.success("Evento removido.");
      else if (r.refundFailed) toast.error(`Evento cancelado. ${r.refunded} compra(s) estornada(s), mas ${r.refundFailed} precisa(m) de estorno manual no Mercado Pago.`);
      else toast.success(`Evento cancelado e ${r.refunded} compra(s) estornada(s).`);
    },
  });
  return (
    <AlertDialog open={open} onOpenChange={(o) => !m.isPending && onOpenChange(o)}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{sold ? "Cancelar este evento?" : "Remover este evento?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {sold
              ? <>“{ev.title}” já tem <strong className="text-foreground">{sold} ingresso(s) vendido(s)</strong>. O evento sai do site, todos os compradores recebem o dinheiro de volta (estorno no Mercado Pago) e os ingressos deixam de valer. Isso não pode ser desfeito.</>
              : <>“{ev.title}” ainda não tem ingressos vendidos. Ele será apagado do site, junto com os lotes. Isso não pode ser desfeito.</>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {m.error && <p className="text-sm text-destructive">{m.error.message}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={m.isPending}>Voltar</AlertDialogCancel>
          <Button variant="destructive" disabled={m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Aguarde…" : sold ? "Cancelar e estornar" : "Remover evento"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg bg-surface px-2 py-2.5">
    <dd className="truncate text-sm font-semibold">{value}</dd>
    <dt className="text-[11px] text-muted-foreground">{label}</dt>
  </div>
);

function StaffDialog({ eventId, title, open, onOpenChange }: { eventId: string; title: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const { data: staff, isLoading } = useQuery({ ...staffQuery(eventId), enabled: open });
  const [email, setEmail] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["organizer-staff", eventId] });
  const add = useMutation({ mutationFn: (e: string) => addStaff(eventId, e), onSuccess: () => { setEmail(""); void refresh(); } });
  const remove = useMutation({ mutationFn: (userId: string) => removeStaff(eventId, userId), onSuccess: () => void refresh() });
  const submit = (e: FormEvent) => { e.preventDefault(); if (email.trim()) add.mutate(email.trim()); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Equipe da portaria</DialogTitle>
          <DialogDescription>{title}: quem estiver aqui pode escanear os ingressos na entrada.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex gap-2">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e-mail da pessoa"
            className="h-10 min-w-0 flex-1 rounded-md border bg-surface px-3 text-sm outline-none focus:border-primary/50" />
          <Button type="submit" disabled={add.isPending}>{add.isPending ? "…" : "Adicionar"}</Button>
        </form>
        {add.error && <p className="text-sm text-destructive">{add.error.message}</p>}
        <p className="text-xs text-muted-foreground">A pessoa precisa ter conta no Passe. Ela acessa pelo menu “Portaria”.</p>
        <ul className="divide-y rounded-lg border">
          {isLoading && <li className="p-3 text-sm text-muted-foreground">Carregando…</li>}
          {staff && !staff.length && <li className="p-3 text-sm text-muted-foreground">Ninguém na equipe ainda.</li>}
          {staff?.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0"><p className="truncate text-sm font-medium">{s.name}</p><p className="truncate text-xs text-muted-foreground">{s.email}</p></div>
              <Button variant="ghost" size="icon" aria-label={`Remover ${s.name}`} disabled={remove.isPending} onClick={() => remove.mutate(s.id)}><Trash2 /></Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
