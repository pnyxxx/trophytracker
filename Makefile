# ═════════════════════════════════════════════════════════════════════════════
#  Raccourcis TrophyTracker — tapez `make` pour la liste.
# ═════════════════════════════════════════════════════════════════════════════
.DEFAULT_GOAL := help
COMPOSE := docker compose

help: ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

setup: ## Première installation : dépendances + fichier .env avec secrets
	npm install
	@test -f .env || sh scripts/init-env.sh

up: ## Démarre toute la stack en local (avec Mailpit)
	HOST_LAN_IP=$$(ip route get 1.1.1.1 2>/dev/null | sed -n 's/.*src \([0-9.]*\).*/\1/p') \
	$(COMPOSE) --profile dev up -d --build

prod: ## Démarre la stack en production (sans Mailpit)
	$(COMPOSE) up -d --build

down: ## Arrête tout (les données sont conservées)
	$(COMPOSE) --profile dev down

logs: ## Suit les logs (ex. make logs s=tracker)
	$(COMPOSE) logs -f --tail=100 $(s)

ps: ## État des conteneurs
	$(COMPOSE) ps

dev: ## Site en mode développement (rechargement à chaud) sur http://localhost:5173
	npm run dev:web

migrate: ## Applique les nouvelles migrations SQL
	$(COMPOSE) run --rm migrate

types: ## Régénère les types TypeScript depuis la base
	npm run db:types

seed: ## Crée les données de démonstration
	node scripts/seed-demo.mjs

admin: ## Donne les droits admin (ex. make admin email=moi@exemple.fr)
	node scripts/create-admin.mjs $(email)

test: ## Tous les tests (unitaires, base de données, bout en bout)
	npm test
	sh scripts/test-db.sh
	node scripts/e2e/smoke.mjs

check: ## Vérifications rapides : types + lint + tests unitaires
	npm run typecheck
	npm run lint
	npm test

backup: ## Sauvegarde base + fichiers dans backups/
	sh scripts/backup.sh

psql: ## Console SQL sur la base
	$(COMPOSE) exec db psql -U postgres

.PHONY: help setup up prod down logs ps dev migrate types seed admin test check backup psql
