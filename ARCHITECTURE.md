# СпівДія — Architecture

## Stack
- **Frontend/Backend**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (via Prisma ORM — to be added)
- **AI**: Anthropic Claude (onboarding agent)
- **Payments**: Binance Pay / WhiteBit (crypto), Monobank P2P, manual card

## Folder Structure

```
src/
├── app/
│   ├── (auth)/           # Login, Register pages
│   ├── (dashboard)/      # Profile, Matches, Wallet, Deals
│   └── api/              # Route handlers
│       ├── auth/
│       ├── profile/
│       ├── matching/
│       └── payments/
├── components/
│   ├── ui/               # Base UI primitives (Button, Card, Input…)
│   ├── onboarding/       # AI interview chat UI
│   ├── matching/         # Match cards, chain visualizer
│   ├── dashboard/        # Profile, balance widgets
│   └── payments/         # Crypto invoice, P2P upload form
├── lib/
│   ├── matching/         # Matchmaking engine (direct + chain)
│   ├── payments/         # Binance Pay, WhiteBit, P2P helpers
│   └── ai/               # Claude onboarding agent
├── types/                # Shared TypeScript types
├── hooks/                # Custom React hooks
└── store/                # Global state (Zustand — to be added)
```

## Key User Flows

1. **Onboarding** → AI chat fills `assets[]` + `deficits[]`
2. **Matching** → Engine scores direct pairs + chain deals
3. **Deal** → PDF draft or in-app chat
4. **Payment** → Crypto auto-confirm or P2P screenshot → admin 1-click confirm

## Internal Currency
- Name: **СпівМонети**
- Rate: 1 USD = 100 СпівМонет (configurable via `TOKEN_RATE` env)
- Tracked in `payments` table per user
