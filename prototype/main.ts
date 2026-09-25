/**
 * Interactive prototype of the report (artefact 2). Plain DOM on top of the
 * same engine, codec and formatter the app uses, bundled into one HTML file.
 */
import { sensitivity } from "@/domain/sensitivity";
import { project } from "@/domain/projection";
import { fromCents } from "@/domain/money";
import type { Projection } from "@/domain/types";
import { exportFileName, toCsv, toJson } from "@/export/export";
import { createFormatter, type Formatter } from "@/format/format";
import { linear, niceScale } from "@/chart/scale";
import { reach } from "@/report/heat";
import { summarize } from "@/report/summary";
import { pluralize } from "@/i18n/plural";

const plural = (noun: string, count?: number): string => pluralize("en", noun, count);
import {
  DEFAULT_SETTINGS,
  MONTH_PRESETS,
  NUMERIC_FIELDS,
  parseSettings,
  readNumber,
  serializeSettings,
  toProjectionInput,
  type NumericKey,
  type Settings,
  type SettingsWarning,
  type TextKey,
} from "@/query/settings";

const root = document.getElementById("root")!;
const initial = (() => {
  try {
    return parseSettings(new URLSearchParams(location.search));
  } catch {
    return { settings: { ...DEFAULT_SETTINGS }, warnings: [] as SettingsWarning[] };
  }
})();
let settings: Settings = initial.settings;
let warnings: SettingsWarning[] = initial.warnings;

const esc = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const cap = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

/* ---------- controls ---------- */

interface FieldView {
  key: NumericKey;
  label: (s: Settings) => string;
  prefix?: "currency";
  suffix?: (s: Settings) => string;
  step: string;
}

const GROUPS: { title: string; fields: FieldView[] }[] = [
  {
    title: "Customers",
    fields: [
      { key: "customers", label: (s) => `${cap(plural(s.customer))} at the start`, step: "1" },
      { key: "growth", label: (s) => `New ${plural(s.customer)} per month`, step: "0.5" },
      { key: "churn", label: (s) => `${cap(plural(s.customer))} lost per month`, suffix: () => "%", step: "0.5" },
    ],
  },
  {
    title: "Usage & price",
    fields: [
      { key: "units", label: (s) => `${cap(plural(s.unit))} per ${s.customer} per month`, step: "1" },
      { key: "price", label: (s) => `Price per ${s.unit}, VAT incl.`, prefix: "currency", step: "0.01" },
      { key: "subscription", label: (s) => `Subscription per ${s.customer} / month`, prefix: "currency", step: "1" },
      { key: "vat", label: () => "VAT included in prices", suffix: () => "%", step: "1" },
    ],
  },
  {
    title: "Costs",
    fields: [
      { key: "variable", label: (s) => `Cost per ${s.unit}`, prefix: "currency", step: "0.01" },
      { key: "fixed", label: () => "Fixed costs per month", prefix: "currency", step: "10" },
      { key: "cac", label: (s) => `Acquisition cost per new ${s.customer}`, prefix: "currency", step: "5" },
    ],
  },
];

const TEXT_FIELDS: { key: TextKey; label: string; hint?: string }[] = [
  { key: "title", label: "Report title" },
  { key: "customer", label: "Customer noun", hint: "singular, e.g. company" },
  { key: "unit", label: "Unit noun", hint: "singular, e.g. order" },
  { key: "currency", label: "Currency", hint: "ISO code, e.g. EUR" },
  { key: "locale", label: "Locale", hint: "e.g. en-IE, fr-BE, nl-BE" },
];

function numericField(field: FieldView, fmt: Formatter): string {
  const spec = NUMERIC_FIELDS.find((f) => f.key === field.key)!;
  const id = `f-${field.key}`;
  const pre = field.prefix === "currency" ? `<span class="affix pre" data-currency>${esc(fmt.currencySymbol)}</span>` : "";
  const post = field.suffix ? `<span class="affix">${esc(field.suffix(settings))}</span>` : "";
  return `<div class="field" data-field="${field.key}">
    <label for="${id}" data-label="${field.key}">${esc(field.label(settings))}</label>
    <div class="input">${pre}<input id="${id}" name="${field.key}" type="number" inputmode="decimal" required
      min="${spec.min}" max="${spec.max}" step="${field.step}" value="${settings[field.key]}"
      aria-describedby="${id}-err">${post}</div>
    <span class="err" id="${id}-err" hidden></span>
  </div>`;
}

