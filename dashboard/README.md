# Dashboard

Staff web dashboard: review incoming orders, send quotations, record payments and move orders through their stages.

React 19 + Vite + TypeScript, React Router.

```bash
cp .env.example .env.local
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check and production build
npm run lint
```

The backend must be running (see `../backend`). With `VITE_DEV_USER` set and `AUTH_DEV_BYPASS=true` on the backend, the dashboard acts as a staff user without Firebase sign-in.

## Layout

```
src/
├── api/          One file per resource; every HTTP call goes through api/client.ts
├── components/   Reusable UI pieces (Layout, StatusBadge)
├── hooks/        useAsync and other shared hooks
├── lib/          Formatting helpers (UGX, dates)
├── pages/        One component per route
├── types/api.ts  Response types, mirrors docs/api.md
├── App.tsx       Routes
└── main.tsx
```

## Next steps

- Firebase sign-in for staff, then send the ID token from `api/client.ts`
- Quotation and payment forms on the order detail page
- Web push (FCM) for new orders
