import { MapPin } from "lucide-react";
import { createAnonClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/daily-log/today";
import { SiteHeader } from "@/components/customer/SiteHeader";
import { CustomerMap } from "@/components/customer/CustomerMap";
import { TodayMenu, type TodayMenuItem } from "@/components/customer/TodayMenu";
import { LiveRefresh } from "@/components/customer/LiveRefresh";

// Reads the DB on every request — public, always-fresh.
export const dynamic = "force-dynamic";

/** Friendly long date, in the truck's timezone. */
function friendlyToday(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export default async function Home() {
  const db = createAnonClient();
  const date = todayISO();

  // Today's location. A missing row is a valid "not posted" state, not an error.
  const { data: location, error: locationError } = await db
    .from("locations")
    .select("address, note, lat, lng, is_open")
    .eq("date", date)
    .maybeSingle();
  if (locationError) throw locationError;

  // The menu — same data the owner curates.
  const { data: menuData, error: menuError } = await db
    .from("menu_items")
    .select("name, description, price, category, is_sold_out")
    .eq("is_archived", false)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });
  if (menuError) throw menuError;

  const menuItems: TodayMenuItem[] = menuData ?? [];

  const isPosted = location != null;
  const isOpen = isPosted && location.is_open;
  const hasCoords =
    isPosted && location.lat != null && location.lng != null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-12 px-5 py-12 sm:px-8 sm:py-16">
      <SiteHeader />

      <section className="flex flex-col gap-4">
        <p className="text-sm uppercase tracking-[0.18em] text-text-muted">
          {friendlyToday()}
        </p>

        {/* --- State 1: not posted yet --------------------------------------- */}
        {!isPosted && (
          <div className="flex flex-col gap-3">
            <h1 className="font-display text-3xl leading-none text-text-primary sm:text-4xl">
              We&apos;re not out yet today
            </h1>
            <p className="text-lg text-text-secondary">
              Check back soon — we&apos;ll post our spot the moment we&apos;re
              rolling. Here&apos;s what&apos;s usually on.
            </p>
          </div>
        )}

        {/* --- State 2: closed ---------------------------------------------- */}
        {isPosted && !isOpen && (
          <div className="flex flex-col gap-3">
            <h1 className="font-display text-3xl leading-none text-text-primary sm:text-4xl">
              Closed today
            </h1>
            {location.note && (
              <p className="text-lg text-text-secondary">{location.note}</p>
            )}
            <p className="text-base text-text-muted">
              Catch us next time — here&apos;s the menu in the meantime.
            </p>
          </div>
        )}

        {/* --- State 3: open ------------------------------------------------ */}
        {isPosted && isOpen && (
          <div className="flex flex-col gap-4">
            <h1 className="font-display text-3xl leading-none text-text-primary sm:text-4xl">
              We&apos;re out today
            </h1>
            <div className="flex items-start gap-2 text-lg text-text-primary">
              <MapPin
                className="mt-1 shrink-0 text-brand-primary"
                size={20}
                aria-hidden
              />
              <span>{location.address}</span>
            </div>
            {location.note && (
              <p className="text-base text-text-secondary">{location.note}</p>
            )}
            {hasCoords && (
              <CustomerMap
                lat={location.lat as number}
                lng={location.lng as number}
                label={location.address}
              />
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-5 border-t border-border-default pt-10">
        <h2 className="font-display text-2xl leading-none text-text-primary">
          The Menu
        </h2>
        <TodayMenu items={menuItems} />
      </section>

      <LiveRefresh />
    </main>
  );
}
