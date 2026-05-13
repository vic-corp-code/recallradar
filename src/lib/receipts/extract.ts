import { generateText, Output } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

import type {
  ExtractedReceipt,
  ExtractionConfidence,
  ReceiptLineItem,
} from "@/lib/receipts/types";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MAX_FILE_SIZE_MB = 20;
export const MAX_RECEIPT_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const SUPPORTED_RECEIPT_TYPES = new Set([
  "application/pdf",
  "image/heic",
  "image/heif",
  "image/jpg",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const RECEIPT_PROMPT = [
  "Extract this receipt and return strict JSON only.",
  "Schema:",
  "{",
  '  "storeName": string | null,',
  '  "storeLocation": string | null,',
  '  "purchaseDate": "YYYY-MM-DD" | null,',
  '  "lineItems": [',
  "    {",
  '      "name": string,',
  '      "brand": string | null,',
  '      "quantity": number | null,',
  '      "price": number | null',
  "    }",
  "  ]",
  "}",
  "Rules:",
  "- Use null when unknown.",
  "- Keep only real purchasable line items.",
  "- Keep prices as decimal numbers in EUR when visible.",
  "- Return JSON only, no markdown.",
].join("\n");

const receiptSchema = z.object({
  storeName: z.string().nullable(),
  storeLocation: z.string().nullable(),
  purchaseDate: z.string().nullable(),
  lineItems: z.array(
    z.object({
      name: z.string(),
      brand: z.string().nullable(),
      quantity: z.number().nullable(),
      price: z.number().nullable(),
    }),
  ),
});

export function validateReceiptFile(file: File) {
  if (!file) {
    return "Receipt file is required.";
  }

  if (!isSupportedReceiptFile(file)) {
    return "Use a receipt photo, screenshot, or PDF.";
  }

  if (file.size > MAX_RECEIPT_FILE_SIZE_BYTES) {
    return `Keep the receipt file under ${MAX_FILE_SIZE_MB} MB.`;
  }

  return null;
}

export async function extractReceipt(file: File): Promise<ExtractedReceipt> {
  if (process.env.RECEIPT_EXTRACTION_MODE === "mock") {
    return createMockExtraction(file);
  }

  if (!isImageFile(file)) {
    throw new Error(
      "Receipt extraction currently supports image receipts only.",
    );
  }

  const buffer = await file.arrayBuffer();

  const { output } = await generateText({
    model: openrouter("openrouter/auto"),
    temperature: 0,
    output: Output.object({ schema: receiptSchema }),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: RECEIPT_PROMPT },
          { type: "image", image: buffer, mediaType: file.type },
        ],
      },
    ],
  });

  const lineItems = output.lineItems
    .filter((item) => item.name.trim().length > 0)
    .map((item) =>
      createLineItem(item.name, item.brand, item.quantity, item.price, "medium"),
    );

  if (!lineItems.length) {
    throw new Error("Receipt extraction returned no usable line items.");
  }

  return buildReceipt(file, {
    storeName: trimToNull(output.storeName),
    storeLocation: trimToNull(output.storeLocation),
    purchaseDate: normalizeDate(output.purchaseDate),
    lineItems,
  });
}

function buildReceipt(
  file: File,
  data: {
    storeName: string | null;
    storeLocation: string | null;
    purchaseDate: string | null;
    lineItems: ReceiptLineItem[];
  },
): ExtractedReceipt {
  const highSignal = [
    Boolean(data.storeName),
    Boolean(data.purchaseDate),
    data.lineItems.length >= 3,
  ].filter(Boolean).length;
  const confidence: ExtractionConfidence = highSignal >= 3 ? "high" : "medium";

  return {
    receiptId: crypto.randomUUID(),
    sourceFile: {
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
    },
    store: {
      name: data.storeName,
      location: data.storeLocation,
      confidence: data.storeName ? confidence : "low",
    },
    purchaseDate: {
      value: data.purchaseDate,
      confidence: data.purchaseDate ? confidence : "low",
    },
    lineItems: data.lineItems,
    extractionConfidence: confidence,
    needsReview: true,
    extractedAt: new Date().toISOString(),
    provider: "openrouter",
    mode: "real",
    outcome: "success_real",
    fallbackReason: null,
  };
}

function createMockExtraction(file: File): ExtractedReceipt {
  const fileName = file.name.toLowerCase();
  const confidence: ExtractionConfidence =
    file.size > 512_000 && file.type.startsWith("image/") ? "medium" : "low";
  const storeName = inferStoreName(fileName);

  return {
    receiptId: crypto.randomUUID(),
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
    purchaseDate: { value: toFranceDate(new Date()), confidence: "low" },
    lineItems: inferLineItems(fileName, confidence),
    extractionConfidence: confidence,
    needsReview: true,
    extractedAt: new Date().toISOString(),
    provider: "mock",
    mode: "mock",
    outcome: "success_fallback",
    fallbackReason: "Mock mode is enabled.",
  };
}

function isSupportedReceiptFile(file: File) {
  if (file.type.startsWith("image/")) return true;
  if (SUPPORTED_RECEIPT_TYPES.has(file.type)) return true;
  return /\.(heic|heif|jpe?g|pdf|png|webp)$/i.test(file.name);
}

function isImageFile(file: File) {
  if (file.type.startsWith("image/")) return true;
  return /\.(heic|heif|jpe?g|png|webp)$/i.test(file.name);
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

function inferStoreName(fileName: string) {
  if (fileName.includes("carrefour")) return "Carrefour";
  if (fileName.includes("monoprix")) return "Monoprix";
  if (fileName.includes("leclerc") || fileName.includes("e-leclerc"))
    return "E.Leclerc";
  if (fileName.includes("intermarche") || fileName.includes("intermarch"))
    return "Intermarche";
  return null;
}

function inferLineItems(
  fileName: string,
  confidence: ExtractionConfidence,
): ReceiptLineItem[] {
  if (fileName.includes("safe") || fileName.includes("clear")) {
    return [
      createLineItem("Pates coquillettes", null, 1, 1.49, "medium"),
      createLineItem("Lait demi-ecreme", null, 1, 1.15, "medium"),
    ];
  }

  return [
    createLineItem("Creme de pistache", "Gourmet Celebi", 1, 4.99, confidence),
    createLineItem("Jambon blanc", null, 1, 2.35, "low"),
    createLineItem("Yaourt nature", null, 2, 1.8, "low"),
  ];
}

function toFranceDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function trimToNull(value: string | null) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeDate(value: string | null) {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return Number.isNaN(Date.parse(trimmed)) ? null : trimmed;
}
