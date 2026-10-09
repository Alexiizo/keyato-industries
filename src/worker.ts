import { handle } from '@astrojs/cloudflare/handler';
import { applyContent } from './lib/render';
import { record } from './lib/stats';

/*
 * Point d'entrée du Worker (wrangler.jsonc → main). Tout passe par Astro ; pour la page d'accueil (pré-générée,
 * routée vers le Worker par assets.run_worker_first), on applique en plus le contenu de /admin et on compte la visite.
 */
export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const isHome = request.method === 'GET' && url.pathname === '/';
		if (!isHome) return handle(request, env, ctx);

		// Sans validation conditionnelle : une page en cache (304) ne montrerait pas les dernières modifications
		const headers = new Headers(request.headers);
		headers.delete('if-none-match');
		headers.delete('if-modified-since');
		const response = await handle(new Request(request, { headers }), env, ctx);
		if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) return response;

		ctx.waitUntil(record(request, 'view'));
		return applyContent(response);
	},
} satisfies ExportedHandler<Env>;