function renderControls(fmt: Formatter): string {
  const groups = GROUPS.map(
    (g) => `<section class="group" aria-label="${esc(g.title)}"><h2>${esc(g.title)}</h2>${g.fields.map((f) => numericField(f, fmt)).join("")}</section>`,
  ).join("");
  const presets = MONTH_PRESETS.map(
    (m) => `<button type="button" class="pill" data-months="${m}" aria-pressed="${settings.months === m}">${m} mo</button>`,
  ).join("");
  const labels = TEXT_FIELDS.map(
    (f) => `<div class="field"><label for="t-${f.key}">${esc(f.label)}</label>
      <div class="input text"><input id="t-${f.key}" name="${f.key}" type="text" maxlength="${f.key === "title" ? 80 : 32}"
      value="${esc(settings[f.key])}" placeholder="${esc(DEFAULT_SETTINGS[f.key])}" autocomplete="off"></div>
      ${f.hint ? `<span class="note">${esc(f.hint)}</span>` : ""}</div>`,
  ).join("");
  return `<aside class="rail">
    <div class="brand"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18 L9 12 L13 15 L21 6" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="21" cy="6" r="2.2" fill="var(--profit)"/></svg>Rentability</div>
    <form id="form" class="rail-form" novalidate style="display:grid;gap:14px">
      ${groups}
      <section class="group" aria-label="Horizon"><h2>Horizon</h2>
        <div class="pills" role="group" aria-label="Horizon presets">${presets}</div>
        <div class="field" data-field="months"><label for="f-months">Months</label>
          <div class="input"><input id="f-months" name="months" type="number" inputmode="numeric" required min="1" max="120" step="1" value="${settings.months}" aria-describedby="f-months-err"><span class="affix">months</span></div>
          <span class="err" id="f-months-err" hidden></span></div>
      </section>
      <details class="group"><summary><h2>Labels &amp; currency</h2></summary><div style="display:grid;gap:12px;margin-top:12px">${labels}</div></details>
    </form>
    <section class="group" aria-label="Share"><h2>Share</h2>
      <div class="link" id="share-link"></div>
      <div class="actions">
        <button type="button" class="btn primary" id="copy-link">Copy link</button>
        <button type="button" class="btn" id="show-json">JSON</button>
        <button type="button" class="btn" id="show-csv">CSV</button>
        <button type="button" class="btn" id="reset" style="grid-column:1/-1">Reset to defaults</button>
      </div>
    </section>
  </aside>`;
}

/* ---------- report ---------- */

