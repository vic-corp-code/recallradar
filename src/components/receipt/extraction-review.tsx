"use client";

import * as React from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Plus,
  Store,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RecallMatchingResult } from "@/lib/recalls/matching";
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
  const [isMatching, setIsMatching] = React.useState(false);
  const [matchResult, setMatchResult] =
    React.useState<RecallMatchingResult | null>(null);
  const [matchError, setMatchError] = React.useState<string | null>(null);

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

  async function continueToRecallMatching() {
    const cleanLineItems = lineItems
      .map((item) => ({ ...item, name: item.name.trim() }))
      .filter((item) => item.name);

    if (cleanLineItems.length === 0) {
      setMatchError("Add at least one product before recall matching.");
      return;
    }

    setIsMatching(true);
    setMatchError(null);
    setMatchResult(null);

    try {
      const response = await fetch("/api/recalls/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receipt: {
            receiptId: extraction.receiptId,
            store: {
              name: storeName.trim() || null,
              location: extraction.store.location,
            },
            purchaseDate: purchaseDate || null,
            lineItems: cleanLineItems,
          },
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(
          body?.error ?? "Recall matching failed. Please try again.",
        );
      }

      const nextMatchResult = (await response.json()) as RecallMatchingResult;
      setMatchResult(nextMatchResult);
    } catch (error) {
      setMatchError(
        error instanceof Error
          ? error.message
          : "Recall matching failed. Please try again.",
      );
    } finally {
      setIsMatching(false);
    }
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

      {matchResult ? <MatchingSummary result={matchResult} /> : null}

      {matchError ? (
        <p className="rounded-lg bg-risk/10 px-3 py-2 text-sm font-medium text-risk">
          {matchError}
        </p>
      ) : null}

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
        <Button
          className="h-12"
          disabled={isMatching}
          onClick={continueToRecallMatching}
          type="button"
        >
          {isMatching ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : null}
          {isMatching ? "Matching recalls..." : "Continue to recall matching"}
        </Button>
        <Button className="h-12" onClick={onBack} type="button" variant="ghost">
          Back to receipt upload
        </Button>
      </div>
    </section>
  );
}

function MatchingSummary({ result }: { result: RecallMatchingResult }) {
  const hasFlaggedItems = result.summary.flagged > 0;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-sm leading-6",
        hasFlaggedItems
          ? "border-risk/30 bg-risk/10 text-risk"
          : "border-success/30 bg-success/10 text-success",
      )}
    >
      <div className="flex items-start gap-2 font-medium">
        {hasFlaggedItems ? (
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4" />
        ) : (
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4" />
        )}
        <p>
          {hasFlaggedItems
            ? `${result.summary.flagged} product${
                result.summary.flagged > 1 ? "s" : ""
              } may need verification.`
            : "No relevant active recall match found."}
        </p>
      </div>
      <p className="mt-2 text-xs opacity-80">
        Compared {result.summary.totalItems} receipt items with{" "}
        {result.recallCount} active RappelConso recalls.
      </p>
    </div>
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
