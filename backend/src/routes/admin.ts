import { Router } from "express";
import { z } from "zod";
import { all, run } from "../db.ts";
import { notFound } from "../lib/errors.ts";
import { parse, requireRole } from "../lib/http.ts";

export const adminRouter = Router();
adminRouter.use(requireRole("admin"));

adminRouter.get("/users", (req, res) => {
  const q = typeof req.query["q"] === "string" ? `%${req.query["q"]}%` : "%";
  res.json(all<{ id: string; name: string; email: string; roles: string; created_at: string }>(
    "SELECT id, name, email, roles, created_at FROM users WHERE email LIKE ? OR name LIKE ? ORDER BY created_at DESC LIMIT 100", q, q,
  ).map((u) => ({ ...u, roles: JSON.parse(u.roles) })));
});

adminRouter.patch("/users/:id/roles", (req, res) => {
  const { roles } = parse(z.object({ roles: z.array(z.enum(["buyer", "organizer", "staff", "admin"])).min(1) }), req.body);
  const r = run("UPDATE users SET roles = ? WHERE id = ?", JSON.stringify([...new Set(roles)]), req.params.id);
  if (!r.changes) throw notFound("Usuário não encontrado.");
  res.json({ ok: true });
});
