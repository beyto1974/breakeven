import { describe, expect, test } from "bun:test";
import { breakEvenCustomers, contributionPerCustomer, project } from "../projection";
import type { ProjectionInput } from "../types";

const base: ProjectionInput = {
  customers: 10,
  newCustomersPerMonth: 0,
  churnPercentPerMonth: 0,
  unitsPerCustomerPerMonth: 10,
  unitPriceCents: 100,
  subscriptionCents: 0,
  vatPercent: 0,
  variableCostPerUnitCents: 20,
  fixedCostPerMonthCents: 5000,
  acquisitionCostCents: 0,
  months: 3,
};

const input = (overrides: Partial<ProjectionInput> = {}): ProjectionInput => ({ ...base, ...overrides });

describe("project", () => {
  test("produces one row per month of the horizon", () => {
    const result = project(input({ months: 12 }));
    expect(result.months).toHaveLength(12);
    expect(result.months.map((m) => m.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  test("computes a steady month from units, price and costs", () => {
    const [first] = project(input()).months;
    expect(first).toEqual({
      month: 1,
      customers: 10,
      newCustomers: 0,
      units: 100,
      revenueCents: 10000,
      variableCostCents: 2000,
      acquisitionCostCents: 0,
      fixedCostCents: 5000,
      costCents: 7000,
      marginCents: 3000,
      cumulativeMarginCents: 3000,
    });
  });

  test("removes VAT from revenue but not from costs", () => {
    const [first] = project(input({ vatPercent: 25 })).months;
    expect(first?.revenueCents).toBe(8000);
    expect(first?.variableCostCents).toBe(2000);
  });

  test("applies VAT on the month's total, not unit by unit", () => {
    // 100 units at 0.29 gross = 29.00; net at 21 % = 23.96. Per-unit flooring would give 23.00.
    const [first] = project(input({ unitPriceCents: 29, vatPercent: 21 })).months;
    expect(first?.revenueCents).toBe(2396);
  });

  test("adds the subscription fee per customer, VAT included", () => {
    const [first] = project(input({ subscriptionCents: 1210, vatPercent: 21, unitPriceCents: 0 })).months;
    // 10 customers × 12.10 gross = 121.00, net 100.00
    expect(first?.revenueCents).toBe(10000);
  });

  test("applies churn first, then adds new customers, keeping fractions between months", () => {
    const result = project(input({ customers: 10, newCustomersPerMonth: 2.4, churnPercentPerMonth: 10, months: 3 }));
    // 10 → 10×0.9+2.4 = 11.4 → 11.4×0.9+2.4 = 12.66
    expect(result.months.map((m) => m.customers)).toEqual([10, 11, 13]);
    expect(result.months.map((m) => m.units)).toEqual([100, 114, 127]);
  });

  test("charges acquisition cost for new customers from month 2 on", () => {
    const result = project(input({ newCustomersPerMonth: 2, acquisitionCostCents: 1000, months: 3 }));
    expect(result.months.map((m) => m.newCustomers)).toEqual([0, 2, 2]);
    expect(result.months.map((m) => m.acquisitionCostCents)).toEqual([0, 2000, 2000]);
    expect(result.months[1]?.costCents).toBe(result.months[1]!.variableCostCents + 2000 + 5000);
  });

  test("accumulates the margin and totals the horizon", () => {
    const result = project(input({ months: 3 }));
    expect(result.months.map((m) => m.cumulativeMarginCents)).toEqual([3000, 6000, 9000]);
    expect(result.totalRevenueCents).toBe(30000);
    expect(result.totalCostCents).toBe(21000);
    expect(result.totalMarginCents).toBe(9000);
    expect(result.marginRate).toBeCloseTo(0.3, 10);
  });

  test("margin rate is null without revenue", () => {
    expect(project(input({ unitPriceCents: 0 })).marginRate).toBeNull();
  });

  test("finds the break-even month and the payback month after it", () => {
    // Loss of 2000 in month 1, then +2000 a month from the growth: margin turns in month 2, repaid in month 3.
    const result = project(
      input({ customers: 3, newCustomersPerMonth: 5, unitsPerCustomerPerMonth: 10, unitPriceCents: 100, variableCostPerUnitCents: 0, fixedCostPerMonthCents: 5000, months: 4 }),
    );
    expect(result.months.map((m) => m.marginCents)).toEqual([-2000, 3000, 8000, 13000]);
    expect(result.breakEvenMonth).toBe(2);
    expect(result.paybackMonth).toBe(2);
  });

  test("payback waits until the cumulative margin has repaid earlier losses", () => {
    const result = project(
      input({ customers: 1, newCustomersPerMonth: 4, unitsPerCustomerPerMonth: 10, unitPriceCents: 100, variableCostPerUnitCents: 0, fixedCostPerMonthCents: 5000, months: 4 }),
    );
    // margins: -4000, 0, 4000, 8000 → cumulative -4000, -4000, 0, 8000
    expect(result.breakEvenMonth).toBe(2);
    expect(result.paybackMonth).toBe(3);
  });

  test("reports null when the margin never turns inside the horizon", () => {
    const result = project(input({ unitPriceCents: 10 }));
    expect(result.breakEvenMonth).toBeNull();
    expect(result.paybackMonth).toBeNull();
  });

  test("clamps nonsense inputs instead of producing NaN", () => {
    const result = project(
      input({ customers: -5, churnPercentPerMonth: 250, unitPriceCents: Number.NaN, months: 0 }),
    );
    expect(result.months).toHaveLength(1);
    expect(result.months[0]?.customers).toBe(0);
    expect(Number.isFinite(result.totalMarginCents)).toBe(true);
  });

  test("exposes the contribution and the break-even threshold", () => {
    const result = project(input());
    expect(result.contributionPerCustomerCents).toBe(800);
    expect(result.breakEvenCustomers).toBe(7);
  });
});

describe("contributionPerCustomer", () => {
  test("is units × (net price − variable) plus the net subscription", () => {
    expect(contributionPerCustomer(input({ subscriptionCents: 500 }))).toBe(10 * 80 + 500);
  });

  test("uses the net price when VAT is included", () => {
    expect(contributionPerCustomer(input({ vatPercent: 25 }))).toBe(10 * (80 - 20));
  });
});

describe("breakEvenCustomers", () => {
  test("rounds up: a fraction of a customer pays nothing", () => {
    expect(breakEvenCustomers(input({ fixedCostPerMonthCents: 5001 }))).toBe(7);
    expect(breakEvenCustomers(input({ fixedCostPerMonthCents: 4800 }))).toBe(6);
  });

  test("is null when a customer brings nothing over its own cost", () => {
    expect(breakEvenCustomers(input({ unitPriceCents: 20 }))).toBeNull();
  });

  test("includes acquisition cost only via the projection, not the steady-state threshold", () => {
    expect(breakEvenCustomers(input({ acquisitionCostCents: 99999 }))).toBe(7);
  });

  test("is zero when there are no fixed costs and a positive contribution", () => {
    expect(breakEvenCustomers(input({ fixedCostPerMonthCents: 0 }))).toBe(0);
  });
});
