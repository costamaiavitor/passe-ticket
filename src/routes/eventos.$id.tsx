import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Minus, Plus, Info, Repeat, Undo2, KeyRound, Tag, X } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { AvailabilityBadge } from "@/components/availability-badge";
import { Button } from "@/components/ui/button";
import { HoldersForm } from "@/components/holders-form";
import { createOrder } from "@/services/orders";
import { useSession } from "@/services/session";
import { checkAccessCode, eventQuery, previewCoupon } from "@/services/events";
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
          { title: `${loaderData.title} — BooTickets` },
          { name: "description", content: loaderData.description },
          { property: "og:title", content: loaderData.title },
          { property: "og:description", content: loaderData.description },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary_large_image" },
          // Evento privado: buscadores (Google) não devem listar.
          ...(loaderData.visibility === "unlisted" ? [{ name: "robots", content: "noindex" }] : []),
        ]
      : [{ title: "Evento indisponível — BooTickets" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center text-center">
      <div><p className="text-lg font-medium">Evento não encontrado</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/eventos">Ver eventos</Link></Button></div>
    </div>
  ),
  component: EventPage,
});

const MAX_PER_ORDER = 10;

function EventPage() {
  const { id } = Route.useParams();
  const { data: ev } = useSuspenseQuery(eventQuery(id));
  const buyable = ev.batches.filter((b) => b.status === "active" && b.sold < b.total);
  // Uma linha por categoria (Masculino, Feminino, VIP…): só o lote atual de cada uma fica à venda.
  // Se a pessoa pedir mais do que sobrou no lote atual, o resto vem do próximo lote da mesma categoria (virada).
  const catOf = (b: (typeof ev.batches)[number]) => b.category ?? b.ticketType?.toLowerCase() ?? b.id;
  const groups = buyable.map((cur) => {
    const after = ev.batches.slice(ev.batches.indexOf(cur) + 1);
    const next = after.filter((b) => catOf(b) === catOf(cur) && b.status === "upcoming" && b.sold < b.total);
    const pool = [cur, ...next];
    return { key: catOf(cur), cur, pool, capacity: pool.reduce((s, b) => s + b.total - b.sold, 0) };
  });
  // Carrinho: quantos ingressos de cada categoria. Com uma categoria só, já começa com 1.
  // Fica guardado no navegador: quem escolhe, entra na conta e volta encontra o carrinho como deixou.
  const cartKey = `bt-cart:${ev.id}`;
  const [cart, setCart] = useState<Record<string, number>>(() => (groups.length === 1 ? { [groups[0]!.key]: 1 } : {}));
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(cartKey) ?? "null") as Record<string, number> | null;
      if (saved) setCart(Object.fromEntries(groups.filter((g) => saved[g.key]).map((g) => [g.key, Math.min(saved[g.key]!, g.capacity)])));
    } catch { /* sem acesso ao armazenamento: segue com o carrinho vazio */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey]);

  /** Divide a quantidade da categoria entre o lote atual e, na virada, o próximo. */
  const split = (g: (typeof groups)[number], n: number) => {
    const out: { b: (typeof ev.batches)[number]; n: number }[] = [];
    let rest = n;
    for (const b of g.pool) {
      if (rest <= 0) break;
      const take = Math.min(rest, b.total - b.sold);
      if (take > 0) out.push({ b, n: take });
      rest -= take;
    }
    return out;
  };
  const lines = groups.flatMap((g) => split(g, cart[g.key] ?? 0));
  const qty = lines.reduce((s, l) => s + l.n, 0);
  const setGroupQty = (g: (typeof groups)[number], n: number) => setCart((c) => {
    const others = Object.entries(c).reduce((s, [k, v]) => (k === g.key ? s : s + v), 0);
    // Cada ingresso tem um titular (CPF); até 10 por compra. Limite por CPF é validado no backend.
    const next = { ...c, [g.key]: Math.max(0, Math.min(n, g.capacity, MAX_PER_ORDER - others)) };
    // Só grava quando a pessoa mexe no carrinho (assim abrir a página nunca apaga o que estava guardado).
    try { sessionStorage.setItem(cartKey, JSON.stringify(next)); } catch { /* ignora */ }
    return next;
  });
  const subtotal = lines.reduce((s, l) => s + l.b.price * l.n, 0);
  // Palavra-senha: a compra só libera depois de conferida (o servidor confere de novo na compra).
  const [unlocked, setUnlocked] = useState(!ev.requiresAccessCode);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const unlock = async () => {
    if (!code.trim()) return setCodeError("Digite a palavra-senha.");
    setCheckingCode(true); setCodeError(null);
    try { await checkAccessCode(ev.id, code); setUnlocked(true); }
    catch (e) { setCodeError(e instanceof Error ? e.message : "Palavra-senha incorreta."); }
    finally { setCheckingCode(false); }
  };
  // Cupom de desconto.
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; kind: "percent" | "fixed"; value: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setApplying(true); setCouponError(null);
    try { setCoupon(await previewCoupon(ev.id, couponInput, Math.max(1, qty))); setCouponOpen(false); }
    catch (e) { setCouponError(e instanceof Error ? e.message : "Cupom inválido."); }
    finally { setApplying(false); }
  };
  // Mesmo cálculo do servidor: o cupom vale para cada lote do carrinho.
  const discount = !coupon ? 0 : lines.reduce((s, { b, n }) => {
    const gross = b.price * n;
    return s + Math.min(gross, coupon.kind === "percent" ? Math.round((gross * Math.min(coupon.value, 100)) / 100) : coupon.value * n);
  }, 0);
  const fee = platformFee(subtotal - discount);
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
  const holderLabels = lines.flatMap(({ b, n }) => Array.from({ length: n }, () => b.name));
  const placeOrder = async (holders: { name: string; cpf: string }[]) => {
    if (!qty) return;
    setSubmitting(true); setOrderError(null);
    // Os titulares vêm na mesma ordem dos itens do carrinho.
    let at = 0;
    const items = lines.map(({ b, n }) => ({ batchId: b.id, holders: holders.slice(at, (at += n)) }));
    try {
      const order = await createOrder({
        eventId: ev.id, items,
        ...(ev.requiresAccessCode ? { accessCode: code } : {}),
        ...(coupon ? { couponCode: coupon.code } : {}),
      });
      try { sessionStorage.removeItem(cartKey); } catch { /* ignora */ }
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
      <main className="container-page -mt-24 relative grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          {ev.status === "cancelled" ? (
            <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium text-destructive">Evento cancelado</span>
          ) : <AvailabilityBadge value={ev.availability} />}
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">{ev.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">por {ev.organizer.name}</p>
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <span className="flex items-center gap-2"><Calendar className="size-4 text-primary" />{fmtDate(ev.startsAt)} · {fmtTime(ev.startsAt)}</span>
            <span className="flex items-center gap-2"><MapPin className="size-4 text-primary" />{ev.venue}{ev.address ? ` — ${ev.address}` : ""}, {ev.city}</span>
          </div>
          {ev.description && <p className="mt-8 max-w-2xl whitespace-pre-line leading-relaxed text-muted-foreground">{ev.description}</p>}
          <EventMap venue={ev.venue} address={ev.address} city={ev.city} />

          <div className="mt-10 divide-y border-y">
            <Policy icon={Info} title="Informações importantes">
              <ul className="list-inside list-disc space-y-1">{ev.importantInfo.map((i) => <li key={i}>{i}</li>)}</ul>
            </Policy>
            <Policy icon={Repeat} title="Política de transferência">
              Até {ev.transferPolicy.maxTransfers} transferência(s) por ingresso, até {fmtDate(ev.transferPolicy.deadline)} às {fmtTime(ev.transferPolicy.deadline)}.
              Limite de {ev.maxTicketsPerCpf ?? MAX_TICKETS_PER_CPF} ingressos por CPF neste evento.
            </Policy>
            <Policy icon={Undo2} title="Política de reembolso">
              {ev.refundPolicy || "Cancelamento em até 7 dias após a compra, desde que antes do evento (Código de Defesa do Consumidor, art. 49). Se o evento for cancelado ou adiado, o reembolso é integral."}
            </Policy>
          </div>
        </div>

        <aside className="h-fit rounded-xl border bg-card p-5 lg:sticky lg:top-20">
          <h2 className="font-medium">Ingressos</h2>
          <div className="mt-4 space-y-2">
            {/* Só aparecem os lotes à venda agora: próximos lotes, esgotados e pausados ficam escondidos. */}
            {groups.map((g) => {
              const n = cart[g.key] ?? 0;
              const b = g.cur;
              const left = b.total - b.sold;
              const parts = split(g, n);
              return (
                <div key={g.key} className={cn("rounded-lg border px-4 py-3 transition-colors", n > 0 ? "border-primary bg-primary/5" : "")}>
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{brl(b.price)}</span> · {left} disponíveis</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button size="icon" variant="outline" className="size-8" disabled={step === "holders" || n === 0}
                        onClick={() => setGroupQty(g, n - 1)} aria-label={`Tirar um ingresso ${b.name}`}><Minus /></Button>
                      <span className="w-5 text-center tabular-nums" aria-live="polite">{n}</span>
                      <Button size="icon" variant="outline" className="size-8" disabled={step === "holders" || n >= g.capacity || qty >= MAX_PER_ORDER}
                        onClick={() => setGroupQty(g, n + 1)} aria-label={`Adicionar um ingresso ${b.name}`}><Plus /></Button>
                    </div>
                  </div>
                  {parts.length > 1 && (
                    <p className="mt-2 text-xs text-primary">
                      Virada de lote: {parts.map((p) => `${p.n} no ${p.b.name} (${brl(p.b.price)})`).join(" + ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {buyable.length > 0 ? (
            <>
              <p className="mt-3 text-xs text-muted-foreground">
                Dá para juntar categorias diferentes na mesma compra (até {MAX_PER_ORDER} ingressos). Cada ingresso exige um titular com CPF próprio
                (máx. {ev.maxTicketsPerCpf ?? MAX_TICKETS_PER_CPF} por CPF).
              </p>
              <dl className="mt-5 space-y-1.5 border-t pt-4 text-sm">
                {lines.length > 1 && lines.map(({ b, n }) => (
                  <div key={b.id} className="flex justify-between gap-3 text-muted-foreground"><dt className="min-w-0">{n}× {b.name}</dt><dd className="shrink-0">{brl(b.price * n)}</dd></div>
                ))}
                <Row k={`Subtotal${qty ? ` (${qty} ${qty === 1 ? "ingresso" : "ingressos"})` : ""}`} v={brl(subtotal)} />
                {coupon && (
                  <div className="flex items-center justify-between text-primary">
                    <dt className="flex items-center gap-1.5"><Tag className="size-3.5" />Cupom {coupon.code}
                      {step === "select" && <button type="button" aria-label="Remover cupom" onClick={() => setCoupon(null)} className="text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>}
                    </dt>
                    <dd>− {brl(discount)}</dd>
                  </div>
                )}
                <Row k="Taxa da plataforma (10%)" v={brl(fee)} />
                <Row k="Total" v={brl(subtotal - discount + fee)} strong />
              </dl>
              {!coupon && step === "select" && unlocked && (
                couponOpen ? (
                  <div className="mt-3">
                    <div className="flex gap-2">
                      <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Código do cupom" maxLength={30}
                        onKeyDown={(e) => { if (e.key === "Enter") void applyCoupon(); }}
                        className="h-9 min-w-0 flex-1 rounded-md border bg-surface px-3 text-sm uppercase outline-none focus:border-primary/50" />
                      <Button size="sm" variant="secondary" disabled={applying} onClick={() => void applyCoupon()}>{applying ? "…" : "Aplicar"}</Button>
                    </div>
                    {couponError && <p className="mt-1.5 text-xs text-destructive">{couponError}</p>}
                  </div>
                ) : (
                  <button type="button" onClick={() => setCouponOpen(true)} className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><Tag className="size-3.5" />Tenho um cupom de desconto</button>
                )
              )}
              {!unlocked ? (
                <div className="mt-5 rounded-lg border border-primary/40 bg-primary/5 p-3">
                  <p className="flex items-center gap-2 text-sm font-medium"><KeyRound className="size-4 text-primary" />Este evento pede uma palavra-senha</p>
                  <p className="mt-1 text-xs text-muted-foreground">Peça a senha para quem organiza a festa.</p>
                  <div className="mt-3 flex gap-2">
                    <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Palavra-senha" maxLength={60}
                      onKeyDown={(e) => { if (e.key === "Enter") void unlock(); }}
                      className="h-10 min-w-0 flex-1 rounded-md border bg-surface px-3 text-sm outline-none focus:border-primary/50" />
                    <Button disabled={checkingCode} onClick={() => void unlock()}>{checkingCode ? "…" : "Liberar"}</Button>
                  </div>
                  {codeError && <p className="mt-1.5 text-xs text-destructive">{codeError}</p>}
                </div>
              ) : step === "select" ? (
                <Button className="mt-5 w-full" disabled={!qty} onClick={goToHolders}>{!qty ? "Escolha seus ingressos" : user ? "Continuar" : "Entrar para comprar"}</Button>
              ) : (
                <HoldersForm key={holderLabels.join("|")} labels={holderLabels} defaultName={user?.name} loading={submitting} error={orderError}
                  onBack={() => setStep("select")} onSubmit={placeOrder} />
              )}
            </>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">
              {ev.status === "cancelled" ? "Este evento foi cancelado. As vendas foram encerradas."
                : ev.batches.some((b) => b.total - b.sold > 0 && b.status !== "soldout") ? "Nenhum ingresso à venda no momento. Volte mais tarde."
                : "Ingressos esgotados para este evento."}
            </p>
          )}
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}

/** Mapa do local (Google Maps incorporado, sem chave de API) + atalho para abrir no app de mapas. */
function EventMap({ venue, address, city }: { venue: string; address: string; city: string }) {
  const q = [venue, address, city].filter(Boolean).join(", ");
  const enc = encodeURIComponent(q);
  return (
    <section className="mt-8 max-w-2xl overflow-hidden rounded-xl border bg-card">
      <iframe title={`Mapa: ${q}`} src={`https://www.google.com/maps?q=${enc}&output=embed`} loading="lazy"
        referrerPolicy="no-referrer-when-downgrade" className="h-56 w-full border-0 md:h-72" />
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0"><p className="truncate text-sm font-medium">{venue}</p>
          <p className="truncate text-xs text-muted-foreground">{[address, city].filter(Boolean).join(" · ")}</p></div>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <a href={`https://www.google.com/maps/search/?api=1&query=${enc}`} target="_blank" rel="noreferrer"><MapPin />Abrir no mapa</a>
        </Button>
      </div>
    </section>
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
