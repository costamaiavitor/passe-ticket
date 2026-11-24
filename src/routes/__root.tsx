import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { restoreSession } from "@/services/auth";
import { markNativeApp } from "@/lib/native-app";
import { DEFAULT_SHARE_IMAGE } from "@/lib/seo";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="m-rise bg-gradient-to-b from-foreground to-foreground/30 bg-clip-text text-8xl font-bold tracking-tighter text-transparent">404</p>
        <h1 className="m-rise mt-4 text-2xl font-semibold text-foreground" style={{ "--i": 1 } as React.CSSProperties}>Essa página não existe</h1>
        <p className="m-rise mt-2 text-sm text-muted-foreground" style={{ "--i": 2 } as React.CSSProperties}>
          O link pode estar errado ou o evento saiu do ar. Confira os eventos à venda.
        </p>
        <div className="m-rise mt-7 flex flex-wrap justify-center gap-2" style={{ "--i": 3 } as React.CSSProperties}>
          <Link to="/eventos"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-[background-color,transform] hover:bg-primary/90 active:scale-[0.97]">
            Ver eventos
          </Link>
          <Link to="/"
            className="inline-flex h-10 items-center justify-center rounded-md border px-5 text-sm font-medium text-foreground transition-[background-color,transform] hover:bg-accent active:scale-[0.97]">
            Página inicial
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          A página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado do nosso lado. Tente de novo ou volte para a página inicial.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar de novo
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Página inicial
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      // viewport-fit=cover: no app do iPhone a página vai até as bordas; o CSS respeita o entalhe (safe-area).
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "BooTickets" },
      { name: "description", content: "Marketplace de eventos e ingressos." },
      { property: "og:site_name", content: "BooTickets" },
      { property: "og:locale", content: "pt_BR" },
      // Páginas sem foto própria mostram o fantasma do BooTickets na prévia do link.
      { property: "og:image", content: DEFAULT_SHARE_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: DEFAULT_SHARE_IMAGE },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono&display=swap" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      // Ícone da aba: o mesmo ingresso do logo (o ?v= força o navegador a trocar o ícone antigo guardado em cache).
      { rel: "icon", href: "/favicon.png?v=3", type: "image/png" },
      { rel: "icon", href: "/favicon.ico?v=3", sizes: "any" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=3" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => { void restoreSession(); markNativeApp(); }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster theme="dark" />
    </QueryClientProvider>
  );
}
