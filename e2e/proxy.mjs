// Junta o site (porta 3000) e a API (porta 3333) num endereço só (8080), como a Vercel faz em produção.
import http from "node:http";

const SITE = { host: "127.0.0.1", port: 3000 };
const API = { host: "127.0.0.1", port: 3333 };

http.createServer((req, res) => {
  const target = req.url.startsWith("/api/") || req.url.startsWith("/static/") || req.url === "/health" ? API : SITE;
  const p = http.request({ ...target, path: req.url, method: req.method, headers: { ...req.headers, "x-forwarded-for": req.headers["x-forwarded-for"] ?? req.socket.remoteAddress } }, (r) => {
    res.writeHead(r.statusCode ?? 502, r.headers);
    r.pipe(res);
  });
  p.on("error", (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(p);
}).listen(8080, () => console.log("proxy em http://localhost:8080"));
