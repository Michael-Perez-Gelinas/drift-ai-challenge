import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SecondaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  fullWidth?: boolean;
};

/**
 * A lower-emphasis action: outlined, warm border, same 48px target as the
 * primary so the two sit comfortably side by side.
 */
export function SecondaryButton({
  className,
  fullWidth = false,
  type = "button",
  ...props
}: SecondaryButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-card border border-border-strong bg-transparent px-6 text-base font-medium text-text-primary",
        "transition-colors duration-base ease-default hover:bg-background-subtle active:bg-background-subtle",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        fullWidth && "w-full",
        className
      )}
      {...props}
    />
  );
}
