import { z } from 'astro/zod';
import { createStorage } from 'unstorage';
import fsDriver from 'unstorage/drivers/fs';
import defaults from '../data/site.json';

/*
 * Contenu modifiable depuis /admin : liens des boutons, vidéo, réseaux sociaux.
 * Valeurs par défaut : src/data/site.json. Les modifications sont enregistrées dans .data/site.json,
 * à conserver d'un déploiement à l'autre (autre hébergement : changer le driver unstorage).
 */
const storage = createStorage({ driver: fsDriver({ base: './.data' }) });

const url = z.url({ protocol: /^https?$/, error: 'Lien invalide : il doit commencer par https://' });

// Accepte un lien YouTube (watch, youtu.be, shorts, embed) ou directement l'ID de la vidéo
export function youtubeIdFrom(value: string) {
	const text = value.trim();
	const match = text.match(/(?:[?&]v=|youtu\.be\/|\/shorts\/|\/embed\/)([\w-]{11})/) ?? text.match(/^([\w-]{11})$/);
	return match?.[1] ?? '';
}

export const schema = z.object({
	links: z.object({ basique: url, plus: url, patreon: url }),
	video: z.string().refine((value) => youtubeIdFrom(value) !== '', { error: 'Lien YouTube non reconnu' }),
	socials: z.object({ youtube: url, twitch: url, instagram: url, discord: url }),
});

export type Site = z.infer<typeof schema>;

export async function getSite(): Promise<Site> {
	const saved = schema.safeParse(await storage.getItem('site.json'));
	return saved.success ? saved.data : schema.parse(defaults);
}

export async function saveSite(site: Site) {
	await storage.setItem('site.json', site);
}

// Destination des liens /go/<clé> : boutons (basique, plus, patreon) et réseaux (youtube, twitch, instagram, discord)
export async function linkTarget(key: string): Promise<string | undefined> {
	const { links, socials } = await getSite();
	const targets: Record<string, string> = { ...links, ...socials };
	return targets[key];
}

// Miniature de la vidéo : maxresdefault n'existe pas pour toutes les vidéos, hqdefault si besoin
const thumbnails = new Map<string, string>();

export async function thumbnailUrl(id: string) {
	const cached = thumbnails.get(id);
	if (cached) return cached;
	const maxres = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
	const found = await fetch(maxres, { method: 'HEAD' })
		.then((response) => response.ok)
		.catch(() => false);
	const result = found ? maxres : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
	thumbnails.set(id, result);
	return result;
}
