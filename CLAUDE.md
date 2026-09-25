# CLAUDE.md

## Project
Generic stateless rentability (profitability) projection report, generalised from an internal profitability simulator.

## Rules
- English everywhere: code, comments, Markdown.
- One commit per reasonable iteration. Plain commit messages, no AI attribution trailers (a hook rejects them).
- TDD: write or extend the test first for anything in `src/domain` and `src/query`.
- SOLID: `src/domain` is pure (no I/O, no React, no Next). `src/query` maps URL params to domain input and back. `src/export` builds JSON/CSV downloads. `src/i18n` holds languages, messages and plural rules. `src/server` is the local preview server. `src/app` is UI and routes and depends on the others, never the reverse.
- Money is integer cents inside the domain. Prices include VAT; VAT is removed from revenue only.
- Hosted on GitHub Pages: `next build` with `output: "export"` into `out/`, with `BASE_PATH` set by the Pages workflow. There is no Docker and no compose. `src/server` is only a local preview and e2e server. No login. State lives only in the query string. No database, no storage, no cookies, no API routes.
- Logging and trace ids exist only in the preview server (`src/server`): one JSON object per line, level from `LOG_LEVEL`, `x-trace-id` on each response. GitHub Pages has no server-side logs.
- Dev ports: the scripts use `freeport` when installed (shared dev box), else fixed defaults. Report URLs as `http://localhost:<port>`.
- UI languages: en, nl, fr (`src/i18n/messages.ts`); every user-visible string goes through `messages(lang)`. Code, comments and Markdown stay English.
- Every required form field has the `required` attribute. Numeric inputs use `inputmode="decimal"`.
- Review after each phase; record the outcome in TODO.md.

## Commands
- `bun test` — unit tests (TDD); `bun run test:e2e` — Playwright on the static build
- `bun run dev` — dev server
- `bun run preview` — serve `out/` locally; `BASE_PATH=/breakeven bun run build` to test the Pages prefix

## Artefacts
1. `docs/artifacts/spec.html` — design and query contract
2. `docs/artifacts/prototype.html` — interactive prototype (phase 2)
3. `docs/artifacts/review.html` — review report (phase 4)

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
