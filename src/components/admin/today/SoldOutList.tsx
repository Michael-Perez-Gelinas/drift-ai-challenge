"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Toggle } from "@/components/admin/Toggle";
import { toggleSoldOutAction } from "@/app/admin/actions";

export type SoldOutItem = {
  id: string;
  name: string;
  category: string | null;
  isSoldOut: boolean;
};

type SoldOutListProps = {
  items: SoldOutItem[];
};

const UNCATEGORIZED = "More";

function groupByCategory(items: SoldOutItem[]): [string, SoldOutItem[]][] {
  const groups = new Map<string, SoldOutItem[]>();
  for (const item of items) {
    const key = item.category?.trim() || UNCATEGORIZED;
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }
  return Array.from(groups.entries());
}

/**
 * Every available item, grouped by category, each with a large sold-out
 * toggle. Optimistic-ish: we flip local state immediately, fire the action,
 * then refresh so the server stays source of truth.
 */
export function SoldOutList({ items }: SoldOutListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  function toggle(item: SoldOutItem) {
    const current = optimistic[item.id] ?? item.isSoldOut;
    const next = !current;
    setOptimistic((prev) => ({ ...prev, [item.id]: next }));
    startTransition(async () => {
      await toggleSoldOutAction(item.id, next);
      router.refresh();
    });
  }

  const groups = groupByCategory(items);

  return (
    <div className="flex flex-col gap-7">
      {groups.map(([category, groupItems]) => (
        <div key={category} className="flex flex-col gap-1">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">
            {category}
          </p>
          <ul className="flex flex-col">
            {groupItems.map((item) => {
              const soldOut = optimistic[item.id] ?? item.isSoldOut;
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 border-b border-border-default py-3 last:border-b-0"
                >
                  <span
                    className={
                      soldOut
                        ? "text-base text-text-muted line-through"
                        : "text-base text-text-primary"
                    }
                  >
                    {item.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        soldOut
                          ? "text-xs font-medium text-status-sold-out-text"
                          : "text-xs text-text-muted"
                      }
                    >
                      {soldOut ? "Sold out" : "Available"}
                    </span>
                    <Toggle
                      checked={soldOut}
                      onChange={() => toggle(item)}
                      disabled={pending}
                      label={`${item.name} sold out`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
