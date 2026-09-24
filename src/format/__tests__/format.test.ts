import { describe, expect, test } from "bun:test";
import { createFormatter } from "../format";

const f = createFormatter({ locale: "en-US", currency: "USD" });

describe("createFormatter", () => {
  test("formats cents as whole currency for headlines", () => {
    expect(f.moneyShort(150522)).toBe("$1,505");
  });

  test("formats cents with two decimals for tables", () => {
    expect(f.money(150522)).toBe("$1,505.22");
    expect(f.money(-2000)).toBe("-$20.00");
  });

  test("formats integers and percentages", () => {
    expect(f.integer(12345)).toBe("12,345");
    expect(f.decimal(2.456)).toBe("2.46");
    expect(f.decimal(3)).toBe("3");
    expect(f.percent(0.18095)).toBe("18.1%");
    expect(f.percent(null)).toBe("—");
  });

  test("formats sub-cent unit prices without losing precision", () => {
    expect(f.unitPrice(0.25)).toBe("$0.0025");
    expect(f.unitPrice(25)).toBe("$0.25");
  });

  test("gives the currency symbol for input adornments", () => {
    expect(f.currencySymbol).toBe("$");
    expect(createFormatter({ locale: "en-BE", currency: "EUR" }).currencySymbol).toBe("€");
  });

  test("falls back to en and EUR when the environment rejects the pair", () => {
    const fallback = createFormatter({ locale: "en-BE", currency: "ZZZ" });
    expect(fallback.money(100)).toContain("1.00");
  });
});
