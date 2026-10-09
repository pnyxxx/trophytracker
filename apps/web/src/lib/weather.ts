/**
 * Météo à la position d'un road trip, avec Open-Meteo (https://open-meteo.com) : gratuit, sans clé,
 * sans compte. Seule la position arrondie (~1 km) lui est envoyée, depuis le navigateur du lecteur.
 */

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

/** Famille visuelle d'un code météo (fond de la carte, pictogramme animé). */
export type WeatherKind = 'clear' | 'clear-night' | 'partly' | 'partly-night' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

export function weatherKind(code: number, isDay = true): WeatherKind {
  if (code === 0) return isDay ? 'clear' : 'clear-night';
  if (code <= 2) return isDay ? 'partly' : 'partly-night';
  if (code === 3) return 'cloudy';
  if (code <= 48) return 'fog';
  if (code <= 57) return 'drizzle';
  if (code <= 67 || (code >= 80 && code <= 82)) return 'rain';
  if (code <= 77 || code === 85 || code === 86) return 'snow';
  return 'storm';
}

export interface ForecastSlot {
  /** « 16 h ». */
  label: string;
  temperature: number;
  code: number;
  isDay: boolean;
  /** Probabilité de pluie, en %. */
  rain: number | null;
}

export interface WeatherBoard {
  now: { temperature: number; feelsLike: number; windKmh: number; code: number; isDay: boolean };
  /** Heures locales du lieu, en minutes depuis minuit (lever, coucher, maintenant). */
  sun: { rise: number; set: number; now: number } | null;
  sunrise: string | null;
  sunset: string | null;
  /** Les 12 prochaines heures, toutes les 2 h. */
  hours: ForecastSlot[];
  tomorrow: { min: number; max: number; code: number } | null;
}

interface MeteoResponse {
  current?: { time: string; temperature_2m: number; apparent_temperature: number; weather_code: number; wind_speed_10m: number; is_day: number };
  hourly?: { time: string[]; temperature_2m: number[]; weather_code: number[]; is_day: number[]; precipitation_probability?: (number | null)[] };
  daily?: { sunrise?: string[]; sunset?: string[]; temperature_2m_max?: number[]; temperature_2m_min?: number[]; weather_code?: number[] };
}

const minutesOf = (iso?: string) => (iso && iso.length >= 16 ? Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16)) : null);

/** Carte météo à partir de la réponse Open-Meteo (heures locales du lieu). Fonction pure, testée. */
export function weatherBoard(d: MeteoResponse): WeatherBoard | null {
  const c = d.current;
  if (!c) return null;
  const hours: ForecastSlot[] = [];
  const h = d.hourly;
  if (h) {
    const i0 = h.time.findIndex((t) => t.slice(0, 13) === c.time.slice(0, 13));
    if (i0 >= 0) {
      for (let k = 2; k <= 12; k += 2) {
        const i = i0 + k;
        if (i >= h.time.length) break;
        hours.push({
          label: `${Number(h.time[i]!.slice(11, 13))} h`,
          temperature: Math.round(h.temperature_2m[i]!),
          code: h.weather_code[i]!,
          isDay: h.is_day[i] === 1,
          rain: h.precipitation_probability?.[i] ?? null,
        });
      }
    }
  }
  const [rise, set, now] = [minutesOf(d.daily?.sunrise?.[0]), minutesOf(d.daily?.sunset?.[0]), minutesOf(c.time)];
  const max = d.daily?.temperature_2m_max?.[1];
  const min = d.daily?.temperature_2m_min?.[1];
  const code = d.daily?.weather_code?.[1];
  return {
    now: {
      temperature: Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      windKmh: Math.round(c.wind_speed_10m),
      code: c.weather_code,
      isDay: c.is_day === 1,
    },
    sun: rise != null && set != null && now != null && set > rise ? { rise, set, now } : null,
    sunrise: d.daily?.sunrise?.[0]?.slice(11, 16) ?? null,
    sunset: d.daily?.sunset?.[0]?.slice(11, 16) ?? null,
    hours,
    tomorrow: max != null && min != null && code != null ? { min: Math.round(min), max: Math.round(max), code } : null,
  };
}

export async function fetchWeatherBoard(lat: number, lon: number, signal?: AbortSignal): Promise<WeatherBoard | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}`
    + '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day'
    + '&hourly=temperature_2m,weather_code,is_day,precipitation_probability'
    + '&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=2';
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  return weatherBoard((await res.json()) as MeteoResponse);
}
