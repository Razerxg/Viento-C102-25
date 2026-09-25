import { describe, it, expect } from 'vitest';
import { colorPresion, tramosLeyenda, paleta, NULO } from '../src/lib/escalaPresion.js';

describe('escala divergente de presión', () => {
  // Lo que la escala tiene que preservar es la POLARIDAD. Si succión y presión cayeran en
  // el mismo tono, el croquis perdería justamente la distinción que lo hace útil.
  it('succión y presión caen en brazos distintos', () => {
    const c = paleta("claro");
    expect(c.succion).toContain(colorPresion(-1000, 1000));
    expect(c.presion).toContain(colorPresion(1000, 1000));
    expect(colorPresion(-1000, 1000)).not.toBe(colorPresion(1000, 1000));
  });

  it('el punto medio es gris neutro, no un tono', () => {
    expect(colorPresion(0, 1000)).toBe(paleta("claro").neutro);
    expect(colorPresion(NULO - 1, 1000)).toBe(paleta("claro").neutro);
    expect(colorPresion(-(NULO - 1), 1000)).toBe(paleta("claro").neutro);
  });

  // Se normaliza contra el máximo del EDIFICIO. Si cada cara se escalara contra sí misma,
  // todas saldrían del paso más intenso y el croquis no diría cuál gobierna.
  it('la intensidad es relativa al máximo del edificio, no al de cada cara', () => {
    const c = paleta("claro");
    expect(colorPresion(-1000, 1000)).toBe(c.succion[2]);
    // 1000 sobre 4000 da 0,25: bien adentro del primer tercio. Una versión anterior usaba
    // 3000, que cae JUSTO en el corte de 1/3 y volvía el test una lotería de redondeo en
    // vez de una afirmación sobre la escala.
    expect(colorPresion(-1000, 4000)).toBe(c.succion[0]);
  });

  // El borde entre tramos tiene que resolverse igual en la escala y en la leyenda, o un
  // valor limítrofe saldría de un color y la leyenda lo ubicaría en otro.
  it('los cortes de tramo son consistentes entre la escala y la leyenda', () => {
    const c = paleta("claro");
    expect(colorPresion(-1000 / 3, 1000)).toBe(c.succion[1]);   // exactamente en −m/3
    expect(colorPresion(-2000 / 3, 1000)).toBe(c.succion[2]);   // exactamente en −2m/3
  });

  it('es simétrica: dos presiones opuestas usan el mismo paso de su brazo', () => {
    const c = paleta("claro");
    for (const v of [200, 600, 1000]) {
      expect(c.succion.indexOf(colorPresion(-v, 1000)))
        .toBe(c.presion.indexOf(colorPresion(v, 1000)));
    }
  });

  it('no se sale de la escala si la presión supera el máximo declarado', () => {
    expect(colorPresion(5000, 1000)).toBe(paleta("claro").presion[2]);
  });

  // El modo oscuro no es la paleta clara dada vuelta: son pasos elegidos contra la otra
  // superficie, y la dirección de luminosidad se invierte a propósito.
  it('el modo oscuro tiene sus propios pasos', () => {
    expect(paleta("oscuro").succion).not.toEqual(paleta("claro").succion);
    expect(paleta("oscuro").neutro).not.toBe(paleta("claro").neutro);
    expect(colorPresion(-1000, 1000, "oscuro")).toBe(paleta("oscuro").succion[2]);
  });

  it('la leyenda cubre los siete tramos, ordenados y sin huecos', () => {
    const t = tramosLeyenda(1200);
    expect(t).toHaveLength(7);
    for (let i = 1; i < t.length; i++) expect(t[i].desde).toBeCloseTo(t[i - 1].hasta, 9);
    expect(t.filter(x => x.nulo)).toHaveLength(1);
    expect(t[0].desde).toBe(-1200);
    expect(t.at(-1).hasta).toBe(1200);
  });

  // El color que la leyenda promete para un tramo tiene que ser el que la escala asigna a
  // un valor de ese tramo. Si se separaran, la leyenda mentiría.
  it('cada tramo de la leyenda coincide con lo que devuelve la escala', () => {
    for (const t of tramosLeyenda(1200)) {
      const medio = (t.desde + t.hasta) / 2;
      expect(colorPresion(medio, 1200)).toBe(t.color);
    }
  });
});
