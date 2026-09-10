#!/bin/sh
set -eu

# Apply schema when DATABASE_URL is present (Neon / Postgres).
# Boot without it so platform healthchecks can still pass on first deploy.
if [ -n "${DATABASE_URL:-}" ]; then
  echo "Applying Prisma schema..."
  npx prisma db push --skip-generate
else
  echo "WARNING: DATABASE_URL is not set yet — starting without DB."
fi

exec node dist/index.js
