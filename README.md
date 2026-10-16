# Bakery Order System

A mobile and web based custom cake ordering and bakery order management system.
BSE 3106 Mobile Networks and Computing capstone, Makerere University, AY 2026/2027 (Group 5).

Customers order cakes from a Flutter app. Bakery staff review orders, send quotations, record payments and update the order status from a web dashboard. Both talk to one REST API.

```
bakery-order-system/
├── mobile/              Flutter customer app (Android + iOS)
├── dashboard/           React + Vite + TypeScript staff web dashboard
├── backend/             Node.js + Express + TypeScript REST API, Prisma + PostgreSQL
├── docs/
│   └── api.md           API contract shared by mobile and dashboard
├── docker-compose.yml   Local PostgreSQL database
├── .devcontainer/       GitHub Codespaces / dev container setup
└── .github/             CI, pull request and issue templates
```

## Team

| Area | Lead |
|---|---|
| `mobile/` | Maguru Anthony |
| `backend/` | Nantambi Melissa |
| `dashboard/` and QA | Jovia Minallah Matata |

## Getting started

**First time on this computer?** Follow [docs/setup.md](docs/setup.md). It covers installing Git, Node.js, Docker, Flutter and Android Studio on Windows, macOS and Linux, plus fixes for common problems.

Quick start once everything is installed (on Windows, use `Copy-Item` instead of `cp`):

```bash
# 1. Database
docker compose up -d

# 2. Backend (http://localhost:4000/api)
cd backend
cp .env.example .env
npm install
npm run db:migrate      # creates the tables
npm run db:seed         # optional: two sample bakeries and a dev staff owner
npm run dev

# 3. Dashboard (http://localhost:5173), in a second terminal
cd dashboard
cp .env.example .env.local
npm install
npm run dev

# 4. Mobile app, in a third terminal
cd mobile
flutter pub get
flutter run
```

Firebase isn't needed to start; [docs/firebase.md](docs/firebase.md) explains how to set it up when you're ready. The backend's `AUTH_DEV_BYPASS=true` setting lets the dashboard and app call the API with a fake user header until Firebase is set up (see [docs/api.md](docs/api.md#authentication)).

## Working together

- `main` must always build and run. Don't push to it directly.
- Branch per task: `feature/mobile-order-form`, `fix/dashboard-status-filter`, `chore/ci`.
- Open a pull request and get **one teammate's approval** before merging. CI must pass.
- If you change an endpoint or a field, update [docs/api.md](docs/api.md) in the same pull request so the other leads see it.
- Never commit `.env` files or Firebase service-account keys.
