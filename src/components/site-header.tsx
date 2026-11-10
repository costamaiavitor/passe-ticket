import { Link, useNavigate } from "@tanstack/react-router";
import { CalendarPlus, LogOut, ScanLine, Search, ShieldCheck, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/services/auth";
import { hasRole, useSession } from "@/services/session";

export function SiteHeader() {
  const { user } = useSession();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="flex h-16 w-full items-center gap-4 px-4 sm:gap-10 sm:px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Ticket className="size-4" />
          </span>
          Booticket
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <Link to="/eventos" className="transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>Explorar</Link>
          <Link to="/eventos" search={{ category: "shows" }} className="transition-colors hover:text-foreground">Shows</Link>
          <Link to="/eventos" search={{ category: "festas" }} className="transition-colors hover:text-foreground">Festas</Link>
          <Link to="/eventos" search={{ category: "conferencias" }} className="transition-colors hover:text-foreground">Conferências</Link>
          <Link to="/eventos" search={{ category: "teatro" }} className="hidden transition-colors hover:text-foreground lg:inline">Teatro</Link>
          <Link to="/eventos" search={{ category: "esportes" }} className="hidden transition-colors hover:text-foreground lg:inline">Esportes</Link>
        </nav>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Buscar eventos"><Link to="/eventos"><Search /></Link></Button>
          {user ? (
            <>
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                <Link to="/organizador"><CalendarPlus />{hasRole(user, "organizer") ? "Meus eventos" : "Criar evento"}</Link>
              </Button>
              <Button asChild variant="ghost" size="icon" className="sm:hidden" aria-label={hasRole(user, "organizer") ? "Meus eventos" : "Criar evento"}>
                <Link to="/organizador"><CalendarPlus /></Link>
              </Button>
              {user.roles.includes("admin") && (
                <Button asChild variant="ghost" size="icon" aria-label="Admin" title="Admin"><Link to="/admin"><ShieldCheck /></Link></Button>
              )}
              {hasRole(user, "staff", "organizer") && (
                <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex"><Link to="/portaria"><ScanLine />Portaria</Link></Button>
              )}
              <Button asChild size="sm"><Link to="/ingressos"><Ticket />Meus ingressos</Link></Button>
              <Button variant="ghost" size="icon" aria-label="Sair" title={`Sair (${user.email})`}
                onClick={async () => { await logout(); navigate({ to: "/" }); }}><LogOut /></Button>
            </>
          ) : (
            <>
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex"><Link to="/cadastro" search={{ redirect: "/organizador" }}>Criar evento</Link></Button>
              <Button asChild variant="ghost" size="sm"><Link to="/entrar">Entrar</Link></Button>
              <Button asChild size="sm"><Link to="/cadastro">Criar conta</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t">
      <div className="container-page flex flex-col gap-2 py-8 text-sm text-muted-foreground md:flex-row md:justify-between">
        <span>© 2026 Booticket. Ingressos com segurança.</span>
        <nav className="flex flex-wrap gap-x-5 gap-y-1">
          <Link to="/termos" className="hover:text-foreground">Termos de Uso</Link>
          <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
          <span>Taxa de serviço transparente</span>
        </nav>
      </div>
    </footer>
  );
}
