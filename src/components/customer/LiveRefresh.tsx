"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Live-refresh wrapper. Subscribes to postgres_changes on `locations` and
 * `menu_items` via the browser anon client; on any change, refreshes the
 * Server Component tree so the page reflects what the owner just posted.
 *
 * Real-time requires the tables to be in the `supabase_realtime` publication
 * (handled by the orchestrator). If events never arrive, this simply no-ops.
 */
export function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("customer-live-refresh")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "locations" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
