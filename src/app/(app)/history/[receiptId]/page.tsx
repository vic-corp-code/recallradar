"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3 } from "lucide-react";

import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const statusOptions = [
  { value: "to_verify", label: "To verify" },
  { value: "verified_safe", label: "Verified safe" },
  { value: "affected", label: "Affected" },
  { value: "ignored", label: "Ignored" },
] as const;

type StatusValue = (typeof statusOptions)[number]["value"];

export default function ReceiptHistoryDetailPage() {
  const params = useParams<{ receiptId: string }>();
  const receiptId = Array.isArray(params.receiptId)
    ? params.receiptId[0]
    : params.receiptId;
  const detail = useQuery(
    api.receipts.getReceiptDetail,
    receiptId ? { receiptId: receiptId as Id<"receipts"> } : "skip",
  );
  const updateStatus = useMutation(api.receipts.updateRecallMatchStatus);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [updatingMatchId, setUpdatingMatchId] = React.useState<string | null>(null);

  async function onUpdateStatus(recallMatchId: string, status: StatusValue) {
    setSaveError(null);
    setUpdatingMatchId(recallMatchId);

    try {
      await updateStatus({
        recallMatchId: recallMatchId as Id<"recallMatches">,
        status,
      });
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Status update failed. Please try again.",
      );
    } finally {
      setUpdatingMatchId(null);
    }
  }

  if (!receiptId) {
    return (
      <section className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">Receipt id is missing.</p>
        <Button asChild variant="outline">
          <Link href="/history">Back to history</Link>
        </Button>
      </section>
    );
  }

  if (detail === undefined) {
    return (
      <section className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground shadow-sm">
        Loading receipt detail...
      </section>
    );
  }

  if (!detail) {
    return (
      <section className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Receipt was not found for this account.
        </p>
        <Button asChild variant="outline">
          <Link href="/history">Back to history</Link>
        </Button>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        href="/history"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to history
      </Link>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <p className="text-sm font-medium text-primary">Receipt detail</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">
          {detail.receipt.storeName ?? "Unknown store"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {detail.receipt.purchaseDate ?? "Unknown purchase date"} · Imported{" "}
          {formatDate(detail.receipt.createdAt)}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <SummaryStat
            icon={Clock3}
            label="To verify"
            value={detail.summary.statuses.toVerify}
          />
          <SummaryStat
            icon={CheckCircle2}
            label="Safe"
            value={detail.summary.statuses.verifiedSafe}
          />
          <SummaryStat
            icon={AlertTriangle}
            label="Affected"
            tone={detail.summary.statuses.affected > 0 ? "risk" : "default"}
            value={detail.summary.statuses.affected}
          />
        </div>
      </section>

      {saveError ? (
        <p className="rounded-lg bg-risk/10 px-3 py-2 text-sm font-medium text-risk">
          {saveError}
        </p>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase text-muted-foreground">
          Flagged items
        </h3>

        {detail.items.filter((item) => item.matches.length > 0).length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
            No flagged items on this receipt.
          </div>
        ) : (
          detail.items
            .filter((item) => item.matches.length > 0)
            .map((item) => (
              <article
                className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm"
                key={item._id}
              >
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.brand ?? "Unknown brand"}
                    {item.price !== null ? ` · ${formatPrice(item.price)}` : ""}
                  </p>
                </div>

                {item.matches.map((match) => (
                  <div
                    className="space-y-3 rounded-lg border border-border bg-background p-3"
                    key={match._id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {match.recall?.title ?? "Recall record unavailable"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {confidenceLabel(match.confidence)} · score {match.score}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-md px-2 py-1 text-xs font-medium",
                          statusTone(match.status),
                        )}
                      >
                        {statusLabel(match.status)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {match.reasons.map((reason) => (
                        <p className="text-xs text-muted-foreground" key={reason}>
                          • {reason}
                        </p>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {statusOptions.map((option) => (
                        <Button
                          className="h-10"
                          disabled={updatingMatchId === match._id}
                          key={option.value}
                          onClick={() => onUpdateStatus(match._id, option.value)}
                          size="sm"
                          type="button"
                          variant={
                            match.status === option.value ? "default" : "outline"
                          }
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>
                        Source:{" "}
                        {match.recall?.sourceUrl ? (
                          <a
                            className="underline underline-offset-2"
                            href={match.recall.sourceUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            RappelConso
                          </a>
                        ) : (
                          "RappelConso"
                        )}
                      </p>
                      {match.recall?.consumerRisk ? (
                        <p>Risk: {match.recall.consumerRisk}</p>
                      ) : null}
                      {match.recall?.recommendedActions.length ? (
                        <p>
                          Action: {match.recall.recommendedActions.join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </article>
            ))
        )}
      </section>
    </div>
  );
}

function SummaryStat({
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

function formatPrice(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function confidenceLabel(
  value: "none" | "possible" | "needs_verification" | "strong",
) {
  if (value === "strong") {
    return "Strong match";
  }

  if (value === "needs_verification") {
    return "Needs verification";
  }

  if (value === "possible") {
    return "Possible match";
  }

  return "No relevant match";
}

function statusLabel(value: StatusValue) {
  if (value === "to_verify") {
    return "To verify";
  }

  if (value === "verified_safe") {
    return "Verified safe";
  }

  if (value === "affected") {
    return "Affected";
  }

  return "Ignored";
}

function statusTone(value: StatusValue) {
  if (value === "affected") {
    return "bg-risk/10 text-risk";
  }

  if (value === "verified_safe") {
    return "bg-success/10 text-success";
  }

  if (value === "ignored") {
    return "bg-muted text-muted-foreground";
  }

  return "bg-accent text-accent-foreground";
}
