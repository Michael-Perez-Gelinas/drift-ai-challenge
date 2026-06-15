import { ScreenHeader } from "@/components/admin/ScreenHeader";
import { createServiceClient } from "@/lib/supabase/server";
import { MenuManager } from "@/components/admin/menu/MenuManager";
import type { MenuItem } from "@/components/admin/menu/types";

export const dynamic = "force-dynamic";

const UNCATEGORIZED = "Other";

export default async function MenuPage() {
  const db = createServiceClient();
  const { data, error } = await db
    .from("menu_items")
    .select(
      "id, name, description, price, category, image_url, is_sold_out, sort_order, is_archived"
    )
    .eq("is_archived", false)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;

  const items: MenuItem[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    category: row.category,
    image_url: row.image_url,
    is_sold_out: row.is_sold_out,
    sort_order: row.sort_order,
  }));

  const itemCount = items.length;

  return (
    <>
      <ScreenHeader
        title="Menu"
        subtitle={
          itemCount === 0
            ? "What you're serving"
            : `${itemCount} item${itemCount === 1 ? "" : "s"} on the board`
        }
      />
      <MenuManager items={items} uncategorizedLabel={UNCATEGORIZED} />
    </>
  );
}
