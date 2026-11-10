// Acesso ao evento (público/privado, palavra-senha), cupons de desconto e cortesias.
// Na criação, cupons e cortesias ficam num rascunho e vão junto com o evento; na edição, cada ação é salva na hora.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, Gift, Globe, KeyRound, Link2, Lock, Pause, Play, Plus, Tag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { centsFrom, inputCls, Label } from "@/components/event-form";
import {
  couponsQuery, courtesiesQuery, createCoupon, deleteCoupon, giveCourtesy, revokeCourtesy, updateCoupon,
  type NewCoupon, type NewCourtesy,
} from "@/services/organizer";
import { brl } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { Coupon, Courtesy } from "@/types";

export const formatCpf = (v: string) =>
  v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");

export const couponLabel = (c: Pick<Coupon, "kind" | "value">) => (c.kind === "percent" ? `${c.value}% off` : `${brl(c.value)} off por ingresso`);

// ---------------- Público / privado e palavra-senha ----------------
export function AccessFields({ visibility, onVisibility, accessCode, onAccessCode, isNew, wasPrivate }: {
  visibility: "public" | "unlisted"; onVisibility: (v: "public" | "unlisted") => void;
  accessCode: string; onAccessCode: (v: string) => void; isNew?: boolean; wasPrivate?: boolean;
}) {
  const [useCode, setUseCode] = useState(!!accessCode);
  const opt = (v: "public" | "unlisted", icon: React.ReactNode, title: string, desc: string) => (
    <button type="button" onClick={() => onVisibility(v)}
      className={cn("flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
        visibility === v ? "border-primary bg-primary/5" : "hover:border-muted-foreground/40")}>
      <span className={cn("mt-0.5", visibility === v ? "text-primary" : "text-muted-foreground")}>{icon}</span>
      <span><span className="block text-sm font-medium">{title}</span><span className="block text-xs text-muted-foreground">{desc}</span></span>
    </button>
  );
  return (
    <div className="space-y-4">
      <div>
        <Label>Quem pode ver o evento</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {opt("public", <Globe className="size-4" />, "Público", "Aparece na página inicial e na busca do Passe.")}
          {opt("unlisted", <Link2 className="size-4" />, "Privado", "Não aparece no site. Só entra quem tiver o link.")}
        </div>
        {visibility === "unlisted" && !isNew && !wasPrivate && (
          <p className="mt-2 text-xs text-muted-foreground">Ao deixar privado, o link do evento muda para um difícil de adivinhar. Compartilhe o link novo.</p>
        )}
      </div>
      <div className="rounded-lg border p-3">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-medium"><KeyRound className="size-4 text-primary" />Exigir palavra-senha para comprar</span>
          <input type="checkbox" className="size-5 accent-[var(--color-primary)]" checked={useCode}
            onChange={(e) => { setUseCode(e.target.checked); if (!e.target.checked) onAccessCode(""); }} />
        </label>
        {useCode && (
          <div className="mt-3 space-y-1.5">
            <input value={accessCode} onChange={(e) => onAccessCode(e.target.value)} maxLength={40} placeholder="Ex.: luacheia" className={inputCls} />
            <p className="text-xs text-muted-foreground">Quem abrir o evento vê tudo, mas só compra quem digitar a senha. Maiúsculas e acentos não importam.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Formulários pequenos ----------------
function CouponForm({ onAdd, busy }: { onAdd: (c: NewCoupon) => void | Promise<unknown>; busy?: boolean }) {
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "fixed">("percent");
  const [pct, setPct] = useState("10");
  const [cents, setCents] = useState(1000);
  const [limit, setLimit] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    const c = code.trim().toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9_-]{3,30}$/.test(c)) return setErr("Código de 3 a 30 letras ou números, sem espaços.");
    const value = kind === "percent" ? Number(pct) : cents;
    if (kind === "percent" && !(value >= 1 && value <= 100)) return setErr("O desconto em % deve ser de 1 a 100.");
    if (kind === "fixed" && value < 1) return setErr("Informe o valor do desconto.");
    setErr(null);
    try {
      await onAdd({ code: c, kind, value, maxUses: limit ? Number(limit) : null });
      setCode(""); setLimit("");
    } catch (e) { setErr(e instanceof Error ? e.message : "Não foi possível criar o cupom."); }
  };
  return (
    <div className="space-y-3 rounded-lg border bg-surface p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5"><span className="text-xs text-muted-foreground">Código</span>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Ex.: AMIGOS10" maxLength={30} className={cn(inputCls, "uppercase")} /></label>
        <div className="space-y-1.5">
          <span className="block text-xs text-muted-foreground">Desconto</span>
          <div className="flex gap-2">
            <div className="flex shrink-0 rounded-md border p-0.5">
              {(["percent", "fixed"] as const).map((k) => (
                <button key={k} type="button" onClick={() => setKind(k)}
                  className={cn("rounded px-2.5 text-sm", kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{k === "percent" ? "%" : "R$"}</button>
              ))}
            </div>
            {kind === "percent"
              ? <input inputMode="numeric" value={pct} onChange={(e) => setPct(e.target.value.replace(/\D/g, "").slice(0, 3))} className={inputCls} />
              : <input inputMode="numeric" value={brl(cents)} onChange={(e) => setCents(centsFrom(e.target.value))} className={inputCls} />}
          </div>
        </div>
      </div>
      <label className="block space-y-1.5"><span className="text-xs text-muted-foreground">Limite de ingressos com este cupom (opcional)</span>
        <input inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Sem limite" className={inputCls} /></label>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => void submit()}><Plus />Criar cupom</Button>
    </div>
  );
}

function CourtesyForm({ batches, onAdd, busy }: { batches: { key: string; label: string }[]; onAdd: (c: NewCourtesy & { batchKey: string }) => void | Promise<unknown>; busy?: boolean }) {
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [batchKey, setBatchKey] = useState(batches[0]?.key ?? "");
  const [err, setErr] = useState<string | null>(null);
  const key = batches.some((b) => b.key === batchKey) ? batchKey : batches[0]?.key ?? "";
  const submit = async () => {
    if (name.trim().length < 3) return setErr("Informe o nome completo.");
    if (cpf.replace(/\D/g, "").length !== 11) return setErr("Informe o CPF completo.");
    if (!key) return setErr("Escolha o tipo de ingresso.");
    setErr(null);
    try {
      await onAdd({ name: name.trim(), cpf: cpf.replace(/\D/g, ""), email: email.trim() || undefined, batchKey: key });
      setName(""); setCpf(""); setEmail("");
    } catch (e) { setErr(e instanceof Error ? e.message : "Não foi possível dar a cortesia."); }
  };
  return (
    <div className="space-y-3 rounded-lg border bg-surface p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5"><span className="text-xs text-muted-foreground">Nome de quem ganha</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={inputCls} /></label>
        <label className="block space-y-1.5"><span className="text-xs text-muted-foreground">CPF</span>
          <input inputMode="numeric" value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" className={inputCls} /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5"><span className="text-xs text-muted-foreground">E-mail para avisar (opcional)</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></label>
        <label className="block space-y-1.5"><span className="text-xs text-muted-foreground">Tipo de ingresso</span>
          <select value={key} onChange={(e) => setBatchKey(e.target.value)} className={inputCls}>
            {batches.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
          </select></label>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="button" variant="outline" className="w-full" disabled={busy || !batches.length} onClick={() => void submit()}><Gift />Dar cortesia</Button>
      <p className="text-xs text-muted-foreground">Se a pessoa já tem conta com esse CPF, o ingresso aparece na hora em Meus ingressos. Se não tem, ela cria a conta com o CPF e aceita a cortesia.</p>
    </div>
  );
}

// ---------------- Rascunho (tela de criar evento) ----------------
export type DraftCourtesy = NewCourtesy & { batchKey: string };

export function CouponDrafts({ value, onChange }: { value: NewCoupon[]; onChange: (v: NewCoupon[]) => void }) {
  return (
    <div className="space-y-2">
      {value.map((c) => (
        <div key={c.code} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
          <span className="flex items-center gap-2"><Tag className="size-4 text-primary" /><b>{c.code}</b><span className="text-muted-foreground">{couponLabel(c)}{c.maxUses ? ` · até ${c.maxUses}` : ""}</span></span>
          <button type="button" aria-label="Remover cupom" onClick={() => onChange(value.filter((x) => x.code !== c.code))} className="text-muted-foreground hover:text-destructive"><X className="size-4" /></button>
        </div>
      ))}
      <CouponForm onAdd={(c) => {
        if (value.some((x) => x.code === c.code)) throw new Error(`Já existe o cupom ${c.code}.`);
        onChange([...value, c]);
      }} />
    </div>
  );
}

export function CourtesyDrafts({ value, onChange, batches }: { value: DraftCourtesy[]; onChange: (v: DraftCourtesy[]) => void; batches: { key: string; label: string }[] }) {
  return (
    <div className="space-y-2">
      {value.map((c, i) => (
        <div key={i} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
          <span className="min-w-0"><span className="flex items-center gap-2"><Gift className="size-4 shrink-0 text-primary" /><b className="truncate">{c.name}</b></span>
            <span className="block pl-6 text-xs text-muted-foreground">{formatCpf(c.cpf)} · {batches.find((b) => b.key === c.batchKey)?.label ?? "—"}</span></span>
          <button type="button" aria-label="Remover cortesia" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="size-4" /></button>
        </div>
      ))}
      <CourtesyForm batches={batches} onAdd={(c) => onChange([...value, c])} />
    </div>
  );
}

// ---------------- Ao vivo (evento já criado) ----------------
export function CouponsManager({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const q = useQuery(couponsQuery(eventId));
  const refresh = () => void qc.invalidateQueries({ queryKey: ["coupons", eventId] });
  const add = useMutation({ mutationFn: (c: NewCoupon) => createCoupon(eventId, c), onSuccess: () => { refresh(); toast.success("Cupom criado."); } });
  const toggle = useMutation({ mutationFn: (c: Coupon) => updateCoupon(c.id, { active: !c.active }), onSuccess: refresh });
  const del = useMutation({
    mutationFn: (c: Coupon) => deleteCoupon(c.id),
    onSuccess: (r) => { refresh(); toast.success(r.deleted ? "Cupom excluído." : "O cupom já foi usado, então foi desativado (o histórico fica)."); },
  });
  return (
    <div className="space-y-2">
      {q.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {q.data?.map((c) => (
        <div key={c.id} className={cn("flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm", !c.active && "opacity-60")}>
          <span className="min-w-0">
            <span className="flex items-center gap-2"><Tag className="size-4 shrink-0 text-primary" /><b>{c.code}</b>{!c.active && <span className="rounded bg-elevated px-1.5 text-xs">pausado</span>}</span>
            <span className="block pl-6 text-xs text-muted-foreground">{couponLabel(c)} · usado em {c.uses}{c.maxUses ? ` de ${c.maxUses}` : ""} ingresso(s)</span>
          </span>
          <span className="flex shrink-0 gap-1">
            <button type="button" onClick={() => toggle.mutate(c)} aria-label={c.active ? "Pausar cupom" : "Reativar cupom"} className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-elevated hover:text-foreground">
              {c.active ? <Pause className="size-4" /> : <Play className="size-4" />}</button>
            <button type="button" onClick={() => del.mutate(c)} aria-label="Excluir cupom" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-elevated hover:text-destructive"><Trash2 className="size-4" /></button>
          </span>
        </div>
      ))}
      {q.data && !q.data.length && <p className="text-sm text-muted-foreground">Nenhum cupom ainda.</p>}
      <CouponForm busy={add.isPending} onAdd={(c) => add.mutateAsync(c)} />
    </div>
  );
}

const STATE: Record<Courtesy["state"], { label: string; cls: string }> = {
  delivered: { label: "Na conta da pessoa", cls: "text-primary" },
  waiting: { label: "Aguardando a pessoa aceitar", cls: "text-amber-400" },
  declined: { label: "A pessoa recusou", cls: "text-destructive" },
  used: { label: "Já entrou", cls: "text-muted-foreground" },
};

export function CourtesiesManager({ eventId, batches }: { eventId: string; batches: { id: string; name: string }[] }) {
  const qc = useQueryClient();
  const q = useQuery(courtesiesQuery(eventId));
  const [showCpf, setShowCpf] = useState(false);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["courtesies", eventId] });
    void qc.invalidateQueries({ queryKey: ["event-panel", eventId] });
    void qc.invalidateQueries({ queryKey: ["attendees", eventId] });
  };
  const add = useMutation({
    mutationFn: (c: DraftCourtesy) => giveCourtesy(eventId, { name: c.name, cpf: c.cpf, email: c.email, batchId: c.batchKey }),
    onSuccess: (c) => { refresh(); toast.success(c.state === "delivered" ? "Cortesia enviada: já está na conta da pessoa." : "Cortesia enviada: a pessoa precisa entrar com o CPF e aceitar."); },
  });
  const del = useMutation({ mutationFn: (id: string) => revokeCourtesy(id), onSuccess: () => { refresh(); toast.success("Cortesia cancelada. O QR Code não vale mais."); } });
  return (
    <div className="space-y-2">
      {q.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {!!q.data?.length && (
        <button type="button" onClick={() => setShowCpf((v) => !v)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          {showCpf ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}{q.data.length} cortesia(s)
        </button>
      )}
      {q.data?.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
          <span className="min-w-0">
            <span className="flex items-center gap-2"><Gift className="size-4 shrink-0 text-primary" /><b className="truncate">{c.holderName}</b></span>
            <span className="block pl-6 text-xs text-muted-foreground">{c.batchName}{showCpf ? ` · ${c.holderCpf}` : ""} · <span className={STATE[c.state].cls}>{STATE[c.state].label}</span></span>
          </span>
          {c.state !== "used" && (
            <button type="button" onClick={() => { if (confirm(`Cancelar a cortesia de ${c.holderName}? O ingresso deixa de valer.`)) del.mutate(c.id); }}
              aria-label="Cancelar cortesia" className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-elevated hover:text-destructive"><Trash2 className="size-4" /></button>
          )}
        </div>
      ))}
      {q.data && !q.data.length && <p className="text-sm text-muted-foreground">Nenhuma cortesia ainda.</p>}
      <CourtesyForm busy={add.isPending} batches={batches.map((b) => ({ key: b.id, label: b.name }))} onAdd={(c) => add.mutateAsync(c)} />
    </div>
  );
}

export const PrivateBadges = ({ visibility, hasCode }: { visibility?: string | undefined; hasCode?: boolean }) => (
  <>
    {visibility === "unlisted" && <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground"><Link2 className="size-3" />Privado</span>}
    {hasCode && <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground"><Lock className="size-3" />Com senha</span>}
  </>
);
