/**
 * Money helpers. Prices are VAT-inclusive: what the customer pays is the
 * figure entered, and the VAT is taken back out of it.
 */

/** Guards against float noise such as 24.2 / 1.21 = 19.999999999999996. */
const EPSILON = 1e-9;

const usableRate = (percent: number): number =>
  Number.isFinite(percent) && percent > 0 ? percent : 0;

/**
 * The net inside a VAT-inclusive amount, rounded down to the cent. Rounding
 * down understates revenue by at most a cent rather than the VAT owed.
 */
export function netOf(grossCents: number, vatPercent: number): number {
  const rate = usableRate(vatPercent);
  return Math.floor(grossCents / (1 + rate / 100) + EPSILON);
}

/** Major units (for example euros) to cents, keeping four decimals of the major unit. */
export function toCents(major: number): number {
  return Math.round(major * 10_000) / 100;
}

/** Cents to major units, the inverse of `toCents`. */
export function fromCents(cents: number): number {
  return Math.round(cents * 100) / 10_000;
}
