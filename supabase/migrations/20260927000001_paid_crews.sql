-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — inscription payante des équipages
--
--  Suivre un équipage reste gratuit. Créer la page d'un équipage demande un
--  « accès » payé une fois (15 € jusqu'au 30 novembre 2026 inclus, puis 19 €).
--
--  Parcours : le site appelle l'Edge Function create-checkout (qui appelle
--  purchase_start → session Stripe Checkout → purchase_attach_session), Stripe
--  confirme le paiement à l'Edge Function stripe-webhook (purchase_paid), puis
--  create_crew consomme l'accès payé. Un admin peut offrir un accès.
--
--  Les équipages déjà créés avant cette migration gardent leur page (offerts).
-- ═════════════════════════════════════════════════════════════════════════════

-- ── Tarif ────────────────────────────────────────────────────────────────────
-- Montants en centimes. Le site affiche les mêmes valeurs (apps/web/src/lib/legal.ts).
create or replace function private.crew_price_at(p_at timestamptz)
returns integer
language sql immutable
set search_path = ''
as $$
  select case when p_at < timestamptz '2026-12-01 00:00:00 Europe/Paris' then 1500 else 1900 end;
$$;

create or replace function public.crew_price()
returns table (amount_cents integer, is_launch_price boolean, launch_price_until timestamptz, regular_cents integer)
language sql stable security definer
set search_path = ''
as $$
  select private.crew_price_at(now()),
         now() < timestamptz '2026-12-01 00:00:00 Europe/Paris',
         timestamptz '2026-12-01 00:00:00 Europe/Paris',
         1900;
$$;

-- ── Achats ───────────────────────────────────────────────────────────────────
create table public.crew_purchases (
  id                    uuid primary key default gen_random_uuid(),
  -- L'acheteur ; si son compte est supprimé, l'achat reste (pièce comptable, 10 ans).
  user_id               uuid references auth.users (id) on delete set null,
  customer_email        text check (char_length(customer_email) <= 254),
  source                text not null check (source in ('stripe', 'admin')),
  status                text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'refunded')),
  amount_cents          integer not null check (amount_cents >= 0),
  refunded_cents        integer not null default 0 check (refunded_cents >= 0),
  currency              text not null default 'eur',
  stripe_session_id     text unique,
  stripe_payment_intent text unique,
  -- Preuves du parcours de commande (Code de la consommation).
  terms_accepted_at     timestamptz,
  immediate_start_at    timestamptz,
  -- Équipage créé avec cet accès (un accès = une page, même si elle est supprimée ensuite).
  used_at               timestamptz,
  crew_id               uuid references public.crews (id) on delete set null,
  created_at            timestamptz not null default now(),
  paid_at               timestamptz,
  refunded_at           timestamptz
);
comment on table public.crew_purchases is
  'Accès payés pour créer la page d''un équipage. Écriture uniquement via les fonctions (site, Stripe, admin).';

create index crew_purchases_user_idx on public.crew_purchases (user_id);

alter table public.crew_purchases enable row level security;
revoke all on public.crew_purchases from public, anon, authenticated;
grant select on public.crew_purchases to authenticated;
create policy "achats : les siens" on public.crew_purchases
  for select to authenticated using (user_id = (select auth.uid()));

-- ── Début d'achat (Edge Function create-checkout, clé service) ──────────────
create or replace function public.purchase_start(p_user uuid, p_email text)
returns table (purchase_id uuid, amount_cents integer)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_amount integer := private.crew_price_at(now());
  v_id     uuid;
begin
  if exists (select 1 from public.crew_members where user_id = p_user) then
    raise exception 'Vous faites déjà partie d''un équipage (un seul par compte)' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.crew_purchases where user_id = p_user and status = 'paid' and used_at is null) then
    raise exception 'Vous avez déjà un accès payé : créez votre équipage' using errcode = 'P0001';
  end if;
  insert into public.crew_purchases (user_id, customer_email, source, amount_cents, terms_accepted_at, immediate_start_at)
  values (p_user, p_email, 'stripe', v_amount, now(), now())
  returning id into v_id;
  return query select v_id, v_amount;
end;
$$;

create or replace function public.purchase_attach_session(p_purchase uuid, p_session text)
returns void
language sql security definer
set search_path = ''
as $$
  update public.crew_purchases set stripe_session_id = p_session where id = p_purchase and status = 'pending';
$$;

