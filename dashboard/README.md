# Dashboard

Staff web dashboard for a bakery: handle orders from the app, send quotes, record payments, and set up what the bakery offers.

React 19 + Vite + TypeScript, React Router. No UI library: the look comes from `src/index.css`, which follows the team's designs (https://claude.ai/artifact/8CSPeqAqPBZBjeSxiFr7bF).

```bash
cp .env.example .env.local
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests for the shared logic in src/lib
npm run build      # type-check and production build
npm run lint
```

The backend must be running (see `../backend`) and seeded (`npm run db:seed`).

**Signing in.** Without Firebase settings, the dashboard uses the test login: with `VITE_DEV_USER=dev-staff` and `AUTH_DEV_BYPASS=true` on the backend, you are the owner of the seeded Sweet Crumbs Bakery. Once the `VITE_FIREBASE_*` values are in `.env.local` (see [docs/firebase.md](../docs/firebase.md)), a real sign in page appears: email and password, Google, and password reset. New staff create an account, then the owner adds them under Settings.

## Pages

| Route | What staff do there |
|---|---|
| `/orders` | All orders, soonest due first, with status tabs, search, and a warning for orders due soon that nobody has touched |
| `/orders/:id` | What the customer asked for, messages, the quote (with the builder estimate and their budget), payments, the next step, cancelling |
| `/schedule` | Two weeks of custom cake slots, each day's orders, blocking days, and the daily limits |
| `/products` | Products shown in the app, hide or show them, add and edit, with photos |
| `/builder` | Cake builder options and prices, and which stock each uses |
| `/stock` | Private stock counts; options linked to empty stock hide themselves |
| `/settings` | Profile, delivery areas and fee, payment methods, staff |

## Layout

```
src/
├── api/          One file per area; every HTTP call goes through api/client.ts
├── components/   Shared UI: Layout (sidebar), ConfirmDialog, ToastProvider, StatusBadge, Icon
├── context/      The signed in staff member and their bakery (useBakery), toasts (useToast)
├── hooks/        useAsync
├── lib/          Formatting (money, dates in the bakery's timezone) and order-flow.ts, which
│                 mirrors the backend's order rules (labels, steps, the next button)
├── pages/        One component per route
├── types/api.ts  Response types, mirrors docs/api.md
├── index.css     Design tokens and component styles
└── App.tsx       Routes
```

## UI rules

- Flat colours from the tokens in `index.css`. No gradients, no boxes inside boxes.
- Anything hard to undo (cancelling, recording or removing a payment, removing staff, deleting stock, blocking a day) asks first with `ConfirmDialog`, safe choice focused.
- Quick switches (hiding a product or an option) happen straight away and offer **Undo** in the toast instead.
- Show the API's error message as it is; it is written for people.
- Labels on every field, 44px click targets, and keyboard focus that is always visible.

## Next steps

- Web push (FCM) for new orders: needs the VAPID key from docs/firebase.md and a service worker
