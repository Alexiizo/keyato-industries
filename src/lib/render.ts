import { defaultTexts, getSite, type Site } from './site';

/*
 * Applique le contenu de /admin à la page d'accueil pré-générée, à la volée (HTMLRewriter de Cloudflare) :
 * la page et ses images d'origine restent optimisées au build, seuls les textes et images modifiés changent.
 *   data-text="<clé>"   texte remplacé
 *   data-slot="<clé>"   image remplacée par celle envoyée depuis /admin (servie par /media/…)
 *   data-paper / data-paper-text / data-blank-*   texte de la feuille (voir Details.astro)
 */

const escape = (text: string) =>
	text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

// Espace insécable avant ? ! : ; comme dans les textes d'origine
const typo = (text: string) => text.replace(/ ([?!:;»])/g, ' $1');

const normalize = (text: string) => text.replace(/\r\n/g, '\n').trim();

// Texte de la feuille : une ligne vide sépare les paragraphes, « - » en début de ligne fait un élément de liste
export function paperHtml(text: string) {
	return normalize(text)
		.split(/\n\s*\n/)
		.map((block) => {
			let html = '';
			let list: string[] = [];
			const flush = () => {
				if (list.length) html += `<ul>${list.map((item) => `<li>${item}</li>`).join('')}</ul>`;
				list = [];
			};
			for (const line of block.split('\n').map((value) => value.trim()).filter(Boolean)) {
				const item = line.match(/^[-•]\s*(.+)$/);
				if (item) list.push(escape(typo(item[1])));
				else {
					flush();
					html += `<p>${escape(typo(line))}</p>`;
				}
			}
			flush();
			return html;
		})
		.join('');
}

export const mediaUrl = (key: string) => `/media/${key}`;

const srcset = (image: NonNullable<Site['images'][string]>) =>
	image.variants.map((variant) => `${mediaUrl(variant.key)} ${variant.w}w`).join(', ');

export async function applyContent(response: Response) {
	const site = await getSite();
	const { texts, images } = site;
	const paperCustom = normalize(texts.paperText) !== normalize(defaultTexts.paperText);

	const rewritten = new HTMLRewriter()
		.on('title', {
			element: (element) => {
				element.setInnerContent(texts.seoTitle);
			},
		})
		.on('meta[name="description"]', {
			element: (element) => {
				element.setAttribute('content', texts.seoDescription);
			},
		})
		.on('[data-text]', {
			element: (element) => {
				const key = element.getAttribute('data-text')!;
				if (key === 'heroTitle') {
					element.setInnerContent(`${escape(typo(texts.heroTitle1))} <br />${escape(typo(texts.heroTitle2))}`, { html: true });
				} else if (texts[key] !== undefined) {
					element.setInnerContent(typo(texts[key]));
				}
			},
		})
		.on('img[data-slot]', {
			element: (element) => {
				const image = images[element.getAttribute('data-slot')!];
				if (!image) return;
				const largest = image.variants.reduce((a, b) => (b.w > a.w ? b : a));
				element.setAttribute('src', mediaUrl(largest.key));
				element.setAttribute('srcset', srcset(image));
				element.setAttribute('width', String(image.width));
				element.setAttribute('height', String(image.height));
			},
		})
		.on('img[data-video-thumb]', {
			element: (element) => {
				if (site.videoThumb) element.setAttribute('src', site.videoThumb);
			},
		})
		// Texte de la feuille modifié : feuille vierge + texte en HTML (sinon la feuille d'origine, texte dessiné, reste)
		.on('[data-paper]', {
			element: (element) => {
				if (paperCustom) element.setAttribute('class', `${element.getAttribute('class') ?? ''} paper--custom`);
			},
		})
		.on('img[data-blank-src]', {
			element: (element) => {
				if (!paperCustom) return;
				element.setAttribute('src', element.getAttribute('data-blank-src')!);
				element.setAttribute('srcset', element.getAttribute('data-blank-srcset')!);
			},
		})
		.on('[data-paper-text]', {
			element: (element) => {
				if (paperCustom) element.setInnerContent(paperHtml(texts.paperText), { html: true });
			},
		})
		.transform(response);

	// Pas de mise en cache sans revalidation : une modification dans /admin doit se voir au prochain chargement
	const headers = new Headers(rewritten.headers);
	headers.set('Cache-Control', 'no-cache');
	headers.delete('ETag');
	headers.delete('Last-Modified');
	headers.delete('Content-Length');
	return new Response(rewritten.body, { status: rewritten.status, headers });
}
