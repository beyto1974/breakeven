import { describe, expect, test } from "bun:test";
import { linear, niceScale } from "../scale";

describe("niceScale", () => {
  test("rounds the domain out to nice steps and lists the ticks", () => {
    expect(niceScale(-4000, 53000, 6)).toEqual({ min: -10000, max: 60000, step: 10000, ticks: [-10000, 0, 10000, 20000, 30000, 40000, 50000, 60000] });
  });

  test("always includes zero", () => {
    const scale = niceScale(120, 980, 4);
    expect(scale.min).toBe(0);
    expect(scale.ticks).toContain(0);
  });

  test("handles a flat or empty domain", () => {
    expect(niceScale(0, 0, 4)).toEqual({ min: 0, max: 1, step: 1, ticks: [0, 1] });
  });

  test("uses 1, 2 or 5 times a power of ten", () => {
    for (const [lo, hi] of [[0, 7], [0, 130], [-2.5, 3], [0, 99999]] as const) {
      const { step } = niceScale(lo, hi, 5);
      const mantissa = step / 10 ** Math.floor(Math.log10(step));
      expect([1, 2, 5]).toContain(Math.round(mantissa));
    }
  });
});

describe("linear", () => {
  test("maps a domain onto a range, including inverted ranges", () => {
    const y = linear([0, 100], [200, 0]);
    expect(y(0)).toBe(200);
    expect(y(50)).toBe(100);
    expect(y(100)).toBe(0);
  });

  test("maps a zero-width domain to the start of the range", () => {
    expect(linear([5, 5], [0, 10])(5)).toBe(0);
  });
});
