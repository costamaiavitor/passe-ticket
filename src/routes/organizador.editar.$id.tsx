import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowLeft, Minus, Pause, Play, Plus, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { RequireAuth } from "@/components/require-auth";
import {
  AGES, ageToInfo, CATEGORIES, centsFrom, Chips, CoverPicker, fromLocalParts, inputCls, Label, Section, splitInfo,
  TextField, TICKET_NAMES, toLocalParts,
} from "@/components/event-form";
import { AccessFields, CouponsManager, CourtesiesManager } from "@/components/event-promos";
import { Button } from "@/components/ui/button";
import { addBatch, deleteBatch, eventPanelQuery, updateBatch, updateEvent, type BatchEdit, type EventEdit } from "@/services/organizer";
import { brl, categoryLabel, platformFee } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { EventCategory, EventPanel } from "@/types";

export const Route = createFileRoute("/organizador/editar/$id")({
  head: () => ({ meta: [{ title: "Editar evento — BooTickets" }, { name: "robots", content: "noindex" }] }),
  component: () => {
    const { id } = Route.useParams();
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="container-page px-5 pb-32 pt-6 md:pb-16 md:pt-10">
          <RequireAuth>{() => <Loader id={id} />}</RequireAuth>
        </main>
      </div>
    );
  },
});

function Loader({ id }: { id: string }) {
  // Sem atualização automática: o formulário não pode ser sobrescrito enquanto a pessoa digita.
  const q = useQuery({ ...eventPanelQuery(id), refetchInterval: false, staleTime: 0 });
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (q.error || !q.data) return <p className="text-sm text-destructive">{q.error?.message ?? "Evento não encontrado."}</p>;
  if (q.data.status === "cancelled")
    return <p className="rounded-md border p-4 text-sm text-muted-foreground">Este evento foi cancelado e não pode mais ser editado.</p>;
  return <EditEvent ev={q.data} />;
}

interface LotForm {
  key: number; id?: string; name: string; type: string; price: number; total: string;
  taken: number; paused: boolean; removed: boolean;
}
let nextKey = 1;

/** Nome de um lote novo: "Pista — 3º lote" (conta os lotes do mesmo tipo que vêm antes, inclusive os já existentes). */
function newLotName(lots: LotForm[], l: LotForm) {
  const t = l.type.trim();
  if (!t) return "";
  const n = lots.filter((x) => !x.removed).slice(0, lots.filter((x) => !x.removed).indexOf(l) + 1)
    .filter((x) => (x.type || x.name).trim().toLowerCase().startsWith(t.toLowerCase())).length;
  return `${t} — ${n}º lote`;
}

