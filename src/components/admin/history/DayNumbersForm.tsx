"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/admin/Field";
import { PrimaryButton } from "@/components/admin/PrimaryButton";
import { SecondaryButton } from "@/components/admin/SecondaryButton";
import { updateDayAction } from "@/app/admin/actions";

export type DayNumbersItem = {
  menu_item_id: string | null;
  item_name: string;
  units_sold: number | null;
};

type DayNumbersFormProps = {
  date: string;
  defaultRevenueCents: number | null;
  defaultCustomerCount: number | null;
  defaultEndOfDayNote: string | null;
  /** The day's logged items. Only those with a menu_item_id can have units edited. */
  items: DayNumbersItem[];
};

/** Cents → a clean dollar string for the input ("4200" → "42", "4250" → "42.50"). */
function centsToDollars(cents: number | null): string {
  if (cents === null) return "";
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2);
}

/** Dollar string → integer cents, or null when blank/invalid. */
function dollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const dollars = Number.parseFloat(trimmed);
  if (Number.isNaN(dollars)) return null;
  return Math.round(dollars * 100);
}

/** Integer string → non-negative int, or null when blank/invalid. */
function toCount(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number.parseInt(trimmed, 10);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

function initialUnits(items: DayNumbersItem[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of items) {
    if (item.menu_item_id) {
      out[item.menu_item_id] = item.units_sold === null ? "" : String(item.units_sold);
    }
  }
  return out;
}

/**
 * Edits the wrap-up numbers for one logged day: revenue (dollars → cents),
 * customer count, end-of-day note, and per-item units sold. Items whose menu
 * row was deleted (no menu_item_id) are shown read-only. Calls updateDayAction,
 * then refreshes the route.
 */
export function DayNumbersForm({
  date,
  defaultRevenueCents,
  defaultCustomerCount,
  defaultEndOfDayNote,
  items,
}: DayNumbersFormProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [revenue, setRevenue] = useState(centsToDollars(defaultRevenueCents));
  const [customers, setCustomers] = useState(
    defaultCustomerCount === null ? "" : String(defaultCustomerCount)
  );
  const [note, setNote] = useState(defaultEndOfDayNote ?? "");
  const [units, setUnits] = useState<Record<string, string>>(() => initialUnits(items));
  const [isPending, startTransition] = useTransition();

  const editableItems = items.filter((i) => i.menu_item_id);

  function reset() {
    setRevenue(centsToDollars(defaultRevenueCents));
    setCustomers(defaultCustomerCount === null ? "" : String(defaultCustomerCount));
    setNote(defaultEndOfDayNote ?? "");
    setUnits(initialUnits(items));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const perItemUnits = editableItems
      .map((item) => ({ menuItemId: item.menu_item_id as string, units: toCount(units[item.menu_item_id as string] ?? "") }))
      .filter(
        (entry): entry is { menuItemId: string; units: number } => entry.units !== null
      );

    startTransition(async () => {
      await updateDayAction(date, {
        revenueCents: dollarsToCents(revenue),
        customerCount: toCount(customers),
        endOfDayNote: note.trim() || null,
        perItemUnits: perItemUnits.length ? perItemUnits : undefined,
      });
      router.refresh();
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <SecondaryButton fullWidth onClick={() => setEditing(true)}>
        Edit the numbers
      </SecondaryButton>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field
        label="Revenue"
        hint="Total for the day, in dollars."
        inputMode="decimal"
        placeholder="0.00"
        value={revenue}
        onChange={(e) => setRevenue(e.target.value)}
      />
      <Field
        label="Customers"
        hint="Rough headcount is fine."
        inputMode="numeric"
        placeholder="0"
        value={customers}
        onChange={(e) => setCustomers(e.target.value)}
      />

      {editableItems.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-text-secondary">Units sold</span>
          <ul className="flex flex-col">
            {editableItems.map((item) => {
              const id = item.menu_item_id as string;
              return (
                <li
                  key={id}
                  className="flex items-center justify-between gap-4 border-b border-border-default py-2 last:border-b-0"
                >
                  <span className="text-sm text-text-primary">{item.item_name}</span>
                  <input
                    inputMode="numeric"
                    placeholder="—"
                    value={units[id] ?? ""}
                    onChange={(e) =>
                      setUnits((prev) => ({ ...prev, [id]: e.target.value }))
                    }
                    aria-label={`${item.item_name} units sold`}
                    className="h-10 w-20 rounded-card border border-border-default bg-surface-raised px-3 text-right text-base text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30"
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <Field
        as="textarea"
        label="End-of-day note"
        hint="Optional — how it went, what to remember."
        placeholder="Sold out of brisket by 1. Slow lunch, busy dinner."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex flex-col gap-3">
        <PrimaryButton type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save the numbers"}
        </PrimaryButton>
        <SecondaryButton
          fullWidth
          type="button"
          disabled={isPending}
          onClick={() => {
            reset();
            setEditing(false);
          }}
        >
          Cancel
        </SecondaryButton>
      </div>
    </form>
  );
}
