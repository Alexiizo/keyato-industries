// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
	// La page reste statique ; seuls /admin, /go/* et /video/* sont rendus à la demande par le Worker Cloudflare.
	// Config Cloudflare (espace KV du contenu, variables) : wrangler.jsonc.
	adapter: cloudflare({
		// Images optimisées au build (sharp), servies telles quelles ensuite : pas besoin de Cloudflare Images
		imageService: 'compile',
	}),
	// Pas de sessions Astro : l'admin a son propre cookie. Évite un espace KV inutile.
	session: false,
	vite: {
		optimizeDeps: {
			// Importées depuis un <script> de composant, Vite ne les repère pas au démarrage : il les découvrirait au premier
			// chargement et reconstruirait son cache, ce qui casse les imports de la page (504) et coupe les animations en dev.
			include: ['gsap', 'gsap/ScrollTrigger', 'lenis'],
		},
	},
});
