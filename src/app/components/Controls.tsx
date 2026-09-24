"use client";

import { useEffect, useId, useState } from "react";
import type { Formatter } from "@/format/format";
import type { Messages } from "@/i18n/messages";
import { capitalize, nouns, type Nouns } from "@/i18n/nouns";
import { defaultsFor, MONTH_PRESETS, NUMERIC_FIELDS, readNumber, type NumericKey, type Settings, type TextKey } from "@/query/settings";

interface FieldView {
  key: NumericKey;
  label: (t: Messages["fields"], n: Nouns) => string;
  money?: boolean;
  suffix?: (t: Messages["fields"]) => string;
  /** A "per customer per month" field: show the average a customer brings in next to it. */
  average?: boolean;
  step: string;
}

const GROUPS: { title: keyof Messages["groups"]; fields: FieldView[] }[] = [
  {
    title: "customers",
    fields: [
      { key: "customers", label: (t, n) => t.customers(capitalize(n.customer())), step: "1" },
      { key: "growth", label: (t, n) => t.growth(n.customer()), step: "0.5" },
      { key: "churn", label: (t, n) => t.churn(capitalize(n.customer())), suffix: () => "%", step: "0.5" },
    ],
  },
  {
    title: "usage",
    fields: [
      { key: "units", label: (t, n) => t.units(capitalize(n.unit()), n.customer(1)), average: true, step: "1" },
      { key: "price", label: (t, n) => t.price(n.unit(1)), money: true, step: "0.01" },
      { key: "subscription", label: (t, n) => t.subscription(n.customer(1)), money: true, step: "1" },
      { key: "vat", label: (t) => t.vat, suffix: () => "%", step: "1" },
    ],
  },
  {
    title: "costs",
    fields: [
      { key: "variable", label: (t, n) => t.variable(n.unit(1)), money: true, step: "0.01" },
      { key: "fixed", label: (t) => t.fixed, money: true, step: "10" },
      { key: "cac", label: (t, n) => t.cac(n.customer(1)), money: true, step: "5" },
    ],
  },
];

/** The same label a field has in the controls, for other panels that name it. */
export function fieldLabel(key: NumericKey, t: Messages, noun: Nouns): string {
  const field = GROUPS.flatMap((g) => g.fields).find((f) => f.key === key);
  return field ? field.label(t.fields, noun) : key;
}

const MONTHS_FIELD: FieldView = { key: "months", label: (t) => t.months, suffix: (t) => t.monthsSuffix, step: "1" };

type TextView = { key: TextKey; label: keyof Messages["text"]; hint?: keyof Messages["text"]; max: number };

const TEXT_FIELDS: TextView[] = [
  { key: "title", label: "title", max: 80 },
  { key: "customer", label: "customer", hint: "customerHint", max: 32 },
  { key: "customerPlural", label: "customerPlural", hint: "pluralHint", max: 32 },
  { key: "unit", label: "unit", hint: "unitHint", max: 32 },
  { key: "unitPlural", label: "unitPlural", hint: "pluralHint", max: 32 },
  { key: "currency", label: "currency", hint: "currencyHint", max: 3 },
  { key: "locale", label: "locale", hint: "localeHint", max: 35 },
];

interface NumberFieldProps {
  field: FieldView;
  settings: Settings;
  t: Messages;
  fmt: Formatter;
  average?: string;
  onChange(key: NumericKey, value: number): void;
}

/**
 * Keeps its own draft so a half-typed value ("0.", "") can sit in the box
 * without resetting the report; only valid numbers reach the settings.
 */
