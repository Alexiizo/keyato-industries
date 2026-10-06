## Projet

Page de vente one-page pour Keyato (youtubeur/animateur) : pack de vidéos « Améliorer ses Visu ».
Objectif : reproduire la maquette pixel perfect, avec beaucoup de parallaxe.

- Stack : Astro sur Cloudflare Workers (`@astrojs/cloudflare`, config `wrangler.jsonc` : page statique + quelques routes rendues par le Worker) + GSAP/ScrollTrigger + Lenis (smooth scroll). CSS scopé dans les composants, pas de framework CSS.
- Maquette de référence : `design/maquette-1920.png`. Relevés (positions, couleurs, tailles) : `docs/maquette.md`.
- Dimensions : écrire les valeurs en px maquette via `calc(<px> * var(--u))` (voir `src/styles/global.css`). `.page` est le seul `container-type` de la page : ne pas en ajouter d'autre, sinon `--u` change de référence.
- Échelle : la composition reste pleine largeur comme la maquette (`--u` suit la largeur de la page), mais la maquette en 1:1 est trop grosse à l'écran : les éléments surdimensionnés sont réduits (titres 70 %, boutons du hero et cartes 55 %, Patreon 50 %, papier 75 %, perso et panneaux 80 %, vidéo 900px) et les espacements verticaux resserrés, pour que les boutons du hero restent visibles sur un écran 1080p. Récap dans `docs/maquette.md`. Les groupes réduits gardent les cotes de la maquette multipliées par une unité locale `--cu`.
- Mobile (`@media (max-width: 899px)`, dans chaque composant) : composition empilée en flux normal, dimensions en `calc(<px> * var(--m))` où `--m` vaut 1px sur un écran de 390px (colonne plafonnée à 560px). Le texte de la feuille y est affiché en vrai texte (`.paper-text`, police Sniglet) ; sur ordinateur, ce même bloc est réservé aux lecteurs d'écran.
- Papier : `src/assets/paper-extended.png` est généré depuis `design/Paper.png` par `node scripts/extend-paper.mjs` (bras prolongés jusqu'aux bords). À relancer si Paper.png change, ou si on réduit encore le papier (augmenter `EXTEND`).
- Assets : importés directement depuis `design/` (optimisés par `<Image>` d'astro:assets). Leur échelle et leur position dans la maquette sont dans `docs/maquette.md`.
- Textes : `.cap-trim` rogne la boîte du texte du haut des capitales à la ligne de base, pour placer un texte avec les coordonnées de la maquette. Si la police change, mettre à jour ses métriques `--fd-*` dans `global.css`.
- Contenu modifiable par Keyato (liens des boutons, vidéo YouTube, liens des réseaux) : back-office maison `/admin` (mot de passe `ADMIN_PASSWORD`), voir `docs/admin.md`. La page reste statique : ses liens pointent vers `/go/<clé>` et la vidéo vers `/video/thumbnail` et `/video/embed.json`, routes serveur qui lisent le contenu (`src/lib/site.ts`, défauts dans `src/data/site.json`, enregistré dans l'espace Cloudflare KV `SITE`). Le code serveur tourne dans workerd, y compris en dev : pas de système de fichiers, `node:*` limité à `nodejs_compat`. Un nouveau champ : schéma dans `site.ts`, défaut dans `site.json`, champ dans la page admin. La vidéo : miniature + bouton lecture, remplacés au clic par l'iframe youtube-nocookie (pas de lecture automatique) ; le cadre noir est un calque `::after` posé dessus. Icônes des réseaux : paquet `simple-icons`, rendues au build.
- Animations (`src/scripts/motion.ts`, pilotées par attributs) : `data-parallax="<vitesse>"` (et `data-parallax-mobile` pour une autre vitesse sur mobile, "0" pour la couper), `data-cover="<fraction>"` (recouvrement du hero, retardé par `data-cover-delay`), `data-intro` (au chargement), `data-reveal` / `data-reveal-group` (apparition au scroll), `data-exit` (sortie au scroll). Chaque effet anime ses propres propriétés pour pouvoir se cumuler (voir l'en-tête de motion.ts). Hovers en CSS pur ; sur un élément animé par GSAP, utiliser les propriétés `scale` / `translate` et jamais `transform`.
- Icônes d'onglet (site : pastille rose, admin : violette) : générées dans `src/assets/icons/` (importées en `?url` pour être versionnées) et `public/` par `node scripts/make-favicons.mjs` à partir de `design/KeyaMoney.png`.
- En dev, touche `M` : calque de la maquette par-dessus la page (`D` mode différence, `↑/↓` opacité).

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

Toute bibliothèque importée côté navigateur (dans `src/scripts/` ou un `<script>` de composant) doit être ajoutée à `vite.optimizeDeps.include` dans `astro.config.mjs` : sinon Vite la découvre au premier chargement, reconstruit son cache et la page échoue à l'importer (504 Outdated Optimize Dep), ce qui coupe les animations en dev. En cas de doute : `npx astro dev --force`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
