import { expect, test } from "@playwright/test";

const rows = (page: import("@playwright/test").Page) => page.getByTestId("monthly-table").locator("tbody tr");

test.describe("report", () => {
  test("opens on the default report with the one-sentence answer", async ({ page }) => {
    await page.goto("/?lang=en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rentability");
    await expect(page.getByTestId("summary")).toHaveText(
      "32 customers cover €200 of fixed costs a month. The margin turns in month 8 and the early losses are repaid in month 15.",
    );
    await expect(page.getByTestId("verdict")).toHaveText("pays back");
    await expect(rows(page)).toHaveCount(24);
  });

  test("reads every setting from the query string", async ({ page }) => {
    await page.goto("/?lang=en&customers=100&months=12&customer=company");
    await expect(page.getByTestId("summary")).toContainText("The margin is positive from month 1.");
    await expect(page.getByLabel("Companies at the start")).toHaveValue("100");
    await expect(rows(page)).toHaveCount(12);
  });

  test("writes edits back to the URL and recalculates", async ({ page }) => {
    await page.goto("/?lang=en");
    await page.getByLabel("Fixed costs per month").fill("500");
    await expect(page).toHaveURL(/[?&]fixed=500(&|$)/);
    await expect(page.getByTestId("summary")).toContainText("80 customers cover €500");
  });

  test("keeps an invalid value out of the report and the URL", async ({ page }) => {
    await page.goto("/?lang=en");
    const churn = page.getByLabel("Customers lost per month");
    await churn.fill("150");
    await expect(page.locator(".field .err")).toContainText("Enter a value from 0 to 100");
    await expect(page).not.toHaveURL(/churn=/);
    await churn.fill("");
    await expect(page.locator(".field .err")).toHaveText("Required");
  });

  test("every model input is required and numeric", async ({ page }) => {
    await page.goto("/?lang=en");
    const inputs = page.locator('form input[type="number"]');
    await expect(inputs).toHaveCount(11);
    for (const input of await inputs.all()) {
      await expect(input).toHaveAttribute("required", "");
      await expect(input).toHaveAttribute("inputmode", /^(decimal|numeric)$/);
    }
  });

  test("shows the average a customer brings in next to per-customer fields", async ({ page }) => {
    await page.goto("/?lang=en");
    await expect(page.getByTestId("average-units")).toHaveText("avg €8.26 revenue per customer a month excl. VAT · €6.26 after its units");
  });

  test("horizon presets change the table length", async ({ page }) => {
    await page.goto("/?lang=en");
    await page.getByRole("button", { name: "36 mo" }).click();
    await expect(rows(page)).toHaveCount(36);
    await expect(page).toHaveURL(/months=36/);
  });

  test("a sensitivity cell applies its price and usage", async ({ page }) => {
    await page.goto("/?lang=en");
    await page.getByRole("button", { name: /^€0\.275 per unit, 44 units per customer/ }).click();
    await expect(page).toHaveURL(/price=0\.275(&|$)/);
    await expect(page).toHaveURL(/units=44/);
    await expect(page.getByLabel("Price per unit, VAT incl.")).toHaveValue("0.275");
  });

  test("warns about a bad parameter and uses the default", async ({ page }) => {
    await page.goto("/?lang=en&growth=lots");
    await expect(page.locator(".warning")).toHaveText("growth=lots is not a number; using 3");
  });

  test("downloads the monthly table as CSV", async ({ page }) => {
    await page.goto("/?lang=en&months=12");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "CSV" }).click()]);
    expect(download.suggestedFilename()).toBe("rentability-12m.csv");
  });
});

test.describe("languages", () => {
  test("Dutch through the query string, with its own defaults", async ({ page }) => {
    await page.goto("/?lang=nl&customer=bedrijf&unit=werkbon");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rentabiliteit");
    await expect(page.getByTestId("summary")).toContainText("32 bedrijven dekken € 200 vaste kosten per maand.");
    await expect(page.getByLabel("Werkbonnen per bedrijf per maand")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "nl");
  });

  test("switching to French rewrites the URL and keeps custom values", async ({ page }) => {
    await page.goto("/?lang=en&fixed=300");
    await page.getByRole("button", { name: "FR", exact: true }).click();
    await expect(page).toHaveURL(/lang=fr/);
    await expect(page).toHaveURL(/fixed=300/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rentabilité");
    await expect(page.getByTestId("summary")).toContainText("couvrent");
  });

  test("without lang, the browser language is used and written into the URL", async ({ browser }) => {
    const context = await browser.newContext({ locale: "fr-BE" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\?lang=fr$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rentabilité");
    await context.close();
  });
});

test.describe("server", () => {
  test("every response carries a trace id, and a valid inbound one is kept", async ({ request }) => {
    const minted = await request.get("/");
    expect(minted.headers()["x-trace-id"]).toMatch(/^[0-9a-f]{16}$/);
    const kept = await request.get("/", { headers: { "x-trace-id": "e2e-trace-0001" } });
    expect(kept.headers()["x-trace-id"]).toBe("e2e-trace-0001");
  });

  test("health check", async ({ request }) => {
    const response = await request.get("/healthz");
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
