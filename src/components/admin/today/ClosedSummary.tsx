"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SecondaryButton } from "@/components/admin/SecondaryButton";
import { Sheet } from "@/components/admin/menu/Sheet";
import { reopenAction, wrapUpDayAction, type WrapUpInput } from "@/app/admin/actions";
import { topSeller, formatRevenue } from "@/lib/daily-log/stats";
import { WrapUpForm } from "./WrapUpForm";

export type ClosedSummaryItem = {
  menu_item_id: string | null;
  item_name: string;
  units_sold: number | null;
};

type ClosedSummaryProps = {
  revenueCents: number | null;
  customerCount: number | null;
  endOfDayNote: string | null;
  /** The day's logged per-item stats (for top seller + prefilling the editor). */
  dayItems: ClosedSummaryItem[];
  /** Active menu items — the editable per-item list in the wrap-up form. */
  menuItems: { id: string; name: string }[];
};

/**
 * Closed-state treatment: a "Closed today" header plus the logged numbers
 * (revenue, customers, top seller, end-of-day note). "Edit numbers" reopens
 * the wrap-up Sheet prefilled (staying closed); "Reopen" puts the truck back
 * into service.
 */
export function ClosedSummary({
  revenueCents,
  customerCount,
  endOfDayNote,
  dayItems,
  menuItems,
}: ClosedSummaryProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isReopening, startReopen] = useTransition();

  const top = topSeller(
    dayItems.map((i) => ({ item_name: i.item_name, units_sold: i.units_sold }))
  );

  // Prefill the editor's per-item units from the day's logged stats.
  const defaultUnits: Record<string, number | null> = {};
  for (const item of dayItems) {
    if (item.menu_item_id) defaultUnits[item.menu_item_id] = item.units_sold;
  }

  async function saveEdits(input: WrapUpInput) {
    await wrapUpDayAction(input);
    router.refresh();
    setEditing(false);
  }

  function reopen() {
    startReopen(async () => {
      await reopenAction();
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-6 border-t border-border-default pt-6">
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-status-closed-bg" />
        <h2 className="font-display text-2xl leading-none text-text-primary">
          Closed today
        </h2>
      </div>

      <dl className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-sm text-text-secondary">Revenue</dt>
          <dd className="text-lg font-medium text-text-primary">
            {formatRevenue(revenueCents)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-sm text-text-secondary">Customers</dt>
          <dd className="text-lg font-medium text-text-primary">
            {customerCount != null ? customerCount : "—"}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-sm text-text-secondary">Top seller</dt>
          <dd className="text-lg font-medium text-text-primary">
            {top ? `${top.item_name} (${top.units_sold})` : "—"}
          </dd>
        </div>
      </dl>

      {endOfDayNote ? (
        <p className="text-sm leading-relaxed text-text-secondary">
          {endOfDayNote}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <SecondaryButton type="button" fullWidth onClick={() => setEditing(true)}>
          Edit numbers
        </SecondaryButton>
        <SecondaryButton type="button" fullWidth onClick={reopen} disabled={isReopening}>
          {isReopening ? "Reopening…" : "Reopen"}
        </SecondaryButton>
      </div>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Edit today's numbers">
        <WrapUpForm
          items={menuItems}
          defaultRevenueCents={revenueCents}
          defaultCustomerCount={customerCount}
          defaultEndOfDayNote={endOfDayNote}
          defaultUnits={defaultUnits}
          onSubmit={saveEdits}
          primaryLabel="Save numbers"
        />
      </Sheet>
    </section>
  );
}
