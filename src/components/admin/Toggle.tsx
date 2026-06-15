"use client";

import { cn } from "@/lib/utils";

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible label describing what the toggle controls. */
  label: string;
  disabled?: boolean;
  className?: string;
};

/**
 * A large switch sized for thumbs (44px hit target). Built as an ARIA switch
 * button so it works without any form plumbing — controlled via `checked` /
 * `onChange`. Used for the sold-out flags on Today.
 */
export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  className,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-[3px] transition-colors duration-base ease-default",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        // 44px touch target via padding box without growing the visual control
        "before:absolute before:-inset-2 before:content-['']",
        checked ? "bg-rust-500" : "bg-border-strong",
        className
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-surface-raised shadow-sm transition-transform duration-base ease-default",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}
