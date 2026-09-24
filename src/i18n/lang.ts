export const LANGS = ["en", "nl", "fr"] as const;
export type Lang = (typeof LANGS)[number];

export const isLang = (value: string): value is Lang => (LANGS as readonly string[]).includes(value);

/** The first supported language in a browser's preference list, or English. */
export function detectLang(preferences: readonly string[]): Lang {
  for (const tag of preferences) {
    const base = tag.toLowerCase().split("-")[0] ?? "";
    if (isLang(base)) return base;
  }
  return "en";
}
