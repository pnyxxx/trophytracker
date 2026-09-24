# Construit depuis la racine du dépôt (contexte = .) pour utiliser le
# package-lock.json commun : versions des dépendances strictement identiques.

# ── Étape 1 : compilation TypeScript ─────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/tracker/package.json apps/tracker/
RUN npm ci -w apps/tracker --no-audit --no-fund
COPY apps/tracker apps/tracker
RUN npm run build -w apps/tracker \
 && npm prune --omit=dev -w apps/tracker --no-audit --no-fund

# ── Étape 2 : image finale minimale ──────────────────────────────────────────
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/tracker/dist ./dist
COPY apps/tracker/package.json ./
# Ne jamais tourner en root dans un conteneur.
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
