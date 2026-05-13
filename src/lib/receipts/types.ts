export type ExtractionConfidence = "high" | "medium" | "low";
export type ReceiptExtractionProvider = "mock" | "openrouter";
export type ReceiptExtractionMode = "mock" | "real";
export type ReceiptExtractionSuccessOutcome = "success_real" | "success_fallback";
export type ReceiptExtractionFailureOutcome =
  | "failure_input_invalid"
  | "failure_provider"
  | "failure_parsing";
export type ReceiptExtractionOutcome =
  | ReceiptExtractionSuccessOutcome
  | ReceiptExtractionFailureOutcome;

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
  provider: ReceiptExtractionProvider;
  mode: ReceiptExtractionMode;
  outcome: ReceiptExtractionSuccessOutcome;
  fallbackReason: string | null;
};

export type ReceiptExtractionError = {
  error: string;
  outcome?: ReceiptExtractionFailureOutcome;
  details?: string;
};
