# Daily Log Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the data layer for per-day logging and private performance history — schema, RLS privacy, snapshot logic, and the server-side functions the owner UI will call.

**Architecture:** `locations` stays the public per-day spine. Two new **private** tables (`daily_performance`, `daily_item_stats`) hold revenue and per-item history with no `anon` read access. `menu_items` gains soft-delete (`is_archived`). All writes flow through repository functions that take a Supabase client, so they're testable headless against local Supabase.

**Tech Stack:** Supabase (Postgres 17 local), `@supabase/supabase-js`, TypeScript, Vitest (added here for the first tests in the repo), `@next/env` to load `.env.local` into tests.

**Scope note:** This plan covers the data layer only. The admin UI shell (login, `/admin` layout, Today/Menu/History tabs) is a separate prerequisite plan; the wrap-up form and History screens are built there on top of these functions.

---

## File Structure

- Create: `supabase/migrations/20260615000001_daily_log.sql` — schema + RLS for the new tables and `is_archived`.
- Modify: `src/lib/supabase/database.types.ts` — add the two new tables and the `is_archived` column.
- Create: `src/lib/daily-log/stats.ts` — pure derivation helpers (top seller, revenue formatting).
- Create: `src/lib/daily-log/stats.test.ts` — unit tests for the pure helpers.
- Create: `src/lib/daily-log/repository.ts` — `postLocation`, `toggleSoldOut`, `wrapUpDay`, `listDays`, `getDay`.
- Create: `src/lib/daily-log/repository.test.ts` — integration tests against local Supabase, including the RLS privacy guarantee.
- Create: `vitest.config.ts`, `vitest.setup.ts` — test runner config that loads `.env.local`.
- Modify: `package.json` — add `test` script and Vitest/dotenv-via-`@next/env` dev dependency.

---

## Task 1: Migration — soft delete + private performance tables

**Files:**
- Create: `supabase/migrations/20260615000001_daily_log.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Soft delete for menu items so historical stats keep resolving.
alter table menu_items
  add column is_archived boolean not null default false;

-- Private, 1:1-with-a-day performance record. NOT publicly readable.
create table daily_performance (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null unique references locations(id) on delete cascade,
  revenue_cents integer,            -- null = not logged (distinct from 0)
  customer_count integer,           -- null = not logged
  end_of_day_note text,
  wrapped_at timestamptz,           -- null = wrap-up not submitted yet
  created_at timestamptz default now()
);

-- Private per-(day, item) stats with name/price snapshots.
create table daily_item_stats (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  item_name text not null,          -- snapshot at write time
  item_price integer not null,      -- snapshot in cents
  units_sold integer,               -- null = not tracked, 0 = explicitly none
  was_sold_out boolean not null default false,
  unique (location_id, menu_item_id)
);

-- RLS ON with NO anon policy = anon reads nothing; service_role bypasses RLS.
alter table daily_performance enable row level security;
alter table daily_item_stats enable row level security;
```

- [ ] **Step 2: Apply the migration to local Supabase**

Run: `npx supabase start` (if not already running), then `npx supabase db reset`
Expected: reset completes, seed reloads, no SQL errors. `db reset` re-runs all migrations from scratch.

- [ ] **Step 3: Verify the schema landed**

Run:
```bash
npx supabase db reset >/dev/null 2>&1 && \
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\d daily_performance" -c "\d daily_item_stats" -c "\d menu_items"
```
Expected: both new tables print their columns; `menu_items` shows `is_archived | boolean | not null | false`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260615000001_daily_log.sql
git commit -m "feat(db): add soft delete + private daily performance tables"
```

---

## Task 2: Add the new tables to the typed schema

**Files:**
- Modify: `src/lib/supabase/database.types.ts`

- [ ] **Step 1: Add `is_archived` to `menu_items` Row**

In the `menu_items` `Row` block, add after `sort_order: number;`:

```ts
          is_archived: boolean;
