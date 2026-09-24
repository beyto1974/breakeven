# syntax=docker/dockerfile:1

# Build: install, test, export the static site.
FROM oven/bun:1.4-alpine AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun test src && bun run build

# Runtime: the static export plus the small server that logs it.
FROM oven/bun:1.4-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 STATIC_ROOT=/app/out LOG_LEVEL=info
COPY --from=build /app/out ./out
COPY --from=build /app/src/server ./src/server
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/healthz" || exit 1
CMD ["bun", "src/server/main.ts"]
