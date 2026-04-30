# Product Requirements Document

## Product Name

Working name: RecallRadar

## Product Summary

RecallRadar is a mobile-first PWA that lets users import grocery receipts, extracts purchased products, compares them with active product recalls, and highlights items that may need manual verification.

The product does not promise exact recall confirmation from a receipt alone. Its job is to reduce uncertainty quickly by identifying possible risks and guiding the user toward the right verification steps.

The app should be installable on Android and iOS as a PWA. It can also be used on laptops and desktops, but the primary experience is designed for mobile users.

The MVP launch market is France.

## Core Promise

Import your receipt and quickly see whether any recent grocery purchase may require verification against an active recall.

## Problem

Product recalls are easy to miss. Consumers may not know that a product they recently bought is affected, especially when recall notices are scattered across government sites, retailer notices, brand pages, and news sources.

Receipts contain useful purchase context, but they rarely contain enough detail to prove an exact recall match. Product names can be abbreviated, brands may be missing, and lot/date codes are usually on the packaging rather than the receipt.

## Target Users

### Primary User

A grocery shopper who wants to quickly check whether recent food, household, or health-related purchases may be affected by an active recall.

### Secondary Users

- Parents or caregivers who are more sensitive to food and product safety risk.
- People with allergies or dietary restrictions.
- Users who keep receipts or digital purchase records and want a lightweight safety check.

## MVP Goal

Prove that users are willing to import receipts and that receipt-based recall screening can produce useful, trustworthy guidance without creating too many false alarms.

## MVP Success Criteria

1. Users are willing to upload or scan receipts.
2. Receipt extraction is good enough to identify store, date, and usable line items.
3. Recall results feel helpful rather than noisy.
4. Users understand when an item is only a possible match and what they should verify next.
5. The mobile PWA feels fast, installable, and natural to use on iOS and Android.

## User Value

The app helps the user answer:

- Did I recently buy something that may be affected by an active recall?
- Why is this item being flagged?
- What should I check on the package?
- What action should I take next?

## MVP Scope

### Platform

RecallRadar should launch as a responsive PWA rather than a native mobile application.

Primary platform focus:

- Mobile web
- Installable Android PWA
- Installable iOS PWA

Secondary platform support:

- Laptop and desktop browsers

MVP platform requirements:

- Responsive mobile-first layout.
- Web app manifest with installable app metadata.
- App icons sized for Android and iOS install surfaces.
- iOS-friendly metadata and home screen behavior.
- Camera and file upload flows that work well on mobile browsers.
- Touch-friendly controls and minimum tap target sizes.
- Graceful desktop layout that supports the same core workflows without becoming the main design target.

### Authentication

Use Clerk for:

- Google sign-in
- Microsoft sign-in
- Email/profile creation

### Receipt Import

Supported inputs:

- Photo of a paper receipt
- Image upload
- PDF upload
- Screenshot of a digital receipt

### Receipt Extraction

The app should attempt to extract:

- Store brand
- Store location, when visible
- Purchase date
- Receipt line items
- Product names or abbreviated item descriptions
- Quantity, when available

### Store Handling

If a detected store is new, the app may ask whether to classify it as:

- Preferred
- Occasional
- Do not save

This should remain lightweight and must not interrupt the main recall-checking flow.

### Recall Matching

Each extracted receipt item is compared against active recalls using:

- Product name similarity
- Brand similarity, when available
- Store, retailer, distributor, or seller match
- Geographic scope, when relevant
- Purchase date relevance
- Recall category and product category

The result is not binary. Each possible match receives a confidence level:

- No relevant match
- Possible match
- Needs verification
- Strong match

### Manual Product Verification

If an item is flagged, the user can optionally verify the product more deeply by:

- Scanning a barcode
- Uploading a product photo
- Reviewing packaging guidance

Manual lot/date entry can be planned for a later iteration unless the implementation cost is low.

### Analysis Result

For each receipt, show:

- Detected store
- Detected purchase date
- Detected products
- Suspicious items
- Confidence level for each suspicious item

### Recall Detail

For any flagged item, show:

- Recall title
- Recall source
- Why it may match
- What the user should verify on the packaging
- Recommended action
- Confidence level
- Last updated date for recall data

### History

The user can see:

- Imported receipts
- Past flagged items
- Verification status

Supported statuses:

- To verify
- Verified safe
- Affected
- Ignored

## Out of Scope for MVP

- Push notifications
- Email inbox parsing
- Household or shared accounts
- Advanced shopping habit prediction
- Automatic location tracking
- Loyalty integrations
- Store APIs
- Reimbursement workflows
- Advanced analytics
- Family inventory or pantry management
- Long-term pantry tracking

## Main User Flow

1. User signs in.
2. User imports a receipt.
3. App extracts store, date, and products.
4. App compares products with active recalls.
5. App shows suspicious items.
6. User opens a suspicious item.
7. App explains what to verify.
8. User optionally scans or photographs the product to confirm.
9. User marks the item status.

## Key Product Principle

RecallRadar should be careful with certainty.

The app should never say an item is definitely recalled unless the available evidence supports that conclusion. When receipt data is incomplete, the interface should use language like "possible match" or "needs verification" and clearly explain what the user should check next.

## Trust and Safety Requirements

- Always show the recall source.
- Always show the reason an item was flagged.
- Clearly separate possible matches from strong matches.
- Avoid alarmist language.
- Never hide uncertainty.
- Provide practical next steps.
- Include a disclaimer that users should verify against official recall details and product packaging.

## Data Sources

The MVP should be France-first.

Primary source:

- RappelConso official open data/API for French consumer product recalls.

RappelConso should be treated as the canonical MVP recall source because it is the official French public platform for product recalls, covering food and non-food consumer products declared by professionals.

Useful RappelConso data fields include:

- Recall reference
- Product category and subcategory
- Brand or product name
- Model, reference, batch, lot, GTIN, or barcode when available
- Geographic sales area
- Distributor information when available
- Reason for recall
- Consumer risk
- Recommended consumer action
- Recall publication date
- Recall detail URL
- Product image URLs when available

Secondary and later sources:

- ANSM for medicines and medical devices, if the product scope expands beyond grocery and consumer goods.
- EU Safety Gate for broader European non-food product alerts.
- Retailer or manufacturer recall pages only when official data is incomplete and a clear source policy exists.

Scraping should not be the default ingestion strategy for MVP. Prefer official APIs, open datasets, RSS feeds, or structured exports. Use scraping only as a fallback for specific missing sources, and clearly track source reliability.

## Product Risks

### False Positives

Too many weak matches will make the app feel noisy and untrustworthy.

Mitigation:

- Use confidence levels.
- Explain the reason for each match.
- Suppress very weak matches from the main alert view.

### False Negatives

The app may miss recalls because receipt data is incomplete or recall data is delayed.

Mitigation:

- Avoid absolute safety claims.
- Show data freshness.
- Encourage manual verification for suspicious products.

### Receipt Quality

Blurry, cropped, or abbreviated receipts may produce poor extraction results.

Mitigation:

- Let users review extracted line items.
- Ask for a better image only when required.
- Use confidence indicators for extracted fields.

### User Anxiety

Safety products can easily create stress.

Mitigation:

- Use calm language.
- Prioritize clarity and action.
- Make statuses simple and reversible.

## V1 Decisions to Validate

- Is receipt upload the right primary input?
- Are users willing to review possible matches?
- What confidence threshold produces useful alerts?
- Does barcode scanning meaningfully improve trust?
- Do users want receipt history, or only immediate checks?
