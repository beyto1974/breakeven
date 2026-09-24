import { describe, expect, test } from "bun:test";
import { toCsv, toJson, exportFileName } from "../export";
import { project } from "@/domain/projection";
import { DEFAULT_SETTINGS, toProjectionInput } from "@/query/settings";

const settings = { ...DEFAULT_SETTINGS, months: 2, subscription: 1.21, customer: "company" };
const projection = project(toProjectionInput(settings));

describe("toCsv", () => {
  test("has a header and one line per month, money in major units with a dot", () => {
    const lines = toCsv(projection).trimEnd().split("\n");
    expect(lines[0]).toBe(
      "month,customers,new_customers,units,revenue,variable_cost,acquisition_cost,fixed_cost,total_cost,margin,cumulative_margin",
    );
    expect(lines).toHaveLength(3);
    const first = projection.months[0]!;
    expect(lines[1]).toBe(
      [1, first.customers, 0, first.units, first.revenueCents / 100, first.variableCostCents / 100, 0, 200, first.costCents / 100, first.marginCents / 100, first.cumulativeMarginCents / 100]
        .map((v, i) => (i >= 4 ? Number(v).toFixed(2) : String(v)))
        .join(","),
    );
  });

  test("ends with a newline", () => {
    expect(toCsv(projection).endsWith("\n")).toBe(true);
  });
});

describe("toJson", () => {
  test("carries the settings, the shareable query and the projection", () => {
    const data = JSON.parse(toJson(settings, projection));
    expect(data.settings).toEqual(settings);
    expect(data.query).toBe("subscription=1.21&months=2&customer=company");
    expect(data.summary).toEqual({
      totalRevenueCents: projection.totalRevenueCents,
      totalCostCents: projection.totalCostCents,
      totalMarginCents: projection.totalMarginCents,
      marginRate: projection.marginRate,
      breakEvenMonth: projection.breakEvenMonth,
      paybackMonth: projection.paybackMonth,
      contributionPerCustomerCents: projection.contributionPerCustomerCents,
      breakEvenCustomers: projection.breakEvenCustomers,
    });
    expect(data.months).toEqual(projection.months);
  });
});

describe("exportFileName", () => {
  test("slugs the title and appends the horizon", () => {
    expect(exportFileName({ ...DEFAULT_SETTINGS, title: "Pricing v2 — Q3!" }, "csv")).toBe("pricing-v2-q3-24m.csv");
  });

  test("falls back to a generic name when the title has no usable characters", () => {
    expect(exportFileName({ ...DEFAULT_SETTINGS, title: "€€€" }, "json")).toBe("rentability-24m.json");
  });
});
