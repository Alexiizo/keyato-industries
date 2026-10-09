// Astro.locals.cfContext : contexte d'exécution du Worker (waitUntil), fourni par @astrojs/cloudflare
declare namespace App {
	interface Locals extends import('@astrojs/cloudflare').Runtime {}
}
