/** Today's date as YYYY-MM-DD in the truck's timezone (America/New_York). */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
  }).format(new Date());
}
