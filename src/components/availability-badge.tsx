import { cn } from "@/lib/utils";
import type { EventSummary } from "@/types";

const map = {
  available: { label: "Disponível", cls: "text-success border-success/30" },
  few_left: { label: "Últimas unidades", cls: "text-warning border-warning/30" },
  soldout: { label: "Esgotado", cls: "text-destructive border-destructive/30" },
} as const;

export function AvailabilityBadge({ value }: { value: EventSummary["availability"] }) {
  const m = map[value];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-2.5 py-0.5 text-xs backdrop-blur", m.cls)}>
      <span className="size-1.5 rounded-full bg-current" />{m.label}
    </span>
  );
}
