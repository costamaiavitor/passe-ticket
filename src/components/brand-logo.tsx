// Logo do BooTickets: o fantasminha com o ingresso + o nome ("Boo" branco, "Tickets" roxo), como na arte da marca.
export function BrandLogo({ size = "md" }: { size?: "md" | "lg" }) {
  const img = size === "lg" ? "h-10" : "h-8";
  return (
    <span className="flex items-center gap-2 font-bold tracking-tight">
      <img src="/ghost.png" alt="" width={186} height={160} className={`${img} w-auto`} />
      <span className={size === "lg" ? "text-xl" : "text-lg"}>
        <span className="text-foreground">Boo</span><span className="text-primary">Tickets</span>
      </span>
    </span>
  );
}
