# Rentability

A generic, stateless profitability projection. Enter customers, usage, price and costs; the report answers:

- **How many customers cover the fixed costs** (break-even threshold)
- **In which month the margin turns positive** (break-even month)
- **When the early losses are paid back** (payback month)

Every setting lives in the query string, so a link *is* the report. The site is a static export hosted on GitHub Pages: no login, no API, nothing stored.

Inspired by an internal profitability simulator, generalised: nouns, currency and locale are configurable, and it adds an optional subscription fee, acquisition cost, margin rate and a price × volume sensitivity grid.

## Query contract

| Param | Meaning | Default | Range |
|---|---|---|---|
| `lang` | Interface language: `en`, `nl`, `fr`. Without it, the browser language is used and written into the URL | en | |
| `customers` | Paying customers at month 1 | 15 | 0 – 1 000 000 |
| `growth` | New customers per month | 3 | 0 – 100 000 |
| `churn` | Customers lost per month, % | 2 | 0 – 100 |
| `units` | Units per customer per month | 40 | 0 – 1 000 000 |
| `price` | Price per unit, VAT included (major units) | 0.25 | 0 – 1 000 000 |
| `subscription` | Flat fee per customer per month, VAT included | 0 | 0 – 1 000 000 |
| `vat` | VAT included in prices, % | 21 | 0 – 100 |
| `variable` | Cost per unit | 0.05 | 0 – 1 000 000 |
| `fixed` | Fixed costs per month | 200 | 0 – 100 000 000 |
| `cac` | Acquisition cost per new customer | 0 | 0 – 1 000 000 |
| `months` | Horizon | 24 | 1 – 120 |
| `currency` | ISO 4217 code | EUR | |
| `locale` | Number format, BCP 47 tag | follows `lang`: en-IE, nl-BE, fr-BE | |
| `customer` / `unit` | Nouns used in labels, singular | follows `lang`: customer/unit, klant/eenheid, client/unité | 1 – 32 chars |
| `customerPlural` / `unitPlural` | Plural for irregular nouns; empty uses the language's rules | (rules) | 1 – 32 chars |
| `goal` | Target solver: `breakeven`, `payback` or `margin`. Absent means the solver is closed | | |
| `goalMonth` | Month for a break-even or payback goal | 12 | 1 – 120 |
| `goalMargin` | Total margin for a margin goal | 10000 | −1e9 – 1e9 |
| `solve` | Assumption to solve for: price, units, subscription, customers, growth, churn, variable, fixed, cac | price | |
| `title` | Report heading | follows `lang`: Rentability, Rentabiliteit, Rentabilité | 1 – 80 chars |

Invalid or out-of-range values fall back to the default and are reported as warnings. Serialisation writes only non-default values.

## Development

```bash
bun install
bun test              # unit tests
PORT=$(freeport) bun run dev   # then open http://localhost:<port>
bun run build         # static export into out/
bun run test:e2e      # Playwright against the static build
PORT=$(freeport) bun run preview   # serve out/ locally
```

## Deployment: GitHub Pages

`.github/workflows/pages.yml` runs on every push to `main`. It does three things:

1. Runs the type check, the unit tests and the Playwright suite.
2. Builds the static export. `BASE_PATH` is set to the Pages base path, so a project site works under `/<repository>/`.
3. Publishes `out/` with `actions/deploy-pages`.

To enable it: Settings, then Pages, then Source: **GitHub Actions**.

Since Pages hosts static files only, there is no server-side logging, trace id or container. `src/server` is a small static server used only for local previews (`bun run preview`) and the end-to-end tests.

## Status

See [TODO.md](TODO.md). Design artefact: `docs/artifacts/spec.html`.
