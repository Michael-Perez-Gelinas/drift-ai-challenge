import Link from "next/link";
import { ScreenHeader } from "@/components/admin/ScreenHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { createServiceClient } from "@/lib/supabase/server";
import { listDays, type DaySummary } from "@/lib/daily-log/repository";
import { formatRevenue } from "@/lib/daily-log/stats";

export const dynamic = "force-dynamic";

/** "2026-06-14" → "Sun, Jun 14". Parsed as a local calendar date, no TZ shift. */
function friendlyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function DayRow({ day }: { day: DaySummary }) {
  const revenue =
    day.revenue_cents === null ? null : formatRevenue(day.revenue_cents);

  return (
    <li>
      <Link
        href={`/admin/history/${day.date}`}
        className="group flex min-h-[44px] items-baseline justify-between gap-4 border-b border-border-default py-4 transition-colors duration-fast ease-default hover:bg-background-subtle"
      >
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-medium text-text-primary">
              {friendlyDate(day.date)}
            </span>
            <span
              className={
                day.is_open
                  ? "rounded-full bg-status-open-bg px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-status-open-text"
                  : "rounded-full bg-status-sold-out-bg px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-status-sold-out-text"
              }
            >
              {day.is_open ? "Open" : "Closed"}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-text-secondary">
            {day.address}
          </p>
        </div>
        <span
          className={
            revenue === null
              ? "shrink-0 text-sm text-text-muted"
              : "shrink-0 font-display text-2xl leading-none text-text-primary"
          }
        >
          {revenue === null ? "No numbers logged" : revenue}
        </span>
      </Link>
    </li>
  );
}

export default async function HistoryPage() {
  const db = createServiceClient();
  const days = await listDays(db);

  return (
    <>
      <ScreenHeader title="History" subtitle="Every day you've logged" />
      {days.length === 0 ? (
        <EmptyState
          title="Nothing logged yet"
          description="Once you post a location, each day shows up here with the numbers you wrap up."
        />
      ) : (
        <ul className="flex flex-col">
          {days.map((day) => (
            <DayRow key={day.date} day={day} />
          ))}
        </ul>
      )}
    </>
  );
}
