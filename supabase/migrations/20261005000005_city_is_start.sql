-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — la « Ville » de l'équipage est sa ville de départ
--
--  Plutôt qu'un second champ, le champ « Ville » de la présentation devient
--  « Ville de départ » : c'est son nom qui s'affiche à côté du drapeau sur la
--  carte (start_lat / start_lon / start_region restent les coordonnées et la
--  région de cette ville). La colonne start_city n'a plus d'usage : son
--  contenu éventuel rejoint city si celle-ci est vide, puis elle est retirée.
-- ═════════════════════════════════════════════════════════════════════════════

update public.crews set city = start_city where city is null and start_city is not null;

drop trigger crews_touch on public.crews;
alter table public.crews drop column start_city;
create trigger crews_touch before update of
  name, car_number, tagline, story, school, city, contact_email, instagram_url, facebook_url,
  website_url, avatar_path, cover_path, cover_focus_x, cover_focus_y, is_public,
  current_rank, supplies_count, start_lat, start_lon, start_region
  on public.crews for each row execute function private.touch_updated_at();

comment on column public.crews.city is 'Ville de départ de l''équipage (affichée sous son nom et à côté du drapeau sur la carte).';
