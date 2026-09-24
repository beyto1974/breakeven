/**
 * Number formatting for the report, bound once to a locale and a currency.
 * Amounts arrive in cents.
 */
export interface Formatter {
  /** Whole currency units, for headline figures. */
  moneyShort(cents: number): string;
  /** Two decimals, for tables. */
  money(cents: number): string;
  /** Up to four decimals, for per-unit prices that may be below a cent. */
  unitPrice(cents: number): string;
  integer(value: number): string;
  /** A ratio (0.18 → 18 %), or a dash when there is none. */
  percent(ratio: number | null): string;
  currencySymbol: string;
}

function currencyFormat(locale: string, currency: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, ...options });
  } catch {
    return new Intl.NumberFormat("en", { style: "currency", currency: "EUR", ...options });
  }
}

export function createFormatter({ locale, currency }: { locale: string; currency: string }): Formatter {
  const short = currencyFormat(locale, currency, { maximumFractionDigits: 0, minimumFractionDigits: 0 });
  const full = currencyFormat(locale, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const unit = currencyFormat(locale, currency, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  let integer: Intl.NumberFormat;
  let percent: Intl.NumberFormat;
  try {
    integer = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  } catch {
    integer = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
    percent = new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 1 });
  }
  const symbol = full.formatToParts(0).find((part) => part.type === "currency")?.value ?? currency;

  return {
    moneyShort: (cents) => short.format(Math.round(cents) / 100),
    money: (cents) => full.format(Math.round(cents) / 100),
    unitPrice: (cents) => unit.format(cents / 100),
    integer: (value) => integer.format(value),
    percent: (ratio) => (ratio === null ? "—" : percent.format(ratio)),
    currencySymbol: symbol,
  };
}
