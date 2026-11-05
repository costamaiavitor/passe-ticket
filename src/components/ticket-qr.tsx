import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Renderiza o conteúdo do QR (gerado e assinado pelo backend) como imagem. */
export function TicketQr({ value, size = 220 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { width: size * 2, margin: 1, errorCorrectionLevel: "M" })
      .then((u) => alive && setSrc(u))
      .catch(() => alive && setSrc(null));
    return () => { alive = false; };
  }, [value, size]);
  return (
    <div className="grid place-items-center rounded-lg bg-white p-3" style={{ width: size + 24, height: size + 24 }}>
      {src ? <img src={src} alt="QR Code do ingresso" width={size} height={size} /> : <div className="size-full animate-pulse rounded bg-neutral-200" />}
    </div>
  );
}
