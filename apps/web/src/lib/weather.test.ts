import { describe, expect, it } from 'vitest';
import { compassLabel, describeWeather } from './weather';

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
