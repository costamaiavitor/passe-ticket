import { describe, expect, it } from "vitest";
import { platformFee, MAX_TICKETS_PER_CPF } from "./format";

describe("regras de compra", () => {
  it("taxa de 10% sobre R$100 é R$10 (total R$110)", () => {
    expect(platformFee(10000)).toBe(1000);
    expect(10000 + platformFee(10000)).toBe(11000);
  });
  it("limite de 2 ingressos por CPF", () => {
    expect(MAX_TICKETS_PER_CPF).toBe(2);
  });
});
