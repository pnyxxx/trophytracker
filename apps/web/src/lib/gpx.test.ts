import { describe, expect, it } from 'vitest';
import { GPX_MAX_STAGES, parseGpx } from './gpx';

describe('parseGpx', () => {
  it('garde les points d’intérêt nommés, départ et arrivée aux extrémités', () => {
    const gpx = `<?xml version="1.0"?><gpx version="1.1">
      <wpt lat="60.39" lon="5.32"><name>Bergen</name></wpt>
      <wpt lat='60.86' lon='7.11'><name><![CDATA[Flåm & fjord]]></name></wpt>
      <wpt lat="68.09" lon="13.09"><name>Reine &amp; Lofoten</name></wpt>
      <trk><trkseg><trkpt lat="1" lon="1"/></trkseg></trk></gpx>`;
    expect(parseGpx(gpx)).toEqual([
      { kind: 'start', name: 'Bergen', lat: 60.39, lon: 5.32 },
      { kind: 'stop', name: 'Flåm & fjord', lat: 60.86, lon: 7.11 },
      { kind: 'finish', name: 'Reine & Lofoten', lat: 68.09, lon: 13.09 },
    ]);
  });

  it('sans points d’intérêt : l’itinéraire, puis le départ et l’arrivée de la trace', () => {
    expect(parseGpx('<rte><rtept lat="45" lon="6"/><rtept lat="46" lon="7"><name>Col</name></rtept></rte>').map((s) => s.name)).toEqual(['Départ', 'Col']);
    const trk = '<trk><trkseg><trkpt lat="45.1" lon="6.4"/><trkpt lat="45.05" lon="6.41"/><trkpt lat="45.03" lon="6.40"/></trkseg></trk>';
    expect(parseGpx(trk)).toEqual([
      { kind: 'start', name: 'Départ', lat: 45.1, lon: 6.4 },
      { kind: 'finish', name: 'Arrivée', lat: 45.03, lon: 6.4 },
    ]);
  });

  it('ignore les coordonnées invalides et plafonne le nombre d’étapes', () => {
    expect(parseGpx('<wpt lat="abc" lon="1"/><wpt lat="95" lon="1"/><wpt lat="10" lon="20"/>')).toEqual([{ kind: 'stop', name: 'Étape 1', lat: 10, lon: 20 }]);
    const many = Array.from({ length: 150 }, (_, i) => `<wpt lat="${i / 10}" lon="1"/>`).join('');
    expect(parseGpx(many)).toHaveLength(GPX_MAX_STAGES);
    expect(parseGpx('pas du xml')).toEqual([]);
  });
});
