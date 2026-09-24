import { describe, expect, test } from "bun:test";
import { reach } from "../heat";

describe("reach", () => {
  test("never when no number of customers is enough", () => {
    expect(reach(null, 10, 50)).toBe("never");
  });

  test("now when the starting customers already cover it", () => {
    expect(reach(10, 10, 50)).toBe("now");
  });

  test("horizon when growth reaches it before the end", () => {
    expect(reach(32, 15, 65)).toBe("horizon");
  });

  test("beyond when the horizon ends short of it", () => {
    expect(reach(80, 15, 65)).toBe("beyond");
  });

  test("with shrinking customers, the larger count is what was reached", () => {
    expect(reach(18, 20, 12)).toBe("now");
    expect(reach(25, 20, 12)).toBe("beyond");
  });
});
