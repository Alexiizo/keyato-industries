# Keyato — page de vente « Améliorer ses Visu »

Astro + GSAP (ScrollTrigger) + Lenis.

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # page statique + serveur Node dans dist/
npm start        # lance le serveur de production (ADMIN_PASSWORD requis pour /admin)
```

- Maquette : `design/maquette-1920.png`, relevés dans `docs/maquette.md`
- En dev, `M` affiche la maquette par-dessus la page (`D` différence, `↑/↓` opacité)
- Liens, vidéo et réseaux sociaux modifiables depuis `/admin` (mot de passe dans `.env`) : voir `docs/admin.md`
