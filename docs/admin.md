# Back-office

Page `/admin`, protégée par un mot de passe, pour modifier sans toucher au code :

- les liens des boutons « Pack Basique », « Pack Plus + » et « Voir le Patreon » (aussi l'icône Patreon du bas de page) ;
- la vidéo de présentation (lien YouTube) ;
- les liens YouTube, Twitch, Instagram et Discord du bas de page.

Les changements sont en ligne dès l'enregistrement, sans rebuild.

## Fonctionnement

- La page reste statique. Les boutons pointent vers `/go/<clé>` et la vidéo vers `/video/thumbnail` et `/video/embed.json` : ces routes, rendues par le serveur, lisent le contenu enregistré.
- Contenu : `src/lib/site.ts`. Valeurs par défaut dans `src/data/site.json` ; les modifications sont enregistrées dans `.data/site.json`.
- Chaque saisie est vérifiée (liens en `https://`, lien YouTube reconnu) ; en cas d'erreur, rien n'est enregistré.
- Connexion : cookie de session valable 30 jours. Changer le mot de passe déconnecte tout le monde.

## En local

Le mot de passe est dans `.env` (`ADMIN_PASSWORD`). `npm run dev`, puis http://localhost:4321/admin.

## Mise en ligne

Le site tourne sur un serveur Node (adaptateur `@astrojs/node`) :

```sh
npm ci
npm run build
ADMIN_PASSWORD=<mot de passe long> npm start   # écoute sur le port 4321, ou PORT=...
```

- L'hébergeur doit faire tourner Node (VPS, Render, Railway, Fly.io…) et lancer la commande depuis la racine du projet.
- Le dossier `.data/` doit être conservé d'un déploiement à l'autre (disque persistant), sinon on revient aux valeurs de `src/data/site.json`.
- Servir le site en HTTPS (le cookie de session est alors sécurisé).
- Hébergement sans disque (Vercel, Netlify…) : changer d'adaptateur Astro et remplacer le driver `fs` d'unstorage dans `src/lib/site.ts` par un stockage clé-valeur (Netlify Blobs, Upstash Redis…).

## Pour Keyato

1. Aller sur `<adresse du site>/admin` et entrer le mot de passe.
2. Modifier les liens, puis « Enregistrer ».
3. C'est en ligne tout de suite.
