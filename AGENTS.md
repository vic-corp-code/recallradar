# RecallRadar

## Quick start

```bash
bun install        # install deps
cp .env.example .env.local  # edit as needed
bun dev            # http://localhost:3000
```

Set `RECEIPT_EXTRACTION_MODE=mock` in `.env.local` for no-API-key dev (default for `.env.example` -- filename-based mock data).

## Commands

| Command | Purpose |
|---|---|
| `bun dev` | Next.js dev server |
| `bun build` | Production build |
| `bun start` | Start production server |
| `bun lint` | ESLint |
| `convex dev` | Start local Convex dev server |
| `convex deploy` | Deploy Convex functions |
| `convex codegen` | Regenerate `convex/_generated/` |

Run `convex dev` in a separate terminal for local Convex development.

## Stack

- Next.js 16 (App Router, `src/app/`), React 19, TypeScript, Tailwind CSS 4
- Bun 1.3.4 (package manager)
- Convex (database + backend functions, Clerk auth integration)
- Clerk (auth -- **optional**, app runs without Clerk keys configured)
- Vercel AI SDK + OpenRouter for receipt text extraction
- shadcn/ui (New York style, lucide-react icons)
- RappelConso (French government open data) as recall data source

## Architecture

Entrypoint: `src/app/layout.tsx` -> wraps with `AuthProvider` (Clerk), `ConvexClientProvider`, `ThemeProvider`.

Routes:
- `/` — landing page
- `/check` — main flow: upload receipt → extract → match recalls → review results
- `/history` — past checks (`/history/[receiptId]` for detail with status updates)
- `/stores`, `/profile` — placeholder pages
- `/sign-in`, `/sign-up` — Clerk catch-all auth routes

API routes (all `POST` unless noted):
- `POST /api/receipts/extract` — multipart form upload of receipt file
- `POST /api/recalls/match` — JSON body with receipt, returns matched recalls
- `GET|POST /api/recalls/sync` — fetches live recalls from RappelConso API

Receipt extraction: `src/lib/receipts/extract.ts` uses AI SDK `generateText` with `Output.object()` and zod schema.
Recall matching: `src/lib/recalls/matching.ts` — token overlap + Levenshtein similarity + brand/store/date scoring.
Recall sync: `src/lib/recalls/rappelconso.ts` — fetches `data.economie.gouv.fr` API with active recall filter.

Convex schema: `convex/schema.ts` defines users, stores, receipts, receiptItems, recalls, recallMatches, verificationEvents.
Convex functions: `convex/receipts.ts` — `saveAnalysisResult`, `listHistory`, `getReceiptDetail`, `updateRecallMatchStatus`.

## Key conventions

- `@/` path alias → `src/`
- Clerk is optional: `hasClerkConfig()` checks `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to decide whether to wrap providers. User identity falls back to `"anonymous"`.
- `src/proxy.ts` wraps `clerkMiddleware` with graceful fallback when Clerk keys are missing.
- Receipt extraction: only real image files (not PDFs) go through AI; PDF-only receipts hit the `"supports image"` error.
- Mock extraction infers store name and line items from the filename (see `inferStoreName` / `inferLineItems` in `extract.ts`).
- Convex generated code is in `convex/_generated/`. Run `convex codegen` after schema changes.
- Convex JWT issuer domain is configured in `convex/auth.config.ts` via `CLERK_JWT_ISSUER_DOMAIN`.
- Recall match retention: top 3 matches per item, score-capped at 1.0, confidence levels: `possible` >= 0.56, `needs_verification` >= 0.74, `strong` >= 0.88 with brand match.
- The app saves matched results to Convex via `saveAnalysisResult` mutation (upserts recall records, inserts receipt + items + matches).
- Mobile/LAN dev: set `ALLOWED_DEV_ORIGINS` in `.env.local`. `next.config.ts` default-whitelists `*.ts.net`, `*.tailnet.ts.net`, `localhost`.
- PWA manifest at `/manifest.json` with apple-touch-icon support.

## Testing

No test runner or test files present yet.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
