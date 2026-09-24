-- ═════════════════════════════════════════════════════════════════════════════
--  TrophysTracker — 4/5 : stockage des images (Supabase Storage)
--
--  Un seul bucket public « crew-media », rangé par équipage :
--    <crew_id>/avatar/…   <crew_id>/cover/…   <crew_id>/photos/…   <crew_id>/sponsors/…
--
--  Lecture : publique (URL directe, cache navigateur/CDN).
--  Écriture : uniquement les membres de l'équipage propriétaire du dossier.
--  Le site ré-encode les images en WebP avant l'envoi, ce qui supprime les
--  métadonnées EXIF (dont la position GPS de la prise de vue).
-- ═════════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('crew-media', 'crew-media', true, 15 * 1024 * 1024, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "crew-media : lecture publique" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'crew-media');

create policy "crew-media : envoi par les membres" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'crew-media' and private.can_edit_crew_path(name));

create policy "crew-media : remplacement par les membres" on storage.objects
  for update to authenticated
  using (bucket_id = 'crew-media' and private.can_edit_crew_path(name))
  with check (bucket_id = 'crew-media' and private.can_edit_crew_path(name));

create policy "crew-media : suppression par les membres" on storage.objects
  for delete to authenticated
  using (bucket_id = 'crew-media' and private.can_edit_crew_path(name));
