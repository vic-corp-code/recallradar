"use client";

import { ArrowLeft, ExternalLink, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MatchedReceiptItem } from "@/lib/recalls/matching";

type RecallDetailProps = {
  matchedItem: MatchedReceiptItem;
  onBack: () => void;
};

export function RecallDetail({ matchedItem, onBack }: RecallDetailProps) {
  const match = matchedItem.matches[0];
  const recall = match.recall;
  const lot = findLot(recall.identifiers);
  const dateLimit = findDate(recall.identifiers) ?? recall.procedureEndsAt;

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2">
        <Button
          aria-label="Retour aux résultats"
          className="rounded-full"
          onClick={onBack}
          size="icon"
          type="button"
          variant="outline"
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
        <span className="text-sm font-medium">Résultats</span>
      </div>

      <section>
        <span className="inline-flex items-center gap-1 rounded-full bg-risk/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-risk">
          <TriangleAlert aria-hidden="true" className="size-3" />
          Rappel en cours
        </span>
        <h2 className="mt-4 text-2xl font-semibold leading-tight tracking-tight">
          {matchedItem.item.name}
        </h2>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          RappelConso
          {recall.publishedAt
            ? ` · publié le ${formatDate(recall.publishedAt)}`
            : ""}
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <InfoRow label="Produit" value={recall.productName ?? matchedItem.item.name} />
        <InfoRow label="Marque" value={recall.brand ?? matchedItem.item.brand} />
        <InfoRow label="Lot concerné" value={lot} />
        <InfoRow label="DLC" value={dateLimit ? formatDate(dateLimit) : null} />
        <InfoRow label="Motif" value={recall.reason} />
        <InfoRow
          label="Distribué en"
          value={
            recall.geographicScope ??
            recall.distributors.slice(0, 2).join(", ") ??
            null
          }
        />
      </section>

      <section>
        <h3 className="text-lg font-semibold tracking-tight">Que faire ?</h3>
        <div className="mt-2 space-y-1">
          <ActionStep
            description={
              recall.consumerRisk
                ? `Le rappel mentionne: ${recall.consumerRisk}. En cas de symptôme, demandez un avis médical.`
                : "Si vous avez un doute ou des symptômes, demandez un avis médical."
            }
            index={1}
            title="Ne consommez pas ce produit"
          />
          <ActionStep
            description="Comparez la référence, le lot ou la date imprimée sur l'emballage avec les informations du rappel."
            index={2}
            title="Vérifiez le numéro de lot"
          />
          <ActionStep
            description={
              recall.recommendedActions[0] ??
              "Suivez les consignes indiquées sur la fiche officielle RappelConso."
            }
            index={3}
            title="Suivez les consignes officielles"
          />
        </div>
      </section>

      <div className="grid gap-3">
        {recall.sourceUrl ? (
          <Button asChild className="h-12">
            <a href={recall.sourceUrl} rel="noreferrer" target="_blank">
              Voir le rappel officiel
              <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        ) : null}
        <Button className="h-12" onClick={onBack} type="button" variant="outline">
          Retour aux résultats
        </Button>
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="max-w-[58%] text-right text-sm font-medium">
        {value || "À vérifier"}
      </span>
    </div>
  );
}

function ActionStep({
  description,
  index,
  title,
}: {
  description: string;
  index: number;
  title: string;
}) {
  return (
    <div className="flex gap-3 py-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full border border-border bg-card font-mono text-xs font-semibold">
        {index}
      </span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">
          {description}
        </span>
      </span>
    </div>
  );
}

function findLot(identifiers: string[]) {
  return identifiers.find(
    (identifier) =>
      /lot/i.test(identifier) ||
      (/^[a-z0-9-]{3,}$/i.test(identifier) && !/^\d{8,14}$/.test(identifier)),
  ) ?? null;
}

function findDate(identifiers: string[]) {
  return identifiers.find((identifier) => /^\d{4}-\d{2}-\d{2}$/.test(identifier));
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
