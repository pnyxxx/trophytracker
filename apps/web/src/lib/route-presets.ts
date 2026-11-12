/**
 * Itinéraires tout prêts des raids connus : proposés dans le guide « Prêt au départ » (étape « Itinéraire ») aux
 * road trips de type « Raid ou rallye ». Un geste ajoute toutes les étapes (sans dates : le voyageur les complète,
 * et les nuits réelles sont repérées par le GPS). Pour ajouter un raid : une entrée de plus ici.
 *
 * 4L Trophy : étapes validées par Julien (ancien participant) en septembre 2026, coordonnées reprises de la
 * migration 20260929000002_parcours_2027. Le nom est affiché à sa demande (exception à la règle du pivot, 2026-11-12).
 */
import type { TripStage } from '@/lib/supabase';

export interface PresetStage {
  kind: TripStage['kind'];
  name: string;
  place: string;
  lat: number;
  lon: number;
  note: string;
}

export interface RoutePreset {
  id: string;
  name: string;
  /** Une ligne : départ → arrivée, durée. */
  summary: string;
  from: string;
  to: string;
  stages: PresetStage[];
}

export const ROUTE_PRESETS: RoutePreset[] = [
  {
    id: '4l-trophy',
    name: '4L Trophy',
    summary: 'Biarritz → Marrakech · 7 étapes · une douzaine de jours',
    from: 'Biarritz',
    to: 'Marrakech',
    stages: [
      { kind: 'start', name: 'Départ de Biarritz', place: 'Biarritz', lat: 43.46484, lon: -1.53571, note: 'J1-2 : village départ.' },
      { kind: 'night', name: 'Nuit à Salamanque', place: 'Salamanque', lat: 40.96821, lon: -5.66642, note: 'J3 : première nuit.' },
      { kind: 'night', name: 'Bivouac à Algésiras', place: 'Algésiras', lat: 36.21315, lon: -5.41098, note: 'J4 : bivouac avant la traversée.' },
      { kind: 'stop', name: 'Arrivée au Maroc', place: 'Tanger Med', lat: 35.87604, lon: -5.51333, note: 'J5 : traversée du détroit.' },
      { kind: 'night', name: 'Bivouac de Boulajoul', place: 'Boulajoul', lat: 32.88438, lon: -4.98768, note: 'J5 : bivouac du Moyen Atlas.' },
      { kind: 'highlight', name: 'Merzouga et le désert', place: 'Merzouga', lat: 31.21516, lon: -3.99763, note: 'J6 : arrivée ; J7-8 : boucles dans le désert.' },
      { kind: 'finish', name: 'Arrivée à Marrakech', place: 'Marrakech', lat: 31.58108, lon: -7.98231, note: 'J9-10 : étape marathon, puis arrivée ; J11 : remise des prix.' },
    ],
  },
];
