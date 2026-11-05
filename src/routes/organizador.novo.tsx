import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, Check, CheckCircle2, Copy, ImagePlus, Minus, Plus, Share2, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { RequireAuth } from "@/components/require-auth";
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { createEvent, type NewEvent } from "@/services/organizer";
import { hasRole } from "@/services/session";
import { brl, categoryLabel, platformFee } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { EventCategory, OrganizerEvent } from "@/types";

export const Route = createFileRoute("/organizador/novo")({
  head: () => ({ meta: [{ title: "Criar evento — Passe" }, { name: "robots", content: "noindex" }] }),
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

// Capas prontas (servidas pelo próprio site em /covers) para ninguém travar por falta de foto.
const COVERS = [
  { file: "festa.jpg", label: "Festa" },
  { file: "show.jpg", label: "Show" },
  { file: "teatro.jpg", label: "Teatro" },
  { file: "conferencia.jpg", label: "Palestra" },
];
const CATEGORIES: EventCategory[] = ["festas", "shows", "teatro", "conferencias", "esportes"];
const AGES = ["Livre", "14", "16", "18"];
const TICKET_NAMES = ["Pista", "Camarote", "Open bar", "VIP", "Meia-entrada"];

interface BatchForm { key: number; name: string; price: number; total: string }
let nextKey = 1;
const newBatch = (name = ""): BatchForm => ({ key: nextKey++, name, price: 0, total: "" });

const origin = () => (typeof window === "undefined" ? "" : window.location.origin);

function CreateEvent() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<EventCategory>("festas");
  const [cover, setCover] = useState(COVERS[0]!.file);
  const [customCover, setCustomCover] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("22:00");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [age, setAge] = useState("18");
  const [info, setInfo] = useState("");
  const [maxPerCpf, setMaxPerCpf] = useState(2);
  const [batches, setBatches] = useState<BatchForm[]>([newBatch("Pista — 1º lote")]);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<OrganizerEvent | null>(null);

  const coverUrl = customCover.trim() || `${origin()}/covers/${cover}`;
  const startsAt = date && time ? `${date}T${time}:00-03:00` : "";

  const m = useMutation({
    mutationFn: (data: NewEvent) => createEvent(data),
    onSuccess: (ev) => { void qc.invalidateQueries({ queryKey: ["organizer-events"] }); setCreated(ev); window.scrollTo({ top: 0 }); },
  });

  const updateBatch = (key: number, patch: Partial<BatchForm>) =>
    setBatches((bs) => bs.map((b) => (b.key === key ? { ...b, ...patch } : b)));

  const validate = (): string | null => {
    if (title.trim().length < 3) return "Dê um nome ao evento (pelo menos 3 letras).";
    if (!date || !time) return "Informe a data e o horário do evento.";
    if (new Date(startsAt).getTime() < Date.now() + 60 * 60_000) return "A data do evento precisa ser no futuro.";
    if (venue.trim().length < 2) return "Informe o nome do local.";
    if (city.trim().length < 2) return "Informe a cidade.";
    if (customCover.trim() && !/^https?:\/\/.+/i.test(customCover.trim())) return "O link da capa precisa começar com https://";
    if (!batches.length) return "Adicione pelo menos um tipo de ingresso.";
    for (const b of batches) {
      if (!b.name.trim()) return "Dê um nome a cada ingresso (ex.: Pista — 1º lote).";
      const n = Number(b.total);
      if (!Number.isInteger(n) || n < 1) return `Informe quantos ingressos “${b.name}” terá.`;
    }
    return null;
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = validate();
    setFormError(err);
    if (err) return;
    const importantInfo = [
      age === "Livre" ? "Classificação livre" : `Proibido para menores de ${age} anos`,
      ...info.split("\n").map((l) => l.trim()).filter(Boolean),
    ];
    const salesStart = new Date(Date.now() - 60_000).toISOString();
    m.mutate({
      title: title.trim(), category, coverUrl, startsAt: new Date(startsAt).toISOString(),
      venue: venue.trim(), city: city.trim(), address: address.trim(), description: description.trim(),
      importantInfo, maxTicketsPerCpf: maxPerCpf, maxTransfers: 1,
      batches: batches.map((b) => ({
        name: b.name.trim(), price: b.price, total: Number(b.total), salesStart, salesEnd: new Date(startsAt).toISOString(),
      })),
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
            <div>
              <Label>Capa</Label>
              <div className="grid grid-cols-4 gap-2">
                {COVERS.map((c) => (
                  <button key={c.file} type="button" onClick={() => { setCover(c.file); setCustomCover(""); }}
                    className={cn("relative aspect-[4/3] overflow-hidden rounded-md border-2 transition-colors",
                      !customCover && cover === c.file ? "border-primary" : "border-transparent opacity-70 hover:opacity-100")}>
                    <img src={`/covers/${c.file}`} alt={c.label} className="size-full object-cover" />
                    {!customCover && cover === c.file && <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-3" /></span>}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <ImagePlus className="size-4 shrink-0 text-muted-foreground" />
                <input value={customCover} onChange={(e) => setCustomCover(e.target.value)} placeholder="Ou cole o link de uma imagem sua (https://…)"
                  className={inputCls} inputMode="url" />
              </div>
            </div>
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

          <Section n={3} title="Ingressos" hint="Cada linha é um tipo de ingresso com preço e quantidade próprios.">
            <div className="space-y-3">
              {batches.map((b, i) => (
                <div key={b.key} className="rounded-lg border bg-surface p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Ingresso {i + 1}</span>
                    {batches.length > 1 && (
                      <button type="button" onClick={() => setBatches((bs) => bs.filter((x) => x.key !== b.key))}
                        className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-elevated hover:text-destructive" aria-label="Remover ingresso">
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                  <input value={b.name} onChange={(e) => updateBatch(b.key, { name: e.target.value })} placeholder="Nome (ex.: Camarote — 1º lote)" maxLength={60} className={cn(inputCls, "mt-1")} />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {TICKET_NAMES.map((t) => (
                      <button key={t} type="button" onClick={() => updateBatch(b.key, { name: `${t} — ${lotOf(batches, t, b.key)}º lote` })}
                        className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground">{t}</button>
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
            <Button type="button" variant="outline" className="w-full" onClick={() => setBatches((bs) => [...bs, newBatch()])}><Plus />Adicionar ingresso ou lote</Button>
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
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Evento publicado!</h1>
      <p className="mt-1 text-sm text-muted-foreground">Os ingressos já estão à venda. Divulgue o link no Instagram e no WhatsApp.</p>
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

// ---------- pedaços de formulário no estilo do site ----------
const inputCls = "h-10 w-full rounded-md border bg-surface px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary/50";

const Label = ({ children }: { children: ReactNode }) => <span className="mb-1.5 block text-sm">{children}</span>;

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4 md:p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{n}</span>
        <h2 className="font-medium">{title}</h2>
      </div>
      {hint && <p className="mt-1 pl-9 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function TextField({ label, value, onChange, ...rest }: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm">{label}</span>
      <input {...rest} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </label>
  );
}

function Chips({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-colors",
            value === o.value ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** "R$ 1.234,56" digitado → centavos. Os dígitos entram da direita, como numa maquininha. */
const centsFrom = (v: string) => Math.min(Number(v.replace(/\D/g, "") || "0"), 99_999_99);

/** Próximo número de lote para um tipo de ingresso (Pista — 1º lote, Pista — 2º lote…). */
function lotOf(batches: BatchForm[], type: string, selfKey: number) {
  return batches.filter((b) => b.key !== selfKey && b.name.startsWith(`${type} —`)).length + 1;
}
