#!/bin/sh
set -eu

# Beamup only lets you set secrets after the first successful deploy.
# Boot without DATABASE_URL so the healthcheck can pass; apply schema later.
if [ -n "${DATABASE_URL:-}" ]; then
  echo "Applying Prisma schema..."
  npx prisma db push --skip-generate
else
  echo "WARNING: DATABASE_URL is not set yet — starting without DB."
  echo "After deploy succeeds, set secrets with: beamup secrets DATABASE_URL \"...\""
  echo "Then redeploy (beamup) so prisma db push can run."
fi

exec node dist/index.js
