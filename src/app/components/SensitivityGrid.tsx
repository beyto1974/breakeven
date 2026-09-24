import type { SensitivityGrid as Grid } from "@/domain/sensitivity";
import type { Formatter } from "@/format/format";
import type { Messages } from "@/i18n/messages";
import { capitalize, type Nouns } from "@/i18n/nouns";
import { reach, type Reach } from "@/report/heat";

const TONES: Record<Reach, string> = { now: "tone-now", horizon: "tone-horizon", beyond: "tone-beyond", never: "tone-never" };

interface Props {
  grid: Grid;
  startCustomers: number;
  endCustomers: number;
  months: number;
  t: Messages;
  fmt: Formatter;
  noun: Nouns;
  onApply(unitPriceCents: number, unitsPerCustomer: number): void;
}

export function SensitivityGrid({ grid, startCustomers, endCustomers, months, t, fmt, noun, onApply }: Props) {
  const factor = (f: number) => (f === 1 ? t.heat.now : `${f > 1 ? "+" : "−"}${Math.round(Math.abs(f - 1) * 100)}%`);
  const rows = [...grid.rows].reverse();
  const header = rows[0]?.cells ?? [];
  return (
    <>
      <div className="heat-wrap">
        <table className="heat">
          <thead>
            <tr>
              <th className="corner">{t.heat.corner(capitalize(noun.unit()))}</th>
              {header.map((c) => (
                <th key={c.priceFactor} scope="col">
                  {fmt.unitPrice(c.unitPriceCents)}
                  <br />
                  <span className="dim">{factor(c.priceFactor)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.unitsFactor}>
                <th scope="row">
                  {fmt.integer(row.unitsPerCustomer)}
                  <br />
                  <span className="dim">{factor(row.unitsFactor)}</span>
                </th>
                {row.cells.map((c) => {
                  const count = c.breakEvenCustomers;
                  const label = count === null ? "—" : fmt.integer(count);
                  const result = count === null ? t.heat.never : t.heat.needed(label, noun.customer(count), c.breakEvenMonth);
                  const title = t.heat.cell(fmt.unitPrice(c.unitPriceCents), noun.unit(1), fmt.integer(row.unitsPerCustomer), noun.unit(row.unitsPerCustomer), noun.customer(1), result);
                  return (
                    <td key={c.priceFactor}>
                      <button
                        type="button"
                        className={`${TONES[reach(count, startCustomers, endCustomers)]}${c.isCurrent ? " current" : ""}`}
                        title={title}
                        aria-label={title}
                        aria-current={c.isCurrent ? "true" : undefined}
                        onClick={() => onApply(c.unitPriceCents, row.unitsPerCustomer)}
                      >
                        {label}
                        <small>{c.breakEvenMonth === null ? t.heat.noTurn : `M${c.breakEvenMonth}`}</small>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="scale-note">
        <span>
          <i className="tone-now" />
          {t.heat.legend.now}
        </span>
        <span>
          <i className="tone-horizon" />
          {t.heat.legend.horizon(months)}
        </span>
        <span>
          <i className="tone-beyond" />
          {t.heat.legend.beyond}
        </span>
        <span>
          <i className="tone-never" />
          {t.heat.legend.never}
        </span>
      </div>
    </>
  );
}
