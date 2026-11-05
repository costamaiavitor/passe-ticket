// Botão oficial "Continuar com Google" (Google Identity Services).
// Só aparece quando VITE_GOOGLE_CLIENT_ID está configurado e o backend está ligado.
import { useEffect, useRef, useState } from "react";
import { loginWithGoogle } from "@/services/auth";
import { USE_MOCKS } from "@/services/http";

const CLIENT_ID = (import.meta.env["VITE_GOOGLE_CLIENT_ID"] as string | undefined)?.trim();
export const GOOGLE_ENABLED = !!CLIENT_ID && !USE_MOCKS;

interface GsiApi {
  accounts: {
    id: {
      initialize(opts: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: "popup"; use_fedcm_for_prompt?: boolean }): void;
      renderButton(el: HTMLElement, opts: Record<string, unknown>): void;
    };
  };
}
declare global { interface Window { google?: GsiApi } }

let scriptPromise: Promise<void> | null = null;
function loadScript() {
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error("Não foi possível carregar o login do Google.")); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function GoogleButton({ onSuccess }: { onSuccess: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!GOOGLE_ENABLED) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID!,
          ux_mode: "popup",
          callback: async ({ credential }) => {
            setError(null); setBusy(true);
            try { await loginWithGoogle(credential); onSuccess(); }
            catch (e) { setError(e instanceof Error ? e.message : "Erro ao entrar com o Google."); }
            finally { setBusy(false); }
          },
        });
        window.google.accounts.id.renderButton(box.current, {
          type: "standard", theme: "filled_black", size: "large", shape: "rectangular",
          text: "continue_with", logo_alignment: "center", locale: "pt-BR",
          width: Math.min(box.current.offsetWidth || 360, 400),
        });
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [onSuccess]);

  if (!GOOGLE_ENABLED) return null;
  return (
    <div className="space-y-4">
      {/* colorScheme "light": sem isso o navegador pinta um fundo branco atrás do botão do Google no tema escuro. */}
      <div ref={box} className={busy ? "pointer-events-none opacity-60" : undefined} style={{ minHeight: 44, colorScheme: "light" }} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />ou com e-mail<span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
