"use client";

import { useState } from "react";
import { Field } from "@/components/admin/Field";
import { PrimaryButton } from "@/components/admin/PrimaryButton";
import { SecondaryButton } from "@/components/admin/SecondaryButton";
import {
  CATEGORY_SUGGESTIONS,
  dollarsToCents,
  formatPrice,
  type MenuItem,
} from "./types";

export type MenuItemDraft = {
  name: string;
  description: string | null;
  price: number; // cents
  category: string | null;
  image_url: string | null;
};

type MenuItemFormProps = {
  /** When editing, the item to prefill. Omit for an add form. */
  item?: MenuItem;
  pending: boolean;
  onSubmit: (draft: MenuItemDraft) => void;
  /** Only provided when editing — renders the Archive control. */
  onArchive?: () => void;
};

const CATEGORY_LIST_ID = "menu-category-suggestions";

/**
 * The single form behind both Add and Edit. Price is entered in dollars and
 * converted to integer cents on submit. Validates name + price before firing.
 */
export function MenuItemForm({
  item,
  pending,
  onSubmit,
  onArchive,
}: MenuItemFormProps) {
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [priceText, setPriceText] = useState(
    item ? formatPrice(item.price) : ""
  );
  const [category, setCategory] = useState(item?.category ?? "");
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName === "") {
      setError("Give the item a name.");
      return;
    }
    const cents = dollarsToCents(priceText);
    if (cents === null) {
      setError("Enter a valid price, like 8.50.");
      return;
    }
    setError(null);
    onSubmit({
      name: trimmedName,
      description: description.trim() === "" ? null : description.trim(),
      price: cents,
      category: category.trim() === "" ? null : category.trim(),
      image_url: imageUrl.trim() === "" ? null : imageUrl.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Al pastor taco"
        autoFocus={!item}
        required
      />

      <Field
        label="Price"
        hint="In dollars — converted to cents when saved."
        inputMode="decimal"
        value={priceText}
        onChange={(e) => setPriceText(e.target.value)}
        placeholder="8.50"
      />

      <Field label="Category" hint="Groups the item on the board.">
        {(controlId) => (
          <>
            <input
              id={controlId}
              list={CATEGORY_LIST_ID}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Tacos"
              className="w-full rounded-card border border-border-default bg-surface-raised px-4 py-3 text-base text-text-primary placeholder:text-text-muted transition-colors duration-fast focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30"
            />
            <datalist id={CATEGORY_LIST_ID}>
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </>
        )}
      </Field>

      <Field
        label="Description"
        as="textarea"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Marinated pork, onion, cilantro, salsa verde."
      />

      <Field
        label="Image URL"
        hint="Optional."
        type="url"
        inputMode="url"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="https://…"
      />

      {error ? (
        <p className="text-sm text-brand-primary" role="alert">
          {error}
        </p>
      ) : null}

      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Saving…" : item ? "Save changes" : "Add to menu"}
      </PrimaryButton>

      {onArchive ? (
        <div className="border-t border-border-default pt-5">
          {confirmArchive ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-text-secondary">
                Remove this item from the menu? It stays in your history.
              </p>
              <div className="flex gap-3">
                <SecondaryButton
                  fullWidth
                  onClick={() => setConfirmArchive(false)}
                  disabled={pending}
                >
                  Keep it
                </SecondaryButton>
                <SecondaryButton
                  fullWidth
                  onClick={onArchive}
                  disabled={pending}
                  className="border-brand-primary text-brand-primary hover:bg-status-sold-out-bg active:bg-status-sold-out-bg"
                >
                  {pending ? "Removing…" : "Remove"}
                </SecondaryButton>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmArchive(true)}
              disabled={pending}
              className="min-h-11 text-sm font-medium text-text-muted transition-colors hover:text-brand-primary disabled:opacity-50"
            >
              Remove from menu
            </button>
          )}
        </div>
      ) : null}
    </form>
  );
}
