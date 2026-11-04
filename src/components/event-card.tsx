import { Link } from "@tanstack/react-router";
import { Calendar, MapPin } from "lucide-react";
import type { EventSummary } from "@/types";
import { brl, fmtDate, fmtTime } from "@/utils/format";
import { AvailabilityBadge } from "./availability-badge";

export function EventCard({ event }: { event: EventSummary }) {
  return (
    <Link
      to="/eventos/$id"
      params={{ id: event.id }}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-muted-foreground/40"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img src={event.coverUrl} alt={event.title} loading="lazy" width={1280} height={768}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        <div className="absolute left-3 top-3"><AvailabilityBadge value={event.availability} /></div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="font-medium leading-snug">{event.title}</h3>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p className="flex items-center gap-2"><Calendar className="size-3.5" />{fmtDate(event.startsAt)} · {fmtTime(event.startsAt)}</p>
          <p className="flex items-center gap-2"><MapPin className="size-3.5" />{event.venue}, {event.city}</p>
        </div>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <p className="text-xs text-muted-foreground">A partir de</p>
            <p className="font-medium">{brl(event.priceFrom)}</p>
          </div>
          <span className="text-sm text-muted-foreground transition-colors group-hover:text-primary">Ver detalhes →</span>
        </div>
      </div>
    </Link>
  );
}
