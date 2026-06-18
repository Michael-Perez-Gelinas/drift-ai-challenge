"use client";

import { useState, useTransition } from "react";
import { Field } from "@/components/admin/Field";
import { PrimaryButton } from "@/components/admin/PrimaryButton";
import { SecondaryButton } from "@/components/admin/SecondaryButton";
import type { WrapUpInput } from "@/app/admin/actions";

export type WrapUpItem = { id: string; name: string };

type WrapUpFormProps = {
  items: WrapUpItem[];
  /** Prefill from today's daily_performance if already logged. */
  defaultRevenueCents?: number | null;
  defaultCustomerCount?: number | null;
  defaultEndOfDayNote?: string | null;
  /** Prefill per-item units, keyed by menu item id. */
  defaultUnits?: Record<string, number | null>;
  /** Primary submit: receives the parsed wrap-up input. */
  onSubmit: (input: WrapUpInput) => Promise<void>;
  primaryLabel: string;
  primaryPendingLabel?: string;
  /** Optional secondary action (e.g. "Just close" — close without logging). */
  secondaryLabel?: string;
  onSecondary?: () => Promise<void>;
};

function centsToDollars(cents?: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

/** Dollars string → integer cents, or null when blank/invalid. */
function dollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed.replace(/[$,]/g, ""));
  if (Number.isNaN(parsed)) return null;
  return Math.round(parsed * 100);
}

function toCount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

function unitsToString(units?: number | null): string {
  return units == null ? "" : String(units);
}

/**
 * The end-of-day wrap-up fields, shared between closing the truck and editing
 * the logged numbers afterward. Revenue is entered in dollars and converted to
 * integer cents on submit. Per-item units are optional — only items the owner
 * fills get logged. A `units` value of null explicitly clears a prior count.
 */
export function WrapUpForm({
  items,
  defaultRevenueCents,
  defaultCustomerCount,
  defaultEndOfDayNote,
  defaultUnits,
  onSubmit,
  primaryLabel,
  primaryPendingLabel = "Saving…",
  secondaryLabel,
  onSecondary,
}: WrapUpFormProps) {
  const [isPending, startTransition] = useTransition();

  const [revenue, setRevenue] = useState(centsToDollars(defaultRevenueCents));
  const [customers, setCustomers] = useState(
    defaultCustomerCount != null ? String(defaultCustomerCount) : ""
  );
  const [note, setNote] = useState(defaultEndOfDayNote ?? "");
  const [units, setUnits] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const item of items) {
      seed[item.id] = unitsToString(defaultUnits?.[item.id]);
    }
    return seed;
  });
  // Open the per-item list up front when there are already counts to edit.
  const [showUnits, setShowUnits] = useState(
    Object.values(defaultUnits ?? {}).some((u) => u != null)
  );

  function buildInput(): WrapUpInput {
    const perItemUnits = items
      .map((item) => ({ menuItemId: item.id, units: toCount(units[item.id] ?? "") }))
      .filter((entry) => entry.units !== null);

    return {
      revenueCents: dollarsToCents(revenue),
      customerCount: toCount(customers),
      endOfDayNote: note.trim() || null,
      perItemUnits: perItemUnits.length ? perItemUnits : undefined,
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await onSubmit(buildInput());
    });
  }

  function handleSecondary() {
    if (!onSecondary) return;
    startTransition(async () => {
      await onSecondary();
    });
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
        label="Customers served"
        inputMode="numeric"
        placeholder="0"
        value={customers}
        onChange={(e) => setCustomers(e.target.value)}
      />

      {items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {showUnits ? (
            <ul className="flex flex-col">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 border-b border-border-default py-2 last:border-b-0"
                >
                  <span className="text-sm text-text-primary">{item.name}</span>
                  <input
                    inputMode="numeric"
                    placeholder="—"
                    value={units[item.id] ?? ""}
                    onChange={(e) =>
                      setUnits((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    aria-label={`${item.name} units sold`}
                    className="h-10 w-20 rounded-card border border-border-default bg-surface-raised px-3 text-right text-base text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <button
              type="button"
              onClick={() => setShowUnits(true)}
              className="self-start text-sm font-medium text-brand-primary underline-offset-4 hover:underline"
            >
              + Count units per item
            </button>
          )}
        </div>
      ) : null}

      <Field
        as="textarea"
        label="End-of-day note"
        placeholder="Sold out by 1. Slow start, big lunch rush."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className="flex flex-col gap-3">
        <PrimaryButton type="submit" disabled={isPending}>
          {isPending ? primaryPendingLabel : primaryLabel}
        </PrimaryButton>
        {secondaryLabel && onSecondary ? (
          <SecondaryButton
            type="button"
            fullWidth
            onClick={handleSecondary}
            disabled={isPending}
          >
            {secondaryLabel}
          </SecondaryButton>
        ) : null}
      </div>
    </form>
  );
}
