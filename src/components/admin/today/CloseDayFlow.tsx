"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SecondaryButton } from "@/components/admin/SecondaryButton";
import { Sheet } from "@/components/admin/menu/Sheet";
import { closeDayAction, markClosedAction, type WrapUpInput } from "@/app/admin/actions";
import { WrapUpForm } from "./WrapUpForm";

type CloseDayFlowProps = {
  items: { id: string; name: string }[];
};

/**
 * Open-state control: an "Open — serving now" status row with a "Mark closed"
 * button that opens a wrap-up Sheet. From the sheet the owner can either log
 * the day's numbers and close, or just close without logging.
 */
export function CloseDayFlow({ items }: CloseDayFlowProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  async function saveAndClose(input: WrapUpInput) {
    await closeDayAction(input);
    router.refresh();
    setSheetOpen(false);
  }

  async function justClose() {
    await markClosedAction();
    router.refresh();
    setSheetOpen(false);
  }

  return (
    <section className="flex items-center justify-between gap-3 border-t border-border-default pt-4">
      <span className="inline-flex items-center gap-2 text-sm font-medium text-text-primary">
        <span className="size-2 rounded-full bg-status-open-bg" />
        Open — serving now
      </span>
      <SecondaryButton type="button" onClick={() => setSheetOpen(true)}>
        Mark closed
      </SecondaryButton>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Closing up — how'd it go?"
      >
        <WrapUpForm
          items={items}
          onSubmit={saveAndClose}
          primaryLabel="Save & close"
          primaryPendingLabel="Closing…"
          secondaryLabel="Just close"
          onSecondary={justClose}
        />
      </Sheet>
    </section>
  );
}
