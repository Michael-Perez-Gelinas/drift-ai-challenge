export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number; // integer cents
  category: string | null;
  image_url: string | null;
  is_sold_out: boolean;
  sort_order: number;
};

/** Common food-truck categories, suggested in the category input. */
export const CATEGORY_SUGGESTIONS = [
  "Tacos",
  "Sides",
  "Drinks",
  "Extras",
] as const;

/** "1234" (cents) -> "12.34" for display. */
export function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Parse a dollar string ("12", "12.5", "$12.50") into integer cents.
 * Returns null when the input isn't a valid non-negative amount.
 */
export function dollarsToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  if (!/^\d*\.?\d*$/.test(cleaned)) return null;
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value) || value < 0) return null;
  return Math.round(value * 100);
}
