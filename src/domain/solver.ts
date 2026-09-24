/**
 * The report run backwards: pick a goal, pick one assumption, and find the
 * value of that assumption at which the goal is only just met.
 *
 * Every assumption moves every monthly margin in one direction (a higher
 * price never lowers one, a higher fixed cost never raises one), so each goal
 * is monotonic in each variable and a bisection finds the boundary.
 */
import { project } from "./projection";
import type { Projection, ProjectionInput } from "./types";

export type Goal =
  /** Margin not negative by this month. */
  | { kind: "breakEven"; month: number }
  /** Early losses repaid by this month. */
  | { kind: "payback"; month: number }
  /** Total margin over the horizon at least this much. */
  | { kind: "margin"; cents: number };

export type NumericInputKey = Exclude<keyof ProjectionInput, "months">;

export interface Variable {
  key: NumericInputKey;
  /** `raise`: more is better (price, growth); `lower`: less is better (costs, churn). */
  direction: "raise" | "lower";
  min: number;
  max: number;
  /** The answer is a multiple of this step. */
  step: number;
}

export type Solution =
  | {
      status: "solved";
      /** The least favourable value that still meets the goal. */
      value: number;
      /** True when the current value already meets it. */
      alreadyMet: boolean;
    }
  | { status: "unreachable" };

export function goalMet(projection: Projection, goal: Goal): boolean {
  switch (goal.kind) {
    case "breakEven":
      return projection.breakEvenMonth !== null && projection.breakEvenMonth <= goal.month;
    case "payback":
      return projection.paybackMonth !== null && projection.paybackMonth <= goal.month;
    case "margin":
      return projection.totalMarginCents >= goal.cents;
  }
}

/** Removes float noise from step multiples, e.g. 31 × 0.01 = 0.31000000000000005. */
const snap = (value: number, step: number): number => Number((Math.round(value / step) * step).toPrecision(12));

export function solve(input: ProjectionInput, goal: Goal, variable: Variable): Solution {
  const meets = (value: number) => goalMet(project({ ...input, [variable.key]: value }), goal);
  const alreadyMet = meets(input[variable.key]);

  // Work in whole steps, oriented so that a higher index is always more favourable.
  const lowIndex = Math.ceil(variable.min / variable.step - 1e-9);
  const highIndex = Math.floor(variable.max / variable.step + 1e-9);
  const valueAt = (index: number) =>
    snap((variable.direction === "raise" ? index : highIndex - (index - lowIndex)) * variable.step, variable.step);

  if (!meets(valueAt(highIndex))) return { status: "unreachable" };
  if (meets(valueAt(lowIndex))) return { status: "solved", value: valueAt(lowIndex), alreadyMet };

  // Invariant: valueAt(lo) fails, valueAt(hi) meets.
  let lo = lowIndex;
  let hi = highIndex;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (meets(valueAt(mid))) hi = mid;
    else lo = mid;
  }
  return { status: "solved", value: valueAt(hi), alreadyMet };
}
