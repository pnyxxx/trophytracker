#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Applique les migrations SQL de supabase/migrations/ qui ne l'ont pas encore été.
# Exécuté automatiquement par le conteneur `migrate` à chaque `docker compose up`.
#
# Le suivi utilise la même table que la CLI Supabase
# (supabase_migrations.schema_migrations) : les deux outils sont compatibles.
# Chaque fichier est appliqué dans une transaction : tout ou rien.
# ─────────────────────────────────────────────────────────────────────────────
set -eu
export PGOPTIONS="-c client_min_messages=warning"

psql -v ON_ERROR_STOP=1 -q <<'SQL'
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
SQL

applied=0
for file in $(ls /migrations/*.sql | sort); do
  base=$(basename "$file" .sql)
  version=${base%%_*}
  name=${base#*_}
  done_already=$(psql -tA -v v="$version" <<'SQL'
select count(*) from supabase_migrations.schema_migrations where version = :'v';
SQL
)
  if [ "$done_already" = "0" ]; then
    echo "→ migration $base"
    { echo "begin;"; cat "$file"; echo;
      echo "insert into supabase_migrations.schema_migrations (version, name) values ('$version', '$name');";
      echo "commit;"; } | psql -v ON_ERROR_STOP=1 -q
    applied=$((applied + 1))
  fi
done
echo "Migrations : $applied nouvelle(s) appliquée(s)."

# Le rôle limité du service tracker reçoit son mot de passe depuis le .env
# (jamais écrit dans un fichier versionné).
psql -v ON_ERROR_STOP=1 -q -v pw="$TRACKER_DB_PASSWORD" <<'SQL'
alter role tracker with login password :'pw';
SQL
echo "Rôle tracker configuré."
