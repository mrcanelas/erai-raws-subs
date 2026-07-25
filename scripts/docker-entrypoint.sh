#!/bin/sh
set -eu

echo "Applying Prisma schema (provider=${DATABASE_URL%%:*})"
npx prisma db push --skip-generate

exec node dist/index.js
