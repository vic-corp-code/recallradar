# Convex Setup

RecallRadar uses Convex as the application database and Clerk as the auth provider.

## Environment

The shared development deployment is configured in `.env.local`:

```env
CONVEX_DEPLOYMENT=dev:<deployment-name>
NEXT_PUBLIC_CONVEX_URL=https://<deployment-name>.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://<deployment-name>.convex.site
```

Convex auth also needs the Clerk JWT issuer domain:

```env
CLERK_JWT_ISSUER_DOMAIN=
```

Set the same `CLERK_JWT_ISSUER_DOMAIN` value in the Convex dashboard environment variables for this deployment. This value is the Clerk application domain (e.g. `https://your-project.clerk.accounts.dev`).

## Clerk JWT Template

Create a Clerk JWT template named `convex`. Convex is configured with:

```ts
// convex/auth.config.ts
applicationID: "convex"
```

The `auth.config.ts` reads the issuer domain at runtime:

```ts
const authConfig = {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
export default authConfig;
```

Once the Clerk issuer domain exists in Convex, run:

```bash
bun run convex:codegen
```

Then start Convex locally with:

```bash
bun run convex:dev
```

## Schema Overview

The schema (`convex/schema.ts`) defines these tables:

### `users`

Stores authenticated user profiles synced via Clerk.

| Field             | Type     | Notes                |
| ----------------- | -------- | -------------------- |
| `tokenIdentifier` | `string` | Clerk JWT subject    |
| `name`            | optional |                      |
| `email`           | optional |                      |
| `imageUrl`        | optional |                      |
| `createdAt`       | `number` | ms epoch             |
| `updatedAt`       | `number` | ms epoch             |

Index: `by_tokenIdentifier`

### `stores`

User-identified store entries with classification.

| Field                | Type                                | Notes            |
| -------------------- | ----------------------------------- | ---------------- |
| `userTokenIdentifier` | `string`                            |                  |
| `name`               | `string`                            |                  |
| `location`           | optional                            |                  |
| `classification`     | `"preferred"` `"occasional"` `"do_not_save"` |                  |
| `createdAt`          | `number`                            |                  |
| `updatedAt`          | `number`                            |                  |

Indexes: `by_userTokenIdentifier`, `by_userTokenIdentifier_and_name`

### `receipts`

Core receipt records with full extraction diagnostics.

| Field                     | Type                                            | Notes            |
| ------------------------- | ----------------------------------------------- | ---------------- |
| `userTokenIdentifier`     | `string`                                        |                  |
| `sourceStorageId`         | optional `id(_storage)`                         | Convex file ref  |
| `sourceFileName`          | optional                                        |                  |
| `sourceFileType`          | optional                                        |                  |
| `sourceFileSize`          | optional                                        |                  |
| `storeName`               | optional                                        |                  |
| `storeLocation`           | optional                                        |                  |
| `purchaseDate`            | optional                                        | YYYY-MM-DD       |
| `extractionConfidence`    | optional `"high"` `"medium"` `"low"`             |                  |
| `extractionProvider`      | optional `"mock"` `"openai"` `"openrouter"`      |                  |
| `extractionMode`          | optional `"mock"` `"real"` `"hybrid"`            |                  |
| `extractionOutcome`       | optional `"success_real"` `"success_fallback"` `"failure_input_invalid"` `"failure_provider"` `"failure_parsing"` | |
| `extractionFallbackReason` | optional                                        |                  |
| `needsReview`             | `boolean`                                       |                  |
| `status`                  | `"uploaded"` `"extracted"` `"matched"` `"failed"` |                  |
| `createdAt`               | `number`                                        |                  |
| `updatedAt`               | `number`                                        |                  |

Indexes: `by_userTokenIdentifier`, `by_userTokenIdentifier_and_createdAt`

### `receiptItems`

Individual line items extracted from a receipt.

| Field                | Type                           | Notes     |
| -------------------- | ------------------------------ | --------- |
| `receiptId`          | `id("receipts")`               | FK        |
| `userTokenIdentifier` | `string`                      |           |
| `name`               | `string`                       |           |
| `brand`              | optional                       |           |
| `quantity`           | optional `number`              |           |
| `price`              | optional `number`              |           |
| `confidence`         | optional `"high"` `"medium"` `"low"` |           |
| `createdAt`          | `number`                       |           |

