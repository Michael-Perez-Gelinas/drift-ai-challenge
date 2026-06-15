import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  postLocation,
  toggleSoldOut,
  wrapUpDay,
  listDays,
  getDay,
} from "@/lib/daily-log/repository";

// These tests run against whatever Supabase .env.local points at (hosted dev
// project). To stay non-destructive on a shared database, every row we create
// uses a far-future SENTINEL date and we only ever delete those dates — real
// seed/demo data is never touched. menu_items are read (not deleted); any
// sold-out flag we flip is reset in cleanup.
const SENTINEL = ["2099-12-30", "2099-12-31"];
const DAY = SENTINEL[1];
const PREV = SENTINEL[0];

const service = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function firstMenuItemId() {
  const { data } = await service.from("menu_items").select("id").limit(1).single();
  return data!.id;
}

async function cleanupSentinels() {
  // Deleting the location cascades to daily_performance and daily_item_stats.
  await service.from("locations").delete().in("date", SENTINEL);
  // Reset any sold-out flag our tests may have flipped.
  await service.from("menu_items").update({ is_sold_out: false }).eq("is_sold_out", true);
}

beforeEach(cleanupSentinels);
afterAll(cleanupSentinels);

describe("postLocation", () => {
  it("creates the day's row and resets sold-out flags on a new day", async () => {
    await postLocation(service, { date: DAY, address: "South End, Boston", note: "by the fountain" });

    const { data: loc } = await service.from("locations").select("*").eq("date", DAY).single();
    expect(loc!.address).toBe("South End, Boston");

    const { data: items } = await service.from("menu_items").select("is_sold_out");
    expect(items!.every((i) => i.is_sold_out === false)).toBe(true);
  });

  it("editing a closed day updates address/note without reopening it", async () => {
    await postLocation(service, { date: DAY, address: "South End", note: null });
    await service.from("locations").update({ is_open: false }).eq("date", DAY);

    await postLocation(service, { date: DAY, address: "Seaport", note: "moved" });

    const { data: loc } = await service
      .from("locations")
      .select("address, note, is_open")
      .eq("date", DAY)
      .single();
    expect(loc!.address).toBe("Seaport");
    expect(loc!.note).toBe("moved");
    expect(loc!.is_open).toBe(false); // stays closed — edit must not reopen
  });
});

describe("toggleSoldOut", () => {
  it("sets the live flag and mirrors a snapshot into the day's stats", async () => {
    await postLocation(service, { date: DAY, address: "South End", note: null });
    const itemId = await firstMenuItemId();

    await toggleSoldOut(service, { itemId, soldOut: true, today: DAY });

    const { data: item } = await service
      .from("menu_items")
      .select("is_sold_out, name, price")
      .eq("id", itemId)
      .single();
    expect(item!.is_sold_out).toBe(true);

    const { data: stat } = await service
      .from("daily_item_stats")
      .select("was_sold_out, item_name, item_price")
      .eq("menu_item_id", itemId)
      .single();
    expect(stat!.was_sold_out).toBe(true);
    expect(stat!.item_name).toBe(item!.name);
    expect(stat!.item_price).toBe(item!.price);
  });
});

describe("wrapUpDay", () => {
  it("records performance and per-item units, and is idempotent", async () => {
    await postLocation(service, { date: DAY, address: "South End", note: null });
    const itemId = await firstMenuItemId();

    await wrapUpDay(service, {
      date: DAY,
      revenueCents: 124000,
      customerCount: 85,
      endOfDayNote: "slammed at lunch",
      perItemUnits: [{ menuItemId: itemId, units: 62 }],
    });
    // Re-submit with a correction — must edit, not duplicate.
    await wrapUpDay(service, {
      date: DAY,
      revenueCents: 130000,
      customerCount: 90,
      endOfDayNote: "updated",
      perItemUnits: [{ menuItemId: itemId, units: 64 }],
    });

    const dayId = (await service.from("locations").select("id").eq("date", DAY).single()).data!.id;

    const { data: perf } = await service.from("daily_performance").select("*").eq("location_id", dayId);
    expect(perf!.length).toBe(1);
    expect(perf![0].revenue_cents).toBe(130000);
    expect(perf![0].wrapped_at).not.toBeNull();

    const { data: stats } = await service
      .from("daily_item_stats")
      .select("units_sold")
      .eq("location_id", dayId)
      .eq("menu_item_id", itemId);
    expect(stats!.length).toBe(1);
    expect(stats![0].units_sold).toBe(64);
  });
});

describe("listDays / getDay", () => {
  it("returns posted days newest-first and a full day detail", async () => {
    await postLocation(service, { date: PREV, address: "Seaport", note: null });
    await postLocation(service, { date: DAY, address: "South End", note: null });
    await wrapUpDay(service, { date: DAY, revenueCents: 90000, customerCount: 50, endOfDayNote: null, perItemUnits: [] });

    const days = (await listDays(service)).filter((d) => SENTINEL.includes(d.date));
    expect(days.map((d) => d.date)).toEqual([DAY, PREV]);
    expect(days[0].revenue_cents).toBe(90000);
    expect(days[1].revenue_cents).toBeNull();

    const detail = await getDay(service, DAY);
    expect(detail!.address).toBe("South End");
    expect(detail!.revenue_cents).toBe(90000);
    expect(Array.isArray(detail!.items)).toBe(true);
  });
});

describe("RLS privacy (highest-risk)", () => {
  it("anon cannot read private performance tables but can read public location", async () => {
    await postLocation(service, { date: DAY, address: "South End", note: null });
    await wrapUpDay(service, {
      date: DAY,
      revenueCents: 99999,
      customerCount: 10,
      endOfDayNote: "secret",
      perItemUnits: [],
    });

    const anon = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const dayId = (await service.from("locations").select("id").eq("date", DAY).single()).data!.id;

    const perf = await anon.from("daily_performance").select("*").eq("location_id", dayId);
    const itemStats = await anon.from("daily_item_stats").select("*").eq("location_id", dayId);

    // RLS with no anon policy returns zero rows (revenue stays private).
    expect(perf.data ?? []).toHaveLength(0);
    expect(itemStats.data ?? []).toHaveLength(0);

    // Sanity: anon CAN still read public location data (verifies the GRANT fix).
    const anonLoc = await anon.from("locations").select("address").eq("date", DAY).single();
    expect(anonLoc.data!.address).toBe("South End");
  });
});
