import { v, type Infer } from "convex/values";

import { mutation, query, type MutationCtx } from "./_generated/server";

const extractionConfidence = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
);
const extractionProvider = v.union(
  v.literal("mock"),
  v.literal("openai"),
  v.literal("openrouter"),
);
const extractionMode = v.union(
  v.literal("mock"),
  v.literal("real"),
  v.literal("hybrid"),
);
const extractionSuccessOutcome = v.union(
  v.literal("success_real"),
  v.literal("success_fallback"),
);

const matchConfidence = v.union(
  v.literal("none"),
  v.literal("possible"),
  v.literal("needs_verification"),
  v.literal("strong"),
);

const nullableString = v.nullable(v.string());
const nullableNumber = v.nullable(v.number());
const storedMatchConfidence = v.union(
  v.literal("possible"),
  v.literal("needs_verification"),
  v.literal("strong"),
);
const verificationStatus = v.union(
  v.literal("to_verify"),
  v.literal("verified_safe"),
  v.literal("affected"),
  v.literal("ignored"),
);

const receiptLineItem = v.object({
  id: v.string(),
  name: v.string(),
  brand: nullableString,
  quantity: nullableNumber,
  price: nullableNumber,
  confidence: extractionConfidence,
});

const recallRecord = v.object({
  id: v.string(),
  source: v.literal("rappelconso"),
  sourceId: v.string(),
  sourceUrl: nullableString,
  title: v.string(),
  productCategory: nullableString,
  productSubcategory: nullableString,
  brand: nullableString,
  productName: nullableString,
  modelOrReference: nullableString,
  barcodes: v.array(v.string()),
  identifiers: v.array(v.string()),
  geographicScope: nullableString,
  distributors: v.array(v.string()),
  reason: nullableString,
  consumerRisk: nullableString,
  recommendedActions: v.array(v.string()),
  publishedAt: nullableString,
  procedureEndsAt: nullableString,
  imageUrls: v.array(v.string()),
});

const recallMatch = v.object({
  confidence: storedMatchConfidence,
  score: v.number(),
  reasons: v.array(v.string()),
  recall: recallRecord,
});

const matchedReceiptItem = v.object({
  item: receiptLineItem,
  confidence: matchConfidence,
  score: v.number(),
  matches: v.array(recallMatch),
});

type RecallRecordInput = Infer<typeof recallRecord>;

function requireUserTokenIdentifier(
  identity: Awaited<ReturnType<MutationCtx["auth"]["getUserIdentity"]>>,
) {
  return identity?.tokenIdentifier ?? "anonymous";
}

function optionalString(value: string | null) {
  return value ?? undefined;
}

function optionalNumber(value: number | null) {
  return value ?? undefined;
}

export const saveAnalysisResult = mutation({
  args: {
    extraction: v.object({
      sourceFile: v.object({
        name: v.string(),
        type: v.string(),
        size: v.number(),
      }),
      store: v.object({
        name: nullableString,
        location: nullableString,
      }),
      purchaseDate: v.object({
        value: nullableString,
      }),
      extractionConfidence,
      needsReview: v.boolean(),
      provider: extractionProvider,
      mode: extractionMode,
      outcome: extractionSuccessOutcome,
      fallbackReason: nullableString,
    }),
    result: v.object({
      items: v.array(matchedReceiptItem),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userTokenIdentifier = requireUserTokenIdentifier(identity);
    const now = Date.now();

    const receiptId = await ctx.db.insert("receipts", {
      userTokenIdentifier,
      sourceFileName: args.extraction.sourceFile.name,
      sourceFileType: args.extraction.sourceFile.type,
      sourceFileSize: args.extraction.sourceFile.size,
      storeName: optionalString(args.extraction.store.name),
      storeLocation: optionalString(args.extraction.store.location),
      purchaseDate: optionalString(args.extraction.purchaseDate.value),
      extractionConfidence: args.extraction.extractionConfidence,
      extractionProvider: args.extraction.provider,
      extractionMode: args.extraction.mode,
      extractionOutcome: args.extraction.outcome,
      extractionFallbackReason: optionalString(args.extraction.fallbackReason),
      needsReview: args.extraction.needsReview,
      status: "matched",
      createdAt: now,
      updatedAt: now,
    });

    let flaggedCount = 0;

    for (const matchedItem of args.result.items) {
      const receiptItemId = await ctx.db.insert("receiptItems", {
        receiptId,
        userTokenIdentifier,
        name: matchedItem.item.name,
        brand: optionalString(matchedItem.item.brand),
        quantity: optionalNumber(matchedItem.item.quantity),
        price: optionalNumber(matchedItem.item.price),
        confidence: matchedItem.item.confidence,
        createdAt: now,
      });

      for (const match of matchedItem.matches) {
        const recallId = await upsertRecall(ctx, match.recall, now);

        await ctx.db.insert("recallMatches", {
          receiptId,
          receiptItemId,
          recallId,
          userTokenIdentifier,
          confidence: match.confidence,
          score: match.score,
          reasons: match.reasons,
          status: "to_verify",
          createdAt: now,
          updatedAt: now,
        });
        flaggedCount += 1;
      }
    }

    return {
      receiptId,
      flaggedCount,
    };
  },
});

export const listHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userTokenIdentifier = requireUserTokenIdentifier(identity);
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_userTokenIdentifier_and_createdAt", (q) =>
        q.eq("userTokenIdentifier", userTokenIdentifier),
      )
      .order("desc")
      .take(limit);

    return await Promise.all(
      receipts.map(async (receipt) => {
        const items = await ctx.db
          .query("receiptItems")
          .withIndex("by_receiptId", (q) => q.eq("receiptId", receipt._id))
          .collect();
        const matches = await ctx.db
          .query("recallMatches")
          .withIndex("by_receiptId", (q) => q.eq("receiptId", receipt._id))
          .collect();

        return {
          ...receipt,
          itemCount: items.length,
          flaggedCount: matches.length,
          statuses: {
            toVerify: matches.filter((match) => match.status === "to_verify")
              .length,
            affected: matches.filter((match) => match.status === "affected")
              .length,
            verifiedSafe: matches.filter(
              (match) => match.status === "verified_safe",
            ).length,
            ignored: matches.filter((match) => match.status === "ignored")
              .length,
          },
        };
      }),
    );
  },
});

