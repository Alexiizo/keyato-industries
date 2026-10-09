import type { APIRoute, ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import heroBg from '../../../design/Sector.01.png';
import keyato from '../../../design/KeyaMoney.png';
import signs from '../../../design/Sign.png';
import packBasique from '../../../design/Pack.01.png';
import packPlusFront from '../../../design/Pack.02.png';
import packDuo from '../../../design/Pack.03.png';
import mainBg from '../../../design/Sector.02.png';
import crowd from '../../../design/Bottom.png';

// Aperçus des images d'origine pour l'onglet Images de l'admin, générés au build (les originaux pèsent plusieurs Mo)
export const prerender = true;

const originals: Record<string, ImageMetadata> = { heroBg, keyato, signs, packBasique, packPlusFront, packDuo, mainBg, crowd };

export const GET: APIRoute = async () => {
	const previews = await Promise.all(
		Object.entries(originals).map(async ([slot, src]) => {
			const image = await getImage({ src, width: 480 });
			return [slot, { src: image.src, width: src.width, height: src.height }];
		}),
	);
	return Response.json(Object.fromEntries(previews));
};
