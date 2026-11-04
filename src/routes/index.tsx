import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search, ArrowRight, ShieldCheck, QrCode, BarChart3 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { EventCard } from "@/components/event-card";
import { eventsQuery } from "@/services/events";
import { categoryLabel } from "@/utils/format";
import type { EventCategory } from "@/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Passe — Eventos e ingressos com segurança" },
      { name: "description", content: "Descubra shows, festas e conferências. Ingressos nominais com QR Code único e transferência segura." },
      { property: "og:title", content: "Passe — Eventos e ingressos com segurança" },
      { property: "og:description", content: "Ingressos nominais com QR Code único e transferência segura." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQuery()),
  component: Home,
});

function Home() {
  const { data: events } = useSuspenseQuery(eventsQuery());
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const featured = events.filter((e) => e.featured);
  const upcoming = [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 3);
  const popular = [...events].sort((a, b) => b.popularity - a.popularity).slice(0, 3);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="relative overflow-hidden border-b">
        <div className="grid-fade pointer-events-none absolute inset-0 opacity-60" />
        <div className="container-page relative py-20 md:py-28">
          <p className="mb-4 text-sm text-primary">Ingressos nominais · QR Code único</p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
            Os melhores eventos, <span className="text-muted-foreground">sem fila, sem golpe.</span>
          </h1>
          <form
            onSubmit={(e) => { e.preventDefault(); navigate({ to: "/eventos", search: { q: q || undefined } }); }}
            className="mt-10 flex max-w-xl items-center gap-2 rounded-lg border bg-card p-1.5 focus-within:border-primary/50"
          >
            <Search className="ml-2 size-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar evento ou cidade"
              className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            <Button type="submit" size="sm">Buscar</Button>
          </form>
          <div className="mt-6 flex flex-wrap gap-2">
            {(Object.keys(categoryLabel) as EventCategory[]).map((c) => (
              <Link key={c} to="/eventos" search={{ category: c }}
                className="rounded-full border px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                {categoryLabel[c]}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <main className="container-page space-y-20 pt-16">
        <Section title="Em destaque">
          <div className="grid gap-5 md:grid-cols-2">
            {featured.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        </Section>
        <Section title="Próximos eventos"><Grid>{upcoming.map((e) => <EventCard key={e.id} event={e} />)}</Grid></Section>
        <Section title="Populares"><Grid>{popular.map((e) => <EventCard key={e.id} event={e} />)}</Grid></Section>

        <section className="rounded-xl border bg-surface p-8 md:p-12">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <p className="text-sm text-primary">Para organizadores</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">Venda ingressos com controle total.</h2>
              <p className="mt-3 text-muted-foreground">Lotes, equipe de check-in, transferências e relatórios em um só painel.</p>
              <Button asChild className="mt-6"><Link to="/cadastro">Começar a vender <ArrowRight /></Link></Button>
            </div>
            <ul className="space-y-5">
              {[
                [BarChart3, "Vendas em tempo real", "Faturamento, conversão e lotes num painel único."],
                [QrCode, "Check-in pelo celular", "Sua equipe valida ingressos direto do navegador."],
                [ShieldCheck, "Antifraude nativo", "Ingressos nominais, limite de 2 por CPF."],
              ].map(([Icon, t, d]) => {
                const I = Icon as typeof BarChart3;
                return (
                  <li key={t as string} className="flex gap-4">
                    <I className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div><p className="font-medium">{t as string}</p><p className="text-sm text-muted-foreground">{d as string}</p></div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <Link to="/eventos" className="text-sm text-muted-foreground hover:text-foreground">Ver todos →</Link>
      </div>
      {children}
    </section>
  );
}
const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
);
