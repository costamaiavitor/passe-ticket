import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Calendar, MapPin, Minus, Plus, Info, Repeat, Undo2 } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { AvailabilityBadge } from "@/components/availability-badge";
import { Button } from "@/components/ui/button";
import { HoldersForm } from "@/components/holders-form";
import { createOrder } from "@/services/orders";
import { useSession } from "@/services/session";
import { eventQuery } from "@/services/events";
import { ApiError } from "@/services/http";
import { brl, fmtDate, fmtTime, MAX_TICKETS_PER_CPF, platformFee } from "@/utils/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/eventos/$id")({
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(eventQuery(params.id));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) throw notFound();
      throw e;
    }
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} — Passe` },
          { name: "description", content: loaderData.description },
          { property: "og:title", content: loaderData.title },
          { property: "og:description", content: loaderData.description },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary_large_image" },
        ]
      : [{ title: "Evento indisponível — Passe" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center text-center">
      <div><p className="text-lg font-medium">Evento não encontrado</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/eventos">Ver eventos</Link></Button></div>
    </div>
  ),
  component: EventPage,
});

function EventPage() {
  const { id } = Route.useParams();
  const { data: ev } = useSuspenseQuery(eventQuery(id));
  const buyable = ev.batches.filter((b) => b.status === "active" && b.sold < b.total);
  const [batchId, setBatchId] = useState(buyable[0]?.id);
  const [qty, setQty] = useState(1);
  const batch = ev.batches.find((b) => b.id === batchId);
  const remaining = batch ? batch.total - batch.sold : 0;
  // Cada ingresso tem um titular (CPF); limite por CPF é validado no backend.
  const maxQty = Math.min(10, remaining);
  const subtotal = (batch?.price ?? 0) * qty;
  const fee = platformFee(subtotal);
  const { user } = useSession();
  const navigate = useNavigate();
  const [step, setStep] = useState<"select" | "holders">("select");
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const goToHolders = () => {
    if (!user) {
      void navigate({ to: "/entrar", search: { redirect: `/eventos/${id}` } });
      return;
    }
    setOrderError(null);
    setStep("holders");
  };
  const placeOrder = async (holders: { name: string; cpf: string }[]) => {
    if (!batch) return;
    setSubmitting(true); setOrderError(null);
    try {
      const order = await createOrder({ eventId: ev.id, batchId: batch.id, holders });
      navigate({ to: "/checkout/$orderId", params: { orderId: order.id } });
    } catch (e) {
      setOrderError(e instanceof Error ? e.message : "Não foi possível reservar.");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="relative h-[42vh] min-h-72 overflow-hidden">
        <img src={ev.coverUrl} alt={ev.title} width={1280} height={768} className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>
      <main className="container-page -mt-24 relative grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          <AvailabilityBadge value={ev.availability} />
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">{ev.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">por {ev.organizer.name}</p>
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <span className="flex items-center gap-2"><Calendar className="size-4 text-primary" />{fmtDate(ev.startsAt)} · {fmtTime(ev.startsAt)}</span>
            <span className="flex items-center gap-2"><MapPin className="size-4 text-primary" />{ev.venue}{ev.address ? ` — ${ev.address}` : ""}, {ev.city}</span>
          </div>
          <p className="mt-8 max-w-2xl leading-relaxed text-muted-foreground">{ev.description}</p>

          <div className="mt-10 divide-y border-y">
            <Policy icon={Info} title="Informações importantes">
              <ul className="list-inside list-disc space-y-1">{ev.importantInfo.map((i) => <li key={i}>{i}</li>)}</ul>
            </Policy>
            <Policy icon={Repeat} title="Política de transferência">
              Até {ev.transferPolicy.maxTransfers} transferência(s) por ingresso, até {fmtDate(ev.transferPolicy.deadline)} às {fmtTime(ev.transferPolicy.deadline)}.
              Limite de {MAX_TICKETS_PER_CPF} ingressos por CPF neste evento.
            </Policy>
            <Policy icon={Undo2} title="Política de reembolso">{ev.refundPolicy}</Policy>
          </div>
        </div>

        <aside className="h-fit rounded-xl border bg-card p-5 lg:sticky lg:top-20">
          <h2 className="font-medium">Ingressos</h2>
          <div className="mt-4 space-y-2">
            {ev.batches.map((b) => {
              const left = b.total - b.sold;
              const disabled = b.status !== "active" || left <= 0;
              return (
                <button key={b.id} disabled={disabled || step === "holders"} onClick={() => { setBatchId(b.id); setQty(1); }}
                  className={cn("flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors",
                    batchId === b.id ? "border-primary bg-primary/5" : "hover:border-muted-foreground/40",
                    disabled && "cursor-not-allowed opacity-50")}>
                  <div><p className="text-sm font-medium">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{disabled ? "Esgotado / encerrado" : `${left} disponíveis`}</p></div>
                  <span className="text-sm font-medium">{brl(b.price)}</span>
                </button>
              );
            })}
          </div>
          {batch && buyable.length > 0 ? (
            <>
              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Quantidade</span>
                <div className="flex items-center gap-3">
                  <Button size="icon" variant="outline" className="size-8" disabled={step === "holders"} onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuir"><Minus /></Button>
                  <span className="w-4 text-center tabular-nums">{qty}</span>
                  <Button size="icon" variant="outline" className="size-8" disabled={step === "holders"} onClick={() => setQty((q) => Math.min(maxQty, q + 1))} aria-label="Aumentar"><Plus /></Button>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Cada ingresso exige um titular com CPF próprio (máx. {MAX_TICKETS_PER_CPF} por CPF).</p>
              <dl className="mt-5 space-y-1.5 border-t pt-4 text-sm">
                <Row k="Subtotal" v={brl(subtotal)} />
                <Row k="Taxa da plataforma (10%)" v={brl(fee)} />
                <Row k="Total" v={brl(subtotal + fee)} strong />
              </dl>
              {step === "select" ? (
                <Button className="mt-5 w-full" onClick={goToHolders}>{user ? "Continuar" : "Entrar para comprar"}</Button>
              ) : (
                <HoldersForm key={`${batch.id}-${qty}`} qty={qty} defaultName={user?.name} loading={submitting} error={orderError}
                  onBack={() => setStep("select")} onSubmit={placeOrder} />
              )}
            </>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">Ingressos esgotados para este evento.</p>
          )}
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}

function Policy({ icon: I, title, children }: { icon: typeof Info; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-5">
      <I className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div><p className="text-sm font-medium">{title}</p><div className="mt-1 text-sm text-muted-foreground">{children}</div></div>
    </div>
  );
}
const Row = ({ k, v, strong }: { k: string; v: string; strong?: boolean }) => (
  <div className={cn("flex justify-between", strong ? "pt-1 font-medium" : "text-muted-foreground")}><dt>{k}</dt><dd>{v}</dd></div>
);
