import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Download, ExternalLink, MapPin, QrCode, Repeat, Search, Ticket as TicketIcon, Users, Wallet } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { attendeesQuery, eventPanelQuery } from "@/services/organizer";
import { brl, fmtDate, fmtTime } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { Attendee, EventPanel } from "@/types";

export const Route = createFileRoute("/organizador/evento/$id")({
  head: () => ({ meta: [{ title: "Painel do evento — Passe" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-page px-5 pb-16 pt-6 md:pt-10">
        <RequireAuth roles={["organizer"]}>{() => <Panel />}</RequireAuth>
      </main>
      <SiteFooter />
    </div>
  ),
});

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  published: { label: "Publicado", cls: "bg-primary/15 text-primary" },
  review: { label: "Em análise", cls: "bg-warning/15 text-warning" },
  rejected: { label: "Não aprovado", cls: "bg-destructive/15 text-destructive" },
  draft: { label: "Rascunho", cls: "bg-elevated text-muted-foreground" },
  cancelled: { label: "Cancelado", cls: "bg-destructive/15 text-destructive" },
};

function Panel() {
  const { id } = Route.useParams();
  const { data: ev, isLoading, error } = useQuery(eventPanelQuery(id));
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (error || !ev) return <p className="text-sm text-destructive">{error?.message ?? "Evento não encontrado."}</p>;
  const st = STATUS_LABEL[ev.status] ?? STATUS_LABEL["draft"]!;
  const capacity = ev.salesByBatch.reduce((s, b) => s + b.total, 0);
  const pct = (n: number, d: number) => (d ? Math.min(100, Math.round((n / d) * 100)) : 0);

  return (
    <>
      <Link to="/organizador" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Meus eventos</Link>

      {/* Cabeçalho */}
      <section className="mt-3 overflow-hidden rounded-xl border bg-card">
        <div className="relative h-32 md:h-44">
          <img src={ev.coverUrl} alt="" className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
          <span className={cn("absolute left-4 top-4 rounded-full px-2.5 py-0.5 text-xs font-medium", st.cls)}>{st.label}</span>
        </div>
        <div className="p-5 pt-0 md:p-6 md:pt-0">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{ev.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{fmtDate(ev.startsAt)} · {fmtTime(ev.startsAt)}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-3.5" />{ev.venue}, {ev.city}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/eventos/$id" params={{ id: ev.slug }}><ExternalLink />Página do evento</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/portaria"><QrCode />Leitor da portaria</Link></Button>
          </div>
        </div>
      </section>

      {/* Números */}
      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={TicketIcon} label="Ingressos vendidos" value={`${ev.stats.ticketsSold}`} sub={`de ${capacity} · ${pct(ev.stats.ticketsSold, capacity)}% da lotação`} />
        <Kpi icon={Users} label="Compradores" value={`${ev.stats.buyers ?? 0}`} sub={ev.stats.awaitingPayment ? `${ev.stats.awaitingPayment} aguardando pagamento` : "pagamentos confirmados"} />
        <Kpi icon={Wallet} label="Receita dos ingressos" value={brl(ev.stats.revenue)} sub={`a receber ${brl(ev.stats.toReceive)}`} highlight />
        <Kpi icon={CheckCircle2} label="Já entraram" value={`${ev.stats.checkedIn}`} sub={`de ${ev.stats.ticketsSold} · ${pct(ev.stats.checkedIn, ev.stats.ticketsSold)}%`} />
      </section>

      {/* Vendas por lote */}
      <section className="mt-4 rounded-xl border bg-card p-5 md:p-6">
        <h2 className="font-medium">Vendas por lote</h2>
        <ul className="mt-4 space-y-4">
          {ev.salesByBatch.map((b) => (
            <li key={b.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium">{b.name} <span className="font-normal text-muted-foreground">· {brl(b.price)}</span></span>
                <span className="shrink-0 text-muted-foreground"><span className="text-foreground">{b.sold}</span> / {b.total}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-elevated">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct(b.sold, b.total)}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {brl(b.revenue)}{b.reserved ? ` · ${b.reserved} reservado(s) aguardando pagamento` : ""}{b.sold >= b.total ? " · esgotado" : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <Attendees ev={ev} />
    </>
  );
}

function Kpi({ icon: I, label, value, sub, highlight }: { icon: typeof Users; label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><I className="size-3.5" />{label}</p>
      <p className={cn("mt-1.5 text-2xl font-semibold tracking-tight", highlight && "text-primary")}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

// ---------------- Lista de compradores ----------------
type Filter = "all" | "in" | "out";

function Attendees({ ev }: { ev: EventPanel }) {
  const { data, isLoading, error } = useQuery(attendeesQuery(ev.id));
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    return (data ?? []).filter((a) => {
      if (filter === "in" && a.status !== "used") return false;
      if (filter === "out" && a.status === "used") return false;
      if (!term) return true;
      return [a.holderName, a.buyerName, a.buyerEmail, a.batchName].some((v) => v.toLowerCase().includes(term))
        || (digits.length >= 3 && a.holderCpf.replace(/\D/g, "").includes(digits));
    });
  }, [data, q, filter]);

  const used = (data ?? []).filter((a) => a.status === "used").length;

  return (
    <section className="mt-4 rounded-xl border bg-card p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-medium">Compradores e participantes <span className="text-muted-foreground">({data?.length ?? 0})</span></h2>
        <Button variant="outline" size="sm" disabled={!data?.length} onClick={() => data && downloadCsv(ev.title, data)}><Download />Baixar planilha</Button>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, e-mail, lote ou CPF"
            className="h-10 w-full rounded-md border bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary/50" />
        </label>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface p-1 text-xs sm:w-80">
          {([["all", `Todos ${data?.length ?? 0}`], ["in", `Entraram ${used}`], ["out", `Faltam ${(data?.length ?? 0) - used}`]] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setFilter(k)}
              className={cn("rounded-md px-2 py-1.5 font-medium transition-colors", filter === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{label}</button>
          ))}
        </div>
      </div>

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Carregando…</p>}
      {error && <p className="mt-6 text-sm text-destructive">{error.message}</p>}
      {data && !data.length && <p className="mt-6 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Ninguém comprou ainda. Divulgue o link do evento!</p>}
      {data && !!data.length && !list.length && <p className="mt-6 text-sm text-muted-foreground">Nenhum resultado para essa busca.</p>}

      {/* Celular: cartões. Computador: tabela. */}
      <ul className="mt-4 space-y-2 md:hidden">
        {list.map((a) => (
          <li key={a.id} className="rounded-lg border bg-surface p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{a.holderName}</p>
                <p className="font-mono text-xs text-muted-foreground">{a.holderCpf}</p>
              </div>
              <StatusPill a={a} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{a.batchName} · {brl(a.price)}{a.paidAt ? ` · ${fmtDate(a.paidAt)} ${fmtTime(a.paidAt)}` : ""}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">Comprado por {a.buyerName} · {a.buyerEmail}</p>
            {a.transferred && <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Repeat className="size-3" />Transferido para {a.ownerEmail}</p>}
          </li>
        ))}
      </ul>
      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-3 font-medium">Titular</th><th className="py-2 pr-3 font-medium">CPF</th>
              <th className="py-2 pr-3 font-medium">Lote</th><th className="py-2 pr-3 font-medium">Comprador</th>
              <th className="py-2 pr-3 font-medium">Compra</th><th className="py-2 font-medium">Entrada</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id} className="border-b last:border-0">
                <td className="py-2.5 pr-3 font-medium">{a.holderName}{a.transferred && <Repeat className="ml-1.5 inline size-3 text-muted-foreground" aria-label="transferido" />}</td>
                <td className="py-2.5 pr-3 font-mono text-xs text-muted-foreground">{a.holderCpf}</td>
                <td className="py-2.5 pr-3">{a.batchName}<span className="block text-xs text-muted-foreground">{brl(a.price)}</span></td>
                <td className="py-2.5 pr-3">{a.buyerName}<span className="block text-xs text-muted-foreground">{a.buyerEmail}</span></td>
                <td className="py-2.5 pr-3 text-xs text-muted-foreground">{a.paidAt ? `${fmtDate(a.paidAt)} ${fmtTime(a.paidAt)}` : "—"}</td>
                <td className="py-2.5"><StatusPill a={a} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">O CPF aparece parcialmente oculto para proteger os compradores. Na portaria, o titular apresenta documento com foto.</p>
    </section>
  );
}

function StatusPill({ a }: { a: Attendee }) {
  return a.status === "used"
    ? <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">Entrou {a.checkedInAt ? fmtTime(a.checkedInAt) : ""}</span>
    : <span className="shrink-0 rounded-full bg-elevated px-2 py-0.5 text-xs text-muted-foreground">Não entrou</span>;
}

/** Planilha CSV (abre direto no Excel/Google Planilhas, com acentos certos). */
function downloadCsv(title: string, rows: Attendee[]) {
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const head = ["Titular", "CPF", "Lote", "Valor", "Comprador", "E-mail do comprador", "Data da compra", "Entrada", "Transferido para"];
  const lines = rows.map((a) => [
    a.holderName, a.holderCpf, a.batchName, (a.price / 100).toFixed(2).replace(".", ","), a.buyerName, a.buyerEmail,
    a.paidAt ? `${fmtDate(a.paidAt)} ${fmtTime(a.paidAt)}` : "", a.status === "used" ? `Entrou ${a.checkedInAt ? fmtTime(a.checkedInAt) : ""}` : "Não entrou",
    a.transferred ? a.ownerEmail : "",
  ].map(cell).join(";"));
  const blob = new Blob(["﻿" + [head.map(cell).join(";"), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `participantes-${title.toLowerCase().normalize("NFD").replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, "")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
