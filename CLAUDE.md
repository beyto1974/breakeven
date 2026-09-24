# CLAUDE.md

## Project
Generic stateless rentability (profitability) projection report, generalised from an internal profitability simulator.

## Rules
- English everywhere: code, comments, Markdown.
- One commit per reasonable iteration. Plain commit messages, no AI attribution trailers (a hook rejects them).
- TDD: write or extend the test first for anything in `src/domain` and `src/query`.
- SOLID: `src/domain` is pure (no I/O, no React, no Next). `src/query` maps URL params to domain input and back. `src/server` holds logging and trace ids. `src/app` is UI and routes and depends on the others, never the reverse.
- Money is integer cents inside the domain. Prices include VAT; VAT is removed from revenue only.
- State lives only in the query string. No database, no storage, no cookies.
- Logging: one JSON object per line, level from `LOG_LEVEL`. Every request carries `x-trace-id` (inbound id kept if valid, otherwise minted), and every log line includes it.
- Never hardcode a dev port: `PORT=$(freeport) bun run dev`. Report URLs as `http://localhost:<port>`.
- Every required form field has the `required` attribute. Numeric inputs use `inputmode="decimal"`.
- Review after each phase; record the outcome in TODO.md.

## Artefacts
1. `docs/artifacts/spec.html` — design and query contract
2. `docs/artifacts/prototype.html` — interactive prototype (phase 2)
3. `docs/artifacts/review.html` — review report (phase 4)
