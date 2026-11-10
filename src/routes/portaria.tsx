import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, ScanLine, XCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { RequireAuth } from "@/components/require-auth";
import { QrScanner } from "@/components/qr-scanner";
import { Button } from "@/components/ui/button";
import { checkinStatsQuery, scanEventsQuery, scanTicket } from "@/services/tickets";
import { fmtDate, fmtTime } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { ScanResult } from "@/types";

export const Route = createFileRoute("/portaria")({
  head: () => ({ meta: [{ title: "Portaria — BooTickets" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-page max-w-lg py-8">
        <RequireAuth roles={["staff", "organizer"]}>{() => <Gate />}</RequireAuth>
      </main>
    </div>
  ),
});

function Gate() {
  const { data: events, isLoading } = useQuery(scanEventsQuery());
  const [eventId, setEventId] = useState<string | null>(null);
  useEffect(() => { if (!eventId && events?.length === 1) setEventId(events[0]!.id); }, [events, eventId]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!events?.length) return <p className="text-sm text-muted-foreground">Você não está na equipe de nenhum evento próximo.</p>;
  const ev = events.find((e) => e.id === eventId);
  if (!ev)
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Portaria</h1>
        <p className="mt-1 text-sm text-muted-foreground">Escolha o evento que você vai operar.</p>
        <div className="mt-6 space-y-2">
          {events.map((e) => (
            <button key={e.id} onClick={() => setEventId(e.id)} className="w-full rounded-lg border px-4 py-3 text-left hover:border-primary">
              <p className="font-medium">{e.title}</p>
              <p className="text-xs text-muted-foreground">{fmtDate(e.startsAt)} · {fmtTime(e.startsAt)} · {e.venue}</p>
            </button>
          ))}
        </div>
      </div>
    );
  return <Scanner eventId={ev.id} title={ev.title} onChange={events.length > 1 ? () => setEventId(null) : undefined} />;
}

function beep(ok: boolean) {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    o.frequency.value = ok ? 880 : 220;
    o.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + (ok ? 0.15 : 0.4));
    navigator.vibrate?.(ok ? 80 : [120, 60, 120]);
  } catch { /* sem áudio */ }
}

function Scanner({ eventId, title, onChange }: { eventId: string; title: string; onChange?: (() => void) | undefined }) {
  const qc = useQueryClient();
  const { data: stats } = useQuery(checkinStatsQuery(eventId));
  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const last = useRef<{ code: string; at: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handle = useCallback(async (code: string) => {
    // Ignora a mesma leitura repetida enquanto o QR ainda está na frente da câmera.
    if (last.current && last.current.code === code && Date.now() - last.current.at < 4000) return;
    last.current = { code, at: Date.now() };
    setBusy(true);
    try {
      const r = await scanTicket(eventId, code);
      setResult(r);
      beep(r.ok);
      void qc.invalidateQueries({ queryKey: ["checkin-stats", eventId] });
    } catch (e) {
      setResult({ result: "invalid", ok: false, message: e instanceof Error ? e.message : "Erro na leitura", scannedAt: new Date().toISOString(), ticket: null });
      beep(false);
    } finally {
      setBusy(false);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setResult(null), 3500);
    }
  }, [eventId, qc]);

  const manual = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("code") as HTMLInputElement;
    if (input.value.trim()) { last.current = null; void handle(input.value.trim()); input.value = ""; }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><ScanLine className="size-3.5" />Portaria</p>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        </div>
        {onChange && <Button variant="outline" size="sm" onClick={onChange}>Trocar</Button>}
      </div>

      {stats && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Entraram" value={stats.checkedIn} />
          <Stat label="Faltam" value={stats.remaining} />
          <Stat label="Vendidos" value={stats.totalTickets} />
        </div>
      )}

      <div className="relative mt-4">
        <QrScanner paused={busy || !!result} onScan={handle} />
        {result && (
          <button onClick={() => setResult(null)}
            className={cn("absolute inset-0 grid place-items-center rounded-xl p-6 text-center text-white",
              result.ok ? "bg-emerald-600" : result.result === "already_used" ? "bg-amber-600" : "bg-red-600")}>
            <div>
              {result.ok ? <CheckCircle2 className="mx-auto size-16" /> : <XCircle className="mx-auto size-16" />}
              <p className="mt-3 text-2xl font-semibold">{result.message}</p>
              {result.ticket && (
                <div className="mt-4 space-y-0.5 text-sm">
                  <p className="text-lg font-medium">{result.ticket.holderName}</p>
                  <p className="font-mono">{result.ticket.holderCpf}</p>
                  <p>{result.ticket.batchName}</p>
                </div>
              )}
              {result.result === "already_used" && result.checkedInAt && (
                <p className="mt-3 text-sm">Entrada registrada às {fmtTime(result.checkedInAt)} de {fmtDate(result.checkedInAt)}</p>
              )}
              {result.ok && <p className="mt-4 text-xs opacity-80">Confira o documento com foto do titular.</p>}
            </div>
          </button>
        )}
      </div>

      <form onSubmit={manual} className="mt-4 flex gap-2">
        <input name="code" placeholder="Digitar código do ingresso" className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" />
        <Button type="submit" variant="outline" disabled={busy}>Validar</Button>
      </form>

      {!!stats?.recent.length && (
        <div className="mt-6">
          <p className="text-sm font-medium">Últimas leituras</p>
          <ul className="mt-2 divide-y rounded-lg border text-sm">
            {stats.recent.slice(0, 8).map((r, i) => (
              <li key={i} className="flex justify-between px-3 py-2">
                <span className={r.result === "ok" ? "text-emerald-500" : "text-red-500"}>{r.holder_name ?? "—"}</span>
                <span className="text-xs text-muted-foreground">{RESULT_LABEL[r.result] ?? r.result} · {fmtTime(r.at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const RESULT_LABEL: Record<string, string> = {
  ok: "liberado", already_used: "já utilizado", invalid: "inválido", revoked: "QR antigo",
  wrong_event: "outro evento", not_paid: "não pago", cancelled: "cancelado",
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border bg-card py-2"><p className="text-xl font-semibold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
);
