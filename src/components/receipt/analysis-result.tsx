"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

import { RecallDetail } from "@/components/receipt/recall-detail";
import { Button } from "@/components/ui/button";
import type {
  MatchedReceiptItem,
  RecallMatchingResult,
} from "@/lib/recalls/matching";
import { cn } from "@/lib/utils";

type AnalysisResultProps = {
  result: RecallMatchingResult;
  saveWarning?: string | null;
  onScanAnother: () => void;
};

const visibleSafeItemLimit = 5;

export function AnalysisResult({
  result,
  saveWarning,
  onScanAnother,
}: AnalysisResultProps) {
  const [selectedItem, setSelectedItem] =
    React.useState<MatchedReceiptItem | null>(null);
  const flaggedItems = result.items.filter((item) => item.confidence !== "none");
  const safeItems = result.items.filter((item) => item.confidence === "none");
  const hasWarnings = flaggedItems.length > 0;
  const totalPrice = result.items.reduce(
    (total, item) => total + (item.item.price ?? 0),
    0,
  );

  if (selectedItem) {
    return (
      <RecallDetail
        matchedItem={selectedItem}
        onBack={() => setSelectedItem(null)}
      />
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-border bg-card p-5 text-center shadow-sm">
        <div
          className={cn(
            "mx-auto grid size-20 place-items-center rounded-full border-2",
            hasWarnings
              ? "border-risk bg-risk/10 text-risk"
              : "border-success bg-success/10 text-success",
          )}
        >
          {hasWarnings ? (
            <AlertTriangle aria-hidden="true" className="size-9" />
          ) : (
            <Check aria-hidden="true" className="size-9" />
          )}
        </div>

        <h2
          className={cn(
            "mt-5 text-2xl font-semibold tracking-tight",
            hasWarnings && "text-risk",
          )}
        >
          {hasWarnings ? "Produit à vérifier" : "Tout est clair"}
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
          {hasWarnings
            ? "Un produit peut correspondre à un rappel en cours. Vérifiez avant de consommer."
            : "Aucun rappel actif ne concerne les produits de ce ticket."}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <SummaryStat
          label="Vérifiés"
          tone="success"
          value={safeItems.length.toString()}
        />
        <SummaryStat
          label={hasWarnings ? "À vérifier" : "Alertes"}
          tone={hasWarnings ? "risk" : "default"}
          value={flaggedItems.length.toString()}
        />
        <SummaryStat label="Total" value={formatPrice(totalPrice)} />
      </div>

      {saveWarning ? (
        <p className="rounded-lg bg-risk/10 px-3 py-2 text-sm font-medium text-risk">
          {saveWarning}
        </p>
      ) : null}

      {hasWarnings ? (
        <FlaggedItems items={flaggedItems} onSelect={setSelectedItem} />
      ) : null}

      <SafeProducts items={hasWarnings ? safeItems : result.items} />

      <div className="grid gap-3 pt-1">
        <Button className="h-12" onClick={onScanAnother} type="button">
          <RotateCcw aria-hidden="true" />
          Scanner un autre ticket
        </Button>

        {!hasWarnings ? (
          <Button asChild className="h-12" variant="outline">
            <Link href="/">Retour à l&apos;accueil</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function SummaryStat({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "default" | "risk" | "success";
  value: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card px-2 py-3 text-center shadow-sm",
        tone === "risk" && "border-risk/30 bg-risk/10",
      )}
    >
      <div
        className={cn(
          "font-mono text-xl font-semibold tabular-nums",
          tone === "success" && "text-success",
          tone === "risk" && "text-risk",
        )}
      >
        {value}
      </div>
      <div
        className={cn(
          "mt-1 font-mono text-[11px] text-muted-foreground",
          tone === "risk" && "text-risk",
        )}
      >
        {label}
      </div>
    </div>
  );
}

function FlaggedItems({
  items,
  onSelect,
}: {
  items: MatchedReceiptItem[];
  onSelect: (item: MatchedReceiptItem) => void;
}) {
  return (
    <section>
      <p className="mb-3 font-mono text-xs uppercase text-risk">À vérifier</p>
      <div className="space-y-3">
        {items.map((item) => {
          const topMatch = item.matches[0];

          return (
            <button
              className="flex w-full items-center gap-3 rounded-lg border border-risk/20 bg-risk/10 p-3 text-left"
              key={item.item.id}
              onClick={() => onSelect(item)}
              type="button"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-risk/20 bg-card text-risk">
                <AlertTriangle aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {item.item.name}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {confidenceLabel(item.confidence)}
                  {topMatch?.recall.brand ? ` · ${topMatch.recall.brand}` : ""}
                </span>
                <span className="mt-1 block text-xs font-medium text-risk">
                  Voir les détails du rappel
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-5 shrink-0 text-muted-foreground"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SafeProducts({ items }: { items: MatchedReceiptItem[] }) {
  const visibleItems = items.slice(0, visibleSafeItemLimit);
  const extraCount = Math.max(0, items.length - visibleSafeItemLimit);

  return (
    <section>
      <p className="mb-3 font-mono text-xs uppercase text-muted-foreground">
        Produits vérifiés
      </p>
      <div className="rounded-lg border border-border bg-card px-4 py-1 shadow-sm">
        {visibleItems.map((item) => (
          <div
            className="flex min-h-11 items-center gap-3 border-t border-border first:border-t-0"
            key={item.item.id}
          >
            <span className="size-2 shrink-0 rounded-full bg-success" />
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
              {item.item.name}
            </span>
            {item.item.price !== null ? (
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {formatPrice(item.item.price)}
              </span>
            ) : null}
          </div>
        ))}
      </div>

      {extraCount ? (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          + {extraCount} autres produits vérifiés
        </p>
      ) : null}
    </section>
  );
}

function confidenceLabel(confidence: MatchedReceiptItem["confidence"]) {
  if (confidence === "strong") {
    return "Correspondance forte";
  }

  if (confidence === "needs_verification") {
    return "Vérification nécessaire";
  }

  return "Correspondance possible";
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