function renderKpis(p: Projection, fmt: Formatter): string {
  const start = p.months[0]?.customers ?? 0;
  const end = p.months.at(-1)?.customers ?? 0;
  const threshold = p.breakEvenCustomers;
  const scaleMax = Math.max(end, start, threshold ?? 0, 1) * 1.1;
  const pct = (v: number) => `${Math.min(100, (v / scaleMax) * 100).toFixed(1)}%`;
  const meter =
    threshold === null
      ? ""
      : `<div class="meter" role="img" aria-label="${start} at the start, ${end} at the end, ${threshold} needed">
          <div class="fill" style="width:${pct(end)}"></div><div class="mark" style="left:${pct(threshold)}"></div></div>
         <div class="meter-legend"><span>start ${fmt.integer(start)}</span><span>end ${fmt.integer(end)}</span></div>`;
  const marginClass = p.totalMarginCents >= 0 ? "pos" : "neg";
  const rateClass = (p.marginRate ?? 0) >= 0 ? "pos" : "neg";
  const kpi = (label: string, value: string, hint: string, extra = "", cls = "") =>
    `<div class="kpi"><span class="label">${label}</span><span class="value ${cls}">${value}</span>${extra}<span class="hint">${hint}</span></div>`;
  return `<div class="kpis">
    ${kpi(
      "Break-even threshold",
      threshold === null ? "never" : `${fmt.integer(threshold)} <small style="font:500 14px var(--body);color:var(--muted)">${esc(plural(settings.customer, threshold))}</small>`,
      `each brings ${fmt.money(p.contributionPerCustomerCents)} a month after its ${esc(plural(settings.unit))}`,
      meter,
      threshold === null ? "neg" : "",
    )}
    ${kpi(
      "First profitable month",
      p.breakEvenMonth === null ? "not yet" : `M${p.breakEvenMonth}`,
      p.paybackMonth === null ? `losses not repaid within ${settings.months} months` : `losses repaid in month ${p.paybackMonth}`,
      "",
      p.breakEvenMonth === null ? "neg" : "",
    )}
    ${kpi(`Margin over ${settings.months} months`, fmt.moneyShort(p.totalMarginCents), `revenue ${fmt.moneyShort(p.totalRevenueCents)} excl. VAT · costs ${fmt.moneyShort(p.totalCostCents)}`, "", marginClass)}
    ${kpi("Margin rate", fmt.percent(p.marginRate), "of revenue excl. VAT", "", p.marginRate === null ? "" : rateClass)}
  </div>`;
}

const W = 760;
const H = 300;
const PAD = { l: 64, r: 14, t: 26, b: 30 };

