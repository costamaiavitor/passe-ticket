// Pagamento com cartão pelo formulário seguro do Mercado Pago (Card Payment Brick).
// O número do cartão é digitado num campo do próprio Mercado Pago e vira um "token";
// o site só envia esse token para a API, que cobra o valor calculado no servidor.
import { useEffect, useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { payWithCard } from "@/services/orders";
import type { Order } from "@/types";

const PUBLIC_KEY = (import.meta.env["VITE_MP_PUBLIC_KEY"] as string | undefined)?.trim();
export const CARD_ENABLED = !!PUBLIC_KEY;
const MAX_INSTALLMENTS = 12;

interface BrickController { unmount(): void }
interface CardFormData {
  token: string;
  issuer_id?: string | number;
  payment_method_id: string;
  installments: number;
  payer?: { email?: string; identification?: { type: string; number: string } };
}
interface MercadoPagoCtor {
  new (key: string, opts: { locale: string }): {
    bricks(): { create(kind: "cardPayment", containerId: string, settings: Record<string, unknown>): Promise<BrickController> };
  };
}
declare global { interface Window { MercadoPago?: MercadoPagoCtor } }

let sdk: Promise<void> | null = null;
function loadSdk() {
  sdk ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://sdk.mercadopago.com/js/v2";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { sdk = null; reject(new Error("Não foi possível carregar o pagamento com cartão.")); };
    document.head.appendChild(s);
  });
  return sdk;
}

export function CardPayment({ order, payerEmail, onDone }: { order: Order; payerEmail?: string | undefined; onDone: (o: Order) => void }) {
  const containerId = `card-brick-${useId().replace(/:/g, "")}`;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!PUBLIC_KEY) return;
    let controller: BrickController | null = null;
    let cancelled = false;
    loadSdk()
      .then(async () => {
        if (cancelled || !window.MercadoPago) return;
        const mp = new window.MercadoPago(PUBLIC_KEY, { locale: "pt-BR" });
        controller = await mp.bricks().create("cardPayment", containerId, {
          initialization: { amount: order.total / 100, payer: payerEmail ? { email: payerEmail } : undefined },
          customization: {
            paymentMethods: { maxInstallments: MAX_INSTALLMENTS, minInstallments: 1 },
            visual: {
              hidePaymentButton: false,
              style: {
                theme: "dark",
                customVariables: {
                  baseColor: "#B8F34A",
                  baseColorFirstVariant: "#A5DD3F",
                  baseColorSecondVariant: "#93C736",
                  textPrimaryColor: "#F5F7FA",
                  textSecondaryColor: "#9299A7",
                  inputBackgroundColor: "#10131A",
                  formBackgroundColor: "#171A21",
                  outlinePrimaryColor: "#B8F34A",
                  buttonTextColor: "#14200A",
                  borderRadiusMedium: "8px",
                  borderRadiusLarge: "12px",
                },
              },
            },
          },
          callbacks: {
            onReady: () => !cancelled && setReady(true),
            onError: (e: unknown) => { console.error("Mercado Pago (cartão):", e); },
            // Promise rejeitada = o formulário volta a aceitar outra tentativa.
            onSubmit: async (data: CardFormData) => {
              setError(null);
              try {
                const o = await payWithCard(order.id, {
                  token: data.token, paymentMethodId: data.payment_method_id,
                  issuerId: data.issuer_id != null ? String(data.issuer_id) : undefined,
                  installments: Number(data.installments) || 1,
                  payer: data.payer,
                });
                done.current(o);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Não foi possível pagar com este cartão.");
                throw e;
              }
            },
          },
        });
        if (cancelled) controller.unmount();
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => { cancelled = true; controller?.unmount(); };
    // O formulário é montado uma vez por pedido/valor.
  }, [containerId, order.id, order.total, payerEmail]);

  return (
    <div>
      {!ready && !error && (
        <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Carregando pagamento seguro…</p>
      )}
      <div id={containerId} />
      {error && <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <p className="mt-3 text-xs text-muted-foreground">
        Os dados do cartão vão direto para o Mercado Pago e não passam pelo Passe. Parcelamento em até {MAX_INSTALLMENTS}x; juros, quando houver, são mostrados antes de confirmar.
      </p>
    </div>
  );
}
