"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  addMenuItemAction,
  updateMenuItemAction,
  archiveMenuItemAction,
} from "@/app/admin/actions";
import { PrimaryButton } from "@/components/admin/PrimaryButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { Sheet } from "./Sheet";
import { MenuItemForm, type MenuItemDraft } from "./MenuItemForm";
import { formatPrice, type MenuItem } from "./types";

type MenuManagerProps = {
  items: MenuItem[];
  uncategorizedLabel: string;
};

type Editing = { kind: "add" } | { kind: "edit"; item: MenuItem } | null;

/** Stable category order: first-seen order from the (already category-sorted) list. */
function groupByCategory(
  items: MenuItem[],
  uncategorizedLabel: string
): { category: string; items: MenuItem[] }[] {
  const groups = new Map<string, MenuItem[]>();
  for (const item of items) {
    const key = item.category?.trim() || uncategorizedLabel;
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }
  return Array.from(groups, ([category, groupItems]) => ({
    category,
    items: groupItems,
  }));
}

export function MenuManager({ items, uncategorizedLabel }: MenuManagerProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);
  const [pending, startTransition] = useTransition();

  const groups = groupByCategory(items, uncategorizedLabel);

  function closeSheet() {
    if (pending) return;
    setEditing(null);
  }

  function handleAdd(draft: MenuItemDraft) {
    startTransition(async () => {
      await addMenuItemAction({
        name: draft.name,
        description: draft.description,
        price: draft.price,
        category: draft.category,
        image_url: draft.image_url,
      });
      setEditing(null);
      router.refresh();
    });
  }

  function handleEdit(id: string, draft: MenuItemDraft) {
    startTransition(async () => {
      await updateMenuItemAction(id, {
        name: draft.name,
        description: draft.description,
        price: draft.price,
        category: draft.category,
        image_url: draft.image_url,
      });
      setEditing(null);
      router.refresh();
    });
  }

  function handleArchive(id: string) {
    startTransition(async () => {
      await archiveMenuItemAction(id);
      setEditing(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PrimaryButton onClick={() => setEditing({ kind: "add" })}>
        <Plus className="h-5 w-5" />
        Add item
      </PrimaryButton>

      {items.length === 0 ? (
        <EmptyState
          title="Nothing on the board yet"
          description="Add your first dish and it'll show up here, grouped by category."
        />
      ) : (
        <div className="flex flex-col gap-8 pt-2">
          {groups.map((group) => (
            <section key={group.category}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                {group.category}
              </h2>
              <ul className="flex flex-col">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setEditing({ kind: "edit", item })}
                      className="-mx-2 flex min-h-11 w-full items-baseline gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-surface-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      <span className="flex-1 min-w-0">
                        <span className="flex items-baseline gap-2">
                          <span className="truncate text-base font-medium text-text-primary">
                            {item.name}
                          </span>
                          {item.is_sold_out ? (
                            <span className="shrink-0 rounded-full bg-status-sold-out-bg px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-status-sold-out-text">
                              Sold out
                            </span>
                          ) : null}
                        </span>
                        {item.description ? (
                          <span className="mt-0.5 block truncate text-sm text-text-secondary">
                            {item.description}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 font-body text-base tabular-nums text-text-primary">
                        ${formatPrice(item.price)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Sheet
        open={editing?.kind === "add"}
        onClose={closeSheet}
        title="New item"
      >
        {editing?.kind === "add" ? (
          <MenuItemForm pending={pending} onSubmit={handleAdd} />
        ) : null}
      </Sheet>

      <Sheet
        open={editing?.kind === "edit"}
        onClose={closeSheet}
        title="Edit item"
      >
        {editing?.kind === "edit" ? (
          <MenuItemForm
            item={editing.item}
            pending={pending}
            onSubmit={(draft) => handleEdit(editing.item.id, draft)}
            onArchive={() => handleArchive(editing.item.id)}
          />
        ) : null}
      </Sheet>
    </div>
  );
}
