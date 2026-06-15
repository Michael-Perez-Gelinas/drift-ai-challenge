export type ItemUnits = { item_name: string; units_sold: number | null };

/** The item with the highest tracked units_sold; null if none are tracked. */
export function topSeller<T extends ItemUnits>(items: T[]): T | null {
  const tracked = items.filter((i) => i.units_sold !== null);
  if (tracked.length === 0) return null;
  return tracked.reduce((best, i) =>
    (i.units_sold ?? 0) > (best.units_sold ?? 0) ? i : best
  );
}

/** Whole-dollar revenue string from cents; em dash when not logged. */
export function formatRevenue(cents: number | null): string {
  if (cents === null) return "—";
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}
