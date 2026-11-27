import { BrandLogo } from "@/components/brand-logo";
import { Link, useNavigate } from "@tanstack/react-router";
import { CalendarPlus, LogOut, Menu, ScanLine, Search, ShieldCheck, Ticket, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/services/auth";
import { hasRole, useSession } from "@/services/session";
import { legalEntityLine } from "@/lib/legal";

export function SiteHeader() {
  const { user } = useSession();
  const navigate = useNavigate();
  return (
    <header className="m-header sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="flex h-16 w-full min-w-0 items-center gap-3 px-3 min-[380px]:px-4 sm:gap-6 sm:px-6 lg:gap-10 lg:px-10">
        <Link to="/" aria-label="BooTickets — página inicial" className="shrink-0">
          <BrandLogo />
        </Link>
        <nav className="m-nav hidden items-center gap-6 text-sm text-muted-foreground lg:flex xl:gap-8">
          <Link to="/eventos" className="transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>Explorar</Link>
          <Link to="/eventos" search={{ category: "shows" }} className="transition-colors hover:text-foreground">Shows</Link>
          <Link to="/eventos" search={{ category: "festas" }} className="transition-colors hover:text-foreground">Festas</Link>
          <Link to="/eventos" search={{ category: "conferencias" }} className="hidden transition-colors hover:text-foreground xl:inline">Conferências</Link>
          <Link to="/eventos" search={{ category: "teatro" }} className="hidden transition-colors hover:text-foreground xl:inline">Teatro</Link>
          <Link to="/eventos" search={{ category: "esportes" }} className="hidden transition-colors hover:text-foreground xl:inline">Esportes</Link>
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-1 min-[380px]:gap-1.5 sm:gap-3">
          <Button asChild variant="ghost" size="icon" className="hidden min-[360px]:inline-flex" aria-label="Buscar eventos"><Link to="/eventos"><Search /></Link></Button>
          {user ? (
            <>
              {/* Computador: todos os botões à vista. */}
              <Button asChild variant="outline" size="sm" className="hidden lg:inline-flex">
                <Link to="/organizador"><CalendarPlus />{hasRole(user, "organizer") ? "Meus eventos" : "Criar evento"}</Link>
              </Button>
              {user.roles.includes("admin") && (
                <Button asChild variant="ghost" size="icon" className="hidden lg:inline-flex" aria-label="Admin" title="Admin"><Link to="/admin"><ShieldCheck /></Link></Button>
              )}
              {hasRole(user, "staff", "organizer") && (
                <Button asChild variant="outline" size="sm" className="hidden lg:inline-flex"><Link to="/portaria"><ScanLine />Portaria</Link></Button>
              )}
              <Button asChild size="sm"><Link to="/ingressos" aria-label="Meus ingressos"><Ticket /><span className="hidden min-[420px]:inline">Meus ingressos</span></Link></Button>
              <Button asChild variant="ghost" size="icon" className="hidden lg:inline-flex" aria-label="Minha conta" title="Minha conta"><Link to="/conta"><UserRound /></Link></Button>
              <Button variant="ghost" size="icon" className="hidden lg:inline-flex" aria-label="Sair" title={`Sair (${user.email})`}
                onClick={async () => { await logout(); navigate({ to: "/" }); }}><LogOut /></Button>
              {/* Celular: o resto fica num menu, para nada sair da tela. */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu"><Menu /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/ingressos"><Ticket />Meus ingressos</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/organizador"><CalendarPlus />{hasRole(user, "organizer") ? "Meus eventos" : "Criar evento"}</Link></DropdownMenuItem>
                  {hasRole(user, "staff", "organizer") && (
                    <DropdownMenuItem asChild><Link to="/portaria"><ScanLine />Portaria</Link></DropdownMenuItem>
                  )}
                  {user.roles.includes("admin") && (
                    <DropdownMenuItem asChild><Link to="/admin"><ShieldCheck />Admin</Link></DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild><Link to="/conta"><UserRound />Minha conta</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={async () => { await logout(); navigate({ to: "/" }); }}><LogOut />Sair</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="outline" size="sm" className="hidden lg:inline-flex"><Link to="/cadastro" search={{ redirect: "/organizador" }}>Criar evento</Link></Button>
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
  const year = new Date().getFullYear();
  const col = "space-y-2.5 text-sm";
  const link = "text-muted-foreground transition-colors hover:text-foreground";
  return (
    <footer className="mt-24 border-t bg-surface/40">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link to="/" aria-label="BooTickets — página inicial" className="inline-block"><BrandLogo /></Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Ingressos nominais com QR Code único. Compra pelo Pix ou cartão, sem fila e sem golpe.
          </p>
        </div>
        <nav aria-label="Explorar" className={col}>
          <p className="font-medium">Explorar</p>
          <Link to="/eventos" className={`block ${link}`}>Todos os eventos</Link>
          <Link to="/eventos" search={{ category: "festas" }} className={`block ${link}`}>Festas</Link>
          <Link to="/eventos" search={{ category: "shows" }} className={`block ${link}`}>Shows</Link>
          <Link to="/ingressos" className={`block ${link}`}>Meus ingressos</Link>
        </nav>
        <nav aria-label="Organizadores" className={col}>
          <p className="font-medium">Organizadores</p>
          <Link to="/organizador" className={`block ${link}`}>Criar evento</Link>
          <Link to="/organizador" className={`block ${link}`}>Painel de vendas</Link>
          <Link to="/portaria" className={`block ${link}`}>Portaria</Link>
        </nav>
        <nav aria-label="Ajuda" className={col}>
          <p className="font-medium">Ajuda</p>
          <Link to="/termos" className={`block ${link}`}>Termos de Uso</Link>
          <Link to="/termos" hash="devolucao" className={`block ${link}`}>Devolução de ingressos</Link>
          <Link to="/privacidade" className={`block ${link}`}>Privacidade</Link>
          <Link to="/termos-organizador" className={`block ${link}`}>Termos do Organizador</Link>
          <Link to="/conta" className={`block ${link}`}>Excluir minha conta</Link>
          <a href="mailto:booticketss@gmail.com" className={`block ${link}`}>Fale com a gente</a>
        </nav>
      </div>
      <div className="border-t">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} {legalEntityLine()}. Ingressos com segurança.</span>
          <span>Pagamentos processados pelo Mercado Pago</span>
        </div>
      </div>
    </footer>
  );
}
