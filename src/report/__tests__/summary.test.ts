import { describe, expect, test } from "bun:test";
import { summarize } from "../summary";
import { project } from "@/domain/projection";
import { createFormatter } from "@/format/format";
import { DEFAULT_SETTINGS, defaultsFor, toProjectionInput, type Settings } from "@/query/settings";
import type { Lang } from "@/i18n/lang";

const fmt = createFormatter({ locale: "en-US", currency: "EUR" });
const run = (overrides: Partial<Settings> = {}, lang: Lang = "en") => {
  const settings = { ...(lang === "en" ? DEFAULT_SETTINGS : defaultsFor(lang)), ...overrides };
  return summarize(project(toProjectionInput(settings)), settings, fmt);
};

describe("summarize", () => {
  test("the default report turns and repays inside the horizon", () => {
    const summary = run();
    expect(summary.verdict).toBe("repaid");
    expect(summary.sentence).toBe(
      "32 customers cover €200 of fixed costs a month. The margin turns in month 8 and the early losses are repaid in month 15.",
    );
    expect(summary.highlights).toEqual(["32 customers", "€200", "month 8", "month 15"]);
  });

  test("every highlight appears in the sentence", () => {
    for (const overrides of [{}, { months: 12 }, { growth: 0 }, { customers: 100 }, { price: 0.05 }]) {
      const summary = run(overrides);
      for (const figure of summary.highlights) expect(summary.sentence).toContain(figure);
    }
  });

  test("uses the configured nouns", () => {
    expect(run({ customer: "company" }).sentence.startsWith("32 companies cover")).toBe(true);
  });

  test("says so when the margin turns but the losses are not repaid in time", () => {
    const summary = run({ months: 12 });
    expect(summary.verdict).toBe("turning");
    expect(summary.sentence.endsWith("The margin turns in month 8, but the early losses are not repaid within 12 months.")).toBe(true);
  });

  test("says so when the margin does not turn in time", () => {
    const summary = run({ growth: 0 });
    expect(summary.verdict).toBe("loss");
    expect(summary.sentence.endsWith("The margin does not turn within 24 months.")).toBe(true);
  });

  test("says so when no number of customers is enough", () => {
    const summary = run({ price: 0.05 });
    expect(summary.verdict).toBe("never");
    expect(summary.sentence).toBe(
      "For each customer, costs exceed revenue, so no number of customers covers the fixed costs.",
    );
  });

  test("profitable from the first month", () => {
    const summary = run({ customers: 100 });
    expect(summary.verdict).toBe("repaid");
    expect(summary.sentence.endsWith("The margin is positive from month 1.")).toBe(true);
  });

  test("does not speak of a threshold without fixed costs", () => {
    expect(run({ fixed: 0 }).sentence).toBe("There are no fixed costs, so every customer adds margin. The margin is positive from month 1.");
  });

  test("speaks Dutch", () => {
    expect(run({}, "nl").sentence).toBe(
      "32 klanten dekken €200 vaste kosten per maand. De marge wordt positief in maand 8 en de aanloopverliezen zijn terugverdiend in maand 15.",
    );
    expect(run({ customer: "werkbon" }, "nl").sentence.startsWith("32 werkbonnen dekken")).toBe(true);
  });

  test("speaks French", () => {
    expect(run({ months: 12 }, "fr").sentence).toBe(
      "32 clients couvrent €200 de frais fixes par mois. La marge devient positive au mois 8, mais les pertes de départ ne sont pas remboursées en 12 mois.",
    );
  });

  test("uses an explicit plural", () => {
    expect(run({ customer: "person", customerPlural: "people" }).sentence.startsWith("32 people cover")).toBe(true);
  });
});
