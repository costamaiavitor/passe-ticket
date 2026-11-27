import { Children, isValidElement, type ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Reveal, Rise, RiseWords } from "@/components/motion";

export const CONTACT_EMAIL = "booticketss@gmail.com";
export const LEGAL_UPDATED_AT = "25 de novembro de 2026";

export { LEGAL_ENTITY, legalEntityLine } from "@/lib/legal";

/** Moldura das páginas legais (Privacidade e Termos), no visual do site. */
export function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-page grid grid-cols-1 gap-10 px-5 py-10 md:py-14 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
        {/* Índice (computador): pula direto para a seção. */}
        <nav aria-label="Nesta página" className="hidden lg:block">
          <div className="sticky top-24">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Nesta página</p>
            <ol className="mt-4 space-y-1 border-l text-sm">
              {Children.toArray(children).filter(isValidElement).map((c) => {
                const p = c.props as { n?: number; title?: string };
                if (!p.n || !p.title) return null;
                return (
                  <li key={p.n}>
                    <a href={`#secao-${p.n}`} className="-ml-px block border-l border-transparent py-1 pl-4 text-muted-foreground transition-colors hover:border-primary hover:text-foreground">{p.title}</a>
                  </li>
                );
              })}
            </ol>
          </div>
        </nav>
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl"><RiseWords text={title} /></h1>
          <Rise i={2}><p className="mt-2 text-sm text-muted-foreground">Última atualização: {LEGAL_UPDATED_AT}</p></Rise>
          <Rise i={3}><p className="mt-6 text-muted-foreground">{intro}</p></Rise>
          <div className="mt-8 space-y-6">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function LegalSection({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <Reveal><section id={`secao-${n}`} className="scroll-mt-24 rounded-xl border bg-card p-5 transition-colors hover:border-muted-foreground/30 md:p-6">
      <h2 className="flex items-center gap-3 font-medium">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{n}</span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-foreground">
        {children}
      </div>
    </section></Reveal>
  );
}
