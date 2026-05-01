import type {
  ExtractedReceipt,
  ExtractionConfidence,
  ReceiptLineItem,
} from "@/lib/receipts/types";

const MAX_RECEIPT_FILE_SIZE_MB = 20;
export const MAX_RECEIPT_FILE_SIZE_BYTES = MAX_RECEIPT_FILE_SIZE_MB * 1024 * 1024;
export const SUPPORTED_RECEIPT_TYPES = new Set([
  "application/pdf",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function validateReceiptFile(file: File) {
  if (!file) {
    return "Receipt file is required.";
  }

  if (!isSupportedReceiptFile(file)) {
    return "Use a receipt photo, screenshot, or PDF.";
  }

  if (file.size > MAX_RECEIPT_FILE_SIZE_BYTES) {
    return `Keep the receipt file under ${MAX_RECEIPT_FILE_SIZE_MB} MB.`;
  }

  return null;
}

export async function extractReceipt(file: File): Promise<ExtractedReceipt> {
  const buffer = await file.arrayBuffer();

  return createMockExtraction(file, buffer.byteLength);
}

function createMockExtraction(file: File, byteLength: number): ExtractedReceipt {
  const receiptId = crypto.randomUUID();
  const confidence = confidenceFromFile(file, byteLength);
  const fileName = file.name.toLowerCase();
  const storeName = inferStoreName(fileName);
  const lineItems = inferLineItems(fileName, confidence);

  return {
    receiptId,
    sourceFile: {
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
    },
    store: {
      name: storeName,
      location: null,
      confidence: storeName ? "medium" : "low",
    },
    purchaseDate: {
      value: toFranceDate(new Date()),
      confidence: "low",
    },
    lineItems,
    extractionConfidence: confidence,
    needsReview: confidence !== "high",
    extractedAt: new Date().toISOString(),
    provider: "mock",
  };
}

function isSupportedReceiptFile(file: File) {
  if (SUPPORTED_RECEIPT_TYPES.has(file.type)) {
    return true;
  }

  return /\.(heic|heif|jpe?g|pdf|png|webp)$/i.test(file.name);
}

function confidenceFromFile(file: File, byteLength: number): ExtractionConfidence {
  if (byteLength > 512_000 && file.type.startsWith("image/")) {
    return "medium";
  }

  if (byteLength > 64_000) {
    return "medium";
  }

  return "low";
}

function inferStoreName(fileName: string) {
  if (fileName.includes("carrefour")) {
    return "Carrefour";
  }

  if (fileName.includes("monoprix")) {
    return "Monoprix";
  }

  if (fileName.includes("leclerc") || fileName.includes("e-leclerc")) {
    return "E.Leclerc";
  }

  if (fileName.includes("intermarche") || fileName.includes("intermarch")) {
    return "Intermarche";
  }

  return null;
}

function inferLineItems(
  fileName: string,
  confidence: ExtractionConfidence,
): ReceiptLineItem[] {
  const items = [
    createLineItem("Creme de pistache", "Gourmet Celebi", 1, 4.99, confidence),
    createLineItem("Jambon blanc", null, 1, 2.35, "low"),
    createLineItem("Yaourt nature", null, 2, 1.8, "low"),
  ];

  if (fileName.includes("safe") || fileName.includes("clear")) {
    return [
      createLineItem("Pates coquillettes", null, 1, 1.49, "medium"),
      createLineItem("Lait demi-ecreme", null, 1, 1.15, "medium"),
    ];
  }

  return items;
}

function createLineItem(
  name: string,
  brand: string | null,
  quantity: number | null,
  price: number | null,
  confidence: ExtractionConfidence,
): ReceiptLineItem {
  return {
    id: crypto.randomUUID(),
    name,
    brand,
    quantity,
    price,
    confidence,
  };
}

function toFranceDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
