"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/daily-log/today";
import {
  postLocation,
  toggleSoldOut,
  wrapUpDay,
  setDayOpen,
  addMenuItem,
  updateMenuItem,
  archiveMenuItem,
} from "@/lib/daily-log/repository";

/** Gate every action. Redirects unauthenticated callers to /login. */
async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
}

type GeocodeResult = { lat: number; lng: number } | null;

/** Best-effort forward geocode via Nominatim. Never throws — returns null on failure. */
async function geocode(address: string): Promise<GeocodeResult> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      address
    )}&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "drift-app" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;

    const data: unknown = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const first = data[0] as { lat?: string; lon?: string };
    const lat = first.lat != null ? Number.parseFloat(first.lat) : NaN;
    const lng = first.lon != null ? Number.parseFloat(first.lon) : NaN;
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Location / day status
// ---------------------------------------------------------------------------

/**
 * Post (or update) today's location. Geocodes the address in the background;
 * a geocode failure never blocks the post — lat/lng are simply left unset.
 */
export async function postLocationAction(input: {
  address: string;
  note?: string | null;
}): Promise<void> {
  await requireAuth();
  const db = createServiceClient();
  const date = todayISO();

  await postLocation(db, { date, address: input.address, note: input.note ?? null });

  // Always re-sync lat/lng to the current address. On a failed geocode (e.g. an
  // edit to an unresolvable address) clear them rather than leaving the previous
  // address's coordinates pointing customers to the wrong spot.
  const coords = await geocode(input.address);
  await db
    .from("locations")
    .update({ lat: coords?.lat ?? null, lng: coords?.lng ?? null })
    .eq("date", date);

  revalidatePath("/admin/today");
}

/** Mark today closed (still posted, but not serving). */
export async function markClosedAction(): Promise<void> {
  await requireAuth();
  const db = createServiceClient();
  await setDayOpen(db, { date: todayISO(), isOpen: false });
  revalidatePath("/admin/today");
}

/** Reopen today. */
export async function reopenAction(): Promise<void> {
  await requireAuth();
  const db = createServiceClient();
  await setDayOpen(db, { date: todayISO(), isOpen: true });
  revalidatePath("/admin/today");
}

// ---------------------------------------------------------------------------
// Sold-out flags
// ---------------------------------------------------------------------------

/** Flip a menu item's live sold-out flag and snapshot it into today's stats. */
export async function toggleSoldOutAction(
  itemId: string,
  soldOut: boolean
): Promise<void> {
  await requireAuth();
  const db = createServiceClient();
  await toggleSoldOut(db, { itemId, soldOut, today: todayISO() });
  revalidatePath("/admin/today");
}

// ---------------------------------------------------------------------------
// End-of-day wrap-up
// ---------------------------------------------------------------------------

type WrapUpInput = {
  revenueCents?: number | null;
  customerCount?: number | null;
  endOfDayNote?: string | null;
  perItemUnits?: { menuItemId: string; units: number }[];
};

/** Record today's end-of-day performance. */
export async function wrapUpDayAction(input: WrapUpInput): Promise<void> {
  await requireAuth();
  const db = createServiceClient();
  await wrapUpDay(db, { date: todayISO(), ...input });
  revalidatePath("/admin/today");
  revalidatePath("/admin/history");
}

/** Edit the performance numbers for an arbitrary past date (History detail). */
export async function updateDayAction(
  date: string,
  input: WrapUpInput
): Promise<void> {
  await requireAuth();
  const db = createServiceClient();
  await wrapUpDay(db, { date, ...input });
  revalidatePath("/admin/history");
  revalidatePath(`/admin/history/${date}`);
}

// ---------------------------------------------------------------------------
// Menu CRUD (direct table ops via the service client)
// ---------------------------------------------------------------------------

/** Add a menu item. `price` is in integer cents. */
export async function addMenuItemAction(input: {
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  image_url?: string | null;
}): Promise<void> {
  await requireAuth();
  const db = createServiceClient();
  await addMenuItem(db, input);
  revalidatePath("/admin/menu");
  revalidatePath("/admin/today");
}

/** Update an existing menu item. `price`, when present, is in integer cents. */
export async function updateMenuItemAction(
  id: string,
  fields: {
    name?: string;
    description?: string | null;
    price?: number;
    category?: string | null;
    image_url?: string | null;
    is_sold_out?: boolean;
    sort_order?: number;
  }
): Promise<void> {
  await requireAuth();
  const db = createServiceClient();
  await updateMenuItem(db, id, fields);
  revalidatePath("/admin/menu");
  revalidatePath("/admin/today");
}

/** Soft-delete a menu item (hidden everywhere, history preserved). */
export async function archiveMenuItemAction(id: string): Promise<void> {
  await requireAuth();
  const db = createServiceClient();
  await archiveMenuItem(db, id);
  revalidatePath("/admin/menu");
  revalidatePath("/admin/today");
}
