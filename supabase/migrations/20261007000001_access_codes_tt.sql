-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — codes d'accès offerts au format TT-XXXX-XXXX
--
--  Les nouveaux codes commencent par « TT- » (TrophyTracker) au lieu de « 4L- ».
--  Les codes « 4L- » déjà distribués restent valables : rien n'est supprimé.
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.access_codes drop constraint access_codes_code_check;
alter table public.access_codes add constraint access_codes_code_check
  check (code ~ '^(TT|4L)-[A-Z0-9]{4}-[A-Z0-9]{4}$');

-- Même fonction qu'avant (20261002000002_access_codes.sql), seul le préfixe change.
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
    v_code := 'TT-' || substr(v_raw, 1, 4) || '-' || substr(v_raw, 5, 4);
    exit when not exists (select 1 from public.access_codes where code = v_code);
  end loop;
  insert into public.access_codes (code, note, max_uses, expires_at, created_by)
  values (v_code, nullif(trim(p_note), ''), coalesce(p_max_uses, 1), p_expires_at, auth.uid());
  return v_code;
end;
$$;

-- Même fonction qu'avant ; la saisie sans préfixe essaie « TT » puis « 4L ».
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

  -- « TT-K7QM-2XRP », « ttk7qm2xrp », « K7QM 2XRP » ou un ancien « 4L-… » : tout est accepté.
  select * into v_code from public.access_codes
  where replace(code, '-', '') = any (
    case when char_length(v_input) = 8 then array['TT' || v_input, '4L' || v_input] else array[v_input] end
  )
  for update;
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
