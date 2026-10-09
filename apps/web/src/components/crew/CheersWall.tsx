/**
 * Mur d'encouragements de la page d'un road trip : les proches laissent un mot, sans compte (prénom + message),
 * les voyageurs le lisent… au bivouac. Les voyageurs peuvent retirer un message. Les limites anti-abus
 * (liens refusés, débit) sont dans la base : public.post_cheer.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toastError, unwrap } from '@/lib/errors';
import { formatRelative } from '@/lib/format';

const NAME_KEY = 'tt-cheer-name';
const readName = () => { try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; } };

export function CheersWall({ crewId, canEdit, isDemo }: { crewId: string; canEdit: boolean; isDemo: boolean }) {
  const queryClient = useQueryClient();
  const key = ['cheers', crewId];
  const { data: cheers = [] } = useQuery({
    queryKey: key,
    refetchInterval: 60_000,
    queryFn: async () => unwrap(await supabase.from('cheers').select('id, author_name, message, created_at').eq('crew_id', crewId).order('created_at', { ascending: false }).limit(30)),
  });
  // Nouveaux messages en direct.
  useEffect(() => {
    const channel = supabase
      .channel(`cheers-${crewId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cheers', filter: `crew_id=eq.${crewId}` }, () => void queryClient.invalidateQueries({ queryKey: key }))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crewId, queryClient]);

  const [name, setName] = useState(readName);
  const [message, setMessage] = useState('');
  const post = useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('post_cheer', { p_crew: crewId, p_name: name, p_message: message })),
    onSuccess: () => {
      try { localStorage.setItem(NAME_KEY, name.trim()); } catch { /* stockage indisponible */ }
      setMessage('');
      toast.success('Ton mot est sur le mur. Merci !');
      void queryClient.invalidateQueries({ queryKey: key });
    },
    onError: toastError,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('cheers').delete().eq('id', id)),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
    onError: toastError,
  });

  return (
    <div className="flex flex-col gap-3.5 rounded-[28px] bg-ink-800 p-6">
      <span className="font-mono text-[13px] text-dust-400">mur d’encouragements{cheers.length ? ` · ${cheers.length}` : ''}</span>
      <span className="tt-display text-[26px] leading-[1.1] text-cream">Laisse un mot aux voyageurs, ils le liront au bivouac.</span>
      {!isDemo && (
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); post.mutate(); }} className="flex flex-col gap-2">
          <Input aria-label="Ton prénom" placeholder="Ton prénom" maxLength={40} required value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex gap-2">
            <Input aria-label="Ton message" placeholder="Courage pour le col !" maxLength={280} required value={message} onChange={(e) => setMessage(e.target.value)} />
            <Button type="submit" variant="secondary" className="min-h-14" disabled={post.isPending || !name.trim() || !message.trim()}>Envoyer</Button>
          </div>
        </form>
      )}
      {cheers.length > 0 ? (
        <ul className="m-0 flex max-h-[360px] list-none flex-col gap-2 overflow-y-auto p-0">
          {cheers.map((c) => (
            <li key={c.id} className="flex gap-3 rounded-2xl bg-ink px-4 py-3">
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[16px] leading-snug text-cream [overflow-wrap:anywhere]">{c.message}</span>
                <span className="font-mono text-[12px] text-dust-400">{c.author_name} · {formatRelative(c.created_at)}</span>
              </span>
              {canEdit && (
                <button type="button" onClick={() => { if (confirm('Retirer ce message du mur ?')) remove.mutate(c.id); }} aria-label={`Retirer le message de ${c.author_name}`}
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-xl text-dust-400 hover:bg-ink-700 hover:text-cream">
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-[15px] text-dust-400">{isDemo ? 'Sur un vrai road trip, les proches laissent leurs mots ici.' : 'Sois le premier à leur souhaiter bonne route !'}</p>
      )}
    </div>
  );
}
