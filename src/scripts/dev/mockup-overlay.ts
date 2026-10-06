import maquetteUrl from '../../../design/maquette-1920.png?url';

// Calque de comparaison avec la maquette, chargé uniquement en dev.
// M : afficher/masquer · D : mode différence · ↑/↓ : opacité
const STORAGE_KEY = 'mockup-overlay';

type State = { visible: boolean; difference: boolean; opacity: number };

function load(): State {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) return JSON.parse(saved);
	} catch {}
	return { visible: false, difference: false, opacity: 0.5 };
}

function save(state: State) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {}
}

const state = load();
const img = document.createElement('img');
img.src = maquetteUrl;
img.alt = '';
Object.assign(img.style, {
	position: 'absolute',
	top: '0',
	maxWidth: 'none',
	zIndex: '2147483647',
	pointerEvents: 'none',
});
document.body.append(img);

// Le calque prend la taille et la place de la colonne de contenu (.canvas, 1920px maquette).
// Quand la page est plus large que la colonne, seuls les éléments accrochés aux bords ne s'y superposent pas.
const probe = document.createElement('div');
probe.style.cssText = 'position:absolute;visibility:hidden;width:calc(1920 * var(--u))';
document.querySelector('.page')?.append(probe);

function place() {
	const width = probe.offsetWidth;
	img.style.width = `${width}px`;
	img.style.left = `${(document.documentElement.clientWidth - width) / 2}px`;
}

window.addEventListener('resize', place);
place();

function render() {
	img.style.display = state.visible ? 'block' : 'none';
	img.style.opacity = state.difference ? '1' : String(state.opacity);
	img.style.mixBlendMode = state.difference ? 'difference' : 'normal';
	save(state);
}

window.addEventListener('keydown', (event) => {
	const target = event.target as HTMLElement;
	if (event.ctrlKey || event.metaKey || event.altKey || target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(target.tagName)) {
		return;
	}
	switch (event.key) {
		case 'm':
		case 'M':
			state.visible = !state.visible;
			break;
		case 'd':
		case 'D':
			state.difference = !state.difference;
			break;
		case 'ArrowUp':
		case 'ArrowDown':
			if (!state.visible) return;
			event.preventDefault();
			state.opacity = Math.min(1, Math.max(0.1, state.opacity + (event.key === 'ArrowUp' ? 0.1 : -0.1)));
			break;
		default:
			return;
	}
	render();
});

render();
