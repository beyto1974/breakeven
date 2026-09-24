/**
 * The target solver in the report's own terms: settings in, an answer in the
 * same units the user types (major currency units, percentages, counts).
 */
import { fromCents, toCents } from "@/domain/money";
import { solve, type Goal, type NumericInputKey, type Variable } from "@/domain/solver";
import { NUMERIC_FIELDS, toProjectionInput, type Settings, type SolvableKey } from "@/query/settings";

interface Lever {
  input: NumericInputKey;
  direction: Variable["direction"];
  /** Step in input units (cents for money). */
  step: number;
  money: boolean;
}

const LEVERS: Record<SolvableKey, Lever> = {
  price: { input: "unitPriceCents", direction: "raise", step: 0.01, money: true },
  units: { input: "unitsPerCustomerPerMonth", direction: "raise", step: 0.1, money: false },
  subscription: { input: "subscriptionCents", direction: "raise", step: 1, money: true },
  customers: { input: "customers", direction: "raise", step: 1, money: false },
  growth: { input: "newCustomersPerMonth", direction: "raise", step: 0.1, money: false },
  churn: { input: "churnPercentPerMonth", direction: "lower", step: 0.1, money: false },
  variable: { input: "variableCostPerUnitCents", direction: "lower", step: 0.01, money: true },
  fixed: { input: "fixedCostPerMonthCents", direction: "lower", step: 100, money: true },
  cac: { input: "acquisitionCostCents", direction: "lower", step: 100, money: true },
};

export type TargetResult =
  | {
      status: "solved";
      key: SolvableKey;
      direction: Variable["direction"];
      /** What the assumption must be (at least for `raise`, at most for `lower`). */
      value: number;
      current: number;
      alreadyMet: boolean;
    }
  | { status: "unreachable"; key: SolvableKey };

export function toGoal(settings: Settings): Goal | null {
  switch (settings.goal) {
    case "breakeven":
      return { kind: "breakEven", month: settings.goalMonth };
    case "payback":
      return { kind: "payback", month: settings.goalMonth };
    case "margin":
      return { kind: "margin", cents: Math.round(toCents(settings.goalMargin)) };
    default:
      return null;
  }
}

export function solveTarget(settings: Settings): TargetResult | null {
  const goal = toGoal(settings);
  if (!goal) return null;
  const key = settings.solve;
  const lever = LEVERS[key];
  const field = NUMERIC_FIELDS.find((f) => f.key === key)!;
  const scale = lever.money ? 100 : 1;
  const solution = solve(toProjectionInput(settings), goal, {
    key: lever.input,
    direction: lever.direction,
    min: field.min * scale,
    max: field.max * scale,
    step: lever.step,
  });
  if (solution.status === "unreachable") return { status: "unreachable", key };
  return {
    status: "solved",
    key,
    direction: lever.direction,
    value: lever.money ? fromCents(solution.value) : solution.value,
    current: settings[key],
    alreadyMet: solution.alreadyMet,
  };
}
