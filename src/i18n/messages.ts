/**
 * Every string the report shows, per language. Nouns arrive already
 * pluralised (see nouns.ts), so messages only place them.
 */
import type { Lang } from "./lang";

export interface Messages {
  langName: string;
  language: string;
  groups: { customers: string; usage: string; costs: string; horizon: string; labels: string; share: string };
  fields: {
    customers(customers: string): string;
    growth(customers: string): string;
    churn(customers: string): string;
    units(units: string, customer: string): string;
    price(unit: string): string;
    subscription(customer: string): string;
    vat: string;
    variable(unit: string): string;
    fixed: string;
    cac(customer: string): string;
    months: string;
    monthsSuffix: string;
    presetSuffix: string;
    presets: string;
  };
  text: {
    title: string;
    customer: string;
    customerHint: string;
    customerPlural: string;
    unit: string;
    unitHint: string;
    unitPlural: string;
    pluralHint: string;
    currency: string;
    currencyHint: string;
    locale: string;
    localeHint: string;
  };
  errors: { required: string; range(min: string, max: string, integer: boolean): string };
  actions: { copyLink: string; json: string; csv: string; reset: string; copied: string; copyFallback: string; resetDone: string; applied: string };
  verdict: { repaid: string; turning: string; loss: string; never: string };
  kpi: {
    threshold: string;
    never: string;
    contribution(amount: string, units: string): string;
    meter(start: string, end: string): { start: string; end: string };
    meterLabel(start: string, end: string, needed: string): string;
    firstMonth: string;
    notYet: string;
    repaidIn(month: number): string;
    notRepaid(months: number): string;
    margin(months: number): string;
    marginHint(revenue: string, costs: string): string;
    rate: string;
    rateHint: string;
  };
  chart: {
    title: string;
    aria: string;
    revenue: string;
    fixed: string;
    variable: string;
    acquisition: string;
    cumulative: string;
    breakEven: string;
    payback: string;
    month(n: number): string;
    tip: { customers: string; revenue: string; costs: string; margin: string; cumulative: string };
  };
  heat: {
    title: string;
    sub(customers: string): string;
    corner(units: string): string;
    now: string;
    noTurn: string;
    cell(price: string, unit: string, units: string, unitsNoun: string, customer: string, result: string): string;
    never: string;
    needed(count: string, customers: string, month: number | null): string;
    legend: { now: string; horizon(months: number): string; beyond: string; never: string };
  };
  table: { title: string; sub(months: number, currency: string): string; month: string; revenue: string; costs: string; margin: string; cumulative: string; breakEven: string; payback: string };
  warning(param: string, value: string, reason: string, fallback: string): string;
  reasons: { "not-a-number": string; "not-an-integer": string; "out-of-range": string; invalid: string; "too-long": string };
  summary: {
    never(customer: string, customers: string): string;
    noFixed(customer: string): string;
    threshold(count: string, fixed: string, one: boolean): string;
    month(n: number): string;
    months(n: number): string;
    noTurn(horizon: string): string;
    positiveFrom(month: string): string;
    turnsRepaid(turn: string, repaid: string): string;
    turnsNotRepaid(turn: string, horizon: string): string;
  };
  footnote: string;
}

