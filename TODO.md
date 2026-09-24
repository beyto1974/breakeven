# TODO

## Phase 0 — Scaffold
- [x] git init, docs skeleton
- [x] Spec artifact (design + query contract) — awaiting approval

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
- [ ] Next.js app, server-rendered from query params
- [ ] JSON API `/api/projection`
- [ ] JSON logger with LOG_LEVEL, trace id (x-trace-id)
- [ ] KPIs, chart, sensitivity heatmap, monthly table, share link, CSV
- [ ] Review

## Phase 4 — Ops
- [ ] Dockerfile, docker compose, healthcheck
- [ ] Playwright e2e
- [ ] Review artifact
