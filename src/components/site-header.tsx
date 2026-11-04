import { Link } from "@tanstack/react-router";
import { Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="container-page flex h-14 items-center gap-6">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Ticket className="size-4" />
          </span>
          Passe
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
          <Link to="/eventos" className="transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>Explorar</Link>
          <Link to="/eventos" search={{ category: "shows" }} className="transition-colors hover:text-foreground">Shows</Link>
          <Link to="/eventos" search={{ category: "conferencias" }} className="transition-colors hover:text-foreground">Conferências</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/entrar">Entrar</Link></Button>
          <Button asChild size="sm"><Link to="/cadastro">Criar conta</Link></Button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t">
      <div className="container-page flex flex-col gap-2 py-8 text-sm text-muted-foreground md:flex-row md:justify-between">
        <span>© 2026 Passe. Ingressos com segurança.</span>
        <span>Taxa de serviço transparente · 2 ingressos por CPF</span>
      </div>
    </footer>
  );
}
