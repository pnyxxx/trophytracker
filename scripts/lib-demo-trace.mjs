/**
 * Trace GPS de démonstration qui suit le vrai tracé routier de la page d'accueil
 * (apps/web/src/components/landing/road-path.json, points [lon, lat]).
 * Utilisé par seed-demo.mjs et demo-trace.mjs.
 */
import { readFileSync } from 'node:fs';

/** Tracé routier complet [lon, lat] : Biarritz → village de Merzouga (puis approximatif jusqu'à Marrakech). */
export const ROAD_PATH = JSON.parse(
  readFileSync(new URL('../apps/web/src/components/landing/road-path.json', import.meta.url), 'utf8'),
);

/** Tracé routier de Biarritz jusqu'au point donné (inclus), par ex. 'merzouga'. */
export function roadUntil(lon, lat) {
  const i = ROAD_PATH.findIndex(([x, y]) => x === lon && y === lat);
  if (i < 0) throw new Error(`Point ${lon},${lat} absent du tracé`);
  return ROAD_PATH.slice(0, i + 1);
}
export const MERZOUGA = [-3.99763, 31.21516];
export const SALAMANQUE = [-5.66642, 40.96821];

const toRad = (d) => (d * Math.PI) / 180;
function km([lon1, lat1], [lon2, lat2]) {
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/**
 * SQL qui envoie la trace point par point à private.ingest_position (comme un vrai téléphone) :
 * un point environ tous les kilomètres, le dernier `endAgoMin` minutes avant maintenant,
 * le premier `hours` heures plus tôt.
 */
export function traceSql(crewId, path, endAgoMin, hours) {
  const pts = [path[0]];
  for (let i = 1; i < path.length; i++) {
    const [a, b] = [path[i - 1], path[i]];
    const n = Math.max(1, Math.round(km(a, b)));
    for (let k = 1; k <= n; k++) pts.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  const end = Date.now() - endAgoMin * 60_000;
  const step = (hours * 3600_000) / (pts.length - 1);
  return pts
    .map(([lon, lat], i) => {
      const at = new Date(end - (pts.length - 1 - i) * step).toISOString();
      return `select private.ingest_position('${crewId}', '${at}', ${lat.toFixed(6)}, ${lon.toFixed(6)}, ${60 + (i % 30)}, null, null, 10, 80, 'device');`;
    })
    .join('\n');
}

/** SQL qui efface la trace d'un équipage et remet ses compteurs à zéro. */
export function clearTraceSql(crewId) {
  return `delete from public.positions where crew_id = '${crewId}';
delete from private.gps_pending_jumps where crew_id = '${crewId}';
update public.crews set last_lat = null, last_lon = null, last_speed_kmh = null, last_fix_at = null, total_distance_m = 0 where id = '${crewId}';`;
}
