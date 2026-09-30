# Clam sous tension

Animation 3D de formation : ce que font les ressorts d'un clam (chuck / mandrin) de foreuse quand la séquence de démontage de la procédure **PRO-OP-DD-005** n'est pas respectée.

Ouvrir `index.html` dans un navigateur récent (connexion Internet requise : Three.js et les polices sont chargés depuis un CDN).

## Scénarios

| Scénario | Ce qui est montré |
| --- | --- |
| Procédure respectée | Étapes 1 à 9. Les 3 boulons avec bushing sont remis sans bushing (retenue), puis les 6 autres sont dévissés 1 tour à la fois dans l'ordre 1 à 6. L'énergie des ressorts descend graduellement à 0. |
| Erreur : boulons retirés un par un | Étape 6 omise et étape 7 non respectée. Les boulons sont sortis au complet un à la fois ; le dernier porte toute la force des ressorts, son filet cède et le cône est projeté. |
| Erreur : cône coincé, sans retenue | Étape 6 omise. Le cône reste coincé pendant le desserrage : les boulons ne portent rien, mais les ressorts sont toujours comprimés. Il se décoince d'un coup et est projeté. |

## Commandes

- Lecture / pause : bouton jaune ou barre d'espace. Étape précédente / suivante : flèches.
- « Pause à chaque étape » arrête l'animation entre les étapes pour laisser le formateur commenter.
- Glisser dans la vue pour tourner la caméra ; « Recentrer la caméra » revient au cadrage automatique.

## Physique utilisée (estimations)

- Énergie des ressorts : `E = n × ½ k x²` ; force : `F = n × k x`.
- Valeurs par défaut indicatives : 12 ressorts, 200 N/mm, compression de 6,35 mm (¼ po, selon la procédure), cône de 12 kg → environ 48 J et 15 kN. Elles se modifient dans « Paramètres des ressorts » ; utilisez les données du fabricant pour un calcul réel.
- Position du cône : plan retenu par les boulons encore engagés (pas ½-13 UNC, 1 tour = 1,95 mm), qui minimise l'énergie des ressorts. Le basculement est limité parce que le cône est guidé dans son logement.
- Projection : vitesse de départ `v = √(2E/m)`, trajectoire balistique ; ralentie ×6 à l'écran.
- La course des ressorts est amplifiée ×6 à l'écran pour être visible.
