import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const matchConfidence = v.union(
  v.literal("none"),
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

const extractionConfidence = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
);

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_tokenIdentifier", ["tokenIdentifier"]),

  stores: defineTable({
    userTokenIdentifier: v.string(),
    name: v.string(),
    location: v.optional(v.string()),
    classification: v.union(
      v.literal("preferred"),
      v.literal("occasional"),
      v.literal("do_not_save"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userTokenIdentifier", ["userTokenIdentifier"])
    .index("by_userTokenIdentifier_and_name", ["userTokenIdentifier", "name"]),

  receipts: defineTable({
    userTokenIdentifier: v.string(),
    sourceStorageId: v.optional(v.id("_storage")),
    sourceFileName: v.optional(v.string()),
    sourceFileType: v.optional(v.string()),
    sourceFileSize: v.optional(v.number()),
    storeName: v.optional(v.string()),
    storeLocation: v.optional(v.string()),
    purchaseDate: v.optional(v.string()),
    extractionConfidence: v.optional(extractionConfidence),
    needsReview: v.boolean(),
    status: v.union(
      v.literal("uploaded"),
      v.literal("extracted"),
      v.literal("matched"),
      v.literal("failed"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userTokenIdentifier", ["userTokenIdentifier"])
    .index("by_userTokenIdentifier_and_createdAt", [
      "userTokenIdentifier",
      "createdAt",
    ]),

  receiptItems: defineTable({
    receiptId: v.id("receipts"),
    userTokenIdentifier: v.string(),
    name: v.string(),
    brand: v.optional(v.string()),
    quantity: v.optional(v.number()),
    price: v.optional(v.number()),
    confidence: v.optional(extractionConfidence),
    createdAt: v.number(),
  })
    .index("by_receiptId", ["receiptId"])
    .index("by_userTokenIdentifier", ["userTokenIdentifier"]),

  recalls: defineTable({
    source: v.literal("rappelconso"),
    sourceId: v.string(),
    sourceUrl: v.optional(v.string()),
    title: v.string(),
    productCategory: v.optional(v.string()),
    productSubcategory: v.optional(v.string()),
    brand: v.optional(v.string()),
    productName: v.optional(v.string()),
    modelOrReference: v.optional(v.string()),
    barcodes: v.array(v.string()),
    identifiers: v.array(v.string()),
    geographicScope: v.optional(v.string()),
    distributors: v.array(v.string()),
    reason: v.optional(v.string()),
    consumerRisk: v.optional(v.string()),
    recommendedActions: v.array(v.string()),
    publishedAt: v.optional(v.string()),
    procedureEndsAt: v.optional(v.string()),
    imageUrls: v.array(v.string()),
    lastSyncedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_source_and_sourceId", ["source", "sourceId"])
    .index("by_publishedAt", ["publishedAt"]),

  recallMatches: defineTable({
    receiptId: v.id("receipts"),
    receiptItemId: v.id("receiptItems"),
    recallId: v.id("recalls"),
    userTokenIdentifier: v.string(),
    confidence: matchConfidence,
    score: v.number(),
    reasons: v.array(v.string()),
    status: verificationStatus,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_receiptId", ["receiptId"])
    .index("by_receiptItemId", ["receiptItemId"])
    .index("by_userTokenIdentifier_and_status", [
      "userTokenIdentifier",
      "status",
    ]),

  verificationEvents: defineTable({
    userTokenIdentifier: v.string(),
    receiptId: v.id("receipts"),
    receiptItemId: v.id("receiptItems"),
    recallMatchId: v.optional(v.id("recallMatches")),
    status: verificationStatus,
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_receiptId", ["receiptId"])
    .index("by_userTokenIdentifier_and_createdAt", [
      "userTokenIdentifier",
      "createdAt",
    ]),
});
