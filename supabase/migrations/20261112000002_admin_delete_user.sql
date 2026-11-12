-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — suppression d'un compte depuis l'administration
--
--  Pour faire le ménage (comptes de test, demandes de suppression par e-mail) :
--  un administrateur supprime un compte ET les road trips dont ce compte est le
--  seul propriétaire (étapes, photos, sponsors, trace… partent avec, en cascade).
--  Un road trip qui a un autre propriétaire est gardé : le compte en est juste retiré.
--  Les achats restent (pièces comptables, 10 ans) : leur lien vers le compte et le
--  road trip passe à vide, comme pour « Supprimer mon compte ».
--
--  Garde-fous : réservé aux administrateurs (double authentification comprise) ;
--  pas son propre compte ; pas un autre administrateur (lui retirer d'abord ses
--  droits) ; pas le compte qui porte le road trip d'exemple.
--  Les fichiers (photos, logos) sont effacés par le site avant l'appel : un
--  administrateur a les droits sur tous les dossiers (private.can_edit_crew).
-- ═════════════════════════════════════════════════════════════════════════════

-- Road trips que la suppression du compte emporterait : ceux dont il est le seul propriétaire.
create or replace function public.admin_user_crews(p_user uuid)
returns table (id uuid, slug text, name text, is_demo boolean, members integer)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'Réservé aux administrateurs' using errcode = '42501'; end if;
  return query
    select c.id, c.slug, c.name, c.is_demo, (select count(*)::integer from public.crew_members x where x.crew_id = c.id)
    from public.crews c
    join public.crew_members m on m.crew_id = c.id
    where m.user_id = p_user and m.role = 'owner'
      and not exists (
        select 1 from public.crew_members o where o.crew_id = c.id and o.role = 'owner' and o.user_id <> p_user
      )
    order by c.created_at;
end;
$$;

-- Supprime le compte et ses road trips ; renvoie le nombre de road trips supprimés.
create or replace function public.admin_delete_user(p_user uuid)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not private.is_admin() then raise exception 'Réservé aux administrateurs' using errcode = '42501'; end if;
  if p_user = auth.uid() then
    raise exception 'Tu ne peux pas supprimer ton propre compte depuis l''administration' using errcode = '42501';
  end if;
  if not exists (select 1 from auth.users where id = p_user) then
    raise exception 'Compte introuvable' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.profiles where id = p_user and role = 'admin') then
    raise exception 'C''est un administrateur : retire-lui d''abord ses droits' using errcode = '42501';
  end if;
  if exists (select 1 from public.admin_user_crews(p_user) c where c.is_demo) then
    raise exception 'Ce compte porte le road trip d''exemple : il ne peut pas être supprimé' using errcode = '42501';
  end if;

  with gone as (
    delete from public.crews where id in (select c.id from public.admin_user_crews(p_user) c) returning 1
  )
  select count(*) into v_count from gone;

  delete from auth.users where id = p_user;
  return v_count;
end;
$$;

comment on function public.admin_user_crews(uuid) is 'Administration : road trips dont ce compte est le seul propriétaire (supprimés avec lui).';
comment on function public.admin_delete_user(uuid) is 'Administration : supprime un compte et les road trips dont il est le seul propriétaire.';

revoke execute on function public.admin_user_crews(uuid), public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_user_crews(uuid), public.admin_delete_user(uuid) to authenticated;
