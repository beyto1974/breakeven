/**
 * Axis arithmetic shared by every chart: a domain rounded out to readable
 * steps, so each gridline label names a value the chart can reach.
 */
export interface NiceScale {
  min: number;
  max: number;
  step: number;
  ticks: number[];
}

function niceStep(rough: number): number {
  const power = 10 ** Math.floor(Math.log10(rough));
  const mantissa = rough / power;
  const nice = mantissa <= 1 ? 1 : mantissa <= 2 ? 2 : mantissa <= 5 ? 5 : 10;
  return nice * power;
}

/** A domain covering [low, high] and zero, split into about `count` steps. */
export function niceScale(low: number, high: number, count: number): NiceScale {
  const lo = Math.min(0, low);
  const hi = Math.max(0, high);
  if (hi - lo <= 0) return { min: 0, max: 1, step: 1, ticks: [0, 1] };
  const step = niceStep((hi - lo) / Math.max(1, count));
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let i = 0; min + i * step <= max + step / 2; i += 1) {
    // Rebuilt from the index, not accumulated: repeated addition drifts.
    ticks.push(Number((min + i * step).toPrecision(12)));
  }
  return { min, max, step, ticks };
}

export function linear([d0, d1]: readonly [number, number], [r0, r1]: readonly [number, number]): (value: number) => number {
  const span = d1 - d0;
  if (span === 0) return () => r0;
  return (value) => r0 + ((value - d0) / span) * (r1 - r0);
}
