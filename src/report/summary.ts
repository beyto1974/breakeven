/**
 * The report's answer in one or two sentences, and a verdict the UI can colour.
 */
import type { Projection } from "@/domain/types";
import type { Formatter } from "@/format/format";
import type { Settings } from "@/query/settings";

/**
 * - `repaid`: margin turns and early losses are repaid inside the horizon
 * - `turning`: margin turns, losses are not yet repaid
 * - `loss`: margin does not turn inside the horizon
 * - `never`: no number of customers covers the fixed costs
 */
export type Verdict = "repaid" | "turning" | "loss" | "never";

export interface Summary {
  verdict: Verdict;
  sentence: string;
}

/** English plural of the last word of a label; the singular for exactly one. */
export function plural(noun: string, count = 2): string {
  if (count === 1) return noun;
  if (/[^aeiou]y$/i.test(noun)) return noun.slice(0, -1) + "ies";
  if (/(s|x|z|ch|sh)$/i.test(noun)) return noun + "es";
  return noun + "s";
}

export function summarize(projection: Projection, settings: Settings, fmt: Formatter): Summary {
  const { breakEvenCustomers, breakEvenMonth, paybackMonth } = projection;
  const customers = plural(settings.customer);

  if (breakEvenCustomers === null) {
    return {
      verdict: "never",
      sentence: `Each ${settings.customer} costs more than it brings in, so no number of ${customers} covers the fixed costs.`,
    };
  }

  const fixedCents = projection.months[0]?.fixedCostCents ?? 0;
  const threshold =
    fixedCents === 0
      ? `There are no fixed costs, so every ${settings.customer} adds margin.`
      : `${fmt.integer(breakEvenCustomers)} ${plural(settings.customer, breakEvenCustomers)} ${breakEvenCustomers === 1 ? "covers" : "cover"} ${fmt.moneyShort(fixedCents)} of fixed costs a month.`;
  const horizon = `${settings.months} ${plural("month", settings.months)}`;

  if (breakEvenMonth === null) {
    return { verdict: "loss", sentence: `${threshold} The margin does not turn within ${horizon}.` };
  }
  if (breakEvenMonth === 1 && paybackMonth === 1) {
    return { verdict: "repaid", sentence: `${threshold} The margin is positive from month 1.` };
  }
  if (paybackMonth === null) {
    return {
      verdict: "turning",
      sentence: `${threshold} The margin turns in month ${breakEvenMonth}, but the early losses are not repaid within ${horizon}.`,
    };
  }
  return {
    verdict: "repaid",
    sentence: `${threshold} The margin turns in month ${breakEvenMonth} and the early losses are repaid in month ${paybackMonth}.`,
  };
}
