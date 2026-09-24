import { describe, expect, test } from "bun:test";
import { DEFAULT_SETTINGS, defaultsFor, parseSettings, serializeSettings, switchLang, toProjectionInput } from "../settings";

describe("parseSettings", () => {
  test("an empty query yields the defaults and no warnings", () => {
    const { settings, warnings } = parseSettings(new URLSearchParams(""));
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(warnings).toEqual([]);
  });

  test("the defaults match the blueprint", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      lang: "en",
      customers: 15,
      growth: 3,
      churn: 2,
      units: 40,
      price: 0.25,
      subscription: 0,
      vat: 21,
      variable: 0.05,
      fixed: 200,
      cac: 0,
      months: 24,
      currency: "EUR",
      locale: "en-IE",
      customer: "customer",
      unit: "unit",
      customerPlural: "",
      unitPlural: "",
      title: "Rentability",
    });
  });

  test("reads numbers, including decimal commas", () => {
    const { settings, warnings } = parseSettings(new URLSearchParams("customers=12&price=0,3&churn=1.5"));
    expect(settings.customers).toBe(12);
    expect(settings.price).toBe(0.3);
    expect(settings.churn).toBe(1.5);
    expect(warnings).toEqual([]);
  });

  test("accepts exponent notation, which String() produces for tiny values", () => {
    const { settings, warnings } = parseSettings(new URLSearchParams("churn=1e-7&units=1E3"));
    expect(settings.churn).toBe(1e-7);
    expect(settings.units).toBe(1000);
    expect(warnings).toEqual([]);
  });

  test("rejects partial numbers", () => {
    for (const bad of ["1.2.3", "12abc", "e5", "--1", "."]) {
      expect(parseSettings(new URLSearchParams({ growth: bad })).warnings[0]?.reason).toBe("not-a-number");
    }
  });

  test("falls back to the default and warns on a value that is not a number", () => {
    const { settings, warnings } = parseSettings(new URLSearchParams("growth=lots"));
    expect(settings.growth).toBe(3);
    expect(warnings).toEqual([{ param: "growth", value: "lots", reason: "not-a-number" }]);
  });

  test("falls back to the default and warns on a value out of range", () => {
    const { settings, warnings } = parseSettings(new URLSearchParams("churn=150&months=0"));
    expect(settings.churn).toBe(2);
    expect(settings.months).toBe(24);
    expect(warnings).toEqual([
      { param: "churn", value: "150", reason: "out-of-range" },
      { param: "months", value: "0", reason: "out-of-range" },
    ]);
  });

  test("months must be a whole number", () => {
    const { settings, warnings } = parseSettings(new URLSearchParams("months=12.5"));
    expect(settings.months).toBe(24);
    expect(warnings[0]?.reason).toBe("not-an-integer");
  });

  test("treats an empty value as absent", () => {
    const { settings, warnings } = parseSettings(new URLSearchParams("fixed="));
    expect(settings.fixed).toBe(200);
    expect(warnings).toEqual([]);
  });

  test("accepts a valid currency and locale, case-normalised", () => {
    const { settings, warnings } = parseSettings(new URLSearchParams("currency=usd&locale=en-US"));
    expect(settings.currency).toBe("USD");
    expect(settings.locale).toBe("en-US");
    expect(warnings).toEqual([]);
  });

  test("rejects an unknown currency or a malformed locale", () => {
    const { settings, warnings } = parseSettings(new URLSearchParams("currency=EURO&locale=not_a_locale!"));
    expect(settings.currency).toBe("EUR");
    expect(settings.locale).toBe("en-IE");
    expect(warnings.map((w) => w.param)).toEqual(["currency", "locale"]);
    expect(warnings.every((w) => w.reason === "invalid")).toBe(true);
  });

  test("trims labels and rejects ones that are too long", () => {
    const long = "x".repeat(33);
    const { settings, warnings } = parseSettings(new URLSearchParams(`customer=%20company%20&unit=${long}`));
    expect(settings.customer).toBe("company");
    expect(settings.unit).toBe("unit");
    expect(warnings).toEqual([{ param: "unit", value: long, reason: "too-long" }]);
  });

  test("ignores unknown parameters", () => {
    const { warnings } = parseSettings(new URLSearchParams("utm_source=mail"));
    expect(warnings).toEqual([]);
  });
});

