/**
 * A machine-readable description of the query contract in settings.ts, for
 * tools (LLMs included) that need to build a report URL without reading the
 * source. Generated into public/params.json and public/llms.txt at build
 * time (scripts/build-llms.ts) so it can never drift from the real contract.
 */
import { LANGS, type Lang } from "@/i18n/lang";
import {
  DEFAULT_SETTINGS,
  GOAL_KINDS,
  LANGUAGE_DEFAULTS,
  MAX_LENGTH,
  NUMERIC_FIELDS,
  SOLVABLE_KEYS,
  TEXT_ORDER,
  type NumericKey,
  type TextKey,
} from "./settings";

export interface ContractNumericField {
  key: NumericKey;
  min: number;
  max: number;
  integer: boolean;
  /** True when the value is money in major units (decimals allowed). */
  money: boolean;
  default: number;
}

export interface ContractTextField {
  key: TextKey;
  default: string;
  /** Free-text labels only; currency and locale are validated by format instead. */
  maxLength?: number;
}

export interface QueryContract {
  numeric: readonly ContractNumericField[];
  text: readonly ContractTextField[];
  lang: { key: "lang"; choices: readonly Lang[]; default: Lang };
  goal: { key: "goal"; choices: typeof GOAL_KINDS; default: "" };
  solve: { key: "solve"; choices: typeof SOLVABLE_KEYS; default: (typeof SOLVABLE_KEYS)[number] };
  languageDefaults: typeof LANGUAGE_DEFAULTS;
  /** A report link with a few illustrative, non-default values set. */
  exampleUrl: string;
}

const LABEL_KEYS = new Set<TextKey>(["customer", "customerPlural", "unit", "unitPlural", "title"]);

/** @param basePath the site's root path, e.g. "/breakeven/" on GitHub Pages; defaults to "/". */
export function buildQueryContract(basePath = "/"): QueryContract {
  const numeric: ContractNumericField[] = NUMERIC_FIELDS.map((field) => ({
    key: field.key,
    min: field.min,
    max: field.max,
    integer: Boolean(field.integer),
    money: Boolean(field.money),
    default: DEFAULT_SETTINGS[field.key],
  }));

  const text: ContractTextField[] = TEXT_ORDER.map((key) => ({
    key,
    default: DEFAULT_SETTINGS[key],
    ...(LABEL_KEYS.has(key) ? { maxLength: MAX_LENGTH[key as keyof typeof MAX_LENGTH] } : {}),
  }));

  const example = new URLSearchParams({ customers: "50", price: "9.99", fixed: "2000", months: "36" });
  const prefix = basePath.endsWith("/") ? basePath : `${basePath}/`;

  return {
    numeric,
    text,
    lang: { key: "lang", choices: LANGS, default: DEFAULT_SETTINGS.lang },
    goal: { key: "goal", choices: GOAL_KINDS, default: "" },
    solve: { key: "solve", choices: SOLVABLE_KEYS, default: DEFAULT_SETTINGS.solve },
    languageDefaults: LANGUAGE_DEFAULTS,
    exampleUrl: `${prefix}?${example.toString()}`,
  };
}
