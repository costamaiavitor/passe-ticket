// "Instale o app": convite para instalar o BooTickets pelo navegador (PWA) e ligar as notificações.
// Android/Chrome: botão que abre o instalador do navegador. iPhone: passo a passo do Safari.
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, Download, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNativeApp } from "@/lib/native-app";
import {
  canPromptInstall, enableWebPush, isAndroid, isIos, isStandalone, onInstallChange, promptInstall, webPushState, type WebPushState,
} from "@/lib/pwa";
import { appStatusQuery } from "@/services/app";

const HIDE_KEY = "bt-hide-install";

/** Faixa em "Meus ingressos": instalar o app e/ou ligar as notificações (some quando não há nada a fazer). */
export function AppBanner({ installOnly = false }: { installOnly?: boolean }) {
  // Tudo aqui depende do aparelho: só decide depois de abrir no navegador.
  const [ready, setReady] = useState(false);
  const [installable, setInstallable] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [push, setPush] = useState<WebPushState>("unsupported");
  const [busy, setBusy] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const { data: status } = useQuery(appStatusQuery());

  useEffect(() => {
    if (isNativeApp()) return;
    setStandalone(isStandalone());
    setInstallable(canPromptInstall());
    try { setHidden(localStorage.getItem(HIDE_KEY) === "1"); } catch { /* nada */ }
    void webPushState().then(setPush);
    setReady(true);
    return onInstallChange(() => { setInstallable(canPromptInstall()); setStandalone(isStandalone()); });
  }, []);

  if (!ready) return null;
  const showInstall = !standalone && (installOnly || !hidden) && (installable || isIos() || isAndroid());
  const showPush = !installOnly && !!status?.push.web && push === "off";
  if (!showInstall && !showPush) return null;

  async function install() {
    if (canPromptInstall()) { if (await promptInstall()) toast.success("Pronto! O BooTickets está na sua tela de início."); return; }
    if (isIos()) { setIosHelp(true); return; }
    toast("No menu do navegador (⋮), toque em “Instalar app” ou “Adicionar à tela inicial”.");
  }

  async function notify() {
    setBusy(true);
    try {
      const s = await enableWebPush();
      setPush(s);
      if (s === "on") toast.success("Notificações ligadas. Avisamos quando o pagamento for aprovado e no dia da festa.");
      else if (s === "denied") toast.error("As notificações foram bloqueadas. Libere nas configurações do navegador.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível ligar as notificações.");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    setHidden(true);
    try { localStorage.setItem(HIDE_KEY, "1"); } catch { /* nada */ }
  }

  return (
    <>
      <div className="mt-6 flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
        <img src="/icon-192.png" alt="" className="size-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 text-sm">
          {showInstall ? (
            <>
              <p className="font-medium">Instale o app do BooTickets</p>
              <p className="text-muted-foreground">Seus ingressos na tela de início, com o QR Code abrindo até sem internet na porta da festa.</p>
            </>
          ) : (
            <>
              <p className="font-medium">Ligue as notificações</p>
              <p className="text-muted-foreground">Avisamos quando o pagamento for aprovado, quando alguém te passar um ingresso e no dia da festa.</p>
            </>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {showInstall && <Button size="sm" onClick={() => void install()}><Download className="size-4" />Instalar</Button>}
          {!showInstall && showPush && <Button size="sm" disabled={busy} onClick={() => void notify()}><Bell className="size-4" />{busy ? "Ligando…" : "Ligar"}</Button>}
          {showInstall && <Button size="icon" variant="ghost" aria-label="Agora não" onClick={dismiss}><X className="size-4" /></Button>}
        </div>
      </div>
      {iosHelp && <IosSteps onClose={() => setIosHelp(false)} />}
    </>
  );
}

/** Passo a passo do iPhone (a Apple não deixa o site abrir o instalador sozinho). */
export function IosSteps({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Instalar no iPhone" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-semibold">Instalar no iPhone</p>
          <Button size="icon" variant="ghost" aria-label="Fechar" onClick={onClose}><X className="size-4" /></Button>
        </div>
        <ol className="mt-4 space-y-4 text-sm">
          <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">1</span>
            <span>Abra este site no <strong>Safari</strong> e toque em <Share className="inline size-4 align-text-bottom" /> <strong>Compartilhar</strong> (embaixo, no meio).</span></li>
          <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">2</span>
            <span>Role e toque em <SquarePlus className="inline size-4 align-text-bottom" /> <strong>Adicionar à Tela de Início</strong> e depois em <strong>Adicionar</strong>.</span></li>
          <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">3</span>
            <span>Abra o <strong>BooTickets</strong> pelo ícone novo, entre em <strong>Meus ingressos</strong> e toque em <strong>Ligar notificações</strong>.</span></li>
        </ol>
        <Button className="mt-5 w-full" onClick={onClose}>Entendi</Button>
      </div>
    </div>
  );
}
