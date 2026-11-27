// Prepara os eventos de teste uma vez antes de todos os testes (produtor cria, admin aprova).
import { writeFileSync } from "node:fs";
import { api, buyPaid, login, newBuyer, type QaState } from "./api";

const future = (days: number, hour = 22) => {
  const d = new Date(Date.now() + days * 86400_000);
  d.setUTCHours(hour + 3, 0, 0, 0); // hora de Fortaleza
  return d.toISOString();
};
const salesStart = () => new Date(Date.now() - 60_000).toISOString();

export default async function setup() {
  const org = await login("produtor@passe.dev", "passe1234");
  const adm = await login("admin@passe.dev", "passe1234");

  async function create(body: Record<string, unknown>) {
    const end = String(body["startsAt"]);
    const batches = (body["batches"] as Record<string, unknown>[]).map((b) => ({ salesStart: salesStart(), salesEnd: end, ...b }));
    const r = await api<any>("/organizer/events", {
      token: org,
      body: { category: "festas", venue: "Galpão QA", city: "Fortaleza", address: "Av. Teste, 100", description: "Evento criado pelos testes automáticos.",
        importantInfo: ["Classificação 18 anos"], maxTicketsPerCpf: 4, acceptOrganizerTerms: true, ...body, batches },
    });
    if (r.status !== 201) throw new Error(`criar ${body["title"]}: ${r.status} ${JSON.stringify(r.body)}`);
    const ok = await api(`/admin/events/${r.body.id}/approve`, { method: "POST", token: adm });
    if (ok.status !== 200) throw new Error(`aprovar ${body["title"]}: ${ok.status}`);
    return r.body as { id: string; title: string; batches: { id: string; name: string; ticketType: string | null }[] };
  }
  const byType = (ev: { batches: { id: string; ticketType: string | null }[] }, t: string) => ev.batches.find((b) => b.ticketType === t)!.id;

  const main = await create({
    title: "QA Festa Principal", startsAt: future(20),
    batches: [
      { name: "Pista — 1º lote", ticketType: "Pista", price: 5000, total: 500 },
      { name: "Meia-entrada — 1º lote", ticketType: "Meia-entrada", price: 2500, total: 200 },
      { name: "Camarote — 1º lote", ticketType: "Camarote", price: 12000, total: 50 },
    ],
    coupons: [{ code: "QA10", kind: "percent", value: 10 }],
  });
  const soldOut = await create({ title: "QA Esgotado", startsAt: future(15), batches: [{ name: "Pista — 1º lote", ticketType: "Pista", price: 3000, total: 1 }] });
  const priv = await create({ title: "QA Festa Privada", startsAt: future(25), visibility: "unlisted", accessCode: "SEGREDO",
    batches: [{ name: "Pista — 1º lote", ticketType: "Pista", price: 4000, total: 100 }] });
  const longName = await create({
    title: "QA Festival Internacional de Música Eletrônica e Artes Visuais com Convidados Especiais Edição de Verão Superlonga 2027",
    venue: "Centro de Convenções e Exposições Governador Virgílio Távora Pavilhão Oeste", startsAt: future(30),
    batches: [{ name: "Ingresso Antecipado Promocional Primeiro Lote", ticketType: "Ingresso Antecipado Promocional", price: 999999, total: 100 }],
  });
  const free = await create({ title: "QA Entrada Grátis", startsAt: future(10, 19), batches: [{ name: "Gratuito — 1º lote", ticketType: "Gratuito", price: 0, total: 300 }] });
  const few = await create({ title: "QA Últimos Ingressos", startsAt: future(12), batches: [{ name: "Pista — 1º lote", ticketType: "Pista", price: 6000, total: 3 }] });

  // Esgota o evento "QA Esgotado".
  const b = await newBuyer("esgota");
  await buyPaid(b.token, soldOut.id, soldOut.batches[0]!.id, [{ name: b.name, cpf: b.cpf }]);

  const state: QaState = {
    main: { id: main.id, title: main.title, pista: byType(main, "Pista"), meia: byType(main, "Meia-entrada"), camarote: byType(main, "Camarote"), pistaPrice: 5000 },
    soldOut: { id: soldOut.id, title: soldOut.title },
    priv: { id: priv.id, title: priv.title, code: "SEGREDO" },
    longName: { id: longName.id, title: longName.title },
    free: { id: free.id, title: free.title, batch: free.batches[0]!.id },
    few: { id: few.id, title: few.title, batch: few.batches[0]!.id },
  };
  writeFileSync(new URL("./.state.json", import.meta.url), JSON.stringify(state, null, 2));
}
