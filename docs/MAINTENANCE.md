# Maintenance

## Sauvegardes

```bash
sh scripts/backup.sh       # ou : make backup
```

Crée `backups/trophytracker-AAAAMMJJ-HHMMSS.tar.gz` contenant :
- `database.dump` : toute la base (comptes, équipages, traces…) au format `pg_dump -Fc` ;
- `storage.tar.gz` : les fichiers (photos, logos).

Les 14 dernières sont conservées localement. **Une sauvegarde qui reste sur le serveur ne protège de rien** :
copiez-la ailleurs, par exemple chaque nuit avec `rclone` vers un stockage objet, ou `scp` vers une autre machine.

## Restauration

```bash
mkdir /tmp/restore && tar -xzf backups/trophytracker-XXXX.tar.gz -C /tmp/restore

docker compose stop web tracker functions storage
# Base : restaure par-dessus l'existant
docker compose exec -T db pg_restore -U postgres -d postgres --clean --if-exists --no-owner < /tmp/restore/database.dump
# Fichiers
tar -xzf /tmp/restore/storage.tar.gz -C infra/supabase/volumes
docker compose up -d
```

Testez une restauration au moins une fois, sur une machine de test, **avant** le raid.

## Mettre à jour

### Le projet
```bash
git pull && docker compose up -d --build
```
Les nouvelles migrations SQL s'appliquent automatiquement (conteneur `migrate`).

### Les dépendances npm
```bash
npm outdated            # ce qui peut être mis à jour
npm update && make check && make test
npm audit               # doit afficher 0 vulnérabilité
```

### Supabase
1. Lisez le [CHANGELOG](../infra/supabase/CHANGELOG.md) officiel et faites une sauvegarde.
2. Remplacez `infra/supabase/` par le dossier `docker/` de la nouvelle version
   (https://github.com/supabase/supabase), en retirant `tests/` et `dev/`, et mettez à jour le commit dans `UPSTREAM.md`.
3. Vérifiez que `infra/supabase.override.yml` s'applique toujours : `docker compose config --quiet`.
4. `docker compose pull && docker compose up -d`, puis `make test`.

## Surveillance

```bash
docker compose ps                  # tous les services doivent être « healthy »
docker compose logs -f tracker     # positions reçues, erreurs Traccar
docker compose logs -f auth        # envois d'emails, connexions
```

Pendant le raid, l'onglet *Administration → Vue d'ensemble* affiche le nombre d'équipages en direct.

## Espace disque

Les positions pèsent environ 150 octets chacune. Même 1 000 équipages × 2 000 points = ~300 Mo.
Les photos sont compressées (≈ 300 Ko chacune, 300 max par équipage).
