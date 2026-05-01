export type RecallSource = "rappelconso";

export type RecallRecord = {
  id: string;
  source: RecallSource;
  sourceId: string;
  sourceUrl: string | null;
  title: string;
  productCategory: string | null;
  productSubcategory: string | null;
  brand: string | null;
  productName: string | null;
  modelOrReference: string | null;
  barcodes: string[];
  identifiers: string[];
  geographicScope: string | null;
  distributors: string[];
  reason: string | null;
  consumerRisk: string | null;
  recommendedActions: string[];
  publishedAt: string | null;
  procedureEndsAt: string | null;
  imageUrls: string[];
};

export type RecallSyncResult = {
  source: RecallSource;
  sourceUrl: string;
  lastSyncedAt: string;
  totalAvailable: number;
  count: number;
  recalls: RecallRecord[];
};
