-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — fiche d'un sponsor
--
--  Un clic sur un sponsor (onglet « Soutenir ») ouvre sa fiche : une phrase de
--  présentation, son téléphone, son e-mail, son adresse, et TOUS ses liens (un
--  sponsor peut avoir plusieurs sites et plusieurs réseaux sociaux).
--  `links` : liste d'adresses web (8 au plus), dans l'ordre choisi par les voyageurs.
--  website_url / instagram_url / facebook_url restent remplis (premier site, premier
--  compte de chaque réseau) pour la carte et les anciens affichages.
--  Lecture : comme les sponsors ; écriture : les voyageurs (RLS inchangée).
-- ═════════════════════════════════════════════════════════════════════════════

-- Une liste de liens valide : un tableau d'au plus 8 adresses web de 300 caractères au plus.
-- Vérifiée par un déclencheur (et non une contrainte CHECK) : la fonction est rangée dans le schéma privé,
-- auquel les voyageurs n'ont pas accès, et un déclencheur n'a pas besoin de leurs droits pour l'appeler.
create or replace function private.check_sponsor_links()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if jsonb_typeof(new.links) <> 'array'
     or jsonb_array_length(new.links) > 8
     or exists (
       select 1 from jsonb_array_elements(new.links) e
       where jsonb_typeof(e) <> 'string' or (e #>> '{}') !~* '^https?://[^[:space:]]+$' or char_length(e #>> '{}') > 300
     ) then
    raise exception 'Liens du sponsor invalides : 8 adresses web au plus' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function private.check_sponsor_links() from public, anon, authenticated;

alter table public.sponsors
  add column description text check (char_length(description) <= 280),
  add column phone text check (phone ~ '^[0-9+() .-]{4,30}$'),
  add column email text check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and char_length(email) <= 200),
  add column links jsonb not null default '[]'::jsonb;

create trigger sponsors_links_check before insert or update of links on public.sponsors
  for each row execute function private.check_sponsor_links();

comment on column public.sponsors.description is 'Une phrase de présentation du sponsor (fiche du sponsor).';
comment on column public.sponsors.phone is 'Téléphone du sponsor, affiché sur sa fiche.';
comment on column public.sponsors.email is 'E-mail du sponsor, affiché sur sa fiche.';
comment on column public.sponsors.links is 'Sites et réseaux sociaux du sponsor (liste d''adresses web, 8 au plus).';

-- Les liens déjà saisis (site, Instagram, Facebook) passent dans la liste.
update public.sponsors
   set links = (
     select coalesce(jsonb_agg(u), '[]'::jsonb)
     from unnest(array[website_url, instagram_url, facebook_url]) as u
     where u is not null
   );

grant insert (description, phone, email, links) on public.sponsors to authenticated;
grant update (description, phone, email, links) on public.sponsors to authenticated;
