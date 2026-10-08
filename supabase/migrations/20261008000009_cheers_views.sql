-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — mur d'encouragements et visibilité pour les sponsors (phase F)
--
--  public.cheers           : les mots laissés par les proches sur la page d'un road trip (sans compte).
--                            Écriture uniquement par public.post_cheer (limites anti-abus) ; les voyageurs
--                            retirent les messages qu'ils ne veulent pas garder.
--  public.crew_page_views  : nombre de visites de la page par jour (anonyme : ni adresse IP, ni identifiant ;
--                            le site ne compte qu'une visite par navigateur et par jour). Lu par les voyageurs
--                            seulement, pour leur rapport aux sponsors.
-- ═════════════════════════════════════════════════════════════════════════════

-- ── Mur d'encouragements ─────────────────────────────────────────────────────
create table public.cheers (
  id          uuid primary key default gen_random_uuid(),
  crew_id     uuid not null references public.crews (id) on delete cascade,
  author_name text not null check (char_length(trim(author_name)) between 1 and 40),
  message     text not null check (char_length(trim(message)) between 1 and 280),
  user_id     uuid references auth.users (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);
create index cheers_crew_idx on public.cheers (crew_id, created_at desc);
comment on table public.cheers is 'Mots d''encouragement laissés par les proches sur la page d''un road trip.';

alter table public.cheers enable row level security;
grant select on public.cheers to anon, authenticated;
grant delete on public.cheers to authenticated;
create policy "encouragements : road trip visible" on public.cheers
  for select to anon, authenticated using (private.can_view_crew(crew_id));
create policy "encouragements : retirés par les voyageurs" on public.cheers
  for delete to authenticated using (private.can_edit_crew(crew_id));

alter publication supabase_realtime add table public.cheers;

-- Laisser un mot : page visible, pas le road trip d'exemple, pas de lien (spam), au plus 30 messages
-- par road trip et par heure, et une minute d'attente entre deux messages d'un même compte.
create or replace function public.post_cheer(p_crew uuid, p_name text, p_message text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id   uuid;
  v_name text := left(trim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 40);
  v_msg  text := left(trim(coalesce(p_message, '')), 280);
begin
  if not private.can_view_crew(p_crew) then
    raise exception 'Road trip introuvable' using errcode = '42501';
  end if;
  if (select is_demo from public.crews where id = p_crew) then
    raise exception 'C''est un road trip d''exemple : ton mot n''irait à personne !' using errcode = 'P0001';
  end if;
  if char_length(v_name) < 1 or char_length(v_msg) < 1 then
    raise exception 'Écris ton prénom et ton message' using errcode = 'P0001';
  end if;
  if v_msg ~* '(https?://|www\.|\.(com|net|org|fr|io|ru)\M)' then
    raise exception 'Les liens ne sont pas acceptés sur le mur' using errcode = 'P0001';
  end if;
  if (select count(*) from public.cheers where crew_id = p_crew and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Beaucoup de messages en ce moment : réessaie dans un petit moment' using errcode = 'P0001';
  end if;
  if auth.uid() is not null and exists (
    select 1 from public.cheers where user_id = auth.uid() and created_at > now() - interval '1 minute'
  ) then
    raise exception 'Un message par minute, pas plus' using errcode = 'P0001';
  end if;
  insert into public.cheers (crew_id, author_name, message) values (p_crew, v_name, v_msg) returning id into v_id;
  return v_id;
end;
$$;

-- ── Visites de la page (anonymes) ────────────────────────────────────────────
create table public.crew_page_views (
  crew_id uuid not null references public.crews (id) on delete cascade,
  day     date not null default (now() at time zone 'Europe/Paris')::date,
  views   integer not null default 0 check (views >= 0),
  primary key (crew_id, day)
);
comment on table public.crew_page_views is 'Visites de la page d''un road trip par jour (anonymes, une par navigateur et par jour).';

alter table public.crew_page_views enable row level security;
grant select on public.crew_page_views to authenticated;
create policy "visites : vues par les voyageurs" on public.crew_page_views
  for select to authenticated using (private.can_edit_crew(crew_id));

-- Compte une visite (le site l'appelle une fois par navigateur et par jour). Les voyageurs eux-mêmes
-- ne sont pas comptés, ni une page qu'on ne peut pas voir.
create or replace function public.count_page_view(p_crew uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.can_view_crew(p_crew) or private.can_edit_crew(p_crew) then return; end if;
  insert into public.crew_page_views (crew_id, views) values (p_crew, 1)
  on conflict (crew_id, day) do update set views = public.crew_page_views.views + 1;
end;
$$;

revoke execute on function public.post_cheer(uuid, text, text), public.count_page_view(uuid) from public;
grant execute on function public.post_cheer(uuid, text, text), public.count_page_view(uuid) to anon, authenticated;
