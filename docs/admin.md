# Back-office

Page `/admin`, protégée par un mot de passe (variable `ADMIN_PASSWORD`), en quatre onglets :

| Onglet | Ce qu'on y fait |
|---|---|
| Statistiques (`/admin`) | Visites, visiteurs, clics vers Patreon, lectures de la vidéo, taux de clic, visites par jour, clics par bouton, sources, appareils, pays (7, 30 ou 90 jours) |
| Textes (`/admin/textes`) | Tous les textes de la page, avec une longueur max par champ pour ne pas casser la mise en page |
| Images (`/admin/images`) | Remplacer une image (clic ou glisser-déposer) ou revenir à l'originale |
| Liens & vidéo (`/admin/liens`) | Liens des boutons Patreon, vidéo YouTube, réseaux sociaux |

Tout est en ligne dès l'enregistrement, sans rebuild.

## Fonctionnement

- **La page reste pré-générée** (images d'origine optimisées au build). `src/worker.ts` la fait passer par le Worker (`assets.run_worker_first: ["/"]` dans `wrangler.jsonc`), qui y applique le contenu de l'admin avec `HTMLRewriter` (`src/lib/render.ts`) : éléments `data-text="<clé>"` (textes) et `data-slot="<clé>"` (images).
- **Contenu** : `src/lib/site.ts` (schéma et lecture/écriture), `src/lib/content.ts` (liste des textes et des images modifiables). Valeurs par défaut dans `src/data/site.json`, contenu enregistré dans l'espace KV `SITE`. Un champ absent du contenu enregistré reprend sa valeur par défaut.
- **Images** : le navigateur de l'admin les décline aux largeurs utiles et les convertit en WebP avant l'envoi (`src/pages/admin/images.astro`) ; `src/pages/admin/upload.ts` les range dans KV (`src/lib/media.ts`, clés `media/…`), servies par `/media/…` avec un cache d'un an (clé unique par envoi) et une copie dans le cache de Cloudflare. KV plutôt que R2 : la création automatique d'un bucket R2 échoue dans Workers Builds.
- **Texte de la feuille** : dessiné dans l'image sur ordinateur. Tant qu'il n'est pas modifié, la feuille d'origine reste affichée. Modifié, la page affiche la feuille vierge (`src/assets/paper-blank-extended.png`, générée par `scripts/extend-paper.mjs`) avec le texte en HTML, rétréci s'il est trop long.
- **Liens** : la page pointe vers `/go/<clé>` (redirection vers le lien enregistré) et la vidéo vers `/video/embed.json` ; la miniature est posée par le Worker.
- **Statistiques** (`src/lib/stats.ts`, base D1 `STATS`) : une ligne par visite de la page (enregistrée par le Worker), clic (`/go/…`) ou lecture de la vidéo. Mesure d'audience dans le cadre de l'exemption de consentement de la CNIL : cookie `kv_vid` (identifiant aléatoire, posé par le Worker à la première visite pour 13 mois, jamais prolongé) qui reconnaît un visiteur d'un jour à l'autre ; sans lui, empreinte anonyme (IP + navigateur + jour + sel secret) qui change chaque jour. Aucune IP stockée, données gardées 13 mois, robots et préchargements ignorés. Opposition sur `/statistiques` (cookie `kv_optout`, lien en bas de page) ; le réglage Global Privacy Control vaut opposition. La table (et ses colonnes ajoutées depuis) est créée au premier usage.
- **Connexion** : `src/lib/auth.ts`, cookie de session de 30 jours limité à `/admin`. Changer le mot de passe déconnecte tout le monde.

## En local

Le mot de passe est dans `.env` (`ADMIN_PASSWORD`). `npm run dev`, puis http://localhost:4321/admin.
Le serveur de dev tourne dans le moteur de Cloudflare (workerd) : KV et D1 sont simulés dans `.wrangler/state`.
Les visites faites avec curl ou un navigateur headless sont ignorées par les statistiques (considérées comme des robots).

## Mise en ligne (Cloudflare Workers)

Le repo GitHub est relié au Worker `keyato-industries` (Workers Builds) : chaque push sur `main` redéploie.

- Commande de build : `npm run build` ; commande de déploiement : `npx wrangler deploy`.
- L'espace KV `SITE` et la base D1 `STATS` ont été créés automatiquement aux premiers déploiements ; la base D1 est épinglée par son identifiant dans `wrangler.jsonc`.
- `ADMIN_PASSWORD` : *Settings → Variables and Secrets* du Worker, de préférence en type *Secret*. `keep_vars` évite qu'un déploiement l'efface.
- Après un changement de `wrangler.jsonc`, relancer `npm run cf-typegen`.
- Une modification faite dans l'admin peut mettre jusqu'à une minute à apparaître partout dans le monde (propagation de KV).
- Quotas de l'offre gratuite : chaque visite de la page et chaque image remplacée passent par le Worker (100 000 requêtes par jour), chaque visite écrit une ligne de statistiques (100 000 par jour). Au-delà, l'offre Workers Paid (5 $/mois) lève ces limites.

## Pour Keyato

1. Aller sur `<adresse du site>/admin` et entrer le mot de passe.
2. **Statistiques** : choisir la période en haut ; survoler une colonne pour le détail du jour.
3. **Textes** : modifier, puis « Enregistrer ». « Remettre le texte d'origine » sous chaque champ annule une modification.
4. **Images** : « Remplacer » (ou glisser l'image sur sa carte) ; c'est en ligne dès que « C'est en ligne ! » s'affiche. Pour les personnages et les boîtes, utiliser un PNG à fond transparent, aux proportions de l'original.
5. **Liens & vidéo** : coller les liens, puis « Enregistrer ».
