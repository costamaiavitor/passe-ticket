import { describe, expect, it } from "vitest";
import { platformFee, MAX_TICKETS_PER_CPF } from "./format";

describe("regras de compra", () => {
  it("taxa de 11% sobre R$100 é R$11: o organizador fica com R$89 e o comprador paga R$100", () => {
    expect(platformFee(10000)).toBe(1100);
    expect(10000 - platformFee(10000)).toBe(8900);
  });
  it("limite de 2 ingressos por CPF", () => {
    expect(MAX_TICKETS_PER_CPF).toBe(2);
  });
});
