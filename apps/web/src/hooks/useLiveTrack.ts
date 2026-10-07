/**
 * Trace GPS d'un road trip, mise à jour EN DIRECT.
 *
 * 1. Charge toute la trace une fois (get_track).
 * 2. S'abonne en temps réel (Supabase Realtime) aux changements du road trip :
 *    à chaque nouvelle position reçue par le serveur, on ne télécharge QUE les
 *    nouveaux points (paramètre p_since) → très économe en données mobiles.
 * 3. Filet de sécurité : rafraîchissement toutes les 2 minutes (connexion instable).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, type Crew } from '@/lib/supabase';
import { keys } from './queries';

/** [lat, lon, timestamp (s), vitesse km/h | null, altitude m | null (absente des anciennes réponses)] */
export type TrackPoint = [number, number, number, number | null, (number | null)?];

export function useLiveTrack(crew: Crew | null | undefined) {
  const queryClient = useQueryClient();
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pointsRef = useRef<TrackPoint[]>([]);
  const inFlight = useRef(false);
  const crewId = crew?.id;

  const fetchNew = useCallback(async () => {
    if (!crewId || inFlight.current) return;
    inFlight.current = true;
    try {
      const last = pointsRef.current.at(-1);
      const { data, error } = await supabase.rpc('get_track', {
        p_crew: crewId,
        p_since: last ? new Date(last[2] * 1000).toISOString() : undefined,
      });
      if (error) throw error;
      const fresh = (data as unknown as TrackPoint[]) ?? [];
      if (fresh.length) {
        pointsRef.current = [...pointsRef.current, ...fresh];
        setPoints(pointsRef.current);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement de la trace');
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [crewId]);

  useEffect(() => {
    if (!crewId) return;
    pointsRef.current = [];
    setPoints([]);
    setLoading(true);
    void fetchNew();

    const channel = supabase
      .channel(`crew-live-${crewId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'crews', filter: `id=eq.${crewId}` },
        (payload) => {
          const updated = payload.new as Crew;
          // Trace effacée (remise à zéro par l'équipage, nouveau tour du road trip de démo) :
          // on repart de zéro au lieu de relier l'ancienne trace à la nouvelle.
          const before = queryClient.getQueryData<Crew | null>(keys.crew(updated.slug));
          if (before && updated.total_distance_m < before.total_distance_m) {
            pointsRef.current = [];
            setPoints([]);
          }
          // Met à jour la position « en direct » partout sur la page, sans recharger.
          queryClient.setQueryData(keys.crew(updated.slug), (old: Crew | null | undefined) =>
            old ? { ...old, ...updated } : old,
          );
          void queryClient.invalidateQueries({ queryKey: keys.stats(crewId) });
          void fetchNew();
        },
      )
      .subscribe();

    const interval = setInterval(fetchNew, 120_000);
    return () => {
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [crewId, fetchNew, queryClient]);

  return { points, loading, error };
}
