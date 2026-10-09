import { env } from 'cloudflare:workers';

/*
 * Statistiques du site, dans la base D1 « STATS » (wrangler.jsonc) : une ligne par visite de la page, clic sur un lien
 * (/go/…) ou lecture de la vidéo.
 *
 * Mesure d'audience exemptée de consentement (cadre CNIL) :
 * - cookie « kv_vid » propre au site, identifiant aléatoire, posé par le Worker pour 13 mois et jamais prolongé ;
 *   il permet de reconnaître un visiteur d'un jour à l'autre ;
 * - sans ce cookie (navigation privée, premier passage refusé…), empreinte anonyme (IP + navigateur + jour + sel secret)
 *   qui change chaque jour, comme Plausible ;
 * - aucune adresse IP stockée, rien de partagé, données gardées 13 mois ;
 * - opposition possible sur /statistiques (cookie « kv_optout ») ; le réglage Global Privacy Control vaut opposition.
 * Les robots ne sont pas comptés.
 */

export type EventType = 'view' | 'click' | 'video';

export const VISITOR_COOKIE = 'kv_vid';
export const OPTOUT_COOKIE = 'kv_optout';
// 13 mois
export const COOKIE_MAX_AGE = 395 * 24 * 60 * 60;

const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|discord|telegram|whatsapp|skype|headless|lighthouse|pagespeed|curl|wget|python|httpclient|axios|node-fetch|monitor/i;
const PACK_TARGETS = "('basique', 'plus', 'patreon')";
// Visiteur : son cookie, sinon son empreinte du jour
const WHO = "COALESCE(vid, day || ':' || visitor)";

let ready: Promise<unknown> | undefined;

// Crée la table (et ajoute les colonnes apparues depuis) au premier usage : pas de migration à lancer au déploiement
function ensureSchema() {
	ready ??= (async () => {
		await env.STATS.batch([
			env.STATS.prepare(
				`CREATE TABLE IF NOT EXISTS events (
					id INTEGER PRIMARY KEY,
					ts INTEGER NOT NULL,
					day TEXT NOT NULL,
					type TEXT NOT NULL,
					target TEXT,
					visitor TEXT,
					country TEXT,
					device TEXT,
					referrer TEXT,
					vid TEXT
				)`,
			),
			env.STATS.prepare('CREATE INDEX IF NOT EXISTS events_day_type ON events (day, type)'),
		]);
		const { results } = await env.STATS.prepare('PRAGMA table_info(events)').all<{ name: string }>();
		if (!results.some((column) => column.name === 'vid')) {
			await env.STATS.prepare('ALTER TABLE events ADD COLUMN vid TEXT').run().catch((error: Error) => {
				// Ajoutée entre-temps par une autre requête
				if (!/duplicate column/i.test(error.message)) throw error;
			});
		}
		await env.STATS.prepare('CREATE INDEX IF NOT EXISTS events_vid ON events (vid)').run();
	})().catch((error) => {
		ready = undefined;
		throw error;
	});
	return ready;
}

// Jour au fuseau de Paris (AAAA-MM-JJ)
export function dayOf(date = new Date()) {
	try {
		return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(date);
	} catch {
		return date.toISOString().slice(0, 10);
	}
}

export function readCookie(request: Request, name: string) {
	const match = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
	return match ? decodeURIComponent(match[1]) : undefined;
}

// Opposition à la mesure : bouton de /statistiques ou réglage Global Privacy Control du navigateur
export function hasOptedOut(request: Request) {
	return readCookie(request, OPTOUT_COOKIE) === '1' || request.headers.get('sec-gpc') === '1';
}

export function isTracked(request: Request) {
	const ua = request.headers.get('user-agent') ?? '';
	const prefetch = request.headers.get('sec-purpose') ?? request.headers.get('purpose') ?? '';
	return !hasOptedOut(request) && ua !== '' && !BOTS.test(ua) && !/prefetch|prerender/i.test(prefetch);
}

const VID_FORMAT = /^[0-9a-f-]{36}$/;

// Identifiant du visiteur lu dans son cookie, ou nouveau (à déposer par l'appelant)
export function visitorCookie(request: Request) {
	const existing = readCookie(request, VISITOR_COOKIE);
	if (existing && VID_FORMAT.test(existing)) return { vid: existing, isNew: false };
	return { vid: crypto.randomUUID(), isNew: true };
}

