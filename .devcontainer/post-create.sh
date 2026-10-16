#!/usr/bin/env bash
# Runs once when the dev container is created: installs dependencies and prepares the database.
set -euo pipefail

cd "$(dirname "$0")/.."

# Env files: copy the examples, but never overwrite files someone has already edited.
[ -f backend/.env ] || cp backend/.env.example backend/.env
if [ ! -f dashboard/.env.local ]; then
  cp dashboard/.env.example dashboard/.env.local
  # Send API calls through the Vite dev server (see dashboard/vite.config.ts), because a
  # browser opened on a Codespaces URL can't reach the container's localhost:4000.
  sed -i 's|^VITE_API_URL=.*|VITE_API_URL=/api|' dashboard/.env.local
fi

echo "Installing backend dependencies..."
(cd backend && npm ci)

echo "Installing dashboard dependencies..."
(cd dashboard && npm ci)

echo "Installing Flutter packages..."
(cd mobile && flutter pub get)

echo "Waiting for the database..."
until pg_isready -h localhost -p 5432 -U bakery -q; do sleep 1; done

echo "Creating tables and sample data..."
(cd backend && npx prisma migrate deploy && npm run db:seed)

cat <<'EOF'

Ready. In two terminals:
  cd backend && npm run dev      # API on port 4000
  cd dashboard && npm run dev    # Dashboard on port 5173
EOF
