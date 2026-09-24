import { describe, expect, test } from "bun:test";
import { newTraceId, sanitizeTraceId, traceIdFor } from "../trace";

describe("newTraceId", () => {
  test("is 16 lowercase hex characters and differs each time", () => {
    const a = newTraceId();
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(newTraceId()).not.toBe(a);
  });
});

describe("sanitizeTraceId", () => {
  test("keeps a well-formed inbound id, trimmed", () => {
    expect(sanitizeTraceId("  req-2026.09_25abc ")).toBe("req-2026.09_25abc");
  });

  test("rejects ids that could inject into logs or are too short or long", () => {
    expect(sanitizeTraceId("abc")).toBeNull();
    expect(sanitizeTraceId("x".repeat(65))).toBeNull();
    expect(sanitizeTraceId('abcdefgh"\n{"level":"fatal"}')).toBeNull();
    expect(sanitizeTraceId(null)).toBeNull();
  });
});

describe("traceIdFor", () => {
  test("reuses x-trace-id, then x-request-id, else mints one", () => {
    expect(traceIdFor(new Headers({ "x-trace-id": "inbound-trace-1" }))).toBe("inbound-trace-1");
    expect(traceIdFor(new Headers({ "x-request-id": "inbound-request-1" }))).toBe("inbound-request-1");
    expect(traceIdFor(new Headers({ "x-trace-id": "bad" }))).toMatch(/^[0-9a-f]{16}$/);
  });
});
