// Transferência de ingresso por CPF, com aceite de quem recebe.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Check, Clock, Gift, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { acceptTransfer, cancelTransfer, declineTransfer, incomingTransfersQuery, offerTransfer, setMyCpf } from "@/services/tickets";
import { fmtDate, fmtTime } from "@/utils/format";
import type { Ticket } from "@/types";

/** Máscara 000.000.000-00 enquanto digita. */
const maskCpfInput = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
};
const inputCls = "h-11 w-full rounded-md border bg-surface px-3 text-base outline-none focus:border-primary/50";

function useRefresh() {
  const qc = useQueryClient();
  return () => { void qc.invalidateQueries({ queryKey: ["tickets"] }); void qc.invalidateQueries({ queryKey: ["incoming-transfers"] }); };
}

/** Convites recebidos (topo de Meus ingressos) + pedido de CPF para quem entrou com Google. */
export function IncomingTransfers() {
  const { data } = useQuery(incomingTransfersQuery());
  const refresh = useRefresh();
  const [cpf, setCpf] = useState("");
  const saveCpf = useMutation({
    mutationFn: () => setMyCpf(cpf),
    onSuccess: () => { toast.success("CPF salvo. Agora você pode receber ingressos transferidos."); refresh(); },
  });
  const accept = useMutation({
    mutationFn: (id: string) => acceptTransfer(id),
    onSuccess: () => { toast.success("Ingresso aceito! Ele já está no seu nome, com QR Code novo."); refresh(); },
    onError: (e) => toast.error(e.message),
  });
  const decline = useMutation({
    mutationFn: (id: string) => declineTransfer(id),
    onSuccess: () => { toast("Transferência recusada. O ingresso voltou para quem enviou."); refresh(); },
    onError: (e) => toast.error(e.message),
  });
  if (!data) return null;

  if (data.needsCpf)
    return (
      <form onSubmit={(e) => { e.preventDefault(); saveCpf.mutate(); }} className="mt-6 rounded-xl border bg-card p-4 md:p-5">
        <p className="flex items-center gap-2 font-medium"><Gift className="size-4 text-primary" />Receber ingressos de outras pessoas</p>
        <p className="mt-1 text-sm text-muted-foreground">Ingressos são transferidos pelo CPF. Informe o seu uma única vez para poder recebê-los.</p>
        <div className="mt-3 flex gap-2">
          <input inputMode="numeric" value={cpf} onChange={(e) => setCpf(maskCpfInput(e.target.value))} placeholder="000.000.000-00" className={inputCls} />
          <Button type="submit" disabled={saveCpf.isPending || cpf.replace(/\D/g, "").length !== 11}>Salvar</Button>
        </div>
        {saveCpf.error && <p className="mt-2 text-sm text-destructive">{saveCpf.error.message}</p>}
      </form>
    );

  if (!data.transfers.length) return null;
  return (
    <section className="mt-6 space-y-3">
      {data.transfers.map((tr) => (
        <article key={tr.id} className="overflow-hidden rounded-xl border border-primary/50 bg-primary/5">
          <div className="flex gap-3 p-4">
            <img src={tr.event.coverUrl} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0">
              <p className="text-sm"><strong>{tr.fromName}</strong> quer te passar 1 ingresso</p>
              <p className="mt-0.5 truncate font-medium">{tr.event.title}</p>
              <p className="text-xs text-muted-foreground">{fmtDate(tr.event.startsAt)} · {fmtTime(tr.event.startsAt)} · {tr.batchName}</p>
            </div>
          </div>
          <p className="px-4 text-xs text-muted-foreground">Ao aceitar, o ingresso fica no seu nome e CPF, com um QR Code novo.</p>
          <div className="grid grid-cols-2 gap-2 p-4">
            <Button disabled={accept.isPending || decline.isPending} onClick={() => accept.mutate(tr.id)}><Check />Aceitar</Button>
            <Button variant="outline" disabled={accept.isPending || decline.isPending} onClick={() => decline.mutate(tr.id)}><X />Recusar</Button>
          </div>
        </article>
      ))}
    </section>
  );
}

/** Botão "Transferir" (ou o aviso "aguardando aceite") no cartão do ingresso. */
export function TransferControls({ t }: { t: Ticket }) {
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [cpf, setCpf] = useState("");
  const offer = useMutation({
    mutationFn: () => offerTransfer(t.id, cpf),
    onSuccess: () => { setOpen(false); setCpf(""); toast.success("Transferência enviada! O ingresso muda de dono quando a pessoa aceitar."); refresh(); },
  });
  const cancel = useMutation({
    mutationFn: () => cancelTransfer(t.id),
    onSuccess: () => { toast("Transferência cancelada. O ingresso continua com você."); refresh(); },
    onError: (e) => toast.error(e.message),
  });

  if (t.pendingTransfer)
    return (
      <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
        <p className="flex items-center gap-2 text-warning"><Clock className="size-4" />Aguardando aceite do CPF {t.pendingTransfer.toCpf}</p>
        <p className="mt-1 text-xs text-muted-foreground">Até a pessoa aceitar, o ingresso e o QR continuam com você.</p>
        <Button variant="ghost" size="sm" className="mt-1 px-0" disabled={cancel.isPending} onClick={() => cancel.mutate()}>Cancelar transferência</Button>
      </div>
    );
  if (!t.canTransfer) return null;

  const submit = (e: FormEvent) => { e.preventDefault(); offer.mutate(); };
  return (
    <>
      <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setOpen(true)}><Send />Transferir para outra pessoa</Button>
      <Dialog open={open} onOpenChange={(o) => { if (!offer.isPending) setOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transferir ingresso</DialogTitle>
            <DialogDescription>
              {t.event.title} · {t.batchName}. Informe o CPF de quem vai receber. A pessoa precisa ter conta no Passe com esse CPF e aceitar em “Meus ingressos”.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <input autoFocus inputMode="numeric" value={cpf} onChange={(e) => setCpf(maskCpfInput(e.target.value))} placeholder="CPF de quem vai receber" className={inputCls} />
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Até a pessoa aceitar, o ingresso continua com você e você pode cancelar.</li>
              <li>• Quando ela aceitar, o ingresso vai para o nome dela e o seu QR deixa de valer.</li>
            </ul>
            {offer.error && <p className="text-sm text-destructive">{offer.error.message}</p>}
            <Button type="submit" className="w-full" disabled={offer.isPending || cpf.replace(/\D/g, "").length !== 11}>
              {offer.isPending ? "Enviando…" : "Enviar transferência"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
