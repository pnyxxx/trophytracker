import { describe, expect, it } from 'vitest';
import { reword } from './errors';

describe('reword', () => {
  it('reformule les anciens messages de la base en « road trip »', () => {
    expect(reword('Vous faites déjà partie d\'un équipage (un seul par compte)')).toBe('Vous faites déjà partie d’un road trip (un seul par compte)');
    expect(reword('Cette personne fait déjà partie d\'un autre équipage')).toBe('Cette personne fait déjà partie d’un autre road trip');
    expect(reword('Vous avez déjà un accès payé : créez votre équipage')).toBe('Vous avez déjà un accès payé : créez votre road trip');
    expect(reword('Le dernier propriétaire ne peut pas quitter l\'équipage')).toBe('Le dernier propriétaire ne peut pas quitter le road trip');
    expect(reword('Seul le propriétaire de l\'équipage peut effacer la trace')).toBe('Seul le propriétaire du road trip peut effacer la trace');
    expect(reword('L\'équipage doit garder au moins un propriétaire')).toBe('Le road trip doit garder au moins un propriétaire');
    expect(reword('Vous gérez déjà 3 équipages')).toBe('Vous gérez déjà 3 road trips');
  });
});
