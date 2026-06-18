/**
 * A hand-drawn wavy line — the folk-art accent that carries the Drift vibe
 * (think the squiggle on an Oaxacan ceramics studio site). Stroke uses
 * `currentColor`, so set the color with a text-* class. Width via className.
 */
export function HandDrawnDivider({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M3 9C16 2 28 2 40 8C53 15 64 15 78 8C91 2 102 2 116 8C129 15 140 15 154 8C167 2 178 2 197 9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
