# Keyato — page de vente « Améliorer ses Visu »

Astro + GSAP (ScrollTrigger) + Lenis, hébergé sur Cloudflare Workers.

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # page statique + Worker dans dist/
npm run preview  # teste le build dans le moteur de Cloudflare
npm run deploy   # build + déploiement (normalement fait par Cloudflare à chaque push)
```

- Maquette : `design/maquette-1920.png`, relevés dans `docs/maquette.md`
- En dev, `M` affiche la maquette par-dessus la page (`D` différence, `↑/↓` opacité)
- Liens, vidéo et réseaux sociaux modifiables depuis `/admin` (mot de passe dans `.env`) : voir `docs/admin.md`
