/**
 * Météo à la position d'un road trip, avec Open-Meteo (https://open-meteo.com) : gratuit, sans clé,
 * sans compte. Seule la position arrondie (~1 km) lui est envoyée, depuis le navigateur du lecteur.
 */

export interface Weather {
  temperature: number;
  feelsLike: number;
  windKmh: number;
  code: number;
  isDay: boolean;
  /** Heures locales du lieu, « 07:40 ». */
  sunrise: string | null;
  sunset: string | null;
}

/** Codes météo WMO → pictogramme et libellé. */
export function describeWeather(code: number, isDay = true): { icon: string; label: string } {
  if (code === 0) return isDay ? { icon: '☀️', label: 'Grand soleil' } : { icon: '🌙', label: 'Ciel dégagé' };
  if (code <= 2) return { icon: isDay ? '🌤️' : '☁️', label: 'Quelques nuages' };
  if (code === 3) return { icon: '☁️', label: 'Couvert' };
  if (code <= 48) return { icon: '🌫️', label: 'Brouillard' };
  if (code <= 57) return { icon: '🌦️', label: 'Bruine' };
  if (code <= 67) return { icon: '🌧️', label: 'Pluie' };
  if (code <= 77) return { icon: '🌨️', label: 'Neige' };
  if (code <= 82) return { icon: '🌧️', label: 'Averses' };
  if (code <= 86) return { icon: '🌨️', label: 'Averses de neige' };
  return { icon: '⛈️', label: 'Orage' };
}

/** Cap en degrés → « Sud-Ouest ». */
export function compassLabel(deg: number | null | undefined) {
  if (deg == null || !Number.isFinite(deg)) return null;
  const names = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'];
  return names[Math.round((((deg % 360) + 360) % 360) / 45) % 8]!;
}

export async function fetchWeather(lat: number, lon: number, signal?: AbortSignal): Promise<Weather | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}`
    + '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&daily=sunrise,sunset&timezone=auto&forecast_days=1';
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const d = (await res.json()) as {
    current?: { temperature_2m: number; apparent_temperature: number; weather_code: number; wind_speed_10m: number; is_day: number };
    daily?: { sunrise?: string[]; sunset?: string[] };
  };
  if (!d.current) return null;
  const hhmm = (iso?: string) => (iso ? iso.slice(11, 16) : null);
  return {
    temperature: Math.round(d.current.temperature_2m),
    feelsLike: Math.round(d.current.apparent_temperature),
    windKmh: Math.round(d.current.wind_speed_10m),
    code: d.current.weather_code,
    isDay: d.current.is_day === 1,
    sunrise: hhmm(d.daily?.sunrise?.[0]),
    sunset: hhmm(d.daily?.sunset?.[0]),
  };
}

/** Mot court pour une case de prévision (« pluie », « soleil »…). */
export function shortWeather(code: number, isDay = true) {
  if (code === 0) return isDay ? 'soleil' : 'dégagé';
  if (code <= 2) return 'éclaircies';
  if (code === 3) return 'nuages';
  if (code <= 48) return 'brouillard';
  if (code <= 57) return 'bruine';
  if (code <= 67) return 'pluie';
  if (code <= 77) return 'neige';
  if (code <= 82) return 'averses';
  if (code <= 86) return 'neige';
  return 'orage';
}

export interface ForecastSlot {
  /** « maint. », « 15 h », « demain ». */
  label: string;
  temperature: number;
  code: number;
  isDay: boolean;
}

interface HourlyResponse {
  current?: { time: string; temperature_2m: number; weather_code: number; is_day: number };
  hourly?: { time: string[]; temperature_2m: number[]; weather_code: number[]; is_day: number[] };
}

/**
 * Quatre créneaux à partir de la réponse Open-Meteo : maintenant, dans 3 h, dans 6 h et demain à 14 h
 * (heures locales du lieu). Fonction pure, testée.
 */
export function forecastSlots(d: HourlyResponse): ForecastSlot[] {
  if (!d.current || !d.hourly) return [];
  const slots: ForecastSlot[] = [{ label: 'maint.', temperature: Math.round(d.current.temperature_2m), code: d.current.weather_code, isDay: d.current.is_day === 1 }];
  const now = d.current.time.slice(0, 13); // « 2026-10-08T15 »
  const i0 = d.hourly.time.findIndex((t) => t.slice(0, 13) === now);
  const at = (i: number, label: string) => {
    const h = d.hourly!;
    if (i < 0 || i >= h.time.length) return;
    slots.push({ label, temperature: Math.round(h.temperature_2m[i]!), code: h.weather_code[i]!, isDay: h.is_day[i] === 1 });
  };
  if (i0 >= 0) {
    for (const k of [3, 6]) {
      const t = d.hourly.time[i0 + k];
      if (t) at(i0 + k, `${Number(t.slice(11, 13))} h`);
    }
  }
  const tomorrow = new Date(`${d.current.time.slice(0, 10)}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  at(d.hourly.time.indexOf(`${tomorrow.toISOString().slice(0, 10)}T14:00`), 'demain');
  return slots;
}

export async function fetchForecast(lat: number, lon: number, signal?: AbortSignal): Promise<ForecastSlot[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}`
    + '&current=temperature_2m,weather_code,is_day&hourly=temperature_2m,weather_code,is_day&timezone=auto&forecast_days=2';
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  return forecastSlots((await res.json()) as HourlyResponse);
}
