/**
 * The report's answer in one or two sentences, and a verdict the UI can colour.
 */
import type { Projection } from "@/domain/types";
import type { Formatter } from "@/format/format";
import { messages } from "@/i18n/messages";
import { nouns } from "@/i18n/nouns";
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

export function summarize(projection: Projection, settings: Settings, fmt: Formatter): Summary {
  const t = messages(settings.lang).summary;
  const noun = nouns(settings);
  const { breakEvenCustomers, breakEvenMonth, paybackMonth } = projection;
  const highlights: string[] = [];
  const mark = (figure: string): string => {
    highlights.push(figure);
    return figure;
  };
  const done = (verdict: Verdict, sentence: string): Summary => ({ verdict, sentence, highlights });

  if (breakEvenCustomers === null) return done("never", t.never(noun.customer(1), noun.customer()));

  const fixedCents = projection.months[0]?.fixedCostCents ?? 0;
  const threshold =
    fixedCents === 0
      ? t.noFixed(noun.customer(1))
      : t.threshold(
          mark(`${fmt.integer(breakEvenCustomers)} ${noun.customer(breakEvenCustomers)}`),
          mark(fmt.moneyShort(fixedCents)),
          breakEvenCustomers === 1,
        );
  const horizon = () => mark(t.months(settings.months));

  if (breakEvenMonth === null) return done("loss", `${threshold} ${t.noTurn(horizon())}`);
  if (breakEvenMonth === 1 && paybackMonth === 1) return done("repaid", `${threshold} ${t.positiveFrom(mark(t.month(1)))}`);
  const turn = mark(t.month(breakEvenMonth));
  if (paybackMonth === null) return done("turning", `${threshold} ${t.turnsNotRepaid(turn, horizon())}`);
  return done("repaid", `${threshold} ${t.turnsRepaid(turn, mark(t.month(paybackMonth)))}`);
}
