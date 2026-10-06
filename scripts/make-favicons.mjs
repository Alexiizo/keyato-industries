// Génère les icônes d'onglet à partir du visage de Keyato (design/KeyaMoney.png) :
// pastille rose pour le site, violette pour l'admin, contour bleu nuit.
// Les icônes liées dans les pages vont dans src/assets/icons (importées avec ?url : nom versionné au build,
// les navigateurs ne gardent pas l'ancienne en cache) ; favicon.ico et apple-touch-icon.png restent à la racine.
// Usage : node scripts/make-favicons.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const SIZE = 512;
// Cadrage du visage dans KeyaMoney.png (px source)
const FACE = { left: 450, top: 140, width: 620, height: 620 };
const NAVY = '#260c69';

const icons = [
	{ name: 'favicon', color: '#ffc2e7', touch: true },
	{ name: 'favicon-admin', color: '#7962e9', touch: false },
];

const circle = (fill, stroke = 'none', strokeWidth = 0) =>
	Buffer.from(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">` +
			`<circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${(SIZE - strokeWidth) / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>` +
			`</svg>`,
	);

const face = await sharp('design/KeyaMoney.png').extract(FACE).resize(SIZE, SIZE).toBuffer();

async function master(color) {
	return sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
		.composite([
			{ input: circle(color) },
			{ input: face },
			{ input: circle('none', NAVY, 28) },
			{ input: circle('#000'), blend: 'dest-in' },
		])
		.png()
		.toBuffer();
}

const ICONS = 'src/assets/icons';
await mkdir(ICONS, { recursive: true });

const png = (image, size) => sharp(image).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

// Fichier .ico contenant des images PNG (format accepté par tous les navigateurs actuels)
function ico(images) {
	const header = Buffer.alloc(6 + 16 * images.length);
	header.writeUInt16LE(0, 0);
	header.writeUInt16LE(1, 2);
	header.writeUInt16LE(images.length, 4);
	let offset = header.length;
	images.forEach(({ size, data }, i) => {
		const entry = 6 + 16 * i;
		header.writeUInt8(size >= 256 ? 0 : size, entry);
		header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
		header.writeUInt16LE(1, entry + 4);
		header.writeUInt16LE(32, entry + 6);
		header.writeUInt32LE(data.length, entry + 8);
		header.writeUInt32LE(offset, entry + 12);
		offset += data.length;
	});
	return Buffer.concat([header, ...images.map(({ data }) => data)]);
}

for (const { name, color, touch } of icons) {
	const image = await master(color);
	const sizes = await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(image, size) })));
	await writeFile(`${ICONS}/${name}.ico`, ico(sizes));
	await writeFile(`${ICONS}/${name}.png`, await png(image, 192));
	if (touch) {
		await writeFile('public/favicon.ico', ico(sizes));
		await writeFile('public/apple-touch-icon.png', await png(image, 180));
	}
	console.log(`${ICONS}/${name}.ico, ${ICONS}/${name}.png${touch ? ', public/favicon.ico, public/apple-touch-icon.png' : ''}`);
}