const en: Messages = {
  langName: "English",
  language: "Language",
  groups: { customers: "Customers", usage: "Usage & price", costs: "Costs", horizon: "Horizon", labels: "Labels & currency", share: "Share" },
  fields: {
    customers: (c) => `${c} at the start`,
    growth: (c) => `New ${c} per month`,
    churn: (c) => `${c} lost per month`,
    units: (u, c) => `${u} per ${c} per month`,
    price: (u) => `Price per ${u}, VAT incl.`,
    subscription: (c) => `Subscription per ${c} / month`,
    vat: "VAT included in prices",
    variable: (u) => `Cost per ${u}`,
    fixed: "Fixed costs per month",
    cac: (c) => `Acquisition cost per new ${c}`,
    months: "Months",
    monthsSuffix: "months",
    presetSuffix: "mo",
    presets: "Horizon presets",
  },
  text: {
    title: "Report title",
    customer: "Customer noun",
    customerHint: "singular, e.g. company",
    customerPlural: "Customer plural",
    unit: "Unit noun",
    unitHint: "singular, e.g. order",
    unitPlural: "Unit plural",
    pluralHint: "only for irregular words",
    currency: "Currency",
    currencyHint: "ISO code, e.g. EUR",
    locale: "Number format",
    localeHint: "e.g. en-IE, nl-BE, fr-BE",
  },
  errors: {
    required: "Required",
    range: (min, max, integer) => `Enter a value from ${min} to ${max}${integer ? ", whole numbers only" : ""}`,
  },
  actions: { copyLink: "Copy link", json: "JSON", csv: "CSV", reset: "Reset to defaults", copied: "Link copied", copyFallback: "Press Ctrl+C to copy", resetDone: "Reset to defaults", applied: "Scenario applied" },
  verdict: { repaid: "pays back", turning: "turning", loss: "loss-making", never: "never profitable" },
  kpi: {
    threshold: "Break-even threshold",
    never: "never",
    contribution: (a, u) => `each brings ${a} a month after its ${u}`,
    meter: (s, e) => ({ start: `start ${s}`, end: `end ${e}` }),
    meterLabel: (s, e, n) => `${s} at the start, ${e} at the end, ${n} needed`,
    firstMonth: "First profitable month",
    notYet: "not yet",
    repaidIn: (m) => `losses repaid in month ${m}`,
    notRepaid: (m) => `losses not repaid within ${m} months`,
    margin: (m) => `Margin over ${m} months`,
    marginHint: (r, c) => `revenue ${r} excl. VAT · costs ${c}`,
    rate: "Margin rate",
    rateHint: "of revenue excl. VAT",
  },
  chart: {
    title: "Month by month",
    aria: "Monthly revenue, costs and cumulative margin",
    revenue: "revenue excl. VAT",
    fixed: "fixed",
    variable: "variable",
    acquisition: "acquisition",
    cumulative: "cumulative margin",
    breakEven: "break-even",
    payback: "payback",
    month: (n) => `Month ${n}`,
    tip: { customers: "Customers", revenue: "Revenue", costs: "Costs", margin: "Margin", cumulative: "Cumulative" },
  },
  heat: {
    title: "What if price or usage moves?",
    sub: (c) => `${c} needed to cover the fixed costs. Click a cell to apply it.`,
    corner: (u) => `${u} ↓ · price →`,
    now: "now",
    noTurn: "no turn",
    cell: (p, u, n, nu, c, r) => `${p} per ${u}, ${n} ${nu} per ${c}: ${r}. Click to apply.`,
    never: "never breaks even",
    needed: (n, c, m) => `${n} ${c} needed, margin turns ${m === null ? "not within the horizon" : `in month ${m}`}`,
    legend: { now: "covered at the start", horizon: (m) => `reached within ${m} months`, beyond: "not reached", never: "never" },
  },
  table: {
    title: "Monthly table",
    sub: (m, c) => `${m} months · ${c}`,
    month: "Month",
    revenue: "Revenue excl. VAT",
    costs: "Costs",
    margin: "Margin",
    cumulative: "Cumulative",
    breakEven: "break-even",
    payback: "payback",
  },
  warning: (p, v, r, f) => `${p}=${v} ${r}; using ${f}`,
  reasons: { "not-a-number": "is not a number", "not-an-integer": "must be a whole number", "out-of-range": "is out of range", invalid: "is not valid", "too-long": "is too long" },
  summary: {
    never: (c, cs) => `For each ${c}, costs exceed revenue, so no number of ${cs} covers the fixed costs.`,
    noFixed: (c) => `There are no fixed costs, so every ${c} adds margin.`,
    threshold: (n, f, one) => `${n} ${one ? "covers" : "cover"} ${f} of fixed costs a month.`,
    month: (n) => `month ${n}`,
    months: (n) => `${n} ${n === 1 ? "month" : "months"}`,
    noTurn: (h) => `The margin does not turn within ${h}.`,
    positiveFrom: (m) => `The margin is positive from ${m}.`,
    turnsRepaid: (t, r) => `The margin turns in ${t} and the early losses are repaid in ${r}.`,
    turnsNotRepaid: (t, h) => `The margin turns in ${t}, but the early losses are not repaid within ${h}.`,
  },
  footnote: "A projection, not a forecast. Prices include VAT, which is taken out of revenue; costs are counted in full. Payment fees are not included.",
};

