import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isLoggedIn } from '../../lib/auth';
import { imageSlots } from '../../lib/content';
import { getSite, saveSite } from '../../lib/site';

export const prerender = false;

/*
 * Envoi d'une image depuis l'onglet Images de l'admin. Le navigateur l'a déjà redimensionnée et convertie
 * (une déclinaison par largeur, champs « w<largeur> ») : on les range dans R2 et on met à jour le contenu.
 * action=reset : retour à l'image d'origine.
 */
const MAX_BYTES = 15 * 1024 * 1024;
const TYPES: Record<string, string> = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' };

const fail = (message: string, status = 400) => Response.json({ ok: false, message }, { status });

export const POST: APIRoute = async ({ request, cookies }) => {
	if (!isLoggedIn(cookies)) return fail('Session expirée : reconnecte-toi.', 401);

	const form = await request.formData();
	const slot = imageSlots.find((item) => item.key === form.get('slot'));
	if (!slot) return fail('Image inconnue.');

	const site = await getSite();
	const previous = site.images[slot.key];

	if (form.get('action') === 'reset') {
		delete site.images[slot.key];
		await saveSite(site);
		if (previous) await env.MEDIA.delete(previous.variants.map((variant) => variant.key));
		return Response.json({ ok: true });
	}

	const width = Number(form.get('width'));
	const height = Number(form.get('height'));
	if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) return fail('Dimensions invalides.');

	const files = [...form.entries()].flatMap(([name, value]) => {
		const w = Number(name.match(/^w(\d+)$/)?.[1]);
		return w && value instanceof File ? [{ w, file: value }] : [];
	});
	if (files.length === 0 || files.length > 6) return fail('Aucune image reçue.');
	for (const { file } of files) {
		if (!TYPES[file.type]) return fail('Format non pris en charge : envoie une image PNG, JPEG ou WebP.');
		if (file.size > MAX_BYTES) return fail('Image trop lourde (15 Mo maximum).');
	}

	// Clé unique par envoi : les images sont mises en cache un an sans revalidation (/media/…)
	const stamp = Date.now().toString(36);
	const variants = await Promise.all(
		files.map(async ({ w, file }) => {
			const key = `img/${slot.key}/${stamp}-${w}.${TYPES[file.type]}`;
			await env.MEDIA.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
			return { w, key };
		}),
	);

	site.images[slot.key] = { width, height, variants: variants.sort((a, b) => a.w - b.w) };
	await saveSite(site);
	if (previous) await env.MEDIA.delete(previous.variants.map((variant) => variant.key));

	return Response.json({ ok: true });
};
