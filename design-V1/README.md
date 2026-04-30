# Design V1 Reference

These files are imported design references for the first RecallRadar visual direction.

They are not the product source of truth.

## Product Truth

When these files conflict with the product docs, follow:

1. `docs/PRD.md`
2. `docs/V1_SCOPE.md`
3. `docs/DESIGN_BRIEF.md`
4. These design reference files

## Known Alignment Rules

- The MVP requires user sign-in with Clerk: Google, Microsoft, and email/profile creation.
- Do not use "no account needed" or "no email required" as product claims.
- RecallRadar is France-first and should use RappelConso as the canonical MVP recall source.
- RecallRadar is a mobile-first PWA for iOS and Android, not a native app.
- The app should not claim that receipt analysis is fully local unless the implementation actually guarantees it.
- The app should not claim that data is never stored remotely because the MVP includes account history, saved receipt checks, flagged items, and verification statuses.
- Copy must preserve uncertainty: possible match, needs verification, strong match. Avoid "all clear," "guaranteed," or "definitely recalled" unless evidence supports it.

## Current Use

Use these files for visual inspiration, screen flow, tone exploration, and layout references.

Before implementing production UI, reconcile any text, privacy claims, auth claims, source claims, and result language against the PRD.
