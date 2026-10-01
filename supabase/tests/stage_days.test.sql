-- ═════════════════════════════════════════════════════════════════════════════
--  Tests du calendrier des étapes et des sous-étapes (pgTAP).
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

insert into public.waypoints (id, kind, name, lat, lon, sort_order, day_start, day_end) values
  ('00000000-0000-0000-0000-00000000e001', 'bivouac', 'Test bivouac', 31, -4, 1000, 6, 8);
insert into public.waypoints (id, kind, name, lat, lon, sort_order, parent_id, day_start, day_end) values
  ('00000000-0000-0000-0000-00000000e002', 'loop', 'Test boucle', 31, -4, 1001, '00000000-0000-0000-0000-00000000e001', 7, 7);
insert into public.waypoints (id, kind, name, lat, lon, sort_order) values
  ('00000000-0000-0000-0000-00000000e003', 'stage', 'Test seule', 31, -4, 1002);

select throws_ok(
  $$insert into public.waypoints (kind, name, lat, lon, parent_id) values
      ('loop', 'Sous-sous-étape', 31, -4, '00000000-0000-0000-0000-00000000e002')$$,
  'P0001', null, 'une sous-étape ne peut pas avoir de sous-étapes'
);
select throws_ok(
  $$update public.waypoints set parent_id = '00000000-0000-0000-0000-00000000e002'
    where id = '00000000-0000-0000-0000-00000000e001'$$,
  'P0001', null, 'une étape qui a des sous-étapes ne peut pas devenir une sous-étape'
);
select throws_ok(
  $$insert into public.waypoints (kind, name, lat, lon, day_start, day_end) values ('stage', 'À l''envers', 31, -4, 5, 3)$$,
  '23514', null, 'le dernier jour ne peut pas précéder le premier'
);
select throws_ok(
  $$update public.waypoints set parent_id = id where id = '00000000-0000-0000-0000-00000000e003'$$,
  '23514', null, 'une étape ne peut pas être sa propre sous-étape'
);

delete from public.waypoints where id = '00000000-0000-0000-0000-00000000e001';
select is((select count(*) from public.waypoints where id = '00000000-0000-0000-0000-00000000e002'), 0::bigint,
  'supprimer une étape supprime ses sous-étapes');

-- Droits : lecture publique des nouvelles colonnes, écriture réservée aux admins (RLS).
select ok(has_column_privilege('anon', 'public.waypoints', 'day_start', 'select'), 'les visiteurs lisent les jours des étapes');
select ok(has_column_privilege('anon', 'public.waypoints', 'parent_id', 'select'), 'les visiteurs lisent les sous-étapes');
select ok(not has_table_privilege('anon', 'public.waypoints', 'insert'), 'les visiteurs ne peuvent pas ajouter d''étape');
select ok(not has_function_privilege('authenticated', 'private.check_waypoint_parent()', 'execute'),
  'la fonction de contrôle n''est pas appelable directement');

select * from finish();
rollback;
