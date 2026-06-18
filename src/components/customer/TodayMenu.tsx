/**
 * TodayMenu — public, read-only menu display for the Drift customer site.
 *
 * Plain Server Component (no state, no interactivity). Groups items by category
 * in first-seen order; items with a null/blank category fall into a "More" group
 * rendered last. Typography-led list with thin warm dividers — NOT a card grid.
 */
export type TodayMenuItem = {
  name: string;
  description: string | null;
  price: number; // integer cents
  category: string | null;
  is_sold_out: boolean;
};

export type TodayMenuProps = {
  items: TodayMenuItem[];
};

const MORE_LABEL = "More";

type MenuGroup = {
  category: string;
  items: TodayMenuItem[];
};

/** Group by category, preserving first-seen order; null/blank → a trailing "More" group. */
function groupByCategory(items: TodayMenuItem[]): MenuGroup[] {
  const groups = new Map<string, TodayMenuItem[]>();
  for (const item of items) {
    const key = item.category?.trim() || MORE_LABEL;
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }

  // Float the "More" group to the end while keeping all others in first-seen order.
  const ordered = Array.from(groups, ([category, groupItems]) => ({
    category,
    items: groupItems,
  }));
  ordered.sort((a, b) => {
    if (a.category === MORE_LABEL) return 1;
    if (b.category === MORE_LABEL) return -1;
    return 0;
  });
  return ordered;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function TodayMenu({ items }: TodayMenuProps) {
  if (items.length === 0) {
    return (
      <p className="font-display text-2xl text-text-muted">Menu coming soon</p>
    );
  }

  const groups = groupByCategory(items);

  return (
    <div className="flex flex-col gap-10">
      {groups.map((group) => (
        <section key={group.category}>
          <h3 className="font-display text-2xl text-brand-primary">
            {group.category}
          </h3>
          <ul className="mt-3 flex flex-col">
            {group.items.map((item, i) => {
              const soldOut = item.is_sold_out;
              return (
                <li
                  key={`${group.category}-${i}`}
                  className="flex items-baseline justify-between gap-4 border-b border-border-default py-4 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span
                        className={`text-lg font-medium ${
                          soldOut ? "text-text-muted" : "text-text-primary"
                        }`}
                      >
                        {item.name}
                      </span>
                      {soldOut ? (
                        <span className="shrink-0 rounded-full bg-status-sold-out-bg px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-status-sold-out-text">
                          Sold out
                        </span>
                      ) : null}
                    </div>
                    {item.description ? (
                      <p
                        className={`mt-1 text-sm ${
                          soldOut ? "text-text-muted" : "text-text-secondary"
                        }`}
                      >
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`shrink-0 text-lg tabular-nums ${
                      soldOut ? "text-text-muted" : "text-text-primary"
                    }`}
                  >
                    {formatPrice(item.price)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
