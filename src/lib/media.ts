import { env } from 'cloudflare:workers';

/*
 * Images envoyées depuis /admin, rangées dans l'espace KV « SITE » (clés « media/… », 25 Mo max par image), servies
 * par /media/<clé>. KV plutôt que R2 : rien à activer côté Cloudflare, et largement suffisant pour quelques images.
 */
const PREFIX = 'media/';

type Metadata = { contentType: string };

export async function putMedia(key: string, data: ArrayBuffer, contentType: string) {
	await env.SITE.put(PREFIX + key, data, { metadata: { contentType } satisfies Metadata });
}

export async function deleteMedia(keys: string[]) {
	await Promise.all(keys.map((key) => env.SITE.delete(PREFIX + key)));
}

export async function getMedia(key: string) {
	const { value, metadata } = await env.SITE.getWithMetadata<Metadata>(PREFIX + key, 'arrayBuffer');
	return value ? { data: value, contentType: metadata?.contentType ?? 'application/octet-stream' } : null;
}
