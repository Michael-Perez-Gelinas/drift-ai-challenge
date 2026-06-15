"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/admin/Field";
import { PrimaryButton } from "@/components/admin/PrimaryButton";
import { SecondaryButton } from "@/components/admin/SecondaryButton";
import { updateDayAction } from "@/app/admin/actions";

type DayNumbersFormProps = {
  date: string;
  defaultRevenueCents: number | null;
  defaultCustomerCount: number | null;
  defaultEndOfDayNote: string | null;
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

/**
 * Edits the wrap-up numbers for one logged day: revenue (dollars → cents),
 * customer count, and the end-of-day note. Per-item units stay read-only —
 * the day's item snapshots don't carry menu_item ids, so they can't be re-keyed
 * here without an extra fetch. Calls updateDayAction, then refreshes the route.
 */
export function DayNumbersForm({
  date,
  defaultRevenueCents,
  defaultCustomerCount,
  defaultEndOfDayNote,
}: DayNumbersFormProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [revenue, setRevenue] = useState(centsToDollars(defaultRevenueCents));
  const [customers, setCustomers] = useState(
    defaultCustomerCount === null ? "" : String(defaultCustomerCount)
  );
  const [note, setNote] = useState(defaultEndOfDayNote ?? "");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setRevenue(centsToDollars(defaultRevenueCents));
    setCustomers(defaultCustomerCount === null ? "" : String(defaultCustomerCount));
    setNote(defaultEndOfDayNote ?? "");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await updateDayAction(date, {
        revenueCents: dollarsToCents(revenue),
        customerCount: toCount(customers),
        endOfDayNote: note.trim() || null,
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
