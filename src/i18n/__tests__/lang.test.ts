import { describe, expect, test } from "bun:test";
import { detectLang, isLang } from "../lang";

describe("detectLang", () => {
  test("takes the first supported base language", () => {
    expect(detectLang(["de-DE", "nl-BE", "fr"])).toBe("nl");
    expect(detectLang(["FR-be"])).toBe("fr");
  });

  test("falls back to English", () => {
    expect(detectLang([])).toBe("en");
    expect(detectLang(["de", "es"])).toBe("en");
  });
});

describe("isLang", () => {
  test("accepts only the supported codes", () => {
    expect(isLang("nl")).toBe(true);
    expect(isLang("NL")).toBe(false);
    expect(isLang("de")).toBe(false);
  });
});
