import { NoObjectGeneratedError } from "ai";
import { NextResponse } from "next/server";

import {
  extractReceipt,
  validateReceiptFile,
} from "@/lib/receipts/extract";
import type { ReceiptExtractionError, ReceiptExtractionFailureOutcome } from "@/lib/receipts/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return extractionError(
      "Upload a receipt file using multipart form data.",
      400,
      "failure_input_invalid",
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return extractionError("Receipt file is required.", 400, "failure_input_invalid");
  }

  const validationError = validateReceiptFile(file);

  if (validationError) {
    return extractionError(validationError, 400, "failure_input_invalid");
  }

  try {
    return NextResponse.json(await extractReceipt(file));
  } catch (error) {
    const outcome = classifyError(error);
    const status =
      outcome === "failure_input_invalid" ? 400 :
      outcome === "failure_parsing" ? 422 : 502;

    console.error("Receipt extraction failed", {
      outcome,
      details: error instanceof Error ? error.message : undefined,
    });

    return extractionError(
      "Receipt extraction failed. Please try uploading again.",
      status,
      outcome,
      error instanceof Error ? error.message : undefined,
    );
  }
}

function classifyError(error: unknown): ReceiptExtractionFailureOutcome {
  if (error instanceof NoObjectGeneratedError) return "failure_parsing";

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("supports image") || message.includes("input_invalid")) {
    return "failure_input_invalid";
  }

  return "failure_provider";
}

function extractionError(
  error: string,
  status: number,
  outcome: ReceiptExtractionFailureOutcome,
  details?: string,
) {
  return NextResponse.json(
    {
      error,
      outcome,
      ...(details ? { details } : {}),
    } satisfies ReceiptExtractionError,
    { status },
  );
}