function renderChart(p: Projection, fmt: Formatter): string {
  const n = p.months.length;
  const values = p.months.flatMap((m) => [m.revenueCents, m.costCents, m.cumulativeMarginCents]);
  const scale = niceScale(Math.min(...values), Math.max(...values), 5);
  const y = linear([scale.min, scale.max], [H - PAD.b, PAD.t]);
  const band = (W - PAD.l - PAD.r) / n;
  const x = (i: number) => PAD.l + band * (i + 0.5);
  const bw = Math.max(2, band * 0.62);
  const zero = y(0);

  const grid = scale.ticks
    .map(
      (t) => `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)" ${t === 0 ? "" : 'stroke-dasharray="3 4"'}/>
      <text x="${PAD.l - 8}" y="${y(t) + 4}" text-anchor="end" font-family="var(--mono)" font-size="10.5" fill="var(--muted)">${esc(fmt.moneyShort(t))}</text>`,
    )
    .join("");

  const bars = p.months
    .map((m, i) => {
      let top = zero;
      return (
        [
          [m.fixedCostCents, "var(--cost-fixed)"],
          [m.variableCostCents, "var(--cost-variable)"],
          [m.acquisitionCostCents, "var(--cost-acq)"],
        ] as const
      )
        .map(([v, color]) => {
          if (v <= 0) return "";
          const h = zero - y(v);
          top -= h;
          return `<rect x="${x(i) - bw / 2}" y="${top}" width="${bw}" height="${h}" fill="${color}" opacity=".55"/>`;
        })
        .join("");
    })
    .join("");

  const path = (pick: (i: number) => number) => p.months.map((_, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(pick(i)).toFixed(1)}`).join(" ");
  const cum = path((i) => p.months[i]!.cumulativeMarginCents);
  const area = `${cum} L${x(n - 1).toFixed(1)},${zero} L${x(0).toFixed(1)},${zero} Z`;
  const revenue = path((i) => p.months[i]!.revenueCents);

  const markers = (
    [
      [p.breakEvenMonth, "break-even"],
      [p.paybackMonth, "payback"],
    ] as const
  )
    .filter(([m]) => m !== null)
    .map(([m, label], k) => {
      const xi = x(m! - 1);
      const anchor = xi > W - 120 ? "end" : "start";
      const dx = anchor === "end" ? -6 : 6;
      return `<line x1="${xi}" x2="${xi}" y1="${PAD.t - 8}" y2="${H - PAD.b}" stroke="var(--ink)" stroke-dasharray="2 3"/>
        <text x="${xi + dx}" y="${PAD.t - 12 + k * 13}" text-anchor="${anchor}" font-family="var(--mono)" font-size="10.5" fill="var(--ink)">${label} · M${m}</text>`;
    })
    .join("");

  const every = n <= 12 ? 1 : n <= 24 ? 3 : n <= 60 ? 6 : 12;
  const xLabels = p.months
    .filter((m) => m.month === 1 || m.month % every === 0)
    .map((m) => `<text x="${x(m.month - 1)}" y="${H - 10}" text-anchor="middle" font-family="var(--mono)" font-size="10.5" fill="var(--muted)">M${m.month}</text>`)
    .join("");

  return `<svg class="chart" id="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly revenue, costs and cumulative margin">
    <defs>
      <clipPath id="above"><rect x="0" y="0" width="${W}" height="${zero}"/></clipPath>
      <clipPath id="below"><rect x="0" y="${zero}" width="${W}" height="${H - zero}"/></clipPath>
    </defs>
    ${grid}${bars}
    <path d="${area}" fill="var(--profit)" opacity=".16" clip-path="url(#above)"/>
    <path d="${area}" fill="var(--loss)" opacity=".16" clip-path="url(#below)"/>
    <path d="${cum}" fill="none" stroke="var(--profit)" stroke-width="2" clip-path="url(#above)"/>
    <path d="${cum}" fill="none" stroke="var(--loss)" stroke-width="2" clip-path="url(#below)"/>
    <path d="${revenue}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <line x1="${PAD.l}" x2="${W - PAD.r}" y1="${zero}" y2="${zero}" stroke="var(--muted)"/>
    ${markers}${xLabels}
    <line id="cross" x1="0" x2="0" y1="${PAD.t}" y2="${H - PAD.b}" stroke="var(--accent)" stroke-width="1" visibility="hidden"/>
    <rect id="hit" x="${PAD.l}" y="0" width="${W - PAD.l - PAD.r}" height="${H}" fill="transparent"/>
  </svg>`;
}

function renderHeat(p: Projection, fmt: Formatter): string {
  const grid = sensitivity(toProjectionInput(settings));
  const start = p.months[0]?.customers ?? 0;
  const end = p.months.at(-1)?.customers ?? 0;
  const tones = {
    now: "background:var(--profit);color:var(--accent-ink)",
    horizon: "background:var(--profit-soft);color:var(--profit)",
    beyond: "background:var(--loss-soft);color:var(--loss)",
    never: "background:var(--sunken);color:var(--muted)",
  } as const;
  const rows = [...grid.rows].reverse();
  const head = rows[0]!.cells.map((c) => `<th scope="col">${esc(fmt.unitPrice(c.unitPriceCents))}<br><span style="opacity:.7">${pctLabel(c.priceFactor)}</span></th>`).join("");
  const body = rows
    .map(
      (r) => `<tr><th scope="row">${fmt.integer(r.unitsPerCustomer)}<br><span style="opacity:.7">${pctLabel(r.unitsFactor)}</span></th>${r.cells
        .map((c) => {
          const tone = reach(c.breakEvenCustomers, start, end);
          const label = c.breakEvenCustomers === null ? "—" : fmt.integer(c.breakEvenCustomers);
          const month = c.breakEvenMonth === null ? "no turn" : `M${c.breakEvenMonth}`;
          const title = `${fmt.unitPrice(c.unitPriceCents)} per ${settings.unit}, ${r.unitsPerCustomer} ${plural(settings.unit)} per ${settings.customer}: ${
            c.breakEvenCustomers === null ? "never breaks even" : `${label} ${plural(settings.customer, c.breakEvenCustomers)} needed, margin turns ${c.breakEvenMonth === null ? "not within the horizon" : `in month ${c.breakEvenMonth}`}`
          }. Click to apply.`;
          return `<td><button type="button" class="${c.isCurrent ? "current" : ""}" style="${tones[tone]}" data-price="${c.unitPriceCents}" data-units="${r.unitsPerCustomer}" title="${esc(title)}" aria-label="${esc(title)}">${label}<small>${month}</small></button></td>`;
        })
        .join("")}</tr>`,
    )
    .join("");
  return `<div class="heat-wrap"><table class="heat">
    <thead><tr><th class="corner">${esc(cap(plural(settings.unit)))} ↓ · price →</th>${head}</tr></thead>
    <tbody>${body}</tbody></table></div>
    <div class="scale-note">
      <span><i style="background:var(--profit)"></i>covered at the start</span>
      <span><i style="background:var(--profit-soft)"></i>reached within ${settings.months} months</span>
      <span><i style="background:var(--loss-soft)"></i>not reached</span>
      <span><i style="background:var(--sunken)"></i>never</span>
    </div>`;
}

const pctLabel = (factor: number): string => (factor === 1 ? "now" : `${factor > 1 ? "+" : "−"}${Math.round(Math.abs(factor - 1) * 100)}%`);

function renderTable(p: Projection, fmt: Formatter): string {
  const cls = (v: number) => (v < 0 ? "neg" : v > 0 ? "pos" : "");
  const rows = p.months
    .map((m) => {
      const mark = m.month === p.breakEvenMonth ? "break-even" : m.month === p.paybackMonth ? "payback" : "";
      return `<tr${mark ? ` class="mark" data-mark="${mark}"` : ""}>
        <td data-mark="${mark}">M${m.month}</td><td>${fmt.integer(m.customers)}</td><td>${fmt.integer(m.units)}</td>
        <td>${fmt.money(m.revenueCents)}</td><td>${fmt.money(m.costCents)}</td>
        <td class="${cls(m.marginCents)}">${fmt.money(m.marginCents)}</td><td class="${cls(m.cumulativeMarginCents)}">${fmt.money(m.cumulativeMarginCents)}</td></tr>`;
    })
    .join("");
  return `<div class="table-wrap"><table class="months">
    <thead><tr><th>Month</th><th>${esc(cap(plural(settings.customer)))}</th><th>${esc(cap(plural(settings.unit)))}</th><th>Revenue excl. VAT</th><th>Costs</th><th>Margin</th><th>Cumulative</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}

/** Escapes the sentence and wraps each highlighted figure, in order. */
function emphasise(sentence: string, highlights: string[]): string {
  let out = "";
  let rest = sentence;
  for (const figure of highlights) {
    const at = rest.indexOf(figure);
    if (at < 0) continue;
    out += esc(rest.slice(0, at)) + `<b>${esc(figure)}</b>`;
    rest = rest.slice(at + figure.length);
  }
  return out + esc(rest);
}

const REASONS: Record<SettingsWarning["reason"], string> = {
  "not-a-number": "is not a number",
  "not-an-integer": "must be a whole number",
  "out-of-range": "is out of range",
  invalid: "is not valid",
  "too-long": "is too long",
};

function renderReport(): void {
  const fmt = createFormatter(settings);
  const p = project(toProjectionInput(settings));
  const summary = summarize(p, settings, fmt);
  const verdictLabel = { repaid: "pays back", turning: "turning", loss: "loss-making", never: "never profitable" }[summary.verdict];
  const sentence = emphasise(summary.sentence, summary.highlights);
  const report = document.getElementById("report")!;
  report.innerHTML = `
    <header class="hero">
      <div class="hero-top"><span class="verdict ${summary.verdict}">${verdictLabel}</span><span class="note">Prototype · figures are examples until you change them</span></div>
      <h1>${esc(settings.title)}</h1>
      <p aria-live="polite">${sentence}</p>
      ${warnings.length ? `<div class="warnings">${warnings.map((w) => `<span class="warning">${esc(w.param)}=${esc(w.value)} ${REASONS[w.reason]}; using ${esc(String(DEFAULT_SETTINGS[w.param]))}</span>`).join("")}</div>` : ""}
    </header>
    ${renderKpis(p, fmt)}
    <section class="card" aria-labelledby="chart-title">
      <div class="card-head"><h2 id="chart-title">Month by month</h2>
        <div class="legend">
          <span><i class="line" style="background:var(--accent)"></i>revenue excl. VAT</span>
          <span><i style="background:var(--cost-fixed)"></i>fixed</span>
          <span><i style="background:var(--cost-variable)"></i>variable</span>
          ${settings.cac > 0 ? '<span><i style="background:var(--cost-acq)"></i>acquisition</span>' : ""}
          <span><i style="background:var(--profit);opacity:.5"></i>cumulative margin</span>
        </div></div>
      <div class="chart-wrap">${renderChart(p, fmt)}<div class="tip" id="tip" hidden></div></div>
    </section>
    <section class="card" aria-labelledby="heat-title">
      <div class="card-head"><h2 id="heat-title">What if price or usage moves?</h2><span class="sub">${esc(cap(plural(settings.customer)))} needed to cover the fixed costs. Click a cell to apply it.</span></div>
      ${renderHeat(p, fmt)}
    </section>
    <section class="card" aria-labelledby="table-title">
      <div class="card-head"><h2 id="table-title">Monthly table</h2><span class="sub">${settings.months} months · ${esc(settings.currency)}</span></div>
      ${renderTable(p, fmt)}
    </section>`;
  bindChart(p, fmt);
  document.getElementById("share-link")!.textContent = shareLink();
  document.querySelectorAll<HTMLButtonElement>("[data-months]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.months) === settings.months)));
}

function bindChart(p: Projection, fmt: Formatter): void {
  const svg = document.getElementById("chart") as unknown as SVGSVGElement;
  const tip = document.getElementById("tip")!;
  const cross = document.getElementById("cross")!;
  const band = (W - PAD.l - PAD.r) / p.months.length;
  const move = (event: PointerEvent) => {
    const rect = svg.getBoundingClientRect();
    const vx = ((event.clientX - rect.left) / rect.width) * W;
    const i = Math.min(p.months.length - 1, Math.max(0, Math.floor((vx - PAD.l) / band)));
    const m = p.months[i]!;
    const cx = PAD.l + band * (i + 0.5);
    cross.setAttribute("x1", String(cx));
    cross.setAttribute("x2", String(cx));
    cross.setAttribute("visibility", "visible");
    const row = (k: string, v: string) => `<div class="r"><span>${esc(k)}</span><span>${esc(v)}</span></div>`;
    tip.innerHTML = `<b>Month ${m.month}</b>${row(cap(plural(settings.customer)), fmt.integer(m.customers))}${row("Revenue", fmt.money(m.revenueCents))}${row("Costs", fmt.money(m.costCents))}${row("Margin", fmt.money(m.marginCents))}${row("Cumulative", fmt.money(m.cumulativeMarginCents))}`;
    tip.hidden = false;
    tip.style.left = `${(cx / W) * rect.width}px`;
    tip.style.top = `${(PAD.t / H) * rect.height + 4}px`;
  };
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerdown", move);
  svg.addEventListener("pointerleave", () => {
    tip.hidden = true;
    cross.setAttribute("visibility", "hidden");
  });
}

/* ---------- state ---------- */

function shareLink(): string {
  const q = serializeSettings(settings);
  return q ? `/?${q}` : "/";
}

function syncUrl(): void {
  try {
    history.replaceState(null, "", `${location.pathname}${serializeSettings(settings) ? `?${serializeSettings(settings)}` : ""}${location.hash}`);
  } catch {
    // Sandboxed frames may refuse; the share box still shows the link.
  }
}

function refreshLabels(): void {
  const fmt = createFormatter(settings);
  for (const g of GROUPS) {
    for (const f of g.fields) {
      const el = document.querySelector(`[data-label="${f.key}"]`);
      if (el) el.textContent = f.label(settings);
    }
  }
  document.querySelectorAll("[data-currency]").forEach((el) => (el.textContent = fmt.currencySymbol));
}

function update(patch: Partial<Settings>, { relabel = false } = {}): void {
  settings = { ...settings, ...patch };
  warnings = warnings.filter((w) => !(w.param in patch));
  if (relabel) refreshLabels();
  renderReport();
  syncUrl();
}

function setField(key: NumericKey, value: number): void {
  const input = document.getElementById(`f-${key}`) as HTMLInputElement | null;
  if (input) input.value = String(value);
}

function toast(message: string): void {
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

async function copy(text: string, done: string, fallback?: HTMLTextAreaElement | HTMLElement): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast(done);
  } catch {
    if (fallback instanceof HTMLTextAreaElement) fallback.select();
    else if (fallback) window.getSelection()?.selectAllChildren(fallback);
    toast("Press Ctrl+C to copy");
  }
}

function openExport(kind: "json" | "csv"): void {
  const p = project(toProjectionInput(settings));
  const text = kind === "json" ? toJson(settings, p) : toCsv(p);
  const dialog = document.createElement("dialog");
  dialog.innerHTML = `<div class="dialog-head"><h3>${esc(exportFileName(settings, kind))}</h3>
    <div class="dialog-actions"><button type="button" class="btn" data-copy>Copy</button><button type="button" class="btn" data-close>Close</button></div></div>
    <textarea readonly aria-label="${kind.toUpperCase()} export"></textarea>
    <p class="note">The app downloads this file. The prototype shows it here instead, because the preview frame blocks downloads.</p>`;
  const area = dialog.querySelector("textarea")!;
  area.value = text;
  dialog.querySelector("[data-copy]")!.addEventListener("click", () => copy(text, "Copied", area));
  dialog.querySelector("[data-close]")!.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => dialog.remove());
  document.body.appendChild(dialog);
  dialog.showModal();
}

