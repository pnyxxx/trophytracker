# Identité visuelle TrophyTracker

Logo validé le 27 septembre 2026 : **« La trace dessine la 4L »**. La trace part du sol, dessine le profil de la 4L
d'un seul trait et s'arrête sur le point rouge « en direct », à l'avant de la voiture.

## Fichiers de référence

| Fichier | Contenu |
|---|---|
| `Logo TrophyTracker.dc.html` | Maquette d'origine (Claude Design) : toutes les déclinaisons. Ouvrir dans un navigateur (utilise `support.js`, à garder à côté). |
| `logo/symbole-sombre.svg` | Symbole seul, pour fond sombre (trace dorée) |
| `logo/symbole-clair.svg` | Symbole seul, pour fond clair (trace ocre) |
| `logo/favicon.svg` | Icône carrée à coins arrondis (onglet du navigateur) |
| `logo/avatar-instagram.svg` | Avatar rond pour les réseaux sociaux |

Les SVG d'origine contiennent un manifeste C2PA (provenance). Les copies utilisées par le site en sont nettoyées.

## Règles

- **Nom** : « TROPHY » en crème (`#F4ECDF`, ou `#1A1612` sur fond clair) + « TRACKER » **toujours en rouge**
  (`#DB4740`), police Big Shoulders Display 900, en capitales. (La maquette mettait « Tracker » en doré sur fond
  sombre ; le rouge a été préféré.)
- **Symbole** : trace dorée `#F2B45A` sur fond sombre, ocre `#D98A3D` sur fond clair ; point en direct rouge `#DB4740`.
- **Signature** : « Par un trophyste, pour les trophystes » (JetBrains Mono, capitales espacées, ocre).
- Fond sombre de référence : `#120F0C`.

## Où le logo est utilisé

- Composants `LogoMark` (symbole, variantes `dark` / `light`) et `Wordmark` (nom) :
  `apps/web/src/components/common/Logo.tsx` → en-tête, pied de page, pages de connexion.
- `apps/web/public/favicon.svg` (onglet), `apple-touch-icon.png` (écran d'accueil iPhone),
  `og-image.png` (aperçu des liens partagés), `email-logo.png` (en-tête des emails, `src/lib/email-templates.ts`).
- Les PNG sont générés depuis `logo/symbole-sombre.svg` avec les polices du site (captures Playwright) :
  à régénérer si le logo change.
