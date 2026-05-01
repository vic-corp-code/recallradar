"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { AnalysisResult } from "@/components/receipt/analysis-result";
import type { SavedReceiptCheck } from "@/lib/receipts/history";
import {
  getReceiptHistoryServerSnapshot,
  readReceiptChecks,
  subscribeToReceiptHistory,
} from "@/lib/receipts/history";
import { cn } from "@/lib/utils";

const filters = [
  { value: "all", label: "Tous" },
  { value: "alerts", label: "Alertes" },
  { value: "month", label: "Ce mois" },
] as const;

type HistoryFilter = (typeof filters)[number]["value"];

export default function HistoryPage() {
  const checks = React.useSyncExternalStore(
    subscribeToReceiptHistory,
    readReceiptChecks,
    getReceiptHistoryServerSnapshot,
  );
  const [activeFilter, setActiveFilter] = React.useState<HistoryFilter>("all");
  const [selectedCheck, setSelectedCheck] =
    React.useState<SavedReceiptCheck | null>(null);
  const visibleChecks = filterChecks(checks, activeFilter);

  if (selectedCheck) {
    return (
      <AnalysisResult
        onScanAnother={() => setSelectedCheck(null)}
        result={selectedCheck.result}
      />
    );
  }

  return (
    <div className="space-y-5">
      <section>
        <h2 className="text-2xl font-semibold tracking-tight">Historique</h2>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.value;

          return (
            <button
              className={cn(
                "min-h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                isActive
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {visibleChecks.length > 0 ? (
        <section className="space-y-3">
          {visibleChecks.map((check) => (
            <HistoryItem
              check={check}
              key={check.id}
              onSelect={() => setSelectedCheck(check)}
            />
          ))}
        </section>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
          Aucun ticket dans cet historique pour le moment.
        </div>
      )}
    </div>
  );
}

function HistoryItem({
  check,
  onSelect,
}: {
  check: SavedReceiptCheck;
  onSelect: () => void;
}) {
  const flaggedCount = check.result.summary.flagged;
  const isFlagged = flaggedCount > 0;

  return (
    <button
      className="grid w-full grid-cols-[1fr_auto] items-start gap-3 rounded-lg border border-border bg-card p-4 text-left shadow-sm"
      onClick={onSelect}
      type="button"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">
          {check.storeName || "Magasin non identifié"}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>
            {check.result.summary.totalItems} produit
            {check.result.summary.totalItems > 1 ? "s" : ""}
          </span>
          <span>·</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium",
              isFlagged ? "text-risk" : "text-success",
            )}
          >
            {isFlagged ? (
              <AlertTriangle aria-hidden="true" className="size-3" />
            ) : (
              <CheckCircle2 aria-hidden="true" className="size-3" />
            )}
            {isFlagged
              ? `${flaggedCount} à vérifier`
              : "Aucun rappel"}
          </span>
        </span>
      </span>
      <span className="pt-0.5 font-mono text-xs text-muted-foreground">
        {relativeDate(check.createdAt)}
      </span>
    </button>
  );
}

function filterChecks(checks: SavedReceiptCheck[], filter: HistoryFilter) {
  if (filter === "alerts") {
    return checks.filter((check) => check.result.summary.flagged > 0);
  }

  if (filter === "month") {
    const now = new Date();

    return checks.filter((check) => {
      const createdAt = new Date(check.createdAt);

      return (
        createdAt.getMonth() === now.getMonth() &&
        createdAt.getFullYear() === now.getFullYear()
      );
    });
  }

  return checks;
}

function relativeDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const now = new Date();
  const startToday = startOfDay(now).getTime();
  const startDate = startOfDay(date).getTime();
  const daysAgo = Math.round((startToday - startDate) / 86_400_000);

  if (daysAgo === 0) {
    return "Aujourd'hui";
  }

  if (daysAgo === 1) {
    return "Hier";
  }

  if (daysAgo < 7) {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
    }).format(date);
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
