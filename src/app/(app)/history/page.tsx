"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { AlertTriangle, CheckCircle2, Clock3, ReceiptText } from "lucide-react";

import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";

const statuses = ["All", "To verify", "Affected", "Verified safe", "Ignored"];

export default function HistoryPage() {
  const history = useQuery(api.receipts.listHistory, { limit: 20 });

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-primary">History</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Past receipt checks
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Imported receipts, flagged items, and saved verification statuses.
        </p>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {statuses.map((status, index) => (
          <button
            className={cn(
              "min-h-11 shrink-0 rounded-lg border border-border bg-card px-3 text-sm font-medium text-muted-foreground",
              index === 0 && "bg-accent text-accent-foreground",
            )}
            key={status}
            type="button"
          >
            {status}
          </button>
        ))}
      </div>

      {history === undefined ? (
        <div className="rounded-lg border border-border bg-card p-5 text-sm leading-6 text-muted-foreground shadow-sm">
          Loading receipt history...
        </div>
      ) : history.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
          No receipt history yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {history.map((receipt) => (
            <Link
              className="block rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent/30"
              href={`/history/${receipt._id}`}
              key={receipt._id}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 rounded-lg p-2",
                    receipt.flaggedCount > 0
                      ? "bg-risk/10 text-risk"
                      : "bg-success/10 text-success",
                  )}
                >
                  {receipt.flaggedCount > 0 ? (
                    <AlertTriangle aria-hidden="true" className="size-5" />
                  ) : (
                    <CheckCircle2 aria-hidden="true" className="size-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">
                        {receipt.storeName ?? "Unknown store"}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {receipt.purchaseDate ?? "Unknown purchase date"}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {formatDate(receipt.createdAt)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <HistoryStat
                      icon={ReceiptText}
                      label="Items"
                      value={receipt.itemCount}
                    />
                    <HistoryStat
                      icon={AlertTriangle}
                      label="Flagged"
                      tone={receipt.flaggedCount > 0 ? "risk" : "default"}
                      value={receipt.flaggedCount}
                    />
                    <HistoryStat
                      icon={Clock3}
                      label="To verify"
                      tone={receipt.statuses.toVerify > 0 ? "risk" : "default"}
                      value={receipt.statuses.toVerify}
                    />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryStat({
  icon: Icon,
  label,
  tone = "default",
  value,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  tone?: "default" | "risk";
  value: number;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-background px-2 py-3",
        tone === "risk" && "border-risk/20 bg-risk/10",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 font-mono text-lg font-semibold tabular-nums",
          tone === "risk" && "text-risk",
        )}
      >
        <Icon aria-hidden={true} className="size-4" />
        {value}
      </div>
      <div className="mt-1 text-[11px] font-medium text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(value);
}
