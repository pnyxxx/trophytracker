-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — lien Facebook d'un équipage
--
--  Les équipages peuvent afficher leur page Facebook à côté d'Instagram (gros
--  boutons en haut de leur page). Le champ « site web » n'est plus proposé dans
--  le formulaire ; la colonne website_url est conservée (rien n'est effacé).
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.crews
  add column facebook_url text check (facebook_url ~* '^https?://' and char_length(facebook_url) <= 300);

comment on column public.crews.facebook_url is 'Page ou profil Facebook de l''équipage.';

-- Modifiable par les membres, comme Instagram (RLS de crews inchangée).
grant update (facebook_url) on public.crews to authenticated;

-- updated_at suit aussi ce lien.
drop trigger crews_touch on public.crews;
create trigger crews_touch before update of
  name, car_number, tagline, story, school, city, contact_email, instagram_url, facebook_url,
  website_url, avatar_path, cover_path, cover_focus_x, cover_focus_y, is_public,
  current_rank, supplies_count
  on public.crews for each row execute function private.touch_updated_at();
