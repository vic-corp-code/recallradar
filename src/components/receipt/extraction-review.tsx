"use client";

import * as React from "react";
import { CalendarDays, Plus, Store, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  ExtractedReceipt,
  ExtractionConfidence,
  ReceiptLineItem,
} from "@/lib/receipts/types";
import { cn } from "@/lib/utils";

type ExtractionReviewProps = {
  extraction: ExtractedReceipt;
  onBack: () => void;
};

export function ExtractionReview({
  extraction,
  onBack,
}: ExtractionReviewProps) {
  const [storeName, setStoreName] = React.useState(extraction.store.name ?? "");
  const [purchaseDate, setPurchaseDate] = React.useState(
    extraction.purchaseDate.value ?? "",
  );
  const [lineItems, setLineItems] = React.useState(extraction.lineItems);

  function updateLineItem(id: string, changes: Partial<ReceiptLineItem>) {
    setLineItems((items) =>
      items.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }

  function addLineItem() {
    setLineItems((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        name: "",
        brand: null,
        quantity: null,
        confidence: "low",
      },
    ]);
  }

  function removeLineItem(id: string) {
    setLineItems((items) => items.filter((item) => item.id !== id));
  }

  return (
    <section className="space-y-5 rounded-lg border border-border bg-card p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium text-primary">Extraction review</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Check what we found
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Edit the store, purchase date, or receipt items before recall
          matching runs.
        </p>
      </div>

      <ConfidenceNotice confidence={extraction.extractionConfidence} />

      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Store aria-hidden="true" className="size-4 text-muted-foreground" />
            Store
            <ConfidenceBadge confidence={extraction.store.confidence} />
          </span>
          <input
            className="min-h-11 rounded-lg border border-input bg-background px-3 text-base outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
            onChange={(event) => setStoreName(event.target.value)}
            placeholder="Store name"
            value={storeName}
          />
        </label>

        <label className="grid gap-2">
          <span className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays
              aria-hidden="true"
              className="size-4 text-muted-foreground"
            />
            Purchase date
            <ConfidenceBadge confidence={extraction.purchaseDate.confidence} />
          </span>
          <input
            className="min-h-11 rounded-lg border border-input bg-background px-3 text-base outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
            onChange={(event) => setPurchaseDate(event.target.value)}
            type="date"
            value={purchaseDate}
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Line items</h3>
          <Button onClick={addLineItem} size="sm" type="button" variant="outline">
            <Plus aria-hidden="true" />
            Add
          </Button>
        </div>

        <div className="grid gap-3">
          {lineItems.map((item, index) => (
            <LineItemEditor
              index={index}
              item={item}
              key={item.id}
              onRemove={() => removeLineItem(item.id)}
              onUpdate={(changes) => updateLineItem(item.id, changes)}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-3 pt-2">
        <Button className="h-12" type="button">
          Continue to recall matching
        </Button>
        <Button className="h-12" onClick={onBack} type="button" variant="ghost">
          Back to receipt upload
        </Button>
      </div>
    </section>
  );
}

function LineItemEditor({
  index,
  item,
  onRemove,
  onUpdate,
}: {
  index: number;
  item: ReceiptLineItem;
  onRemove: () => void;
  onUpdate: (changes: Partial<ReceiptLineItem>) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-muted-foreground">
          Item {index + 1}
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceBadge confidence={item.confidence} />
          <Button
            aria-label={`Remove item ${index + 1}`}
            onClick={onRemove}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Product name
          </span>
          <input
            className="min-h-11 rounded-lg border border-input bg-card px-3 text-base outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
            onChange={(event) => onUpdate({ name: event.target.value })}
            placeholder="Product name"
            value={item.name}
          />
        </label>

        <div className="grid grid-cols-[1fr_96px] gap-3">
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Brand
            </span>
            <input
              className="min-h-11 rounded-lg border border-input bg-card px-3 text-base outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
              onChange={(event) =>
                onUpdate({ brand: event.target.value || null })
              }
              placeholder="Optional"
              value={item.brand ?? ""}
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Qty
            </span>
            <input
              className="min-h-11 rounded-lg border border-input bg-card px-3 text-base outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
              min="0"
              onChange={(event) =>
                onUpdate({
                  quantity: event.target.value
                    ? Number.parseFloat(event.target.value)
                    : null,
                })
              }
              placeholder="1"
              type="number"
              value={item.quantity ?? ""}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function ConfidenceNotice({
  confidence,
}: {
  confidence: ExtractionConfidence;
}) {
  if (confidence === "high") {
    return null;
  }

  return (
    <div className="rounded-lg border border-caution/30 bg-caution/10 p-3 text-sm leading-6 text-caution">
      Some fields may need review before recall matching. Receipt descriptions
      can be abbreviated, especially on grocery receipts.
    </div>
  );
}

function ConfidenceBadge({
  confidence,
}: {
  confidence: ExtractionConfidence;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        confidence === "high" && "bg-success/15 text-success",
        confidence === "medium" && "bg-caution/15 text-caution",
        confidence === "low" && "bg-muted text-muted-foreground",
      )}
    >
      {confidence}
    </span>
  );
}
