import { describe, expect, test } from "bun:test";
import { netOf, toCents, fromCents } from "../money";

describe("netOf", () => {
  test("removes VAT included in a gross amount, rounding down to the cent", () => {
    expect(netOf(121, 21)).toBe(100);
    expect(netOf(1000, 21)).toBe(826); // 826.44…
  });

  test("returns the amount unchanged when there is no VAT", () => {
    expect(netOf(1000, 0)).toBe(1000);
  });

  test("treats a negative or non-finite rate as no VAT", () => {
    expect(netOf(1000, -5)).toBe(1000);
    expect(netOf(1000, Number.NaN)).toBe(1000);
  });

  test("works on fractional cents and still returns whole cents", () => {
    expect(netOf(24.2, 21)).toBe(20);
  });
});

describe("toCents / fromCents", () => {
  test("converts major units to cents without float noise", () => {
    expect(toCents(0.29)).toBe(29);
    expect(toCents(1.005)).toBe(100.5);
    expect(toCents(200)).toBe(20000);
  });

  test("keeps sub-cent precision up to four decimals of the major unit", () => {
    expect(toCents(0.0025)).toBe(0.25);
    expect(toCents(0.00001)).toBe(0);
  });

  test("converts cents back to major units", () => {
    expect(fromCents(2500)).toBe(25);
    expect(fromCents(0.25)).toBe(0.0025);
  });
});
