-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — l'équipage de démonstration roule en continu
--
--  Un seul équipage peut être l'équipage de démo (crews.is_demo). La colonne n'est
--  modifiable que par un administrateur de la base (script scripts/demo-refresh.mjs),
--  jamais par un équipage via l'API.
--
--  Le service tracker lui fait rejouer un vrai trajet en boucle (apps/tracker/src/demo.ts),
--  comme s'il recevait les positions d'un téléphone, avec deux fonctions qui ne touchent
--  QUE l'équipage de démo :
--   - private.demo_crew()    : son identifiant et l'heure de sa dernière position ;
--   - private.demo_restart() : efface sa trace pour un nouveau tour, suivi lancé.
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.crews add column is_demo boolean not null default false;
create unique index crews_one_demo on public.crews (is_demo) where is_demo;
comment on column public.crews.is_demo is
  'Équipage de démonstration : sa trace est rejouée en boucle par le service tracker. Un seul possible.';

create or replace function private.demo_crew()
returns table (id uuid, last_fix_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select c.id, c.last_fix_at from public.crews c where c.is_demo;
$$;

create or replace function private.demo_restart()
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  delete from public.positions where crew_id in (select c.id from public.crews c where c.is_demo);
  delete from private.gps_pending_jumps where crew_id in (select c.id from public.crews c where c.is_demo);
  delete from public.gps_test_fixes where crew_id in (select c.id from public.crews c where c.is_demo);
  update public.crews
     set last_lat = null, last_lon = null, last_speed_kmh = null, last_fix_at = null, total_distance_m = 0,
         tracking_enabled = true
   where is_demo;
end;
$$;

revoke all on function private.demo_crew(), private.demo_restart() from public, anon, authenticated;
grant execute on function private.demo_crew(), private.demo_restart() to tracker;
