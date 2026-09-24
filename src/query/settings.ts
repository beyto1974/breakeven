/**
 * The query string is the report's only state. This module is the contract
 * between the two: every setting, its default and its range, parsed with
 * warnings and serialised back with nothing but what differs from the default.
 */
import { toCents } from "@/domain/money";
import type { ProjectionInput } from "@/domain/types";

export interface Settings {
  customers: number;
  growth: number;
  churn: number;
  units: number;
  /** Major units, VAT included. */
  price: number;
  subscription: number;
  vat: number;
  variable: number;
  fixed: number;
  cac: number;
  months: number;
  currency: string;
  locale: string;
  customer: string;
  unit: string;
  title: string;
}

export type NumericKey = { [K in keyof Settings]: Settings[K] extends number ? K : never }[keyof Settings];
export type TextKey = Exclude<keyof Settings, NumericKey>;

export type WarningReason = "not-a-number" | "not-an-integer" | "out-of-range" | "invalid" | "too-long";

export interface SettingsWarning {
  param: keyof Settings;
  value: string;
  reason: WarningReason;
}

export interface NumericField {
  key: NumericKey;
  min: number;
  max: number;
  integer?: boolean;
  /** Money in major units: kept to four decimals. */
  money?: boolean;
}

/** In contract order: the order parameters are written to a URL. */
export const NUMERIC_FIELDS: readonly NumericField[] = [
  { key: "customers", min: 0, max: 1_000_000 },
  { key: "growth", min: 0, max: 100_000 },
  { key: "churn", min: 0, max: 100 },
  { key: "units", min: 0, max: 1_000_000 },
  { key: "price", min: 0, max: 1_000_000, money: true },
  { key: "subscription", min: 0, max: 1_000_000, money: true },
  { key: "vat", min: 0, max: 100 },
  { key: "variable", min: 0, max: 1_000_000, money: true },
  { key: "fixed", min: 0, max: 100_000_000, money: true },
  { key: "cac", min: 0, max: 1_000_000, money: true },
  { key: "months", min: 1, max: 120, integer: true },
];

const TEXT_ORDER: readonly TextKey[] = ["currency", "locale", "customer", "unit", "title"];

export const MONTH_PRESETS = [12, 24, 36, 60] as const;

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  customers: 15,
  growth: 3,
  churn: 2,
  units: 40,
  price: 0.25,
  subscription: 0,
  vat: 21,
  variable: 0.05,
  fixed: 200,
  cac: 0,
  months: 24,
  currency: "EUR",
  locale: "en-BE",
  customer: "customer",
  unit: "unit",
  title: "Rentability",
});

type TextResult = { ok: true; value: string } | { ok: false; reason: WarningReason };

const MAX_LENGTH: Record<"customer" | "unit" | "title", number> = { customer: 32, unit: 32, title: 80 };

function readCurrency(raw: string): TextResult {
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return { ok: false, reason: "invalid" };
  const known = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("currency") : null;
  if (known && !known.includes(code)) return { ok: false, reason: "invalid" };
  return { ok: true, value: code };
}

function readLocale(raw: string): TextResult {
  try {
    const [canonical] = Intl.getCanonicalLocales(raw.trim());
    return canonical ? { ok: true, value: canonical } : { ok: false, reason: "invalid" };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

function readLabel(raw: string, max: number): TextResult {
  const value = raw.trim().replace(/\s+/g, " ");
  if (value.length === 0) return { ok: false, reason: "invalid" };
  if (value.length > max) return { ok: false, reason: "too-long" };
  return { ok: true, value };
}

function readText(key: TextKey, raw: string): TextResult {
  if (key === "currency") return readCurrency(raw);
  if (key === "locale") return readLocale(raw);
  return readLabel(raw, MAX_LENGTH[key]);
}

type NumberResult = { ok: true; value: number } | { ok: false; reason: WarningReason };

export function readNumber(field: NumericField, raw: string): NumberResult {
  const text = raw.trim().replace(",", ".");
  // Plain decimals, plus exponents: String() writes tiny values such as 1e-7 that way.
  if (!/^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(text)) return { ok: false, reason: "not-a-number" };
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return { ok: false, reason: "not-a-number" };
  if (field.integer && !Number.isInteger(parsed)) return { ok: false, reason: "not-an-integer" };
  if (parsed < field.min || parsed > field.max) return { ok: false, reason: "out-of-range" };
  return { ok: true, value: field.money ? Math.round(parsed * 10_000) / 10_000 : parsed };
}

export function parseSettings(query: URLSearchParams): { settings: Settings; warnings: SettingsWarning[] } {
  const settings: Settings = { ...DEFAULT_SETTINGS };
  const warnings: SettingsWarning[] = [];

  for (const field of NUMERIC_FIELDS) {
    const raw = query.get(field.key);
    if (raw === null || raw.trim() === "") continue;
    const result = readNumber(field, raw);
    if (result.ok) settings[field.key] = result.value;
    else warnings.push({ param: field.key, value: raw, reason: result.reason });
  }

  for (const key of TEXT_ORDER) {
    const raw = query.get(key);
    if (raw === null || raw.trim() === "") continue;
    const result = readText(key, raw);
    if (result.ok) settings[key] = result.value;
    else warnings.push({ param: key, value: raw, reason: result.reason });
  }

  return { settings, warnings };
}

/** Only what differs from the defaults, so the default report is a bare path. */
export function serializeSettings(settings: Settings): string {
  const query = new URLSearchParams();
  for (const { key } of NUMERIC_FIELDS) {
    if (settings[key] !== DEFAULT_SETTINGS[key]) query.set(key, String(settings[key]));
  }
  for (const key of TEXT_ORDER) {
    if (settings[key] !== DEFAULT_SETTINGS[key]) query.set(key, settings[key]);
  }
  return query.toString();
}

export function toProjectionInput(settings: Settings): ProjectionInput {
  return {
    customers: settings.customers,
    newCustomersPerMonth: settings.growth,
    churnPercentPerMonth: settings.churn,
    unitsPerCustomerPerMonth: settings.units,
    unitPriceCents: toCents(settings.price),
    subscriptionCents: toCents(settings.subscription),
    vatPercent: settings.vat,
    variableCostPerUnitCents: toCents(settings.variable),
    fixedCostPerMonthCents: toCents(settings.fixed),
    acquisitionCostCents: toCents(settings.cac),
    months: settings.months,
  };
}