function bindControls(): void {
  const form = document.getElementById("form") as HTMLFormElement;
  form.addEventListener("submit", (e) => e.preventDefault());
  form.addEventListener("input", (event) => {
    const input = event.target as HTMLInputElement;
    const key = input.name as keyof Settings;
    if (input.type === "number") {
      const spec = NUMERIC_FIELDS.find((f) => f.key === key)!;
      const wrap = input.closest(".field")!;
      const err = document.getElementById(`${input.id}-err`)!;
      const result = input.value.trim() === "" ? ({ ok: false, reason: "invalid" } as const) : readNumber(spec, input.value);
      if (!result.ok) {
        wrap.classList.add("invalid");
        input.setAttribute("aria-invalid", "true");
        err.hidden = false;
        err.textContent = input.value.trim() === "" ? "Required" : `Enter a value from ${spec.min} to ${spec.max.toLocaleString("en")}${spec.integer ? ", whole numbers only" : ""}`;
        return;
      }
      wrap.classList.remove("invalid");
      input.removeAttribute("aria-invalid");
      err.hidden = true;
      update({ [key]: result.value } as Partial<Settings>);
    } else {
      const next = parseSettings(new URLSearchParams({ [key]: input.value })).settings[key as TextKey];
      update({ [key]: input.value.trim() === "" ? DEFAULT_SETTINGS[key as TextKey] : next } as Partial<Settings>, { relabel: true });
    }
  });

  document.querySelectorAll<HTMLButtonElement>("[data-months]").forEach((button) =>
    button.addEventListener("click", () => {
      const months = Number(button.dataset.months);
      setField("months", months);
      update({ months });
    }),
  );

  document.getElementById("report")!.addEventListener("click", (event) => {
    const cell = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-price]");
    if (!cell) return;
    const price = fromCents(Number(cell.dataset.price));
    const units = Number(cell.dataset.units);
    setField("price", price);
    setField("units", units);
    update({ price, units });
    toast("Scenario applied");
  });

  document.getElementById("copy-link")!.addEventListener("click", () => copy(shareLink(), "Link copied", document.getElementById("share-link")!));
  document.getElementById("show-json")!.addEventListener("click", () => openExport("json"));
  document.getElementById("show-csv")!.addEventListener("click", () => openExport("csv"));
  document.getElementById("reset")!.addEventListener("click", () => {
    settings = { ...DEFAULT_SETTINGS };
    warnings = [];
    mount();
    syncUrl();
    toast("Reset to defaults");
  });
}

function mount(): void {
  const fmt = createFormatter(settings);
  root.innerHTML = `${renderControls(fmt)}<main class="report" id="report"></main>`;
  bindControls();
  renderReport();
}

mount();
