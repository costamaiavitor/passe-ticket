import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, MapPin } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { RequireAuth } from "@/components/require-auth";
import { TicketQr } from "@/components/ticket-qr";
import { IncomingTransfers, TransferControls } from "@/components/ticket-transfer";
import { Button } from "@/components/ui/button";
import { ticketsQuery } from "@/services/tickets";
import { fmtDate, fmtTime } from "@/utils/format";
import type { Ticket } from "@/types";

export const Route = createFileRoute("/ingressos")({
  head: () => ({ meta: [{ title: "Meus ingressos — Booticket" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-page py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Meus ingressos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Apresente o QR Code na entrada junto com um documento do titular.</p>
        <RequireAuth>{() => <><IncomingTransfers /><TicketList /></>}</RequireAuth>
      </main>
      <SiteFooter />
    </div>
  ),
});

function TicketList() {
  const { data, isLoading, error } = useQuery({ ...ticketsQuery(), refetchInterval: 15_000 });
  if (isLoading) return <p className="mt-8 text-sm text-muted-foreground">Carregando…</p>;
  if (error) return <p className="mt-8 text-sm text-destructive">{error.message}</p>;
  if (!data?.length)
    return (
      <div className="mt-10 rounded-xl border p-10 text-center">
        <p className="font-medium">Você ainda não tem ingressos</p>
        <Button asChild className="mt-4"><Link to="/eventos">Explorar eventos</Link></Button>
      </div>
    );
  return <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">{data.map((t) => <TicketCard key={t.id} t={t} />)}</div>;
}

function TicketCard({ t }: { t: Ticket }) {
  const used = t.status === "used";
  return (
    <article className="overflow-hidden rounded-xl border bg-card">
      <div className="relative h-28">
        <img src={t.event.coverUrl} alt="" className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
      </div>
      <div className="p-5">
        <h2 className="font-medium">{t.event.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{fmtDate(t.event.startsAt)} · {fmtTime(t.event.startsAt)}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-3.5" />{t.event.venue}, {t.event.city}</p>
        <div className="mt-5 flex justify-center">
          {t.qrPayload ? (
            <TicketQr value={t.qrPayload} />
          ) : (
            <div className="grid size-[244px] place-items-center rounded-lg border border-dashed text-center">
              <div><CheckCircle2 className="mx-auto size-8 text-primary" />
                <p className="mt-2 text-sm font-medium">Ingresso utilizado</p>
                {t.checkedInAt && <p className="text-xs text-muted-foreground">Entrada em {fmtDate(t.checkedInAt)} · {fmtTime(t.checkedInAt)}</p>}</div>
            </div>
          )}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 text-sm">
          <div><dt className="text-xs text-muted-foreground">Titular</dt><dd>{t.holderName}</dd></div>
          <div><dt className="text-xs text-muted-foreground">CPF</dt><dd className="font-mono">{t.holderCpf}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Lote</dt><dd>{t.batchName}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Status</dt><dd className={used ? "text-muted-foreground" : "text-primary"}>{used ? "Utilizado" : "Válido"}</dd></div>
        </dl>
        <TransferControls t={t} />
        <p className="mt-3 text-center font-mono text-[10px] text-muted-foreground">#{t.id.slice(0, 8)}</p>
      </div>
    </article>
  );
}
