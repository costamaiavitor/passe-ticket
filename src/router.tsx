import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Troca de página suave (View Transitions); quem pede menos movimento recebe a troca normal (CSS).
    defaultViewTransition: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
