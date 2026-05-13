# Clean Base Roadmap

## Purpose

This document defines the cleanup work required before RecallRadar keeps adding features.

The current MVP proves that the product idea can work, but the core ticket flow needs a cleaner foundation before building saved tickets, future monitoring, notifications, store preferences, barcode scanning, or product-photo verification.

The core loop is:

```txt
receipt upload -> extraction -> review -> recall matching -> result -> optional save
```

## Product Principle

RecallRadar should be useful before it asks for an account.

- A user can analyze a ticket without logging in.
- Anonymous analysis should complete the full safety loop: upload, extract, review, match, and show result.
- Authentication is required only when the user wants durable account features:
  - save the ticket
  - access history
  - keep incoming/future tickets
  - activate future recall monitoring or notifications

The anonymous experience should not feel punitive. The goal is to make the tool valuable enough that people want to keep using it for everyday safety concerns.

The exact anonymous usage limit is **not the first cleanup priority**. It should be decided after the ticket flow is clean and after OpenRouter/provider usage can be measured.

Recommended rule:

```txt
Anonymous user: can run temporary backend-generated analysis without saved history.
Signed-in user: can save analysis, keep history, add future tickets, and enable notifications.
```

## Current Main Problem

The frontend currently orchestrates too much of the business workflow:

```txt
Frontend
  -> /api/receipts/extract
  <- extracted receipt JSON

Frontend review/edit
  -> /api/recalls/match
  <- recall match JSON

Frontend
  -> Convex saveAnalysisResult mutation
  -> database persistence
```

This creates avoidable risk:

- React components act as workflow engines.
- Convex can receive client-submitted match scores, confidence levels, reasons, and recall records.
- Extraction, review, matching, result display, and saving are not one coherent backend-owned flow.
- Refresh/navigation can lose unsaved analysis state.
- Retry behavior can duplicate items or matches.
- Error states and retry behavior are not consistently modeled.
- Saved anonymous history can collapse into a shared `"anonymous"` identity.
- Recall matching depends on live RappelConso fetches during the user request.

## Target Direction

The backend should own extraction, matching, scoring, recall lookup, persistence decisions, lifecycle status, and error states.

The frontend should own interaction only:

- upload interaction
- review/edit UI
- result display
- save/sign-in prompt

Target flow:

```txt
Frontend uploads receipt
  -> backend creates temporary analysis/session
  -> backend extracts receipt
  -> frontend reviews extracted draft
  -> backend receives reviewed receipt fields/items
  -> backend matches against backend-controlled recall data
  -> backend returns temporary result
  -> user optionally signs in to save result to account history
```

Important boundary:

```txt
Frontend can submit: reviewed store/date/items.
Backend must generate: recall lookup, match scores, reasons, confidence, status, persistence records.
```

Authentication gates saving and monitoring, **not analysis**.

---

# Roadmap Blocks

These blocks are intended to be tackled across different days/sessions.

Do not add new product features until Blocks 1-3 are complete.

---

## Block 1 — Core Backend-Owned Ticket Flow

**Goal:** Clean the complete ticket analysis flow first.

**Outcome:** A ticket can move through upload -> extraction -> review -> matching -> result -> optional save with clear backend/frontend responsibilities, explicit errors, safe retries, and no frontend-owned business workflow.

This is the highest-priority block.

### 1.1 Map and choose ownership

- [ ] Map the current flow from `UploadPanel` through extraction, review, matching, result display, and save.
- [ ] Decide the workflow owner: Convex action/mutation, Next API route, or a deliberate hybrid.
- [ ] Document which layer owns each step:
  - upload/session creation
  - extraction
  - review submission
  - recall lookup
  - matching/scoring
  - result generation
  - optional save
  - error state transitions

### 1.2 Define lifecycle states

- [ ] Define temporary lifecycle states, for example:

```txt
created -> uploaded -> extracting -> extracted -> reviewed -> matching -> result_ready -> expired
```

- [ ] Define saved lifecycle states, for example:

```txt
saved -> verification_pending -> verified_safe | affected | ignored
```

- [ ] Define failure states for:
  - upload validation
  - extraction
  - review submission
  - recall matching
  - optional save

### 1.3 Move business decisions to the backend

- [ ] Replace or redesign `saveAnalysisResult` so the client no longer submits authoritative match results.
- [ ] Add backend operation(s) for starting an analysis.
- [ ] Add backend operation(s) for submitting reviewed receipt fields/items.
- [ ] Add backend-owned matching/scoring operation.
- [ ] Ensure recall matches, match scores, match reasons, and confidence levels are generated backend-side.
- [ ] Make matching and save operations idempotent for a given analysis/session.
- [ ] Prevent duplicate receipt items and recall matches on retry.

### 1.4 Define frontend/backend contracts

Frontend may submit user-reviewed input:

```ts
{
  analysisId,
  store,
  purchaseDate,
  reviewedLineItems
}
```

Frontend must not submit authoritative persisted analysis data:

```txt
recall records
match scores
match reasons
match confidence
verification status defaults
```

Backend response should contain renderable result data, but persistence should remain backend-controlled.

### 1.5 Auth/save boundary inside the flow

- [ ] Allow anonymous users to receive a backend-generated temporary result.
- [ ] Remove shared saved history under fallback `"anonymous"` identity.
- [ ] Require auth before saving a result to long-term account history.
- [ ] Require auth before future monitoring or notifications.
- [ ] Add clear save prompt after anonymous result: “Create an account to save this ticket and monitor future recalls.”

