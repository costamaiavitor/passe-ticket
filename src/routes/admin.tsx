import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Copy, ExternalLink, MapPin, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { allEventsQuery, approveEvent, mpAccountsQuery, purgeEvent, markRefundedOutside, payoutsQuery, registerPayout, rejectEvent, reviewEventsQuery } from "@/services/admin";
import { brl, fmtDate, fmtTime } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { PayoutRow, ReviewEvent } from "@/types";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — BooTickets" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-page px-5 py-8 md:py-12">
        <RequireAuth roles={["admin"]}>{() => <Admin />}</RequireAuth>
      </main>
      <SiteFooter />
    </div>
  ),
});

function Admin() {
  const [tab, setTab] = useState<"review" | "events" | "payouts" | "mp">("review");
  const { data: review } = useQuery(reviewEventsQuery());
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Admin</h1>
      <div className="mt-5 inline-grid grid-cols-2 gap-1 rounded-lg bg-surface p-1 sm:grid-cols-4">
        {([["review", `Aprovar eventos${review?.length ? ` (${review.length})` : ""}`], ["events", "Todos os eventos"], ["payouts", "Repasses"], ["mp", "Mercado Pago"]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={cn("rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{label}</button>
        ))}
      </div>
      <div className="mt-6">{tab === "review" ? <ReviewList /> : tab === "events" ? <AllEvents /> : tab === "mp" ? <MpAccounts /> : <Payouts />}</div>
    </>
  );
}

// ---------------- Contas Mercado Pago dos organizadores ----------------
const MP_STATUS: Record<string, { label: string; cls: string }> = {
  connected: { label: "Conectado", cls: "bg-success/15 text-success" },
  problem: { label: "Com problema", cls: "bg-warning/15 text-warning" },
  disconnected: { label: "Desconectou", cls: "bg-destructive/15 text-destructive" },
  never: { label: "Não conectou", cls: "bg-elevated text-muted-foreground" },
};

function MpAccounts() {
  const { data, isLoading, error } = useQuery(mpAccountsQuery());
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;
  const list = data ?? [];
  const connected = list.filter((r) => r.status === "connected").length;
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{connected} de {list.length}</span> organizador(es) recebendo direto no Mercado Pago (split).
        Os outros recebem pela conta do BooTickets, com repasse manual. Você recebe um e-mail quando alguém conecta, desconecta ou tem erro ao conectar.
      </p>
      {!list.length && <p className="mt-4 rounded-xl border p-8 text-center text-sm text-muted-foreground">Nenhum organizador ainda.</p>}
      <div className="mt-4 divide-y rounded-xl border bg-card">
        {list.map((r) => {
          const st = MP_STATUS[r.status]!;
          return (
            <div key={r.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium">{r.name}</p>
                <p className="truncate text-xs text-muted-foreground">{r.email} · {r.events} evento(s)</p>
                <p className="text-xs text-muted-foreground">
                  Vendas pagas: <span className="text-foreground">{r.salesDirect}</span> direto na conta dele ·{" "}
                  <span className={cn(r.status !== "never" && r.salesPlatform > 0 ? "font-medium text-warning" : "text-foreground")}>{r.salesPlatform}</span> pela conta do BooTickets
                  {r.status !== "never" ? " (depois de conectar)" : ""}
                </p>
                {r.lastError && r.status !== "never" && <p className="mt-1 break-words text-xs text-warning">Motivo: {r.lastError}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", st.cls)}>{st.label}</span>
                <span className="text-xs text-muted-foreground">
                  {r.status === "disconnected" && r.disconnectedAt ? `em ${fmtDate(r.disconnectedAt)} ${fmtTime(r.disconnectedAt)}`
                    : r.connectedAt ? `desde ${fmtDate(r.connectedAt)} ${fmtTime(r.connectedAt)}` : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Todos os eventos (de qualquer organizador) ----------------
const EV_STATUS: Record<string, string> = { published: "Publicado", review: "Em análise", rejected: "Não aprovado", draft: "Rascunho", cancelled: "Cancelado" };
function AllEvents() {
  const { data, isLoading, error } = useQuery(allEventsQuery());
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const purge = useMutation({
    mutationFn: purgeEvent,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["admin-events"] }); void qc.invalidateQueries({ queryKey: ["events"] }); toast.success("Evento apagado do site."); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível apagar."),
  });
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;
  const term = q.trim().toLowerCase();
  const list = (data ?? []).filter((e) => !term || `${e.title} ${e.organizer.name} ${e.organizer.email} ${e.city}`.toLowerCase().includes(term));
  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por evento, organizador ou cidade"
        className="mb-4 h-10 w-full max-w-md rounded-md border bg-surface px-3 text-sm outline-none focus:border-primary/50" />
      {!list.length && <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">Nenhum evento encontrado.</p>}
      <div className="divide-y rounded-xl border bg-card">
        {list.map((e) => (
          <div key={e.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <img src={e.coverUrl} alt="" className="hidden size-14 shrink-0 rounded-md object-cover sm:block" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{e.title}
                <span className="ml-2 rounded-full bg-elevated px-2 py-0.5 text-xs font-normal text-muted-foreground">{EV_STATUS[e.status] ?? e.status}{e.visibility === "unlisted" ? " · privado" : ""}</span></p>
              <p className="text-xs text-muted-foreground">{fmtDate(e.startsAt)} · {e.city} · {e.organizer.name} ({e.organizer.email})</p>
              <p className="text-xs text-muted-foreground">{e.sold} ingresso(s) · {brl(e.revenue)} vendidos</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button asChild size="sm" variant="secondary"><Link to="/organizador/evento/$id" params={{ id: e.id }}>Painel</Link></Button>
              {e.status !== "cancelled" && <Button asChild size="sm" variant="outline"><Link to="/organizador/editar/$id" params={{ id: e.id }}>Editar</Link></Button>}
              <Button asChild size="sm" variant="ghost"><Link to="/eventos/$id" params={{ id: e.slug }}><ExternalLink /></Link></Button>
              {e.status === "cancelled" && (
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={purge.isPending}
                  aria-label={`Apagar ${e.title} de vez`} title="Apagar de vez"
                  onClick={() => { if (window.confirm(`Apagar "${e.title}" de vez? Não dá para desfazer.`)) purge.mutate(e.id); }}><Trash2 /></Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- Aprovar eventos ----------------
function ReviewList() {
  const { data, isLoading, error } = useQuery(reviewEventsQuery());
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;
  if (!data?.length) return <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">Nenhum evento aguardando aprovação. 🎉</p>;
  return <div className="grid gap-4 md:grid-cols-2">{data.map((e) => <ReviewCard key={e.id} ev={e} />)}</div>;
}

function ReviewCard({ ev }: { ev: ReviewEvent }) {
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const done = (msg: string) => { void qc.invalidateQueries({ queryKey: ["admin-review"] }); void qc.invalidateQueries({ queryKey: ["events"] }); toast.success(msg); };
  const approve = useMutation({ mutationFn: () => approveEvent(ev.id), onSuccess: () => done("Evento aprovado e publicado.") });
  const reject = useMutation({ mutationFn: () => rejectEvent(ev.id, reason), onSuccess: () => done("Evento recusado. O organizador foi avisado.") });
  const capacity = ev.batches.reduce((s, b) => s + b.total, 0);
  return (
    <article className="overflow-hidden rounded-xl border bg-card">
      <img src={ev.coverUrl} alt="" className="h-32 w-full object-cover" />
      <div className="p-5">
        <h2 className="font-medium">{ev.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{fmtDate(ev.startsAt)} · {fmtTime(ev.startsAt)}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-3.5" />{ev.venue}{ev.address ? ` — ${ev.address}` : ""}, {ev.city}</p>
        <p className="mt-3 text-sm">Organizador: <strong>{ev.organizer.name}</strong> <span className="text-muted-foreground">({ev.organizerEmail})</span></p>
        <ul className="mt-3 space-y-1 rounded-lg bg-surface p-3 text-sm">
          {ev.batches.map((b) => <li key={b.id} className="flex justify-between"><span>{b.name}</span><span className="text-muted-foreground">{b.total} × {brl(b.price)}</span></li>)}
          <li className="flex justify-between border-t pt-1 text-xs text-muted-foreground"><span>Capacidade</span><span>{capacity} ingressos</span></li>
        </ul>
        {ev.description && <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">{ev.description}</p>}
        <Button asChild variant="link" size="sm" className="mt-1 px-0"><Link to="/eventos/$id" params={{ id: ev.slug }}><ExternalLink />Pré-visualizar a página</Link></Button>

        {rejecting ? (
          <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); reject.mutate(); }}>
            <textarea required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
              placeholder="Motivo (vai no e-mail para o organizador)" className="w-full rounded-md border bg-surface px-3 py-2 text-sm outline-none focus:border-primary/50" />
            <div className="flex gap-2">
              <Button type="submit" variant="destructive" size="sm" disabled={reject.isPending}>Recusar evento</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setRejecting(false)}>Voltar</Button>
            </div>
          </form>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button disabled={approve.isPending} onClick={() => approve.mutate()}><Check />Aprovar</Button>
            <Button variant="outline" onClick={() => setRejecting(true)}><X />Recusar</Button>
          </div>
        )}
        {(approve.error || reject.error) && <p className="mt-2 text-sm text-destructive">{(approve.error ?? reject.error)!.message}</p>}
      </div>
    </article>
  );
}

// ---------------- Repasses ----------------
function Payouts() {
  const { data, isLoading, error } = useQuery(payoutsQuery());
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;
  if (!data?.length) return <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">Nenhuma venda paga ainda.</p>;
  const total = data.reduce((s, r) => s + r.balance, 0);
  const fees = data.reduce((s, r) => s + r.platformFees, 0);
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Total a repassar</p><p className="mt-1 text-2xl font-semibold text-primary">{brl(total)}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Taxas do BooTickets (antes das tarifas do Mercado Pago)</p><p className="mt-1 text-2xl font-semibold">{brl(fees)}</p></div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Como funciona: faça o Pix para o organizador pelo app do banco e depois registre aqui. O organizador recebe um e-mail e vê o valor em “Já recebido”.
      </p>
      <div className="mt-5 space-y-3">{data.map((r) => <PayoutCard key={r.eventId} row={r} />)}</div>
    </>
  );
}

function PayoutCard({ row }: { row: PayoutRow }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(row.balance);
  const [note, setNote] = useState("");
  const pay = useMutation({
    mutationFn: () => registerPayout({ eventId: row.eventId, amount, note }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["admin-payouts"] }); toast.success("Repasse registrado e organizador avisado."); setNote(""); },
  });
  const ended = new Date(row.startsAt).getTime() < Date.now();
  const [confirmManual, setConfirmManual] = useState(false);
  const manual = useMutation({
    mutationFn: () => markRefundedOutside(row.eventId),
    onSuccess: (r) => { void qc.invalidateQueries({ queryKey: ["admin-payouts"] }); void qc.invalidateQueries({ queryKey: ["organizer-events"] }); toast.success(`${r.orders} compra(s) marcada(s) como devolvida(s). Ingressos cancelados.`); },
  });
  return (
    <article className="rounded-xl border bg-card p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium">{row.title}</h3>
          <p className="text-xs text-muted-foreground">{fmtDate(row.startsAt)} · {row.tickets} ingresso(s) · {ended ? "evento já aconteceu" : "evento ainda vai acontecer"}{row.status === "cancelled" ? " · cancelado" : ""}</p>
          <p className="mt-1 text-sm">{row.organizer.name} <span className="text-muted-foreground">({row.organizer.email})</span></p>
        </div>
        <div className="text-right text-sm">
          <p className="text-muted-foreground">Vendido <span className="text-foreground">{brl(row.revenue)}</span></p>
          {!!row.direct && <p className="text-muted-foreground">Direto no Mercado Pago <span className="text-foreground">{brl(row.direct)}</span></p>}
          <p className="text-muted-foreground">Repassado <span className="text-foreground">{brl(row.paidOut)}</span></p>
          <p className="font-semibold text-primary">Saldo {brl(row.balance)}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
        {row.organizer.pixKey ? (
          <>
            <span className="min-w-0 flex-1 truncate">Pix: <span className="font-mono">{row.organizer.pixKey}</span> · {row.organizer.holder}</span>
            <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(row.organizer.pixKey).then(() => toast.success("Chave Pix copiada"))}><Copy /></Button>
          </>
        ) : <span className="text-warning">O organizador ainda não cadastrou a chave Pix em Meus eventos.</span>}
      </div>
      {row.status === "cancelled" && row.balance > 0 && (
        <div className="mt-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <p className="text-warning">Evento cancelado com compras ainda não estornadas.</p>
          <p className="mt-1 text-xs text-muted-foreground">Se o Mercado Pago não conseguiu estornar (por exemplo, sem saldo), devolva por Pix direto ao comprador e marque aqui. Isso não movimenta dinheiro: só cancela os ingressos e zera o saldo.</p>
          {confirmManual ? (
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="destructive" disabled={manual.isPending} onClick={() => manual.mutate()}>Confirmar: já devolvi</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmManual(false)}>Voltar</Button>
            </div>
          ) : <Button size="sm" variant="outline" className="mt-2" onClick={() => setConfirmManual(true)}>Marcar como devolvido por fora</Button>}
          {manual.error && <p className="mt-2 text-destructive">{manual.error.message}</p>}
        </div>
      )}
      {row.balance > 0 && row.status !== "cancelled" && (
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); pay.mutate(); }}>
          <input inputMode="numeric" value={brl(amount)} onChange={(e) => setAmount(Math.min(Number(e.target.value.replace(/\D/g, "") || "0"), row.balance))}
            className="h-9 w-32 rounded-md border bg-surface px-3 text-sm outline-none focus:border-primary/50" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Observação (ex.: Pix de 06/11)" maxLength={300}
            className="h-9 min-w-0 flex-1 rounded-md border bg-surface px-3 text-sm outline-none focus:border-primary/50" />
          <Button size="sm" type="submit" disabled={pay.isPending || amount < 1}>Registrar repasse</Button>
        </form>
      )}
      {pay.error && <p className="mt-2 text-sm text-destructive">{pay.error.message}</p>}
      {!!row.history.length && (
        <ul className="mt-3 space-y-1 border-t pt-3 text-xs text-muted-foreground">
          {row.history.map((h) => <li key={h.id} className="flex justify-between"><span>{fmtDate(h.paidAt)} {h.note && `· ${h.note}`}</span><span>{brl(h.amount)}</span></li>)}
        </ul>
      )}
    </article>
  );
}
