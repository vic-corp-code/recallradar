# V1 Execution Todo

## Goal

Ship the smallest credible RecallRadar loop:

Receipt in -> extraction -> review/edit -> recall comparison -> suspicious item -> verification guidance -> saved status/history.

## P0 - Core Loop

- [x] Persist completed receipt checks.
- [x] Persist extracted line items.
- [x] Persist RappelConso recalls referenced by match results.
- [x] Persist recall matches with default `to_verify` status.
- [x] Show real receipt and flagged-item history.
- [x] Add recall detail view with source, match reasons, confidence, guidance, and recommended action.
- [x] Let users update match status: `to_verify`, `verified_safe`, `affected`, `ignored`.

## P1 - Product Trust

- [x] Replace mock receipt extraction with a real extraction provider.
- [ ] Tighten uncertainty copy across result, detail, and history screens.
- [ ] Add empty, loading, and error states for persisted history.
- [ ] Show recall data freshness in results and detail views.

## P2 - Workflow UX & Design Refinement

- [ ] Refine extraction review flow for clarity and speed.
- [ ] Improve recall match result presentation and actions.
- [ ] Polish history list and detail screens.
- [ ] Add barcode scan entry point for flagged products.
- [ ] Add product photo verification entry point for flagged products.
- [ ] Verify installability on Android and iOS PWA surfaces.

## P3 - V1 Polish

- [ ] Enforce signed-in app flow once Clerk keys are configured.
- [ ] Add store preference classification after receipt extraction.
- [ ] Add history filtering by status.
- [ ] Show recall data freshness in results and detail views.

## Not Now

- Native mobile apps.
- Push notifications.
- Email inbox parsing.
- Household accounts.
- Loyalty/store API integrations.
- Automatic background monitoring.
- Reimbursement workflows.
- Pantry/inventory management.
- Multi-country recall coverage.
