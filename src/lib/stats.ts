import { env } from 'cloudflare:workers';

/*
 * Statistiques du site, dans la base D1 « STATS » (wrangler.jsonc) : une ligne par visite de la page, clic sur un lien
 * (/go/…) ou lecture de la vidéo.
 * Sans cookie et sans stocker d'adresse IP : un visiteur est identifié par une empreinte (IP + navigateur + jour + sel
 * secret) qui change chaque jour, comme Plausible. Les robots sont ignorés.
 */

export type EventType = 'view' | 'click' | 'video';

const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|discord|telegram|whatsapp|skype|headless|lighthouse|pagespeed|curl|wget|python|httpclient|axios|node-fetch|monitor/i;

let ready: Promise<unknown> | undefined;

// Crée la table au premier usage : pas de migration à lancer au déploiement
function ensureSchema() {
	ready ??= env.STATS.batch([
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
				referrer TEXT
			)`,
		),
		env.STATS.prepare('CREATE INDEX IF NOT EXISTS events_day_type ON events (day, type)'),
	]).catch((error) => {
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

async function salt() {
	const existing = await env.SITE.get('stats-salt');
	if (existing) return existing;
	const value = crypto.randomUUID();
	await env.SITE.put('stats-salt', value);
	return value;
}

async function visitorId(request: Request, day: string) {
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

function referrerOf(request: Request) {
	const referer = request.headers.get('referer');
	if (!referer) return null;
	try {
		const host = new URL(referer).hostname.replace(/^www\./, '');
		return host === new URL(request.url).hostname.replace(/^www\./, '') ? null : host;
	} catch {
		return null;
	}
}

export function isTracked(request: Request) {
	const ua = request.headers.get('user-agent') ?? '';
	const prefetch = request.headers.get('sec-purpose') ?? request.headers.get('purpose') ?? '';
	return ua !== '' && !BOTS.test(ua) && !/prefetch|prerender/i.test(prefetch);
}

// À appeler dans waitUntil : n'échoue jamais (une statistique perdue ne doit pas casser le site)
export async function record(request: Request, type: EventType, target: string | null = null) {
	if (!isTracked(request)) return;
	try {
		await ensureSchema();
		const day = dayOf();
		const country = (request as Request & { cf?: { country?: string } }).cf?.country ?? null;
		await env.STATS.prepare(
			'INSERT INTO events (ts, day, type, target, visitor, country, device, referrer) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
		)
			.bind(
				Date.now(),
				day,
				type,
				target,
				await visitorId(request, day),
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

type Totals = { views: number; visitors: number; packClicks: number; videos: number };

async function totals(from: string, to: string): Promise<Totals> {
	const row = await env.STATS.prepare(
		`SELECT
			SUM(type = 'view') AS views,
			SUM(type = 'click' AND target IN ('basique', 'plus', 'patreon')) AS packClicks,
			SUM(type = 'video') AS videos
		FROM events WHERE day BETWEEN ? AND ?`,
	)
		.bind(from, to)
		.first<{ views: number | null; packClicks: number | null; videos: number | null }>();
	// Visiteurs : visiteurs différents de chaque jour, additionnés (l'empreinte change chaque jour)
	const visitors = await env.STATS.prepare(
		`SELECT COUNT(*) AS n FROM (SELECT DISTINCT day, visitor FROM events WHERE type = 'view' AND day BETWEEN ? AND ?)`,
	)
		.bind(from, to)
		.first<{ n: number }>();
	return { views: row?.views ?? 0, visitors: visitors?.n ?? 0, packClicks: row?.packClicks ?? 0, videos: row?.videos ?? 0 };
}

const rows = async <T>(query: string, ...params: unknown[]) =>
	(await env.STATS.prepare(query).bind(...params).all<T>()).results;

export async function dashboard(period: Period) {
	await ensureSchema();
	// Ménage : on garde un peu plus d'un an d'historique
	await env.STATS.prepare('DELETE FROM events WHERE day < ?').bind(periodOf(400).from).run();

	const [current, previous, daily, clicks, referrers, devices, countries] = await Promise.all([
		totals(period.from, period.to),
		totals(period.previousFrom, period.previousTo),
		rows<{ day: string; views: number; visitors: number }>(
			`SELECT day, SUM(type = 'view') AS views, COUNT(DISTINCT CASE WHEN type = 'view' THEN visitor END) AS visitors
			FROM events WHERE day BETWEEN ? AND ? GROUP BY day ORDER BY day`,
			period.from,
			period.to,
		),
		rows<{ target: string; n: number }>(
			`SELECT target, COUNT(*) AS n FROM events WHERE type = 'click' AND day BETWEEN ? AND ? GROUP BY target`,
			period.from,
			period.to,
		),
		rows<{ referrer: string; n: number }>(
			`SELECT referrer, COUNT(*) AS n FROM events WHERE type = 'view' AND referrer IS NOT NULL AND day BETWEEN ? AND ?
			GROUP BY referrer ORDER BY n DESC LIMIT 8`,
			period.from,
			period.to,
		),
		rows<{ device: string; n: number }>(
			`SELECT device, COUNT(*) AS n FROM events WHERE type = 'view' AND day BETWEEN ? AND ? GROUP BY device ORDER BY n DESC`,
			period.from,
			period.to,
		),
		rows<{ country: string; n: number }>(
			`SELECT country, COUNT(*) AS n FROM events WHERE type = 'view' AND country IS NOT NULL AND day BETWEEN ? AND ?
			GROUP BY country ORDER BY n DESC LIMIT 8`,
			period.from,
			period.to,
		),
	]);

	return { current, previous, daily, clicks, referrers, devices, countries };
}
