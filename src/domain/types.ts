/**
 * The assumptions a projection runs on.
 *
 * Amounts are in cents. Per-unit rates may carry a fraction of a cent (usage
 * pricing is often below one cent a unit); every monthly amount the projection
 * produces is rounded to whole cents.
 */
export interface ProjectionInput {
  /** Paying customers in month 1. */
  customers: number;
  /** Customers won each month from month 2 on. May be fractional. */
  newCustomersPerMonth: number;
  /** Share of customers lost each month, as a percentage. */
  churnPercentPerMonth: number;
  unitsPerCustomerPerMonth: number;
  /** Price of one unit, VAT included. */
  unitPriceCents: number;
  /** Flat fee per customer per month, VAT included. */
  subscriptionCents: number;
  /** VAT included in both prices, as a percentage. */
  vatPercent: number;
  variableCostPerUnitCents: number;
  /** Owed every month, whether or not anyone buys anything. */
  fixedCostPerMonthCents: number;
  /** One-off cost of winning one new customer. */
  acquisitionCostCents: number;
  /** Horizon in months. */
  months: number;
}

export interface ProjectionMonth {
  /** 1-based. */
  month: number;
  /** Rounded for display; the projection keeps the fraction internally. */
  customers: number;
  newCustomers: number;
  units: number;
  /** Net of VAT. */
  revenueCents: number;
  variableCostCents: number;
  acquisitionCostCents: number;
  fixedCostCents: number;
  /** Variable + acquisition + fixed. */
  costCents: number;
  marginCents: number;
  cumulativeMarginCents: number;
}

export interface Projection {
  months: ProjectionMonth[];
  totalRevenueCents: number;
  totalCostCents: number;
  totalMarginCents: number;
  /** Total margin over total revenue, or null without revenue. */
  marginRate: number | null;
  /** First month whose own margin is not negative. */
  breakEvenMonth: number | null;
  /** First month, from break-even on, whose cumulative margin is not negative. */
  paybackMonth: number | null;
  /** What one customer brings in a month after its own units are paid for. */
  contributionPerCustomerCents: number;
  /** Customers needed to cover the fixed costs, or null when no number is enough. */
  breakEvenCustomers: number | null;
}
