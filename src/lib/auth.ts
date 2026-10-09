import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AstroCookies, AstroGlobal } from 'astro';
import { getSecret } from 'astro:env/server';

/*
 * Connexion à l'admin : un mot de passe (variable ADMIN_PASSWORD), puis un cookie de session de 30 jours limité à /admin.
 * Le jeton est dérivé du mot de passe : le changer déconnecte tout le monde.
 */
const COOKIE = 'keyato_admin';

const tokenFor = (secret: string) => createHmac('sha256', secret).update('keyato-admin').digest();

function isValidToken(password: string | undefined, value: string | undefined) {
	if (!password || !value) return false;
	const expected = tokenFor(password);
	const given = Buffer.from(value, 'hex');
	return given.length === expected.length && timingSafeEqual(given, expected);
}

export function isLoggedIn(cookies: AstroCookies) {
	return isValidToken(getSecret('ADMIN_PASSWORD'), cookies.get(COOKIE)?.value);
}

export type AdminAuth = {
	enabled: boolean;
	loggedIn: boolean;
	loginError: string;
	// Réponse à renvoyer telle quelle (redirection après connexion / déconnexion)
	response?: Response;
	// Formulaire envoyé (il ne peut être lu qu'une fois) : à réutiliser par la page
	form?: FormData;
};

// À appeler en tête de chaque page de l'admin : gère la connexion et la déconnexion
export async function adminAuth(Astro: AstroGlobal): Promise<AdminAuth> {
	const password = getSecret('ADMIN_PASSWORD');
	const auth: AdminAuth = { enabled: Boolean(password), loggedIn: isLoggedIn(Astro.cookies), loginError: '' };
	if (!password || Astro.request.method !== 'POST') return auth;

	const form = await Astro.request.formData();
	auth.form = form;
	const action = String(form.get('action') ?? '');

	if (action === 'login') {
		if (isValidToken(password, tokenFor(String(form.get('password') ?? '')).toString('hex'))) {
			Astro.cookies.set(COOKIE, tokenFor(password).toString('hex'), {
				httpOnly: true,
				sameSite: 'strict',
				secure: Astro.url.protocol === 'https:',
				path: '/admin',
				maxAge: 60 * 60 * 24 * 30,
			});
			auth.response = Astro.redirect(Astro.url.pathname, 303);
			return auth;
		}
		// Ralentit les essais de mot de passe à la chaîne
		await new Promise((resolve) => setTimeout(resolve, 800));
		auth.loginError = 'Mot de passe incorrect.';
	}

	if (action === 'logout') {
		Astro.cookies.delete(COOKIE, { path: '/admin' });
		auth.response = Astro.redirect('/admin', 303);
	}

	return auth;
}
