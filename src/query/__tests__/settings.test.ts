import { describe, expect, test } from "bun:test";
import { DEFAULT_SETTINGS, parseSettings, serializeSettings, toProjectionInput } from "../settings";

describe("parseSettings", () => {
  test("an empty query yields the defaults and no warnings", () => {
    const { settings, warnings } = parseSettings(new URLSearchParams(""));
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(warnings).toEqual([]);
  });

  test("the defaults match the blueprint", () => {
    expect(DEFAULT_SETTINGS).toEqual({
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
