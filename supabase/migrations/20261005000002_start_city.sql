-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — ville de départ d'un équipage
--
--  L'équipage indique d'où il part (sa ville, choisie dans les suggestions du
--  formulaire « Infos ») : un drapeau et le nom de la ville s'affichent à cet
--  endroit sur la carte de sa page. Le nom est modifiable à part (« Pédernec »
--  plutôt que « Pedernec (22540) »). Les coordonnées vont toujours par deux.
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.crews
  add column start_city text check (char_length(start_city) between 1 and 80),
  add column start_lat  double precision check (start_lat between -90 and 90),
  add column start_lon  double precision check (start_lon between -180 and 180),
  add constraint crews_start_coords_check check ((start_lat is null) = (start_lon is null));

comment on column public.crews.start_city is 'Ville de départ affichée sur la carte, à côté du drapeau.';
comment on column public.crews.start_lat is 'Latitude de la ville de départ (drapeau sur la carte).';
comment on column public.crews.start_lon is 'Longitude de la ville de départ (drapeau sur la carte).';

-- Modifiable par les membres, comme les autres champs éditoriaux (RLS de crews inchangée).
grant update (start_city, start_lat, start_lon) on public.crews to authenticated;

-- updated_at suit aussi la ville de départ.
drop trigger crews_touch on public.crews;
create trigger crews_touch before update of
  name, car_number, tagline, story, school, city, contact_email, instagram_url, facebook_url,
  website_url, avatar_path, cover_path, cover_focus_x, cover_focus_y, is_public,
  current_rank, supplies_count, start_city, start_lat, start_lon
  on public.crews for each row execute function private.touch_updated_at();
