import type { Projection } from "@/domain/types";
import type { Formatter } from "@/format/format";
import type { Messages } from "@/i18n/messages";
import type { Nouns } from "@/i18n/nouns";

interface KpiProps {
  label: string;
  value: React.ReactNode;
  hint: string;
  tone?: "pos" | "neg";
  children?: React.ReactNode;
}

function Kpi({ label, value, hint, tone, children }: KpiProps) {
  return (
    <div className="kpi">
      <span className="label">{label}</span>
      <span className={`value ${tone ?? ""}`}>{value}</span>
      {children}
      <span className="hint">{hint}</span>
    </div>
  );
}

export function Kpis({ projection: p, months, t, fmt, noun }: { projection: Projection; months: number; t: Messages; fmt: Formatter; noun: Nouns }) {
  const start = p.months[0]?.customers ?? 0;
  const end = p.months.at(-1)?.customers ?? 0;
  const threshold = p.breakEvenCustomers;
  const scaleMax = Math.max(end, start, threshold ?? 0, 1) * 1.1;
  const pct = (v: number) => `${Math.min(100, (v / scaleMax) * 100).toFixed(1)}%`;
  const meter = t.kpi.meter(fmt.integer(start), fmt.integer(end));
  const sign = (v: number | null) => (v === null ? undefined : v >= 0 ? "pos" : "neg");

  return (
    <div className="kpis">
      <Kpi
        label={t.kpi.threshold}
        value={
          threshold === null ? (
            t.kpi.never
          ) : (
            <>
              {fmt.integer(threshold)} <small className="value-unit">{noun.customer(threshold)}</small>
            </>
          )
        }
        tone={threshold === null ? "neg" : undefined}
        hint={t.kpi.contribution(fmt.money(p.contributionPerCustomerCents), noun.unit())}
      >
        {threshold === null ? null : (
          <>
            <div className="meter" role="img" aria-label={t.kpi.meterLabel(fmt.integer(start), fmt.integer(end), fmt.integer(threshold))}>
              <div className="fill" style={{ width: pct(end) }} />
              <div className="mark" style={{ left: pct(threshold) }} />
            </div>
            <div className="meter-legend">
              <span>{meter.start}</span>
              <span>{meter.end}</span>
            </div>
          </>
        )}
      </Kpi>
      <Kpi
        label={t.kpi.firstMonth}
        value={p.breakEvenMonth === null ? t.kpi.notYet : `M${p.breakEvenMonth}`}
        tone={p.breakEvenMonth === null ? "neg" : undefined}
        hint={p.paybackMonth === null ? t.kpi.notRepaid(months) : t.kpi.repaidIn(p.paybackMonth)}
      />
      <Kpi
        label={t.kpi.margin(months)}
        value={fmt.moneyShort(p.totalMarginCents)}
        tone={sign(p.totalMarginCents)}
        hint={t.kpi.marginHint(fmt.moneyShort(p.totalRevenueCents), fmt.moneyShort(p.totalCostCents))}
      />
      <Kpi label={t.kpi.rate} value={fmt.percent(p.marginRate)} tone={sign(p.marginRate)} hint={t.kpi.rateHint} />
    </div>
  );
}
