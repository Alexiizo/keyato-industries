import type { APIRoute } from 'astro';
import { linkTarget } from '../../lib/site';
import { record } from '../../lib/stats';

export const prerender = false;

// Redirige vers le lien enregistré dans /admin : la page reste statique, les liens restent modifiables.
// Chaque passage compte comme un clic dans les statistiques.
export const GET: APIRoute = async ({ params, request, locals }) => {
	const key = params.key ?? '';
	const target = await linkTarget(key);
	if (!target) return new Response('Lien inconnu', { status: 404 });
	locals.cfContext.waitUntil(record(request, 'click', key));
	return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'no-store' } });
};
