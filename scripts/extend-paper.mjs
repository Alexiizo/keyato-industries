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
