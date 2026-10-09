import type { APIRoute } from 'astro';
import { getMedia } from '../../lib/media';

export const prerender = false;

/*
 * Images envoyées depuis /admin (src/lib/media.ts). Chaque envoi a une clé unique : cache d'un an sans revalidation,
 * et copie dans le cache de Cloudflare pour ne pas relire KV à chaque affichage.
 */
export const GET: APIRoute = async ({ params, request, locals }) => {
	const cache = await caches.open('media');
	const cached = await cache.match(request);
	if (cached) return cached;

	const media = await getMedia(params.key ?? '');
	if (!media) return new Response('Image introuvable', { status: 404 });

	const response = new Response(media.data, {
		headers: { 'Content-Type': media.contentType, 'Cache-Control': 'public, max-age=31536000, immutable' },
	});
	locals.cfContext.waitUntil(cache.put(request, response.clone()));
	return response;
};
