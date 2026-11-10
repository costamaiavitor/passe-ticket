import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Copy, CreditCard, Loader2, QrCode, XCircle } from "lucide-react";
import { toast } from "sonner";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { RequireAuth } from "@/components/require-auth";
import { TicketQr } from "@/components/ticket-qr";
import { CARD_ENABLED, CardPayment } from "@/components/card-payment";
import { useSession } from "@/services/session";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { cancelOrder, orderQuery, simulatePayment } from "@/services/orders";
import { brl, fmtDate, fmtTime } from "@/utils/format";
import type { Order } from "@/types";

export const Route = createFileRoute("/checkout/$orderId")({
  head: () => ({ meta: [{ title: "Pagamento — Passe" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-page max-w-xl py-12"><RequireAuth>{() => <Checkout />}</RequireAuth></main>
      <SiteFooter />
    </div>
  ),
});

function useCountdown(until: string) {
  const [left, setLeft] = useState(() => new Date(until).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(new Date(until).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [until]);
  const s = Math.max(0, Math.floor(left / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function Checkout() {
  const { orderId } = Route.useParams();
  const qc = useQueryClient();
  const { data: order, error, isLoading } = useQuery(orderQuery(orderId));
  const [busy, setBusy] = useState(false);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando pedido…</p>;
  if (error || !order) return <p className="text-sm text-destructive">{error?.message ?? "Pedido não encontrado."}</p>;

  const update = (o: Order) => { qc.setQueryData(orderQuery(orderId).queryKey, o); void qc.invalidateQueries({ queryKey: ["tickets"] }); };
  const act = async (fn: () => Promise<Order>) => {
    setBusy(true);
    try { update(await fn()); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); } finally { setBusy(false); }
  };

  return (
    <div>
      <p className="text-sm text-muted-foreground">Pedido #{order.id.slice(0, 8)}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{order.eventTitle}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{fmtDate(order.eventStartsAt)} · {fmtTime(order.eventStartsAt)} · {order.quantity}× {order.batchName}</p>

      <dl className="mt-6 space-y-1.5 rounded-xl border bg-card p-5 text-sm">
        <div className="flex justify-between text-muted-foreground"><dt>Subtotal</dt><dd>{brl(order.subtotal)}</dd></div>
        {!!order.discount && <div className="flex justify-between text-primary"><dt>Cupom {order.couponCode}</dt><dd>− {brl(order.discount)}</dd></div>}
        <div className="flex justify-between text-muted-foreground"><dt>Taxa da plataforma</dt><dd>{brl(order.fee)}</dd></div>
        <div className="flex justify-between pt-1 font-medium"><dt>Total</dt><dd>{brl(order.total)}</dd></div>
      </dl>

      {order.status === "pending" && (order.cardPending ? <CardInReview /> : (
        <PayChooser order={order} busy={busy} onPaid={update}
          onSimulate={() => act(() => simulatePayment(order.id))} onCancel={() => act(() => cancelOrder(order.id))} />
      ))}

      {order.status === "paid" && (
        <div className="mt-6 rounded-xl border border-primary/40 bg-primary/5 p-6 text-center">
          <CheckCircle2 className="mx-auto size-10 text-primary" />
          <p className="mt-3 font-medium">Pagamento confirmado!</p>
          <p className="mt-1 text-sm text-muted-foreground">Seus ingressos com QR Code já estão disponíveis.</p>
          <Button asChild className="mt-5"><Link to="/ingressos">Ver meus ingressos</Link></Button>
        </div>
      )}

      {(order.status === "expired" || order.status === "cancelled") && (
        <div className="mt-6 rounded-xl border p-6 text-center">
          <XCircle className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 font-medium">{order.status === "expired" ? "Reserva expirada" : "Pedido cancelado"}</p>
          <p className="mt-1 text-sm text-muted-foreground">Os ingressos foram liberados para venda novamente.</p>
          <Button asChild variant="outline" className="mt-5"><Link to="/eventos/$id" params={{ id: order.eventSlug || order.eventId }}>Voltar ao evento</Link></Button>
        </div>
      )}

      {order.status === "refunded" && (
        <div className="mt-6 rounded-xl border p-6 text-center">
          <XCircle className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 font-medium">Pagamento estornado</p>
          <p className="mt-1 text-sm text-muted-foreground">O valor foi devolvido e os ingressos deste pedido foram cancelados.</p>
        </div>
      )}

      {order.status === "refund_required" && (
        <p className="mt-6 rounded-xl border p-6 text-sm">O pagamento chegou após a reserva expirar e o lote esgotou. O valor será estornado.</p>
      )}
    </div>
  );
}

function CardInReview() {
  return (
    <div className="mt-6 rounded-xl border bg-card p-6 text-center">
      <Loader2 className="mx-auto size-8 animate-spin text-primary" />
      <p className="mt-3 font-medium">Pagamento no cartão em análise</p>
      <p className="mt-1 text-sm text-muted-foreground">O Mercado Pago está conferindo a compra. Isso costuma levar poucos minutos; esta página atualiza sozinha.</p>
    </div>
  );
}

/** Escolha da forma de pagamento: Pix (padrão) ou cartão. */
function PayChooser({ order, busy, onPaid, onSimulate, onCancel }: {
  order: Order; busy: boolean; onPaid: (o: Order) => void; onSimulate: () => void; onCancel: () => void;
}) {
  const left = useCountdown(order.expiresAt);
  const { user } = useSession();
  const [method, setMethod] = useState<"pix" | "card">("pix");
  return (
    <div className="mt-6 rounded-xl border bg-card p-5 md:p-6">
      <div className="flex items-center justify-between">
        <p className="font-medium">Forma de pagamento</p>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Clock className="size-4" />{left}</span>
      </div>
      {CARD_ENABLED && (
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-surface p-1">
          {([["pix", "Pix", QrCode], ["card", "Cartão", CreditCard]] as const).map(([m, label, Icon]) => (
            <button key={m} type="button" onClick={() => setMethod(m)}
              className={cn("flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-colors",
                method === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="size-4" />{label}
            </button>
          ))}
        </div>
      )}
      <div className="mt-5">
        {method === "card" && CARD_ENABLED
          ? <CardPayment order={order} payerEmail={user?.email} onDone={onPaid} />
          : order.payment && <PixPanel order={order} busy={busy} onSimulate={onSimulate} />}
      </div>
      <div className="mt-4 border-t pt-4">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>Cancelar pedido</Button>
      </div>
    </div>
  );
}

function PixPanel({ order, busy, onSimulate }: { order: Order; busy: boolean; onSimulate: () => void }) {
  const pix = order.payment!;
  return (
    <div>
      <div className="mt-5 flex justify-center">
        {pix.pixQrBase64
          ? <img src={`data:image/png;base64,${pix.pixQrBase64}`} alt="QR Code Pix" width={220} height={220} className="rounded-lg bg-white p-3" />
          : <TicketQr value={pix.pixCode} />}
      </div>
      <div className="mt-5 flex gap-2">
        <input readOnly value={pix.pixCode} className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 font-mono text-xs" />
        <Button variant="outline" onClick={() => navigator.clipboard.writeText(pix.pixCode).then(() => toast.success("Código Pix copiado"))}><Copy />Copiar</Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Abra o app do seu banco, escolha Pix e leia o QR Code ou cole o código. Assim que o pagamento for aprovado esta página atualiza sozinha e seus ingressos são emitidos.</p>
      {order.paymentProvider === "mock" && (
        <Button className="mt-4" onClick={onSimulate} disabled={busy}>Simular pagamento aprovado</Button>
      )}
    </div>
  );
}
