import type { Projection } from "@/domain/types";
import type { Formatter } from "@/format/format";
import type { Messages } from "@/i18n/messages";
import { capitalize, type Nouns } from "@/i18n/nouns";

const tone = (v: number) => (v < 0 ? "neg" : v > 0 ? "pos" : "");

export function MonthlyTable({ projection: p, t, fmt, noun }: { projection: Projection; t: Messages; fmt: Formatter; noun: Nouns }) {
  return (
    <div className="table-wrap" tabIndex={0} aria-label={t.table.title}>
      <table className="months" data-testid="monthly-table">
        <thead>
          <tr>
            <th>{t.table.month}</th>
            <th>{capitalize(noun.customer())}</th>
            <th>{capitalize(noun.unit())}</th>
            <th>{t.table.revenue}</th>
            <th>{t.table.costs}</th>
            <th>{t.table.margin}</th>
            <th>{t.table.cumulative}</th>
          </tr>
        </thead>
        <tbody>
          {p.months.map((m) => {
            const mark = m.month === p.breakEvenMonth ? t.table.breakEven : m.month === p.paybackMonth ? t.table.payback : "";
            return (
              <tr key={m.month} className={mark ? "mark" : undefined}>
                <td data-mark={mark || undefined}>M{m.month}</td>
                <td>{fmt.integer(m.customers)}</td>
                <td>{fmt.integer(m.units)}</td>
                <td>{fmt.money(m.revenueCents)}</td>
                <td>{fmt.money(m.costCents)}</td>
                <td className={tone(m.marginCents)}>{fmt.money(m.marginCents)}</td>
                <td className={tone(m.cumulativeMarginCents)}>{fmt.money(m.cumulativeMarginCents)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
