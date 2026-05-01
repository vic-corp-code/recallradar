import type { RecallRecord } from "@/lib/recalls/types";
import type { ReceiptLineItem } from "@/lib/receipts/types";

export type RecallMatchConfidence =
  | "none"
  | "possible"
  | "needs_verification"
  | "strong";

export type MatchableReceipt = {
  receiptId: string;
  store: {
    name: string | null;
    location: string | null;
  };
  purchaseDate: string | null;
  lineItems: ReceiptLineItem[];
};

export type RecallMatch = {
  confidence: Exclude<RecallMatchConfidence, "none">;
  score: number;
  reasons: string[];
  recall: RecallRecord;
};

export type MatchedReceiptItem = {
  item: ReceiptLineItem;
  confidence: RecallMatchConfidence;
  score: number;
  matches: RecallMatch[];
};

export type RecallMatchingResult = {
  receiptId: string;
  matchedAt: string;
  recallCount: number;
  items: MatchedReceiptItem[];
  summary: {
    totalItems: number;
    noRelevantMatch: number;
    possible: number;
    needsVerification: number;
    strong: number;
    flagged: number;
  };
};

type ScoredRecall = {
  recall: RecallRecord;
  confidence: RecallMatch["confidence"];
  score: number;
  reasons: string[];
};

const MAX_MATCHES_PER_ITEM = 3;
const COMMON_FRENCH_PRODUCT_WORDS = new Set([
  "au",
  "aux",
  "bio",
  "de",
  "des",
  "du",
  "en",
  "et",
  "la",
  "le",
  "les",
  "nature",
  "produit",
  "sans",
  "avec",
]);

export function matchReceiptAgainstRecalls({
  receipt,
  recalls,
  now = new Date(),
}: {
  receipt: MatchableReceipt;
  recalls: RecallRecord[];
  now?: Date;
}): RecallMatchingResult {
  const activeRecalls = recalls.filter((recall) => isActiveRecall(recall, now));
  const items = receipt.lineItems.map((item) =>
    matchItemAgainstRecalls(item, activeRecalls, receipt),
  );

  const summary = items.reduce(
    (accumulator, item) => {
      accumulator.totalItems += 1;

      if (item.confidence === "none") {
        accumulator.noRelevantMatch += 1;
        return accumulator;
      }

      accumulator.flagged += 1;
      accumulator[toSummaryKey(item.confidence)] += 1;

      return accumulator;
    },
    {
      totalItems: 0,
      noRelevantMatch: 0,
      possible: 0,
      needsVerification: 0,
      strong: 0,
      flagged: 0,
    },
  );

  return {
    receiptId: receipt.receiptId,
    matchedAt: now.toISOString(),
    recallCount: activeRecalls.length,
    items,
    summary,
  };
}

function matchItemAgainstRecalls(
  item: ReceiptLineItem,
  recalls: RecallRecord[],
  receipt: MatchableReceipt,
): MatchedReceiptItem {
  const scoredMatches = recalls
    .map((recall) => scoreRecallMatch(item, recall, receipt))
    .filter((match): match is ScoredRecall => Boolean(match))
    .sort((left, right) => right.score - left.score)
    .slice(0, MAX_MATCHES_PER_ITEM);

  if (scoredMatches.length === 0) {
    return {
      item,
      confidence: "none",
      score: 0,
      matches: [],
    };
  }

  const topMatch = scoredMatches[0];

  return {
    item,
    confidence: topMatch.confidence,
    score: topMatch.score,
    matches: scoredMatches.map(({ confidence, recall, reasons, score }) => ({
      confidence,
      recall,
      reasons,
      score,
    })),
  };
}

