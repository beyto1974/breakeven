/**
 * Plurals of the user-chosen nouns ("customer", "werkbon", "bon de travail").
 *
 * The rules cover the regular cases of each language. Irregular words are
 * what the explicit override (`customerPlural`, `unitPlural`) is for.
 */
import type { Lang } from "./lang";

function english(noun: string): string {
  if (/[^aeiou]y$/i.test(noun)) return noun.slice(0, -1) + "ies";
  if (/(s|x|z|ch|sh)$/i.test(noun)) return noun + "es";
  return noun + "s";
}

function frenchWord(word: string): string {
  if (/[sxz]$/i.test(word)) return word;
  if (/(eau|au|eu)$/i.test(word)) return word + "x";
  if (/al$/i.test(word)) return word.slice(0, -2) + "aux";
  return word + "s";
}

function french(noun: string): string {
  // "bon de travail" → "bons de travail": the head noun carries the plural.
  const compound = noun.match(/^(\S+)(\s+(?:de|d'|du|des|à)\s.*)$/i);
  if (compound) return frenchWord(compound[1]!) + compound[2]!;
  const words = noun.split(" ");
  words[words.length - 1] = frenchWord(words.at(-1)!);
  return words.join(" ");
}

const VOWEL = "aeiouy";
const LONG_VOWEL = /(aa|ee|oo|uu|ij|ei|ui|ou|au|ie|eu)$/i;

function dutch(noun: string): string {
  const w = noun;
  if (/heid$/i.test(w)) return w.slice(0, -4) + "heden";
  if (/(e|el|em|en|er|je|ie)$/i.test(w)) return w + "s";
  if (/[aiouy]$/i.test(w)) return w + "'s";
  if (/ing$/i.test(w)) return w + "en";

  const last = w.slice(-1).toLowerCase();
  const stem = w.slice(0, -1);
  // Long vowel before f or s: f → v, s → z (bedrijf → bedrijven, huis → huizen).
  if (last === "f" && (LONG_VOWEL.test(stem) || /[lr]$/i.test(stem))) return stem + "ven";
  if (last === "s" && LONG_VOWEL.test(stem)) return stem + "zen";

  const tail = w.slice(-3).toLowerCase();
  const [c1, v, c2] = [tail[0] ?? "", tail[1] ?? "", tail[2] ?? ""];
  const isVowel = (c: string) => VOWEL.includes(c);
  // Double vowel before one consonant: drop one vowel (uur → uren).
  if (w.length >= 3 && isVowel(c1) && c1 === v && !isVowel(c2)) return w.slice(0, -2) + c2 + "en";
  // Short vowel before one consonant: double it (bon → bonnen, stuk → stukken).
  if (w.length >= 3 && !isVowel(c1) && isVowel(v) && !isVowel(c2) && c2 !== "w" && c2 !== "x") return w + c2 + "en";
  return w + "en";
}

/** A switch rather than a lookup table: `lang` can never select anything but these three. */
function rules(lang: Lang, noun: string): string {
  switch (lang) {
    case "nl":
      return dutch(noun);
    case "fr":
      return french(noun);
    default:
      return english(noun);
  }
}

/** Singular for one (and for zero in French); otherwise the override or the rules. */
export function pluralize(lang: Lang, noun: string, count = 2, override?: string): string {
  const singular = lang === "fr" ? Math.abs(count) < 2 : count === 1;
  if (singular) return noun;
  if (override && override.trim()) return override.trim();
  return rules(lang, noun);
}
