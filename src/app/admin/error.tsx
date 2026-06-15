"use client";

import { useEffect } from "react";
import { PrimaryButton } from "@/components/admin/PrimaryButton";

/**
 * Admin-area error boundary. Catches data-load failures (e.g. the database is
 * unreachable) so a failed fetch shows an honest "couldn't load" with a retry,
 * never a misleading empty state.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <h2 className="font-display text-3xl leading-none text-text-primary">
        Couldn&apos;t load this
      </h2>
      <p className="max-w-xs text-sm text-text-secondary">
        We couldn&apos;t reach the kitchen just now. Check your connection and try again.
      </p>
      <div className="mt-4 w-full">
        <PrimaryButton onClick={() => reset()}>Try again</PrimaryButton>
      </div>
    </div>
  );
}
