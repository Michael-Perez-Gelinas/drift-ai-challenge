"use client";

/**
 * STUB — replaced by the Map agent.
 *
 * Contract (do not change): renders a Leaflet + OpenStreetMap map centered on
 * lat/lng with a single marker whose popup is `label`. Only rendered by the
 * page when BOTH lat and lng are non-null.
 */
export type CustomerMapProps = {
  lat: number;
  lng: number;
  label: string;
};

export function CustomerMap({ lat, lng, label }: CustomerMapProps) {
  return (
    <div
      className="flex h-[260px] w-full items-center justify-center rounded-lg border border-border-strong bg-background-subtle text-center text-sm text-text-secondary shadow-card"
      role="img"
      aria-label={`Map showing ${label}`}
    >
      <span>
        Map — {label}
        <br />
        ({lat.toFixed(4)}, {lng.toFixed(4)})
      </span>
    </div>
  );
}
