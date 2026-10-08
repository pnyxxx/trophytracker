-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — e-mails du voyage : position du départ
--
--  Le contenu des e-mails aux proches (private.trip_mail_payload) donne aussi la position de la
--  ville de départ, pour l'image satellite de l'e-mail « C'est parti ».
-- ═════════════════════════════════════════════════════════════════════════════

create or replace function private.trip_mail_payload(p_crew uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'name', c.name, 'slug', c.slug, 'city', c.city, 'destination', c.destination,
    'starts_on', c.starts_on, 'ends_on', c.ends_on, 'trip_type', c.trip_type,
    'start_lat', round(c.start_lat::numeric, 3), 'start_lon', round(c.start_lon::numeric, 3),
    'travellers', (select coalesce(jsonb_agg(p.display_name order by m.created_at), '[]'::jsonb)
                     from public.crew_members m join public.profiles p on p.id = m.user_id where m.crew_id = c.id)
  )
  from public.crews c where c.id = p_crew;
$$;

revoke execute on function private.trip_mail_payload(uuid) from public, anon, authenticated;
