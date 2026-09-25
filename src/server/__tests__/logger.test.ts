import { describe, expect, test } from "bun:test";
import { createLogger, parseLevel } from "../logger";

function capture(level: string) {
  const lines: string[] = [];
  const logger = createLogger({ level: parseLevel(level), write: (line) => lines.push(line), now: () => new Date("2026-09-25T10:00:00.000Z") });
  return { logger, lines, parsed: () => lines.map((l) => JSON.parse(l)) };
}

describe("parseLevel", () => {
  test("accepts the six levels case-insensitively", () => {
    expect(parseLevel("DEBUG")).toBe("debug");
    expect(parseLevel("warn")).toBe("warn");
  });

  test("falls back to info on anything else", () => {
    expect(parseLevel(undefined)).toBe("info");
    expect(parseLevel("verbose")).toBe("info");
  });
});

describe("createLogger", () => {
  test("writes one JSON object per line with time, level, msg and service", () => {
    const { logger, lines, parsed } = capture("info");
    logger.info("http.request", { status: 200 });
    expect(lines).toHaveLength(1);
    expect(lines[0]!.includes("\n")).toBe(false);
    expect(parsed()[0]).toEqual({ time: "2026-09-25T10:00:00.000Z", level: "info", msg: "http.request", service: "breakeven", status: 200 });
  });

  test("drops lines below the configured level", () => {
    const { logger, parsed } = capture("warn");
    logger.debug("a");
    logger.info("b");
    logger.warn("c");
    logger.error("d");
    expect(parsed().map((l) => l.msg)).toEqual(["c", "d"]);
  });

  test("child loggers carry their fields, such as the trace id", () => {
    const { logger, parsed } = capture("info");
    logger.child({ trace_id: "abc123def4567890" }).info("x", { a: 1 });
    expect(parsed()[0]).toMatchObject({ trace_id: "abc123def4567890", a: 1 });
  });

  test("serialises errors with name, message and stack", () => {
    const { logger, parsed } = capture("info");
    logger.error("boom", { err: new TypeError("bad") });
    expect(parsed()[0].err).toMatchObject({ name: "TypeError", message: "bad" });
    expect(typeof parsed()[0].err.stack).toBe("string");
  });

  test("fields cannot overwrite the envelope", () => {
    const { logger, parsed } = capture("info");
    logger.info("real", { msg: "fake", level: "fatal", time: "never" });
    expect(parsed()[0]).toMatchObject({ msg: "real", level: "info", time: "2026-09-25T10:00:00.000Z" });
  });

  test("reports whether a level is enabled", () => {
    expect(capture("error").logger.enabled("warn")).toBe(false);
    expect(capture("trace").logger.enabled("trace")).toBe(true);
  });
});
