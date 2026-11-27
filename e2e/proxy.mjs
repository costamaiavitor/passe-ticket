// Junta o site (porta 3000) e a API (porta 3333) num endereço só (8080), como a Vercel faz em produção.
import http from "node:http";

const SITE = { host: "127.0.0.1", port: 3000 };
const API = { host: "127.0.0.1", port: 3333 };

http.createServer((req, res) => {
  const target = req.url.startsWith("/api/") || req.url.startsWith("/static/") || req.url === "/health" ? API : SITE;
  // Cada conexão do navegador vira um "IP" diferente (pela porta de origem): o limite de 10 logins por minuto
  // por IP não mistura os testes. Chamadas da preparação já mandam o próprio x-forwarded-for.
  const port = req.socket.remotePort ?? 0;
  const ip = req.headers["x-forwarded-for"] ?? `10.${(port >> 8) & 255}.${port & 255}.${1 + (port % 250)}`;
  const p = http.request({ ...target, path: req.url, method: req.method, headers: { ...req.headers, "x-forwarded-for": ip } }, (r) => {
    res.writeHead(r.statusCode ?? 502, r.headers);
    r.pipe(res);
  });
  p.on("error", (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(p);
}).listen(8080, () => console.log("proxy em http://localhost:8080"));
