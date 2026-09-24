import { describe, expect, test } from "bun:test";
import { SENSITIVITY_FACTORS, sensitivity } from "../sensitivity";
import { breakEvenCustomers, project } from "../projection";
import type { ProjectionInput } from "../types";

const input: ProjectionInput = {
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

describe("sensitivity", () => {
  test("uses seven factors from half to one and a half, centred on the current value", () => {
    expect(SENSITIVITY_FACTORS).toEqual([0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5]);
  });

  test("builds a units × price grid", () => {
    const grid = sensitivity(input);
    expect(grid.rows).toHaveLength(7);
    for (const row of grid.rows) expect(row.cells).toHaveLength(7);
    expect(grid.rows.map((r) => r.unitsPerCustomer)).toEqual([20, 30, 36, 40, 44, 50, 60]);
    expect(grid.rows[0]?.cells.map((c) => c.unitPriceCents)).toEqual([12.5, 18.75, 22.5, 25, 27.5, 31.25, 37.5]);
  });

  test("the centre cell is the current scenario", () => {
    const grid = sensitivity(input);
    const centre = grid.rows[3]?.cells[3];
    expect(centre?.isCurrent).toBe(true);
    expect(centre?.breakEvenCustomers).toBe(breakEvenCustomers(input));
    expect(centre?.breakEvenMonth).toBe(project(input).breakEvenMonth);
    expect(centre?.totalMarginCents).toBe(project(input).totalMarginCents);
    expect(grid.rows.flatMap((r) => r.cells).filter((c) => c.isCurrent)).toHaveLength(1);
  });

  test("a cell whose price does not cover the unit cost can never break even", () => {
    const grid = sensitivity({ ...input, unitPriceCents: 10 });
    // Half of 10 cents is 5 gross, 4.13 net: below the 5-cent unit cost.
    expect(grid.rows[3]?.cells[0]?.breakEvenCustomers).toBeNull();
    expect(grid.rows[3]?.cells[0]?.breakEvenMonth).toBeNull();
  });

  test("higher price and volume never need more customers", () => {
    const grid = sensitivity(input);
    for (const row of grid.rows) {
      const values = row.cells.map((c) => c.breakEvenCustomers ?? Number.POSITIVE_INFINITY);
      for (let i = 1; i < values.length; i += 1) expect(values[i]!).toBeLessThanOrEqual(values[i - 1]!);
    }
  });

  test("accepts custom factors", () => {
    const grid = sensitivity(input, [1, 2]);
    expect(grid.rows.map((r) => r.unitsPerCustomer)).toEqual([40, 80]);
    expect(grid.rows[1]?.cells[1]?.unitPriceCents).toBe(50);
  });
});
