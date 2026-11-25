import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { Holder } from "@/types";

const formatCpf = (v: string) =>
  v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");

/** Um titular (nome + CPF) por ingresso. A validação definitiva é feita no backend. */
export function HoldersForm({ labels, defaultName, loading, error, onBack, onSubmit }: {
  /** Um rótulo por ingresso (ex.: "Feminino — 1º lote"). */
  labels: string[]; defaultName?: string | undefined; loading: boolean; error: string | null;
  onBack: () => void; onSubmit: (holders: Holder[]) => void;
}) {
  const [holders, setHolders] = useState<Holder[]>(() =>
    Array.from({ length: labels.length }, (_, i) => ({ name: i === 0 ? defaultName ?? "" : "", cpf: "" })));
  const set = (i: number, k: keyof Holder, v: string) =>
    setHolders((hs) => hs.map((h, j) => (j === i ? { ...h, [k]: k === "cpf" ? formatCpf(v) : v } : h)));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(holders.map((h) => ({ name: h.name.trim(), cpf: h.cpf.replace(/\D/g, "") })));
  };
  return (
    <form onSubmit={submit} className="mt-5 space-y-4 border-t pt-4">
      <p className="text-sm font-medium">Titulares dos ingressos</p>
      {holders.map((h, i) => (
        <fieldset key={i} className="space-y-2 rounded-lg border p-3">
          <legend className="px-1 text-xs text-muted-foreground">Ingresso {i + 1} · {labels[i]}</legend>
          <input required minLength={3} placeholder="Nome completo" value={h.name} onChange={(e) => set(i, "name", e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-primary/50" />
          <input required inputMode="numeric" pattern="\d{3}\.\d{3}\.\d{3}-\d{2}" placeholder="CPF" value={h.cpf}
            onChange={(e) => set(i, "cpf", e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-primary/50" />
        </fieldset>
      ))}
      <p className="text-xs text-muted-foreground">O titular precisa apresentar documento com o mesmo CPF na entrada.</p>
      {/* Aceite obrigatório: o navegador não deixa seguir sem marcar, e o servidor grava versão, data, hora e IP do aceite. */}
      <label className="flex items-start gap-2 rounded-lg border p-3 text-xs leading-relaxed">
        <input type="checkbox" required className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" />
        <span>
          Li e aceito os <Link to="/termos" target="_blank" className="font-medium text-foreground underline">Termos de Uso</Link>,
          incluindo a <Link to="/termos" hash="devolucao" target="_blank" className="font-medium text-foreground underline">Política de Devolução</Link>,
          e a <Link to="/privacidade" target="_blank" className="font-medium text-foreground underline">Política de Privacidade</Link>.
          Posso devolver os ingressos pelo site em até 7 dias depois da compra, desde que o evento ainda não tenha começado;
          ingresso usado na entrada ou transferido não pode ser devolvido. Declaro que os dados dos titulares são verdadeiros e que
          tenho autorização deles (ou sou o responsável, se menor). Meia-entrada exige comprovante na entrada.
        </span>
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={loading}>Voltar</Button>
        <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Reservando…" : "Ir para pagamento"}</Button>
      </div>
    </form>
  );
}
