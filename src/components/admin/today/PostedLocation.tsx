"use client";

import { useState } from "react";
import { MapPin, Pencil } from "lucide-react";
import { LocationForm } from "./LocationForm";

type PostedLocationProps = {
  address: string;
  note: string | null;
};

/**
 * Summary of today's posted location: address + note, with an edit affordance.
 * The open/closed control lives in CloseDayFlow / ClosedSummary.
 */
export function PostedLocation({ address, note }: PostedLocationProps) {
  const [editing, setEditing] = useState(false);

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

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <MapPin
            className="mt-1 size-5 shrink-0 text-brand-primary"
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
    </section>
  );
}
