import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase, type Crew } from '@/lib/supabase';
import { toastError } from '@/lib/errors';
import { removeCrewFolder } from '@/lib/media';
import { Panel } from './shared';

export function DangerTab({ crew }: { crew: Crew }) {
  const [confirmName, setConfirmName] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const del = useMutation({
    mutationFn: async () => {
      // D'abord les fichiers (tant qu'on a encore les droits sur le dossier), puis l'équipage.
      await removeCrewFolder(crew.id);
      const { error, count } = await supabase.from('crews').delete({ count: 'exact' }).eq('id', crew.id);
      if (error) throw error;
      if (!count) throw new Error('Seul un propriétaire peut supprimer l’équipage');
    },
    onSuccess: () => {
      toast.success('Équipage supprimé');
      void queryClient.invalidateQueries({ queryKey: ['my-crews'] });
      navigate('/mon-compte');
    },
    onError: toastError,
  });

  return (
    <Panel title="Supprimer l’équipage" description="Supprime définitivement la page, la trace GPS, les photos et les sponsors. Irréversible.">
      <p className="mb-2 text-sm text-white/70">Pour confirmer, tapez le nom de l’équipage : <strong className="text-white">{crew.name}</strong></p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} aria-label="Nom de l'équipage pour confirmer" />
        <Button variant="destructive" disabled={confirmName !== crew.name || del.isPending} onClick={() => del.mutate()}>
          {del.isPending ? 'Suppression…' : 'Supprimer définitivement'}
        </Button>
      </div>
    </Panel>
  );
}
