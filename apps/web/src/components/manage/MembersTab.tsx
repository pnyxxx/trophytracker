import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserMinus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/auth';
import { keys, useCrewMembers, useMyRole } from '@/hooks/queries';
import { supabase, type Crew } from '@/lib/supabase';
import { toastError, unwrap } from '@/lib/errors';
import { Spinner } from '@/components/common/Spinner';
import { Panel } from './shared';

export function MembersTab({ crew }: { crew: Crew }) {
  const { user } = useAuth();
  const { isOwner } = useMyRole(crew.id);
  const { data: members = [], isLoading } = useCrewMembers(crew.id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: keys.members(crew.id) });
    void queryClient.invalidateQueries({ queryKey: ['my-crews'] });
  };

  // Compte existant → ajouté directement ; sinon Supabase envoie l'email d'invitation.
  const add = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<{ status: 'added' | 'invited' }>('invite-member', {
        body: { crewId: crew.id, email: email.trim() },
      });
      if (error) {
        const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
        throw new Error(body?.error ?? error.message);
      }
      return data!.status;
    },
    onSuccess: (status) => {
      toast.success(status === 'added' ? 'Membre ajouté' : `Invitation envoyée à ${email.trim()} ✉️`);
      setEmail('');
      refresh();
    },
    onError: toastError,
  });
  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'owner' | 'member' }) =>
      unwrap(await supabase.rpc('set_crew_member_role', { p_crew: crew.id, p_user: userId, p_role: role })),
    onSuccess: () => { toast.success('Rôle modifié'); refresh(); },
    onError: toastError,
  });
  const remove = useMutation({
    mutationFn: async (userId: string) => unwrap(await supabase.rpc('remove_crew_member', { p_crew: crew.id, p_user: userId })),
    onSuccess: (_d, userId) => {
      refresh();
      if (userId === user?.id) {
        toast.success('Vous avez quitté l’équipage');
        navigate('/mon-compte');
      } else toast.success('Membre retiré');
    },
    onError: toastError,
  });

  return (
    <Panel
      title="Membres de l’équipage"
      description="Les membres peuvent modifier la page, publier des photos et gérer le GPS. Les propriétaires peuvent en plus gérer les membres et supprimer l’équipage."
    >
      {isOwner && (
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); add.mutate(); }} className="mb-6 flex flex-col gap-3 sm:flex-row">
          <Input type="email" required placeholder="Email du coéquipier (une invitation lui est envoyée s’il n’a pas de compte)" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email du membre à ajouter" />
          <Button type="submit" disabled={add.isPending}><UserPlus className="mr-2 h-4 w-4" />Inviter</Button>
        </form>
      )}
      {isLoading ? <Spinner /> : (
        <ul className="divide-y divide-white/10">
          {members.map((m) => (
            <li key={m.user_id ?? m.display_name} className="flex flex-wrap items-center gap-3 py-3">
              <div className="flex-1">
                <p className="font-semibold text-white">{m.display_name}{m.user_id === user?.id && <span className="text-white/40"> (vous)</span>}</p>
                <p className="text-xs text-white/40">{m.role === 'owner' ? 'Propriétaire' : 'Membre'}</p>
              </div>
              {isOwner && m.user_id && m.user_id !== user?.id && (
                <Button size="sm" variant="ghost" onClick={() => setRole.mutate({ userId: m.user_id!, role: m.role === 'owner' ? 'member' : 'owner' })}>
                  {m.role === 'owner' ? 'Retirer propriétaire' : 'Nommer propriétaire'}
                </Button>
              )}
              {m.user_id && (isOwner || m.user_id === user?.id) && (
                <Button size="sm" variant="ghost" className="hover:text-red-400"
                  onClick={() => { if (confirm(m.user_id === user?.id ? 'Quitter cet équipage ?' : `Retirer ${m.display_name} ?`)) remove.mutate(m.user_id!); }}>
                  <UserMinus className="mr-1.5 h-4 w-4" />{m.user_id === user?.id ? 'Quitter' : 'Retirer'}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
