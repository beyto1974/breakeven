/**
 * What moves the threshold: the same projection over a grid of prices and
 * volumes around the current scenario. It answers "what if the price drops a
 * tenth?" without editing fields one by one.
 */
import { breakEvenCustomers, project } from "./projection";
import type { ProjectionInput } from "./types";

/** Finer steps near the current value, where decisions are usually made. */
export const SENSITIVITY_FACTORS = [0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5] as const;

export interface SensitivityCell {
  priceFactor: number;
  unitPriceCents: number;
  breakEvenCustomers: number | null;
  breakEvenMonth: number | null;
  totalMarginCents: number;
  isCurrent: boolean;
}

export interface SensitivityRow {
  unitsFactor: number;
  unitsPerCustomer: number;
  cells: SensitivityCell[];
}

export interface SensitivityGrid {
  rows: SensitivityRow[];
}

/** Strips float noise such as 25 × 1.1 = 27.500000000000004. */
const tidy = (value: number): number => Math.round(value * 10_000) / 10_000;

export function sensitivity(input: ProjectionInput, factors: readonly number[] = SENSITIVITY_FACTORS): SensitivityGrid {
  const rows = factors.map((unitsFactor): SensitivityRow => {
    const unitsPerCustomer = tidy(input.unitsPerCustomerPerMonth * unitsFactor);
    const cells = factors.map((priceFactor): SensitivityCell => {
      const unitPriceCents = tidy(input.unitPriceCents * priceFactor);
      const scenario: ProjectionInput = { ...input, unitsPerCustomerPerMonth: unitsPerCustomer, unitPriceCents };
      const projection = project(scenario);
      return {
        priceFactor,
        unitPriceCents,
        breakEvenCustomers: breakEvenCustomers(scenario),
        breakEvenMonth: projection.breakEvenMonth,
        totalMarginCents: projection.totalMarginCents,
        isCurrent: unitsFactor === 1 && priceFactor === 1,
      };
    });
    return { unitsFactor, unitsPerCustomer, cells };
  });
  return { rows };
}
