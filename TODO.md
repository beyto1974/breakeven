# TODO

## Phase 0 — Scaffold
- [x] git init, docs skeleton
- [x] Spec artifact (design + query contract) — approved: static hosting, no login, all additions kept

## Phase 1 — Engine (TDD)
- [ ] Money + VAT helpers
- [ ] Monthly projection (customers, growth, churn, units, price, VAT, variable, fixed, subscription, acquisition cost)
- [ ] Break-even customers, break-even month, payback month
- [ ] Sensitivity grid (price x volume)
- [ ] Query-param codec (parse with defaults/clamping, serialize minimal)
- [ ] Review

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
