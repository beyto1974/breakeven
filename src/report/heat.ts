/**
 * How reachable a break-even threshold is, given the customers the projection
 * starts and ends with. The sensitivity grid colours cells by it.
 */
export type Reach = "now" | "horizon" | "beyond" | "never";

export function reach(threshold: number | null, startCustomers: number, endCustomers: number): Reach {
  if (threshold === null) return "never";
  if (threshold <= startCustomers) return "now";
  if (threshold <= Math.max(startCustomers, endCustomers)) return "horizon";
  return "beyond";
}
