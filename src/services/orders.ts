import { queryOptions } from "@tanstack/react-query";
import type { Holder, Order } from "@/types";
import { http, USE_MOCKS } from "./http";

const mocks = () => import("@/mocks/store");

export async function createOrder(input: { eventId: string; batchId: string; holders: Holder[] }): Promise<Order> {
  if (USE_MOCKS) return (await mocks()).mockCreateOrder(input);
  return http<Order>("/orders", { method: "POST", body: JSON.stringify(input) });
}

async function getOrder(id: string): Promise<Order> {
  if (USE_MOCKS) return (await mocks()).mockGetOrder(id);
  return http<Order>(`/orders/${encodeURIComponent(id)}`);
}

/** Só existe com pagamento simulado (desenvolvimento). */
export async function simulatePayment(id: string): Promise<Order> {
  if (USE_MOCKS) return (await mocks()).mockPay(id);
  return http<Order>(`/orders/${encodeURIComponent(id)}/simulate-payment`, { method: "POST" });
}

export async function cancelOrder(id: string): Promise<Order> {
  if (USE_MOCKS) return (await mocks()).mockCancel(id);
  return http<Order>(`/orders/${encodeURIComponent(id)}/cancel`, { method: "POST" });
}

export const orderQuery = (id: string) =>
  queryOptions({
    queryKey: ["order", id],
    queryFn: () => getOrder(id),
    // Enquanto o Pix não é pago, consulta a cada 3s.
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 3000 : false),
  });
