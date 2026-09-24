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
  /** The figures inside the sentence, in order, for the UI to emphasise. */
  highlights: string[];
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
  const highlights: string[] = [];
  const mark = (figure: string): string => {
    highlights.push(figure);
    return figure;
  };
  const done = (verdict: Verdict, sentence: string): Summary => ({ verdict, sentence, highlights });

  if (breakEvenCustomers === null) {
    return done(
      "never",
      `Each ${settings.customer} costs more than it brings in, so no number of ${plural(settings.customer)} covers the fixed costs.`,
    );
  }

  const fixedCents = projection.months[0]?.fixedCostCents ?? 0;
  const threshold =
    fixedCents === 0
      ? `There are no fixed costs, so every ${settings.customer} adds margin.`
      : `${mark(`${fmt.integer(breakEvenCustomers)} ${plural(settings.customer, breakEvenCustomers)}`)} ${breakEvenCustomers === 1 ? "covers" : "cover"} ${mark(fmt.moneyShort(fixedCents))} of fixed costs a month.`;
  const horizon = () => mark(`${settings.months} ${plural("month", settings.months)}`);

  if (breakEvenMonth === null) return done("loss", `${threshold} The margin does not turn within ${horizon()}.`);
  if (breakEvenMonth === 1 && paybackMonth === 1) return done("repaid", `${threshold} The margin is positive from ${mark("month 1")}.`);
  const turns = `The margin turns in ${mark(`month ${breakEvenMonth}`)}`;
  if (paybackMonth === null) return done("turning", `${threshold} ${turns}, but the early losses are not repaid within ${horizon()}.`);
  return done("repaid", `${threshold} ${turns} and the early losses are repaid in ${mark(`month ${paybackMonth}`)}.`);
}
