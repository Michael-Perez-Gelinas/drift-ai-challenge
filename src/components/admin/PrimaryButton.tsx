import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  fullWidth?: boolean;
};

/**
 * The single primary action on a screen. Rust fill, 48px tall, full-width by
 * default for thumb-friendly one-handed use.
 */
export function PrimaryButton({
  className,
  fullWidth = true,
  type = "button",
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-card bg-rust-500 px-6 text-base font-medium text-text-inverse",
        "transition-colors duration-base ease-default hover:bg-rust-600 active:bg-rust-600",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        fullWidth && "w-full",
        className
      )}
      {...props}
    />
  );
}
