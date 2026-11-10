import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, Check, CheckCircle2, Copy, Minus, Plus, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { RequireAuth } from "@/components/require-auth";
import { EventCard } from "@/components/event-card";
import { AGES, ageToInfo, CATEGORIES, centsFrom, Chips, COVERS, CoverPicker, inputCls, Label, origin, presetCover, Section, TextField, TICKET_NAMES } from "@/components/event-form";
import { AccessFields, CouponDrafts, CourtesyDrafts, type DraftCourtesy } from "@/components/event-promos";
import { Button } from "@/components/ui/button";
import { createEvent, type NewCoupon, type NewEvent } from "@/services/organizer";
import { hasRole } from "@/services/session";
import { brl, categoryLabel, platformFee } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { EventCategory, OrganizerEvent } from "@/types";

export const Route = createFileRoute("/organizador/novo")({
  head: () => ({ meta: [{ title: "Criar evento — Booticket" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-page px-5 pb-32 pt-6 md:pb-16 md:pt-10">
        <RequireAuth>
          {(user) =>
            hasRole(user, "organizer") ? <CreateEvent /> : (
              <div className="mx-auto max-w-md rounded-xl border p-8 text-center">
                <p className="font-medium">Primeiro, libere sua conta para criar eventos.</p>
                <Button asChild className="mt-4"><Link to="/organizador">Continuar</Link></Button>
              </div>
            )
          }
        </RequireAuth>
      </main>
    </div>
  ),
});

interface BatchForm { key: number; type: string; price: number; total: string }
let nextKey = 1;
const newBatch = (type = ""): BatchForm => ({ key: nextKey++, type, price: 0, total: "" });

/** Nome exibido do lote: "Pista — 2º lote" (o número conta os lotes anteriores do mesmo tipo). */
function lotName(batches: BatchForm[], b: BatchForm) {
  const t = b.type.trim();
  if (!t) return "";
  const n = batches.slice(0, batches.indexOf(b) + 1).filter((x) => x.type.trim().toLowerCase() === t.toLowerCase()).length;
  return `${t} — ${n}º lote`;
}

function CreateEvent() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<EventCategory>("festas");
  const [coverChoice, setCoverChoice] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("22:00");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [age, setAge] = useState("18");
  const [info, setInfo] = useState("");
  const [maxPerCpf, setMaxPerCpf] = useState(2);
  const [batches, setBatches] = useState<BatchForm[]>([newBatch("Pista")]);
  const [visibility, setVisibility] = useState<"public" | "unlisted">("public");
  const [accessCode, setAccessCode] = useState("");
  const [coupons, setCoupons] = useState<NewCoupon[]>([]);
  const [courtesies, setCourtesies] = useState<DraftCourtesy[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<OrganizerEvent | null>(null);

  const coverUrl = coverChoice || presetCover(COVERS[0]!.file);
  const startsAt = date && time ? `${date}T${time}:00-03:00` : "";

  const m = useMutation({
    mutationFn: (data: NewEvent) => createEvent(data),
    onSuccess: (ev) => {
      void qc.invalidateQueries({ queryKey: ["organizer-events"] });
      if (ev.courtesyErrors?.length)
        toast.error(`Evento criado, mas algumas cortesias não foram enviadas: ${ev.courtesyErrors.join(" · ")}`, { duration: 15000 });
      setCreated(ev); window.scrollTo({ top: 0 });
    },
  });

  const updateBatch = (key: number, patch: Partial<BatchForm>) =>
    setBatches((bs) => bs.map((b) => (b.key === key ? { ...b, ...patch } : b)));

  const validate = (): string | null => {
    if (title.trim().length < 3) return "Dê um nome ao evento (pelo menos 3 letras).";
    if (!date || !time) return "Informe a data e o horário do evento.";
    if (new Date(startsAt).getTime() < Date.now() + 60 * 60_000) return "A data do evento precisa ser no futuro.";
    if (venue.trim().length < 2) return "Informe o nome do local.";
    if (city.trim().length < 2) return "Informe a cidade.";
    if (!batches.length) return "Adicione pelo menos um tipo de ingresso.";
    for (const b of batches) {
      if (!b.type.trim()) return "Informe o tipo de cada ingresso (ex.: Pista, Camarote).";
      const n = Number(b.total);
      if (!Number.isInteger(n) || n < 1) return `Informe quantos ingressos “${lotName(batches, b)}” terá.`;
    }
    if (accessCode.trim() === "" && accessCode !== "") return "Digite a palavra-senha ou desmarque a opção.";
    for (const c of courtesies)
      if (!batches.some((b) => String(b.key) === c.batchKey)) return `Escolha de novo o tipo de ingresso da cortesia de ${c.name} (o tipo foi removido).`;
    return null;
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = validate();
    setFormError(err);
    if (err) return;
    const importantInfo = [
      ageToInfo(age),
      ...info.split("\n").map((l) => l.trim()).filter(Boolean),
    ];
    const salesStart = new Date(Date.now() - 60_000).toISOString();
    m.mutate({
      title: title.trim(), category, coverUrl, startsAt: new Date(startsAt).toISOString(),
      venue: venue.trim(), city: city.trim(), address: address.trim(), description: description.trim(),
      importantInfo, maxTicketsPerCpf: maxPerCpf, maxTransfers: 1,
      visibility, accessCode: accessCode.trim(),
      batches: batches.map((b) => ({
        name: lotName(batches, b), ticketType: b.type.trim(), price: b.price, total: Number(b.total),
        salesStart, salesEnd: new Date(startsAt).toISOString(),
      })),
      coupons,
      courtesies: courtesies.map((c) => ({ name: c.name, cpf: c.cpf, email: c.email, batchIndex: batches.findIndex((b) => String(b.key) === c.batchKey) })),
    });
  };

  const preview = useMemo(() => ({
    id: "preview", slug: "preview", title: title.trim() || "Nome do seu evento", category, coverUrl,
    startsAt: startsAt || new Date(Date.now() + 7 * 86400_000).toISOString(),
    venue: venue.trim() || "Local", city: city.trim() || "Cidade",
    priceFrom: batches.length ? Math.min(...batches.map((b) => b.price)) : 0,
    availability: "available" as const, popularity: 0,
  }), [title, category, coverUrl, startsAt, venue, city, batches]);

  if (created) return <Created ev={created} onDone={() => navigate({ to: "/organizador" })} />;

  return (
    <form onSubmit={submit} noValidate>
      <Link to="/organizador" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Meus eventos</Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">Crie seu evento</h1>
      <p className="mt-1 text-sm text-muted-foreground">Preencha o essencial. Dá para ajustar depois.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-4">
          <Section n={1} title="O evento">
            <TextField label="Nome do evento" value={title} onChange={setTitle} placeholder="Ex.: Baile da Lua — Edição Verão" maxLength={140} />
            <div>
              <Label>Categoria</Label>
              <Chips options={CATEGORIES.map((c) => ({ value: c, label: categoryLabel[c] ?? c }))} value={category} onChange={(v) => setCategory(v as EventCategory)} />
            </div>
            <CoverPicker value={coverUrl} onChange={setCoverChoice} />
          </Section>

          <Section n={2} title="Quando e onde">
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Data" type="date" value={date} onChange={setDate} />
              <TextField label="Horário" type="time" value={time} onChange={setTime} />
            </div>
            <TextField label="Local" value={venue} onChange={setVenue} placeholder="Ex.: Galpão 12" />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Cidade" value={city} onChange={setCity} placeholder="Ex.: Fortaleza" />
              <TextField label="Endereço (opcional)" value={address} onChange={setAddress} placeholder="Rua, número, bairro" />
            </div>
          </Section>

          <Section n={3} title="Ingressos" hint="Lotes do mesmo tipo viram sozinhos: o 2º lote de Pista só abre quando o 1º esgotar.">
            <div className="space-y-3">
              {batches.map((b, i) => (
                <div key={b.key} className="rounded-lg border bg-surface p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{lotName(batches, b) || `Ingresso ${i + 1}`}</span>
                    {batches.length > 1 && (
                      <button type="button" onClick={() => setBatches((bs) => bs.filter((x) => x.key !== b.key))}
                        className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-elevated hover:text-destructive" aria-label="Remover ingresso">
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                  <input value={b.type} onChange={(e) => updateBatch(b.key, { type: e.target.value })} placeholder="Tipo (ex.: Pista, Camarote)" maxLength={40} className={cn(inputCls, "mt-1")} />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {TICKET_NAMES.map((t) => (
                      <button key={t} type="button" onClick={() => updateBatch(b.key, { type: t })}
                        className={cn("rounded-full border px-2.5 py-1 text-xs transition-colors",
                          b.type === t ? "border-primary bg-primary/10 text-foreground" : "text-muted-foreground hover:border-primary/50 hover:text-foreground")}>{t}</button>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs text-muted-foreground">Preço</span>
                      <input inputMode="numeric" value={brl(b.price)} onChange={(e) => updateBatch(b.key, { price: centsFrom(e.target.value) })} className={inputCls} />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs text-muted-foreground">Quantidade</span>
                      <input inputMode="numeric" value={b.total} onChange={(e) => updateBatch(b.key, { total: e.target.value.replace(/\D/g, "").slice(0, 7) })} placeholder="Ex.: 200" className={inputCls} />
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {b.price > 0
                      ? <>Cliente paga <span className="text-foreground">{brl(b.price + platformFee(b.price))}</span> (ingresso + 10% de taxa). Você recebe {brl(b.price)}.</>
                      : "Ingresso gratuito: o cliente só garante a vaga, sem pagar."}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" onClick={() => setBatches((bs) => [...bs, newBatch(bs[bs.length - 1]?.type ?? "")])}>
                <Plus />Próximo lote{batches.length && batches[batches.length - 1]!.type.trim() ? ` de ${batches[batches.length - 1]!.type.trim()}` : ""}
              </Button>
              <Button type="button" variant="outline" onClick={() => setBatches((bs) => [...bs, newBatch()])}><Plus />Outro tipo de ingresso</Button>
            </div>
          </Section>

          <Section n={4} title="Regras e informações">
            <div>
              <Label>Idade mínima</Label>
              <Chips options={AGES.map((a) => ({ value: a, label: a === "Livre" ? "Livre" : `${a}+` }))} value={age} onChange={setAge} />
            </div>
            <div>
              <Label>Ingressos por CPF</Label>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="icon" aria-label="Diminuir" onClick={() => setMaxPerCpf((n) => Math.max(1, n - 1))}><Minus /></Button>
                <span className="w-8 text-center text-lg font-semibold">{maxPerCpf}</span>
                <Button type="button" variant="outline" size="icon" aria-label="Aumentar" onClick={() => setMaxPerCpf((n) => Math.min(20, n + 1))}><Plus /></Button>
                <span className="text-xs text-muted-foreground">Limite por pessoa, para evitar cambista.</span>
              </div>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm">Descrição</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Line-up, atrações, dress code…" className={cn(inputCls, "h-auto py-2")} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm">Avisos importantes <span className="text-muted-foreground">(um por linha)</span></span>
              <textarea value={info} onChange={(e) => setInfo(e.target.value)} rows={3} placeholder={"Documento com foto obrigatório\nProibida a entrada de bebidas"} className={cn(inputCls, "h-auto py-2")} />
            </label>
          </Section>

          <Section n={5} title="Acesso, cupons e cortesias" hint="Tudo opcional. Dá para mudar depois em Editar.">
            <AccessFields isNew visibility={visibility} onVisibility={setVisibility} accessCode={accessCode} onAccessCode={setAccessCode} />
            <div>
              <Label>Cupons de desconto</Label>
              <CouponDrafts value={coupons} onChange={setCoupons} />
            </div>
            <div>
              <Label>Ingressos de cortesia</Label>
              <CourtesyDrafts value={courtesies} onChange={setCourtesies}
                batches={batches.filter((b) => b.type.trim()).map((b) => ({ key: String(b.key), label: lotName(batches, b) }))} />
            </div>
          </Section>

          {(formError || m.error) && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError ?? m.error?.message}</p>}
          <Button type="submit" size="lg" className="hidden w-full md:flex" disabled={m.isPending}>{m.isPending ? "Publicando…" : "Publicar evento"}</Button>
        </div>

        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Prévia</p>
          <div className="pointer-events-none"><EventCard event={preview} /></div>
          <p className="mt-3 text-xs text-muted-foreground">É assim que o evento aparece na página inicial e na busca.</p>
        </aside>
      </div>

      {/* Celular: botão principal fixo embaixo. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 p-4 backdrop-blur md:hidden">
        <Button type="submit" size="lg" className="w-full" disabled={m.isPending}>{m.isPending ? "Publicando…" : "Publicar evento"}</Button>
      </div>
    </form>
  );
}

function Created({ ev, onDone }: { ev: OrganizerEvent; onDone: () => void }) {
  const inReview = ev.status === "review";
  const url = `${origin()}/eventos/${ev.slug}`;
  const [copied, setCopied] = useState(false);
  const share = async () => {
    if (navigator.share) { await navigator.share({ title: ev.title, url }).catch(() => undefined); return; }
    await navigator.clipboard.writeText(url);
    setCopied(true);
  };
  return (
    <section className="mx-auto max-w-md text-center">
      <CheckCircle2 className="mx-auto size-12 text-primary" />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{inReview ? "Evento enviado para análise!" : "Evento publicado!"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {inReview
          ? "A equipe do Booticket confere os dados e aprova em breve. Você recebe um e-mail quando o evento entrar no ar; aí é só divulgar o link abaixo."
          : "Os ingressos já estão à venda. Divulgue o link no Instagram e no WhatsApp."}
      </p>
      <div className="mt-6 flex items-center gap-2 rounded-lg border bg-card p-2 pl-3 text-left">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{url}</span>
        <Button size="sm" variant="secondary" onClick={() => { void navigator.clipboard.writeText(url); setCopied(true); }}>
          {copied ? <Check /> : <Copy />}{copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
      <div className="mt-4 grid gap-2">
        <Button size="lg" onClick={() => void share()}><Share2 />Compartilhar</Button>
        <Button asChild size="lg" variant="outline"><Link to="/eventos/$id" params={{ id: ev.slug }}>Ver página do evento</Link></Button>
        <Button size="lg" variant="ghost" onClick={onDone}>Ir para Meus eventos</Button>
      </div>
    </section>
  );
}
