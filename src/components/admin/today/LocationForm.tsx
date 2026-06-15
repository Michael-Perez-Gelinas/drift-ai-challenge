"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/admin/Field";
import { PrimaryButton } from "@/components/admin/PrimaryButton";
import { SecondaryButton } from "@/components/admin/SecondaryButton";
import { postLocationAction } from "@/app/admin/actions";

type LocationFormProps = {
  /** Prefill values when editing an already-posted location. */
  defaultAddress?: string;
  defaultNote?: string | null;
  /** Submit button copy. Defaults to the "post" wording. */
  submitLabel?: string;
  /** Shown alongside submit when editing, to back out. */
  onCancel?: () => void;
};

/**
 * Address + optional note form that posts (or re-posts) today's location.
 * Geocoding happens server-side in the action; a failure never blocks here.
 */
export function LocationForm({
  defaultAddress = "",
  defaultNote = "",
  submitLabel = "Post today's location",
  onCancel,
}: LocationFormProps) {
  const router = useRouter();
  const [address, setAddress] = useState(defaultAddress);
  const [note, setNote] = useState(defaultNote ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await postLocationAction({ address: trimmed, note: note.trim() || null });
      router.refresh();
      onCancel?.();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-left">
      <Field
        label="Where are you parked?"
        placeholder="e.g. Dewey Square, Boston"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        autoComplete="off"
        required
      />
      <Field
        as="textarea"
        label="Note for the crowd"
        hint="Optional — hours, what's hot, where to find you."
        placeholder="Here till 2pm. Brisket's back."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex flex-col gap-3">
        <PrimaryButton type="submit" disabled={isPending || !address.trim()}>
          {isPending ? "Posting…" : submitLabel}
        </PrimaryButton>
        {onCancel ? (
          <SecondaryButton fullWidth type="button" onClick={onCancel} disabled={isPending}>
            Cancel
          </SecondaryButton>
        ) : null}
      </div>
    </form>
  );
}
