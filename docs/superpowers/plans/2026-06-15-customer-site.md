# Customer Site Build Brief

The public-facing page where regulars find the truck. Read-only, no auth. Reads
the SAME data the owner app writes (locations + menu_items, both public-read —
the GRANT is already in place). Owner app stays at `/admin`; this is the public
experience at `/`.

## Design principles (non-negotiable)
- Intentional minimalism, typography-led (Caveat `font-display` for display, DM Sans `font-body`).
- Warm Oaxacan brand: cream `bg-background`, clay/sand, **rust** `brand-primary`, dusk accent, `ink-900` (no pure black). Warm shadows.
- NO generic card grids. This is a consumer page — make it inviting and crafted, strong hierarchy.
- Mobile-first (most regulars check on a phone), but it should look intentional on desktop too.
- Icons: `lucide-react`. Map: Leaflet + OpenStreetMap (already installed: `leaflet`, `@types/leaflet`), free, no key.

## Routing & data
- `/` (`src/app/page.tsx`) — REPLACE the current redirect-to-/admin with the customer homepage (Server Component). The owner reaches the app via `/admin` or `/login` directly; the PWA `start_url` stays `/admin/today`, so the pinned owner app is unaffected.
- Fetch with the **anon** server client (`createAnonClient` from `src/lib/supabase/server.ts`) — exactly what a public visitor sees, proving the public-read path:
  - today's location: `locations` where `date = todayISO()` (`src/lib/daily-log/today.ts`), select `address, note, lat, lng, is_open`.
  - menu: `menu_items` where `is_archived = false`, ordered by `category` then `sort_order`, select `name, description, price, category, is_sold_out`.
  - Throw on a real query error (let it surface), but a missing location row is a valid "not posted" state, not an error.

## States (driven by today's location row)
1. **Not posted yet** (no row for today): warm "We're not out yet today — check back soon" hero. Still show the menu below ("Here's what's usually on").
2. **Closed** (`is_open = false`): "Closed today" treatment. Show the note if present. Menu below.
3. **Open** (row exists, `is_open = true`): the main event — today's spot (map + address + note) up top, full menu below.

## Component contracts (foundation defines slots; leaf agents implement)
- **`CustomerMap`** (`src/components/customer/CustomerMap.tsx`, `'use client'`):
  props `{ lat: number; lng: number; label: string }`. Renders a Leaflet + OpenStreetMap map centered on lat/lng with a single marker (popup = `label`). Leaflet touches `window`, so load it client-only (e.g. `next/dynamic` with `ssr:false`, or import inside `useEffect`); import `leaflet/dist/leaflet.css`. Fix the default marker-icon path issue (Leaflet's bundled icon URLs break under bundlers — set icon options explicitly). Give the map a fixed, rounded, sensible height (e.g. ~260px) with warm border. Only rendered by the page when BOTH lat and lng are non-null.
- **`TodayMenu`** (`src/components/customer/TodayMenu.tsx`, Server Component is fine — no interactivity):
  props `{ items: { name: string; description: string | null; price: number; category: string | null; is_sold_out: boolean }[] }`. Group by category (Tacos/Sides/Drinks/Extras, first-seen order; null → "More"). Each item: name, description, price `$${(price/100).toFixed(2)}`. Sold-out items get a clear but tasteful "Sold out" mark and muted treatment. Typography-led list, NOT a card grid.
- **`LiveRefresh`** (`src/components/customer/LiveRefresh.tsx`, `'use client'`):
  no props. On mount, subscribe with the browser client (`createClient` from `src/lib/supabase/client.ts`) to postgres_changes on the `locations` and `menu_items` tables; on any change call `router.refresh()`. Clean up the channel on unmount. This is the "wow": the page flips the instant the owner posts. (Real-time requires the tables to be in the `supabase_realtime` publication — the orchestrator handles enabling that; the component should subscribe regardless and simply no-op if events never arrive.)

## Foundation agent also builds
- A simple customer header: the **Drift** wordmark in Caveat, maybe a one-line tagline. No nav needed.
- The page composition: header → status/location section (with `<CustomerMap>` when coords exist, else address text) → `<TodayMenu>` → `<LiveRefresh>`. Define and import the leaf components from the contract paths above; if they don't exist yet, create minimal stubs so the page compiles, and the leaf agents will replace them.

## Verify
- `npx tsc --noEmit` → 0 errors. Foundation agent runs `npm run build` → success.
- Don't break the owner app or existing tests.
