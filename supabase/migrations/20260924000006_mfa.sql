-- ═════════════════════════════════════════════════════════════════════════════
--  TrophysTracker — 6 : double authentification (MFA) appliquée par la base
--
--  Un compte qui a activé la double authentification n'obtient ses droits
--  d'écriture (équipages, admin, abonnements, profil) qu'après avoir saisi son
--  code : sa session doit être de niveau « aal2 ». Sans cela, un mot de passe
--  volé suffirait encore à modifier les données.
-- ═════════════════════════════════════════════════════════════════════════════

-- Vrai si la session est « suffisamment authentifiée » :
-- l'utilisateur n'a pas de double authentification, ou il a saisi son code (aal2).
create or replace function private.mfa_ok()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors
        where user_id = (select auth.uid()) and status = 'verified'
      );
$$;

-- Les helpers de droits intègrent désormais la vérification MFA : toutes les
-- règles RLS et fonctions qui les utilisent en bénéficient automatiquement.
create or replace function private.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.mfa_ok() and exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function private.crew_role(p_crew uuid)
returns text
language sql stable security definer
set search_path = ''
as $$
  select role from public.crew_members
  where crew_id = p_crew and user_id = (select auth.uid()) and private.mfa_ok();
$$;

grant execute on function private.mfa_ok() to anon, authenticated;

-- Règles « restrictives » : s'ajoutent (ET logique) aux règles existantes.
create policy "mfa : abonnements" on public.follows
  as restrictive for all to authenticated
  using (private.mfa_ok()) with check (private.mfa_ok());

create policy "mfa : profil" on public.profiles
  as restrictive for update to authenticated
  using (private.mfa_ok()) with check (private.mfa_ok());

-- Création d'équipage et suppression de compte : même exigence.
create or replace function public.create_crew(p_name text, p_car_number text default null, p_tagline text default null)
returns public.crews
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_base text;
  v_slug text;
  v_crew public.crews;
  i      integer := 1;
begin
  if v_uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if not private.mfa_ok() then raise exception 'Code de double authentification requis' using errcode = '42501'; end if;

  if not private.is_admin() and (
    select count(*) from public.crew_members where user_id = v_uid and role = 'owner'
  ) >= 3 then
    raise exception 'Vous gérez déjà 3 équipages' using errcode = 'P0001';
  end if;

  v_base := coalesce(nullif(private.slugify(p_name), ''), 'equipage');
  if char_length(v_base) < 2 then v_base := 'equipage-' || v_base; end if;
  v_slug := v_base;
  while exists (select 1 from public.crews where slug = v_slug) loop
    i := i + 1;
    v_slug := v_base || '-' || i;
  end loop;

  insert into public.crews (slug, name, car_number, tagline)
  values (v_slug, trim(p_name), nullif(trim(p_car_number), ''), nullif(trim(p_tagline), ''))
  returning * into v_crew;

  insert into public.crew_members (crew_id, user_id, role) values (v_crew.id, v_uid, 'owner');
  insert into public.crew_devices (crew_id) values (v_crew.id);
  return v_crew;
end;
$$;

create or replace function public.delete_my_account()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if not private.mfa_ok() then raise exception 'Code de double authentification requis' using errcode = '42501'; end if;
  if exists (
    select 1 from public.crew_members m
    where m.user_id = v_uid and m.role = 'owner'
      and (select count(*) from public.crew_members o where o.crew_id = m.crew_id and o.role = 'owner') = 1
  ) then
    raise exception 'Vous êtes le seul propriétaire d''un équipage : supprimez-le ou nommez un autre propriétaire avant de supprimer votre compte';
  end if;
  delete from auth.users where id = v_uid;
end;
$$;
