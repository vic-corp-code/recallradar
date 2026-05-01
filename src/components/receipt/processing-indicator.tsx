"use client";

import * as React from "react";
import { Check, FileText, Search } from "lucide-react";

import type { ReceiptLineItem } from "@/lib/receipts/types";
import { cn } from "@/lib/utils";

type ProcessingStage = "matching" | "preparing";

type ProcessingIndicatorProps = {
  items: ReceiptLineItem[];
  stage: ProcessingStage;
};

const visibleItemLimit = 8;

export function ProcessingIndicator({
  items,
  stage,
}: ProcessingIndicatorProps) {
  const visibleItems = items.slice(0, visibleItemLimit);
  const extraCount = Math.max(0, items.length - visibleItemLimit);

  return (
    <section className="min-h-[calc(100svh-9rem)] rounded-lg border border-border bg-card px-5 py-8 shadow-sm">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Analyse en cours
        </h2>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          Lecture du ticket et verification des rappels
        </p>
      </div>

      <div
        aria-label="Analyse en cours"
        className="mx-auto mt-12 size-12 animate-spin rounded-full border-[3px] border-border border-t-primary"
        role="status"
      />

      <div className="mt-10 space-y-1">
        <ProcessingStep
          detail={`${items.length} produit${items.length > 1 ? "s" : ""} identifie${
            items.length > 1 ? "s" : ""
          }`}
          label="Ticket lu"
          state="done"
        />
        <ProcessingStep
          detail="Comparaison avec la base RappelConso"
          label="Verification des rappels"
          state={stage === "matching" ? "active" : "done"}
        />
        <ProcessingStep
          detail="Preparation du rapport"
          label="Resultats"
          state={stage === "preparing" ? "active" : "pending"}
        />
      </div>

      <section className="mt-8">
        <p className="mb-3 font-mono text-xs uppercase text-muted-foreground">
          Produits identifies
        </p>
        <div className="space-y-2">
          {visibleItems.map((item, index) => (
            <div
              className="animate-receipt-product-fade flex min-h-12 items-center gap-3 rounded-lg border border-border bg-background px-4 opacity-0"
              key={item.id}
              style={{ animationDelay: `${0.18 + index * 0.12}s` }}
            >
              <span className="size-2 shrink-0 rounded-full bg-success" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {item.name}
              </span>
              <span className="shrink-0 font-mono text-[11px] font-medium uppercase text-success">
                Verifie
              </span>
            </div>
          ))}
        </div>

        {extraCount ? (
          <p className="mt-3 text-center font-mono text-xs text-muted-foreground">
            + {extraCount} autres produits
          </p>
        ) : null}
      </section>
    </section>
  );
}

function ProcessingStep({
  detail,
  label,
  state,
}: {
  detail: string;
  label: string;
  state: "done" | "active" | "pending";
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full",
          state === "done" && "bg-success text-success-foreground",
          state === "active" && "bg-accent text-primary",
          state === "pending" && "bg-muted text-muted-foreground",
        )}
      >
        {state === "done" ? (
          <Check aria-hidden="true" className="size-5" />
        ) : state === "active" ? (
          <Search aria-hidden="true" className="size-5" />
        ) : (
          <FileText aria-hidden="true" className="size-5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium",
            state === "pending" && "text-muted-foreground",
          )}
        >
          {label}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
