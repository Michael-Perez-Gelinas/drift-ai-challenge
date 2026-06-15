import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type DB = SupabaseClient<Database>;

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export type DaySummary = {
  date: string;
  address: string;
  is_open: boolean;
  revenue_cents: number | null;
};

export type DayDetail = {
  date: string;
  address: string;
  note: string | null;
  is_open: boolean;
  revenue_cents: number | null;
  customer_count: number | null;
  end_of_day_note: string | null;
  items: { menu_item_id: string | null; item_name: string; item_price: number; units_sold: number | null; was_sold_out: boolean }[];
};

async function locationIdForDate(db: DB, date: string): Promise<string | null> {
  const { data } = await db.from("locations").select("id").eq("date", date).maybeSingle();
  return data?.id ?? null;
}

/** Upsert the day's location. On first creation of a date, reset all sold-out flags. */
export async function postLocation(
  db: DB,
  input: { date: string; address: string; note?: string | null }
): Promise<{ id: string }> {
  const existing = await locationIdForDate(db, input.date);

  // Editing an existing day must NOT touch is_open — otherwise tweaking the
  // address/note would silently reopen a truck the owner marked closed.
  if (existing !== null) {
    const { error } = await db
      .from("locations")
      .update({ address: input.address, note: input.note ?? null })
      .eq("date", input.date);
    if (error) throw error;
    return { id: existing };
  }

  // First post of the day: create the row (open by default) and reset sold-out.
  const { data, error } = await db
    .from("locations")
    .insert({ date: input.date, address: input.address, note: input.note ?? null, is_open: true })
    .select("id")
    .single();
  if (error) throw error;

  const { error: resetError } = await db
    .from("menu_items")
    .update({ is_sold_out: false })
    .neq("id", NIL_UUID);
  if (resetError) throw resetError;

  return { id: data!.id };
}

/** Set the live sold-out flag and mirror a snapshot into today's stats. */
export async function toggleSoldOut(
  db: DB,
  input: { itemId: string; soldOut: boolean; today: string }
): Promise<void> {
  const { data: item, error: itemError } = await db
    .from("menu_items")
    .update({ is_sold_out: input.soldOut })
    .eq("id", input.itemId)
    .select("name, price")
    .single();
  if (itemError) throw itemError;

  const locationId = await locationIdForDate(db, input.today);
  if (locationId === null) return; // no posted day yet — nothing to log against

  const { error } = await db.from("daily_item_stats").upsert(
    {
      location_id: locationId,
      menu_item_id: input.itemId,
      item_name: item!.name,
      item_price: item!.price,
      was_sold_out: input.soldOut,
    },
    { onConflict: "location_id,menu_item_id" }
  );
  if (error) throw error;
}

/** Record end-of-day performance and per-item units. Idempotent per date. */
export async function wrapUpDay(
  db: DB,
  input: {
    date: string;
    revenueCents?: number | null;
    customerCount?: number | null;
    endOfDayNote?: string | null;
    perItemUnits?: { menuItemId: string; units: number }[];
  }
): Promise<void> {
  const locationId = await locationIdForDate(db, input.date);
  if (locationId === null) throw new Error(`No posted location for ${input.date}`);

  const { error: perfError } = await db.from("daily_performance").upsert(
    {
      location_id: locationId,
      revenue_cents: input.revenueCents ?? null,
      customer_count: input.customerCount ?? null,
      end_of_day_note: input.endOfDayNote ?? null,
      wrapped_at: new Date().toISOString(),
    },
    { onConflict: "location_id" }
  );
  if (perfError) throw perfError;

  for (const entry of input.perItemUnits ?? []) {
    const { data: item, error: itemError } = await db
      .from("menu_items")
      .select("name, price")
      .eq("id", entry.menuItemId)
      .single();
    if (itemError) throw itemError;

    const { error } = await db.from("daily_item_stats").upsert(
      {
        location_id: locationId,
        menu_item_id: entry.menuItemId,
        item_name: item!.name,
        item_price: item!.price,
        units_sold: entry.units,
      },
      { onConflict: "location_id,menu_item_id" }
    );
    if (error) throw error;
  }
}

/** All posted days, newest first, with revenue if logged. */
export async function listDays(db: DB): Promise<DaySummary[]> {
  const { data: locs, error } = await db
    .from("locations")
    .select("id, date, address, is_open")
    .order("date", { ascending: false });
  if (error) throw error;
  if (!locs || locs.length === 0) return [];

  const { data: perf, error: perfError } = await db
    .from("daily_performance")
    .select("location_id, revenue_cents")
    .in(
      "location_id",
      locs.map((l) => l.id)
    );
  if (perfError) throw perfError;

  const revenueByLocation = new Map((perf ?? []).map((p) => [p.location_id, p.revenue_cents]));
  return locs.map((l) => ({
    date: l.date,
    address: l.address,
    is_open: l.is_open,
    revenue_cents: revenueByLocation.get(l.id) ?? null,
  }));
}

/** Full detail for one posted day, or null if that date was never posted. */
export async function getDay(db: DB, date: string): Promise<DayDetail | null> {
  const { data: loc, error } = await db
    .from("locations")
    .select("id, date, address, note, is_open")
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  if (!loc) return null;

  const { data: perf } = await db
    .from("daily_performance")
    .select("revenue_cents, customer_count, end_of_day_note")
    .eq("location_id", loc.id)
    .maybeSingle();

  const { data: items } = await db
    .from("daily_item_stats")
    .select("menu_item_id, item_name, item_price, units_sold, was_sold_out")
    .eq("location_id", loc.id);

  return {
    date: loc.date,
    address: loc.address,
    note: loc.note,
    is_open: loc.is_open,
    revenue_cents: perf?.revenue_cents ?? null,
    customer_count: perf?.customer_count ?? null,
    end_of_day_note: perf?.end_of_day_note ?? null,
    items: items ?? [],
  };
}
