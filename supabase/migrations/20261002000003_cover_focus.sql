-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — cadrage de l'image de couverture
--
--  La bannière d'une page équipage recadre l'image (object-fit: cover). Par
--  défaut on garde le centre ; l'équipage peut maintenant choisir la partie à
--  garder visible en faisant glisser l'image. On stocke le point de cadrage en
--  pourcentage (0 = bord gauche / haut, 100 = bord droit / bas), utilisé tel
--  quel en CSS : object-position: X% Y%.
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.crews
  add column cover_focus_x smallint not null default 50 check (cover_focus_x between 0 and 100),
  add column cover_focus_y smallint not null default 50 check (cover_focus_y between 0 and 100);

comment on column public.crews.cover_focus_x is 'Cadrage horizontal de la couverture, en % (object-position).';
comment on column public.crews.cover_focus_y is 'Cadrage vertical de la couverture, en % (object-position).';

-- Modifiable par les membres, comme les autres champs éditoriaux (RLS de crews inchangée).
grant update (cover_focus_x, cover_focus_y) on public.crews to authenticated;

-- updated_at suit aussi le cadrage.
drop trigger crews_touch on public.crews;
create trigger crews_touch before update of
  name, car_number, tagline, story, school, city, contact_email, instagram_url,
  website_url, avatar_path, cover_path, cover_focus_x, cover_focus_y, is_public,
  current_rank, supplies_count
  on public.crews for each row execute function private.touch_updated_at();
