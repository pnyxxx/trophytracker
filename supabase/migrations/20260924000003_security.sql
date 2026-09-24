-- ═════════════════════════════════════════════════════════════════════════════
--  TrophysTracker — 3/5 : sécurité (droits + Row Level Security)
--
--  Principe : TOUT est interdit par défaut, puis on autorise précisément.
--
--  Rôles Postgres utilisés par Supabase :
--    anon           → visiteur non connecté (clé ANON_KEY publique)
--    authenticated  → utilisateur connecté (JWT émis par Supabase Auth)
--    service_role   → accès total, côté serveur uniquement (jamais dans le navigateur)
--    tracker        → notre service GPS : ne peut QUE appeler 3 fonctions
--
--  Deux niveaux de protection :
--    1. GRANT : quelles tables / colonnes un rôle peut toucher ;
--    2. RLS   : quelles LIGNES il peut voir / modifier (politiques ci-dessous).
-- ═════════════════════════════════════════════════════════════════════════════


-- ─── 1. On retire tous les droits par défaut accordés par Supabase ──────────

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public  from public, anon, authenticated;
revoke all on schema private from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

-- Les helpers RLS sont appelés par les politiques avec les droits de l'appelant :
-- ils doivent être exécutables, mais le schéma private n'est pas exposé par l'API.
grant usage on schema private to anon, authenticated;
grant execute on function
  private.is_admin(),
  private.crew_role(uuid),
  private.can_edit_crew(uuid),
  private.can_view_crew(uuid),
  private.can_edit_crew_path(text)
to anon, authenticated;


-- ─── 2. Droits par table / colonne ──────────────────────────────────────────

-- Profils : chacun lit et renomme le sien (le rôle se change via admin_set_role).
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

-- Équipages : lecture publique ; les membres modifient uniquement les champs éditoriaux.
-- (last_*, total_distance_m, followers_count, slug : jamais modifiables via l'API)
grant select on public.crews to anon, authenticated;
grant update (
  name, car_number, tagline, story, school, city, contact_email, instagram_url,
  website_url, avatar_path, cover_path, is_public, current_rank, supplies_count
) on public.crews to authenticated;
grant delete on public.crews to authenticated;

-- crew_devices : AUCUN droit direct (clés secrètes). Accès via fonctions uniquement.

grant select on public.crew_members to authenticated;

grant select, insert, delete on public.follows to authenticated;

grant select on public.positions to anon, authenticated;

grant select on public.photos to anon, authenticated;
grant insert (crew_id, kind, title, description, location, taken_label, storage_path, width, height)
  on public.photos to authenticated;
grant update (title, description, location, taken_label) on public.photos to authenticated;
grant delete on public.photos to authenticated;

grant select on public.sponsors to anon, authenticated;
grant insert (crew_id, name, logo_path, website_url, city, lat, lon, sort_order) on public.sponsors to authenticated;
grant update (name, logo_path, website_url, city, lat, lon, sort_order) on public.sponsors to authenticated;
grant delete on public.sponsors to authenticated;

grant select on public.waypoints to anon, authenticated;
grant insert, update, delete on public.waypoints to authenticated;   -- filtré par RLS : admins

grant select on public.settings to anon, authenticated;
grant insert, update, delete on public.settings to authenticated;    -- filtré par RLS : admins


-- ─── 3. Fonctions appelables depuis le site ─────────────────────────────────

grant execute on function
  public.search_crews(text, boolean, integer, integer),
  public.get_crew_members(uuid),
  public.get_track(uuid, timestamptz),
  public.get_crew_stats(uuid)
to anon, authenticated;

grant execute on function
  public.create_crew(text, text, text),
  public.add_crew_member(uuid, text),
  public.set_crew_member_role(uuid, uuid, text),
  public.remove_crew_member(uuid, uuid),
  public.regenerate_device_key(uuid),
  public.revoke_device_key(uuid),
  public.get_crew_tracking(uuid),
  public.delete_my_account(),
  public.admin_list_users(text),
  public.admin_set_role(uuid, text),
  public.admin_list_crews(),
  public.admin_set_traccar_device(uuid, text),
  public.admin_overview()
to authenticated;


-- ─── 4. Row Level Security ──────────────────────────────────────────────────
-- Note : `(select auth.uid())` plutôt que `auth.uid()` → évalué une seule fois
-- par requête au lieu d'une fois par ligne (recommandation Supabase).

alter table public.profiles     enable row level security;
alter table public.crews        enable row level security;
alter table public.crew_devices enable row level security;
alter table public.crew_members enable row level security;
alter table public.follows      enable row level security;
alter table public.positions    enable row level security;
alter table public.photos       enable row level security;
alter table public.sponsors     enable row level security;
alter table public.waypoints    enable row level security;
alter table public.settings     enable row level security;

-- Profils
create policy "profil : lecture du sien ou admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.is_admin());
create policy "profil : modification du sien" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Équipages
create policy "équipage : public, ou membre, ou admin" on public.crews
  for select to anon, authenticated
  using (is_public or private.can_edit_crew(id));
create policy "équipage : modifiable par ses membres" on public.crews
  for update to authenticated
  using (private.can_edit_crew(id)) with check (private.can_edit_crew(id));
create policy "équipage : supprimable par un propriétaire" on public.crews
  for delete to authenticated
  using (private.crew_role(id) = 'owner' or private.is_admin());

-- crew_devices : RLS activée sans aucune politique = aucun accès via l'API.

-- Membres
create policy "membres : visibles par les membres de l'équipage" on public.crew_members
  for select to authenticated
  using (user_id = (select auth.uid()) or private.can_edit_crew(crew_id));

-- Abonnements
create policy "abonnements : les siens" on public.follows
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "abonnements : suivre un équipage visible" on public.follows
  for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_view_crew(crew_id));
