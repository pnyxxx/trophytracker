-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — lien de cagnotte d'un équipage
--
--  Les équipages peuvent afficher le lien de leur cagnotte en ligne (Leetchi,
--  HelloAsso, Lydia, GoFundMe…) : un bouton « Participer à la cagnotte » bien
--  visible en haut de leur page. N'importe quel site est accepté, pourvu que
--  ce soit une adresse web.
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.crews
  add column fundraiser_url text check (fundraiser_url ~* '^https?://' and char_length(fundraiser_url) <= 300);

comment on column public.crews.fundraiser_url is 'Lien de la cagnotte en ligne de l''équipage.';

-- Modifiable par les membres, comme les réseaux sociaux (RLS de crews inchangée).
grant update (fundraiser_url) on public.crews to authenticated;

-- updated_at suit aussi ce lien.
drop trigger crews_touch on public.crews;
create trigger crews_touch before update of
  name, car_number, tagline, story, school, city, contact_email, instagram_url, facebook_url,
  fundraiser_url, website_url, avatar_path, cover_path, cover_focus_x, cover_focus_y, is_public,
  current_rank, supplies_count, start_lat, start_lon, start_region
  on public.crews for each row execute function private.touch_updated_at();
