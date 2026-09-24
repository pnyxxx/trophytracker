#!/bin/sh
# Régénère apps/web/src/lib/database.types.ts depuis la base locale (Supabase CLI).
set -eu
cd "$(dirname "$0")/.."
. ./.env
npx supabase gen types typescript \
  --db-url "postgresql://postgres.${POOLER_TENANT_ID}:${POSTGRES_PASSWORD}@127.0.0.1:${POOLER_HOST_PORT:-5432}/${POSTGRES_DB}" \
  --schema public > apps/web/src/lib/database.types.ts
echo "✅ Types régénérés"
