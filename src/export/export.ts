/**
 * Downloads built in the browser: the monthly table for a spreadsheet, and the
 * whole projection for anything else. Pure functions returning strings; the UI
 * turns them into files.
 */
import type { Projection } from "@/domain/types";
import { serializeSettings, type Settings } from "@/query/settings";

const CSV_COLUMNS = [
  "month",
  "customers",
  "new_customers",
  "units",
  "revenue",
  "variable_cost",
  "acquisition_cost",
  "fixed_cost",
  "total_cost",
  "margin",
  "cumulative_margin",
] as const;

/** Machine-readable: dot decimal, two places, no currency sign or grouping. */
const money = (cents: number): string => (cents / 100).toFixed(2);

export function toCsv(projection: Projection): string {
  const lines = projection.months.map((m) =>
    [
      String(m.month),
      String(m.customers),
      String(m.newCustomers),
      String(m.units),
      money(m.revenueCents),
      money(m.variableCostCents),
      money(m.acquisitionCostCents),
      money(m.fixedCostCents),
      money(m.costCents),
      money(m.marginCents),
      money(m.cumulativeMarginCents),
    ].join(","),
  );
  return [CSV_COLUMNS.join(","), ...lines].join("\n") + "\n";
}

export function toJson(settings: Settings, projection: Projection): string {
  const { months, ...summary } = projection;
  return JSON.stringify({ settings, query: serializeSettings(settings), summary, months }, null, 2);
}

export function exportFileName(settings: Settings, extension: "csv" | "json"): string {
  const slug = settings.title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "breakeven"}-${settings.months}m.${extension}`;
}
