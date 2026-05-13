export type ExtractionConfidence = "high" | "medium" | "low";

export type ReceiptLineItem = {
  id: string;
  name: string;
  brand: string | null;
  quantity: number | null;
  price: number | null;
  confidence: ExtractionConfidence;
};

export type ExtractedReceipt = {
  receiptId: string;
  sourceFile: {
    name: string;
    type: string;
    size: number;
  };
  store: {
    name: string | null;
    location: string | null;
    confidence: ExtractionConfidence;
  };
  purchaseDate: {
    value: string | null;
    confidence: ExtractionConfidence;
  };
  lineItems: ReceiptLineItem[];
  extractionConfidence: ExtractionConfidence;
  needsReview: boolean;
  extractedAt: string;
  provider: "mock" | "openai" | "openrouter";
};

export type ReceiptExtractionError = {
  error: string;
  details?: string;
};
