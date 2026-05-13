# Extraction Implementation Plan

## Goal

Make receipt extraction deterministic, auditable, and testable across phone and desktop, with clear behavior for non-receipt inputs.

## Implementation Status

Sections below are annotated with their current implementation status.

---

## 1) Operating Modes and Contracts

Define and enforce explicit extraction modes:

- `mock`: always synthetic output.
- `real`: never fallback; return explicit failure on provider or parsing errors.
- `hybrid`: real first; fallback only under declared conditions and visibly tagged.

> **Status: partially implemented.** The `mock` and `real` modes work in `extract.ts`. The `hybrid` mode is defined in the Convex schema (`extractionMode`) but not wired in the extraction function — `extract.ts` always sets `mode: "real"` when not mocking. The `types.ts` `ReceiptExtractionMode` type only includes `"mock" | "real"` (missing `"hybrid"`).

---

## 2) Extraction Outcome Taxonomy

Introduce explicit outcomes across API/UI/persistence:

- `success_real`
- `success_fallback`
- `failure_input_invalid`
- `failure_provider`
- `failure_parsing`

> **Status: implemented.** All five outcomes are defined in `src/lib/receipts/types.ts` and `convex/schema.ts`. The API route (`src/app/api/receipts/extract/route.ts`) classifies errors and maps them to outcomes. The `extract.ts` function returns `success_real` or `success_fallback`. Outcomes are persisted in the `receipts` table and displayed in the `ExtractionDiagnostics` component.

---

## 3) Plausibility Gate Before Matching

Run deterministic receipt-likeness checks before recall matching:

- minimum line-item count
- required structure checks
- confidence threshold checks
- receipt-pattern heuristics (line structure, totals/currency clues)

If gate fails, block matching and show actionable retry guidance.

> **Status: not implemented.** No plausibility gate exists. The `extract.ts` function only checks for empty line items after extraction (throws if none). There is no pre-matching gate in the API route or the client.

---

## 4) Persist Diagnostics Per Receipt

Store extraction diagnostics for each receipt:

- provider used (`openrouter` / `openai` / `mock`)
- mode used (`mock` / `real` / `hybrid`)
- extraction confidence summary
- plausibility gate pass/fail and reasons
- fallback reason when applicable

> **Status: partially implemented.** Provider, mode, confidence, outcome, and fallback reason are persisted in the `receipts` table schema and saved by `saveAnalysisResult`. Plausibility gate fields are not yet stored.

---

## 5) Fixed Test Corpus

Create `test-fixtures/receipts/` with labeled inputs:

- `valid_receipt_*`
- `blurry_receipt_*`
- `non_receipt_photo_*`
- `random_image_*`
- `pdf_receipt_*`

Define expected outcomes per mode for each fixture.

> **Status: not implemented.**

---

## 6) Automated Contract Tests

Add tests for:

- provider selection logic
- fallback policy
- plausibility gate behavior
- outcome taxonomy mapping
- no silent mock when real provider is configured

> **Status: not implemented.**

---

## 7) Manual QA Checklist

Maintain a repeatable manual checklist for Android + desktop:

- capture flow behavior
- upload flow behavior
- extraction outcome and provider label visibility
- history diagnostics visibility
- non-receipt block behavior before matching

> **Status: not implemented.**

---

## 8) UI Transparency

Display extraction metadata in review/result flows:

- provider
- mode
- outcome
- gate failure reason (when blocked)

> **Status: partially implemented.** The `ExtractionDiagnostics` component in `extraction-review.tsx` shows provider, mode, outcome, and fallback reason. Gate failure reason is not yet displayed (gate not implemented).

---

## 9) Rollout Sequence

- Phase A: outcome taxonomy + diagnostics + UI labels — **mostly done**
- Phase B: plausibility gate + automated tests — **not started**
- Phase C: fixture-driven QA and threshold tuning — **not started**
- Phase D: continue broader feature work — **not started**
