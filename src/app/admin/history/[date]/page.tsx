import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ScreenHeader } from "@/components/admin/ScreenHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { SecondaryButton } from "@/components/admin/SecondaryButton";
import { DayNumbersForm } from "@/components/admin/history/DayNumbersForm";
import { createServiceClient } from "@/lib/supabase/server";
import { getDay } from "@/lib/daily-log/repository";
import { topSeller, formatRevenue } from "@/lib/daily-log/stats";

export const dynamic = "force-dynamic";

/** "2026-06-14" → "Sunday, June 14". Local calendar date, no TZ shift. */
function friendlyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** A label/value pair stacked for the at-a-glance read. */
function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">
        {label}
      </dt>
      <dd className="text-text-primary">{value}</dd>
    </div>
  );
}

export default async function HistoryDayPage({
  params,
}: {
  params: { date: string };
}) {
  const db = createServiceClient();
  const day = await getDay(db, params.date);

  const back = (
    <Link
      href="/admin/history"
      className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary transition-colors duration-fast hover:text-text-primary"
    >
      <ArrowLeft className="h-4 w-4" />
      History
    </Link>
  );

  if (!day) {
    return (
      <>
        <ScreenHeader title="Not found" action={back} />
        <EmptyState
          title="No day here"
          description={`Nothing was ever logged for ${params.date}.`}
        >
          <Link href="/admin/history">
            <SecondaryButton fullWidth>Back to history</SecondaryButton>
          </Link>
        </EmptyState>
      </>
    );
  }

  const best = topSeller(day.items);
  const soldOut = day.items.filter((i) => i.was_sold_out);
  const hasNumbers =
    day.revenue_cents !== null || day.customer_count !== null;

  return (
    <>
      <ScreenHeader
        title={friendlyDate(day.date)}
        subtitle={day.is_open ? "Open" : "Closed"}
        action={back}
      />

      {/* Location */}
      <section className="border-t border-border-default py-5">
        <h2 className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Where you parked
        </h2>
        <p className="mt-1 text-base text-text-primary">{day.address}</p>
        {day.note ? (
          <p className="mt-1 text-sm text-text-secondary">{day.note}</p>
        ) : null}
      </section>

      {/* The numbers */}
      <section className="border-t border-border-default py-5">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-wide text-text-muted">
          The day in numbers
        </h2>
        {hasNumbers ? (
          <dl className="flex flex-col gap-5">
            <Stat
              label="Revenue"
              value={
                day.revenue_cents === null ? (
                  <span className="text-text-muted">No numbers logged</span>
                ) : (
                  <span className="font-display text-4xl leading-none">
                    {formatRevenue(day.revenue_cents)}
                  </span>
                )
              }
            />
            <Stat
              label="Customers"
              value={
                day.customer_count === null ? (
                  <span className="text-text-muted">—</span>
                ) : (
                  <span className="text-2xl font-medium">
                    {day.customer_count.toLocaleString("en-US")}
                  </span>
                )
              }
            />
            <Stat
              label="Top seller"
              value={
                best && best.units_sold !== null ? (
                  <span>
                    {best.item_name}{" "}
                    <span className="text-text-secondary">
                      · {best.units_sold} sold
                    </span>
                  </span>
                ) : (
                  <span className="text-text-muted">Not tracked</span>
                )
              }
            />
          </dl>
        ) : (
          <p className="text-sm text-text-muted">
            No numbers logged for this day yet.
          </p>
        )}
      </section>

      {/* Sold-out items */}
      {soldOut.length > 0 ? (
        <section className="border-t border-border-default py-5">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
            Sold out
          </h2>
          <ul className="flex flex-col gap-1.5">
            {soldOut.map((item) => (
              <li
                key={item.item_name}
                className="text-base text-text-primary"
              >
                {item.item_name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* End-of-day note */}
      {day.end_of_day_note ? (
        <section className="border-t border-border-default py-5">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
            End-of-day note
          </h2>
          <p className="text-base leading-relaxed text-text-primary">
            {day.end_of_day_note}
          </p>
        </section>
      ) : null}

      {/* Edit */}
      <section className="border-t border-border-default py-5">
        <DayNumbersForm
          date={day.date}
          defaultRevenueCents={day.revenue_cents}
          defaultCustomerCount={day.customer_count}
          defaultEndOfDayNote={day.end_of_day_note}
        />
      </section>
    </>
  );
}
