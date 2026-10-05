-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — région de la ville de départ
--
--  Retenue au choix de la ville dans les suggestions (champ « state » de
--  Photon, ex. « Bretagne ») : la carte plante le Gwenn-ha-du au lieu du
--  drapeau rouge pour les équipages partant de Bretagne.
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.crews
  add column start_region text check (char_length(start_region) between 1 and 80);

comment on column public.crews.start_region is 'Région de la ville de départ (ex. « Bretagne » → drapeau breton sur la carte).';

-- Modifiable par les membres, comme la ville de départ (RLS de crews inchangée).
grant update (start_region) on public.crews to authenticated;

-- updated_at suit aussi la région.
drop trigger crews_touch on public.crews;
create trigger crews_touch before update of
  name, car_number, tagline, story, school, city, contact_email, instagram_url, facebook_url,
  website_url, avatar_path, cover_path, cover_focus_x, cover_focus_y, is_public,
  current_rank, supplies_count, start_city, start_lat, start_lon, start_region
  on public.crews for each row execute function private.touch_updated_at();