function EditEvent({ ev }: { ev: EventPanel }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const start = toLocalParts(ev.startsAt);
  const info0 = splitInfo(ev.importantInfo);

  const [title, setTitle] = useState(ev.title);
  const [category, setCategory] = useState<EventCategory>(ev.category);
  const [coverUrl, setCoverUrl] = useState(ev.coverUrl);
  const [date, setDate] = useState(start.date);
  const [time, setTime] = useState(start.time);
  const [venue, setVenue] = useState(ev.venue);
  const [city, setCity] = useState(ev.city);
  const [address, setAddress] = useState(ev.address);
  const [description, setDescription] = useState(ev.description);
  const [age, setAge] = useState(info0.age);
  const [info, setInfo] = useState(info0.rest.join("\n"));
  const [maxPerCpf, setMaxPerCpf] = useState(ev.maxTicketsPerCpf);
  const [visibility, setVisibility] = useState<"public" | "unlisted">(ev.visibility ?? "public");
  const [accessCode, setAccessCode] = useState(ev.accessCode ?? "");
  const [lots, setLots] = useState<LotForm[]>(() => ev.salesByBatch.map((b) => ({
    key: nextKey++, id: b.id, name: b.name, type: b.ticketType ?? "", price: b.price, total: String(b.total),
    taken: b.sold + b.reserved, paused: b.status !== "active", removed: false,
  })));
  const [formError, setFormError] = useState<string | null>(null);

  const startsAt = fromLocalParts(date, time);
  const setLot = (key: number, patch: Partial<LotForm>) => setLots((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const visible = lots.filter((l) => !l.removed);

  const validate = (): string | null => {
    if (title.trim().length < 3) return "Dê um nome ao evento (pelo menos 3 letras).";
    if (!startsAt) return "Informe a data e o horário do evento.";
    if (startsAt !== ev.startsAt && new Date(startsAt).getTime() < Date.now() + 60 * 60_000) return "A data do evento precisa ser no futuro.";
    if (venue.trim().length < 2) return "Informe o nome do local.";
    if (city.trim().length < 2) return "Informe a cidade.";
    if (!visible.length) return "O evento precisa ter pelo menos um tipo de ingresso.";
    if (accessCode !== "" && accessCode.trim() === "") return "Digite a palavra-senha ou desmarque a opção.";
    for (const l of visible) {
      const label = l.id ? l.name : newLotName(lots, l) || "novo ingresso";
      if (!l.id && !l.type.trim()) return "Informe o tipo de cada ingresso novo (ex.: Pista, Camarote).";
      const n = Number(l.total);
      if (!Number.isInteger(n) || n < 1) return `Informe quantos ingressos “${label}” terá.`;
      if (n < l.taken) return `“${label}” já tem ${l.taken} ingresso(s) vendido(s) ou reservado(s). A quantidade não pode ser menor que isso.`;
    }
    return null;
  };

  const save = useMutation({
    mutationFn: async () => {
      // 1) Dados do evento: manda só o que mudou.
      const importantInfo = [ageToInfo(age), ...info.split("\n").map((l) => l.trim()).filter(Boolean)];
      const next: Required<Omit<EventEdit, "maxTransfers">> = {
        title: title.trim(), category, coverUrl, startsAt, venue: venue.trim(), city: city.trim(), address: address.trim(),
        description: description.trim(), importantInfo, maxTicketsPerCpf: maxPerCpf,
        visibility, accessCode: accessCode.trim(),
      };
      const prev: typeof next = {
        title: ev.title, category: ev.category, coverUrl: ev.coverUrl, startsAt: ev.startsAt, venue: ev.venue, city: ev.city,
        address: ev.address, description: ev.description, importantInfo: ev.importantInfo, maxTicketsPerCpf: ev.maxTicketsPerCpf,
        visibility: ev.visibility ?? "public", accessCode: ev.accessCode ?? "",
      };
      const diff: EventEdit = {};
      for (const k of Object.keys(next) as (keyof typeof next)[])
        if (JSON.stringify(next[k]) !== JSON.stringify(prev[k])) (diff as Record<string, unknown>)[k] = next[k];
      const saved = Object.keys(diff).length ? await updateEvent(ev.id, diff) : null;

      // 2) Lotes existentes: preço, quantidade, pausa; e as vendas acompanham a nova data do evento.
      for (const l of lots.filter((x) => x.id)) {
        const orig = ev.salesByBatch.find((b) => b.id === l.id)!;
        if (l.removed) { await deleteBatch(l.id!); continue; }
        const d: BatchEdit = {};
        if (l.price !== orig.price) d.price = l.price;
        if (Number(l.total) !== orig.total) d.total = Number(l.total);
        const wantStatus = l.paused ? "paused" : "active";
        if ((orig.status === "active") !== !l.paused) d.status = wantStatus;
        if (startsAt !== ev.startsAt && orig.salesEnd === ev.startsAt) d.salesEnd = startsAt;
        if (Object.keys(d).length) await updateBatch(l.id!, d);
      }

      // 3) Lotes novos.
      const salesStart = new Date(Date.now() - 60_000).toISOString();
      for (const l of visible.filter((x) => !x.id))
        await addBatch(ev.id, { name: newLotName(lots, l), ticketType: l.type.trim(), price: l.price, total: Number(l.total), salesStart, salesEnd: startsAt });
      return saved;
    },
    onSuccess: (saved) => {
      if (saved && saved.slug !== ev.slug)
        toast.info(`O evento agora é privado. Novo link: ${window.location.origin}/eventos/${saved.slug}`, { duration: 15000 });
      void qc.invalidateQueries({ queryKey: ["organizer-events"] });
      void qc.invalidateQueries({ queryKey: ["event-panel", ev.id] });
      void qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Alterações salvas.");
      void navigate({ to: "/organizador/evento/$id", params: { id: ev.id } });
    },
    // Se parte já foi salva antes do erro, recarrega para o formulário mostrar o estado real.
    onError: () => void qc.invalidateQueries({ queryKey: ["event-panel", ev.id] }),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = validate();
    setFormError(err);
    if (!err) save.mutate();
  };

  const lastType = visible[visible.length - 1]?.type.trim() || visible[visible.length - 1]?.name.split(" — ")[0] || "";

  return (
    <form onSubmit={submit} noValidate>
      <Link to="/organizador/evento/$id" params={{ id: ev.id }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Painel do evento</Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">Editar evento</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {ev.status === "published" ? "O evento continua à venda enquanto você edita. As mudanças aparecem no site assim que você salvar." : "Ajuste o que precisar e salve."}
      </p>

      <div className="mt-6 max-w-2xl space-y-4">
        <Section n={1} title="O evento">
          <TextField label="Nome do evento" value={title} onChange={setTitle} maxLength={140} />
          <div>
            <Label>Categoria</Label>
            <Chips options={CATEGORIES.map((c) => ({ value: c, label: categoryLabel[c] ?? c }))} value={category} onChange={(v) => setCategory(v as EventCategory)} />
          </div>
          <CoverPicker value={coverUrl} onChange={setCoverUrl} />
        </Section>

        <Section n={2} title="Quando e onde">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Data" type="date" value={date} onChange={setDate} />
            <TextField label="Horário" type="time" value={time} onChange={setTime} />
          </div>
          <TextField label="Local" value={venue} onChange={setVenue} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Cidade" value={city} onChange={setCity} />
            <TextField label="Endereço (opcional)" value={address} onChange={setAddress} placeholder="Rua, número, bairro" />
          </div>
        </Section>

        <Section n={3} title="Ingressos e preços" hint="Quem já comprou paga o preço antigo. O novo preço vale para as próximas compras.">
          <div className="space-y-3">
            {lots.map((l) => {
              if (l.removed) return null;
              const label = l.id ? l.name : newLotName(lots, l) || "Novo ingresso";
              return (
                <div key={l.key} className={cn("rounded-lg border bg-surface p-3", l.paused && "opacity-70")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-xs font-medium">
                      {label}
                      {l.id && <span className="ml-2 font-normal text-muted-foreground">{l.taken} vendido(s)</span>}
                      {l.paused && <span className="ml-2 rounded bg-elevated px-1.5 py-0.5 font-normal text-muted-foreground">pausado</span>}
                    </span>
                    <div className="flex shrink-0 gap-1">
                      {l.id && (
                        <button type="button" onClick={() => setLot(l.key, { paused: !l.paused })}
                          className="flex h-8 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-elevated hover:text-foreground">
                          {l.paused ? <><Play className="size-3.5" />Retomar vendas</> : <><Pause className="size-3.5" />Pausar vendas</>}
                        </button>
                      )}
                      {l.taken === 0 && visible.length > 1 && (
                        <button type="button" onClick={() => (l.id ? setLot(l.key, { removed: true }) : setLots((ls) => ls.filter((x) => x.key !== l.key)))}
                          className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-elevated hover:text-destructive" aria-label="Excluir ingresso">
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {!l.id && (
                    <>
                      <input value={l.type} onChange={(e) => setLot(l.key, { type: e.target.value })} placeholder="Tipo (ex.: Pista, Camarote)" maxLength={40} className={cn(inputCls, "mt-1")} />
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {TICKET_NAMES.map((t) => (
                          <button key={t} type="button" onClick={() => setLot(l.key, { type: t })}
                            className={cn("rounded-full border px-2.5 py-1 text-xs transition-colors",
                              l.type === t ? "border-primary bg-primary/10 text-foreground" : "text-muted-foreground hover:border-primary/50 hover:text-foreground")}>{t}</button>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs text-muted-foreground">Preço</span>
                      <input inputMode="numeric" value={brl(l.price)} onChange={(e) => setLot(l.key, { price: centsFrom(e.target.value) })} className={inputCls} />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs text-muted-foreground">Quantidade{l.taken ? ` (mín. ${l.taken})` : ""}</span>
                      <input inputMode="numeric" value={l.total} onChange={(e) => setLot(l.key, { total: e.target.value.replace(/\D/g, "").slice(0, 7) })} className={inputCls} />
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {l.price > 0
                      ? <>Cliente paga <span className="text-foreground">{brl(l.price + platformFee(l.price))}</span> (ingresso + 10% de taxa). Você recebe {brl(l.price)}.</>
                      : "Ingresso gratuito: o cliente só garante a vaga, sem pagar."}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => setLots((ls) => [...ls, { key: nextKey++, name: "", type: lastType, price: 0, total: "", taken: 0, paused: false, removed: false }])}>
              <Plus />Próximo lote{lastType ? ` de ${lastType}` : ""}
            </Button>
            <Button type="button" variant="outline" onClick={() => setLots((ls) => [...ls, { key: nextKey++, name: "", type: "", price: 0, total: "", taken: 0, paused: false, removed: false }])}>
              <Plus />Outro tipo de ingresso
            </Button>
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
            </div>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm">Descrição</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={cn(inputCls, "h-auto py-2")} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm">Avisos importantes <span className="text-muted-foreground">(um por linha)</span></span>
            <textarea value={info} onChange={(e) => setInfo(e.target.value)} rows={3} className={cn(inputCls, "h-auto py-2")} />
          </label>
        </Section>

        <Section n={5} title="Quem pode ver e comprar">
          <AccessFields wasPrivate={ev.visibility === "unlisted"} visibility={visibility} onVisibility={setVisibility} accessCode={accessCode} onAccessCode={setAccessCode} />
        </Section>

        {(formError || save.error) && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError ?? save.error?.message}</p>}
        <Button type="submit" size="lg" className="hidden w-full md:flex" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar alterações"}</Button>

        <div className="pt-6">
          <h2 className="text-lg font-semibold tracking-tight">Cupons e cortesias</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Estes são salvos na hora, sem precisar do botão “Salvar alterações”.</p>
        </div>
        <Section n={6} title="Cupons de desconto" hint="O desconto sai do valor do ingresso. A taxa de 10% é calculada já com o desconto.">
          <CouponsManager eventId={ev.id} />
        </Section>
        <Section n={7} title="Ingressos de cortesia" hint="A cortesia ocupa uma vaga do tipo de ingresso escolhido.">
          <CourtesiesManager eventId={ev.id} batches={ev.salesByBatch.map((b) => ({ id: b.id, name: b.name }))} />
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 p-4 backdrop-blur md:hidden">
        <Button type="submit" size="lg" className="w-full" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar alterações"}</Button>
      </div>
    </form>
  );
}
