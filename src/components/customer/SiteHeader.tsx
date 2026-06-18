import { HandDrawnDivider } from "@/components/HandDrawnDivider";

/**
 * Customer site header — the Drift wordmark in Caveat, a hand-drawn squiggle,
 * and a quiet tagline. No nav: this is a single-page public experience.
 */
export function SiteHeader() {
  return (
    <header className="flex flex-col items-center gap-3 text-center">
      <p className="font-display text-4xl leading-[0.85] text-brand-primary">
        Drift
      </p>
      <HandDrawnDivider className="h-3 w-28 text-sand-400" />
      <p className="text-xs uppercase tracking-[0.28em] text-text-muted">
        Mexican street food · on the move
      </p>
    </header>
  );
}
