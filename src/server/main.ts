/**
 * Production entry point: serves `out/` (the static export) on PORT.
 */
import { createHandler } from "./handler";
import { createLogger, parseLevel } from "./logger";

const logger = createLogger({ level: parseLevel(process.env.LOG_LEVEL) });
const port = Number(process.env.PORT ?? 3000);
const root = process.env.STATIC_ROOT ?? `${process.cwd()}/out`;

const server = Bun.serve({ port, hostname: process.env.HOST ?? "0.0.0.0", fetch: createHandler({ root, logger }) });
logger.info("server.started", { port: server.port, root, level: parseLevel(process.env.LOG_LEVEL) });

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    logger.info("server.stopping", { signal });
    server.stop();
    process.exit(0);
  });
}