describe("serializeSettings", () => {
  test("writes nothing for the defaults", () => {
    expect(serializeSettings(DEFAULT_SETTINGS)).toBe("");
  });

  test("writes only values that differ from the defaults, in contract order", () => {
    const query = serializeSettings({ ...DEFAULT_SETTINGS, unit: "bon", customers: 12, customer: "company", growth: 2 });
    expect(query).toBe("customers=12&growth=2&customer=company&unit=bon");
  });

  test("round-trips a tiny value written in exponent notation", () => {
    const settings = { ...DEFAULT_SETTINGS, churn: 1e-7 };
    expect(serializeSettings(settings)).toBe("churn=1e-7");
    expect(parseSettings(new URLSearchParams(serializeSettings(settings))).settings).toEqual(settings);
  });

  test("round-trips through parseSettings", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      price: 0.0025,
      subscription: 9.99,
      months: 60,
      currency: "USD",
      title: "Pricing v2 & friends",
    };
    expect(parseSettings(new URLSearchParams(serializeSettings(settings))).settings).toEqual(settings);
  });
});

describe("toProjectionInput", () => {
  test("converts money to cents and maps names to the domain", () => {
    expect(toProjectionInput(DEFAULT_SETTINGS)).toEqual({
      customers: 15,
      newCustomersPerMonth: 3,
      churnPercentPerMonth: 2,
      unitsPerCustomerPerMonth: 40,
      unitPriceCents: 25,
      subscriptionCents: 0,
      vatPercent: 21,
      variableCostPerUnitCents: 5,
      fixedCostPerMonthCents: 20000,
      acquisitionCostCents: 0,
      months: 24,
    });
  });
});

describe("language", () => {
  test("lang selects the language defaults", () => {
    const { settings, warnings } = parseSettings(new URLSearchParams("lang=nl"));
    expect(settings).toEqual(defaultsFor("nl"));
    expect(settings).toMatchObject({ lang: "nl", locale: "nl-BE", customer: "klant", unit: "eenheid", title: "Rentabiliteit" });
    expect(warnings).toEqual([]);
  });

  test("French defaults", () => {
    expect(defaultsFor("fr")).toMatchObject({ locale: "fr-BE", customer: "client", unit: "unité", title: "Rentabilité" });
  });

  test("lang is case-insensitive; an unknown one warns and uses the fallback", () => {
    expect(parseSettings(new URLSearchParams("lang=FR")).settings.lang).toBe("fr");
    const { settings, warnings } = parseSettings(new URLSearchParams("lang=de"), "nl");
    expect(settings.lang).toBe("nl");
    expect(warnings).toEqual([{ param: "lang", value: "de", reason: "invalid" }]);
  });

  test("without lang, the fallback language applies", () => {
    expect(parseSettings(new URLSearchParams(""), "fr").settings).toEqual(defaultsFor("fr"));
  });

  test("serialises lang first and compares against that language's defaults", () => {
    expect(serializeSettings(defaultsFor("nl"))).toBe("lang=nl");
    expect(serializeSettings({ ...defaultsFor("fr"), customers: 20, customer: "entreprise" })).toBe("lang=fr&customers=20&customer=entreprise");
  });

  test("round-trips a non-English report with explicit plurals", () => {
    const settings = { ...defaultsFor("nl"), unit: "museum", unitPlural: "musea", growth: 2.5 };
    expect(parseSettings(new URLSearchParams(serializeSettings(settings))).settings).toEqual(settings);
  });

  test("switchLang moves default fields to the new language and keeps custom ones", () => {
    const switched = switchLang({ ...DEFAULT_SETTINGS, customer: "company", fixed: 500 }, "nl");
    expect(switched).toMatchObject({ lang: "nl", locale: "nl-BE", unit: "eenheid", title: "Rentabiliteit", customer: "company", fixed: 500 });
  });

  test("switchLang drops a plural whose noun was replaced", () => {
    const switched = switchLang({ ...DEFAULT_SETTINGS, unitPlural: "units!" }, "fr");
    expect(switched.unit).toBe("unité");
    expect(switched.unitPlural).toBe("");
  });
});
