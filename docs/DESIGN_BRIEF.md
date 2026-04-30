# Design Brief

## Product Personality

The app should feel calm, precise, and trustworthy. It is dealing with safety-sensitive information, so the experience should avoid panic, exaggeration, or playful visual treatment.

The right feeling is:

- Clean
- Reassuring
- Practical
- Transparent
- Quick to scan

## Design Direction

RecallRadar should feel like a modern consumer utility, closer to a banking or health-support app than a shopping app.

The design is mobile-first. Android and iOS PWA users are the primary audience. Laptop and desktop users should be supported, but desktop should not drive the main interaction model.

The UI should focus on:

- Fast receipt import
- Clear analysis status
- Plain-language uncertainty
- Strong source attribution
- Simple next actions

## Platform Design

### Mobile-First PWA

RecallRadar should behave like an installable mobile utility rather than a desktop website squeezed onto a phone.

Primary design target:

- Mobile viewport
- One-handed use where possible
- Touch-first controls
- Camera/file import flows
- Installed PWA usage from the home screen

Supported secondary target:

- Laptop and desktop browser use

PWA expectations:

- Installable on Android and iOS.
- App icon and splash/home screen metadata should feel product-ready.
- Layout should respect mobile safe areas.
- Primary actions should remain reachable near the bottom of mobile screens when appropriate.
- Inputs, upload controls, filters, and status selectors should use touch-friendly sizing.
- Camera, barcode, and file upload flows should avoid tiny controls or dense desktop patterns.
- Desktop layouts can use wider spacing and side-by-side content, but should preserve the same flow and language as mobile.

## Information Architecture

### Primary Navigation

- Check
- History
- Stores
- Profile

### Check

Main working area for importing and analyzing receipts.

Key states:

- Empty state with import action
- Uploading
- Extracting receipt
- Matching recalls
- Result: no suspicious items
- Result: suspicious items found
- Extraction needs review

### History

List of previous receipts and flagged items.

Useful filters:

- All
- To verify
- Affected
- Verified safe
- Ignored

### Stores

Lightweight store management.

For MVP this can remain simple:

- Preferred stores
- Occasional stores
- Unsaved stores

### Profile

Account settings, auth management, data/privacy information, and sign out.

## Core Screens

### 1. Sign In

Purpose:

Let the user enter quickly with trusted auth methods.

Elements:

- Product name
- Short promise
- Google sign-in
- Microsoft sign-in
- Email sign-up/sign-in
- Privacy reassurance

### 2. Check Receipt

Purpose:

Make importing a receipt feel obvious and low effort.

Elements:

- Primary upload/scan area
- Supported format hint
- Recent checks shortcut
- Optional "scan product instead" secondary action

### 3. Processing

Purpose:

Show progress without overpromising.

Steps:

- Reading receipt
- Finding products
- Checking active recalls
- Preparing result

### 4. Extraction Review

Purpose:

Let the user correct bad receipt extraction when needed.

Elements:

- Store field
- Purchase date field
- Editable line items
- Continue button
- Skip/cancel option

This screen should appear only when confidence is low or when the user asks to review.

### 5. Receipt Result

Purpose:

Summarize whether the receipt needs attention.

Elements:

- Store and purchase date
- Overall result state
- Suspicious items section
- Other detected items section
- Confidence labels
- Next action buttons

Result states:

- No relevant active recall found
- Possible match found
- Verification recommended
- Strong match found

### 6. Recall Detail

Purpose:

Explain the match and guide the user.

Elements:

- Product/receipt item name
- Confidence level
- Recall title
- Source
- Why this may match
- What to check on packaging
- Recommended action
- Buttons: scan barcode, upload product photo, mark status

### 7. Product Verification

Purpose:

Help the user improve confidence by checking the physical product.

Elements:

- Barcode scanner
- Product photo upload
- Packaging checklist
- Manual notes
- Status selection

### 8. History

Purpose:

Let users return to past checks and unresolved items.

Elements:

- Receipt list
- Flagged items list
- Status filters
- Search by store or product

## Visual System

### Theme Modes

RecallRadar should support both light mode and dark mode from the first production UI pass.

Theme behavior:

- Respect the user's system preference by default.
- Provide a manual theme toggle in profile or app settings.
- Preserve the same information hierarchy in both modes.
- Do not use dark mode as a purely black interface; use layered dark neutrals for comfort and readability.
- Keep recall severity colors semantic and consistent across both themes.

Theme options:

- Light
- Dark
- System

Implementation guidance:

- Use design tokens or CSS variables for background, surface, border, text, muted text, primary, caution, risk, and success.
- Avoid hard-coded colors inside components once the design system is established.
- Test contrast for badges, buttons, links, and status labels in both themes.
- Make uploaded receipts and product images easy to inspect against both light and dark backgrounds.
- Ensure caution and risk states remain clear without flooding the whole interface with amber or red.

### Color

Use a restrained, high-trust palette.

Recommended direction:

- Light background: off-white or very light gray
- Dark background: near-black or deep neutral gray
- Surface color: slightly raised neutral panels for content areas
- Primary: deep teal or blue
- Caution: amber
- Risk: red used sparingly
- Safe/complete: green used sparingly

Avoid making the entire interface red or alarm-heavy.

### Typography

- Use a clear sans-serif.
- Prioritize readable body text over oversized marketing typography.
- Use compact headings for dashboard and utility screens.

### Components

- Confidence badge
- Receipt upload panel
- Item match row
- Recall source block
- Verification checklist
- Status selector
- Data freshness indicator
- Extraction confidence indicator

## UX Writing Rules

Use:

- "Possible match"
- "Needs verification"
- "No relevant active recall found"
- "Check the package for..."
- "This may match because..."

Avoid:

- "Safe"
- "Dangerous"
- "Definitely recalled"
- "Guaranteed"
- "All clear"

Only use stronger language when the evidence supports it.

## Suggested App Tone

Examples:

- "We found one item that may need verification."
- "The receipt description is close to an active recall, but the package details are needed to confirm."
- "Check the lot code and best-by date on the package."
- "No relevant active recall was found for the detected items."

## First Prototype Recommendation

The first clickable prototype should focus on four screens:

1. Check receipt
2. Processing state
3. Receipt result
4. Recall detail

This is enough to test whether the core promise makes sense before investing in account settings, store management, or deeper history.
