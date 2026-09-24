/**
 * A business month by month: so many customers, buying so many units, against
 * costs that arrive whether anyone buys or not.
 *
 * The growth model is deliberately plain — so many new customers a month,
 * minus churn. A projection built on guesses does not get more honest by being
 * harder to follow.
 */
import { netOf } from "./money";
import type { Projection, ProjectionInput, ProjectionMonth } from "./types";

const positive = (value: number): number => (Number.isFinite(value) && value > 0 ? value : 0);
const fraction = (percent: number): number =>
  Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) / 100 : 0;
const vatFactor = (percent: number): number => 1 + (Number.isFinite(percent) && percent > 0 ? percent : 0) / 100;

/** What one customer contributes each month once its own units are paid for. */
export function contributionPerCustomer(input: ProjectionInput): number {
  const factor = vatFactor(input.vatPercent);
  const perUnit = positive(input.unitPriceCents) / factor - positive(input.variableCostPerUnitCents);
  return Math.round(positive(input.unitsPerCustomerPerMonth) * perUnit + positive(input.subscriptionCents) / factor);
}

/**
 * Customers needed to cover the fixed costs in a steady month, rounded up.
 * Acquisition cost is a one-off and does not move the steady-state threshold.
 */
export function breakEvenCustomers(input: ProjectionInput): number | null {
  const perCustomer = contributionPerCustomer(input);
  if (perCustomer <= 0) return null;
  return Math.ceil(Math.round(positive(input.fixedCostPerMonthCents)) / perCustomer);
}

export function project(input: ProjectionInput): Projection {
  const horizon = Math.max(1, Math.round(positive(input.months)));
  const growth = positive(input.newCustomersPerMonth);
  const churn = fraction(input.churnPercentPerMonth);
  const unitsPerCustomer = positive(input.unitsPerCustomerPerMonth);
  const price = positive(input.unitPriceCents);
  const subscription = positive(input.subscriptionCents);
  const variable = positive(input.variableCostPerUnitCents);
  const fixed = Math.round(positive(input.fixedCostPerMonthCents));
  const acquisition = positive(input.acquisitionCostCents);

  const months: ProjectionMonth[] = [];
  // Kept fractional between months: rounding every month turns 2.4 new
  // customers into 2 and loses a sixth of the growth.
  let customers = positive(input.customers);
  let cumulativeMarginCents = 0;
  let breakEvenMonth: number | null = null;
  let paybackMonth: number | null = null;

  for (let index = 0; index < horizon; index += 1) {
    const month = index + 1;
    const shownCustomers = Math.round(customers);
    const newCustomers = month === 1 ? 0 : growth;
    const units = Math.round(customers * unitsPerCustomer);
    // VAT is settled on the month's takings, not unit by unit.
    const revenueCents = netOf(units * price + shownCustomers * subscription, input.vatPercent);
    const variableCostCents = Math.round(units * variable);
    const acquisitionCostCents = Math.round(newCustomers * acquisition);
    const costCents = variableCostCents + acquisitionCostCents + fixed;
    const marginCents = revenueCents - costCents;
    cumulativeMarginCents += marginCents;

    if (breakEvenMonth === null && marginCents >= 0) breakEvenMonth = month;
    // Only once the margin has turned: a projection that never spends is
    // "repaid" in month one, which says nothing.
    if (paybackMonth === null && breakEvenMonth !== null && cumulativeMarginCents >= 0) paybackMonth = month;

    months.push({
      month,
      customers: shownCustomers,
      newCustomers: Math.round(newCustomers * 100) / 100,
      units,
      revenueCents,
      variableCostCents,
      acquisitionCostCents,
      fixedCostCents: fixed,
      costCents,
      marginCents,
      cumulativeMarginCents,
    });

    // Churn first, then the new ones: a customer won this month cannot leave
    // in the same month.
    customers = customers * (1 - churn) + growth;
  }

  const totalRevenueCents = months.reduce((sum, m) => sum + m.revenueCents, 0);
  const totalCostCents = months.reduce((sum, m) => sum + m.costCents, 0);
  const totalMarginCents = totalRevenueCents - totalCostCents;

  return {
    months,
    totalRevenueCents,
    totalCostCents,
    totalMarginCents,
    marginRate: totalRevenueCents > 0 ? totalMarginCents / totalRevenueCents : null,
    breakEvenMonth,
    paybackMonth,
    contributionPerCustomerCents: contributionPerCustomer(input),
    breakEvenCustomers: breakEvenCustomers(input),
  };
}
