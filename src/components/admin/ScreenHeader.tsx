import type { ReactNode } from "react";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** Optional right-aligned action (button, link, etc.). */
  action?: ReactNode;
};

/**
 * The type anchor for every admin screen: a large Caveat title with an
 * optional muted subtitle and a right-aligned action slot. Sets the rhythm
 * the rest of the screen hangs off of.
 */
export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  return (
    <header className="flex items-end justify-between gap-4 pt-8 pb-6">
      <div className="min-w-0">
        <h1 className="font-display text-4xl leading-none text-text-primary">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-sm text-text-secondary">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
