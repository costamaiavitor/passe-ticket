import { useEffect, useState } from "react";

/**
 * true só depois que o React assumiu a página no navegador. Antes disso (celular lento, logo depois de abrir),
 * um toque num botão não faz nada; com isto, o botão aparece desativado até poder responder.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  return hydrated;
}
