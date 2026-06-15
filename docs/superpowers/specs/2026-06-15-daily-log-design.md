# Daily Log & Performance History — Design

**Date:** 2026-06-15
**Status:** Approved (design), pending spec review

## Problem

The owner app records only the *current* state — today's location and a live sold-out flag per
menu item. There is no history. The owner wants each day's activity captured as its own record so
that (a) a new day starts clean and (b) they can return to past days to review how the truck did.

"How it did" includes light, manually-entered sales numbers: estimated revenue, customer count, and
per-item units sold (which yields a top seller). The app has no ordering or payments, so all
performance data is entered by the owner at end of day — there is no automatic sales capture.

## Approach (chosen: A)

Reuse the existing per-day `locations` row as the spine of each day. Location data stays public
(the customer site reads it). Performance numbers are **private** and live in separate tables with
no public read policy, so revenue is never exposed through the customer site. Per-item history lives
in a join table so units and sold-out state are queryable per day and per item.

Rejected: a single `day_logs` JSON blob (not queryable, can't FK to menu items) and adding revenue
columns directly to `locations` (would leak private numbers through the existing public-read policy).

## Data model

### `locations` (existing, public read) — unchanged

Already one row per `date` (unique). Remains the day record for *location* only: `address`, `lat`,
`lng`, `note`, `is_open`, `created_at`. No new columns. This keeps the table safe to read publicly.

### `menu_items` (existing, public read) — add soft delete

```sql
alter table menu_items add column is_archived boolean not null default false;
```

"Delete" in the Menu tab becomes archive: the item is hidden from today's menu (customer + owner)
but preserved so historical stats that reference it still resolve. Today's queries filter
`is_archived = false`.

### `daily_performance` (new, PRIVATE — no public read) — 1:1 with a day

```sql
create table daily_performance (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null unique references locations(id) on delete cascade,
  revenue_cents integer,            -- nullable: null = not logged, not zero
  customer_count integer,           -- nullable
  end_of_day_note text,
  wrapped_at timestamptz,           -- set when the owner submits the wrap-up; null = no numbers yet
  created_at timestamptz default now()
);
```

### `daily_item_stats` (new, PRIVATE — no public read) — per (day, item)

```sql
create table daily_item_stats (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  item_name text not null,          -- snapshot, survives rename/archive/delete
  item_price integer not null,      -- snapshot in cents, survives price change
  units_sold integer,               -- nullable: null = not tracked, 0 = explicitly none
  was_sold_out boolean not null default false,
  unique (location_id, menu_item_id)
);
```

`item_name` and `item_price` are snapshotted at write time so a past day reads correctly even if the
item is later renamed, repriced, or archived. Top seller for a day = the row with the greatest
`units_sold` (nulls ignored).

### RLS

- `locations`, `menu_items` — public read (unchanged). Writes via `service_role` server routes only.
- `daily_performance`, `daily_item_stats` — **no policy for `anon`**, `service_role` only. These hold
  private revenue and sales data and must be unreadable by the public.

## Sold-out: live flag + history mirror

`menu_items.is_sold_out` stays the **live** flag the customer site reads for "today" (simplest, no
change to the public query). History is kept in sync without depending on the owner remembering to do
anything:

- **Toggle sold out** (Today tab): one server action updates `menu_items.is_sold_out` *and* upserts
  the matching `daily_item_stats` row for today (`was_sold_out`, with name/price snapshot).
- **Start of a new day** (first time a location is posted for a new `date`): reset all
  `menu_items.is_sold_out = false`, so the new day starts with everything available.

## Daily lifecycle (automatic — no "start new day" button)

Days roll over by calendar date. "Today" is `where date = current_date`.

1. **Morning** — owner posts today's location → creates today's `locations` row; sold-out flags reset.
2. **Service** — sold-out toggles write live + mirror to `daily_item_stats`.
3. **End of day** — "Wrap up today" form captures revenue, customer count, optional per-item units,
   and an end-of-day note → upserts `daily_performance` (sets `wrapped_at`) and unit counts into
   `daily_item_stats`.
4. **Anytime later** — every past day is editable from History, so a forgotten night can be filled in.

## Server actions / API surface

All writes go through server-side routes/actions using `service_role` (per existing convention).

- `postLocation(date, address, note)` — upsert `locations` for the date; on first creation of a new
  date, reset `menu_items.is_sold_out`.
- `toggleSoldOut(itemId)` — update `menu_items.is_sold_out`; upsert today's `daily_item_stats`.
- `wrapUpDay(date, { revenue_cents, customer_count, end_of_day_note, perItemUnits })` — upsert
  `daily_performance`; upsert `units_sold` into `daily_item_stats`; set `wrapped_at`.
- Menu CRUD — add/edit as planned; **delete → set `is_archived = true`**.
- `listDays()` — `locations` desc joined with `daily_performance` (date, location summary, revenue if
  logged, open/closed).
- `getDay(date)` — full day detail: location, performance, per-item stats; editable.

## UI

Bottom nav gains a third tab: **Today | Menu | History**.

- **Today** — post location + sold-out toggles (as planned), plus a collapsed **"Wrap up today"**
  section that expands to the numbers form (revenue, customers, optional per-item units, note).
- **Menu** — as planned; delete archives.
- **History** — reverse-chronological list of days. Each row shows date, location, open/closed, and
  revenue *if logged* (otherwise "no numbers logged" — never a misleading $0). Tapping opens the day
  detail (the preview layout: location, revenue, customers, top seller, sold-out items), fully
  editable.

## Customer site impact

None. The customer site reads only `locations` and `menu_items` (both public). The private
performance tables are invisible to it — no risk of leaking revenue.

## Edge cases

- **Not wrapped up:** `wrapped_at` null → History shows "no numbers logged," not $0.
- **`units_sold` null vs 0:** null = not tracked (ignored for top seller); 0 = explicitly none.
- **Archived item:** excluded from today's menu (customer + owner); still present in history via the
  snapshot fields.
- **Only posted days are logged.** A day exists in History only if a location was posted for it.
  Existing days are editable; there is no way to create a past-day record that was never posted. A
  day the owner forgot to post simply has no record — that is intended, not a gap to fill.

## Testing

- **RLS (critical):** an `anon` client cannot `select` from `daily_performance` or `daily_item_stats`.
  Revenue privacy is the highest-risk property.
- New-day rollover resets `menu_items.is_sold_out`.
- `toggleSoldOut` mirrors state into today's `daily_item_stats` with correct snapshots.
- Top-seller derivation ignores null `units_sold`.
- Archived items are excluded from today's menu but resolve in historical day detail.
- `wrapUpDay` is idempotent (re-submitting edits the same day, doesn't duplicate rows).

## Out of scope

- Automatic sales capture, ordering, payments (unchanged from original spec).
- Charts / trends across days (the data model supports it later; not built now).
- Creating past-day records that were never posted (only days with a posted location are logged).
