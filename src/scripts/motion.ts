import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Smooth scroll piloté par le ticker GSAP pour rester synchro avec ScrollTrigger.
// Lenis désactive lui-même le lissage si l'utilisateur préfère réduire les animations.
const lenis = new Lenis({ autoRaf: false, anchors: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Position dans la page d'après la mise en page, sans tenir compte des transforms (donc des animations en cours).
function layoutBox(el: HTMLElement) {
	let top = 0;
	for (let node: HTMLElement | null = el; node; node = node.offsetParent as HTMLElement | null) {
		top += node.offsetTop;
	}
	return { top, height: el.offsetHeight };
}

/*
 * Chaque effet anime des propriétés qui lui sont propres, pour pouvoir se cumuler sur un même élément :
 * - parallaxe et recouvrement : y
 * - intro et apparition : xPercent, yPercent, rotation, scale, opacity
 * - sortie : x, rotation, filter (sur un élément sans apparition, ou un wrapper)
 * Les survols CSS d'un élément animé utilisent les propriétés scale / translate, jamais transform.
 */

/*
 * Parallaxe : <div data-parallax="0.2">
 * La valeur est la vitesse relative au scroll : positive = l'élément traîne (plan lointain),
 * négative = il avance (premier plan). L'élément est à sa position maquette :
 * - au chargement s'il est visible dans le premier écran,
 * - en bas de page s'il est dans le dernier écran,
 * - sinon quand il est centré dans l'écran.
 */
function parallax(el: HTMLElement) {
	const speed = Number(el.dataset.parallax) || 0;
	const range = () => {
		const { top, height } = layoutBox(el);
		const vh = window.innerHeight;
		const max = ScrollTrigger.maxScroll(window);
		const rest = top < vh ? 0 : Math.min(max, top + height / 2 - vh / 2);
		return { start: Math.max(0, top - vh), end: Math.min(max, top + height), rest };
	};

	gsap.fromTo(
		el,
		{ y: () => speed * (range().start - range().rest) },
		{
			y: () => speed * (range().end - range().rest),
			ease: 'none',
			scrollTrigger: {
				start: () => range().start,
				end: () => range().end,
				scrub: true,
				invalidateOnRefresh: true,
			},
		},
	);
}

/*
 * Recouvrement : <div data-cover="0.5" data-cover-delay="0.15">
 * Une fois le bas de l'élément arrivé en bas de l'écran, il descend à cette fraction de la vitesse du scroll,
 * ce qui laisse la section suivante glisser par-dessus.
 * data-cover-delay (facultatif) retarde ce moment, en fraction de la hauteur de l'écran.
 */
function coverRange(el: HTMLElement) {
	const delay = Number(el.dataset.coverDelay) || 0;
	const { top, height } = layoutBox(el);
	const vh = window.innerHeight;
	const end = top + height;
	return { start: Math.min(end, Math.max(0, end - vh) + delay * vh), end };
}

function cover(el: HTMLElement) {
	const speed = Number(el.dataset.cover) || 0;

	gsap.fromTo(
		el,
		{ y: 0 },
		{
			y: () => speed * (coverRange(el).end - coverRange(el).start),
			ease: 'none',
			scrollTrigger: {
				start: () => coverRange(el).start,
				end: () => coverRange(el).end,
				scrub: true,
				invalidateOnRefresh: true,
			},
		},
	);
}

/*
 * Intro au chargement : <h1 data-intro="down">
 * Les éléments arrivent l'un après l'autre, dans l'ordre de la page.
 */
const intros: Record<string, gsap.TweenVars> = {
	down: { yPercent: -40, scale: 0.92, opacity: 0 },
	zoom: { scale: 0.9, opacity: 0 },
	left: { xPercent: -110, rotation: -12, ease: 'back.out(1.2)' },
	drop: { yPercent: -110, rotation: 4, transformOrigin: '50% 0%', ease: 'elastic.out(1, 0.6)', duration: 1.6 },
	up: { yPercent: 40, opacity: 0 },
};

function intro() {
	const timeline = gsap.timeline({ defaults: { duration: 0.9, ease: 'back.out(1.6)' } });
	gsap.utils.toArray<HTMLElement>('[data-intro]').forEach((el, i) => {
		const vars = intros[el.dataset.intro ?? ''];
		if (vars) timeline.from(el, { ...vars }, i * 0.08);
	});
}

/*
 * Apparition au scroll : <div data-reveal="left">
 * L'élément part de cet état quand son haut arrive en bas de l'écran, et est en place à 70 % de la hauteur de l'écran.
 * Groupe : <ul data-reveal-group="pop"> fait apparaître les enfants en cascade quand le groupe entre dans l'écran.
 */
const reveals: Record<string, gsap.TweenVars> = {
	up: { yPercent: 40, opacity: 0 },
	rise: { yPercent: 10, rotation: 2, opacity: 0 },
	left: { xPercent: -50, rotation: -6, opacity: 0 },
	right: { xPercent: 50, rotation: 6, opacity: 0 },
	pop: { scale: 0.6, opacity: 0 },
};

function reveal(el: HTMLElement) {
	const vars = reveals[el.dataset.reveal ?? ''];
	if (!vars) return;
	const range = () => {
		const { top } = layoutBox(el);
		const vh = window.innerHeight;
		const end = Math.min(ScrollTrigger.maxScroll(window), top - 0.7 * vh);
		return { start: Math.min(top - vh, end - 1), end };
	};

	gsap.from(el, {
		...vars,
		ease: 'power2.out',
		scrollTrigger: {
			start: () => range().start,
			end: () => range().end,
			scrub: true,
			invalidateOnRefresh: true,
		},
	});
}

function revealGroup(el: HTMLElement) {
	const vars = reveals[el.dataset.revealGroup ?? ''];
	if (!vars) return;

	gsap.from(el.children, {
		...vars,
		duration: 0.6,
		ease: 'back.out(1.7)',
		stagger: 0.08,
		scrollTrigger: { trigger: el, start: 'top 92%', toggleActions: 'play none none reverse' },
	});
}

/*
 * Sortie au scroll : <div data-exit="right">
 * L'élément file vers ce côté en s'estompant quand son haut passe dans le quart supérieur de l'écran ;
 * dans un élément à recouvrement (hero), pendant que la section suivante passe par-dessus.
 */
const exits: Record<string, gsap.TweenVars> = {
	left: { x: () => -0.35 * window.innerWidth, rotation: -8 },
	right: { x: () => 0.35 * window.innerWidth, rotation: 8 },
};

function exit(el: HTMLElement) {
	const vars = exits[el.dataset.exit ?? ''];
	if (!vars) return;
	const covered = el.closest<HTMLElement>('[data-cover]');
	const range = () => {
		const vh = window.innerHeight;
		if (covered) {
			const { start } = coverRange(covered);
			return { start, end: start + 0.6 * vh };
		}
		const { top, height } = layoutBox(el);
		return { start: top - 0.25 * vh, end: top + height };
	};

	gsap.fromTo(
		el,
		{ filter: 'opacity(1)' },
		{
			...vars,
			filter: 'opacity(0)',
			transformOrigin: '50% 0%',
			ease: 'power1.in',
			immediateRender: false,
			scrollTrigger: {
				start: () => range().start,
				end: () => range().end,
				scrub: true,
				invalidateOnRefresh: true,
			},
		},
	);
}

if (!reduceMotion) {
	gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach(parallax);
	gsap.utils.toArray<HTMLElement>('[data-cover]').forEach(cover);
	intro();
	gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach(reveal);
	gsap.utils.toArray<HTMLElement>('[data-reveal-group]').forEach(revealGroup);
	gsap.utils.toArray<HTMLElement>('[data-exit]').forEach(exit);
}

export { gsap, ScrollTrigger, lenis };
