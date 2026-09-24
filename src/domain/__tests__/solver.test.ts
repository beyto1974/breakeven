import { describe, expect, test } from "bun:test";
import { project } from "../projection";
import { goalMet, solve, type Goal } from "../solver";
import type { ProjectionInput } from "../types";

const base: ProjectionInput = {
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
};

describe("goalMet", () => {
  const p = project(base); // break-even M8, payback M15, margin 150 522
  test("break-even by a month", () => {
    expect(goalMet(p, { kind: "breakEven", month: 8 })).toBe(true);
    expect(goalMet(p, { kind: "breakEven", month: 7 })).toBe(false);
  });

  test("payback by a month", () => {
    expect(goalMet(p, { kind: "payback", month: 15 })).toBe(true);
    expect(goalMet(p, { kind: "payback", month: 14 })).toBe(false);
  });

  test("total margin over the horizon", () => {
    expect(goalMet(p, { kind: "margin", cents: 150522 })).toBe(true);
    expect(goalMet(p, { kind: "margin", cents: 150523 })).toBe(false);
  });
});

describe("solve", () => {
  const goal: Goal = { kind: "breakEven", month: 6 };

  test("finds the lowest price that meets the goal, to the step", () => {
    const result = solve(base, goal, { key: "unitPriceCents", direction: "raise", min: 0, max: 100_000_000, step: 0.01 });
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    expect(goalMet(project({ ...base, unitPriceCents: result.value }), goal)).toBe(true);
    expect(goalMet(project({ ...base, unitPriceCents: result.value - 0.01 }), goal)).toBe(false);
    expect(result.value).toBeGreaterThan(25);
  });

  test("finds the highest fixed cost that still meets the goal", () => {
    const result = solve(base, goal, { key: "fixedCostPerMonthCents", direction: "lower", min: 0, max: 10_000_000_000, step: 1 });
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    expect(goalMet(project({ ...base, fixedCostPerMonthCents: result.value }), goal)).toBe(true);
    expect(goalMet(project({ ...base, fixedCostPerMonthCents: result.value + 1 }), goal)).toBe(false);
    expect(result.value).toBeLessThan(20000);
  });

  test("finds the highest churn that still meets a payback goal", () => {
    const payback: Goal = { kind: "payback", month: 18 };
    const result = solve(base, payback, { key: "churnPercentPerMonth", direction: "lower", min: 0, max: 100, step: 0.1 });
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    expect(result.value).toBeGreaterThan(2);
    expect(goalMet(project({ ...base, churnPercentPerMonth: result.value }), payback)).toBe(true);
    expect(goalMet(project({ ...base, churnPercentPerMonth: result.value + 0.1 }), payback)).toBe(false);
  });

  test("says when the current value already has room", () => {
    const easy: Goal = { kind: "breakEven", month: 20 };
    const result = solve(base, easy, { key: "unitPriceCents", direction: "raise", min: 0, max: 100_000_000, step: 0.01 });
    // The goal is met today; the answer is the lowest price that still meets it.
    expect(result.status).toBe("solved");
    if (result.status === "solved") {
      expect(result.alreadyMet).toBe(true);
      expect(result.value).toBeLessThan(25);
    }
  });

  test("reports an unreachable goal", () => {
    // Break-even in month 1 with no customers at all cannot be bought with growth.
    const result = solve({ ...base, customers: 0 }, { kind: "breakEven", month: 1 }, { key: "newCustomersPerMonth", direction: "raise", min: 0, max: 100_000, step: 0.1 });
    expect(result).toEqual({ status: "unreachable" });
  });

  test("a goal met even at the most favourable-free bound is met everywhere", () => {
    const result = solve({ ...base, fixedCostPerMonthCents: 0 }, { kind: "breakEven", month: 1 }, { key: "acquisitionCostCents", direction: "lower", min: 0, max: 100_000_000, step: 1 });
    expect(result.status).toBe("solved");
    if (result.status === "solved") expect(result.value).toBe(100_000_000);
  });

  test("respects integer steps", () => {
    const result = solve(base, goal, { key: "customers", direction: "raise", min: 0, max: 1_000_000, step: 1 });
    expect(result.status).toBe("solved");
    if (result.status === "solved") expect(Number.isInteger(result.value)).toBe(true);
  });
});
