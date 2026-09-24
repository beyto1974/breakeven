"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fromCents } from "@/domain/money";
import { project } from "@/domain/projection";
import { sensitivity } from "@/domain/sensitivity";
import { exportFileName, toCsv, toJson } from "@/export/export";
import { createFormatter } from "@/format/format";
import { LANGS, type Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { capitalize, nouns } from "@/i18n/nouns";
import { summarize } from "@/report/summary";
import { defaultsFor, parseSettings, serializeSettings, switchLang, toProjectionInput, type NumericKey, type TextKey } from "@/query/settings";
import { Controls } from "./Controls";
import { Kpis } from "./Kpis";
import { MonthlyTable } from "./MonthlyTable";
import { ProjectionChart } from "./ProjectionChart";
import { SensitivityGrid } from "./SensitivityGrid";
import { useUrlSettings } from "./useUrlSettings";

/** Escapes nothing (React does); splits the sentence around each highlighted figure, in order. */
function Emphasised({ sentence, highlights }: { sentence: string; highlights: string[] }) {
  const parts: React.ReactNode[] = [];
  let rest = sentence;
  highlights.forEach((figure, i) => {
    const at = rest.indexOf(figure);
    if (at < 0) return;
    parts.push(rest.slice(0, at), <b key={i}>{figure}</b>);
    rest = rest.slice(at + figure.length);
  });
  parts.push(rest);
  return <>{parts}</>;
}

function download(name: string, type: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Report() {
  const { settings, warnings, update, reset } = useUrlSettings();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const t = messages(settings.lang);
  const fmt = useMemo(() => createFormatter(settings), [settings.locale, settings.currency]); // eslint-disable-line react-hooks/exhaustive-deps
  const noun = nouns(settings);
  const input = useMemo(() => toProjectionInput(settings), [settings]);
  const projection = useMemo(() => project(input), [input]);
  const grid = useMemo(() => sensitivity(input), [input]);
  const summary = summarize(projection, settings, fmt);
  const query = serializeSettings(settings);

  useEffect(() => {
    document.documentElement.lang = settings.lang;
    document.title = settings.title;
  }, [settings.lang, settings.title]);

  const say = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  };

  const onNumber = (key: NumericKey, value: number) => update({ [key]: value });
  const onText = (key: TextKey, raw: string) => {
    // Clearing a field returns it to the language default; anything else goes through the codec's checks.
    const fallback = defaultsFor(settings.lang)[key];
    if (raw.trim() === "") return update({ [key]: fallback });
    const parsed = parseSettings(new URLSearchParams({ lang: settings.lang, [key]: raw }));
    if (parsed.warnings.length === 0) update({ [key]: parsed.settings[key] });
  };
  const onLang = (lang: Lang) => update(switchLang(settings, lang));

  const link = () => `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ""}`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link());
      say(t.actions.copied);
    } catch {
      say(t.actions.copyFallback);
    }
  };

  const start = projection.months[0]?.customers ?? 0;
  const end = projection.months.at(-1)?.customers ?? 0;

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 18 L9 12 L13 15 L21 6" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="21" cy="6" r="2.2" fill="var(--profit)" />
          </svg>
          Rentability
        </div>
        <div className="langs" role="group" aria-label={t.language}>
          {LANGS.map((lang) => (
            <button key={lang} type="button" className="pill" lang={lang} aria-pressed={settings.lang === lang} title={messages(lang).langName} onClick={() => onLang(lang)}>
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <Controls
        settings={settings}
        perCustomer={{ revenueCents: projection.revenuePerCustomerCents, contributionCents: projection.contributionPerCustomerCents }}
        t={t} fmt={fmt} onNumber={onNumber} onText={onText}>
        <section className="group" aria-label={t.groups.share}>
          <h2>{t.groups.share}</h2>
          <div className="link" data-testid="share-query">
            /{query ? `?${query}` : ""}
          </div>
          <div className="actions">
            <button type="button" className="btn primary" onClick={copyLink}>
              {t.actions.copyLink}
            </button>
            <button type="button" className="btn" onClick={() => download(exportFileName(settings, "json"), "application/json", toJson(settings, projection))}>
              {t.actions.json}
            </button>
            <button type="button" className="btn" onClick={() => download(exportFileName(settings, "csv"), "text/csv", toCsv(projection))}>
              {t.actions.csv}
            </button>
            <button
              type="button"
              className="btn wide"
              onClick={() => {
                reset();
                say(t.actions.resetDone);
              }}
            >
              {t.actions.reset}
            </button>
          </div>
        </section>
      </Controls>

      <main className="report">
        <header className="hero">
          <div className="hero-top">
            <span className={`verdict ${summary.verdict}`} data-testid="verdict">
              {t.verdict[summary.verdict]}
            </span>
          </div>
          <h1>{settings.title}</h1>
          <p aria-live="polite" data-testid="summary">
            <Emphasised sentence={summary.sentence} highlights={summary.highlights} />
          </p>
          {warnings.length ? (
            <div className="warnings">
              {warnings.map((w) => (
                <span key={w.param} className="warning">
                  {t.warning(w.param, w.value, t.reasons[w.reason], String(defaultsFor(settings.lang)[w.param]))}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        <Kpis projection={projection} months={settings.months} t={t} fmt={fmt} noun={noun} />

        <section className="card" aria-labelledby="chart-title">
          <div className="card-head">
            <h2 id="chart-title">{t.chart.title}</h2>
            <div className="legend">
              <span>
                <i className="line" style={{ background: "var(--accent)" }} />
                {t.chart.revenue}
              </span>
              <span>
                <i style={{ background: "var(--cost-fixed)" }} />
                {t.chart.fixed}
              </span>
              <span>
                <i style={{ background: "var(--cost-variable)" }} />
                {t.chart.variable}
              </span>
              {settings.cac > 0 ? (
                <span>
                  <i style={{ background: "var(--cost-acq)" }} />
                  {t.chart.acquisition}
                </span>
              ) : null}
              <span>
                <i style={{ background: "var(--profit)", opacity: 0.5 }} />
                {t.chart.cumulative}
              </span>
            </div>
          </div>
          <ProjectionChart projection={projection} t={t} fmt={fmt} noun={noun} />
        </section>

        <section className="card" aria-labelledby="heat-title">
          <div className="card-head">
            <h2 id="heat-title">{t.heat.title}</h2>
            <span className="sub">{t.heat.sub(capitalize(noun.customer()))}</span>
          </div>
          <SensitivityGrid
            grid={grid}
            startCustomers={start}
            endCustomers={end}
            months={settings.months}
            t={t}
            fmt={fmt}
            noun={noun}
            onApply={(priceCents, units) => {
              update({ price: fromCents(priceCents), units });
              say(t.actions.applied);
            }}
          />
        </section>

        <section className="card" aria-labelledby="table-title">
          <div className="card-head">
            <h2 id="table-title">{t.table.title}</h2>
            <span className="sub">{t.table.sub(settings.months, settings.currency)}</span>
          </div>
          <MonthlyTable projection={projection} t={t} fmt={fmt} noun={noun} />
        </section>

        <p className="footnote">{t.footnote}</p>
      </main>

      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
