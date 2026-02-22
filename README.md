# wannabet.you MVP

Standalone Next.js 14+ App Router web app for peer-to-peer, oracle-only escrow betting templates.

## Stack
- Next.js 14 + TypeScript + Tailwind
- Prisma + SQLite (local mock database)

## Quick start
1. Install deps:
   ```bash
   npm install
   ```
2. Setup env:
   ```bash
   cp .env.example .env
   ```
3. Run migrations + generate client:
   ```bash
   npx prisma migrate dev
   ```
4. Seed sample bets:
   ```bash
   npm run prisma:seed
   ```
5. Start dev:
   ```bash
   npm run dev
   ```

## Scripts
- `npm run dev` – start local dev server
- `npm run build` – production build
- `npm run lint` – lint checks
- `npm run typecheck` – TS checks
- `npm run prisma:migrate` – run local migrations
- `npm run prisma:seed` – seed 10 sample bets

## Routes
- `/` landing with features + how-it-works
- `/bets` browse with status/template/min stake/time/handle filters
- `/bets/[id]` bet detail, take and resolve simulation actions
- `/create` create bet form with live preview
- `/og/bets/[id]` dynamic OG image

## Integration points
- **Wallet connect:** replace disabled nav button and feed connected wallet address into create/take actions.
- **Oracle integration:** replace `simulateOracleValue` in `lib/resolver.ts` with real oracle read.
- **On-chain escrow settlement:** replace API routes under `app/api/bets/*` with signed tx flows and chain confirmations.

## Notes
- X handles are display-only and always marked unverified.
- Sports templates are present and flagged coming soon.
- Domain can be configured with `NEXT_PUBLIC_SITE_URL`; defaults to localhost for local dev.
