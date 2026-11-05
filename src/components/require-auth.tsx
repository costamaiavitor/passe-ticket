import { Navigate, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { AuthUser } from "@/types";
import { hasRole, useSession } from "@/services/session";

/** Páginas privadas: espera a sessão ser restaurada e manda para o login se necessário. */
export function RequireAuth({ roles, children }: { roles?: AuthUser["roles"]; children: (user: AuthUser) => ReactNode }) {
  const { user, ready } = useSession();
  const { pathname } = useLocation();
  if (!ready) return <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground">Carregando…</div>;
  if (!user) return <Navigate to="/entrar" search={{ redirect: pathname }} />;
  if (roles && !hasRole(user, ...roles))
    return <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground">Você não tem acesso a esta área.</div>;
  return <>{children(user)}</>;
}
