// "Adicionar à Carteira": o ingresso vira um cartão no Apple Wallet ou no Google Wallet, com o mesmo QR.
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openWalletLink, walletKinds } from "@/lib/native-app";
import { appStatusQuery, walletLink } from "@/services/app";

const LABEL = { apple: "Adicionar à Apple Wallet", google: "Salvar no Google Wallet" } as const;

export function WalletButtons({ ticketId }: { ticketId: string }) {
  const { data } = useQuery(appStatusQuery());
  // Depende do aparelho: só decide depois de abrir no navegador (evita diferença com a página do servidor).
  const [kinds, setKinds] = useState<("apple" | "google")[]>([]);
  useEffect(() => { setKinds(walletKinds()); }, []);
  const [busy, setBusy] = useState<string | null>(null);
  const available = kinds.filter((k) => data?.wallet[k]);
  if (!available.length) return null;

  async function add(kind: "apple" | "google") {
    setBusy(kind);
    try {
      const { url } = await walletLink(ticketId, kind);
      await openWalletLink(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir a Carteira.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 grid gap-2">
      {available.map((k) => (
        <Button key={k} type="button" variant="outline" size="sm" className="w-full" disabled={!!busy} onClick={() => void add(k)}>
          <Wallet className="size-4" />{busy === k ? "Abrindo…" : LABEL[k]}
        </Button>
      ))}
    </div>
  );
}
