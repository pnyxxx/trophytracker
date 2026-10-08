import { describe, expect, it } from 'vitest';
import { compassLabel, describeWeather, forecastSlots } from './weather';

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

describe('forecastSlots', () => {
  const hours = Array.from({ length: 48 }, (_, i) => {
    const day = i < 24 ? '08' : '09';
    return `2026-10-${day}T${String(i % 24).padStart(2, '0')}:00`;
  });
  const res = {
    current: { time: '2026-10-08T15:15', temperature_2m: 9.4, weather_code: 61, is_day: 1 },
    hourly: { time: hours, temperature_2m: hours.map((_, i) => i), weather_code: hours.map(() => 3), is_day: hours.map((_, i) => (i % 24 > 7 && i % 24 < 19 ? 1 : 0)) },
  };

  it('donne maintenant, +3 h, +6 h et demain à 14 h', () => {
    expect(forecastSlots(res).map((s) => s.label)).toEqual(['maint.', '18 h', '21 h', 'demain']);
    expect(forecastSlots(res)[0]!.temperature).toBe(9);
    expect(forecastSlots(res)[3]!.temperature).toBe(38); // 24 + 14
    expect(forecastSlots(res)[2]!.isDay).toBe(false);
  });

  it('réponse incomplète : rien', () => {
    expect(forecastSlots({})).toEqual([]);
  });
});
