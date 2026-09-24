#!/bin/sh
# Lance les tests pgTAP de supabase/tests/ dans le conteneur Postgres.
# Prérequis : la stack tourne (docker compose up -d).
set -eu
cd "$(dirname "$0")/.."

status=0
for file in supabase/tests/*.test.sql; do
  echo "▶ $file"
  output=$(docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -X -q -t < "$file" 2>&1) || status=1
  echo "$output" | sed '/^\s*$/d'
  if echo "$output" | grep -qE '^\s*not ok|Looks like|ERROR'; then status=1; fi
done

if [ "$status" -eq 0 ]; then echo "✅ Tous les tests de la base passent."; else echo "❌ Des tests échouent."; fi
exit $status
