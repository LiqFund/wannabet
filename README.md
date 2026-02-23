# wannabet.you MVP

Standalone Next.js 14+ App Router web app for peer-to-peer, oracle-only escrow betting templates.

## Stack
- Next.js 14 + TypeScript + Tailwind
- Static front-end catalog data (no backend database)

## Quick start
1. Install deps:
   ```bash
   npm install
   ```
2. Start dev:
   ```bash
   npm run dev
   ```

## Scripts
- `npm run dev` – start local dev server
- `npm run build` – production build
- `npm run lint` – lint checks
- `npm run typecheck` – TS checks

## Routes
- `/` landing with features + how-it-works
- `/bets` browse with status/template/min stake/time/handle filters
- `/bets/[id]` bet detail view
- `/create` create bet form with live preview (local draft only)
- `/og/bets/[id]` dynamic OG image

## Integration points
- **Wallet connect:** replace disabled nav button and feed connected wallet address into create/take actions.
- **Oracle integration:** replace static/deterministic demo data with real oracle reads.
- **Persistence:** replace `lib/betsCatalog.ts` with API/database-backed reads and writes.

## Notes
- X handles are display-only and always marked unverified.
- Sports templates are present and flagged coming soon.
- Domain can be configured with `NEXT_PUBLIC_SITE_URL`; defaults to localhost for local dev.
