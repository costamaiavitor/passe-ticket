import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

/**
 * Leitor de QR pela câmera traseira. Usa o BarcodeDetector nativo quando existe
 * (Android/Chrome) e cai para o jsQR (iPhone/Safari e demais navegadores).
 */
export function QrScanner({ paused, onScan }: { paused: boolean; onScan: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const onScanRef = useRef(onScan);
  pausedRef.current = paused;
  onScanRef.current = onScan;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    type Detector = { detect: (s: CanvasImageSource) => Promise<Array<{ rawValue: string }>> };
    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    const detector = BD ? new BD({ formats: ["qr_code"] }) : null;

    const tick = async () => {
      if (stopped) return;
      const v = videoRef.current, c = canvasRef.current;
      if (v && c && v.readyState >= 2 && !pausedRef.current) {
        try {
          let code: string | undefined;
          if (detector) code = (await detector.detect(v))[0]?.rawValue;
          else {
            const w = 480, h = Math.round((v.videoHeight / v.videoWidth) * w) || 480;
            c.width = w; c.height = h;
            const ctx = c.getContext("2d", { willReadFrequently: true })!;
            ctx.drawImage(v, 0, 0, w, h);
            code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" })?.data;
          }
          if (code && !pausedRef.current) onScanRef.current(code);
        } catch { /* frame ruim, segue */ }
      }
      raf = requestAnimationFrame(() => void tick());
    };

    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => {
        if (stopped) { s.getTracks().forEach((t) => t.stop()); return; }
        stream = s;
        if (videoRef.current) { videoRef.current.srcObject = s; void videoRef.current.play(); }
        void tick();
      })
      .catch(() => setError("Não foi possível acessar a câmera. Permita o acesso ou digite o código abaixo."));
    if (!navigator.mediaDevices) setError("Câmera indisponível neste navegador (é preciso HTTPS).");

    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl border bg-black">
      <video ref={videoRef} playsInline muted className="size-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />
      <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-white/70" />
      {error && <p className="absolute inset-x-4 bottom-4 rounded-md bg-black/70 p-3 text-center text-sm text-white">{error}</p>}
    </div>
  );
}
