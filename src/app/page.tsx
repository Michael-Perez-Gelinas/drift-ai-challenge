import { MapPin } from "lucide-react";
import { createAnonClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/daily-log/today";
import { SiteHeader } from "@/components/customer/SiteHeader";
import { CustomerMap } from "@/components/customer/CustomerMap";
import { TodayMenu, type TodayMenuItem } from "@/components/customer/TodayMenu";
import { LiveRefresh } from "@/components/customer/LiveRefresh";
import { HandDrawnDivider } from "@/components/HandDrawnDivider";

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

  const { data: location, error: locationError } = await db
    .from("locations")
    .select("address, note, lat, lng, is_open")
    .eq("date", date)
    .maybeSingle();
  if (locationError) throw locationError;

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
  const hasCoords = isPosted && location.lat != null && location.lng != null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-16 px-6 py-14 sm:py-20">
      <SiteHeader />

      {/* Today's status — the reason regulars are here. */}
      <section className="flex flex-col gap-5">
        <p className="text-xs uppercase tracking-[0.28em] text-text-muted">
          {friendlyToday()}
        </p>

        {!isPosted && (
          <>
            <h1 className="font-display text-4xl leading-[0.9] text-text-primary">
              We&apos;re not out yet today
            </h1>
            <p className="text-lg leading-relaxed text-text-secondary">
              Check back soon — we&apos;ll drop our spot here the moment
              we&apos;re rolling. Here&apos;s what&apos;s usually on.
            </p>
          </>
        )}

        {isPosted && !isOpen && (
          <>
            <h1 className="font-display text-4xl leading-[0.9] text-text-primary">
              Closed today
            </h1>
            {location.note && (
              <p className="text-lg leading-relaxed text-text-secondary">
                {location.note}
              </p>
            )}
            <p className="text-base text-text-muted">
              Catch us next time — the menu&apos;s below for the craving.
            </p>
          </>
        )}

        {isPosted && isOpen && (
          <>
            <h1 className="font-display text-4xl leading-[0.9] text-text-primary">
              We&apos;re out today!
            </h1>
            <div className="flex items-start gap-2.5">
              <MapPin
                className="mt-1 shrink-0 text-brand-primary"
                size={22}
                strokeWidth={2.25}
                aria-hidden
              />
              <div>
                <p className="text-xl font-medium leading-snug text-text-primary">
                  {location.address}
                </p>
                {location.note && (
                  <p className="mt-1 text-base leading-relaxed text-text-secondary">
                    {location.note}
                  </p>
                )}
              </div>
            </div>
            {hasCoords && (
              <CustomerMap
                lat={location.lat as number}
                lng={location.lng as number}
                label={location.address}
              />
            )}
          </>
        )}
      </section>

      <HandDrawnDivider className="mx-auto h-4 w-40 text-clay-600" />

      {/* The menu — same items the owner curates. */}
      <section className="flex flex-col gap-7">
        <h2 className="font-display text-3xl leading-none text-text-primary">
          The menu
        </h2>
        <TodayMenu items={menuItems} />
      </section>

      <footer className="flex flex-col items-center gap-3 pt-4 text-center">
        <HandDrawnDivider className="h-3 w-20 text-sand-400" />
        <p className="font-display text-2xl text-brand-primary">
          See you out there
        </p>
      </footer>

      <LiveRefresh />
    </main>
  );
}
