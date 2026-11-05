import { createApp } from "./app.ts";
import { config } from "./config.ts";
import { expireStaleOrders } from "./domain/orders.ts";

const app = createApp();
app.listen(config.port, () => {
  console.log(`Passe API em ${config.publicUrl}/api/v1 (pagamentos: ${config.paymentProvider})`);
});

// Libera reservas de pedidos não pagos.
setInterval(() => {
  const n = expireStaleOrders();
  if (n) console.log(`${n} pedido(s) expirado(s)`);
}, 30_000).unref();
