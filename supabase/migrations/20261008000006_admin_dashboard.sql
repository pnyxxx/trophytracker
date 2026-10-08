-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — tableau de bord de l'administration (refonte « Balise »)
--
--  admin_dashboard()   : chiffres clés, points GPS reçus heure par heure sur 24 h,
--                        dernier point reçu (santé de la réception GPS) et « à traiter ».
--  admin_list_trips()  : tous les road trips avec propriétaire, statut, kilomètres et GPS.
--  Réservées aux administrateurs (double authentification comprise : private.is_admin()).
-- ═════════════════════════════════════════════════════════════════════════════

create or replace function public.admin_dashboard()
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_month timestamptz := date_trunc('month', now());
begin
  if not private.is_admin() then raise exception 'Réservé aux administrateurs' using errcode = '42501'; end if;
  return jsonb_build_object(
    'live', (select count(*) from public.crews where last_fix_at > now() - interval '10 minutes'),
    'offline', (select count(*) from public.crews where tracking_enabled and last_fix_at <= now() - interval '10 minutes'),
    'preparing', (select count(*) from public.crews where not tracking_enabled and last_fix_at is null and not is_demo),
    'crews', (select count(*) from public.crews where not is_demo),
    'users', (select count(*) from auth.users),
    'follows', (select count(*) from public.follows),
    'sales_month', (select count(*) from public.crew_purchases where status = 'paid' and source = 'stripe' and paid_at >= v_month),
    'revenue_month_cents', (select coalesce(sum(amount_cents), 0) from public.crew_purchases where status = 'paid' and source = 'stripe' and paid_at >= v_month),
    'codes_month', (select count(*) from public.crew_purchases where status = 'paid' and source = 'code' and paid_at >= v_month),
    'last_position_at', (select max(created_at) from public.positions),
    -- 24 cases, de la plus ancienne (il y a 23 h) à l'heure en cours.
    'hourly', (
      select jsonb_agg(coalesce(n, 0) order by h)
      from generate_series(date_trunc('hour', now()) - interval '23 hours', date_trunc('hour', now()), interval '1 hour') as h
      left join (
        select date_trunc('hour', created_at) as hour, count(*) as n
        from public.positions where created_at > date_trunc('hour', now()) - interval '23 hours'
        group by 1
      ) p on p.hour = h
    ),
    -- À traiter : départs proches sans GPS, batteries faibles en route, paiements remboursés récemment.
    'todo', coalesce((
      select jsonb_agg(t order by t ->> 'level', t ->> 'at')
      from (
        select jsonb_build_object('level', '1', 'kind', 'no_gps', 'slug', c.slug, 'name', c.name, 'at', c.starts_on::text,
                                  'text', 'Départ le ' || to_char(c.starts_on, 'DD/MM') || ' et aucun téléphone relié') as t
        from public.crews c join public.crew_devices d on d.crew_id = c.id
        where c.starts_on between current_date and current_date + 3 and d.device_key_hash is null and d.traccar_device_id is null and not c.is_demo
        union all
        select jsonb_build_object('level', '2', 'kind', 'battery', 'slug', c.slug, 'name', c.name, 'at', p.recorded_at::text,
                                  'text', 'Batterie du téléphone à ' || round(p.battery::numeric) || ' %')
        from public.crews c
        cross join lateral (select battery, recorded_at from public.positions where crew_id = c.id order by recorded_at desc limit 1) p
        where c.tracking_enabled and c.last_fix_at > now() - interval '1 hour' and p.battery is not null and p.battery < 15
        union all
        select jsonb_build_object('level', '3', 'kind', 'refund', 'slug', null, 'name', coalesce(customer_email, 'paiement'), 'at', refunded_at::text,
                                  'text', 'Paiement remboursé : vérifier le road trip associé')
        from public.crew_purchases where status = 'refunded' and refunded_at > now() - interval '7 days'
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_list_trips()
returns table (id uuid, slug text, name text, owner_name text, owner_email text, is_public boolean, is_listed boolean,
               is_demo boolean, tracking_enabled boolean, last_fix_at timestamptz, total_distance_m double precision,
               starts_on date, ends_on date, followers_count integer, has_device_key boolean, traccar_device_id text)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'Réservé aux administrateurs' using errcode = '42501'; end if;
  return query
    select c.id, c.slug, c.name, p.display_name, u.email::text, c.is_public, c.is_listed, c.is_demo, c.tracking_enabled,
           c.last_fix_at, c.total_distance_m, c.starts_on, c.ends_on, c.followers_count,
           d.device_key_hash is not null, d.traccar_device_id
    from public.crews c
    left join public.crew_devices d on d.crew_id = c.id
    left join lateral (select user_id from public.crew_members m where m.crew_id = c.id and m.role = 'owner' order by m.created_at limit 1) o on true
    left join public.profiles p on p.id = o.user_id
    left join auth.users u on u.id = o.user_id
    order by c.last_fix_at desc nulls last, c.created_at desc;
end;
$$;

revoke execute on function public.admin_dashboard() from public, anon;
revoke execute on function public.admin_list_trips() from public, anon;
grant execute on function public.admin_dashboard() to authenticated;
grant execute on function public.admin_list_trips() to authenticated;
