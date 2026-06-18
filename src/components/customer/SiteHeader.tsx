/**
 * Customer site header — the Drift wordmark in Caveat with a one-line tagline.
 * No nav: this is a single-page public experience.
 */
export function SiteHeader() {
  return (
    <header className="flex flex-col items-center text-center">
      <p className="font-display text-4xl leading-none text-brand-primary">
        Drift
      </p>
      <p className="mt-2 text-sm uppercase tracking-[0.2em] text-text-muted">
        Fresh Mexican street food, on the move
      </p>
    </header>
  );
}
