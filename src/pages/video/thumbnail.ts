import type { APIRoute } from 'astro';
import { getSite, thumbnailUrl, youtubeIdFrom } from '../../lib/site';

export const prerender = false;

// Miniature de la vidéo enregistrée dans /admin
export const GET: APIRoute = async () => {
	const id = youtubeIdFrom((await getSite()).video);
	return new Response(null, { status: 302, headers: { Location: await thumbnailUrl(id), 'Cache-Control': 'no-store' } });
};
