import type { RecallRecord, RecallSyncResult } from "@/lib/recalls/types";

const DATASET_ID = "rappelconso-v2-gtin-espaces";
const API_BASE =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets";
const DATASET_API_URL = `${API_BASE}/${DATASET_ID}/records`;
const DATASET_PAGE_URL =
  "https://data.economie.gouv.fr/explore/dataset/rappelconso-v2-gtin-espaces/";
const MAX_LIMIT = 500;

type RappelConsoApiResponse = {
  total_count: number;
  results: RappelConsoRawRecord[];
};

type RappelConsoRawRecord = {
  id?: number;
  rappel_guid?: string;
  numero_fiche?: string;
  date_publication?: string;
  categorie_produit?: string | null;
  sous_categorie_produit?: string | null;
  marque_produit?: string | null;
  modeles_ou_references?: string | null;
  identification_produits?: string[] | string | null;
  zone_geographique_de_vente?: string | null;
  distributeurs?: string | null;
  motif_rappel?: string | null;
  risques_encourus?: string | null;
  conduites_a_tenir_par_le_consommateur?: string | null;
  date_de_fin_de_la_procedure_de_rappel?: string | null;
  liens_vers_les_images?: string | null;
  lien_vers_la_fiche_rappel?: string | null;
  libelle?: string | null;
};

export async function syncRappelConsoRecalls({
  limit = 100,
  offset = 0,
  now = new Date(),
}: {
  limit?: number;
  offset?: number;
  now?: Date;
} = {}): Promise<RecallSyncResult> {
  const normalizedLimit = clamp(limit, 1, MAX_LIMIT);
  const normalizedOffset = Math.max(0, offset);
  const today = toFranceDate(now);
  const where = `date_de_fin_de_la_procedure_de_rappel is null or date_de_fin_de_la_procedure_de_rappel >= date'${today}'`;
  const url = new URL(DATASET_API_URL);

  url.searchParams.set("limit", normalizedLimit.toString());
  url.searchParams.set("offset", normalizedOffset.toString());
  url.searchParams.set("order_by", "date_publication desc");
  url.searchParams.set("where", where);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `RappelConso sync failed with ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as RappelConsoApiResponse;
  const recalls = payload.results.map(normalizeRappelConsoRecord);

  return {
    source: "rappelconso",
    sourceUrl: DATASET_PAGE_URL,
    lastSyncedAt: now.toISOString(),
    totalAvailable: payload.total_count,
    count: recalls.length,
    recalls,
  };
}

function normalizeRappelConsoRecord(record: RappelConsoRawRecord): RecallRecord {
  const identifiers = toArray(record.identification_produits);
  const productName = cleanText(record.libelle);
  const brand = cleanText(record.marque_produit);
  const modelOrReference = cleanText(record.modeles_ou_references);
  const sourceId = record.rappel_guid || record.numero_fiche || String(record.id);

  return {
    id: `rappelconso:${sourceId}`,
    source: "rappelconso",
    sourceId,
    sourceUrl: cleanText(record.lien_vers_la_fiche_rappel),
    title: [brand, productName || modelOrReference].filter(Boolean).join(" - "),
    productCategory: cleanText(record.categorie_produit),
    productSubcategory: cleanText(record.sous_categorie_produit),
    brand,
    productName,
    modelOrReference,
    barcodes: extractBarcodes(identifiers),
    identifiers,
    geographicScope: cleanText(record.zone_geographique_de_vente),
    distributors: splitMultiValue(record.distributeurs),
    reason: cleanText(record.motif_rappel),
    consumerRisk: cleanText(record.risques_encourus),
    recommendedActions: splitMultiValue(
      record.conduites_a_tenir_par_le_consommateur,
    ),
    publishedAt: record.date_publication ?? null,
    procedureEndsAt: record.date_de_fin_de_la_procedure_de_rappel ?? null,
    imageUrls: splitMultiValue(record.liens_vers_les_images),
  };
}

function toArray(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }

  if (!value) {
    return [];
  }

  return splitMultiValue(value);
}

function splitMultiValue(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/\||¤¤|, (?=https?:\/\/)/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractBarcodes(values: string[]) {
  const matches = values.flatMap((value) => value.match(/\b\d{8,14}\b/g) ?? []);

  return [...new Set(matches)];
}

function cleanText(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed || null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toFranceDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
