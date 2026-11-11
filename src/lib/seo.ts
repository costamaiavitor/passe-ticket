// Prévia dos links (WhatsApp, Instagram, Facebook, X): imagem, título e descrição que aparecem
// quando alguém cola o link de uma página do BooTickets.

/** Endereço público do site (os apps de mensagem precisam de links completos). */
export const SITE_URL = ((import.meta.env["VITE_SITE_URL"] as string | undefined) || "https://bootickets.com.br").replace(/\/$/, "");

/** Imagem padrão (1200×630) para as páginas que não têm foto própria. */
export const DEFAULT_SHARE_IMAGE = `${SITE_URL}/og-image.png`;

/** Transforma um caminho do site ("/covers/x.jpg") em link completo; links completos ficam como estão. */
export const absoluteUrl = (u: string) => (/^https?:\/\//.test(u) ? u : `${SITE_URL}${u.startsWith("/") ? "" : "/"}${u}`);

/** Descrição curta numa linha só (a prévia corta textos longos e quebras de linha ficam estranhas). */
export function shareText(text: string, max = 160) {
  const one = text.replace(/\s+/g, " ").trim();
  return one.length <= max ? one : `${one.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

/** Meta tags de prévia de uma página. */
export function shareMeta({ title, description, image, url, imageAlt }: {
  title: string; description: string; image?: string | undefined; url?: string | undefined; imageAlt?: string | undefined;
}) {
  const img = image ? absoluteUrl(image) : DEFAULT_SHARE_IMAGE;
  return [
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: img },
    { property: "og:image:secure_url", content: img },
    { property: "og:image:alt", content: imageAlt ?? title },
    ...(image ? [] : [{ property: "og:image:width", content: "1200" }, { property: "og:image:height", content: "630" }]),
    ...(url ? [{ property: "og:url", content: absoluteUrl(url) }] : []),
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: img },
  ];
}
