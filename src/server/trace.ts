/**
 * The id that ties a request's log line to what the caller saw. It is sent
 * back as `x-trace-id`, so it can be read from the browser's network tab and
 * quoted in a bug report.
 */
export const TRACE_HEADER = "x-trace-id";

/** 16 hex characters: short enough to read out, long enough not to collide. */
export function newTraceId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

/**
 * An inbound id, or null when it is not one. The header comes from outside and
 * ends up in the log, so it is checked rather than trusted.
 */
export function sanitizeTraceId(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^[A-Za-z0-9._-]{8,64}$/.test(trimmed) ? trimmed : null;
}

/** A proxy's id is reused so one request keeps one id end to end. */
export function traceIdFor(headers: Headers): string {
  return sanitizeTraceId(headers.get(TRACE_HEADER)) ?? sanitizeTraceId(headers.get("x-request-id")) ?? newTraceId();
}
