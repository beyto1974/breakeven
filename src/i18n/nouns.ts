import type { Settings } from "@/query/settings";
import { pluralize } from "./plural";

type NounSettings = Pick<Settings, "lang" | "customer" | "customerPlural" | "unit" | "unitPlural">;

export interface Nouns {
  /** The customer noun for `count` (plural by default). */
  customer(count?: number): string;
  unit(count?: number): string;
}

export function nouns(settings: NounSettings): Nouns {
  return {
    customer: (count = 2) => pluralize(settings.lang, settings.customer, count, settings.customerPlural),
    unit: (count = 2) => pluralize(settings.lang, settings.unit, count, settings.unitPlural),
  };
}

export const capitalize = (value: string): string => value.charAt(0).toLocaleUpperCase() + value.slice(1);
