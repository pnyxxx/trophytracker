-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — calendrier des étapes et sous-étapes (boucles de Merzouga)
--
--  Jusqu'ici, les jours du programme (« J6 : arrivée ; J7-8 : boucles ») n'étaient
--  que du texte libre dans la description : le compteur « Jour de raid » et le
--  roadbook ne pouvaient pas se parler. On ajoute :
--    - day_start / day_end : jours du raid couverts par l'étape (J1 = jour du départ
--      officiel, event_start_date), route pour y aller comprise ;
--    - parent_id : sous-étape d'une étape (ex. « Boucle 1 » de Merzouga), sur un
--      seul niveau, au même endroit que son étape ;
--    - le type « loop » (boucle) pour ces sous-étapes.
--
--  Remplit le calendrier de l'édition 2027 si les étapes sont encore celles de
--  la migration 20260929000002 (ne touche à rien sinon).
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.waypoints
  add column parent_id uuid references public.waypoints (id) on delete cascade,
  add column day_start smallint check (day_start between 1 and 60),
  add column day_end   smallint check (day_end between 1 and 60),
  add constraint waypoints_days_order check (day_end >= day_start),
  add constraint waypoints_not_own_parent check (parent_id <> id);

alter table public.waypoints drop constraint waypoints_kind_check;
alter table public.waypoints add constraint waypoints_kind_check
  check (kind in ('start', 'stage', 'night', 'boat', 'bivouac', 'finish', 'loop'));

create index waypoints_parent_idx on public.waypoints (parent_id);

comment on column public.waypoints.parent_id is 'Étape dont celle-ci est une sous-étape (ex. boucle autour d''un bivouac).';
comment on column public.waypoints.day_start is 'Premier jour du raid couvert par l''étape (1 = jour du départ officiel).';
comment on column public.waypoints.day_end is 'Dernier jour du raid passé à l''étape.';

-- Une sous-étape ne peut pas avoir elle-même de sous-étapes (un seul niveau).
create or replace function private.check_waypoint_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is not null then
    if exists (select 1 from public.waypoints where id = new.parent_id and parent_id is not null) then
      raise exception 'Une sous-étape ne peut pas contenir d''autres sous-étapes';
    end if;
    if exists (select 1 from public.waypoints where parent_id = new.id) then
      raise exception 'Cette étape a des sous-étapes : elle ne peut pas devenir une sous-étape';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function private.check_waypoint_parent() from public, anon, authenticated;

create trigger waypoints_parent_check before insert or update of parent_id on public.waypoints
  for each row execute function private.check_waypoint_parent();

-- ─── Calendrier de l'édition 2027 ───────────────────────────────────────────
do $$
declare
  v_merzouga uuid;
begin
  if (select coalesce(array_agg(name order by sort_order), '{}') from public.waypoints)
     = array['Biarritz', 'Salamanque', 'Algésiras', 'Tanger Med', 'Boulajoul', 'Merzouga', 'Marrakech'] then
    update public.waypoints w set day_start = v.d1, day_end = v.d2, description = v.descr
    from (values
      ('Biarritz',   1, 2,  'Village départ'),
      ('Salamanque', 3, 3,  'Première nuit'),
      ('Algésiras',  4, 4,  'Bivouac avant la traversée'),
      ('Tanger Med', 5, 5,  'Arrivée au Maroc'),
      ('Boulajoul',  5, 5,  'Bivouac du Moyen Atlas'),
      ('Merzouga',   6, 8,  'Arrivée dans les dunes, puis deux jours de boucles'),
      ('Marrakech',  9, 12, 'Étape marathon d''une traite, arrivée, remise des prix (J11) et retour (J12)')
    ) as v (name, d1, d2, descr)
    where w.name = v.name;

    select id into v_merzouga from public.waypoints where name = 'Merzouga';
    insert into public.waypoints (kind, name, description, country, lat, lon, sort_order, parent_id, day_start, day_end) values
      ('loop', 'Boucle 1', 'Journée d''orientation dans l''Erg Chebbi, retour au bivouac le soir', 'Maroc', 31.21516, -3.99763, 61, v_merzouga, 7, 7),
      ('loop', 'Boucle 2', 'Deuxième boucle dans les dunes, retour au bivouac le soir', 'Maroc', 31.21516, -3.99763, 62, v_merzouga, 8, 8);
  end if;
end $$;
