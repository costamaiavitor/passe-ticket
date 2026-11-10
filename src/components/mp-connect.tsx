// Cartão "Receber pelo Mercado Pago" (split 1:1): o organizador conecta a conta e as vendas caem direto nela.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { connectMercadoPago, disconnectMercadoPago, mpConnectionQuery } from "@/services/organizer";

export function MercadoPagoCard() {
  const qc = useQueryClient();
  const { data } = useQuery(mpConnectionQuery());
  const [confirmOff, setConfirmOff] = useState(false);

  // Volta do Mercado Pago: /organizador?mp=ok | erro | negado
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("mp");
    if (!p) return;
    if (p === "ok") toast.success("Conta Mercado Pago conectada! As próximas vendas caem direto nela.");
    else if (p === "negado") toast.error("A conexão foi cancelada no Mercado Pago. Tente de novo quando quiser.");
    else toast.error("Não foi possível conectar sua conta Mercado Pago. Tente de novo.");
    window.history.replaceState(null, "", window.location.pathname);
    void qc.invalidateQueries({ queryKey: ["mp-connection"] });
  }, [qc]);

  const connect = useMutation({ mutationFn: connectMercadoPago, onSuccess: (url) => { window.location.href = url; } });
  const off = useMutation({
    mutationFn: disconnectMercadoPago,
    onSuccess: () => { setConfirmOff(false); void qc.invalidateQueries({ queryKey: ["mp-connection"] }); toast.success("Conta desconectada. As próximas vendas voltam a ser repassadas pelo Booticket."); },
  });
  if (!data?.available) return null;

  if (data.connected)
    return (
      <div className="mt-5 rounded-xl border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Recebendo direto no Mercado Pago</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Cada venda cai na sua conta na hora do pagamento. A taxa de serviço (10%, paga pelo comprador) vai para o Booticket e a tarifa do Mercado Pago é descontada da sua parte.
              </p>
              {data.problem && <p className="mt-2 flex items-center gap-1.5 text-xs text-warning"><AlertTriangle className="size-3.5" />{data.problem}</p>}
            </div>
          </div>
          {!confirmOff && <Button variant="ghost" size="sm" onClick={() => setConfirmOff(true)}>Desconectar</Button>}
        </div>
        {data.problem && <Button size="sm" className="mt-3" disabled={connect.isPending} onClick={() => connect.mutate()}>Conectar de novo</Button>}
        {confirmOff && (
          <div className="mt-3 rounded-lg border border-destructive/40 p-3 text-sm">
            <p>Desconectar? As próximas vendas voltam a cair na conta do Booticket e você recebe por repasse via Pix.</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="destructive" disabled={off.isPending} onClick={() => off.mutate()}>Desconectar</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmOff(false)}>Voltar</Button>
            </div>
          </div>
        )}
      </div>
    );

  return (
    <div className="mt-5 rounded-xl border border-primary/40 bg-card p-4">
      <div className="flex gap-3">
        <Wallet className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <p className="font-medium">Receba as vendas direto no seu Mercado Pago</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Conecte sua conta e o dinheiro de cada ingresso cai nela na hora, sem esperar repasse. Você entra no Mercado Pago e autoriza o Booticket. Não pedimos sua senha.
          </p>
        </div>
      </div>
      {connect.error && <p className="mt-2 text-sm text-destructive">{connect.error.message}</p>}
      <Button size="sm" className="mt-3" disabled={connect.isPending} onClick={() => connect.mutate()}>
        {connect.isPending ? "Abrindo o Mercado Pago…" : "Conectar Mercado Pago"}
      </Button>
    </div>
  );
}
