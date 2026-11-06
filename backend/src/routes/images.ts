// Fotos enviadas pelos organizadores (capa do evento). O site reduz a foto no celular antes de enviar
// (JPEG de ~100–300 KB), e ela fica guardada no próprio banco — sem serviço extra de armazenamento.
import { randomUUID } from "node:crypto";
import express, { Router } from "express";
import { z } from "zod";
import { now, one, run } from "../db.js";
import { badRequest, notFound } from "../lib/errors.js";
import { parse, rateLimit, requireRole, user } from "../lib/http.js";

export const imagesRouter = Router();

const MAX_BYTES = 1_500_000; // 1,5 MB depois de reduzida
const TYPES = ["image/jpeg", "image/png", "image/webp"];

imagesRouter.post(
  "/",
  express.json({ limit: "3mb" }),
  requireRole("organizer"),
  rateLimit({ windowMs: 60_000, max: 20, key: (r) => `upload:${r.auth?.id}` }),
  async (req, res) => {
    const { dataUrl } = parse(z.object({ dataUrl: z.string().max(2_200_000) }), req.body);
    const m = /^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!m || !TYPES.includes(m[1]!)) throw badRequest("INVALID_IMAGE", "Envie uma foto em JPG, PNG ou WEBP.");
    const bytes = Buffer.from(m[2]!, "base64");
    if (bytes.length > MAX_BYTES) throw badRequest("IMAGE_TOO_BIG", "A foto ficou grande demais. Tente outra.");
    // Confere a "assinatura" do arquivo: não aceita algo que só finge ser imagem.
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
    const isWebp = bytes.subarray(8, 12).toString("ascii") === "WEBP";
    if (!isJpeg && !isPng && !isWebp) throw badRequest("INVALID_IMAGE", "Arquivo de imagem inválido.");
    const id = randomUUID();
    await run("INSERT INTO images (id, owner_id, mime, data, created_at) VALUES (?,?,?,?,?)", id, user(req).id, m[1]!, m[2]!, now());
    res.status(201).json({ id, url: `/api/v1/images/${id}` });
  },
);

imagesRouter.get("/:id", async (req, res) => {
  const img = await one<{ mime: string; data: string }>("SELECT mime, data FROM images WHERE id = ?", String(req.params.id));
  if (!img) throw notFound("Imagem não encontrada.");
  res.setHeader("Content-Type", img.mime);
  // A imagem nunca muda (cada envio gera um id novo): o navegador e a Vercel guardam em cache por 1 ano.
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(Buffer.from(img.data, "base64"));
});
