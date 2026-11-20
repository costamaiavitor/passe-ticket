// Peças da camada de movimento (o CSS fica em styles.css, seção "Camada de movimento").
// Tudo para quem pede menos movimento no aparelho (prefers-reduced-motion).
import { Fragment, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";

/**
 * Bloco que entra (sobe e aparece) quando chega na tela. O estado fica no React, então não briga com a hidratação.
 * Antes do JavaScript e com menos movimento, o bloco aparece normal (nada fica escondido).
 */
export function Reveal({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "wait" | "in">("idle");
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setState("wait");
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setState("in"); io.disconnect(); } },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} data-reveal={state} className={className}>{children}</div>;
}

/** Título que sobe palavra por palavra ao abrir a página. O texto continua inteiro para leitores de tela. */
export function RiseWords({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) {
  const words = text.split(" ");
  return (
    <span aria-label={text} className={className}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span aria-hidden className="m-word"><span style={{ "--i": i, "--d": `${delay}ms` } as CSSProperties}>{w}</span></span>
          {i < words.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </span>
  );
}

/** Brilho que segue o mouse dentro de um cartão (usar com a classe m-spot). */
export function spotlight(e: MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

/** Entra subindo ao abrir a página; --i escalona os itens de uma lista. */
export function Rise({ i = 0, className, children }: { i?: number; className?: string; children: ReactNode }) {
  return <div className={`m-rise ${className ?? ""}`} style={{ "--i": i } as CSSProperties}>{children}</div>;
}

/** Explosão de confete uma vez só (pagamento aprovado). Pedaços em posições fixas, sem sorteio a cada render. */
const BITS = Array.from({ length: 28 }, (_, k) => {
  const a = (k / 28) * Math.PI * 2 + (k % 3) * 0.2;
  const dist = 90 + ((k * 37) % 70);
  return { x: Math.cos(a) * dist, y: Math.sin(a) * dist - 40, r: (k * 47) % 360, c: k % 4 };
});
const COLORS = ["#A03DFD", "#ffffff", "#C68BFF", "#22c55e"];
export function Confetti() {
  return (
    <span aria-hidden className="pointer-events-none absolute left-1/2 top-10 block size-0">
      {BITS.map((b, k) => (
        <span key={k} className="m-confetti" style={{ "--x": `${b.x}px`, "--y": `${b.y}px`, "--r": `${b.r}deg`, background: COLORS[b.c] } as CSSProperties} />
      ))}
    </span>
  );
}

/** Check que se desenha (círculo e depois o traço). */
export function DrawCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 52 52" className={`m-check ${className ?? ""}`} aria-hidden>
      <circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M15 27 l7 7 l15 -16" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