export function visitorCookieHeader(vid: string, secure: boolean) {
	return `${VISITOR_COOKIE}=${vid}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax; HttpOnly${secure ? '; Secure' : ''}`;
}

async function salt() {
	const existing = await env.SITE.get('stats-salt');
	if (existing) return existing;
	const value = crypto.randomUUID();
	await env.SITE.put('stats-salt', value);
	return value;
}

async function fingerprint(request: Request, day: string) {
	const ip = request.headers.get('cf-connecting-ip') ?? '';
	const ua = request.headers.get('user-agent') ?? '';
	const data = new TextEncoder().encode(`${await salt()}|${day}|${ip}|${ua}`);
	const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
	return [...hash.slice(0, 8)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function deviceOf(ua: string) {
	if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tablet';
	if (/Mobi|iPhone|iPod|Android/i.test(ua)) return 'mobile';
	return 'desktop';
}

// Site d'origine, sans www. ni m. (m.youtube.com et youtube.com comptent ensemble)
function referrerOf(request: Request) {
	const referer = request.headers.get('referer');
	if (!referer) return null;
	try {
		const host = new URL(referer).hostname.replace(/^(www|m)\./, '');
		return host === new URL(request.url).hostname.replace(/^www\./, '') ? null : host;
	} catch {
		return null;
	}
}

/*
 * À appeler dans waitUntil : n'échoue jamais (une statistique perdue ne doit pas casser le site).
 * vid : identifiant du visiteur s'il vient d'être créé (le cookie n'est pas encore dans la requête).
 */
export async function record(request: Request, type: EventType, target: string | null = null, vid?: string) {
	if (!isTracked(request)) return;
	try {
		await ensureSchema();
		const day = dayOf();
		const cookie = readCookie(request, VISITOR_COOKIE);
		const country = (request as Request & { cf?: { country?: string } }).cf?.country ?? null;
		await env.STATS.prepare(
			'INSERT INTO events (ts, day, type, target, visitor, vid, country, device, referrer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
		)
			.bind(
				Date.now(),
				day,
				type,
				target,
				await fingerprint(request, day),
				vid ?? (cookie && VID_FORMAT.test(cookie) ? cookie : null),
				country,
				deviceOf(request.headers.get('user-agent') ?? ''),
				type === 'view' ? referrerOf(request) : null,
			)
			.run();
	} catch (error) {
		console.error('stats', error);
	}
}

/* Tableau de bord */

// Période des N derniers jours (aujourd'hui compris) et les N jours d'avant, pour comparer
export type Period = { days: number; from: string; to: string; previousFrom: string; previousTo: string };

export function periodOf(days: number): Period {
	const now = new Date();
	const shift = (n: number) => dayOf(new Date(now.getTime() - n * 86_400_000));
	return { days, from: shift(days - 1), to: dayOf(now), previousFrom: shift(2 * days - 1), previousTo: shift(days) };
}

const rows = async <T>(query: string, ...params: unknown[]) =>
	(await env.STATS.prepare(query).bind(...params).all<T>()).results;

const first = async <T>(query: string, ...params: unknown[]) => await env.STATS.prepare(query).bind(...params).first<T>();

type Totals = { views: number; visitors: number; packClicks: number; videos: number; converted: number };

async function totals(from: string, to: string): Promise<Totals> {
	const row = await first<{ views: number | null; packClicks: number | null; videos: number | null; visitors: number; converted: number }>(
		`SELECT
			SUM(type = 'view') AS views,
			SUM(type = 'click' AND target IN ${PACK_TARGETS}) AS packClicks,
			SUM(type = 'video') AS videos,
			COUNT(DISTINCT CASE WHEN type = 'view' THEN ${WHO} END) AS visitors,
			COUNT(DISTINCT CASE WHEN type = 'click' AND target IN ${PACK_TARGETS} THEN ${WHO} END) AS converted
		FROM events WHERE day BETWEEN ? AND ?`,
		from,
		to,
	);
	return {
		views: row?.views ?? 0,
		visitors: row?.visitors ?? 0,
		packClicks: row?.packClicks ?? 0,
		videos: row?.videos ?? 0,
		converted: row?.converted ?? 0,
	};
}

// Fidélité, mesurée sur les visiteurs reconnus par leur cookie
async function loyalty(period: Period) {
	const counts = await first<{ known: number; fresh: number; comeback: number; regulars: number }>(
		`WITH seen AS (
			SELECT vid, COUNT(DISTINCT day) AS days FROM events
			WHERE vid IS NOT NULL AND type = 'view' AND day BETWEEN ? AND ? GROUP BY vid
		)
		SELECT
			COUNT(*) AS known,
			SUM((SELECT MIN(day) FROM events e WHERE e.vid = seen.vid) >= ?) AS fresh,
			SUM((SELECT MIN(day) FROM events e WHERE e.vid = seen.vid) < ?) AS comeback,
			SUM(days >= 2) AS regulars
		FROM seen`,
		period.from,
		period.to,
		period.from,
		period.from,
	);

	// Délai entre la première visite et le premier clic vers Patreon
	const delays = await rows<{ delay: number }>(
		`SELECT MIN(c.ts) - (SELECT MIN(v.ts) FROM events v WHERE v.vid = c.vid AND v.type = 'view') AS delay
		FROM events c
		WHERE c.vid IS NOT NULL AND c.type = 'click' AND c.target IN ${PACK_TARGETS} AND c.day BETWEEN ? AND ?
		GROUP BY c.vid`,
		period.from,
		period.to,
	);
	const sorted = delays.map((row) => row.delay).filter((delay) => delay !== null && delay >= 0).sort((a, b) => a - b);
	const median = sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : null;

	return {
		known: counts?.known ?? 0,
		fresh: counts?.fresh ?? 0,
		returning: counts?.comeback ?? 0,
		regulars: counts?.regulars ?? 0,
		medianDelay: median,
		delaySample: sorted.length,
	};
}

export async function dashboard(period: Period) {
	await ensureSchema();
	// Ménage : on garde 13 mois d'historique
	await env.STATS.prepare('DELETE FROM events WHERE day < ?').bind(periodOf(395).from).run();

	const [current, previous, daily, clicks, sources, devices, countries, fidelity] = await Promise.all([
		totals(period.from, period.to),
		totals(period.previousFrom, period.previousTo),
		rows<{ day: string; views: number; visitors: number }>(
			`SELECT day, SUM(type = 'view') AS views, COUNT(DISTINCT CASE WHEN type = 'view' THEN ${WHO} END) AS visitors
			FROM events WHERE day BETWEEN ? AND ? GROUP BY day ORDER BY day`,
			period.from,
			period.to,
		),
		rows<{ target: string; n: number }>(
			`SELECT target, COUNT(*) AS n FROM events WHERE type = 'click' AND day BETWEEN ? AND ? GROUP BY target`,
			period.from,
			period.to,
		),
		// Source d'un visiteur : le site d'où vient sa première visite de la période ; converti s'il a cliqué vers Patreon
		rows<{ source: string; visitors: number; converted: number }>(
			`WITH views AS (
				SELECT ${WHO} AS who, referrer, ROW_NUMBER() OVER (PARTITION BY ${WHO} ORDER BY ts) AS rank
				FROM events WHERE type = 'view' AND day BETWEEN ? AND ?
			),
			clickers AS (
				SELECT DISTINCT ${WHO} AS who FROM events
				WHERE type = 'click' AND target IN ${PACK_TARGETS} AND day BETWEEN ? AND ?
			)
			SELECT COALESCE(referrer, '') AS source, COUNT(*) AS visitors, SUM(who IN (SELECT who FROM clickers)) AS converted
			FROM views WHERE rank = 1 GROUP BY source ORDER BY visitors DESC LIMIT 8`,
			period.from,
			period.to,
			period.from,
			period.to,
		),
		rows<{ device: string; n: number }>(
			`SELECT device, COUNT(DISTINCT ${WHO}) AS n FROM events WHERE type = 'view' AND day BETWEEN ? AND ? GROUP BY device ORDER BY n DESC`,
			period.from,
			period.to,
		),
		rows<{ country: string; n: number }>(
			`SELECT country, COUNT(DISTINCT ${WHO}) AS n FROM events WHERE type = 'view' AND country IS NOT NULL AND day BETWEEN ? AND ?
			GROUP BY country ORDER BY n DESC LIMIT 8`,
			period.from,
			period.to,
		),
		loyalty(period),
	]);

	return { current, previous, daily, clicks, sources, devices, countries, fidelity };
}
