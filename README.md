# Rentability

A generic, stateless profitability projection. Enter customers, usage, price and costs; the report answers:

- **How many customers cover the fixed costs** (break-even threshold)
- **In which month the margin turns positive** (break-even month)
- **When the early losses are paid back** (payback month)

Every setting lives in the query string, so a link *is* the report. The site is a static export served by a small Bun server: no login, no API, nothing stored.

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
| `title` | Report heading | follows `lang`: Rentability, Rentabiliteit, Rentabilité | 1 – 80 chars |

Invalid or out-of-range values fall back to the default and are reported as warnings. Serialisation writes only non-default values.

## Development

```bash
bun install
bun test              # unit tests
PORT=$(freeport) bun run dev   # then open http://localhost:<port>
bun run build         # static export into out/
bun run test:e2e      # Playwright against the static build
```

## Running in Docker

```bash
cp .env.example .env               # set LOG_LEVEL, and WEB_PORT=$(freeport)
docker compose up -d --build       # http://localhost:$WEB_PORT
docker compose logs -f web         # one JSON object per line
```

The image runs the tests, builds the static export and serves it with `src/server`. It sends security headers, caches hashed assets for a year, and exposes `/healthz` for the healthcheck. Every response carries `x-trace-id`: a valid inbound `x-trace-id` or `x-request-id` is reused, otherwise a new id is minted, and the same id appears in that request's log line. `LOG_LEVEL` is one of trace, debug, info, warn, error, fatal. Health checks are logged at debug, 4xx at warn, 5xx at error. The container is read-only, drops all capabilities and publishes on 127.0.0.1 only.

## Status

See [TODO.md](TODO.md). Design artefact: `docs/artifacts/spec.html`.
