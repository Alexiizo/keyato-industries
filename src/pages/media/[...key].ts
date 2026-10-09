import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

// Images envoyées depuis /admin (bucket R2 « MEDIA »). Chaque envoi a une clé unique : cache d'un an sans revalidation.
export const GET: APIRoute = async ({ params, request }) => {
	const object = await env.MEDIA.get(params.key ?? '');
	if (!object) return new Response('Image introuvable', { status: 404 });

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('ETag', object.httpEtag);
	headers.set('Cache-Control', 'public, max-age=31536000, immutable');
	if (request.headers.get('if-none-match') === object.httpEtag) return new Response(null, { status: 304, headers });
	return new Response(object.body, { headers });
};
