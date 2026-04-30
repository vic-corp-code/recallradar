# RecallRadar

RecallRadar is a PWA for checking whether recent grocery purchases may be affected by active product recalls.

The core flow is:

Receipt in -> product extraction -> recall matching -> user verification.

The product does not promise exact recall confirmation from receipt data alone. It highlights possible risks, explains why an item may match a recall, and guides the user toward manual verification when packaging details are needed.

## Product Docs

- [Product Requirements Document](docs/PRD.md)
- [V1 Scope](docs/V1_SCOPE.md)
- [Design Brief](docs/DESIGN_BRIEF.md)

## Current Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4

## Getting Started

Install dependencies:

```bash
bun install
```

Run the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Notes

This repository was bootstrapped with `create-next-app`.

The app currently uses the `src/app` directory:

- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`

Before changing Next.js application code, check `AGENTS.md`. This project uses a Next.js version with potential breaking changes, so local framework docs may need to be consulted before implementation.

## MVP Direction

The first product milestone should prove the main loop:

1. User imports a receipt.
2. The app extracts store, date, and line items.
3. Items are compared with active recalls.
4. Suspicious items are shown with confidence levels.
5. The user receives clear verification guidance.
6. The user can save a simple status for each flagged item.

Barcode scanning and product photo verification are useful secondary actions, but the receipt import loop should remain the primary MVP path.
