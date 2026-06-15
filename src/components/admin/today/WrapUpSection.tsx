"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field } from "@/components/admin/Field";
import { PrimaryButton } from "@/components/admin/PrimaryButton";
import { wrapUpDayAction } from "@/app/admin/actions";

export type WrapUpItem = { id: string; name: string };

type WrapUpSectionProps = {
  items: WrapUpItem[];
  /** Prefill from today's daily_performance if already wrapped. */
  defaultRevenueCents?: number | null;
  defaultCustomerCount?: number | null;
  defaultEndOfDayNote?: string | null;
  /** Whether today has already been wrapped (drives the header treatment). */
  alreadyWrapped?: boolean;
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

/**
 * Collapsed-by-default end-of-day form. Revenue is entered in dollars and
 * converted to integer cents on submit. Per-item units are optional — only
 * the items the owner bothers to fill get logged.
 */
export function WrapUpSection({
  items,
  defaultRevenueCents,
  defaultCustomerCount,
  defaultEndOfDayNote,
  alreadyWrapped = false,
}: WrapUpSectionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [revenue, setRevenue] = useState(centsToDollars(defaultRevenueCents));
  const [customers, setCustomers] = useState(
    defaultCustomerCount != null ? String(defaultCustomerCount) : ""
  );
  const [note, setNote] = useState(defaultEndOfDayNote ?? "");
  const [units, setUnits] = useState<Record<string, string>>({});
  const [showUnits, setShowUnits] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const perItemUnits = items
      .map((item) => ({ menuItemId: item.id, value: units[item.id] }))
      .filter((entry) => entry.value != null && entry.value.trim() !== "")
      .map((entry) => ({ menuItemId: entry.menuItemId, units: toCount(entry.value!) ?? 0 }))
      .filter((entry) => entry.units >= 0);

    startTransition(async () => {
      await wrapUpDayAction({
        revenueCents: dollarsToCents(revenue),
        customerCount: toCount(customers),
        endOfDayNote: note.trim() || null,
        perItemUnits: perItemUnits.length ? perItemUnits : undefined,
      });
      router.refresh();
      setOpen(false);
    });
  }

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:rounded-card"
      >
        <span className="flex items-center gap-2">
          <span className="font-display text-2xl leading-none text-text-primary">
            Wrap up today
          </span>
          {alreadyWrapped ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-status-open-bg">
              <Check className="size-3.5" /> Logged
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-text-secondary transition-transform duration-base",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-5">
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

          <PrimaryButton type="submit" disabled={isPending}>
            {isPending ? "Saving…" : alreadyWrapped ? "Update the day" : "Save the day"}
          </PrimaryButton>
        </form>
      ) : null}
    </section>
  );
}
