import { NextResponse } from "next/server";

import {
  matchReceiptAgainstRecalls,
  type MatchableReceipt,
} from "@/lib/recalls/matching";
import { syncRappelConsoRecalls } from "@/lib/recalls/rappelconso";

export const runtime = "nodejs";

const DEFAULT_RECALL_LIMIT = 100;

export async function POST(request: Request) {
  let receipt: MatchableReceipt;

  try {
    const body = (await request.json()) as { receipt?: MatchableReceipt };
    receipt = body.receipt as MatchableReceipt;
  } catch {
    return matchError("Send a JSON body with a receipt to match.", 400);
  }

  const validationError = validateReceipt(receipt);

  if (validationError) {
    return matchError(validationError, 400);
  }

  try {
    const recallSync = await syncRappelConsoRecalls({
      limit: DEFAULT_RECALL_LIMIT,
    });
    const result = matchReceiptAgainstRecalls({
      receipt,
      recalls: recallSync.recalls,
    });

    return NextResponse.json({
      ...result,
      source: {
        name: "RappelConso",
        url: recallSync.sourceUrl,
        lastSyncedAt: recallSync.lastSyncedAt,
        totalAvailable: recallSync.totalAvailable,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Recall matching failed unexpectedly.";

    return matchError(message, 502);
  }
}

function validateReceipt(receipt: MatchableReceipt | null | undefined) {
  if (!receipt) {
    return "Receipt data is required.";
  }

  if (!receipt.receiptId) {
    return "Receipt id is required.";
  }

  if (!Array.isArray(receipt.lineItems) || receipt.lineItems.length < 1) {
    return "At least one receipt item is required for matching.";
  }

  if (receipt.lineItems.some((item) => !item.name?.trim())) {
    return "Every receipt item needs a product name before matching.";
  }

  return null;
}

function matchError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}
