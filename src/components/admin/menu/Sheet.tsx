"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

/**
 * A mobile bottom-sheet: dimmed scrim + a panel that rises from the bottom.
 * Closes on scrim tap or Escape. Locks body scroll while open. No card-grid
 * chrome — a single focused surface for one form at a time.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink-900/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative mx-auto flex max-h-[85vh] w-full max-w-md flex-col",
          "rounded-t-card bg-surface-card shadow-md"
        )}
      >
        <div className="flex items-center justify-between gap-4 px-5 pt-5 pb-3">
          <h2 className="font-display text-3xl leading-none text-text-primary">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-m-2 flex h-11 w-11 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-background-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-8">{children}</div>
      </div>
    </div>
  );
}
