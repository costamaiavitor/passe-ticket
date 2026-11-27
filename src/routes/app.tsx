import { createFileRoute, Link } from "@tanstack/react-router";
import { BellRing, QrCode, WifiOff } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { AppBanner } from "@/components/install-app";
import { Button } from "@/components/ui/button";

// Link para divulgar: bootickets.com.br/app — explica e instala o app pelo navegador (sem loja).
export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Baixe o app — BooTickets" },
      { name: "description", content: "Instale o BooTickets no celular: ingressos com QR Code que abrem até sem internet e avisos no dia da festa." },
    ],
  }),
  component: AppPage,
});

const perks = [
  { icon: QrCode, title: "Ingresso na tela de início", text: "Abra o QR Code com um toque na porta da festa." },
  { icon: WifiOff, title: "Funciona sem internet", text: "Seus ingressos ficam guardados no celular." },
  { icon: BellRing, title: "Avisos na hora", text: "Pagamento aprovado, ingresso recebido e lembrete no dia." },
];

function AppPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-page max-w-2xl px-5 py-12">
        <img src="/icon-192.png" alt="" className="size-20 rounded-2xl" />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight md:text-4xl">O BooTickets no seu celular</h1>
        <p className="mt-3 text-muted-foreground">Instale em segundos, direto por aqui. Não precisa de loja e não ocupa quase nada de espaço.</p>
        <AppBanner installOnly />
        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {perks.map((p) => (
            <li key={p.title} className="rounded-xl border bg-card p-4">
              <p.icon className="size-5 text-primary" />
              <p className="mt-3 text-sm font-medium">{p.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-muted-foreground">
          No iPhone, use o Safari. No Android, o Chrome. Já instalou? <Link to="/ingressos" className="text-foreground underline">Abra seus ingressos</Link>.
        </p>
        <Button asChild variant="outline" className="mt-6"><Link to="/eventos">Ver eventos</Link></Button>
      </main>
      <SiteFooter />
    </div>
  );
}
