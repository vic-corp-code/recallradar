# Extraction Implementation Plan

## Goal

Make receipt extraction deterministic, auditable, and testable across phone and desktop, with clear behavior for non-receipt inputs.

## 1) Operating Modes and Contracts

Define and enforce explicit extraction modes:

- `mock`: always synthetic output.
- `real`: never fallback; return explicit failure on provider or parsing errors.
- `hybrid`: real first; fallback only under declared conditions and visibly tagged.

## 2) Extraction Outcome Taxonomy

Introduce explicit outcomes across API/UI/persistence:

- `success_real`
- `success_fallback`
- `failure_input_invalid`
- `failure_provider`
- `failure_parsing`

## 3) Plausibility Gate Before Matching

Run deterministic receipt-likeness checks before recall matching:

- minimum line-item count
- required structure checks
- confidence threshold checks
- receipt-pattern heuristics (line structure, totals/currency clues)

If gate fails, block matching and show actionable retry guidance.

## 4) Persist Diagnostics Per Receipt

Store extraction diagnostics for each receipt:

- provider used (`openrouter` / `openai` / `mock`)
- mode used (`mock` / `real` / `hybrid`)
- extraction confidence summary
- plausibility gate pass/fail and reasons
- fallback reason when applicable

## 5) Fixed Test Corpus

Create `test-fixtures/receipts/` with labeled inputs:

- `valid_receipt_*`
- `blurry_receipt_*`
- `non_receipt_photo_*`
- `random_image_*`
- `pdf_receipt_*`

Define expected outcomes per mode for each fixture.

## 6) Automated Contract Tests

Add tests for:

- provider selection logic
- fallback policy
- plausibility gate behavior
- outcome taxonomy mapping
- no silent mock when real provider is configured

## 7) Manual QA Checklist

Maintain a repeatable manual checklist for Android + desktop:

- capture flow behavior
- upload flow behavior
- extraction outcome and provider label visibility
- history diagnostics visibility
- non-receipt block behavior before matching

## 8) UI Transparency

Display extraction metadata in review/result flows:

- provider
- mode
- outcome
- gate failure reason (when blocked)

## 9) Rollout Sequence

- Phase A: outcome taxonomy + diagnostics + UI labels
- Phase B: plausibility gate + automated tests
- Phase C: fixture-driven QA and threshold tuning
- Phase D: continue broader feature work
