import { z } from 'astro/zod';
import { env } from 'cloudflare:workers';
import defaults from '../data/site.json';
import { imageSlotKeys, textGroups } from './content';

/*
 * Contenu modifiable depuis /admin : liens, vidéo, réseaux, textes et images de la page.
 * Valeurs par défaut : src/data/site.json (et les images d'origine). Les modifications sont enregistrées dans l'espace
 * KV « SITE » de Cloudflare, les images envoyées dans le bucket R2 « MEDIA » (wrangler.jsonc) ; en dev, dans une copie
 * locale (.wrangler/state).
 */
const KEY = 'site';

const url = z.url({ protocol: /^https?$/, error: 'Lien invalide : il doit commencer par https://' });

// Accepte un lien YouTube (watch, youtu.be, shorts, embed) ou directement l'ID de la vidéo
export function youtubeIdFrom(value: string) {
	const text = value.trim();
	const match = text.match(/(?:[?&]v=|youtu\.be\/|\/shorts\/|\/embed\/)([\w-]{11})/) ?? text.match(/^([\w-]{11})$/);
	return match?.[1] ?? '';
}

const textsSchema = z.object(
	Object.fromEntries(
		textGroups.flatMap((group) =>
			group.fields.map((field) => [
				field.key,
				z
					.string()
					.trim()
					.min(1, { error: 'Ce texte ne peut pas être vide' })
					.max(field.max, { error: `${field.max} caractères maximum` }),
			]),
		),
	),
);

// Image envoyée depuis /admin : ses dimensions et ses déclinaisons (une par largeur) dans R2
const imageSchema = z.object({
	width: z.number().int().positive(),
	height: z.number().int().positive(),
	variants: z.array(z.object({ w: z.number().int().positive(), key: z.string() })).min(1),
});

export const schema = z.object({
	links: z.object({ basique: url, plus: url, patreon: url }),
	video: z.string().refine((value) => youtubeIdFrom(value) !== '', { error: 'Lien YouTube non reconnu' }),
	// Miniature de la vidéo, déterminée à l'enregistrement du lien
	videoThumb: z.string().optional(),
	socials: z.object({ youtube: url, twitch: url, instagram: url, discord: url }),
	texts: textsSchema,
	// Seulement les images remplacées (z.partialRecord : avec des clés d'enum, z.record exigerait toutes les clés)
	images: z.partialRecord(z.enum(imageSlotKeys as [string, ...string[]]), imageSchema),
});

export type Site = z.infer<typeof schema>;
export type SiteImage = z.infer<typeof imageSchema>;

const fallback = schema.parse({ ...defaults, images: {} });

type Saved = Partial<Record<keyof Site, unknown>>;
const section = <T>(value: unknown, base: T): T => (value && typeof value === 'object' ? { ...base, ...value } : base);

// Le contenu enregistré est complété par les valeurs par défaut : un champ ajouté depuis le dernier enregistrement
// (ex. les textes, apparus après les liens) reprend sa valeur d'origine.
export async function getSite(): Promise<Site> {
	const saved = ((await env.SITE.get(KEY, 'json')) ?? {}) as Saved;
	const merged = {
		...fallback,
		...saved,
		links: section(saved.links, fallback.links),
		socials: section(saved.socials, fallback.socials),
		texts: section(saved.texts, fallback.texts),
		images: section(saved.images, {}),
	};
	const result = schema.safeParse(merged);
	return result.success ? result.data : fallback;
}

export async function saveSite(site: Site) {
	await env.SITE.put(KEY, JSON.stringify(site));
}

export const defaultTexts = fallback.texts;

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