### 1.6 Error handling and retry behavior

- [ ] Define one backend error response shape for the ticket flow.
- [ ] Classify errors as:
  - user-fixable input error
  - unsupported file error
  - provider/extraction temporary error
  - recall-data unavailable error
  - persistence/save error
  - unknown/internal error
- [ ] Define retry behavior for extraction, matching, and save.
- [ ] Ensure user-facing copy is actionable.
- [ ] Keep provider/debug details out of normal user-facing copy.
- [ ] Preserve enough internal detail for debugging/logging.

### 1.7 Minimal safety tests for this block

- [ ] Add tests for idempotent matching/save behavior.
- [ ] Add tests for anonymous result vs authenticated save behavior.
- [ ] Add tests for core error classification.

---

## Block 2 — Backend-Controlled Recall Data Source

**Goal:** Separate recall ingestion from user matching.

**Outcome:** Matching uses backend-controlled recall data instead of fetching RappelConso live during each user request.

### Tasks

- [ ] Move RappelConso sync into a protected backend job/action.
- [ ] Store synced recalls in Convex as the local source of truth.
- [ ] Add sync metadata:
  - `lastSyncedAt`
  - source URL
  - synced count
  - total available if known
  - last failure
- [ ] Change matching to query locally stored active recalls.
- [ ] Protect or remove public `/api/recalls/sync`.
- [ ] Decide MVP sync schedule.
- [ ] Add tests for RappelConso normalization and active recall filtering.

### Why this matters

The current match route fetches a limited live slice of recalls on demand. That makes matching slower, less reliable, and dependent on a third-party API during a user’s analysis.

---

## Block 3 — Upload and Extraction Contract

**Goal:** Make supported input behavior honest, recoverable, and aligned between UI and backend.

**Outcome:** Users can only upload formats the backend truly supports, and extraction failures fit the core error model.

### Tasks

- [ ] Decide whether PDF is supported in the MVP.
- [ ] If PDF is not supported, remove PDF from accepted upload types, validation, and UI copy.
- [ ] If PDF is supported, add a real PDF extraction path.
- [ ] Decide whether uploaded files are persisted, temporarily stored, or never stored for anonymous analysis.
- [ ] Define retention behavior for temporary upload artifacts.
- [ ] Ensure file validation errors map into the Block 1 error response shape.
- [ ] Add tests for supported file validation.

---

## Block 4 — Domain Boundaries and Code Organization

**Goal:** Make the code easier to reason about after the flow is clean.

**Outcome:** Receipt, recall, matching, and workflow code have clear homes; API routes and React components stay thin.

### Tasks

- [ ] Move pure receipt validation/normalization into a receipt domain module.
- [ ] Move RappelConso normalization into a recall domain module.
- [ ] Move matching/scoring thresholds into a matching domain module.
- [ ] Move workflow orchestration into a server/workflow module.
- [ ] Centralize constants:
  - max file size
  - supported file types
  - confidence thresholds
  - confidence labels
  - status labels
- [ ] Align Convex validators with domain types intentionally.

Suggested future shape:

```txt
src/domain/receipts/
src/domain/recalls/
src/domain/matching/
src/server/receipt-workflow/
```

---

## Block 5 — Anonymous Usage and Provider Cost Policy

**Goal:** Decide fair anonymous limits and provider-cost controls after the clean backend-owned flow exists.

**Outcome:** Anonymous usage remains welcoming while OpenRouter/provider cost can be measured and protected.

### Tasks

- [ ] Track anonymous analysis usage enough to understand cost and abuse risk.
- [ ] Track OpenRouter/provider usage, ideally tokens; otherwise extraction request count by anonymous session/account.
- [ ] Decide whether anonymous usage should have:
  - no hard limit initially
  - soft daily limit
  - monthly limit
  - CAPTCHA/abuse protection
  - account prompt after repeated use
- [ ] Add clear UI copy only if a limit is introduced.

### Principle

Anonymous limits are a cost-control and conversion-policy decision. They should not block the cleanup of the core ticket flow.

---

## Block 6 — Product Cleanup After Architecture

**Goal:** Resume product polish only after the foundation is clean.

### Tasks

- [ ] Update empty/loading/error states based on the new workflow.
- [ ] Make history filters functional.
- [ ] Hide or clearly mark unfinished nav areas.
- [ ] Explain confidence levels in user-friendly language.
- [ ] Improve “save this ticket” CTA after anonymous result.
- [ ] Add future notification CTA only for signed-in users.

---

# Suggested Execution Order

1. **Block 1 — Core Backend-Owned Ticket Flow**
2. **Block 2 — Backend-Controlled Recall Data Source**
3. **Block 3 — Upload and Extraction Contract**
4. **Block 4 — Domain Boundaries and Code Organization**
5. **Block 5 — Anonymous Usage and Provider Cost Policy**
6. **Block 6 — Product Cleanup After Architecture**

# Stop/Go Rule

Do not add new user-facing features until these are true:

- [ ] Anonymous analysis can complete through backend-owned extraction and matching.
- [ ] Authentication gates saving/monitoring, not analysis.
- [ ] Anonymous analysis does not create shared persisted history.
- [ ] Saved history requires a real account.
- [ ] Frontend no longer persists client-generated recall match results as authoritative data.
- [ ] Matching uses backend-controlled recall data.
- [ ] Error states and retry behavior are defined for the core ticket flow.
- [ ] The upload/extraction contract is honest about supported files.
