// Prolonge les bras de design/Paper.png au-delà des bords de l'image, pour qu'ils atteignent
// toujours les bords de l'écran quand le papier est affiché plus petit que sur la maquette.
// Chaque bras est prolongé en recopiant la colonne du bord le long de la pente du bras ;
// l'image est agrandie vers le bas autant que nécessaire pour ne pas couper les bras.
// Usage : node scripts/extend-paper.mjs
import sharp from 'sharp';

const SRC = 'design/Paper.png';
const OUT = 'src/assets/paper-extended.png';
// Largeur ajoutée de chaque côté, en px de l'image source (460 px ≈ 258 px maquette avec le papier à 75 %).
// Doit couvrir la marge laissée de chaque côté par le papier réduit : 1920 × (1 - échelle) / 2 px maquette.
const EXTEND = 460;
// Distance vers l'intérieur à laquelle on mesure la pente du bras
const PROBE = 40;

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;

// Bornes verticales de la partie opaque d'une colonne (le bras, près des bords)
function armSpan(x) {
	let top = -1;
	let bottom = -1;
	for (let y = 0; y < height; y++) {
		if (data[(y * width + x) * 4 + 3] > 128) {
			if (top < 0) top = y;
			bottom = y;
		}
	}
	return { top, bottom, center: (top + bottom) / 2 };
}

const left = armSpan(0);
const right = armSpan(width - 1);

// Lignes gagnées vers le bas par px parcouru vers l'extérieur
const slopeLeft = (left.center - armSpan(PROBE).center) / PROBE;
const slopeRight = (right.center - armSpan(width - 1 - PROBE).center) / PROBE;

const outWidth = width + EXTEND * 2;
const outHeight = Math.max(height, Math.ceil(Math.max(left.bottom + slopeLeft * EXTEND, right.bottom + slopeRight * EXTEND)) + 2);
const out = Buffer.alloc(outWidth * outHeight * 4);

for (let y = 0; y < height; y++) {
	data.copy(out, (y * outWidth + EXTEND) * 4, y * width * 4, (y + 1) * width * 4);
}

// Copie la colonne srcX décalée de `shift` lignes (interpolation linéaire) dans la colonne outX
function extrude(srcX, outX, shift) {
	for (let y = 0; y < outHeight; y++) {
		const sy = y - shift;
		const y0 = Math.floor(sy);
		const t = sy - y0;
		for (let c = 0; c < 4; c++) {
			const a = y0 >= 0 && y0 < height ? data[(y0 * width + srcX) * 4 + c] : 0;
			const b = y0 + 1 >= 0 && y0 + 1 < height ? data[((y0 + 1) * width + srcX) * 4 + c] : 0;
			out[(y * outWidth + outX) * 4 + c] = Math.round(a * (1 - t) + b * t);
		}
	}
}

for (let k = 1; k <= EXTEND; k++) {
	extrude(0, EXTEND - k, slopeLeft * k);
	extrude(width - 1, EXTEND + width - 1 + k, slopeRight * k);
}

await sharp(out, { raw: { width: outWidth, height: outHeight, channels: 4 } })
	.png({ compressionLevel: 9 })
	.toFile(OUT);

console.log(`${OUT} : ${outWidth}×${outHeight} (pentes ${slopeLeft.toFixed(3)} / ${slopeRight.toFixed(3)})`);

/*
 * Version sans texte, affichée quand le texte de la feuille est modifié dans /admin (il est alors écrit en HTML).
 * Le texte est tout ce qui est enclos dans le crème de la feuille : on repère le crème connexe, puis ce qui est
 * relié aux bords de l'image (contour, bras, pouces) ; le reste est repeint en crème.
 */
const BLANK_OUT = 'src/assets/paper-blank-extended.png';
const PAPER = [0xf2, 0xf0, 0xd8];
const count = outWidth * outHeight;
const isPaper = (p) =>
	out[p * 4 + 3] > 200 &&
	Math.abs(out[p * 4] - PAPER[0]) + Math.abs(out[p * 4 + 1] - PAPER[1]) + Math.abs(out[p * 4 + 2] - PAPER[2]) < 40;

// Parcours en largeur (4-connexité) depuis `seeds`, à travers les pixels acceptés par `pass`
function flood(seeds, pass, mark) {
	const queue = new Int32Array(count);
	let head = 0;
	let tail = 0;
	for (const p of seeds) {
		if (!mark[p] && pass(p)) {
			mark[p] = 1;
			queue[tail++] = p;
		}
	}
	while (head < tail) {
		const p = queue[head++];
		const x = p % outWidth;
		for (const q of [x > 0 ? p - 1 : -1, x < outWidth - 1 ? p + 1 : -1, p - outWidth, p + outWidth]) {
			if (q >= 0 && q < count && !mark[q] && pass(q)) {
				mark[q] = 1;
				queue[tail++] = q;
			}
		}
	}
}

// Point de départ : un pixel crème entouré de crème, en haut au centre de la feuille
let seed = -1;
for (let y = 200; y < outHeight && seed < 0; y++) {
	const p = y * outWidth + Math.round(outWidth / 2);
	if ([0, 3, -3, 3 * outWidth, -3 * outWidth].every((d) => isPaper(p + d))) seed = p;
}

const paper = new Uint8Array(count);
flood([seed], isPaper, paper);

const outside = new Uint8Array(count);
const border = [];
for (let x = 0; x < outWidth; x++) border.push(x, (outHeight - 1) * outWidth + x);
for (let y = 0; y < outHeight; y++) border.push(y * outWidth, y * outWidth + outWidth - 1);
flood(border, (p) => !paper[p], outside);

const blank = Buffer.from(out);
let textBox = { left: outWidth, top: outHeight, right: 0, bottom: 0 };
for (let p = 0; p < count; p++) {
	if (paper[p] || outside[p]) continue;
	blank[p * 4] = PAPER[0];
	blank[p * 4 + 1] = PAPER[1];
	blank[p * 4 + 2] = PAPER[2];
	blank[p * 4 + 3] = 255;
	const x = p % outWidth;
	const y = Math.floor(p / outWidth);
	textBox = {
		left: Math.min(textBox.left, x),
		top: Math.min(textBox.top, y),
		right: Math.max(textBox.right, x),
		bottom: Math.max(textBox.bottom, y),
	};
}

await sharp(blank, { raw: { width: outWidth, height: outHeight, channels: 4 } })
	.png({ compressionLevel: 9 })
	.toFile(BLANK_OUT);

console.log(`${BLANK_OUT} : texte effacé dans ${JSON.stringify(textBox)} (px de l'image prolongée)`);
