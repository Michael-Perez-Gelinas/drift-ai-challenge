import { ScreenHeader } from "@/components/admin/ScreenHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { createServiceClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/daily-log/today";
import { LocationForm } from "@/components/admin/today/LocationForm";
import { PostedLocation } from "@/components/admin/today/PostedLocation";
import { SoldOutList, type SoldOutItem } from "@/components/admin/today/SoldOutList";
import { WrapUpSection, type WrapUpItem } from "@/components/admin/today/WrapUpSection";

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

  // Wrap-up prefill comes from today's daily_performance, joined via location id.
  let performance:
    | { revenue_cents: number | null; customer_count: number | null; end_of_day_note: string | null; wrapped_at: string | null }
    | null = null;
  if (location) {
    const { data: perf, error: perfError } = await db
      .from("daily_performance")
      .select("revenue_cents, customer_count, end_of_day_note, wrapped_at")
      .eq("location_id", location.id)
      .maybeSingle();
    if (perfError) throw perfError;
    performance = perf ?? null;
  }

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

  const soldOutItems: SoldOutItem[] = (menuItems ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    isSoldOut: m.is_sold_out,
  }));

  const wrapUpItems: WrapUpItem[] = (menuItems ?? []).map((m) => ({
    id: m.id,
    name: m.name,
  }));

  // --- State 2+: posted -----------------------------------------------------
  return (
    <>
      <ScreenHeader title="Today" subtitle={subtitle} />

      <div className="flex flex-col gap-9">
        <PostedLocation
          address={location.address}
          note={location.note}
          isOpen={location.is_open}
        />

        {soldOutItems.length > 0 ? (
          <section>
            <h2 className="mb-4 font-display text-2xl leading-none text-text-primary">
              What&apos;s running low?
            </h2>
            <SoldOutList items={soldOutItems} />
          </section>
        ) : null}

        <div className="border-t border-border-default pt-2">
          <WrapUpSection
            key={performance?.wrapped_at ?? "unwrapped"}
            items={wrapUpItems}
            defaultRevenueCents={performance?.revenue_cents ?? null}
            defaultCustomerCount={performance?.customer_count ?? null}
            defaultEndOfDayNote={performance?.end_of_day_note ?? null}
            alreadyWrapped={performance?.wrapped_at != null}
          />
        </div>
      </div>
    </>
  );
}
