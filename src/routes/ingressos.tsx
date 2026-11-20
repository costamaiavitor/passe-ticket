import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, MapPin } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { RequireAuth } from "@/components/require-auth";
import { TicketQr } from "@/components/ticket-qr";
import { IncomingTransfers, TransferControls } from "@/components/ticket-transfer";
import { Button } from "@/components/ui/button";
import { Loading, Rise, RiseWords } from "@/components/motion";
import { ticketsQuery } from "@/services/tickets";
import { myOrdersQuery, refundOrder } from "@/services/orders";
import { brl, fmtDate, fmtTime } from "@/utils/format";
import type { Order, Ticket } from "@/types";

export const Route = createFileRoute("/ingressos")({
  head: () => ({ meta: [{ title: "Meus ingressos — BooTickets" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-page py-12">
        <h1 className="text-3xl font-semibold tracking-tight"><RiseWords text="Meus ingressos" /></h1>
        <p className="mt-1 text-sm text-muted-foreground">Apresente o QR Code na entrada junto com um documento do titular.</p>
        <RequireAuth>{() => <><IncomingTransfers /><TicketList /><Refunds /></>}</RequireAuth>
      </main>
      <SiteFooter />
    </div>
  ),
});

function TicketList() {
  const { data, isLoading, error } = useQuery({ ...ticketsQuery(), refetchInterval: 15_000 });
  if (isLoading) return <Loading className="mt-8" />;
  if (error) return <p className="mt-8 text-sm text-destructive">{error.message}</p>;
  if (!data?.length)
    return (
      <div className="mt-10 rounded-xl border p-10 text-center">
        <p className="font-medium">Você ainda não tem ingressos</p>
        <Button asChild className="mt-4"><Link to="/eventos">Explorar eventos</Link></Button>
      </div>
    );
  return <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">{data.map((t, i) => <Rise key={t.id} i={i % 6}><TicketCard t={t} /></Rise>)}</div>;
}

/** Compras que ainda podem ser devolvidas (até 7 dias depois da compra e antes do evento). */
function Refunds() {
  const { data } = useQuery(myOrdersQuery());
  const open = (data ?? []).filter((o) => o.refundableUntil && Date.parse(o.refundableUntil) > Date.now());
  if (!open.length) return null;
  return (
    <section className="mt-12">
      <h2 className="text-lg font-semibold">Devolver ingressos</h2>
      <p className="mt-1 text-sm text-muted-foreground">Mudou de ideia? Você pode devolver a compra em até 7 dias, desde que o evento ainda não tenha começado. O valor total volta pelo mesmo meio de pagamento.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{open.map((o) => <RefundCard key={o.id} o={o} />)}</div>
    </section>
  );
}

function RefundCard({ o }: { o: Order }) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const m = useMutation({
    mutationFn: () => refundOrder(o.id),
    onSuccess: () => {
      toast.success("Devolução feita. Os ingressos foram cancelados e o valor foi estornado.");
      void qc.invalidateQueries({ queryKey: ["my-orders"] });
      void qc.invalidateQueries({ queryKey: ticketsQuery().queryKey });
    },
    onError: (e) => { toast.error(e instanceof Error ? e.message : "Não foi possível devolver."); setConfirming(false); },
  });
  return (
    <div className="rounded-xl border bg-card p-4 text-sm">
      <p className="font-medium">{o.eventTitle}</p>
      <p className="text-muted-foreground">{o.quantity} {o.quantity === 1 ? "ingresso" : "ingressos"} · {brl(o.total)} · pode devolver até {fmtDate(o.refundableUntil!)} às {fmtTime(o.refundableUntil!)}</p>
      {confirming ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs">Todos os ingressos desta compra serão cancelados e você recebe {brl(o.total)} de volta. Isso não pode ser desfeito.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={m.isPending} onClick={() => m.mutate()}>{m.isPending ? "Devolvendo…" : "Confirmar devolução"}</Button>
            <Button size="sm" variant="outline" disabled={m.isPending} onClick={() => setConfirming(false)}>Voltar</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="mt-3" onClick={() => setConfirming(true)}>Devolver esta compra</Button>
      )}
    </div>
  );
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
