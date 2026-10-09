import { describe, expect, it } from 'vitest';
import { compassLabel, describeWeather, weatherBoard, weatherKind } from './weather';

describe('describeWeather', () => {
  it('traduit les codes météo', () => {
    expect(describeWeather(0).label).toBe('Grand soleil');
    expect(describeWeather(0, false).icon).toBe('🌙');
    expect(describeWeather(3).label).toBe('Couvert');
    expect(describeWeather(63).label).toBe('Pluie');
    expect(describeWeather(75).label).toBe('Neige');
    expect(describeWeather(95).label).toBe('Orage');
  });
});

describe('compassLabel', () => {
  it('donne la direction', () => {
    expect(compassLabel(0)).toBe('Nord');
    expect(compassLabel(225)).toBe('Sud-Ouest');
    expect(compassLabel(359)).toBe('Nord');
    expect(compassLabel(-90)).toBe('Ouest');
    expect(compassLabel(null)).toBeNull();
  });
});

describe('weatherKind', () => {
  it('range les codes par famille visuelle', () => {
    expect(weatherKind(0)).toBe('clear');
    expect(weatherKind(0, false)).toBe('clear-night');
    expect(weatherKind(2)).toBe('partly');
    expect(weatherKind(45)).toBe('fog');
    expect(weatherKind(81)).toBe('rain');
    expect(weatherKind(86)).toBe('snow');
    expect(weatherKind(95)).toBe('storm');
  });
});

describe('weatherBoard', () => {
  const hours = Array.from({ length: 48 }, (_, i) => {
    const day = i < 24 ? '08' : '09';
    return `2026-10-${day}T${String(i % 24).padStart(2, '0')}:00`;
  });
  const res = {
    current: { time: '2026-10-08T15:15', temperature_2m: 9.4, apparent_temperature: 6.6, weather_code: 61, wind_speed_10m: 21.4, is_day: 1 },
    hourly: {
      time: hours,
      temperature_2m: hours.map((_, i) => i),
      weather_code: hours.map(() => 3),
      is_day: hours.map((_, i) => (i % 24 > 7 && i % 24 < 19 ? 1 : 0)),
      precipitation_probability: hours.map(() => 40),
    },
    daily: { sunrise: ['2026-10-08T07:52', '2026-10-09T07:53'], sunset: ['2026-10-08T19:12', '2026-10-09T19:10'], temperature_2m_max: [12, 14.6], temperature_2m_min: [4, 3.2], weather_code: [61, 1] },
  };

  it('donne maintenant, les 12 prochaines heures (toutes les 2 h) et demain', () => {
    const b = weatherBoard(res)!;
    expect(b.now).toEqual({ temperature: 9, feelsLike: 7, windKmh: 21, code: 61, isDay: true });
    expect(b.hours.map((h) => h.label)).toEqual(['17 h', '19 h', '21 h', '23 h', '1 h', '3 h']);
    expect(b.hours[0]!.temperature).toBe(17);
    expect(b.hours[1]!.isDay).toBe(false);
    expect(b.hours[0]!.rain).toBe(40);
    expect(b.tomorrow).toEqual({ min: 3, max: 15, code: 1 });
  });

  it('place le soleil entre son lever et son coucher', () => {
    expect(weatherBoard(res)!.sun).toEqual({ rise: 7 * 60 + 52, set: 19 * 60 + 12, now: 15 * 60 + 15 });
    expect(weatherBoard(res)!.sunrise).toBe('07:52');
  });

  it('réponse incomplète : rien', () => {
    expect(weatherBoard({})).toBeNull();
  });
});
