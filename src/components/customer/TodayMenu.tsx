/**
 * STUB — replaced by the Menu agent.
 *
 * Contract (do not change): groups items by category (first-seen order; null →
 * "More"), renders a typography-led list (NOT a card grid). Each item shows
 * name, description, price `$${(price/100).toFixed(2)}`. Sold-out items get a
 * tasteful "Sold out" mark and muted treatment.
 */
export type TodayMenuItem = {
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  is_sold_out: boolean;
};

export type TodayMenuProps = {
  items: TodayMenuItem[];
};

export function TodayMenu({ items }: TodayMenuProps) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-baseline justify-between gap-4">
          <span
            className={
              item.is_sold_out ? "text-text-muted line-through" : "text-text-primary"
            }
          >
            {item.name}
            {item.is_sold_out ? " — Sold out" : ""}
          </span>
          <span className="text-text-secondary">
            ${(item.price / 100).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}