Indexes: `by_receiptId`, `by_userTokenIdentifier`

### `recalls`

Normalized recall records from RappelConso.

| Field              | Type                              | Notes     |
| ------------------ | --------------------------------- | --------- |
| `source`           | `"rappelconso"`                   |           |
| `sourceId`         | `string`                          |           |
| `sourceUrl`        | optional                          |           |
| `title`            | `string`                          |           |
| `productCategory`  | optional                          |           |
| `productSubcategory` | optional                        |           |
| `brand`            | optional                          |           |
| `productName`      | optional                          |           |
| `modelOrReference` | optional                          |           |
| `barcodes`         | `string[]`                        |           |
| `identifiers`      | `string[]`                        |           |
| `geographicScope`  | optional                          |           |
| `distributors`     | `string[]`                        |           |
| `reason`           | optional                          |           |
| `consumerRisk`     | optional                          |           |
| `recommendedActions` | `string[]`                      |           |
| `publishedAt`      | optional `string`                 |           |
| `procedureEndsAt`  | optional `string`                 |           |
| `imageUrls`        | `string[]`                        |           |
| `lastSyncedAt`     | `number`                          |           |
| `createdAt`        | `number`                          |           |
| `updatedAt`        | `number`                          |           |

Indexes: `by_source_and_sourceId`, `by_publishedAt`

### `recallMatches`

Join table linking receipt items to recall matches.

| Field                | Type                                  | Notes     |
| -------------------- | ------------------------------------- | --------- |
| `receiptId`          | `id("receipts")`                      | FK        |
| `receiptItemId`      | `id("receiptItems")`                  | FK        |
| `recallId`           | `id("recalls")`                       | FK        |
| `userTokenIdentifier` | `string`                             |           |
| `confidence`         | `"none"` `"possible"` `"needs_verification"` `"strong"` |           |
| `score`              | `number`                              |           |
| `reasons`            | `string[]`                            |           |
| `status`             | `"to_verify"` `"verified_safe"` `"affected"` `"ignored"` |           |
| `createdAt`          | `number`                              |           |
| `updatedAt`          | `number`                              |           |

Indexes: `by_receiptId`, `by_receiptItemId`, `by_userTokenIdentifier_and_status`

### `verificationEvents`

Audit log for status changes on recall matches.

| Field                | Type                                  | Notes     |
| -------------------- | ------------------------------------- | --------- |
| `userTokenIdentifier` | `string`                             |           |
| `receiptId`          | `id("receipts")`                      |           |
| `receiptItemId`      | `id("receiptItems")`                  |           |
| `recallMatchId`      | optional `id("recallMatches")`        |           |
| `status`             | `"to_verify"` `"verified_safe"` `"affected"` `"ignored"` |           |
| `notes`              | optional                              |           |
| `createdAt`          | `number`                              |           |

Indexes: `by_receiptId`, `by_userTokenIdentifier_and_createdAt`

## Convex Functions

### Mutations (in `convex/receipts.ts`)

- `saveAnalysisResult` — Saves a matched receipt, its line items, recall matches, and upserts recall records. Returns `{ receiptId, flaggedCount }`.
- `updateRecallMatchStatus` — Updates a recall match status and inserts a verification event. Returns `{ recallMatchId, status, updatedAt }`.

### Queries (in `convex/receipts.ts`)

- `listHistory` — Returns receipts for the current user with item/flagged counts and status summaries. Accepts `limit` (1–50, default 20).
- `getReceiptDetail` — Returns full receipt detail with items, matches, and recalls for a single receipt. Returns `null` if not found or access denied.

## Auth Flow

1. User signs in via Clerk (Google, Microsoft, or email).
2. Clerk issues a JWT using the `convex` template.
3. The JWT is passed to Convex via the Convex client provider (`convex-client-provider.tsx`).
4. Convex validates the JWT against the configured Clerk issuer domain.
5. Mutations and queries read `ctx.auth.getUserIdentity()` to get the `tokenIdentifier`.

Anonymous users (before sign-in) get a `"anonymous"` token identifier via `requireUserTokenIdentifier` in mutation handlers.

## Scripts

```bash
bun run convex:dev          # Start local Convex dev server
bun run convex:deploy       # Deploy to production
bun run convex:codegen      # Regenerate TypeScript types from schema
```
