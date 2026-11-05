# Passe — Backend

API Node.js do Passe (marketplace de ingressos). O frontend fala com ela via `VITE_API_URL` + `/api/v1`.

**Fluxo principal:** o cliente compra → paga via Pix → recebe um **QR Code único por ingresso** →
o segurança escaneia na entrada → o ingresso é marcado como **utilizado** e o QR deixa de valer.

## Rodando localmente

Requer **Node 22.18+**. O banco é Postgres: em produção o Neon; localmente, sem `DATABASE_URL`, a API usa o PGlite (Postgres embutido, sem instalar nada) em `./data/pglite`.

```bash
cd backend
cp .env.example .env
npm install
npm run seed      # cria eventos e contas de demonstração
npm run dev       # http://localhost:3333/api/v1
```

No frontend (raiz do projeto), crie `.env.local` com `VITE_API_URL=http://localhost:3333` e rode `bun run dev`.

Contas do seed (senha `passe1234`): `cliente@passe.dev`, `portaria@passe.dev` (equipe da portaria),
`produtor@passe.dev` (organizador) e `admin@passe.dev`.

Testes: `npm test` (fluxo completo, incluindo duas leituras simultâneas do mesmo QR).

## Como o QR Code funciona

- Conteúdo do QR: `PASSE1.<id do ingresso>.<versão>.<assinatura>`.
- A assinatura é um HMAC-SHA256 com `QR_SECRET` (só o servidor conhece): ninguém consegue gerar ou adivinhar um QR válido.
- O QR só é entregue depois do pagamento aprovado.
- Na portaria, `POST /checkin/scan` faz `UPDATE ... SET status='used' WHERE status='valid'` numa única operação:
  se dois seguranças lerem o mesmo QR ao mesmo tempo, só um recebe "Entrada liberada"; o outro vê "Ingresso já utilizado" com o horário.
- Transferir o ingresso incrementa a versão → o QR antigo passa a dar "QR antigo — ingresso foi transferido".
- Toda leitura (válida ou não) fica registrada na tabela `checkins` para auditoria.

## Endpoints (`/api/v1`)

| Método | Rota | Quem | O que faz |
| --- | --- | --- | --- |
| POST | `/auth/register` · `/auth/login` | público | Cria conta / entra. Retorna `accessToken` (15 min) e grava cookie httpOnly de refresh |
| POST | `/auth/refresh` · `/auth/logout` | público | Renova / encerra a sessão |
| GET | `/auth/me` | logado | Usuário atual |
| POST | `/auth/become-organizer` | logado | Vira produtor de eventos |
| GET | `/events` · `/events/:id` | público | Lista (filtros `q, city, category, date, maxPrice, onlyAvailable`) e detalhe |
| POST | `/orders` | logado | `{ eventId, batchId, holders: [{name, cpf}] }` — reserva estoque por 15 min e gera Pix |
| GET | `/orders` · `/orders/:id` | dono | Pedidos (o checkout faz polling aqui) |
| POST | `/orders/:id/cancel` | dono | Cancela e devolve o estoque |
| POST | `/orders/:id/simulate-payment` | dono | **Só com `PAYMENT_PROVIDER=mock`**: aprova o pagamento |
| GET | `/tickets` · `/tickets/:id` | dono | Ingressos com `qrPayload` |
| POST | `/tickets/:id/transfer` | dono | `{ email, holderName, holderCpf }` — troca titular e gera QR novo |
| GET | `/checkin/events` | equipe | Eventos que a pessoa pode operar |
| POST | `/checkin/scan` | equipe | `{ eventId, code }` → `ok`, `already_used`, `invalid`, `revoked`, `wrong_event`… |
| GET | `/checkin/events/:id/stats` | equipe | Entraram / faltam / últimas leituras |
| GET/POST | `/organizer/events` | organizador | Lista com vendas / cria evento com lotes |
| PATCH | `/organizer/events/:id` · `/organizer/batches/:id` | organizador | Edita evento / lote |
| POST | `/organizer/events/:id/batches` | organizador | Novo lote |
| GET | `/organizer/events/:id/tickets` | organizador | Lista de participantes |
| GET/POST/DELETE | `/organizer/events/:id/staff` | organizador | Equipe da portaria (por e-mail) |
| GET/PATCH | `/admin/users` · `/admin/users/:id/roles` | admin | Gestão de papéis |
| POST | `/webhooks/mercadopago` | Mercado Pago | Confirmação de pagamento |

Erros seguem `{ code, message }`, que o `src/services/http.ts` do frontend já entende.

## Regras aplicadas no servidor

- Taxa da plataforma de 10% (`PLATFORM_FEE_RATE`), calculada no backend.
- Limite de ingressos por CPF por evento (padrão 2), CPF validado pelos dígitos verificadores.
- Estoque reservado dentro de transação — não há overbooking. Reservas não pagas expiram em 15 min e voltam para a venda.
- Pagamento que chega depois da reserva expirar: emite se ainda houver estoque, senão marca `refund_required`.

## Pagamentos (Pix via Mercado Pago)

1. `PAYMENT_PROVIDER=mercadopago`, `MP_ACCESS_TOKEN` (credencial de produção ou teste) e `MP_WEBHOOK_SECRET`.
2. `PUBLIC_URL` precisa ser a URL pública da API — o Mercado Pago chama `PUBLIC_URL/api/v1/webhooks/mercadopago`.
3. O webhook nunca é confiado sozinho: a API reconsulta o pagamento no Mercado Pago antes de liberar ingressos.

## Produção (Vercel + Neon, plano grátis)

Site e API ficam num único projeto da Vercel (veja `vercel.json` na raiz): `/api/*` vai para esta API, o resto para o site.

1. Importe o repositório na Vercel (não mude a pasta raiz).
2. Em **Storage**, crie um banco **Neon** e conecte ao projeto: a Vercel cria a variável `DATABASE_URL`. As tabelas são criadas sozinhas no primeiro acesso.
3. Variáveis de ambiente do projeto:
   - `VITE_API_URL` = endereço do site (ex.: `https://passe-ticket.vercel.app`)
   - `CORS_ORIGINS` = o mesmo endereço
   - `NODE_ENV=production`
   - `JWT_SECRET` e `QR_SECRET`: textos longos e aleatórios. **Não troque o `QR_SECRET` depois de vender**: todos os QR emitidos deixariam de valer.
   - `PAYMENT_PROVIDER=mercadopago`, `MP_ACCESS_TOKEN` (de teste começa com `TEST-`) e, opcional, `MP_WEBHOOK_SECRET`
   - `ADMIN_EMAILS` = seu e-mail
4. Faça o deploy. A câmera da portaria só funciona em HTTPS (a Vercel já entrega HTTPS).

Reservas não pagas são liberadas a cada consulta de eventos/pedidos (não há processo rodando em segundo plano na Vercel).
