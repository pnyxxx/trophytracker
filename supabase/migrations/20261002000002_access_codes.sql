-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — codes d'accès offerts
--
--  Un admin génère un code (ex. 4L-K7QM-2XRP) depuis l'administration : une note
--  (pour qui), un nombre d'utilisations et une date limite facultative. La
--  personne le saisit sur « Mon compte » : elle reçoit un accès équipage, comme
--  après un paiement, sans passer par Stripe. Les réductions éventuelles restent
--  des codes promo Stripe (docs/PAIEMENT.md).
-- ═════════════════════════════════════════════════════════════════════════════

create table public.access_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^4L-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  note        text check (char_length(note) <= 200),
  max_uses    integer not null default 1 check (max_uses between 1 and 500),
  uses        integer not null default 0 check (uses >= 0),
  expires_at  timestamptz,
  revoked_at  timestamptz,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
comment on table public.access_codes is
  'Codes d''accès équipage offerts. Lecture et écriture uniquement via les fonctions admin_* et redeem_access_code.';

alter table public.access_codes enable row level security;
revoke all on public.access_codes from public, anon, authenticated;

-- Un achat peut maintenant venir d'un code.
alter table public.crew_purchases drop constraint crew_purchases_source_check;
alter table public.crew_purchases add constraint crew_purchases_source_check check (source in ('stripe', 'admin', 'code'));
alter table public.crew_purchases add column access_code_id uuid references public.access_codes (id) on delete set null;

-- Essais ratés, pour freiner qui voudrait deviner un code au hasard.
create table private.access_code_failures (
  user_id uuid not null references auth.users (id) on delete cascade,
  at      timestamptz not null default now()
);
create index access_code_failures_user_idx on private.access_code_failures (user_id, at);

-- ── Admin ────────────────────────────────────────────────────────────────────
-- Lettres et chiffres sans ambiguïté (pas de 0/O, 1/I/L) : facile à dicter et à recopier.
create or replace function public.admin_create_access_code(p_note text default null, p_max_uses integer default 1, p_expires_at timestamptz default null)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_chars constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_raw   text;
  v_code  text;
begin
  if not private.is_admin() then raise exception 'Réservé aux administrateurs' using errcode = '42501'; end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'La date limite doit être dans le futur' using errcode = 'P0001';
  end if;
  loop
    v_bytes := extensions.gen_random_bytes(8);
    v_raw := '';
    for i in 0..7 loop
      v_raw := v_raw || substr(v_chars, 1 + get_byte(v_bytes, i) % char_length(v_chars), 1);
    end loop;
    v_code := '4L-' || substr(v_raw, 1, 4) || '-' || substr(v_raw, 5, 4);
    exit when not exists (select 1 from public.access_codes where code = v_code);
  end loop;
  insert into public.access_codes (code, note, max_uses, expires_at, created_by)
  values (v_code, nullif(trim(p_note), ''), coalesce(p_max_uses, 1), p_expires_at, auth.uid());
  return v_code;
end;
$$;

create or replace function public.admin_list_access_codes()
returns table (id uuid, code text, note text, max_uses integer, uses integer, expires_at timestamptz,
               revoked_at timestamptz, created_at timestamptz, used_by text[])
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'Réservé aux administrateurs' using errcode = '42501'; end if;
  return query
    select a.id, a.code, a.note, a.max_uses, a.uses, a.expires_at, a.revoked_at, a.created_at,
           coalesce(array_agg(coalesce(c.name, p.customer_email, '?') order by p.paid_at) filter (where p.id is not null), '{}')
    from public.access_codes a
    left join public.crew_purchases p on p.access_code_id = a.id
    left join public.crews c on c.id = p.crew_id
    group by a.id
    order by a.created_at desc
    limit 500;
end;
$$;

create or replace function public.admin_revoke_access_code(p_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'Réservé aux administrateurs' using errcode = '42501'; end if;
  update public.access_codes set revoked_at = now() where id = p_id and revoked_at is null;
end;
$$;

-- La liste des achats indique le code utilisé.
drop function public.admin_list_purchases();
create function public.admin_list_purchases()
returns table (id uuid, customer_email text, source text, status text, amount_cents integer, refunded_cents integer,
               created_at timestamptz, paid_at timestamptz, crew_name text, crew_slug text, access_code text)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'Réservé aux administrateurs' using errcode = '42501'; end if;
  return query
    select p.id, p.customer_email, p.source, p.status, p.amount_cents, p.refunded_cents,
           p.created_at, p.paid_at, c.name, c.slug, a.code
    from public.crew_purchases p
    left join public.crews c on c.id = p.crew_id
    left join public.access_codes a on a.id = p.access_code_id
    where p.status <> 'expired'
    order by p.created_at desc
    limit 500;
end;
$$;

-- ── Utiliser un code (Mon compte) ────────────────────────────────────────────
-- Renvoie 'ok', ou la raison du refus sans lever d'erreur (sinon l'essai raté ne serait
-- pas enregistré) : 'invalid', 'expired', 'exhausted', 'already_used', 'too_many'.
create or replace function public.redeem_access_code(p_code text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_input text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_code  public.access_codes;
begin
  if v_uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if exists (select 1 from public.crew_members where user_id = v_uid) then
    raise exception 'Vous faites déjà partie d''un équipage (un seul par compte)' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.crew_purchases where user_id = v_uid and status = 'paid' and used_at is null) then
    raise exception 'Vous avez déjà un accès : créez votre équipage' using errcode = 'P0001';
  end if;
  if (select count(*) from private.access_code_failures where user_id = v_uid and at > now() - interval '1 hour') >= 10 then
    return 'too_many';
  end if;

  -- « 4L-K7QM-2XRP », « 4lk7qm2xrp » ou « K7QM 2XRP » : tout est accepté.
  if v_input !~ '^4L' or char_length(v_input) <> 10 then v_input := '4L' || v_input; end if;
  select * into v_code from public.access_codes where replace(code, '-', '') = v_input for update;
  if v_code.id is null or v_code.revoked_at is not null then
    insert into private.access_code_failures (user_id) values (v_uid);
    return 'invalid';
  end if;
  if v_code.expires_at is not null and v_code.expires_at <= now() then return 'expired'; end if;
  if v_code.uses >= v_code.max_uses then return 'exhausted'; end if;
  if exists (select 1 from public.crew_purchases where user_id = v_uid and access_code_id = v_code.id) then
    return 'already_used';
  end if;

  insert into public.crew_purchases (user_id, customer_email, source, status, amount_cents, paid_at, access_code_id)
  values (v_uid, (select email from auth.users where id = v_uid), 'code', 'paid', 0, now(), v_code.id);
  update public.access_codes set uses = uses + 1 where id = v_code.id;
  return 'ok';
end;
$$;

-- ── Droits ───────────────────────────────────────────────────────────────────
revoke execute on function
  public.admin_create_access_code(text, integer, timestamptz),
  public.admin_list_access_codes(),
  public.admin_revoke_access_code(uuid),
  public.admin_list_purchases(),
  public.redeem_access_code(text)
from public, anon, authenticated;

grant execute on function
  public.admin_create_access_code(text, integer, timestamptz),
  public.admin_list_access_codes(),
  public.admin_revoke_access_code(uuid),
  public.admin_list_purchases(),
  public.redeem_access_code(text)
to authenticated;
