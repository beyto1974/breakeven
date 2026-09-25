# TODO

## Phase 0 — Scaffold
- [x] git init, docs skeleton
- [x] Spec artifact (design + query contract) — approved: static hosting, no login, all additions kept

## Phase 1 — Engine (TDD)
- [x] CSV / JSON builders, formatter, chart scale, summary sentence
- [x] Money + VAT helpers
- [x] Monthly projection (customers, growth, churn, units, price, VAT, variable, fixed, subscription, acquisition cost)
- [x] Break-even customers, break-even month, payback month
- [x] Sensitivity grid (price x volume)
- [x] Query-param codec (parse with defaults/clamping, serialize minimal)
- [x] Review — no correctness bugs. Fixed: exponent notation (String() writes 1e-7) now parses, so every serialised value round-trips; added fractional-CSV test. Known: steady-state contribution divides by the VAT factor while monthly revenue floors to the cent (max 1 cent apart, by design).

## Phase 2 — Prototype artifact
- [x] Single-page interactive prototype of the report (`bun run build:prototype`)
- [x] Review — self-check render: fixed mixed number formats under en-BE (default now en-IE). Awaiting user feedback on look and numbers.

## Phase 3 — App
- [x] Next.js static export, state read from and written to the query string
- [x] JSON / CSV export built in the browser
- [x] i18n: en / nl / fr via `lang`, per-language defaults, plural rules + overrides
- [x] KPIs, chart, sensitivity heatmap, monthly table, share link, CSV
- [x] Review — 4 risks raised, none reproduced: an empty projection cannot occur (the horizon is at least 1 month); a flat chart domain is handled by niceScale; `<html lang>` is set after hydration on purpose (static HTML is English); the lang rewrite on popstate only adds `lang` to the current entry. Static build verified.

- [x] Average revenue / contribution per customer next to per-customer fields

## Phase 4 — Ops
- [x] Hosting: GitHub Pages via `.github/workflows/pages.yml` (tests, build with BASE_PATH, deploy). Docker and compose removed at the user's request.
- [x] Preview server for local use and e2e (src/server): JSON logs, LOG_LEVEL, x-trace-id. Not used on Pages.
- [x] Playwright e2e (15 tests on the static build)
- [x] Review — the one finding was real: the preview server followed symlinks out of its root. Fixed with a realpath check and a test.
- [x] Review report written to `docs/artifacts/review.html` (not published)

## Phase 5 — Target solver
- [x] Domain solver: bisection on one assumption, for break-even, payback or margin goals
- [x] Query params: goal, goalMonth, goalMargin, solve
- [x] Panel in nl/fr/en with apply; e2e tests

## Phase 6 — LLM accessibility
- [x] `src/query/contract.ts`: query contract (fields, ranges, defaults, choices) as data, derived from `settings.ts`, tested
- [x] `scripts/build-llms.ts` generates `public/llms.txt` and `public/params.json` before every `next build`, so an LLM can learn the URL contract in one fetch instead of reading source
- [x] Review — none yet; small, additive, no runtime/UI change. Verified: unit tests, typecheck, and a full `BASE_PATH=/breakeven bun run build` with correct links in `out/llms.txt`.