```

(The existing `Insert`/`Update` use `Omit`/`Partial` over `Row`, so they pick this up automatically.)

- [ ] **Step 2: Add the two new tables**

Inside `Tables`, after the `menu_items` block, add:

```ts
      daily_performance: {
        Row: {
          id: string;
          location_id: string;
          revenue_cents: number | null;
          customer_count: number | null;
          end_of_day_note: string | null;
          wrapped_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["daily_performance"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["daily_performance"]["Insert"]>;
      };
      daily_item_stats: {
        Row: {
          id: string;
          location_id: string;
          menu_item_id: string | null;
          item_name: string;
          item_price: number;
          units_sold: number | null;
          was_sold_out: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["daily_item_stats"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["daily_item_stats"]["Insert"]>;
      };
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/database.types.ts
git commit -m "feat(types): add daily_performance and daily_item_stats"
```

---

## Task 3: Add Vitest and the pure stats helpers (TDD)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `src/lib/daily-log/stats.ts`
- Test: `src/lib/daily-log/stats.test.ts`

- [ ] **Step 1: Install Vitest**

Run: `npm i -D vitest@^2`
Expected: installs without peer-dep errors.

- [ ] **Step 2: Add the test script**

In `package.json` `scripts`, add after `"lint": "next lint"`:

```json
    "test": "vitest run"
```

- [ ] **Step 3: Create the Vitest config and env setup**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname },
  },
});
```

Create `vitest.setup.ts` (loads `.env.local` exactly like Next does, so integration tests get the Supabase keys):

```ts
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
```

- [ ] **Step 4: Write the failing test**

Create `src/lib/daily-log/stats.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { topSeller, formatRevenue } from "@/lib/daily-log/stats";

describe("topSeller", () => {
  it("returns the item with the most units sold", () => {
    const result = topSeller([
      { item_name: "Al Pastor", units_sold: 62 },
      { item_name: "Birria", units_sold: 40 },
    ]);
    expect(result).toEqual({ item_name: "Al Pastor", units_sold: 62 });
  });

  it("ignores rows with null units_sold", () => {
    const result = topSeller([
      { item_name: "Al Pastor", units_sold: null },
      { item_name: "Birria", units_sold: 5 },
    ]);
    expect(result).toEqual({ item_name: "Birria", units_sold: 5 });
  });

  it("returns null when no row has units tracked", () => {
    expect(topSeller([{ item_name: "Al Pastor", units_sold: null }])).toBeNull();
    expect(topSeller([])).toBeNull();
  });
});

describe("formatRevenue", () => {
  it("formats cents as dollars", () => {
    expect(formatRevenue(124000)).toBe("$1,240");
  });

  it("returns a placeholder for null", () => {
    expect(formatRevenue(null)).toBe("—");
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm test -- stats`
Expected: FAIL — cannot resolve `@/lib/daily-log/stats`.

- [ ] **Step 6: Write the implementation**

Create `src/lib/daily-log/stats.ts`:

```ts
export type ItemUnits = { item_name: string; units_sold: number | null };

/** The item with the highest tracked units_sold; null if none are tracked. */
export function topSeller<T extends ItemUnits>(items: T[]): T | null {
  const tracked = items.filter((i) => i.units_sold !== null);
  if (tracked.length === 0) return null;
  return tracked.reduce((best, i) =>
    (i.units_sold ?? 0) > (best.units_sold ?? 0) ? i : best
  );
}

/** Whole-dollar revenue string from cents; em dash when not logged. */
export function formatRevenue(cents: number | null): string {
  if (cents === null) return "—";
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test -- stats`
Expected: PASS — all 5 assertions green.

- [ ] **Step 8: Commit**

```bash
git add package.json vitest.config.ts vitest.setup.ts src/lib/daily-log/stats.ts src/lib/daily-log/stats.test.ts
git commit -m "feat(daily-log): add Vitest and pure stats helpers"
```

---

## Task 4: Repository functions (integration TDD against local Supabase)

**Files:**
- Create: `src/lib/daily-log/repository.ts`
- Test: `src/lib/daily-log/repository.test.ts`

**Prerequisite for this task's tests:** local Supabase running (`npx supabase start`) and `.env.local` populated with the values from `npx supabase status` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/daily-log/repository.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  postLocation,
  toggleSoldOut,
  wrapUpDay,
  listDays,
  getDay,
} from "@/lib/daily-log/repository";

const service = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TODAY = "2026-06-15";

async function firstMenuItemId() {
  const { data } = await service.from("menu_items").select("id").limit(1).single();
  return data!.id;
}

beforeEach(async () => {
  // Clean per-test state; leave seeded menu_items in place.
  await service.from("daily_item_stats").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await service.from("daily_performance").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await service.from("locations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await service.from("menu_items").update({ is_sold_out: true }).neq("id", "00000000-0000-0000-0000-000000000000");
});

describe("postLocation", () => {
  it("creates today's row and resets sold-out flags on a new day", async () => {
    await postLocation(service, { date: TODAY, address: "South End, Boston", note: "by the fountain" });

    const { data: loc } = await service.from("locations").select("*").eq("date", TODAY).single();
    expect(loc!.address).toBe("South End, Boston");

    const { data: items } = await service.from("menu_items").select("is_sold_out");
    expect(items!.every((i) => i.is_sold_out === false)).toBe(true);
  });
});

describe("toggleSoldOut", () => {
  it("sets the live flag and mirrors a snapshot into today's stats", async () => {
    await postLocation(service, { date: TODAY, address: "South End", note: null });
    const itemId = await firstMenuItemId();

    await toggleSoldOut(service, { itemId, soldOut: true, today: TODAY });

    const { data: item } = await service.from("menu_items").select("is_sold_out, name, price").eq("id", itemId).single();
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
    await postLocation(service, { date: TODAY, address: "South End", note: null });
    const itemId = await firstMenuItemId();

    await wrapUpDay(service, {
      date: TODAY,
      revenueCents: 124000,
      customerCount: 85,
      endOfDayNote: "slammed at lunch",
      perItemUnits: [{ menuItemId: itemId, units: 62 }],
    });
    // Re-submit with a correction — must edit, not duplicate.
    await wrapUpDay(service, {
      date: TODAY,
      revenueCents: 130000,
      customerCount: 90,
      endOfDayNote: "updated",
      perItemUnits: [{ menuItemId: itemId, units: 64 }],
    });

    const { data: perf } = await service.from("daily_performance").select("*");
    expect(perf!.length).toBe(1);
    expect(perf![0].revenue_cents).toBe(130000);
    expect(perf![0].wrapped_at).not.toBeNull();

    const { data: stats } = await service.from("daily_item_stats").select("units_sold").eq("menu_item_id", itemId);
    expect(stats!.length).toBe(1);
    expect(stats![0].units_sold).toBe(64);
  });
});

describe("listDays / getDay", () => {
  it("returns posted days newest-first and a full day detail", async () => {
    await postLocation(service, { date: "2026-06-14", address: "Seaport", note: null });
    await postLocation(service, { date: TODAY, address: "South End", note: null });
    await wrapUpDay(service, { date: TODAY, revenueCents: 90000, customerCount: 50, endOfDayNote: null, perItemUnits: [] });

    const days = await listDays(service);
    expect(days.map((d) => d.date)).toEqual([TODAY, "2026-06-14"]);
    expect(days[0].revenue_cents).toBe(90000);
    expect(days[1].revenue_cents).toBeNull();

    const detail = await getDay(service, TODAY);
    expect(detail!.address).toBe("South End");
    expect(detail!.revenue_cents).toBe(90000);
    expect(Array.isArray(detail!.items)).toBe(true);
  });
});

describe("RLS privacy (highest-risk)", () => {
  it("anon cannot read private performance tables", async () => {
    await postLocation(service, { date: TODAY, address: "South End", note: null });
    await wrapUpDay(service, { date: TODAY, revenueCents: 99999, customerCount: 10, endOfDayNote: "secret", perItemUnits: [] });

    const anon = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const perf = await anon.from("daily_performance").select("*");
    const itemStats = await anon.from("daily_item_stats").select("*");

    // RLS with no anon policy returns zero rows (not an error).
    expect(perf.data ?? []).toHaveLength(0);
    expect(itemStats.data ?? []).toHaveLength(0);

    // Sanity: anon CAN still read public location data.
    const anonLoc = await anon.from("locations").select("address").eq("date", TODAY).single();
    expect(anonLoc.data!.address).toBe("South End");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- repository`
Expected: FAIL — cannot resolve `@/lib/daily-log/repository`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/daily-log/repository.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type DB = SupabaseClient<Database>;

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
  items: { item_name: string; item_price: number; units_sold: number | null; was_sold_out: boolean }[];
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

  const { data, error } = await db
    .from("locations")
    .upsert(
      { date: input.date, address: input.address, note: input.note ?? null, is_open: true },
      { onConflict: "date" }
    )
    .select("id")
    .single();
  if (error) throw error;

  if (existing === null) {
    const { error: resetError } = await db
      .from("menu_items")
      .update({ is_sold_out: false })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (resetError) throw resetError;
  }
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
  const { data, error } = await db
    .from("locations")
    .select("date, address, is_open, daily_performance(revenue_cents)")
    .order("date", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const perf = row.daily_performance as { revenue_cents: number | null } | { revenue_cents: number | null }[] | null;
    const revenue = Array.isArray(perf) ? (perf[0]?.revenue_cents ?? null) : (perf?.revenue_cents ?? null);
    return { date: row.date, address: row.address, is_open: row.is_open, revenue_cents: revenue };
  });
}

/** Full detail for one posted day, or null if that date was never posted. */
export async function getDay(db: DB, date: string): Promise<DayDetail | null> {
  const { data: loc, error } = await db
    .from("locations")
    .select("date, address, note, is_open")
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  if (!loc) return null;

  const { data: perf } = await db
    .from("daily_performance")
    .select("revenue_cents, customer_count, end_of_day_note")
    .eq("location_id", (await locationIdForDate(db, date))!)
    .maybeSingle();

  const { data: items } = await db
    .from("daily_item_stats")
    .select("item_name, item_price, units_sold, was_sold_out")
    .eq("location_id", (await locationIdForDate(db, date))!);

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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- repository`
Expected: PASS — all 6 tests green, including the RLS privacy test.

- [ ] **Step 5: Run the full suite and type-check**

Run: `npm test && npx tsc --noEmit`
Expected: all tests pass; no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/daily-log/repository.ts src/lib/daily-log/repository.test.ts
git commit -m "feat(daily-log): add repository functions with RLS privacy tests"
```

---

## Self-Review

**Spec coverage:**
- Soft delete (`is_archived`) → Task 1, Task 2. ✓
- Private `daily_performance` / `daily_item_stats`, no anon read → Task 1 (RLS), Task 4 (privacy test). ✓
- Name/price snapshots survive menu edits → `toggleSoldOut` + `wrapUpDay` snapshot logic, asserted in Task 4. ✓
- Sold-out live flag + mirror to stats → `toggleSoldOut`, Task 4. ✓
- New-day reset of sold-out flags → `postLocation`, Task 4. ✓
- Wrap-up sets `wrapped_at`, idempotent → `wrapUpDay`, Task 4. ✓
- `units_sold` null vs 0; top seller ignores null → `stats.ts`, Task 3. ✓
- `listDays` / `getDay`, "no numbers logged" via null revenue → Task 4. ✓
- Only posted days are logged (no backfill) → `wrapUpDay` throws without a posted location; no create-past-day function exists. ✓
- **Not covered here (by design):** UI screens, login/admin shell, charts/trends — deferred to the follow-up UI plan.

**Placeholder scan:** No TBD/TODO; every code step shows complete code; every run step shows expected output. ✓

**Type consistency:** `toggleSoldOut` takes `{ itemId, soldOut, today }` in both test and impl; `wrapUpDay` takes `perItemUnits: { menuItemId, units }[]` in both; `DaySummary`/`DayDetail` shapes match the test assertions; `topSeller`/`formatRevenue` signatures match `stats.test.ts`. ✓

---

## Execution Handoff

(Filled in by the assistant after the user reviews the plan.)
