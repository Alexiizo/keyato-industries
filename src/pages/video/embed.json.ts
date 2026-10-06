import type { APIRoute } from 'astro';
import { getSite, youtubeIdFrom } from '../../lib/site';

export const prerender = false;

// Adresse du lecteur de la vidéo enregistrée dans /admin, chargé au clic sur la miniature (autoplay : pas de second clic).
// En JSON plutôt qu'en redirection :
// l'attribut allow de l'iframe ne s'appliquerait pas à une adresse atteinte par redirection.
export const GET: APIRoute = async () => {
	const id = youtubeIdFrom((await getSite()).video);
	return Response.json(
		{ src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0` },
		{ headers: { 'Cache-Control': 'no-store' } },
	);
};
