"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Pencil } from "lucide-react";
import { SecondaryButton } from "@/components/admin/SecondaryButton";
import { markClosedAction, reopenAction } from "@/app/admin/actions";
import { LocationForm } from "./LocationForm";

type PostedLocationProps = {
  address: string;
  note: string | null;
  isOpen: boolean;
};

/**
 * Summary of today's posted location: address + note, an edit affordance, and
 * the open/closed control. When closed, the whole block takes a muted, "we're
 * not serving" treatment.
 */
export function PostedLocation({ address, note, isOpen }: PostedLocationProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return (
      <section>
        <p className="mb-4 text-sm font-medium text-text-secondary">
          Update today&apos;s spot
        </p>
        <LocationForm
          defaultAddress={address}
          defaultNote={note}
          submitLabel="Save location"
          onCancel={() => setEditing(false)}
        />
      </section>
    );
  }

  function toggleOpen() {
    startTransition(async () => {
      await (isOpen ? markClosedAction() : reopenAction());
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <MapPin
            className={isOpen ? "mt-1 size-5 shrink-0 text-brand-primary" : "mt-1 size-5 shrink-0 text-text-muted"}
            strokeWidth={2}
          />
          <div className="min-w-0">
            <p className="text-lg font-medium leading-snug text-text-primary">
              {address}
            </p>
            {note ? (
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {note}
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Edit location"
          className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-background-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Pencil className="size-4" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border-default pt-4">
        <span
          className={
            isOpen
              ? "inline-flex items-center gap-2 text-sm font-medium text-status-open-bg"
              : "inline-flex items-center gap-2 text-sm font-medium text-status-closed-bg"
          }
        >
          <span
            className={
              isOpen
                ? "size-2 rounded-full bg-status-open-bg"
                : "size-2 rounded-full bg-status-closed-bg"
            }
          />
          {isOpen ? "Open — serving now" : "Closed for today"}
        </span>
        <SecondaryButton type="button" onClick={toggleOpen} disabled={isPending}>
          {isPending ? "…" : isOpen ? "Mark closed" : "Reopen"}
        </SecondaryButton>
      </div>
    </section>
  );
}
