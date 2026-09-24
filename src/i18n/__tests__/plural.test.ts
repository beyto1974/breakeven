import { describe, expect, test } from "bun:test";
import { pluralize } from "../plural";

describe("pluralize — en", () => {
  test("follows the common rules", () => {
    expect(pluralize("en", "customer")).toBe("customers");
    expect(pluralize("en", "company")).toBe("companies");
    expect(pluralize("en", "day")).toBe("days");
    expect(pluralize("en", "box")).toBe("boxes");
    expect(pluralize("en", "match")).toBe("matches");
    expect(pluralize("en", "work order")).toBe("work orders");
  });
});

describe("pluralize — nl", () => {
  test("handles the common endings", () => {
    expect(pluralize("nl", "klant")).toBe("klanten");
    expect(pluralize("nl", "eenheid")).toBe("eenheden");
    expect(pluralize("nl", "bedrijf")).toBe("bedrijven");
    expect(pluralize("nl", "werkbon")).toBe("werkbonnen");
    expect(pluralize("nl", "stuk")).toBe("stukken");
    expect(pluralize("nl", "uur")).toBe("uren");
    expect(pluralize("nl", "huis")).toBe("huizen");
    expect(pluralize("nl", "gebruiker")).toBe("gebruikers");
    expect(pluralize("nl", "offerte")).toBe("offertes");
    expect(pluralize("nl", "auto")).toBe("auto's");
    expect(pluralize("nl", "abonnement")).toBe("abonnementen");
    expect(pluralize("nl", "maand")).toBe("maanden");
    expect(pluralize("nl", "bestelling")).toBe("bestellingen");
  });
});

describe("pluralize — fr", () => {
  test("handles the common endings", () => {
    expect(pluralize("fr", "client")).toBe("clients");
    expect(pluralize("fr", "unité")).toBe("unités");
    expect(pluralize("fr", "prix")).toBe("prix");
    expect(pluralize("fr", "bureau")).toBe("bureaux");
    expect(pluralize("fr", "journal")).toBe("journaux");
    expect(pluralize("fr", "entreprise")).toBe("entreprises");
  });

  test("pluralises the head noun of a compound with de", () => {
    expect(pluralize("fr", "bon de travail")).toBe("bons de travail");
  });
});

describe("pluralize — count and override", () => {
  test("uses the singular for exactly one", () => {
    expect(pluralize("en", "company", 1)).toBe("company");
    expect(pluralize("nl", "klant", 1)).toBe("klant");
  });

  test("French also uses the singular for zero", () => {
    expect(pluralize("fr", "client", 0)).toBe("client");
    expect(pluralize("en", "customer", 0)).toBe("customers");
  });

  test("an explicit plural wins over the rules", () => {
    expect(pluralize("nl", "museum", 2, "musea")).toBe("musea");
    expect(pluralize("nl", "museum", 1, "musea")).toBe("museum");
  });
});
