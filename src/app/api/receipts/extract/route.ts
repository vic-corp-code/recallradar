import { NextResponse } from "next/server";

import {
  extractReceipt,
  validateReceiptFile,
} from "@/lib/receipts/extract";
import type { ReceiptExtractionError } from "@/lib/receipts/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return extractionError("Upload a receipt file using multipart form data.", 400);
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return extractionError("Receipt file is required.", 400);
  }

  const validationError = validateReceiptFile(file);

  if (validationError) {
    return extractionError(validationError, 400);
  }

  try {
    const extraction = await extractReceipt(file);

    return NextResponse.json(extraction);
  } catch (error) {
    const details = error instanceof Error ? error.message : undefined;

    return extractionError(
      "Receipt extraction failed. Please try uploading again.",
      500,
      details,
    );
  }
}

function extractionError(
  error: string,
  status: number,
  details?: string,
) {
  const body: ReceiptExtractionError = {
    error,
    ...(details ? { details } : {}),
  };

  return NextResponse.json(body, { status });
}
