import { BrandLogo } from "@/components/brand-logo";
import { Link } from "@tanstack/react-router";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { eventsQuery } from "@/services/events";
import { RiseWords } from "@/components/motion";
import { Eye, EyeOff, Loader2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="grid place-items-center px-5 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="m-rise mb-10 inline-block" aria-label="BooTickets — página inicial">
            <BrandLogo size="lg" />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight"><RiseWords text={title} /></h1>
          <p className="m-rise mt-1 text-sm text-muted-foreground" style={{ "--i": 2 } as React.CSSProperties}>{subtitle}</p>
          <div className="m-rise mt-8" style={{ "--i": 3 } as React.CSSProperties}>{children}</div>
          <p className="m-rise mt-6 text-sm text-muted-foreground" style={{ "--i": 4 } as React.CSSProperties}>{footer}</p>
        </div>
      </div>
      <AuthShowcase />
    </div>
  );
}

/** Lado direito (computador): as artes reais dos eventos à venda e a promessa da marca. */
function AuthShowcase() {
  const { data } = useQuery({ ...eventsQuery(), staleTime: 60_000 });
  const covers = (data ?? []).map((e) => e.coverUrl).filter(Boolean).slice(0, 4);
  return (
    <aside aria-hidden className="relative hidden overflow-hidden border-l bg-surface lg:block">
      <div className="grid-fade absolute inset-0 opacity-50" />
      <div className="absolute -right-24 -top-24 size-96 rounded-full bg-primary/25 blur-[120px]" />
      <div className="relative flex h-full flex-col p-12">
        {/* Artes em leque, grandes e sobrepostas; cada uma se endireita ao passar o mouse. */}
        <div className="relative mx-auto my-6 w-full max-w-xl flex-1">
          {covers.slice(0, 3).map((src, i) => (
            <div key={src + i} className="m-rise absolute w-[78%]"
              style={{ "--i": 2 + i, top: `${[4, 30, 56][i]}%`, left: `${[0, 22, 6][i]}%`, zIndex: 3 - i } as React.CSSProperties}>
              <img src={src} alt="" loading="lazy" width={640} height={384}
                className="aspect-[16/10] w-full rounded-xl border object-cover shadow-[0_40px_80px_-30px_rgb(0_0_0/0.95)] transition-transform duration-500 ease-out hover:rotate-0 hover:scale-[1.02]"
                style={{ transform: `rotate(${[-4, 3, -1.5][i]}deg)` }} />
            </div>
          ))}
        </div>
        <div className="m-rise max-w-md" style={{ "--i": 6 } as React.CSSProperties}>
          <p className="text-sm font-medium text-primary">Ingresso nominal · QR Code único</p>
          <p className="mt-3 text-3xl font-semibold leading-tight tracking-tight">Seu ingresso no seu nome. Na porta, é só mostrar o QR Code.</p>
          <p className="mt-3 text-sm text-muted-foreground">Pix ou cartão, transferência segura por CPF e devolução em até 7 dias.</p>
        </div>
      </div>
    </aside>
  );
}

export function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, type, ...rest } = props;
  const isPassword = type === "password";
  const [visible, setVisible] = useState(false);
  const id = useId();
  return (
    <div className="block space-y-1.5">
      <label htmlFor={id} className="text-sm">{label}</label>
      <span className="relative block">
        <input {...rest} id={id} type={isPassword && visible ? "text" : type}
          className={cn("h-11 w-full rounded-md border bg-card px-3 text-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-primary/60 focus:shadow-[0_0_0_4px_rgb(160_61_253/0.14)]", isPassword && "pr-11")} />
        {isPassword && (
          <button type="button" onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Esconder senha" : "Mostrar senha"} aria-pressed={visible}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground">
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </span>
    </div>
  );
}

export function useSubmit(fn: (fd: FormData) => Promise<void>) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try { await fn(new FormData(e.currentTarget)); }
    catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado"); }
    finally { setLoading(false); }
  };
  return { error, loading, onSubmit };
}

export const SubmitButton = ({ loading, children }: { loading: boolean; children: ReactNode }) => (
  <Button type="submit" className="h-11 w-full" disabled={loading}>{loading ? <><Loader2 className="animate-spin" />Aguarde…</> : children}</Button>
);
