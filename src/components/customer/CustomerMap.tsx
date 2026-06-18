"use client";

/**
 * CustomerMap — Leaflet + OpenStreetMap map centered on lat/lng with a single
 * marker whose popup is `label`. Only rendered by the page when BOTH lat and
 * lng are non-null.
 *
 * Contract (do not change):
 *   export type CustomerMapProps = { lat: number; lng: number; label: string };
 *   export function CustomerMap({ lat, lng, label }: CustomerMapProps)
 *
 * Leaflet touches `window`, so it's loaded client-only inside useEffect and the
 * map is initialized imperatively on a ref'd <div>. We use a brand-colored
 * L.divIcon (rust pin) instead of Leaflet's default image marker — this both
 * matches the Drift brand and sidesteps the default-marker-icon 404 that
 * happens under bundlers like Webpack/Next.
 */

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

export type CustomerMapProps = {
  lat: number;
  lng: number;
  label: string;
};

const ZOOM = 15;

export function CustomerMap({ lat, lng, label }: CustomerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    // Import Leaflet only on the client (it references `window` at module load).
    void import("leaflet").then((mod) => {
      // The module may have a default or namespace export depending on interop.
      const L = (mod.default ?? mod) as typeof import("leaflet");

      // Guard against double-init under React strict mode (effect runs twice)
      // and against a late-resolving import after unmount.
      if (cancelled || mapRef.current || !containerRef.current) return;

      const map = L.map(container, {
        center: [lat, lng],
        zoom: ZOOM,
        scrollWheelZoom: false, // don't hijack page scroll on mobile
        attributionControl: true,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // Brand-colored teardrop pin via divIcon — no external image assets, so
      // it can't 404 under the bundler. Rust (#A8522B) to match brand-primary.
      const pinIcon = L.divIcon({
        className: "drift-map-pin",
        html:
          '<span style="' +
          "display:block;width:22px;height:22px;" +
          "background:#A8522B;border:2px solid #FAF6F0;" +
          "border-radius:50% 50% 50% 0;transform:rotate(-45deg);" +
          "box-shadow:0 2px 6px rgba(44,34,24,0.35);" +
          '"></span>',
        iconSize: [22, 22],
        // Anchor at the pin's tip (the un-rotated bottom-left corner).
        iconAnchor: [11, 22],
        popupAnchor: [0, -22],
      });

      L.marker([lat, lng], { icon: pinIcon, title: label })
        .addTo(map)
        .bindPopup(label);
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng, label]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`Map showing ${label}`}
      className="h-[260px] w-full overflow-hidden rounded-card border border-border-default shadow-card"
    />
  );
}
