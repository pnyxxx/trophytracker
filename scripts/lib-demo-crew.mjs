/**
 * Contenu de l'équipage de DÉMONSTRATION « J4L Club » (le seul équipage d'exemple du site).
 * Utilisé par seed-demo.mjs (création en local) et demo-refresh.mjs (mise à jour, en production
 * aussi). Sa trace n'est pas ici : le service tracker lui fait rejouer son trajet en boucle
 * (apps/tracker/src/demo.ts).
 */
export const DEMO_SLUG = 'j4l-club';

export const DEMO_CREW = {
  name: 'J4L Club',
  car_number: '1234',
  city: 'Saint-Quentin',
  start_lat: 49.84737,
  start_lon: 3.28757,
  start_region: 'Hauts-de-France',
  school: 'Epitech Lille',
  tagline: 'Deux étudiants, une 4L, 6 000 km de solidarité.',
  story: `Tout a commencé autour d'une table, à Saint-Quentin : « Et si on faisait le 4L Trophy ? » Quelques mois plus tard, le J4L Club avait trouvé sa 4L, ses sponsors et ses cartons de fournitures scolaires.

Le voyage commence bien avant la ligne de départ. Depuis Saint-Quentin, nous descendons en plusieurs fois : une première nuit au Mans, une deuxième à Royan, une troisième à Bayonne, puis Biarritz et son village départ. Deux jours de contrôles techniques et administratifs… et c'est parti !

Au programme : Salamanque, Algésiras, le ferry jusqu'à Tanger Med, la traversée du Moyen Atlas, puis les dunes de l'Erg Chebbi à Merzouga. Là-bas commencent les étapes d'orientation : pas de GPS pour se guider, juste un roadbook, une boussole et beaucoup de bonne humeur.

Dans le coffre, des fournitures scolaires et sportives pour l'association Enfants du Désert, qui les distribue aux écoles du sud marocain.

Merci à nos sponsors saint-quentinois, à nos familles et à vous tous qui nous suivez ici, kilomètre après kilomètre !`,
  current_rank: 214,
  supplies_count: 68,
  is_public: true,
  is_demo: true,
};
