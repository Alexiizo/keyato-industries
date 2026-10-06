// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
	// La page reste statique ; seuls /admin, /go/* et /video/* sont rendus à la demande par le serveur Node.
	adapter: node({ mode: 'standalone' }),
	vite: {
		optimizeDeps: {
			// Importées depuis un <script> de composant, Vite ne les repère pas au démarrage : il les découvrirait au premier
			// chargement et reconstruirait son cache, ce qui casse les imports de la page (504) et coupe les animations en dev.
			include: ['gsap', 'gsap/ScrollTrigger', 'lenis'],
		},
	},
});
