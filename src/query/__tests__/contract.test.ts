import { describe, expect, test } from "bun:test";
import { GOAL_KINDS, SOLVABLE_KEYS, DEFAULT_SETTINGS, NUMERIC_FIELDS, TEXT_ORDER } from "../settings";
import { LANGS } from "@/i18n/lang";
import { buildQueryContract } from "../contract";

describe("buildQueryContract", () => {
  test("lists every numeric field with its default, min and max", () => {
    const contract = buildQueryContract();
    expect(contract.numeric.map((f) => f.key)).toEqual(NUMERIC_FIELDS.map((f) => f.key));
    for (const field of contract.numeric) {
      const spec = NUMERIC_FIELDS.find((f) => f.key === field.key)!;
      expect(field.min).toBe(spec.min);
      expect(field.max).toBe(spec.max);
      expect(field.integer).toBe(Boolean(spec.integer));
      expect(field.money).toBe(Boolean(spec.money));
      expect(field.default).toBe(DEFAULT_SETTINGS[field.key]);
    }
  });

  test("lists every text field, with a max length for free-text labels", () => {
    const contract = buildQueryContract();
    expect(contract.text.map((f) => f.key)).toEqual([...TEXT_ORDER]);
    const currency = contract.text.find((f) => f.key === "currency")!;
    expect(currency.maxLength).toBeUndefined();
    const title = contract.text.find((f) => f.key === "title")!;
    expect(title.maxLength).toBe(80);
    expect(title.default).toBe(DEFAULT_SETTINGS.title);
  });

  test("enumerates the language, goal and solve choices", () => {
    const contract = buildQueryContract();
    expect(contract.lang.choices).toEqual(LANGS);
    expect(contract.lang.default).toBe(DEFAULT_SETTINGS.lang);
    expect(contract.goal.choices).toEqual(GOAL_KINDS);
    expect(contract.solve.choices).toEqual(SOLVABLE_KEYS);
    expect(contract.solve.default).toBe(DEFAULT_SETTINGS.solve);
  });

  test("gives the language-bound defaults for every language", () => {
    const contract = buildQueryContract();
    expect(contract.languageDefaults.nl.title).toBe("Rentabiliteit");
    expect(contract.languageDefaults.fr.locale).toBe("fr-BE");
  });

  test("builds an example URL relative to the given base path", () => {
    const contract = buildQueryContract("/breakeven/");
    expect(contract.exampleUrl.startsWith("/breakeven/?")).toBe(true);
    expect(contract.exampleUrl).toContain("customers=");
  });

  test("defaults the base path to the report's own root", () => {
    const contract = buildQueryContract();
    expect(contract.exampleUrl.startsWith("/?")).toBe(true);
  });
});
