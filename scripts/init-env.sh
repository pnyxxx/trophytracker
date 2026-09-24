#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Crée le fichier .env à partir de .env.example en générant des secrets
# aléatoires (mots de passe, clés de chiffrement, clés API JWT Supabase).
#
#   sh scripts/init-env.sh           # refuse d'écraser un .env existant
#   sh scripts/init-env.sh --force   # régénère tout (⚠️ invalide la base existante)
#
# Seul prérequis : openssl.
# ─────────────────────────────────────────────────────────────────────────────
set -eu
cd "$(dirname "$0")/.."

if [ -f .env ] && [ "${1:-}" != "--force" ]; then
  echo "Un fichier .env existe déjà. Utilisez --force pour le régénérer (les données existantes deviendront inaccessibles)."
  exit 1
fi
command -v openssl >/dev/null || { echo "openssl est requis."; exit 1; }

hex() { openssl rand -hex "$1"; }
b64() { openssl rand -base64 "$1" | tr -d '\n'; }
# Mot de passe sans caractères spéciaux (évite tout souci d'échappement dans les URLs Postgres)
pw() { openssl rand -hex 24; }
b64url() { openssl enc -base64 -A | tr '+/' '-_' | tr -d '='; }

JWT_SECRET=$(hex 32)
jwt() {
  header=$(printf '%s' '{"alg":"HS256","typ":"JWT"}' | b64url)
  iat=$(date +%s); exp=$((iat + 5 * 365 * 24 * 3600))
  payload=$(printf '{"role":"%s","iss":"supabase","iat":%s,"exp":%s}' "$1" "$iat" "$exp" | b64url)
  sig=$(printf '%s.%s' "$header" "$payload" | openssl dgst -binary -sha256 -hmac "$JWT_SECRET" | b64url)
  printf '%s.%s.%s' "$header" "$payload" "$sig"
}

set_var() {
  # Remplace la ligne KEY=... (sed avec un séparateur absent des valeurs générées)
  sed -i.bak "s|^$1=.*|$1=$2|" .env && rm -f .env.bak
}

cp .env.example .env
set_var POSTGRES_PASSWORD "$(pw)"
set_var JWT_SECRET "$JWT_SECRET"
set_var ANON_KEY "$(jwt anon)"
set_var SERVICE_ROLE_KEY "$(jwt service_role)"
set_var SECRET_KEY_BASE "$(b64 48 | tr '/+' '_-')"
set_var REALTIME_DB_ENC_KEY "$(hex 8)"
set_var VAULT_ENC_KEY "$(hex 16)"
set_var PG_META_CRYPTO_KEY "$(hex 24)"
set_var S3_PROTOCOL_ACCESS_KEY_ID "$(hex 16)"
set_var S3_PROTOCOL_ACCESS_KEY_SECRET "$(hex 32)"
set_var TRACKER_DB_PASSWORD "$(pw)"
set_var DASHBOARD_PASSWORD "$(pw)"
chmod 600 .env

echo "✅ .env créé avec des secrets aléatoires."
echo "   Identifiants Supabase Studio : admin / $(grep '^DASHBOARD_PASSWORD=' .env | cut -d= -f2)"
echo "   Pensez à adapter la section « URLs » avant la mise en production."
