-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — un seul équipage par compte
--
--  Un compte (propriétaire ou simple membre) ne peut appartenir qu'à un seul
--  équipage. La règle est garantie par un index unique ; les fonctions donnent
--  un message clair avant d'y arriver.
-- ═════════════════════════════════════════════════════════════════════════════

-- 1. Données existantes : si un compte est dans plusieurs équipages, on garde
--    celui où il est propriétaire (le plus ancien en cas d'égalité). Les autres
--    équipages ne sont pas supprimés : un admin peut les réattribuer ou les supprimer.
with ranked as (
  select crew_id, user_id,
         row_number() over (
           partition by user_id
           order by (role = 'owner') desc, created_at, crew_id
         ) as n
  from public.crew_members
), removed as (
  delete from public.crew_members m
  using ranked r
  where m.crew_id = r.crew_id and m.user_id = r.user_id and r.n > 1
  returning m.user_id
)
select count(*) as memberships_removed from removed;

-- 2. La règle elle-même (remplace l'index non unique sur user_id).
drop index if exists public.crew_members_user_idx;
create unique index crew_members_one_crew_per_user on public.crew_members (user_id);
comment on index public.crew_members_one_crew_per_user is 'Un compte ne peut faire partie que d''un seul équipage.';

-- 3. Création : refusée si on fait déjà partie d'un équipage (remplace la limite de 3).
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

  if exists (select 1 from public.crew_members where user_id = v_uid) then
    raise exception 'Vous faites déjà partie d''un équipage (un seul par compte)' using errcode = 'P0001';
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

-- 4. Ajout d'un coéquipier : message explicite s'il a déjà un équipage.
create or replace function public.add_crew_member(p_crew uuid, p_email text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_current uuid;
begin
  if private.crew_role(p_crew) is distinct from 'owner' and not private.is_admin() then
    raise exception 'Réservé au propriétaire de l''équipage' using errcode = '42501';
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'Aucun compte avec cet email : la personne doit d''abord s''inscrire' using errcode = 'P0002';
  end if;
  select crew_id into v_current from public.crew_members where user_id = v_user;
  if v_current = p_crew then
    raise exception 'Cette personne est déjà membre' using errcode = '23505';
  elsif v_current is not null then
    raise exception 'Cette personne fait déjà partie d''un autre équipage (un seul par compte)' using errcode = 'P0001';
  end if;
  insert into public.crew_members (crew_id, user_id, role) values (p_crew, v_user, 'member');
end;
$$;
