import { Link } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center px-5">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-10 flex items-center gap-2 font-semibold">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground"><Ticket className="size-4" /></span>Passe
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-8">{children}</div>
        <p className="mt-6 text-sm text-muted-foreground">{footer}</p>
      </div>
    </div>
  );
}

export function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block space-y-1.5">
      <span className="text-sm">{label}</span>
      <input {...rest} className="h-10 w-full rounded-md border bg-card px-3 text-sm outline-none focus:border-primary/50" />
    </label>
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
  <Button type="submit" className="w-full" disabled={loading}>{loading ? "Aguarde…" : children}</Button>
);