create policy "abonnements : ne plus suivre" on public.follows
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Positions (lecture seule ; écriture uniquement via private.ingest_position)
create policy "positions : équipage visible" on public.positions
  for select to anon, authenticated
  using (private.can_view_crew(crew_id));

-- Photos
create policy "photos : équipage visible" on public.photos
  for select to anon, authenticated
  using (private.can_view_crew(crew_id));
create policy "photos : ajout par les membres" on public.photos
  for insert to authenticated
  with check (private.can_edit_crew(crew_id) and created_by = (select auth.uid()));
create policy "photos : modification par les membres" on public.photos
  for update to authenticated
  using (private.can_edit_crew(crew_id)) with check (private.can_edit_crew(crew_id));
create policy "photos : suppression par les membres" on public.photos
  for delete to authenticated
  using (private.can_edit_crew(crew_id));

-- Sponsors
create policy "sponsors : équipage visible" on public.sponsors
  for select to anon, authenticated
  using (private.can_view_crew(crew_id));
create policy "sponsors : ajout par les membres" on public.sponsors
  for insert to authenticated
  with check (private.can_edit_crew(crew_id));
create policy "sponsors : modification par les membres" on public.sponsors
  for update to authenticated
  using (private.can_edit_crew(crew_id)) with check (private.can_edit_crew(crew_id));
create policy "sponsors : suppression par les membres" on public.sponsors
  for delete to authenticated
  using (private.can_edit_crew(crew_id));

-- Parcours et réglages : lecture publique, écriture admin
create policy "parcours : lecture publique" on public.waypoints
  for select to anon, authenticated using (true);
create policy "parcours : gestion admin" on public.waypoints
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy "réglages : lecture publique" on public.settings
  for select to anon, authenticated using (true);
create policy "réglages : gestion admin" on public.settings
  for all to authenticated using (private.is_admin()) with check (private.is_admin());


-- ─── 5. Rôle du service tracker (moindre privilège) ─────────────────────────
-- Créé sans mot de passe ; scripts/db-migrate.sh lui en donne un depuis le .env.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'tracker') then
    create role tracker nologin;
  end if;
end;
$$;

grant usage on schema private to tracker;
grant execute on function
  private.ingest_position(uuid, timestamptz, float8, float8, float8, float8, float8, float8, float8, text, float8, float8),
  private.crew_for_device_key(text),
  private.traccar_links()
to tracker;


-- ─── 6. Temps réel ──────────────────────────────────────────────────────────
-- Le site s'abonne aux mises à jour d'un équipage (dernière position) pour
-- déplacer la voiture en direct, sans recharger. La RLS s'applique aussi ici.

alter publication supabase_realtime add table public.crews;