export const getReceiptDetail = query({
  args: {
    receiptId: v.id("receipts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userTokenIdentifier = requireUserTokenIdentifier(identity);
    const receipt = await ctx.db.get(args.receiptId);

    if (!receipt || receipt.userTokenIdentifier !== userTokenIdentifier) {
      return null;
    }

    const items = await ctx.db
      .query("receiptItems")
      .withIndex("by_receiptId", (q) => q.eq("receiptId", receipt._id))
      .collect();
    const matches = await ctx.db
      .query("recallMatches")
      .withIndex("by_receiptId", (q) => q.eq("receiptId", receipt._id))
      .collect();
    const recalls = await Promise.all(matches.map((match) => ctx.db.get(match.recallId)));
    const recallById = new Map(
      recalls
        .filter((recall): recall is NonNullable<typeof recall> => Boolean(recall))
        .map((recall) => [recall._id, recall]),
    );

    const matchesByItemId = new Map<string, Array<(typeof matches)[number]>>();

    for (const match of matches) {
      const key = match.receiptItemId.toString();
      const current = matchesByItemId.get(key) ?? [];
      current.push(match);
      matchesByItemId.set(key, current);
    }

    const itemDetails = items.map((item) => {
      const itemMatches = (matchesByItemId.get(item._id.toString()) ?? [])
        .sort((left, right) => right.score - left.score)
        .map((match) => ({
          _id: match._id,
          confidence: match.confidence,
          score: match.score,
          reasons: match.reasons,
          status: match.status,
          recall: recallById.get(match.recallId) ?? null,
        }));

      return {
        _id: item._id,
        name: item.name,
        brand: item.brand ?? null,
        quantity: item.quantity ?? null,
        price: item.price ?? null,
        confidence: item.confidence ?? "low",
        matches: itemMatches,
      };
    });

    return {
      receipt,
      items: itemDetails,
      summary: {
        itemCount: items.length,
        flaggedCount: matches.length,
        statuses: {
          toVerify: matches.filter((match) => match.status === "to_verify").length,
          affected: matches.filter((match) => match.status === "affected").length,
          verifiedSafe: matches.filter((match) => match.status === "verified_safe")
            .length,
          ignored: matches.filter((match) => match.status === "ignored").length,
        },
      },
    };
  },
});

export const updateRecallMatchStatus = mutation({
  args: {
    recallMatchId: v.id("recallMatches"),
    status: verificationStatus,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userTokenIdentifier = requireUserTokenIdentifier(identity);
    const match = await ctx.db.get(args.recallMatchId);

    if (!match || match.userTokenIdentifier !== userTokenIdentifier) {
      throw new Error("Recall match not found.");
    }

    const now = Date.now();

    await ctx.db.patch(match._id, {
      status: args.status,
      updatedAt: now,
    });
    await ctx.db.insert("verificationEvents", {
      userTokenIdentifier,
      receiptId: match.receiptId,
      receiptItemId: match.receiptItemId,
      recallMatchId: match._id,
      status: args.status,
      createdAt: now,
    });

    return {
      recallMatchId: match._id,
      status: args.status,
      updatedAt: now,
    };
  },
});

async function upsertRecall(
  ctx: MutationCtx,
  recall: RecallRecordInput,
  now: number,
) {
  const existing = await ctx.db
    .query("recalls")
    .withIndex("by_source_and_sourceId", (q) =>
      q.eq("source", recall.source).eq("sourceId", recall.sourceId),
    )
    .unique();

  const recallPatch = {
    sourceUrl: optionalString(recall.sourceUrl),
    title: recall.title,
    productCategory: optionalString(recall.productCategory),
    productSubcategory: optionalString(recall.productSubcategory),
    brand: optionalString(recall.brand),
    productName: optionalString(recall.productName),
    modelOrReference: optionalString(recall.modelOrReference),
    barcodes: recall.barcodes,
    identifiers: recall.identifiers,
    geographicScope: optionalString(recall.geographicScope),
    distributors: recall.distributors,
    reason: optionalString(recall.reason),
    consumerRisk: optionalString(recall.consumerRisk),
    recommendedActions: recall.recommendedActions,
    publishedAt: optionalString(recall.publishedAt),
    procedureEndsAt: optionalString(recall.procedureEndsAt),
    imageUrls: recall.imageUrls,
    lastSyncedAt: now,
    updatedAt: now,
  };

  if (existing) {
    await ctx.db.patch(existing._id, recallPatch);
    return existing._id;
  }

  return await ctx.db.insert("recalls", {
    source: recall.source,
    sourceId: recall.sourceId,
    ...recallPatch,
    createdAt: now,
  });
}
