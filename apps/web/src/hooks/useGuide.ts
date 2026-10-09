/**
 * Avancement du guide « Prêt au départ » (espace voyageur) : 8 étapes et leurs cases, cochées d'après les
 * données du road trip, ou à la main (gardées sur cet appareil) pour ce qui ne se voit pas dans les données.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, type Crew } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import { keys, useCrewMembers, useSponsors, useStages } from './queries';

export type GuideStepId = 'voyage' | 'equipage' | 'vehicule' | 'itineraire' | 'gps' | 'partage' | 'sponsors' | 'checklist';

interface Item { id: string; t: string; d: string; done: boolean; manual?: boolean }
interface Step { id: GuideStepId; label: string; title: string; intro: string; items: Item[] }

const manualKey = (crewId: string) => `tt-guide-${crewId}`;
function readManual(crewId: string): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(manualKey(crewId)) ?? '{}') as Record<string, boolean>;
  } catch {
    return {};
  }
}

/** Toutes les étapes du guide et leur avancement, calculés d'après les données du road trip. */
export function useGuide(crew: Crew) {
  const { data: members = [] } = useCrewMembers(crew.id);
  const { data: sponsors = [] } = useSponsors(crew.id);
  const { data: stages = [] } = useStages(crew.id);
  const { data: tracking } = useQuery({
    queryKey: keys.tracking(crew.id),
    queryFn: async () => unwrap(await supabase.rpc('get_crew_tracking', { p_crew: crew.id }))[0] ?? null,
  });
  const { data: testFix } = useQuery({
    queryKey: ['gps-test', crew.id],
    queryFn: async () => unwrap(await supabase.from('gps_test_fixes').select('recorded_at').eq('crew_id', crew.id).maybeSingle()),
  });
  const [manual, setManual] = useState(() => readManual(crew.id));
  const toggle = (id: string) => {
    const next = { ...manual, [id]: !manual[id] };
    setManual(next);
    try { localStorage.setItem(manualKey(crew.id), JSON.stringify(next)); } catch { /* stockage indisponible */ }
  };
  const m = (id: string, t: string, d: string): Item => ({ id, t, d, done: !!manual[id], manual: true });
  const signal = !!testFix || !!crew.last_fix_at;
  const visibility = !crew.is_public ? 'voyageurs seulement' : crew.is_listed ? 'public' : 'privé, accès par lien';

  const steps: Step[] = [
    { id: 'voyage', label: 'Voyage', title: 'Ton voyage', intro: 'Le nom, les dates et la photo que verront tes proches en ouvrant le lien.', items: [
      { id: 'name', t: 'Nom du road trip', d: crew.name, done: crew.name.trim().length >= 2 },
      { id: 'dates', t: 'Dates', d: crew.starts_on ? 'départ fixé' : 'le suivi se lance tout seul le jour J', done: !!crew.starts_on },
      { id: 'cover', t: 'Photo de couverture', d: 'format paysage conseillé', done: !!crew.cover_path },
      { id: 'privacy', t: 'Confidentialité', d: visibility, done: true },
    ] },
    { id: 'equipage', label: 'Équipage', title: 'Ton équipage', intro: 'Invite tes compagnons de route : chacun pourra publier des photos et écrire dans le journal, gratuitement.', items: [
      { id: 'invite', t: 'Inviter les coéquipiers', d: members.length > 1 ? `${members.length} voyageurs` : 'facultatif, si tu ne pars pas seul', done: members.length > 1 },
      m('contact', 'Un proche sait où tu vas', 'quelqu’un à prévenir en cas de souci'),
    ] },
    { id: 'vehicule', label: 'Véhicule', title: 'Ton véhicule', intro: 'Un téléphone dans le véhicule suffit pour le suivi. (Plusieurs véhicules sur la même carte : bientôt.)', items: [
      { id: 'phone', t: 'Choisir le téléphone du véhicule', d: tracking?.has_device_key ? 'téléphone relié' : 'celui qui restera à bord', done: !!tracking?.has_device_key },
      m('mount', 'Support téléphone fixé', 'visible et ventilé'),
      m('power', 'Prévoir l’alimentation', 'câble allume-cigare ou batterie externe'),
    ] },
    { id: 'itineraire', label: 'Itinéraire', title: 'Ton itinéraire', intro: 'Facultatif : la trace s’écrit en roulant. Mais quelques étapes aident tes proches à suivre.', items: [
      { id: 'from', t: 'Point de départ', d: crew.city ?? 'à indiquer dans « Réglages »', done: !!crew.city },
      { id: 'stages', t: 'Étapes prévues', d: stages.length ? `${stages.length} étape${stages.length > 1 ? 's' : ''}` : 'ajoute-les ou importe un GPX', done: stages.length > 0 },
      { id: 'to', t: 'Point d’arrivée', d: crew.destination ?? 'à indiquer dans « Réglages »', done: !!crew.destination },
    ] },
    { id: 'gps', label: 'Suivi GPS', title: 'Le suivi GPS', intro: 'Installe l’application gratuite sur le téléphone du véhicule, puis teste le signal.', items: [
      { id: 'charter', t: 'Accepter la charte du voyageur', d: 'les règles du partage de position', done: !!tracking?.fair_play_accepted_at },
      { id: 'app', t: 'Installer et régler l’application', d: 'un QR code règle tout d’un coup', done: !!tracking?.has_device_key },
      { id: 'test', t: 'Tester le signal', d: signal ? 'une position est arrivée' : 'une position doit apparaître', done: signal },
      m('always', 'Autoriser la localisation « toujours »', 'sinon le suivi s’arrête écran éteint'),
    ] },
    { id: 'partage', label: 'Partage', title: 'Partager le lien', intro: 'Un seul lien privé, pour tous ceux qui te suivent. Imprime aussi l’autocollant pour le véhicule.', items: [
      { id: 'shared', t: 'Envoyer le lien', d: 'par message ou par e-mail', done: !!crew.shared_at },
      m('grandparents', 'Prévenir les grands-parents', 'ils adorent, et n’ont besoin d’aucun compte'),
      m('sticker', 'Imprimer l’autocollant QR', 'à coller sur le véhicule'),
    ] },
    { id: 'sponsors', label: 'Sponsors & cagnotte', title: 'Sponsors et cagnotte', intro: 'Mets en avant ceux qui te soutiennent, et ajoute le lien de ta cagnotte. Tout est facultatif.', items: [
      { id: 'sponsors', t: 'Ajouter les sponsors', d: sponsors.length ? `${sponsors.length} sponsor${sponsors.length > 1 ? 's' : ''}` : 'logos, sur la page et la carte', done: sponsors.length > 0 },
      { id: 'fund', t: 'Lien de la cagnotte', d: crew.fundraiser_url ? 'bouton « Participer » affiché' : 'Leetchi, HelloAsso, Lydia…', done: !!crew.fundraiser_url },
    ] },
    { id: 'checklist', label: 'Check-list', title: 'La check-list du départ', intro: 'Les derniers réflexes avant de tourner la clé.', items: [
      m('battery', 'Batterie externe chargée', '20 000 mAh conseillés'),
      { id: 'signal-today', t: 'Signal testé', d: signal ? 'le téléphone répond' : 'voir « Suivi GPS »', done: signal },
      { id: 'link-sent', t: 'Lien envoyé aux proches', d: crew.shared_at ? 'c’est fait' : 'voir « Partage »', done: !!crew.shared_at },
      m('fuel', 'Plein fait', ''),
    ] },
  ];
  const all = steps.flatMap((s) => s.items);
  const done = all.filter((i) => i.done).length;
  const stepsDone = steps.filter((s) => s.items.every((i) => i.done)).length;
  return { steps, done, total: all.length, stepsDone, toggle, fairPlayOk: !!tracking?.fair_play_accepted_at };
}
