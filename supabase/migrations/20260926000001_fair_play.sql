-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — charte fair-play obligatoire avant d'activer le GPS
--
--  Le règlement du 4L Trophy interdit le GPS pour s'orienter. Avant de générer
--  la clé GPS de son équipage, un membre accepte au nom de l'équipage une charte
--  (ne pas utiliser TrophyTracker pour s'orienter, respecter le règlement,
--  accord de tous les membres, pas un outil de sécurité). On garde la preuve :
--  date, compte et nom affiché au moment de l'acceptation (le nom reste si le
--  compte est supprimé plus tard).
--
--  Les équipages qui ont déjà une clé continuent d'émettre ; ils devront
--  accepter la charte avant de générer une nouvelle clé.
-- ═════════════════════════════════════════════════════════════════════════════

-- Rangé dans crew_devices : aucune lecture directe via l'API, accès par fonctions.
alter table public.crew_devices
  add column fair_play_accepted_at      timestamptz,
  add column fair_play_accepted_by      uuid references auth.users (id) on delete set null,
  add column fair_play_accepted_by_name text;

comment on column public.crew_devices.fair_play_accepted_at is
  'Acceptation de la charte fair-play (preuve) : obligatoire pour générer une clé GPS.';

-- ── Accepter la charte ──────────────────────────────────────────────────────
create or replace function public.accept_fair_play(p_crew uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.can_edit_crew(p_crew) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  insert into public.crew_devices (crew_id, fair_play_accepted_at, fair_play_accepted_by, fair_play_accepted_by_name)
  values (p_crew, now(), auth.uid(), (select display_name from public.profiles where id = auth.uid()))
  on conflict (crew_id) do update set
    fair_play_accepted_at      = excluded.fair_play_accepted_at,
    fair_play_accepted_by      = excluded.fair_play_accepted_by,
    fair_play_accepted_by_name = excluded.fair_play_accepted_by_name;
end;
$$;

-- ── Clé GPS : refusée tant que la charte n'est pas acceptée ─────────────────
create or replace function public.regenerate_device_key(p_crew uuid)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_key text := 'tt_' || encode(extensions.gen_random_bytes(24), 'hex');
begin
  if not private.can_edit_crew(p_crew) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.crew_devices where crew_id = p_crew and fair_play_accepted_at is not null
  ) then
    raise exception 'Acceptez d''abord la charte fair-play' using errcode = 'P0001';
  end if;
  -- Seul le hash est conservé : la clé n'est affichée qu'une fois.
  update public.crew_devices set device_key_hash = private.sha256_hex(v_key) where crew_id = p_crew;
  return v_key;
end;
$$;

-- ── Infos de suivi : on ajoute l'acceptation de la charte ───────────────────
-- (le type de retour change : il faut supprimer puis recréer la fonction)
drop function public.get_crew_tracking(uuid);
create function public.get_crew_tracking(p_crew uuid)
returns table (
  traccar_device_id          text,
  has_device_key             boolean,
  fair_play_accepted_at      timestamptz,
  fair_play_accepted_by_name text
)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not private.can_edit_crew(p_crew) then return; end if;
  return query
    select d.traccar_device_id, d.device_key_hash is not null, d.fair_play_accepted_at, d.fair_play_accepted_by_name
    from public.crew_devices d where d.crew_id = p_crew;
end;
$$;

revoke execute on function public.accept_fair_play(uuid), public.get_crew_tracking(uuid) from public, anon;
grant execute on function public.accept_fair_play(uuid), public.get_crew_tracking(uuid) to authenticated;
