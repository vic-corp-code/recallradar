"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import {
  CalendarDays,
  Plus,
  Store,
  Trash2,
} from "lucide-react";

import { AnalysisResult } from "@/components/receipt/analysis-result";
import { ProcessingIndicator } from "@/components/receipt/processing-indicator";
import { Button } from "@/components/ui/button";
import type { RecallMatchingResult } from "@/lib/recalls/matching";
import type {
  ExtractedReceipt,
  ExtractionConfidence,
  ReceiptExtractionMode,
  ReceiptExtractionSuccessOutcome,
  ReceiptLineItem,
} from "@/lib/receipts/types";
import { saveReceiptCheck } from "@/lib/receipts/history";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";

type ProcessingStage = "matching" | "preparing";

type ExtractionReviewProps = {
  extraction: ExtractedReceipt;
  onBack: () => void;
};

export function ExtractionReview({
  extraction,
  onBack,
}: ExtractionReviewProps) {
  const [storeName, setStoreName] = React.useState(extraction.store.name ?? "");
  const [storeLocation, setStoreLocation] = React.useState(
    extraction.store.location ?? "",
  );
  const [purchaseDate, setPurchaseDate] = React.useState(
    extraction.purchaseDate.value ?? "",
  );
  const [lineItems, setLineItems] = React.useState(extraction.lineItems);
  const [processingStage, setProcessingStage] =
    React.useState<ProcessingStage | null>(null);
  const [matchResult, setMatchResult] =
    React.useState<RecallMatchingResult | null>(null);
  const [matchError, setMatchError] = React.useState<string | null>(null);
  const [saveWarning, setSaveWarning] = React.useState<string | null>(null);
  const saveAnalysisResult = useMutation(api.receipts.saveAnalysisResult);

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
        price: null,
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

    setProcessingStage("matching");
    setMatchError(null);
    setSaveWarning(null);
    setMatchResult(null);

    try {
      const response = await Promise.all([
        fetch("/api/recalls/match", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            receipt: {
              receiptId: extraction.receiptId,
              store: {
                name: storeName.trim() || null,
                location: storeLocation.trim() || null,
              },
              purchaseDate: purchaseDate || null,
              lineItems: cleanLineItems,
            },
          }),
        }),
        wait(900),
      ]).then(([matchResponse]) => matchResponse);

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(
          body?.error ?? "Recall matching failed. Please try again.",
        );
      }

      const nextMatchResult = (await response.json()) as RecallMatchingResult;
      setProcessingStage("preparing");
      await saveAnalysisResult({
        extraction: {
          sourceFile: extraction.sourceFile,
          store: {
            name: storeName.trim() || null,
            location: storeLocation.trim() || null,
          },
          purchaseDate: {
            value: purchaseDate || null,
          },
          extractionConfidence: extraction.extractionConfidence,
          needsReview: extraction.needsReview,
          provider: extraction.provider,
          mode: extraction.mode,
          outcome: extraction.outcome,
          fallbackReason: extraction.fallbackReason,
        },
        result: {
          items: nextMatchResult.items,
        },
      }).catch((saveError) => {
        const message =
          saveError instanceof Error
            ? saveError.message
            : "Unknown save error.";

        setSaveWarning(
          `Receipt matched, but it could not be saved to history. ${message}`,
        );
      });
      await wait(500);
      saveReceiptCheck({
        id: nextMatchResult.receiptId,
        storeName: storeName.trim() || extraction.store.name,
        purchaseDate: purchaseDate || extraction.purchaseDate.value,
        createdAt: nextMatchResult.matchedAt,
        result: nextMatchResult,
      });
      setMatchResult(nextMatchResult);
    } catch (error) {
      setMatchError(
        error instanceof Error
          ? error.message
          : "Recall matching failed. Please try again.",
      );
    } finally {
      setProcessingStage(null);
    }
  }

  if (processingStage) {
    return <ProcessingIndicator items={lineItems} stage={processingStage} />;
  }

  if (matchResult) {
    return (
      <AnalysisResult
        onScanAnother={onBack}
        result={matchResult}
        saveWarning={saveWarning}
      />
    );
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
      <ExtractionDiagnostics extraction={extraction} />

      {matchError ? (
        <p className="rounded-lg bg-risk/10 px-3 py-2 text-sm font-medium text-risk">
          {matchError}
        </p>
      ) : null}

      <div className="grid gap-4">
        <div className="grid gap-2">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Store aria-hidden="true" className="size-4 text-muted-foreground" />
            Store
            <ConfidenceBadge confidence={extraction.store.confidence} />
          </span>
          <div className="grid grid-cols-[1fr_1fr] gap-3">
            <input
              className="min-h-11 rounded-lg border border-input bg-background px-3 text-base outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
              onChange={(event) => setStoreName(event.target.value)}
              placeholder="Store name"
              value={storeName}
            />
            <input
              className="min-h-11 rounded-lg border border-input bg-background px-3 text-base outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
              onChange={(event) => setStoreLocation(event.target.value)}
              placeholder="City or address"
              value={storeLocation}
            />
          </div>
        </div>

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
          <h3 className="font-semibold">
            Line items{" "}
            <span className="font-normal text-muted-foreground">
              ({lineItems.length} detected)
            </span>
          </h3>
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
          disabled={Boolean(processingStage)}
          onClick={continueToRecallMatching}
          type="button"
        >
          Continue to recall matching
        </Button>
        <Button className="h-12" onClick={onBack} type="button" variant="ghost">
          Back to receipt upload
        </Button>
      </div>
    </section>
  );
}

function ExtractionDiagnostics({ extraction }: { extraction: ExtractedReceipt }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">
        Extraction diagnostics
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <DiagnosticBadge label={`Provider: ${providerLabel(extraction.provider)}`} />
        <DiagnosticBadge label={`Mode: ${modeLabel(extraction.mode)}`} />
        <DiagnosticBadge label={`Outcome: ${outcomeLabel(extraction.outcome)}`} />
      </div>
      {extraction.fallbackReason ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Fallback reason: {extraction.fallbackReason}
        </p>
      ) : null}
    </div>
  );
}

function DiagnosticBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground">
      {label}
    </span>
  );
}

function wait(duration: number) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
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

        <div className="grid grid-cols-[1fr_82px_82px] gap-3">
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

          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Price
            </span>
            <input
              className="min-h-11 rounded-lg border border-input bg-card px-3 text-base outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
              min="0"
              onChange={(event) =>
                onUpdate({
                  price: event.target.value
                    ? Number.parseFloat(event.target.value)
                    : null,
                })
              }
              placeholder="0.00"
              step="0.01"
              type="number"
              value={item.price ?? ""}
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

function providerLabel(provider: ExtractedReceipt["provider"]) {
  if (provider === "openrouter") {
    return "OpenRouter";
  }

  return "Mock";
}

function modeLabel(mode: ReceiptExtractionMode) {
  if (mode === "real") {
    return "Real";
  }

  return "Mock";
}

function outcomeLabel(outcome: ReceiptExtractionSuccessOutcome) {
  if (outcome === "success_real") {
    return "Real extraction";
  }

  return "Fallback extraction";
}
