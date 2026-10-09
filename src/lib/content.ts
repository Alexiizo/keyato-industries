/*
 * Ce qui est modifiable depuis /admin, en dehors des liens : textes et images de la page.
 * Les éléments correspondants portent data-text="<clé>" (textes) ou data-slot="<clé>" (images) ;
 * le Worker y applique le contenu enregistré (src/lib/render.ts).
 */

export type TextField = {
	key: string;
	label: string;
	hint?: string;
	max: number;
	multiline?: boolean;
};

export type TextGroup = { title: string; fields: TextField[] };

// Les longueurs max évitent qu'un texte trop long déborde de son bouton ou de l'écran.
export const textGroups: TextGroup[] = [
	{
		title: 'Haut de page',
		fields: [
			{ key: 'heroTitle1', label: 'Titre, ligne 1', max: 36 },
			{ key: 'heroTitle2', label: 'Titre, ligne 2', max: 36 },
			{ key: 'packBasique', label: 'Nom du Pack Basique', hint: 'Sur le bouton du haut et sur la carte du bas.', max: 14 },
			{ key: 'packPlus', label: 'Nom du Pack Plus', hint: 'Sur le bouton du haut et sur la carte du bas.', max: 14 },
		],
	},
	{
		title: 'Milieu de page',
		fields: [
			{ key: 'sectionTitle', label: 'Titre de la section', max: 32 },
			{
				key: 'paperText',
				label: 'Texte de la feuille',
				hint: 'Une ligne vide sépare les paragraphes. Une ligne qui commence par « - » devient un élément de liste. Tant que ce texte n’est pas modifié, la feuille d’origine (texte dessiné) reste affichée.',
				max: 1200,
				multiline: true,
			},
			{ key: 'patreonLabel', label: 'Bouton Patreon', max: 18 },
		],
	},
	{
		title: 'Bas de page',
		fields: [
			{ key: 'followLabel', label: 'Titre au-dessus des réseaux', max: 24 },
			{ key: 'copyrightName', label: 'Nom après le ©', max: 30 },
		],
	},
	{
		title: 'Référencement (Google, partage)',
		fields: [
			{ key: 'seoTitle', label: 'Titre de l’onglet', max: 70 },
			{ key: 'seoDescription', label: 'Description', hint: 'Affichée par Google sous le titre.', max: 160, multiline: true },
		],
	},
];

export const textKeys = textGroups.flatMap((group) => group.fields.map((field) => field.key));

export type ImageSlot = {
	key: string;
	label: string;
	hint: string;
	// Largeurs générées à l'envoi (limitées à la largeur de l'image envoyée)
	widths: number[];
};

export const imageSlots: ImageSlot[] = [
	{ key: 'heroBg', label: 'Fond du haut', hint: 'Aquarelle rose, au moins 2600 px de large.', widths: [1280, 1920, 2600] },
	{ key: 'keyato', label: 'Personnage', hint: 'PNG transparent, environ 1660 × 2430 px.', widths: [400, 800, 1600] },
	{ key: 'signs', label: 'Panneaux', hint: 'PNG transparent, environ 1470 × 2420 px.', widths: [400, 800, 1450] },
	{ key: 'packBasique', label: 'Boîte du Pack Basique', hint: 'PNG transparent, environ 1260 × 1340 px.', widths: [250, 500, 1000] },
	{ key: 'packPlusFront', label: 'Boîte du Pack Plus (bouton du haut)', hint: 'Petite boîte posée devant celle du Pack Basique. PNG transparent.', widths: [180, 360, 700] },
	{ key: 'packDuo', label: 'Boîtes du Pack Plus (carte du bas)', hint: 'Les deux boîtes ensemble. PNG transparent, environ 1260 × 1340 px.', widths: [250, 500, 1000] },
	{ key: 'mainBg', label: 'Fond du milieu', hint: 'Aquarelle violette, au moins 1750 px de large.', widths: [1280, 1920] },
	{ key: 'crowd', label: 'Foule du bas de page', hint: 'Au moins 2600 px de large.', widths: [1280, 1920, 2600] },
];

export const imageSlotKeys = imageSlots.map((slot) => slot.key);
