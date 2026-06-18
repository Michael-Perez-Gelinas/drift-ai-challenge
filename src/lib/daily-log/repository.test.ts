import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  postLocation,
  toggleSoldOut,
  wrapUpDay,
  listDays,
  getDay,
  setDayOpen,
  listActiveMenu,
  addMenuItem,
  updateMenuItem,
  archiveMenuItem,
} from "@/lib/daily-log/repository";

// Test menu items use this name prefix so cleanup can hard-delete only ours.
const TEST_PREFIX = "__TEST__";

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
  // Hard-delete any test menu items we created (after locations, so cascaded
  // stats are gone first). Only rows we own (TEST_PREFIX) are touched.
  await service.from("menu_items").delete().like("name", `${TEST_PREFIX}%`);
  // Reset any sold-out flag our tests may have flipped on the real seed items.
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

describe("setDayOpen", () => {
  it("closes and reopens a day without touching address/note", async () => {
    await postLocation(service, { date: DAY, address: "South End", note: "by the fountain" });

    await setDayOpen(service, { date: DAY, isOpen: false });
    const closed = (await service.from("locations").select("address, note, is_open").eq("date", DAY).single()).data!;
    expect(closed.is_open).toBe(false);
    expect(closed.address).toBe("South End");
    expect(closed.note).toBe("by the fountain");

    await setDayOpen(service, { date: DAY, isOpen: true });
    const reopened = (await service.from("locations").select("is_open").eq("date", DAY).single()).data!;
    expect(reopened.is_open).toBe(true);
  });
});

describe("menu CRUD", () => {
  it("adds an item with price in cents and surfaces it in the active menu", async () => {
    const { id } = await addMenuItem(service, {
      name: `${TEST_PREFIX}Quesabirria`,
      description: "Cheesy birria taco",
      price: 650,
      category: "Tacos",
    });
    const menu = await listActiveMenu(service);
    const added = menu.find((m) => m.id === id);
    expect(added).toBeTruthy();
    expect(added!.price).toBe(650);
    expect(added!.is_sold_out).toBe(false);
  });

  it("updates fields on an item", async () => {
    const { id } = await addMenuItem(service, { name: `${TEST_PREFIX}Elote`, price: 400 });
    await updateMenuItem(service, id, { price: 450, description: "now with cotija" });
    const row = (await service.from("menu_items").select("price, description").eq("id", id).single()).data!;
    expect(row.price).toBe(450);
    expect(row.description).toBe("now with cotija");
  });

  it("archive hides an item from the active menu but keeps the row", async () => {
    const { id } = await addMenuItem(service, { name: `${TEST_PREFIX}Churros`, price: 500 });
    await archiveMenuItem(service, id);

    const menu = await listActiveMenu(service);
    expect(menu.find((m) => m.id === id)).toBeUndefined(); // hidden from active menu

    const row = (await service.from("menu_items").select("is_archived").eq("id", id).single()).data!;
    expect(row.is_archived).toBe(true); // soft-deleted, not gone
  });

  it("history snapshot survives archiving the item it references", async () => {
    const { id } = await addMenuItem(service, { name: `${TEST_PREFIX}Tamale`, price: 350 });
    await postLocation(service, { date: DAY, address: "South End", note: null });
    await wrapUpDay(service, { date: DAY, perItemUnits: [{ menuItemId: id, units: 12 }] });
    await archiveMenuItem(service, id);

    // Day detail still shows the snapshot (name/price/units) even though archived.
    const detail = await getDay(service, DAY);
    const snap = detail!.items.find((i) => i.menu_item_id === id);
    expect(snap).toBeTruthy();
    expect(snap!.item_name).toBe(`${TEST_PREFIX}Tamale`);
    expect(snap!.item_price).toBe(350);
    expect(snap!.units_sold).toBe(12);
  });
});

describe("customer read path (anon)", () => {
  it("anon sees today's location and only the active menu", async () => {
    await postLocation(service, { date: DAY, address: "Seaport", note: "till 3" });
    const { id: archivedId } = await addMenuItem(service, { name: `${TEST_PREFIX}Hidden`, price: 100 });
    await archiveMenuItem(service, archivedId);

    const anon = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Location read (the bug we fixed: anon must see the posted location).
    const loc = await anon.from("locations").select("address, note, is_open").eq("date", DAY).maybeSingle();
    expect(loc.data?.address).toBe("Seaport");
    expect(loc.data?.is_open).toBe(true);

    // Active menu via anon — archived item must NOT appear.
    const menu = await listActiveMenu(anon);
    expect(menu.find((m) => m.id === archivedId)).toBeUndefined();
    expect(menu.length).toBeGreaterThan(0);
  });
});

describe("per-item stat integrity (regressions)", () => {
  it("snapshot keeps the day's price even after the menu is repriced (C1)", async () => {
    const { id } = await addMenuItem(service, { name: `${TEST_PREFIX}Birria`, price: 500 });
    await postLocation(service, { date: DAY, address: "South End", note: null });

    await toggleSoldOut(service, { itemId: id, soldOut: true, today: DAY }); // snapshots price 500
    await updateMenuItem(service, id, { price: 700 }); // owner reprices later
    await wrapUpDay(service, { date: DAY, perItemUnits: [{ menuItemId: id, units: 20 }] });

    const detail = await getDay(service, DAY);
    const snap = detail!.items.find((i) => i.menu_item_id === id)!;
    expect(snap.item_price).toBe(500); // the day's price, NOT the later 700
    expect(snap.was_sold_out).toBe(true); // preserved across the units write
    expect(snap.units_sold).toBe(20); // both columns coexist, no clobber
  });

  it("logging units first, then selling out, keeps both columns (reverse order)", async () => {
    const { id } = await addMenuItem(service, { name: `${TEST_PREFIX}Elote2`, price: 350 });
    await postLocation(service, { date: DAY, address: "South End", note: null });

    await wrapUpDay(service, { date: DAY, perItemUnits: [{ menuItemId: id, units: 8 }] });
    await toggleSoldOut(service, { itemId: id, soldOut: true, today: DAY });

    const snap = (await getDay(service, DAY))!.items.find((i) => i.menu_item_id === id)!;
    expect(snap.units_sold).toBe(8);
    expect(snap.was_sold_out).toBe(true);
  });

  it("stores an explicit 0, and can clear units back to null (C2)", async () => {
    const { id } = await addMenuItem(service, { name: `${TEST_PREFIX}Churro2`, price: 400 });
    await postLocation(service, { date: DAY, address: "South End", note: null });

    await wrapUpDay(service, { date: DAY, perItemUnits: [{ menuItemId: id, units: 0 }] });
    let snap = (await getDay(service, DAY))!.items.find((i) => i.menu_item_id === id)!;
    expect(snap.units_sold).toBe(0); // explicit zero is stored, not dropped

    await wrapUpDay(service, { date: DAY, perItemUnits: [{ menuItemId: id, units: null }] });
    snap = (await getDay(service, DAY))!.items.find((i) => i.menu_item_id === id)!;
    expect(snap.units_sold).toBeNull(); // cleared, not left stale
  });
});