const nl: Messages = {
  langName: "Nederlands",
  language: "Taal",
  groups: { customers: "Klanten", usage: "Gebruik & prijs", costs: "Kosten", horizon: "Periode", labels: "Benamingen & munt", share: "Delen" },
  fields: {
    customers: (c) => `${c} bij de start`,
    growth: (c) => `Nieuwe ${c} per maand`,
    churn: (c) => `${c} verloren per maand`,
    units: (u, c) => `${u} per ${c} per maand`,
    price: (u) => `Prijs per ${u}, incl. btw`,
    subscription: (c) => `Abonnement per ${c} / maand`,
    vat: "Btw inbegrepen in de prijzen",
    variable: (u) => `Kost per ${u}`,
    fixed: "Vaste kosten per maand",
    cac: (c) => `Wervingskost per nieuwe ${c}`,
    months: "Maanden",
    monthsSuffix: "maanden",
    presetSuffix: "mnd",
    presets: "Vaste periodes",
  },
  text: {
    title: "Titel van het rapport",
    customer: "Naam voor klant",
    customerHint: "enkelvoud, bv. bedrijf",
    customerPlural: "Meervoud klant",
    unit: "Naam voor eenheid",
    unitHint: "enkelvoud, bv. werkbon",
    unitPlural: "Meervoud eenheid",
    pluralHint: "alleen voor onregelmatige woorden",
    currency: "Munt",
    currencyHint: "ISO-code, bv. EUR",
    locale: "Getalnotatie",
    localeHint: "bv. nl-BE, fr-BE, en-IE",
  },
  errors: {
    required: "Verplicht",
    range: (min, max, integer) => `Geef een waarde van ${min} tot ${max}${integer ? ", alleen gehele getallen" : ""}`,
  },
  actions: { copyLink: "Link kopiëren", json: "JSON", csv: "CSV", reset: "Standaardwaarden", copied: "Link gekopieerd", copyFallback: "Druk op Ctrl+C om te kopiëren", resetDone: "Standaardwaarden hersteld", applied: "Scenario toegepast" },
  verdict: { repaid: "terugverdiend", turning: "kentert", loss: "verlieslatend", never: "nooit rendabel" },
  kpi: {
    threshold: "Rendabiliteitsdrempel",
    never: "nooit",
    contribution: (a, u) => `elk brengt ${a} per maand op na de eigen ${u}`,
    meter: (s, e) => ({ start: `start ${s}`, end: `einde ${e}` }),
    meterLabel: (s, e, n) => `${s} bij de start, ${e} op het einde, ${n} nodig`,
    firstMonth: "Eerste winstgevende maand",
    notYet: "nog niet",
    repaidIn: (m) => `verliezen terugverdiend in maand ${m}`,
    notRepaid: (m) => `verliezen niet terugverdiend binnen ${m} maanden`,
    margin: (m) => `Marge over ${m} maanden`,
    marginHint: (r, c) => `omzet ${r} excl. btw · kosten ${c}`,
    rate: "Margepercentage",
    rateHint: "van de omzet excl. btw",
  },
  chart: {
    title: "Maand per maand",
    aria: "Maandelijkse omzet, kosten en gecumuleerde marge",
    revenue: "omzet excl. btw",
    fixed: "vast",
    variable: "variabel",
    acquisition: "werving",
    cumulative: "gecumuleerde marge",
    breakEven: "break-even",
    payback: "terugverdiend",
    month: (n) => `Maand ${n}`,
    tip: { customers: "Klanten", revenue: "Omzet", costs: "Kosten", margin: "Marge", cumulative: "Gecumuleerd" },
  },
  heat: {
    title: "Wat als prijs of gebruik verandert?",
    sub: (c) => `${c} nodig om de vaste kosten te dekken. Klik op een cel om ze toe te passen.`,
    corner: (u) => `${u} ↓ · prijs →`,
    now: "nu",
    noTurn: "geen kentering",
    cell: (p, u, n, nu, c, r) => `${p} per ${u}, ${n} ${nu} per ${c}: ${r}. Klik om toe te passen.`,
    never: "nooit rendabel",
    needed: (n, c, m) => `${n} ${c} nodig, marge kentert ${m === null ? "niet binnen de periode" : `in maand ${m}`}`,
    legend: { now: "gedekt bij de start", horizon: (m) => `bereikt binnen ${m} maanden`, beyond: "niet bereikt", never: "nooit" },
  },
  table: {
    title: "Maandtabel",
    sub: (m, c) => `${m} maanden · ${c}`,
    month: "Maand",
    revenue: "Omzet excl. btw",
    costs: "Kosten",
    margin: "Marge",
    cumulative: "Gecumuleerd",
    breakEven: "break-even",
    payback: "terugverdiend",
  },
  warning: (p, v, r, f) => `${p}=${v} ${r}; ${f} gebruikt`,
  reasons: { "not-a-number": "is geen getal", "not-an-integer": "moet een geheel getal zijn", "out-of-range": "ligt buiten het bereik", invalid: "is ongeldig", "too-long": "is te lang" },
  summary: {
    never: (c, cs) => `Per ${c} liggen de kosten hoger dan de opbrengst, dus geen enkel aantal ${cs} dekt de vaste kosten.`,
    noFixed: (c) => `Er zijn geen vaste kosten, dus elke ${c} levert marge op.`,
    threshold: (n, f, one) => `${n} ${one ? "dekt" : "dekken"} ${f} vaste kosten per maand.`,
    month: (n) => `maand ${n}`,
    months: (n) => `${n} ${n === 1 ? "maand" : "maanden"}`,
    noTurn: (h) => `De marge wordt niet positief binnen ${h}.`,
    positiveFrom: (m) => `De marge is positief vanaf ${m}.`,
    turnsRepaid: (t, r) => `De marge wordt positief in ${t} en de aanloopverliezen zijn terugverdiend in ${r}.`,
    turnsNotRepaid: (t, h) => `De marge wordt positief in ${t}, maar de aanloopverliezen zijn niet terugverdiend binnen ${h}.`,
  },
  footnote: "Een projectie, geen voorspelling. Prijzen zijn inclusief btw, die van de omzet wordt afgetrokken; kosten tellen volledig. Betaalkosten zijn niet meegerekend.",
};

