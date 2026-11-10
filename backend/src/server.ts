// Servidor local (npm run dev / npm start). Na Vercel a entrada é src/vercel.ts.
import { createApp } from "./app.js";
import { config } from "./config.js";
import { expireStaleOrders } from "./domain/orders.js";

const app = createApp();
app.listen(config.port, () => {
  console.log(`BooTickets API em ${config.publicUrl}/api/v1 (pagamentos: ${config.paymentProvider})`);
});

// Libera reservas de pedidos não pagos.
setInterval(() => {
  expireStaleOrders()
    .then((n) => { if (n) console.log(`${n} pedido(s) expirado(s)`); })
    .catch((e) => console.error("Falha ao expirar pedidos:", e));
}, 30_000).unref();
