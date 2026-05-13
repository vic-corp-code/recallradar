import type {
  ExtractedReceipt,
  ExtractionConfidence,
  ReceiptLineItem,
} from "@/lib/receipts/types";

const MAX_RECEIPT_FILE_SIZE_MB = 20;
export const MAX_RECEIPT_FILE_SIZE_BYTES = MAX_RECEIPT_FILE_SIZE_MB * 1024 * 1024;
const MAX_OPENAI_FILE_SIZE_BYTES = 8 * 1024 * 1024;
export const SUPPORTED_RECEIPT_TYPES = new Set([
  "application/pdf",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

type ReceiptExtractionProviderMode =
  | "auto"
  | "mock"
  | "openai"
  | "openrouter";

type OpenAIExtractionPayload = {
  storeName: string | null;
  storeLocation: string | null;
  purchaseDate: string | null;
  lineItems: Array<{
    name: string;
    brand: string | null;
    quantity: number | null;
    price: number | null;
  }>;
};

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
  const providerMode = getProviderMode();

  if (providerMode === "openrouter") {
    return await extractWithOpenRouter(file, buffer);
  }

  if (providerMode === "openai") {
    return await extractWithOpenAI(file, buffer);
  }

  if (providerMode === "auto" && process.env.OPENROUTER_API_KEY) {
    try {
      return await extractWithOpenRouter(file, buffer);
    } catch {
      // Fall through to other providers in auto mode.
    }
  }

  if (providerMode === "auto" && process.env.OPENAI_API_KEY) {
    try {
      return await extractWithOpenAI(file, buffer);
    } catch {
      // Fall through to mock in auto mode.
    }
  }

  if (providerMode === "auto" || providerMode === "mock") {
    return createMockExtraction(file, buffer.byteLength);
  }

  throw new Error(
    "Configured extraction provider is unavailable. Check provider API key and model settings.",
  );
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

async function extractWithOpenAI(
  file: File,
  buffer: ArrayBuffer,
): Promise<ExtractedReceipt> {
  if (file.size > MAX_OPENAI_FILE_SIZE_BYTES) {
    throw new Error("File is too large for OpenAI extraction in this prototype.");
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const model = process.env.OPENAI_RECEIPT_MODEL || "gpt-4.1-mini";
  const fileContent = buildOpenAIFileContent(file, buffer);
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
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
              ].join("\n"),
            },
            fileContent,
          ],
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `OpenAI extraction failed with ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };
  const outputText =
    payload.output_text ||
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .find((content) => content.type === "output_text" && content.text)?.text;

  if (!outputText) {
    throw new Error("OpenAI returned no output text.");
  }

  const extraction = parseOpenAIExtraction(outputText);

  if (!extraction.lineItems.length) {
    throw new Error("OpenAI extraction returned no usable line items.");
  }

  return toExtractedReceiptFromModel(file, extraction, "openai");
}

async function extractWithOpenRouter(
  file: File,
  buffer: ArrayBuffer,
): Promise<ExtractedReceipt> {
  if (!isImageFile(file)) {
    throw new Error(
      "OpenRouter extraction currently supports image receipts only in this prototype.",
    );
  }

  if (file.size > MAX_OPENAI_FILE_SIZE_BYTES) {
    throw new Error("File is too large for OpenRouter extraction in this prototype.");
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing.");
  }

  const model =
    process.env.OPENROUTER_RECEIPT_MODEL || "google/gemma-4-31b-it:free";
  const base64 = Buffer.from(buffer).toString("base64");
  const prompt = [
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

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${file.type};base64,${base64}`,
              },
            },
          ],
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `OpenRouter extraction failed with ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
  const outputText = payload.choices?.[0]?.message?.content;

  if (!outputText) {
    throw new Error("OpenRouter returned no output text.");
  }

  const extraction = parseOpenAIExtraction(outputText);

  if (!extraction.lineItems.length) {
    throw new Error("OpenRouter extraction returned no usable line items.");
  }

  return toExtractedReceiptFromModel(file, extraction, "openrouter");
}

function buildOpenAIFileContent(file: File, buffer: ArrayBuffer) {
  const base64 = Buffer.from(buffer).toString("base64");

  if (file.type.startsWith("image/")) {
    return {
      type: "input_image" as const,
      image_url: `data:${file.type};base64,${base64}`,
      detail: "high" as const,
    };
  }

  return {
    type: "input_file" as const,
    file_data: base64,
    filename: file.name,
  };
}

function parseOpenAIExtraction(outputText: string): OpenAIExtractionPayload {
  const jsonText = extractJsonObject(outputText);
  const parsed = JSON.parse(jsonText) as Partial<OpenAIExtractionPayload>;
  const lineItems = Array.isArray(parsed.lineItems)
    ? parsed.lineItems
        .map((item) => normalizeOpenAILineItem(item))
        .filter((item): item is OpenAIExtractionPayload["lineItems"][number] =>
          Boolean(item),
        )
    : [];

  return {
    storeName: normalizeNullableString(parsed.storeName),
    storeLocation: normalizeNullableString(parsed.storeLocation),
    purchaseDate: normalizeDate(parsed.purchaseDate),
    lineItems,
  };
}

function normalizeOpenAILineItem(
  value: unknown,
): OpenAIExtractionPayload["lineItems"][number] | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as {
    brand?: unknown;
    name?: unknown;
    price?: unknown;
    quantity?: unknown;
  };
  const name = normalizeRequiredString(row.name);

  if (!name) {
    return null;
  }

  return {
    name,
    brand: normalizeNullableString(row.brand),
    quantity: normalizeNullableNumber(row.quantity),
    price: normalizeNullableNumber(row.price),
  };
}

function toExtractedReceiptFromModel(
  file: File,
  extraction: OpenAIExtractionPayload,
  provider: ExtractedReceipt["provider"],
): ExtractedReceipt {
  const lineItems = extraction.lineItems.map((item) =>
    createLineItem(
      item.name,
      item.brand,
      item.quantity,
      item.price,
      "medium",
    ),
  );
  const highSignalCount = [
    Boolean(extraction.storeName),
    Boolean(extraction.purchaseDate),
    lineItems.length >= 3,
  ].filter(Boolean).length;
  const extractionConfidence: ExtractionConfidence =
    highSignalCount >= 3 ? "high" : "medium";

  return {
    receiptId: crypto.randomUUID(),
    sourceFile: {
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
    },
    store: {
      name: extraction.storeName,
      location: extraction.storeLocation,
      confidence: extraction.storeName ? extractionConfidence : "low",
    },
    purchaseDate: {
      value: extraction.purchaseDate,
      confidence: extraction.purchaseDate ? extractionConfidence : "low",
    },
    lineItems,
    extractionConfidence,
    needsReview: true,
    extractedAt: new Date().toISOString(),
    provider,
  };
}

function isSupportedReceiptFile(file: File) {
  if (SUPPORTED_RECEIPT_TYPES.has(file.type)) {
    return true;
  }

  return /\.(heic|heif|jpe?g|pdf|png|webp)$/i.test(file.name);
}

function isImageFile(file: File) {
  if (file.type.startsWith("image/")) {
    return true;
  }

  return /\.(heic|heif|jpe?g|png|webp)$/i.test(file.name);
}

function getProviderMode(): ReceiptExtractionProviderMode {
  const mode = process.env.RECEIPT_EXTRACTION_PROVIDER;

  if (mode === "mock" || mode === "openai" || mode === "openrouter") {
    return mode;
  }

  return "auto";
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

function extractJsonObject(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Could not find JSON object in OpenAI output.");
  }

  return trimmed.slice(start, end + 1);
}

function normalizeNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeRequiredString(value: unknown) {
  const normalized = normalizeNullableString(value);
  return normalized ?? "";
}

function normalizeNullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim();

    if (!normalized) {
      return null;
    }

    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeDate(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  return Number.isNaN(Date.parse(trimmed)) ? null : trimmed;
}