const fr: Messages = {
  langName: "Français",
  language: "Langue",
  groups: { customers: "Clients", usage: "Usage & prix", costs: "Coûts", horizon: "Horizon", labels: "Libellés & devise", share: "Partager" },
  fields: {
    customers: (c) => `${c} au départ`,
    growth: (c) => `Nouveaux ${c} par mois`,
    churn: (c) => `${c} perdus par mois`,
    units: (u, c) => `${u} par ${c} par mois`,
    price: (u) => `Prix par ${u}, TVAC`,
    subscription: (c) => `Abonnement par ${c} / mois`,
    vat: "TVA comprise dans les prix",
    variable: (u) => `Coût par ${u}`,
    fixed: "Frais fixes par mois",
    cac: (c) => `Coût d'acquisition par nouveau ${c}`,
    months: "Mois",
    monthsSuffix: "mois",
    presetSuffix: "mois",
    presets: "Horizons prédéfinis",
  },
  text: {
    title: "Titre du rapport",
    customer: "Nom du client",
    customerHint: "singulier, p. ex. entreprise",
    customerPlural: "Pluriel du client",
    unit: "Nom de l'unité",
    unitHint: "singulier, p. ex. bon",
    unitPlural: "Pluriel de l'unité",
    pluralHint: "seulement pour les mots irréguliers",
    currency: "Devise",
    currencyHint: "code ISO, p. ex. EUR",
    locale: "Format des nombres",
    localeHint: "p. ex. fr-BE, nl-BE, en-IE",
  },
  errors: {
    required: "Obligatoire",
    range: (min, max, integer) => `Entrez une valeur de ${min} à ${max}${integer ? ", nombres entiers uniquement" : ""}`,
  },
  actions: { copyLink: "Copier le lien", json: "JSON", csv: "CSV", reset: "Valeurs par défaut", copied: "Lien copié", copyFallback: "Appuyez sur Ctrl+C pour copier", resetDone: "Valeurs par défaut rétablies", applied: "Scénario appliqué" },
  verdict: { repaid: "remboursé", turning: "en bascule", loss: "déficitaire", never: "jamais rentable" },
  kpi: {
    threshold: "Seuil de rentabilité",
    never: "jamais",
    contribution: (a, u) => `chacun rapporte ${a} par mois après ses ${u}`,
    meter: (s, e) => ({ start: `départ ${s}`, end: `fin ${e}` }),
    meterLabel: (s, e, n) => `${s} au départ, ${e} à la fin, ${n} nécessaires`,
    firstMonth: "Premier mois rentable",
    notYet: "pas encore",
    repaidIn: (m) => `pertes remboursées au mois ${m}`,
    notRepaid: (m) => `pertes non remboursées en ${m} mois`,
    margin: (m) => `Marge sur ${m} mois`,
    marginHint: (r, c) => `recettes ${r} HTVA · coûts ${c}`,
    rate: "Taux de marge",
    rateHint: "des recettes HTVA",
  },
  chart: {
    title: "Mois par mois",
    aria: "Recettes, coûts et marge cumulée par mois",
    revenue: "recettes HTVA",
    fixed: "fixes",
    variable: "variables",
    acquisition: "acquisition",
    cumulative: "marge cumulée",
    breakEven: "seuil",
    payback: "remboursé",
    month: (n) => `Mois ${n}`,
    tip: { customers: "Clients", revenue: "Recettes", costs: "Coûts", margin: "Marge", cumulative: "Cumul" },
  },
  heat: {
    title: "Et si le prix ou l'usage change ?",
    sub: (c) => `${c} nécessaires pour couvrir les frais fixes. Cliquez sur une case pour l'appliquer.`,
    corner: (u) => `${u} ↓ · prix →`,
    now: "actuel",
    noTurn: "pas de bascule",
    cell: (p, u, n, nu, c, r) => `${p} par ${u}, ${n} ${nu} par ${c} : ${r}. Cliquez pour appliquer.`,
    never: "jamais rentable",
    needed: (n, c, m) => `${n} ${c} nécessaires, la marge bascule ${m === null ? "hors de l'horizon" : `au mois ${m}`}`,
    legend: { now: "couvert au départ", horizon: (m) => `atteint en ${m} mois`, beyond: "non atteint", never: "jamais" },
  },
  table: {
    title: "Tableau mensuel",
    sub: (m, c) => `${m} mois · ${c}`,
    month: "Mois",
    revenue: "Recettes HTVA",
    costs: "Coûts",
    margin: "Marge",
    cumulative: "Cumul",
    breakEven: "seuil",
    payback: "remboursé",
  },
  warning: (p, v, r, f) => `${p}=${v} ${r} ; ${f} utilisé`,
  reasons: { "not-a-number": "n'est pas un nombre", "not-an-integer": "doit être un nombre entier", "out-of-range": "est hors limites", invalid: "n'est pas valide", "too-long": "est trop long" },
  summary: {
    never: (c, cs) => `Pour chaque ${c}, les coûts dépassent les recettes : aucun nombre de ${cs} ne couvre les frais fixes.`,
    noFixed: (c) => `Il n'y a pas de frais fixes : chaque ${c} dégage de la marge.`,
    threshold: (n, f, one) => `${n} ${one ? "couvre" : "couvrent"} ${f} de frais fixes par mois.`,
    month: (n) => `mois ${n}`,
    months: (n) => `${n} mois`,
    noTurn: (h) => `La marge ne devient pas positive en ${h}.`,
    positiveFrom: (m) => `La marge est positive dès le ${m}.`,
    turnsRepaid: (t, r) => `La marge devient positive au ${t} et les pertes de départ sont remboursées au ${r}.`,
    turnsNotRepaid: (t, h) => `La marge devient positive au ${t}, mais les pertes de départ ne sont pas remboursées en ${h}.`,
  },
  footnote: "Une projection, pas une prévision. Les prix sont TVAC, la TVA est retirée des recettes ; les coûts sont comptés en entier. Les frais de paiement ne sont pas inclus.",
};

const MESSAGES: Record<Lang, Messages> = { en, nl, fr };

export const messages = (lang: Lang): Messages => MESSAGES[lang];