function scoreRecallMatch(
  item: ReceiptLineItem,
  recall: RecallRecord,
  receipt: MatchableReceipt,
): ScoredRecall | null {
  const itemName = normalizeText(item.name);
  const itemBrand = normalizeText(item.brand);
  const recallBrand = normalizeText(recall.brand);
  const recallText = normalizeText(
    [
      recall.title,
      recall.productName,
      recall.modelOrReference,
      recall.productCategory,
      recall.productSubcategory,
    ]
      .filter(Boolean)
      .join(" "),
  );

  if (!itemName || !recallText) {
    return null;
  }

  const itemTokens = meaningfulTokens(itemName);
  const recallTokens = meaningfulTokens(recallText);
  const tokenOverlap = overlapRatio(itemTokens, recallTokens);
  const phraseSimilarity = similarity(itemName, recallText);
  const containedPhrase =
    recallText.includes(itemName) || itemName.includes(recallText);

  let score = Math.max(tokenOverlap, phraseSimilarity * 0.85);
  const reasons: string[] = [];

  if (containedPhrase) {
    score = Math.max(score, 0.72);
    reasons.push("Product wording is directly contained in the recall text.");
  }

  if (tokenOverlap >= 0.5) {
    reasons.push("Receipt product words overlap with the recall product.");
  }

  if (phraseSimilarity >= 0.62) {
    reasons.push("Product names are textually similar.");
  }

  const brandMatches =
    itemBrand && recallBrand
      ? itemBrand === recallBrand ||
        itemBrand.includes(recallBrand) ||
        recallBrand.includes(itemBrand)
      : false;

  if (brandMatches) {
    score += 0.22;
    reasons.push("Brand matches the recall brand.");
  } else if (itemBrand && recallBrand) {
    score -= 0.12;
  }

  const storeMatch = matchesDistributor(receipt.store.name, recall.distributors);

  if (storeMatch) {
    score += 0.08;
    reasons.push("Store appears in the recall distribution list.");
  }

  if (isPurchaseDateRelevant(receipt.purchaseDate, recall)) {
    score += 0.04;
    reasons.push("Purchase date is compatible with an active recall.");
  }

  const boundedScore = clamp(score, 0, 1);
  const confidence = confidenceFromScore({
    score: boundedScore,
    brandMatches,
    hasItemBrand: Boolean(itemBrand),
    tokenOverlap,
  });

  if (confidence === "none") {
    return null;
  }

  return {
    recall,
    confidence,
    score: roundScore(boundedScore),
    reasons,
  };
}

function confidenceFromScore({
  score,
  brandMatches,
  hasItemBrand,
  tokenOverlap,
}: {
  score: number;
  brandMatches: boolean;
  hasItemBrand: boolean;
  tokenOverlap: number;
}): RecallMatchConfidence {
  if (brandMatches && score >= 0.88 && tokenOverlap >= 0.55) {
    return "strong";
  }

  if (score >= 0.74 && (!hasItemBrand || brandMatches)) {
    return "needs_verification";
  }

  if (score >= 0.56) {
    return "possible";
  }

  return "none";
}

function isActiveRecall(recall: RecallRecord, now: Date) {
  if (!recall.procedureEndsAt) {
    return true;
  }

  const procedureEnd = Date.parse(recall.procedureEndsAt);

  if (Number.isNaN(procedureEnd)) {
    return true;
  }

  return procedureEnd >= startOfDay(now).getTime();
}

function isPurchaseDateRelevant(
  purchaseDate: string | null,
  recall: RecallRecord,
) {
  if (!purchaseDate) {
    return false;
  }

  const purchasedAt = Date.parse(purchaseDate);

  if (Number.isNaN(purchasedAt)) {
    return false;
  }

  if (!recall.procedureEndsAt) {
    return true;
  }

  const procedureEnd = Date.parse(recall.procedureEndsAt);

  return Number.isNaN(procedureEnd) || purchasedAt <= procedureEnd;
}

function matchesDistributor(
  storeName: string | null,
  distributors: string[],
) {
  const normalizedStore = normalizeText(storeName);

  if (!normalizedStore) {
    return false;
  }

  return distributors.some((distributor) => {
    const normalizedDistributor = normalizeText(distributor);

    return (
      normalizedDistributor.includes(normalizedStore) ||
      normalizedStore.includes(normalizedDistributor)
    );
  });
}

function meaningfulTokens(text: string) {
  return [
    ...new Set(
      text
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(
          (token) =>
            token.length > 2 && !COMMON_FRENCH_PRODUCT_WORDS.has(token),
        ),
    ),
  ];
}

function overlapRatio(left: string[], right: string[]) {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const rightTokens = new Set(right);
  const matches = left.filter((token) => rightTokens.has(token)).length;

  return matches / Math.max(left.length, 1);
}

function similarity(left: string, right: string) {
  const maxLength = Math.max(left.length, right.length);

  if (maxLength === 0) {
    return 1;
  }

  return 1 - levenshteinDistance(left, right) / maxLength;
}

function levenshteinDistance(left: string, right: string) {
  const distances = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previous = leftIndex;
    distances[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const current = distances[rightIndex];
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;

      distances[rightIndex] = Math.min(
        distances[rightIndex] + 1,
        previous + 1,
        distances[rightIndex - 1] + cost,
      );
      previous = current;
    }
  }

  return distances[right.length];
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toSummaryKey(confidence: Exclude<RecallMatchConfidence, "none">) {
  if (confidence === "needs_verification") {
    return "needsVerification";
  }

  return confidence;
}

function roundScore(score: number) {
  return Math.round(score * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
