# Rentability

A generic, stateless profitability projection. Enter customers, usage, price and costs; the report answers:

- **How many customers cover the fixed costs** (break-even threshold)
- **In which month the margin turns positive** (break-even month)
- **When the early losses are paid back** (payback month)

Every setting lives in the query string, so a link *is* the report. Nothing is stored server-side.

Inspired by an internal profitability simulator, generalised: nouns, currency and locale are configurable, and it adds an optional subscription fee, acquisition cost, margin rate and a price × volume sensitivity grid.

## Query contract

| Param | Meaning | Default | Range |
|---|---|---|---|
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
| `locale` | BCP 47 tag | en-BE | |
| `customer` / `unit` | Nouns used in labels | customer / unit | 1 – 32 chars |
| `title` | Report heading | Rentability | 1 – 80 chars |

Invalid or out-of-range values fall back to the default and are reported as warnings. Serialisation writes only non-default values.

## Status

See [TODO.md](TODO.md). Design artefact: `docs/artifacts/spec.html`.
