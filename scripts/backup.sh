#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Sauvegarde complète : base de données + fichiers (photos, logos).
#   sh scripts/backup.sh            → backups/trophytracker-AAAAMMJJ-HHMMSS.tar.gz
# Restauration : voir docs/MAINTENANCE.md
# À planifier chaque nuit (cron) et à copier HORS du serveur.
# ─────────────────────────────────────────────────────────────────────────────
set -eu
cd "$(dirname "$0")/.."

stamp=$(date +%Y%m%d-%H%M%S)
work="backups/tmp-$stamp"
mkdir -p "$work"

echo "→ export de la base…"
# Format « custom » : compressé, restaurable table par table avec pg_restore.
docker compose exec -T db pg_dump -U postgres -d postgres -Fc --no-owner \
  --exclude-schema=_analytics --exclude-schema=_realtime > "$work/database.dump"

echo "→ copie des fichiers…"
tar -czf "$work/storage.tar.gz" -C infra/supabase/volumes storage

tar -czf "backups/trophytracker-$stamp.tar.gz" -C "$work" .
rm -rf "$work"

# Garde les 14 dernières sauvegardes locales.
ls -1t backups/trophytracker-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm --
echo "✅ backups/trophytracker-$stamp.tar.gz"
