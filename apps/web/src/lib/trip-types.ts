/** Types de voyage proposés à la création d'un road trip (colonne crews.trip_type). */
export const TRIP_TYPES = [
  { id: 'van', label: 'En van', hint: 'camping-car, bivouac' },
  { id: 'voiture', label: 'En voiture', hint: 'road trip classique' },
  { id: 'moto', label: 'À moto', hint: 'cols et virages' },
  { id: 'raid', label: 'Raid ou rallye', hint: 'avec sponsors' },
  { id: 'groupe', label: 'Entre amis', hint: 'à plusieurs' },
  { id: 'monde', label: 'Tour du monde', hint: 'des mois de route' },
] as const;
export type TripType = (typeof TRIP_TYPES)[number]['id'];
