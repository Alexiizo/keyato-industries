# Maquette — relevés

Référence : [design/maquette-1920.png](../design/maquette-1920.png) (1920 × 4294, sans la barre du navigateur).
Toutes les coordonnées sont en px maquette, origine en haut à gauche de la page. `x0→x1 × y0→y1` = boîte extérieure.
Couleurs échantillonnées au pixel (les fonds aquarelle sont des textures : la valeur donnée est la teinte moyenne).

## Découpage vertical

| Zone | y | Hauteur |
|---|---|---|
| Hero rose | 0 → 1150 | 1150 |
| Liseré blanc | 1150 → 1157 | 7 |
| Section violette | 1158 → 3971 | 2814 |
| Footer foule | 3972 → 4294 (fin de la capture) | ≥ 322 |

À 1920×1080, le viewport utile fait ~920 px de haut : appliquée à l'échelle 1:1, la maquette met les boutons du hero (y 957) sous la ligne de flottaison et paraît trop grosse.
L'intégration garde la composition pleine largeur de la maquette mais réduit les éléments surdimensionnés et resserre les espacements verticaux (voir « Adaptation » plus bas).

## Hero (fond aquarelle rose, #ffc2e7 sur les bords → #ffe5f5 au centre, tache blanche entre les deux boutons)

- **Titre** « Apprends a faire des visuels et a les ameliorer » — 2 lignes centrées.
  Remplissage `#260c69` : 368→1551 × 39→186. Contour blanc ~6 px : 362→1557 × 33→192. Coupure de ligne vers y 108.
