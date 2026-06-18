import { ScreenHeader } from "@/components/admin/ScreenHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { createServiceClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/daily-log/today";
import { getDay } from "@/lib/daily-log/repository";
import { LocationForm } from "@/components/admin/today/LocationForm";
import { PostedLocation } from "@/components/admin/today/PostedLocation";
import { SoldOutList, type SoldOutItem } from "@/components/admin/today/SoldOutList";
import { CloseDayFlow } from "@/components/admin/today/CloseDayFlow";
import { ClosedSummary } from "@/components/admin/today/ClosedSummary";

type MenuItem = { id: string; name: string };

export const dynamic = "force-dynamic";

/** Friendly long date for the header subtitle, in the truck's timezone. */
function friendlyToday(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export default async function TodayPage() {
  const db = createServiceClient();
  const date = todayISO();

  const { data: location, error: locationError } = await db
    .from("locations")
    .select("id, address, note, is_open")
    .eq("date", date)
    .maybeSingle();
  if (locationError) throw locationError;

  const { data: menuItems, error: menuError } = await db
    .from("menu_items")
    .select("id, name, category, is_sold_out, sort_order")
    .eq("is_archived", false)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });
  if (menuError) throw menuError;

  const subtitle = friendlyToday();

  // --- State 1: nothing posted yet ----------------------------------------
  if (!location) {
    return (
      <>
        <ScreenHeader title="Today" subtitle={subtitle} />
        <EmptyState
          title="Where are you parked today?"
          description="Post your spot so regulars can find you. You can add a note and update it any time."
        >
          <LocationForm />
        </EmptyState>
      </>
    );
  }

  const menuList: MenuItem[] = (menuItems ?? []).map((m) => ({
    id: m.id,
    name: m.name,
  }));

  // --- State 3: posted + closed --------------------------------------------
  if (!location.is_open) {
    const day = await getDay(db, date);
    return (
      <>
        <ScreenHeader title="Today" subtitle={subtitle} />

        <div className="flex flex-col gap-9">
          <PostedLocation address={location.address} note={location.note} />

          <ClosedSummary
            revenueCents={day?.revenue_cents ?? null}
            customerCount={day?.customer_count ?? null}
            endOfDayNote={day?.end_of_day_note ?? null}
            dayItems={(day?.items ?? []).map((i) => ({
              menu_item_id: i.menu_item_id,
              item_name: i.item_name,
              units_sold: i.units_sold,
            }))}
            menuItems={menuList}
          />
        </div>
      </>
    );
  }

  // --- State 2: posted + open ----------------------------------------------
  const soldOutItems: SoldOutItem[] = (menuItems ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    isSoldOut: m.is_sold_out,
  }));

  return (
    <>
      <ScreenHeader title="Today" subtitle={subtitle} />

      <div className="flex flex-col gap-9">
        <PostedLocation address={location.address} note={location.note} />

        {soldOutItems.length > 0 ? (
          <section>
            <h2 className="mb-4 font-display text-2xl leading-none text-text-primary">
              What&apos;s running low?
            </h2>
            <SoldOutList items={soldOutItems} />
          </section>
        ) : null}

        <CloseDayFlow items={menuList} />
      </div>
    </>
  );
}
