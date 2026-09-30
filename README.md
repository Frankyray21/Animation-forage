# Clam sous tension

Animation 3D de formation sur le **mandrin Boyles H** (UM-070-142AA, Usinage Marcotte) d'une tête de forage. Elle montre l'énergie emmagasinée dans ses 18 ressorts, et ce qui arrive quand la séquence de démontage de la procédure **PRO-OP-DD-005** n'est pas respectée.

Ouvrir `index.html` dans un navigateur récent. Une connexion Internet est requise : Three.js et les polices sont chargés depuis un CDN.

## Modèle 3D

Sources : liste de pièces, coupe A-A et vue éclatée du mandrin Boyles H (pages 2.5 à 2.7 du manuel de la tête de forage). Toutes les pièces de la liste sont modélisées avec leurs quantités. Le bouton **Vue éclatée** les dispose le long de l'axe, comme sur le dessin. La **nomenclature** de la page permet de cliquer une pièce pour l'identifier ; on peut aussi la cliquer dans la vue 3D.

| Groupe | Pièces |
| --- | --- |
| Arrière | Clés 3506881 (×3), ressort de verrouillage 3506879, anneau de retenue 5054078, bague d'appui 3506882, roulement 5000199, goupilles 5222624 (×4), piston 3506908 + 5035015 + 5035017, manchon d'actionnement 3506928, adaptateur UM-070-608A + B500-1500 (×8) + W500 (×8), cylindre 3506909 + 5035016 + 5035018, joint en V 5041022, B500-4500 (×10) + NC500 (×10), raccord 2501-8-6, graisseur ZNPT250 |
| Boîtier | 3506870 |
| Avant | Entretoises inférieures 3506880 (×9), joints d'huile 5040192 (×9), ressorts 5200517 (×18), cône / bol 2920390, entretoises supérieures 3506878 (×3), B500-6500 (×6), B500-8000 (×3), porte-capuchon 3506906 + B500-2250 (×9), adaptateur de capuchon 3506907 + B750-1500 (×3), mâchoires UM-021-01-03 H |
| Options | Adaptateur 3506910 (tête UM-012), mâchoires UM-021-01-01 B, -02 N, -04 BW, anneau WH-500, bagues de guidage UM-021-06 (BW, B, N, H) |

Les cotes de référence viennent de la coupe A-A : Ø 12 ⅛ po (308 mm), alésage Ø 3 ⅞ po (98 mm). Les cercles de boulons sont mesurés sur la vue de face. Le dessin n'est pas à l'échelle (N.T.S.) : les autres cotes sont relevées sur la coupe. Certaines pièces internes sont marquées « emplacement approximatif » dans la nomenclature.

Correspondance avec la procédure :

- Étape 4 : couvert des mâchoires = adaptateur de capuchon 3506907, boulons ¾ × 1 ½ (B750-1500), clé 1 1/8. La procédure parle de 6 boulons ; la liste de pièces en compte 3.
- Étape 5 : couvercle = porte-capuchon 3506906, 9 boulons ½ × 2 ¼ (B500-2250), clé ¾. Ce sont aussi les 9 boulons neufs des étapes 12 et 13.
- Étape 6 : 3 boulons ½ × 8 (B500-8000) et leurs bushings (entretoises supérieures 3506878), remis sans bushing. 8 po = 6 ½ po + 1 ½ po d'entretoise.
- Étape 7 : 6 boulons ½ × 6 ½ (B500-6500), 1 tour à la fois, ordre 1 à 6.

Les 9 boulons du cône traversent le voile du boîtier (entretoises inférieures 3506880 et joints 5040192) et se vissent dans le manchon d'actionnement 3506928. Ce sont eux qui retiennent le cône contre les 18 ressorts.

## Scénarios

| Scénario | Ce qui est montré |
| --- | --- |
| Procédure respectée | Étapes 1 à 9. L'énergie des ressorts descend graduellement à 0. |
| Erreur : boulons retirés un par un | Étapes 6 et 7 non respectées. Le dernier boulon porte toute la force, son filet cède et le cône est projeté. |
| Erreur rattrapée par la retenue | Même erreur, mais l'étape 6 a été faite. Les 3 boulons remis sans bushing arrêtent le cône après quelques millimètres. |
| Erreur : cône coincé, sans retenue | Étape 6 omise. Le cône reste coincé, puis se décoince d'un coup et est projeté. |

## Commandes

- Lecture / pause : bouton jaune ou barre d'espace. Étape précédente / suivante : flèches.
- **Coupe** : montre l'intérieur du mandrin (ressorts, boulons, voile, manchon, piston, roulement).
- **Vue éclatée** : toutes les pièces séparées, avec leur numéro.
- **SI / Impérial** : énergie en J ou en pi·lb, force en kN ou en lbf, compression en mm ou en po, vitesse en m/s ou en pi/s. Les équivalences (masse lâchée d'une hauteur, tonnes) sont données dans les deux systèmes.

## Physique utilisée (estimations)

- Énergie des ressorts : `E = n × ½ k x²` ; force : `F = n × k x`.
- Nombre de ressorts : 18, selon la liste de pièces. Compression : 6,35 mm (¼ po), selon la procédure.
- La **raideur du ressort 5200517 n'est pas dans les documents**. Valeur d'exemple : 100 N/mm (571 lbf/po). Résultat : environ 36 J (27 pi·lb) et 11,4 kN (2 570 lbf). Entrez la valeur de la fiche du ressort dans « Paramètres des ressorts » pour un calcul réel.
- Masse projetée : 22 kg (49 lb), celle du cône et des mâchoires du modèle en acier.
- Position du cône : plan retenu par les boulons encore engagés (pas ½-13 UNC, 1 tour = 1,95 mm), qui minimise l'énergie des ressorts. Le basculement est limité, parce que le cône est guidé dans le boîtier.
- Projection : vitesse de départ `v = √(2E/m)`, trajectoire balistique, ralentie ×6 à l'écran.
- La course des ressorts est amplifiée ×6 à l'écran pour être visible.
