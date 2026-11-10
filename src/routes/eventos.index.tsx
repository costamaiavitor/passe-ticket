import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { EventCard } from "@/components/event-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { eventsQuery } from "@/services/events";
import { categoryLabel } from "@/utils/format";

const searchSchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  category: z.enum(["shows", "festas", "conferencias", "teatro", "esportes"]).optional(),
  date: z.string().optional(),
  maxPrice: z.coerce.number().optional(),
  onlyAvailable: z.coerce.boolean().optional(),
});

export const Route = createFileRoute("/eventos/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Explorar eventos — Booticket" },
      { name: "description", content: "Filtre eventos por cidade, data, categoria e preço." },
      { property: "og:title", content: "Explorar eventos — Booticket" },
      { property: "og:description", content: "Filtre eventos por cidade, data, categoria e preço." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Explore,
});

const field = "h-9 w-full rounded-md border bg-card px-3 text-sm outline-none focus:border-primary/50";

function Explore() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/eventos/" });
  const set = (patch: Partial<typeof s>) => navigate({ search: (prev) => ({ ...prev, ...patch }) });
  const { data, isLoading, isError, refetch } = useQuery(eventsQuery(s));

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-page py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Explorar eventos</h1>
        <div className="mt-6 grid gap-3 rounded-lg border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-6">
          <input className={`${field} lg:col-span-2`} placeholder="Buscar" defaultValue={s.q}
            onChange={(e) => set({ q: e.target.value || undefined })} />
          <select className={field} value={s.city ?? ""} onChange={(e) => set({ city: e.target.value || undefined })}>
            <option value="">Todas as cidades</option>
            {["Fortaleza", "Recife", "Natal"].map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className={field} value={s.category ?? ""}
            onChange={(e) => set({ category: (e.target.value || undefined) as typeof s.category })}>
            <option value="">Categorias</option>
            {Object.entries(categoryLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="date" className={field} value={s.date ?? ""} onChange={(e) => set({ date: e.target.value || undefined })} />
          <select className={field} value={s.maxPrice ?? ""} onChange={(e) => set({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">Qualquer preço</option>
            <option value="5000">Até R$ 50</option>
            <option value="10000">Até R$ 100</option>
            <option value="20000">Até R$ 200</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground lg:col-span-6">
            <input type="checkbox" className="accent-primary" checked={!!s.onlyAvailable}
              onChange={(e) => set({ onlyAvailable: e.target.checked || undefined })} />
            Somente com ingressos disponíveis
          </label>
        </div>

        <div className="mt-8">
          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-lg" />)}
            </div>
          ) : isError ? (
            <div className="rounded-lg border p-10 text-center">
              <p className="text-muted-foreground">Não foi possível carregar os eventos.</p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>Tentar novamente</Button>
            </div>
          ) : data?.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.map((e) => <EventCard key={e.id} event={e} />)}</div>
          ) : (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="font-medium">Nenhum evento encontrado</p>
              <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros para ver mais resultados.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate({ search: {} })}>Limpar filtros</Button>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