- **Cadre vidéo** : 478→1442 × 222→767 (965 × 546, ≈ 16:9), bordure noire 7 px, rayon ~45 px, intérieur transparent. Centré (x 960).
- **Personnage** (Keyato en costume, bras tendus vers la vidéo) : ~0→450 × 220→905, ombre ovale violette sous les pieds, un billet sous le pied droit, pile de billets verts coupée par le bord gauche.
- **Panneaux en bois** : 1480→1920 × 211→919. Barre horizontale avec boule à gauche, sortant par le bord droit. Deux pancartes suspendues par des cordes : « 3 Étapes » et « 11 Vidéos pour apprendre ma techique » (texte dessiné dans l'image, faute « techique »).
- **Boutons** (pilule, texte blanc, police display) :
  - Pack Basique `#9268f2` : 473→901 × 957→1074 (429 × 118)
  - Pack Plus + `#edce00` : 1009→1437 × 959→1072 (429 × 114)
  - Écart 108 px. Centre du groupe à x 955 (5 px à gauche de l'axe : probablement une imprécision).
- **Boîtes de pack** derrière les boutons : haut à y ~800, bas masqué par le bouton. Basique = 1 boîte violette, Plus = boîte violette + boîte rose « ++ » devant.

## Section violette (fond aquarelle #8b62eb → #956eed)

- **Titre** « Qu'y a t-il dans ces videos ? » — même style que le hero, 1 ligne. Contour blanc : 363→1551 × 1305→1411.
- **Papier** tenu par deux bras : papier `#f2f0d8`, contour `#1a1a1a`, remplissage 231→1694 × 1500→3162, coins cornés. Bras peau `#ebb285` entrant par les bords gauche et droit (~y 1930→2420), contours à 151 et 1769.
- **Texte du papier** : police manuscrite grasse (M toujours en capitale), `#1a1a1a`, lignes légèrement penchées/déformées comme le papier.
- **Cartes** (708 × 511, bordure 8 px, rayon ~75 px), haut y 3201, bas y 3711, écart 228 px :
  - Basique 144→851 : haut aquarelle lavande `#cbb5ff`, bandeau `#7962e9` (y 3551→3703), bordure `#260c69`
  - Plus + 1079→1786 : haut aquarelle rose `#ffcbeb`, bandeau `#d486b6`, bordure `#3b0024`
  - Libellé blanc en capitales, hauteur de capitale ~73 px (y 3586→3659). La boîte de pack repose derrière le bandeau (bas masqué).
- **Bouton Patreon** : 515→1404 × 3743→3907 (890 × 165), pilule `#ffe5f5`, texte « VOIR LE PATREON » `#563c82`.

## Footer

Motif de foule de personnages Keyato en violet monochrome (base `#563c82`, traits `#392856`, reflets `#c5b7de`, quelques éléments blancs : crânes, cerveaux qui explosent). Bord supérieur découpé par les têtes.

## Placement des assets

Trouvé par correspondance d'image sur la maquette (échelle = taille affichée / taille du fichier). Positions en coordonnées page.

| Fichier | Rôle | Échelle | x, y | Taille affichée |
|---|---|---|---|---|
| Sector.01.png | fond du hero | 0.741 | 0, 5 | 1920 × 1215 (rogné en bas) |
| Sector.02.png | fond de la section violette | 1.102 | 0, 1154 | 1920 × 2821 |
| KeyaMoney.png | personnage + billets | 0.272 | 0, 223 | 452.6 × 662 |
| Sign.png | panneaux | 0.299 | 1480, 211 | 440.1 × 722 |
| Pack.01.png | boîte du bouton Basique | 0.197 | 600, 802 | 248.2 × 264 |
| Pack.01.png + Pack.02.png | boîtes du bouton Plus (assemblage, pas Pack.03) | 0.197 / 0.132 | 1093, 802 / 1208, 851 | 248.2 / 166.3 de large |
| Paper.png | papier + bras (texte intégré à l'image) ; intégré via paper-extended.png, bras prolongés de 460px source de chaque côté | 0.749 | 0, 1486 | 1920 × 1688 |
| Pack.01.png | boîte de la carte Basique | 0.283 | 358, 3258 | 356.6 × 380 |
| Pack.03.png | boîtes de la carte Plus | 0.270 | 1268, 3251 | 340.2 × 362 |
| Bottom.png | foule du footer | 0.745 | 0, 3972 | 1920 × 1080 (rogné à 322) |

Les 5 premiers px de la page sont un aplat `#ffe5f5` (le fond rose commence à y 5).

## Textes (police d'affichage)

Hauteurs de capitale relevées, qui servent à calculer la taille de police (`taille = capitale / --fd-cap`) :

| Texte | Haut des capitales | Capitale | Interligne |
|---|---|---|---|
| Titre hero (2 lignes) | 39 | 66 | 82 |
| Titre violet | 1312 | ~76 | — |
| Boutons hero | 988 (32 sous le haut du bouton) | 47 | — |
| Libellés des cartes | 3587 (35 sous le haut du bandeau) | 65 | — |
| Patreon | 3790 (47 sous le haut du bouton) | 72 | — |

Le texte des boutons du hero est décalé de ~9,5 px vers la droite par rapport au centre du bouton (reproduit).

## Couleurs (fiche Hexcode.png)

`#260c69` titres · `#7962e9` bouton Basique du hero + bandeau carte Basique · `#edce00` bouton Plus · `#d486b6` bandeau carte Plus · `#ffe5f5` fond du bouton Patreon · `#563c82` texte Patreon.
Écart : dans la maquette, le bouton Basique du hero est rendu en `#9268f2` alors que la fiche indique `#7962e9`. C'est la fiche qui est appliquée (`--c-basique`).

## Animations demandées

- Parallaxe un peu partout ; la section violette passe **par-dessus** le hero rose au scroll.
- Hover des boutons/cartes : le bouton grossit très légèrement et la boîte de pack derrière monte un peu.

## Manque / à confirmer avec Keyato

- La police d'affichage (titres, boutons, cartes) : ressemble à Burbank Big Condensed Black, police commerciale. Londrina Solid la remplace en attendant.
- Les textures aquarelle de l'intérieur des cartes (approchées en dégradés CSS).
- Accents : absents des titres de la maquette, ajoutés dans l'intégration.
- Faute « techique » dans l'image des panneaux.
- Pas de maquette mobile.
- Vidéo YouTube et liens des boutons (`src/config.ts`).
- `Pack.03.png` sert pour la carte Plus ; dans le hero, la maquette utilise l'assemblage Pack.01 + Pack.02.

## Adaptation (ce qui diffère volontairement de la maquette)

La maquette en 1:1 est trop grosse sur un écran 1080p (hero de 1150px pour ~920px visibles, boutons énormes).
La composition pleine largeur est conservée, les positions horizontales aussi ; les éléments surdimensionnés sont réduits et les espacements verticaux resserrés.
Coordonnées en px maquette (page de 1920 de large), relatives à la section.

| Élément | Réduction | Position / taille |
|---|---|---|
| Hero | — | hauteur 960 (au lieu de 1150) |
| Titre hero | 70 % | haut des capitales 45, police 64.4 |
| Vidéo | 900 × 509 | 510, 205 (57 px sous le titre) |
| Personnage | 80 % | 0, 206, largeur 362.1 |
| Panneaux | 80 % | collés à droite, haut 195, largeur 352.1 |
| Boutons + boîtes du hero | 55 % | groupe en 690.1, 769, 55 px sous la vidéo (centre x 955.5 comme la maquette) |
| Section violette | — | hauteur 2125 (au lieu de 2822) |
| Titre violet | 70 % | haut des capitales 128, police 74.2 |
| Papier | 75 % | haut 280 (≈100 px sous le titre), centré (version prolongée : −18.55, largeur 1957.1) |
| Cartes | 55 % | groupe en 513.45, 1657, 120 px sous le papier (centre x 965 comme la maquette) |
| Bouton Patreon | 50 % | 737, 1993 (445 × 82.5), 55 px sous les cartes |
| Foule | — | pleine largeur, hauteur 322 |
| Footer (ajout) | — | « Viens me suivre ! » (haut des capitales 44, police 53.4), pilule des réseaux en 108 (pastilles de 92), © en 272 |

Ajouts hors maquette : vidéo YouTube dans l'encart (miniature + bouton lecture, lecteur chargé au clic) et réseaux sociaux dans le footer (YouTube, Twitch, Instagram, Discord, Patreon, repris du Linktree de Keyato).
