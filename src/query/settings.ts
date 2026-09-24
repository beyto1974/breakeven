/**
 * The query string is the report's only state. This module is the contract
 * between the two: every setting, its default and its range, parsed with
 * warnings and serialised back with nothing but what differs from the default.
 */
import { toCents } from "@/domain/money";
import type { ProjectionInput } from "@/domain/types";
import { isLang, type Lang } from "@/i18n/lang";

export interface Settings {
  lang: Lang;
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
  /** Explicit plurals for irregular nouns; empty means the language's rules. */
  customerPlural: string;
  unitPlural: string;
  title: string;
  /** Target solver: which goal, if any. Empty means the solver is closed. */
  goal: GoalKind | "";
  /** Month for a break-even or payback goal. */
  goalMonth: number;
  /** Total margin for a margin goal, major units. */
  goalMargin: number;
  /** The assumption the solver moves. */
  solve: SolvableKey;
}

export const GOAL_KINDS = ["breakeven", "payback", "margin"] as const;
export type GoalKind = (typeof GOAL_KINDS)[number];

/** Assumptions the solver can move. VAT and the horizon are facts, not levers. */
export const SOLVABLE_KEYS = ["price", "units", "subscription", "customers", "growth", "churn", "variable", "fixed", "cac"] as const;
export type SolvableKey = (typeof SOLVABLE_KEYS)[number];

/** Only meaningful while a goal is set; never written without one. */
const GOAL_FIELDS = new Set<keyof Settings>(["goalMonth", "goalMargin", "solve"]);

export type NumericKey = { [K in keyof Settings]: Settings[K] extends number ? K : never }[keyof Settings];
export type TextKey = Exclude<keyof Settings, NumericKey | "lang" | "goal" | "solve">;

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
  { key: "goalMonth", min: 1, max: 120, integer: true },
  { key: "goalMargin", min: -1_000_000_000, max: 1_000_000_000, money: true },
];

const TEXT_ORDER: readonly TextKey[] = ["currency", "locale", "customer", "customerPlural", "unit", "unitPlural", "title"];

export const MONTH_PRESETS = [12, 24, 36, 60] as const;

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  lang: "en",
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
  locale: "en-IE",
  customer: "customer",
  unit: "unit",
  customerPlural: "",
  unitPlural: "",
  title: "Rentability",
  goal: "",
  goalMonth: 12,
  goalMargin: 10_000,
  solve: "price",
});

/** What follows the language: formatting, nouns and heading. */
const LANGUAGE_DEFAULTS: Record<Lang, Pick<Settings, "locale" | "customer" | "unit" | "title">> = {
  en: { locale: "en-IE", customer: "customer", unit: "unit", title: "Rentability" },
  nl: { locale: "nl-BE", customer: "klant", unit: "eenheid", title: "Rentabiliteit" },
  fr: { locale: "fr-BE", customer: "client", unit: "unité", title: "Rentabilité" },
};

/** The defaults a report in `lang` starts from. Only the language-bound fields differ. */
export function defaultsFor(lang: Lang): Readonly<Settings> {
  return { ...DEFAULT_SETTINGS, lang, ...LANGUAGE_DEFAULTS[lang] };
}

/**
 * Switches language, carrying custom values across: a field still at the old
 * language's default takes the new one; anything the user typed stays.
 */
export function switchLang(settings: Settings, lang: Lang): Settings {
  const before = defaultsFor(settings.lang);
  const after = defaultsFor(lang);
  const next: Settings = { ...settings, lang };
  for (const key of ["locale", "customer", "unit", "title"] as const) {
    if (settings[key] === before[key]) next[key] = after[key];
  }
  // Plurals belong to the old nouns; keep them only if the nouns were kept.
  if (next.customer !== settings.customer) next.customerPlural = "";
  if (next.unit !== settings.unit) next.unitPlural = "";
  return next;
}

type TextResult = { ok: true; value: string } | { ok: false; reason: WarningReason };

const MAX_LENGTH: Record<"customer" | "unit" | "customerPlural" | "unitPlural" | "title", number> = {
  customer: 32,
  unit: 32,
  customerPlural: 32,
  unitPlural: 32,
  title: 80,
};

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

/**
 * @param fallbackLang the language when the query names none, e.g. the browser's.
 */
function readChoice<T extends string>(query: URLSearchParams, key: "goal" | "solve", choices: readonly T[], warnings: SettingsWarning[]): T | null {
  const raw = query.get(key);
  if (raw === null || raw.trim() === "") return null;
  const value = raw.trim().toLowerCase();
  const match = choices.find((choice) => choice.toLowerCase() === value);
  if (!match) warnings.push({ param: key, value: raw, reason: "invalid" });
  return match ?? null;
}

export function parseSettings(
  query: URLSearchParams,
  fallbackLang: Lang = "en",
): { settings: Settings; warnings: SettingsWarning[] } {
  const warnings: SettingsWarning[] = [];
  const rawLang = query.get("lang");
  let lang = fallbackLang;
  if (rawLang !== null && rawLang.trim() !== "") {
    const code = rawLang.trim().toLowerCase();
    if (isLang(code)) lang = code;
    else warnings.push({ param: "lang", value: rawLang, reason: "invalid" });
  }
  const settings: Settings = { ...defaultsFor(lang) };

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

  const goal = readChoice(query, "goal", GOAL_KINDS, warnings);
  if (goal) settings.goal = goal;
  const solve = readChoice(query, "solve", SOLVABLE_KEYS, warnings);
  if (solve) settings.solve = solve;

  return { settings, warnings };
}

/** Only what differs from the defaults, so the default report is a bare path. */
export function serializeSettings(settings: Settings): string {
  const query = new URLSearchParams();
  const defaults = defaultsFor(settings.lang);
  if (settings.lang !== DEFAULT_SETTINGS.lang) query.set("lang", settings.lang);
  for (const { key } of NUMERIC_FIELDS) {
    if (settings[key] !== defaults[key] && !GOAL_FIELDS.has(key)) query.set(key, String(settings[key]));
  }
  for (const key of TEXT_ORDER) {
    if (settings[key] !== defaults[key]) query.set(key, settings[key]);
  }
  // The goal block goes last and together, and only when a goal is set.
  if (settings.goal !== "") {
    query.set("goal", settings.goal);
    if (settings.goal === "margin") {
      if (settings.goalMargin !== defaults.goalMargin) query.set("goalMargin", String(settings.goalMargin));
    } else if (settings.goalMonth !== defaults.goalMonth) {
      query.set("goalMonth", String(settings.goalMonth));
    }
    if (settings.solve !== defaults.solve) query.set("solve", settings.solve);
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
