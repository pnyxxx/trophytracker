# Construit depuis la racine du dépôt (contexte = .) pour utiliser le package-lock.json commun.

# ── Étape 1 : compilation du site (Vite) ────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/web --no-audit --no-fund
COPY apps/web apps/web
RUN npm run build -w apps/web

# ── Étape 2 : serveur Caddy avec les fichiers statiques ─────────────────────
FROM caddy:2-alpine
COPY apps/web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/web/dist /srv
RUN caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
EXPOSE 80 443
