import { describe, expect, it } from 'vitest';
import { STAGES, stageAt, STOP_FRAC, STOPS } from './journey';

const frac = (name: string) => STOP_FRAC[STOPS.findIndex((s) => s.name === name)]!;

describe('étapes de l’accueil, de panneau en panneau', () => {
  it('7 étapes, de Biarritz → Salamanque à Merzouga → Marrakech', () => {
    expect(STAGES.map((s) => (s.from ? `${s.from} → ${s.name}` : s.name))).toEqual([
      'Biarritz → Salamanque', 'Salamanque → Algésiras', 'Algésiras → Boulajoul', 'Boulajoul → Merzouga',
      'Boucle 1', 'Boucle 2', 'Merzouga → Marrakech',
    ]);
  });

  it('on reste sur l’étape tant que le panneau d’arrivée n’est pas passé', () => {
    expect(stageAt(0)).toBe(0);
    expect(stageAt(frac('Salamanque') / 2)).toBe(0); // au km 33 comme au milieu : toujours Biarritz → Salamanque
    expect(stageAt(frac('Salamanque'))).toBe(0);
    expect(stageAt(frac('Salamanque') + 0.01)).toBe(1);
    // La nuit du marathon (panneau flou) ne termine pas l'étape.
    expect(stageAt(frac('Marathon') + 0.01)).toBe(6);
    expect(stageAt(1)).toBe(6);
  });
});
