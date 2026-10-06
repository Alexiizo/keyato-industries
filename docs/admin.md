# Back-office

Page `/admin`, protégée par un mot de passe, pour modifier sans toucher au code :

- les liens des boutons « Pack Basique », « Pack Plus + » et « Voir le Patreon » (aussi l'icône Patreon du bas de page) ;
- la vidéo de présentation (lien YouTube) ;
- les liens YouTube, Twitch, Instagram et Discord du bas de page.

Les changements sont en ligne dès l'enregistrement, sans rebuild.

## Fonctionnement

- La page est statique (servie par Cloudflare comme fichiers). Les boutons pointent vers `/go/<clé>` et la vidéo vers `/video/thumbnail` et `/video/embed.json` : ces routes, servies par le Worker, lisent le contenu enregistré.
- Contenu : `src/lib/site.ts`. Valeurs par défaut dans `src/data/site.json` ; les modifications sont enregistrées dans l'espace Cloudflare KV `SITE` (déclaré dans `wrangler.jsonc`).
- Chaque saisie est vérifiée (liens en `https://`, lien YouTube reconnu) ; en cas d'erreur, rien n'est enregistré.
- Connexion : cookie de session valable 30 jours. Changer le mot de passe déconnecte tout le monde.

## En local

Le mot de passe est dans `.env` (`ADMIN_PASSWORD`). `npm run dev`, puis http://localhost:4321/admin.
Le serveur de dev tourne dans le moteur de Cloudflare (workerd) ; le KV est simulé dans `.wrangler/state`.

## Mise en ligne (Cloudflare Workers)

Le repo GitHub est relié au Worker `keyato-industries` (Workers Builds) : chaque push sur `main` redéploie.

- Commande de build : `npm run build` ; commande de déploiement : `npx wrangler deploy`.
- L'espace KV `SITE` est créé automatiquement au premier déploiement (pas d'`id` dans `wrangler.jsonc`). Si la création échoue : *Storage & databases → KV → Create*, puis ajouter son `id` dans `wrangler.jsonc`.
- `ADMIN_PASSWORD` : à définir dans le Worker, *Settings → Variables and Secrets*, de préférence en type *Secret*. `keep_vars` dans `wrangler.jsonc` évite qu'un déploiement l'efface.
- Après un changement de `wrangler.jsonc`, relancer `npm run cf-typegen`.
- Une modification faite dans l'admin peut mettre jusqu'à une minute à apparaître partout dans le monde (propagation de KV).

## Pour Keyato

1. Aller sur `<adresse du site>/admin` et entrer le mot de passe.
2. Modifier les liens, puis « Enregistrer ».
3. C'est en ligne tout de suite.
