"use client";

import { useEffect, useState } from "react";
import type { Formatter } from "@/format/format";
import type { Messages } from "@/i18n/messages";
import type { Nouns } from "@/i18n/nouns";
import { GOAL_KINDS, NUMERIC_FIELDS, readNumber, SOLVABLE_KEYS, type GoalKind, type Settings, type SolvableKey } from "@/query/settings";
import type { TargetResult } from "@/report/target";
import { fieldLabel } from "./Controls";

const MONEY = new Set<SolvableKey>(["price", "subscription", "variable", "fixed", "cac"]);
const PERCENT = new Set<SolvableKey>(["churn"]);

interface Props {
  settings: Settings;
  result: TargetResult | null;
  t: Messages;
  fmt: Formatter;
  noun: Nouns;
  onChange(patch: Partial<Settings>): void;
  onApply(key: SolvableKey, value: number): void;
}

/** A goal value input that only reports valid numbers, like the controls. */
function GoalValue({ settings, t, fmt, onChange }: Pick<Props, "settings" | "t" | "fmt" | "onChange">) {
  const margin = settings.goal === "margin";
  const key = margin ? "goalMargin" : "goalMonth";
  const spec = NUMERIC_FIELDS.find((f) => f.key === key)!;
  const value = settings[key];
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setDraft(String(value));
    setError(null);
  }, [value, key]);
  return (
    <div className={`field${error ? " invalid" : ""}`}>
      <label htmlFor="target-value">{margin ? t.target.amount : t.target.month}</label>
      <div className="input">
        {margin ? <span className="affix pre">{fmt.currencySymbol}</span> : <span className="affix pre">M</span>}
        <input
          id="target-value"
          name={key}
          type="number"
          inputMode={margin ? "decimal" : "numeric"}
          required
          min={spec.min}
          max={spec.max}
          step={margin ? "100" : "1"}
          value={draft}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "target-value-err" : undefined}
          onChange={(event) => {
            setDraft(event.target.value);
            if (event.target.value.trim() === "") return setError(t.errors.required);
            const result = readNumber(spec, event.target.value);
            if (!result.ok) return setError(t.errors.range(fmt.integer(spec.min), fmt.integer(spec.max), Boolean(spec.integer)));
            setError(null);
            onChange({ [key]: result.value });
          }}
        />
      </div>
      {error ? (
        <span className="err" id="target-value-err">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function TargetSolver({ settings, result, t, fmt, noun, onChange, onApply }: Props) {
  if (settings.goal === "") {
    return (
      <section className="card target closed" aria-labelledby="target-title">
        <div className="card-head">
          <h2 id="target-title">{t.target.title}</h2>
          <button type="button" className="btn primary" onClick={() => onChange({ goal: "breakeven" })}>
            {t.target.open}
          </button>
        </div>
        <p className="sub">{t.target.intro}</p>
      </section>
    );
  }

  const format = (key: SolvableKey, value: number) =>
    MONEY.has(key) ? (key === "price" || key === "variable" ? fmt.unitPrice(value * 100) : fmt.money(value * 100)) : PERCENT.has(key) ? `${fmt.decimal(value)} %` : fmt.decimal(value);
  const change = (value: number, current: number) => {
    if (current === 0) return value === 0 ? "±0 %" : "—";
    const ratio = (value - current) / current;
    return `${ratio >= 0 ? "+" : "−"}${fmt.percent(Math.abs(ratio))}`;
  };

  let answer: React.ReactNode = null;
  if (result?.status === "unreachable") {
    const field = NUMERIC_FIELDS.find((f) => f.key === result.key)!;
    answer = <p className="target-answer bad">{t.target.unreachable(fieldLabel(result.key, t, noun), format(result.key, field.min), format(result.key, field.max))}</p>;
  } else if (result?.status === "solved") {
    const label = fieldLabel(result.key, t, noun);
    const args = [label, format(result.key, result.value), format(result.key, result.current), change(result.value, result.current)] as const;
    const text =
      result.direction === "raise" ? (result.alreadyMet ? t.target.canDrop(...args) : t.target.mustRise(...args)) : result.alreadyMet ? t.target.canRise(...args) : t.target.mustFall(...args);
    const same = result.value === result.current;
    answer = (
      <div className={`target-answer ${result.alreadyMet ? "good" : "warn"}`}>
        <p data-testid="target-answer">{text}</p>
        {same ? null : (
          <button type="button" className="btn primary" onClick={() => onApply(result.key, result.value)}>
            {t.target.apply(format(result.key, result.value))}
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="card target" aria-labelledby="target-title">
      <div className="card-head">
        <h2 id="target-title">{t.target.title}</h2>
        <button type="button" className="btn" onClick={() => onChange({ goal: "" })}>
          {t.target.close}
        </button>
      </div>
      <form className="target-form" noValidate onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label htmlFor="target-goal">{t.target.goal}</label>
          <div className="input select">
            <select id="target-goal" name="goal" required value={settings.goal} onChange={(e) => onChange({ goal: e.target.value as GoalKind })}>
              {GOAL_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {t.target.goals[kind]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <GoalValue settings={settings} t={t} fmt={fmt} onChange={onChange} />
        <div className="field">
          <label htmlFor="target-solve">{t.target.solveFor}</label>
          <div className="input select">
            <select id="target-solve" name="solve" required value={settings.solve} onChange={(e) => onChange({ solve: e.target.value as SolvableKey })}>
              {SOLVABLE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {fieldLabel(key, t, noun)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>
      {settings.goal !== "margin" && settings.goalMonth > settings.months ? <p className="note">{t.target.beyondHorizon(settings.goalMonth, settings.months)}</p> : null}
      {answer}
    </section>
  );
}
