import type { APIRoute } from 'astro';
import { linkTarget } from '../../lib/site';

export const prerender = false;

// Redirige vers le lien enregistré dans /admin : la page reste statique, les liens restent modifiables.
export const GET: APIRoute = async ({ params }) => {
	const target = await linkTarget(params.key ?? '');
	if (!target) return new Response('Lien inconnu', { status: 404 });
	return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'no-store' } });
};
