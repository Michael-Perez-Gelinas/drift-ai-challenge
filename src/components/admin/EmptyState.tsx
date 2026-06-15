import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  /** Optional action(s) — typically a PrimaryButton or form. */
  children?: ReactNode;
};

/**
 * The "nothing here yet" moment: a friendly Caveat headline, a muted line of
 * context, and room for a single call to action. No card chrome — just type.
 */
export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <h2 className="font-display text-3xl leading-none text-text-primary">
        {title}
      </h2>
      {description ? (
        <p className="max-w-xs text-sm text-text-secondary">{description}</p>
      ) : null}
      {children ? <div className="mt-4 w-full">{children}</div> : null}
    </div>
  );
}
