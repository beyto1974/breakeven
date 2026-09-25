/**
 * One JSON object per line on stdout, filtered by LOG_LEVEL.
 */
export const LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
export type Level = (typeof LEVELS)[number];

const ORDER: Record<Level, number> = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };

export function parseLevel(value: string | undefined): Level {
  const level = (value ?? "").trim().toLowerCase();
  return (LEVELS as readonly string[]).includes(level) ? (level as Level) : "info";
}

export type Fields = Record<string, unknown>;

export interface Logger {
  trace(msg: string, fields?: Fields): void;
  debug(msg: string, fields?: Fields): void;
  info(msg: string, fields?: Fields): void;
  warn(msg: string, fields?: Fields): void;
  error(msg: string, fields?: Fields): void;
  fatal(msg: string, fields?: Fields): void;
  log(level: Level, msg: string, fields?: Fields): void;
  enabled(level: Level): boolean;
  /** A logger whose lines all carry `fields`, e.g. a request's trace id. */
  child(fields: Fields): Logger;
}

interface Options {
  level: Level;
  service?: string;
  write?: (line: string) => void;
  now?: () => Date;
}

const ENVELOPE = ["time", "level", "msg", "service"] as const;

function serialise(fields: Fields): Fields {
  const out: Fields = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value;
  }
  return out;
}

export function createLogger({ level, service = "breakeven", write = (line) => process.stdout.write(line + "\n"), now = () => new Date() }: Options, bound: Fields = {}): Logger {
  const min = ORDER[level];
  const enabled = (l: Level) => ORDER[l] >= min;
  const log = (l: Level, msg: string, fields: Fields = {}) => {
    if (!enabled(l)) return;
    const extra = { ...serialise(bound), ...serialise(fields) };
    // Fields cannot forge the envelope.
    for (const key of ENVELOPE) delete extra[key];
    write(JSON.stringify({ time: now().toISOString(), level: l, msg, service, ...extra }));
  };
  return {
    trace: (msg, fields) => log("trace", msg, fields),
    debug: (msg, fields) => log("debug", msg, fields),
    info: (msg, fields) => log("info", msg, fields),
    warn: (msg, fields) => log("warn", msg, fields),
    error: (msg, fields) => log("error", msg, fields),
    fatal: (msg, fields) => log("fatal", msg, fields),
    log,
    enabled,
    child: (fields) => createLogger({ level, service, write, now }, { ...bound, ...fields }),
  };
}
