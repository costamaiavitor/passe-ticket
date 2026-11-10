// Peças de formulário usadas em "Criar evento" e "Editar evento", no estilo do site.
import { useState, type ReactNode } from "react";
import { Check, ImagePlus } from "lucide-react";
import { uploadCover } from "@/services/organizer";
import { cn } from "@/lib/utils";
import type { EventCategory } from "@/types";

// Capas prontas (servidas pelo próprio site em /covers) para ninguém travar por falta de foto.
export const COVERS = [
  { file: "festa.jpg", label: "Festa" },
  { file: "show.jpg", label: "Show" },
  { file: "teatro.jpg", label: "Teatro" },
  { file: "conferencia.jpg", label: "Palestra" },
];
export const CATEGORIES: EventCategory[] = ["festas", "shows", "teatro", "conferencias", "esportes"];
export const AGES = ["Livre", "14", "16", "18"];
export const TICKET_NAMES = ["Pista", "Camarote", "Open bar", "VIP", "Meia-entrada"];

export const origin = () => (typeof window === "undefined" ? "" : window.location.origin);
export const presetCover = (file: string) => `${origin()}/covers/${file}`;

/** Primeiro aviso guarda a idade mínima ("Proibido para menores de 18 anos" / "Classificação livre"). */
export const ageToInfo = (age: string) => (age === "Livre" ? "Classificação livre" : `Proibido para menores de ${age} anos`);
export function splitInfo(importantInfo: string[]): { age: string; rest: string[] } {
  const first = importantInfo[0] ?? "";
  if (first === "Classificação livre") return { age: "Livre", rest: importantInfo.slice(1) };
  const m = /^Proibido para menores de (\d+) anos$/.exec(first);
  if (m && AGES.includes(m[1]!)) return { age: m[1]!, rest: importantInfo.slice(1) };
  return { age: "18", rest: importantInfo };
}

/** Data/hora do evento no fuso de Brasília, para os campos <input type="date"> e <input type="time">. */
export function toLocalParts(iso: string) {
  const d = new Date(new Date(iso).getTime() - 3 * 3600_000);
  return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) };
}
export const fromLocalParts = (date: string, time: string) => (date && time ? new Date(`${date}T${time}:00-03:00`).toISOString() : "");

/** "R$ 1.234,56" digitado → centavos. Os dígitos entram da direita, como numa maquininha. */
export const centsFrom = (v: string) => Math.min(Number(v.replace(/\D/g, "") || "0"), 99_999_99);

export const inputCls = "h-10 w-full rounded-md border bg-surface px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary/50";

export const Label = ({ children }: { children: ReactNode }) => <span className="mb-1.5 block text-sm">{children}</span>;

export function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
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

export function TextField({ label, value, onChange, ...rest }: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm">{label}</span>
      <input {...rest} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </label>
  );
}

export function Chips({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
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

/** Capa do evento: foto da galeria (reduzida no aparelho antes de enviar) ou uma das capas prontas. */
export function CoverPicker({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preset = COVERS.find((c) => value.endsWith(`/covers/${c.file}`));
  const custom = value && !preset ? value : "";
  const pick = async (file: File) => {
    setError(null); setUploading(true);
    try { onChange(await uploadCover(file)); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível enviar a foto."); }
    finally { setUploading(false); }
  };
  return (
    <div>
      <Label>Capa</Label>
      <label className={cn("mb-2 flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-3 transition-colors",
        custom ? "border-primary bg-primary/5" : "hover:border-primary/50", uploading && "pointer-events-none opacity-60")}>
        <input type="file" accept="image/*" className="sr-only" disabled={uploading}
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void pick(f); }} />
        {custom
          ? <img src={custom} alt="Sua foto" className="size-16 shrink-0 rounded-md object-cover" />
          : <span className="grid size-16 shrink-0 place-items-center rounded-md bg-elevated"><ImagePlus className="size-6 text-primary" /></span>}
        <span className="min-w-0">
          <span className="block text-sm font-medium">{uploading ? "Enviando foto…" : custom ? "Sua foto ✓ (toque para trocar)" : "Enviar foto da galeria"}</span>
          <span className="block text-xs text-muted-foreground">JPG ou PNG. Fotos na horizontal ficam melhores.</span>
        </span>
      </label>
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
      <p className="mb-2 text-xs text-muted-foreground">Ou escolha uma capa pronta:</p>
      <div className="grid grid-cols-4 gap-2">
        {COVERS.map((c) => (
          <button key={c.file} type="button" onClick={() => onChange(presetCover(c.file))}
            className={cn("relative aspect-[4/3] overflow-hidden rounded-md border-2 transition-colors",
              preset === c ? "border-primary" : "border-transparent opacity-70 hover:opacity-100")}>
            <img src={`/covers/${c.file}`} alt={c.label} className="size-full object-cover" />
            {preset === c && <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-3" /></span>}
          </button>
        ))}
      </div>
    </div>
  );
}
