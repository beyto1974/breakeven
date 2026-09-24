import { describe, expect, test } from "bun:test";
import { project } from "@/domain/projection";
import { goalMet } from "@/domain/solver";
import { DEFAULT_SETTINGS, SOLVABLE_KEYS, toProjectionInput, type Settings } from "@/query/settings";
import { solveTarget, toGoal } from "../target";

const withGoal = (overrides: Partial<Settings>): Settings => ({ ...DEFAULT_SETTINGS, goal: "breakeven", goalMonth: 6, ...overrides });

describe("toGoal", () => {
  test("is null while no goal is set", () => {
    expect(toGoal(DEFAULT_SETTINGS)).toBeNull();
  });

  test("maps each goal kind, converting a margin to cents", () => {
    expect(toGoal(withGoal({}))).toEqual({ kind: "breakEven", month: 6 });
    expect(toGoal(withGoal({ goal: "payback", goalMonth: 18 }))).toEqual({ kind: "payback", month: 18 });
    expect(toGoal(withGoal({ goal: "margin", goalMargin: 2500.5 }))).toEqual({ kind: "margin", cents: 250050 });
  });
});

describe("solveTarget", () => {
  test("is null while no goal is set", () => {
    expect(solveTarget(DEFAULT_SETTINGS)).toBeNull();
  });

  test("gives the price needed, in major units, and whether it is a raise", () => {
    const result = solveTarget(withGoal({ solve: "price" }))!;
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    expect(result.direction).toBe("raise");
    expect(result.current).toBe(0.25);
    expect(result.value).toBeGreaterThan(0.25);
    expect(result.alreadyMet).toBe(false);
    const applied = { ...withGoal({}), price: result.value };
    expect(goalMet(project(toProjectionInput(applied)), toGoal(applied)!)).toBe(true);
  });

  test("gives the most fixed cost the goal can carry", () => {
    const result = solveTarget(withGoal({ goal: "payback", goalMonth: 20, solve: "fixed" }))!;
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;
    expect(result.direction).toBe("lower");
    expect(result.alreadyMet).toBe(true);
    expect(result.value).toBeGreaterThan(200);
    expect(Number.isInteger(result.value)).toBe(true);
  });

  test("every solvable assumption yields an answer that meets the goal when applied", () => {
    for (const solve of SOLVABLE_KEYS) {
      const settings = withGoal({ goal: "payback", goalMonth: 18, solve });
      const result = solveTarget(settings)!;
      if (result.status !== "solved") continue;
      const applied = { ...settings, [solve]: result.value };
      expect(goalMet(project(toProjectionInput(applied)), toGoal(applied)!)).toBe(true);
    }
  });

  test("reports an unreachable goal", () => {
    expect(solveTarget(withGoal({ customers: 0, goal: "breakeven", goalMonth: 1, solve: "growth" }))).toEqual({ status: "unreachable", key: "growth" });
  });
});
