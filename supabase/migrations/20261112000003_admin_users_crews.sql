-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — administration : les road trips de chaque compte
--
--  La liste des comptes affiche maintenant les road trips auxquels chaque compte
--  est lié (nom, adresse, rôle), cliquables : on voit tout de suite de quel road
--  trip il s'agit (utile avant de supprimer un compte de test).
--  Le type de retour change : on recrée la fonction (mêmes droits qu'avant).
-- ═════════════════════════════════════════════════════════════════════════════

drop function public.admin_list_users(text);

create function public.admin_list_users(p_search text default null)
returns table (id uuid, email text, display_name text, role text, created_at timestamptz, last_sign_in_at timestamptz, crews jsonb)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'Réservé aux administrateurs' using errcode = '42501'; end if;
  return query
    select u.id, u.email::text, p.display_name, p.role, u.created_at, u.last_sign_in_at,
      coalesce((
        select jsonb_agg(jsonb_build_object('slug', c.slug, 'name', c.name, 'role', m.role, 'is_demo', c.is_demo) order by c.created_at)
        from public.crew_members m join public.crews c on c.id = m.crew_id
        where m.user_id = u.id
      ), '[]'::jsonb)
    from auth.users u join public.profiles p on p.id = u.id
    where p_search is null or p_search = ''
       or u.email ilike '%' || p_search || '%' or p.display_name ilike '%' || p_search || '%'
    order by u.created_at desc
    limit 200;
end;
$$;

revoke execute on function public.admin_list_users(text) from public, anon;
grant execute on function public.admin_list_users(text) to authenticated;
