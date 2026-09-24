import { describe, expect, test } from "bun:test";
import { plural, summarize } from "../summary";
import { project } from "@/domain/projection";
import { createFormatter } from "@/format/format";
import { DEFAULT_SETTINGS, toProjectionInput, type Settings } from "@/query/settings";

const fmt = createFormatter({ locale: "en-US", currency: "EUR" });
const run = (overrides: Partial<Settings> = {}) => {
  const settings = { ...DEFAULT_SETTINGS, ...overrides };
  return summarize(project(toProjectionInput(settings)), settings, fmt);
};

describe("plural", () => {
  test("follows the common English rules", () => {
    expect(plural("customer")).toBe("customers");
    expect(plural("company")).toBe("companies");
    expect(plural("day")).toBe("days");
    expect(plural("box")).toBe("boxes");
    expect(plural("match")).toBe("matches");
    expect(plural("work order")).toBe("work orders");
  });

  test("uses the singular for exactly one", () => {
    expect(plural("company", 1)).toBe("company");
    expect(plural("company", 2)).toBe("companies");
  });
});

describe("summarize", () => {
  test("the default report turns and repays inside the horizon", () => {
    const summary = run();
    expect(summary.verdict).toBe("repaid");
    expect(summary.sentence).toBe(
      "32 customers cover €200 of fixed costs a month. The margin turns in month 8 and the early losses are repaid in month 15.",
    );
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
      "Each customer costs more than it brings in, so no number of customers covers the fixed costs.",
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
});