-- ── Événements Stripe (Edge Function stripe-webhook, clé service) ───────────
-- Idempotent : Stripe peut renvoyer le même événement plusieurs fois.
create or replace function public.purchase_paid(p_session text, p_payment_intent text, p_amount integer, p_email text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  select status into v_status from public.crew_purchases where stripe_session_id = p_session for update;
  if v_status is null then return 'unknown'; end if;
  if v_status = 'paid' then return 'already'; end if;
  update public.crew_purchases
     set status = 'paid', paid_at = now(), stripe_payment_intent = p_payment_intent,
         amount_cents = coalesce(p_amount, amount_cents), customer_email = coalesce(p_email, customer_email)
   where stripe_session_id = p_session;
  return 'paid';
end;
$$;

create or replace function public.purchase_expired(p_session text)
returns void
language sql security definer
set search_path = ''
as $$
  update public.crew_purchases set status = 'expired' where stripe_session_id = p_session and status = 'pending';
$$;

-- Remboursement : un remboursement total met fin au service (page dépubliée,
-- GPS coupé) ; un remboursement partiel est seulement noté.
create or replace function public.purchase_refunded(p_payment_intent text, p_refunded_cents integer)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_purchase public.crew_purchases;
begin
  select * into v_purchase from public.crew_purchases where stripe_payment_intent = p_payment_intent for update;
  if v_purchase.id is null then return 'unknown'; end if;
  update public.crew_purchases set refunded_cents = p_refunded_cents where id = v_purchase.id;
  if p_refunded_cents < v_purchase.amount_cents then return 'partial'; end if;

  update public.crew_purchases set status = 'refunded', refunded_at = now() where id = v_purchase.id;
  if v_purchase.crew_id is not null then
    update public.crews set is_public = false where id = v_purchase.crew_id;
    update public.crew_devices set device_key_hash = null where crew_id = v_purchase.crew_id;
  end if;
  return 'refunded';
end;
$$;

-- ── Admin : offrir un accès, lister les achats ──────────────────────────────
create or replace function public.admin_grant_crew_access(p_email text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if not private.is_admin() then raise exception 'Réservé aux administrateurs' using errcode = '42501'; end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then raise exception 'Aucun compte avec cet email' using errcode = 'P0001'; end if;
  if exists (select 1 from public.crew_purchases where user_id = v_user and status = 'paid' and used_at is null) then
    raise exception 'Ce compte a déjà un accès non utilisé' using errcode = 'P0001';
  end if;
  insert into public.crew_purchases (user_id, customer_email, source, status, amount_cents, paid_at)
  values (v_user, lower(trim(p_email)), 'admin', 'paid', 0, now());
end;
$$;

create or replace function public.admin_list_purchases()
returns table (id uuid, customer_email text, source text, status text, amount_cents integer, refunded_cents integer,
               created_at timestamptz, paid_at timestamptz, crew_name text, crew_slug text)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'Réservé aux administrateurs' using errcode = '42501'; end if;
  return query
    select p.id, p.customer_email, p.source, p.status, p.amount_cents, p.refunded_cents,
           p.created_at, p.paid_at, c.name, c.slug
    from public.crew_purchases p left join public.crews c on c.id = p.crew_id
    where p.status <> 'expired'
    order by p.created_at desc
    limit 500;
end;
$$;

-- ── Création d'équipage : il faut un accès payé (sauf admin) ────────────────
create or replace function public.create_crew(p_name text, p_car_number text default null, p_tagline text default null)
returns public.crews
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_purchase uuid;
  v_base     text;
  v_slug     text;
  v_crew     public.crews;
  i          integer := 1;
begin
  if v_uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if not private.mfa_ok() then raise exception 'Code de double authentification requis' using errcode = '42501'; end if;

  if exists (select 1 from public.crew_members where user_id = v_uid) then
    raise exception 'Vous faites déjà partie d''un équipage (un seul par compte)' using errcode = 'P0001';
  end if;

  if not private.is_admin() then
    select id into v_purchase from public.crew_purchases
     where user_id = v_uid and status = 'paid' and used_at is null
     order by paid_at limit 1 for update;
    if v_purchase is null then
      raise exception 'Paiement requis pour créer la page d''un équipage' using errcode = 'P0001';
    end if;
  end if;

  v_base := coalesce(nullif(private.slugify(p_name), ''), 'equipage');
  if char_length(v_base) < 2 then v_base := 'equipage-' || v_base; end if;
  v_slug := v_base;
  while exists (select 1 from public.crews where slug = v_slug) loop
    i := i + 1;
    v_slug := v_base || '-' || i;
  end loop;

  insert into public.crews (slug, name, car_number, tagline)
  values (v_slug, trim(p_name), nullif(trim(p_car_number), ''), nullif(trim(p_tagline), ''))
  returning * into v_crew;

  insert into public.crew_members (crew_id, user_id, role) values (v_crew.id, v_uid, 'owner');
  insert into public.crew_devices (crew_id) values (v_crew.id);
  if v_purchase is not null then
    update public.crew_purchases set used_at = now(), crew_id = v_crew.id where id = v_purchase;
  end if;
  return v_crew;
end;
$$;

-- ── Droits ───────────────────────────────────────────────────────────────────
revoke execute on function
  private.crew_price_at(timestamptz),
  public.crew_price(),
  public.purchase_start(uuid, text),
  public.purchase_attach_session(uuid, text),
  public.purchase_paid(text, text, integer, text),
  public.purchase_expired(text),
  public.purchase_refunded(text, integer),
  public.admin_grant_crew_access(text),
  public.admin_list_purchases()
from public, anon, authenticated;

grant execute on function private.crew_price_at(timestamptz) to anon, authenticated, service_role;
grant execute on function public.crew_price() to anon, authenticated, service_role;
grant execute on function public.admin_grant_crew_access(text), public.admin_list_purchases() to authenticated;
-- Réservées aux Edge Functions (clé service), jamais appelables depuis le navigateur.
grant execute on function
  public.purchase_start(uuid, text),
  public.purchase_attach_session(uuid, text),
  public.purchase_paid(text, text, integer, text),
  public.purchase_expired(text),
  public.purchase_refunded(text, integer)
to service_role;
