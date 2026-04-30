# V1 Feature Scope

## Must Have

- Mobile-first responsive PWA foundation.
- Installable web app manifest and app metadata for Android and iOS.
- Clerk authentication with Google, Microsoft, and email sign-up.
- Receipt import from image, screenshot, and PDF.
- Receipt processing that extracts store, purchase date, and line items.
- Active recall comparison for extracted items using France-first recall data.
- RappelConso ingestion from the official open data/API.
- Confidence-based match results.
- Receipt analysis result screen.
- Recall detail screen with source, match reason, verification guidance, and recommended action.
- Basic user history for receipts and flagged items.
- Item statuses: to verify, verified safe, affected, ignored.
- Clear uncertainty language throughout the app.

## Should Have

- Manual theme setting with light, dark, and system options.
- Desktop layout polish for laptop use.
- Barcode scanning for flagged products.
- Product photo upload for additional verification.
- Lightweight store preference classification.
- User review/edit step for extracted receipt line items.
- Data freshness indicator for recall sources.
- Basic onboarding that explains what the app can and cannot confirm.
- Filtering history by status.

## Not Now

- Native iOS app.
- Native Android app.
- Push notifications.
- Email inbox parsing.
- Household accounts.
- Loyalty account integrations.
- Store API integrations.
- Automatic background monitoring.
- Reimbursement workflows.
- Pantry or inventory management.
- Advanced analytics.
- Shopping habit prediction.
- Multi-country recall coverage.
- Medicine and medical device recall coverage.

## Recommended MVP Cut

Build the smallest version that proves the main loop:

Receipt in -> extraction -> recall comparison -> suspicious item -> verification guidance -> status saved.

Barcode scanning should be treated as a trust-building secondary action, not as the core path for the first prototype.
