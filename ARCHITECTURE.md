# СпівДія — Architecture

## Stack

- **Frontend/Backend**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL via Prisma 7 (`@prisma/adapter-pg`)
- **Auth**: bcryptjs + jose (JWT в HTTP-only cookie, role у payload)
- **AI**: Anthropic Claude (AI-онбординг)
- **Payments**: Binance Pay / WhiteBit (crypto), Monobank P2P, manual card

## Domain model (high level)

```
User ─┬── Resource (assets / deficits)        ─── для метчингу
      ├── Product                              ─── маркетплейс
      ├── ServiceAd (offer / request)          ─── послуги
      ├── DirectMessage (sender / receiver)   ─── приватні чати
      ├── Partnership (initiator / target)     ─── партнерства
      ├── Favorite (user / product / service)  ─── обране
      ├── WalletTransaction                    ─── журнал операцій
      ├── WithdrawalRequest                    ─── вивід коштів
      └── Notification                         ─── нотифікації
```

Кожен `User` має `role: member | provider | buyer | admin`, `balance`
(СпівМонети), `isActive`, маркетплейсні поля (`avatarUrl`, `bannerUrl`,
`websiteUrl`, `interests[]`, `aboutMe`, контакти).

## Folder layout

```
src/
├── app/
│   ├── (auth)/login, register
│   ├── (dashboard)/dashboard/{admin,favorites,import,matches,
│   │                          messages,partners,products,profile,
│   │                          services,wallet}
│   ├── marketplace/{partners,products,services}     # публічні сторінки
│   ├── u/[id]/                                       # публічний профіль
│   └── api/{admin,auth,favorites,import,matching,messages,
│            notifications,onboarding,partners,payments,products,
│            profile,services,users,wallet}
├── components/{admin,dashboard,import,market,messages,partners,
│              profile,ui,users,wallet}
├── lib/{ai,auth,db,import,matching,payments,session}
└── types/
```

## Auth flow

1. `register` — створює `User`, ставить роль `admin` для першого користувача
   (для зручності bootstrap), решта — `member`.
2. `createSession({userId,email,companyName,role})` пише JWT в cookie
   `spivdia_session`.
3. `getSession()` верифікує токен → повертає базові поля.
4. `requireAdmin()` додатково перевіряє свіжу `role` з БД, щоб зміни ролі
   деактивовували старі сесії.

## Money flow

- `Payment` (зовнішнє поповнення) → після підтвердження адміна збільшує
  `balance`, додає `WalletTransaction { type: deposit }`.
- `Wallet transfer` (P2P) — atomic `$transaction`: списав у відправника,
  додав отримувачу, дві `WalletTransaction` (`transfer_out` / `transfer_in`),
  нотифікація отримувачу.
- `Wallet purchase` — те саме, плюс автоматичне повідомлення в `DirectMessage`
  продавцю та `Notification` про продаж.
- `WithdrawalRequest` — створюється з статусом `pending`, адмін підтверджує
  через `/api/admin/withdrawals/[id]` (`paid` / `approved` списує баланс,
  `reject` залишає без змін, користувач отримує нотифікацію).

## Marketplace flows

1. **Розміщення товару/послуги** → `/dashboard/{products,services}` (CRUD у
   клієнтських формах через `/api/products` / `/api/services`).
2. **Імпорт із сайту** → `/dashboard/import` → POST `/api/import/preview`
   парсить HTML цільового сайту (JSON-LD `Product`, OpenGraph) → користувач
   обирає товари, редагує → POST `/api/import/commit` створює `Product`
   записи з `sourceUrl`.
3. **Перегляд** → `/marketplace/products` (фільтри + пошук) → `/marketplace/products/[id]`
   (деталі + контакт продавця, купівля за монети, в обране).
4. **Партнерство** → з картки користувача → `POST /api/partners` → отримувач
   приймає/відхиляє → `Notification` ініціатору.
5. **Чат** → `/dashboard/messages?user=ID` (deep link із кожної сторінки) →
   зберігає `DirectMessage`, нотифікує отримувача, опитує сервер раз на 15 с.

## Admin

- Гейт через `requireAdmin()` (роль у БД).
- `AdminShell` з вкладками: Платежі, Виведення, Користувачі (зміна ролі,
  блокування, верифікація, ± баланс), Модерація (зняти/відновити товари і
  послуги).
- Усі дії пишуть `Notification` користувачам.

## Key conventions

- API повертає `NextResponse.json({...})` з 4xx/5xx за необхідністю.
- Грошові цілі числа (СпівМонети) — `Int`, без копійок.
- `priceUAH` — теж `Int` (₴), для простоти.
- Усі публічні сторінки контактів не показують неавторизованим (mask)
  телефон/email/мессенджери.
- `acceptsPartners=true` за замовчуванням — користувач може вимкнути
  отримання запитів у партнери.
