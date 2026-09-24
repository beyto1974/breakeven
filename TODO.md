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
- [ ] Single-page interactive prototype of the report
- [ ] Review

## Phase 3 — App
- [ ] Next.js static export, state read from and written to the query string
- [ ] JSON / CSV export built in the browser
- [ ] KPIs, chart, sensitivity heatmap, monthly table, share link, CSV
- [ ] Review

## Phase 4 — Ops
- [ ] Dockerfile (bun build, nginx serve), docker compose, healthcheck
- [ ] nginx JSON logs, LOG_LEVEL from .env, x-trace-id
- [ ] Playwright e2e
- [ ] Review artifact
