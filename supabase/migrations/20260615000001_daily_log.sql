-- Daily log & performance history.
--
-- Fixes the public-read regression on the existing tables (RLS policies were
-- created without the underlying table GRANT, so anon was blocked outright),
-- adds soft delete to menu_items, and adds two PRIVATE tables for end-of-day
-- performance and per-item history that anon must never be able to read.

-- 1. Fix public read: RLS policies need the base table GRANT to take effect.
--    This project doesn't apply Supabase's default table privileges, so the
--    roles must be granted explicitly — including service_role, which does all
--    server-side writes.
grant select on public.locations to anon, authenticated;
grant select on public.menu_items to anon, authenticated;
grant all on public.locations to service_role;
grant all on public.menu_items to service_role;

-- 2. Soft delete for menu items so historical stats keep resolving.
alter table menu_items
  add column is_archived boolean not null default false;

-- 3. Private, 1:1-with-a-day performance record. NOT publicly readable.
create table daily_performance (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null unique references locations(id) on delete cascade,
  revenue_cents integer,            -- null = not logged (distinct from 0)
  customer_count integer,           -- null = not logged
  end_of_day_note text,
  wrapped_at timestamptz,           -- null = wrap-up not submitted yet
  created_at timestamptz default now()
);

-- 4. Private per-(day, item) stats with name/price snapshots.
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

-- 5. Lock the private tables down. RLS on + no policy = anon reads nothing;
--    the service_role used by server routes bypasses RLS. Revoke is defense
--    in depth in case platform default privileges granted anon access.
alter table daily_performance enable row level security;
alter table daily_item_stats enable row level security;
grant all on public.daily_performance to service_role;
grant all on public.daily_item_stats to service_role;
revoke all on public.daily_performance from anon;
revoke all on public.daily_item_stats from anon;
