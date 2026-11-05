import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export const CONTACT_EMAIL = "costamaiavitor@gmail.com";
export const LEGAL_UPDATED_AT = "5 de novembro de 2026";

/** Moldura das páginas legais (Privacidade e Termos), no visual do site. */
export function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-page max-w-3xl px-5 py-10 md:py-14">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: {LEGAL_UPDATED_AT}</p>
        <p className="mt-6 text-muted-foreground">{intro}</p>
        <div className="mt-8 space-y-8">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function LegalSection({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5 md:p-6">
      <h2 className="flex items-center gap-3 font-medium">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{n}</span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}