function NumberField({ field, settings, t, fmt, average, onChange }: NumberFieldProps) {
  const spec = NUMERIC_FIELDS.find((f) => f.key === field.key)!;
  const id = `f-${field.key}`;
  const value = settings[field.key];
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState<string | null>(null);

  // Follow outside changes (reset, a grid cell, back button) unless the draft already says the same.
  useEffect(() => {
    setDraft((current) => (Number(current.replace(",", ".")) === value && current.trim() !== "" ? current : String(value)));
    setError(null);
  }, [value]);

  return (
    <div className={`field${error ? " invalid" : ""}`}>
      <label htmlFor={id}>{field.label(t.fields, nouns(settings))}</label>
      <div className="input">
        {field.money ? <span className="affix pre">{fmt.currencySymbol}</span> : null}
        <input
          id={id}
          name={field.key}
          type="number"
          inputMode={spec.integer ? "numeric" : "decimal"}
          required
          min={spec.min}
          max={spec.max}
          step={field.step}
          value={draft}
          aria-invalid={error ? true : undefined}
          aria-describedby={[error ? `${id}-err` : "", average ? `${id}-avg` : ""].filter(Boolean).join(" ") || undefined}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            if (next.trim() === "") return setError(t.errors.required);
            const result = readNumber(spec, next);
            if (!result.ok) return setError(t.errors.range(fmt.integer(spec.min), fmt.integer(spec.max), Boolean(spec.integer)));
            setError(null);
            onChange(field.key, result.value);
          }}
        />
        {field.suffix ? <span className="affix">{field.suffix(t.fields)}</span> : null}
      </div>
      {error ? (
        <span className="err" id={`${id}-err`} role="alert">
          {error}
        </span>
      ) : null}
      {average ? (
        <span className="note average" id={`${id}-avg`} data-testid={`average-${field.key}`}>
          {average}
        </span>
      ) : null}
    </div>
  );
}

function TextField({ field, settings, t, onChange }: { field: TextView; settings: Settings; t: Messages; onChange(key: TextKey, raw: string): void }) {
  const id = `t-${field.key}`;
  const value = settings[field.key];
  const [draft, setDraft] = useState(value);
  // An empty draft means "use the default"; leave it empty while the user is clearing it.
  useEffect(() => setDraft((current) => (current.trim() === value || (current.trim() === "" && value === defaultsFor(settings.lang)[field.key]) ? current : value)), [value, settings.lang, field.key]);
  return (
    <div className="field">
      <label htmlFor={id}>{t.text[field.label]}</label>
      <div className="input text">
        <input
          id={id}
          name={field.key}
          type="text"
          maxLength={field.max}
          value={draft}
          placeholder={field.key.endsWith("Plural") ? nouns({ ...settings, customerPlural: "", unitPlural: "" })[field.key === "customerPlural" ? "customer" : "unit"]() : defaultsFor(settings.lang)[field.key]}
          autoComplete="off"
          onChange={(event) => {
            setDraft(event.target.value);
            onChange(field.key, event.target.value);
          }}
        />
      </div>
      {field.hint ? <span className="note">{t.text[field.hint]}</span> : null}
    </div>
  );
}

export interface ControlsProps {
  settings: Settings;
  /** Average revenue and contribution per customer per month, in cents. */
  perCustomer: { revenueCents: number; contributionCents: number };
  t: Messages;
  fmt: Formatter;
  onNumber(key: NumericKey, value: number): void;
  onText(key: TextKey, raw: string): void;
  children?: React.ReactNode;
}

export function Controls({ settings, perCustomer, t, fmt, onNumber, onText, children }: ControlsProps) {
  const labelsId = useId();
  const noun = nouns(settings);
  const average = t.fields.average(fmt.money(perCustomer.revenueCents), noun.customer(1), fmt.money(perCustomer.contributionCents), noun.unit());
  return (
    <aside className="rail">
      <form className="rail-form" noValidate onSubmit={(e) => e.preventDefault()}>
        {GROUPS.map((group) => (
          <section key={group.title} className="group" aria-label={t.groups[group.title]}>
            <h2>{t.groups[group.title]}</h2>
            {group.fields.map((field) => (
              <NumberField key={field.key} field={field} settings={settings} t={t} fmt={fmt} average={field.average ? average : undefined} onChange={onNumber} />
            ))}
          </section>
        ))}
        <section className="group" aria-label={t.groups.horizon}>
          <h2>{t.groups.horizon}</h2>
          <div className="pills" role="group" aria-label={t.fields.presets}>
            {MONTH_PRESETS.map((months) => (
              <button key={months} type="button" className="pill" aria-pressed={settings.months === months} onClick={() => onNumber("months", months)}>
                {months} {t.fields.presetSuffix}
              </button>
            ))}
          </div>
          <NumberField field={MONTHS_FIELD} settings={settings} t={t} fmt={fmt} onChange={onNumber} />
        </section>
        <details className="group">
          <summary id={labelsId}>
            <h2>{t.groups.labels}</h2>
          </summary>
          <div className="stack" aria-labelledby={labelsId}>
            {TEXT_FIELDS.map((field) => (
              <TextField key={field.key} field={field} settings={settings} t={t} onChange={onText} />
            ))}
          </div>
        </details>
      </form>
      {children}
    </aside>
  );
}
