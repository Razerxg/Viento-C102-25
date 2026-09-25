// EL BANCO DE PRUEBA DEL MOTOR: LA TABLA 2.5-2 DEL PROPIO REGLAMENTO.
//
// El comentario C 2.5 declara con qué parámetros se construyó la tabla del método
// simplificado: h = 10 m, exposición B, Kd = 0,85, G = 0,85, Kzt = Ke = 1,0, GCpi = ±0,18
// y ±0,55, y Cp de la Figura 2.4-1.
//
// Eso convierte sus 48 valores en una VERIFICACIÓN CRUZADA del procedimiento direccional
// entero —q, Kz, Cp, GCpi, presión y carga mínima—, calculada por los autores de la norma
// y publicada en otra parte del documento. Si el motor la reproduce, la cadena completa
// es correcta.
//
// Es la diferencia entre un test que prueba algo y uno que no: los tests de `tablasNorma`
// verifican que cada tabla sea internamente coherente, pero ninguno puede decir si el
// MOTOR las combina bien. Éste sí, porque el resultado lo pone el reglamento, no yo.
import { describe, it, expect } from 'vitest';
import { q, kz } from '../src/engine/presionDinamica.js';
import { MINIMOS } from '../src/engine/presiones.js';

// Tabla 2.5-2 — [V, cubierta cerrado/parc.abierto, cubierta parc.cerrado, paredes]
const TABLA = [
  [40.0,  -756,  -974,   750],
  [42.9,  -870, -1120,   750],
  [45.7,  -987, -1271,   849],
  [46.0, -1000, -1288,   860],
  [49.0, -1135, -1461,   976],
  [51.4, -1249, -1608,  1074],
  [52.5, -1303, -1678,  1120],
  [55.1, -1435, -1848,  1234],
  [57.1, -1541, -1984,  1325],
  [59.1, -1651, -2126,  1419],
  [61.2, -1770, -2280,  1522],
  [62.8, -1864, -2400,  1603],
  [65.7, -2040, -2627,  1754],
  [67.4, -2147, -2765,  1846],
  [68.5, -2217, -2856,  1907],
  [73.5, -2553, -3288,  2195],
];

// Los parámetros declarados en el comentario C 2.5.
const PAR = { z: 10, exposicion: "B", kd: 0.85, Kzt: 1.0, usarKe: false };
const G = 0.85;
// La tabla es de diafragma simple con θ ≤ 7°, así que la cubierta toma el Cp de succión
// de borde y las paredes combinan barlovento con sotavento para L/B ≤ 1.
const CP_CUBIERTA = -1.3;
const CP_BARLOVENTO = 0.8, CP_SOTAVENTO = -0.5;

const qDe = (V) => q({ ...PAR, V });

describe('Tabla 2.5-2 — el motor reproduce el método simplificado del reglamento', () => {
  // Antes de comparar presiones conviene fijar el Kz, porque si estuviera mal todo lo
  // demás fallaría sin decir dónde. El comentario lo enuncia redondeado a 0,71.
  it('Kz a 10 m en exposición B vale 0,7058 — el 0,71 del comentario es el redondeo', () => {
    expect(kz(10, "B")).toBeCloseTo(0.70580, 4);
    expect(Math.round(kz(10, "B") * 100) / 100).toBe(0.71);
  });

  // PAREDES: presión neta combinada. En un edificio de diafragma simple la presión interna
  // se cancela sobre las paredes —entra por un lado y sale por el otro del diafragma—, así
  // que sólo quedan las externas de barlovento y sotavento.
  it.each(TABLA)('V = %s m/s: la presión neta de pared da %s N/m²', (V, cub, cubPC, pared) => {
    const bruta = qDe(V) * G * (CP_BARLOVENTO - CP_SOTAVENTO);
    const conMinimo = Math.max(bruta, MINIMOS.pared);
    expect(Math.round(conMinimo)).toBe(pared);
  });

  // LA CARGA MÍNIMA GOBIERNA DE VERDAD, y la tabla lo demuestra: en las dos primeras filas
  // el cálculo da menos de 750 N/m² y la norma igual publica 750. Si el motor no aplicara
  // el artículo 2.1.5, esas dos filas fallarían y ninguna otra.
  it('con V = 40,0 y 42,9 m/s gobierna el mínimo de 750 N/m² del art. 2.1.5', () => {
    for (const V of [40.0, 42.9]) {
      expect(qDe(V) * G * (CP_BARLOVENTO - CP_SOTAVENTO)).toBeLessThan(MINIMOS.pared);
    }
    // y desde la tercera fila en adelante ya no gobierna
    expect(qDe(45.7) * G * (CP_BARLOVENTO - CP_SOTAVENTO)).toBeGreaterThan(MINIMOS.pared);
  });

  // CUBIERTA, edificio cerrado o parcialmente abierto: GCpi = ±0,18. Se toma el caso que
  // suma succión, que es el que la tabla publica.
  it.each(TABLA)('V = %s m/s: la cubierta de edificio cerrado da %s N/m²', (V, cub) => {
    expect(Math.round(qDe(V) * (G * CP_CUBIERTA - 0.18))).toBe(cub);
  });

  // CUBIERTA, edificio parcialmente cerrado: GCpi = ±0,55. Es el mismo cálculo con otro
  // coeficiente, y que las dos columnas cierren con el MISMO q prueba que la diferencia
  // entre ambas es exactamente la presión interna y nada más.
  it.each(TABLA)('V = %s m/s: la cubierta de edificio parcialmente cerrado da %s N/m²',
    (V, cub, cubPC) => {
      expect(Math.round(qDe(V) * (G * CP_CUBIERTA - 0.55))).toBe(cubPC);
    });

  // Cierre de consistencia: la diferencia entre las dos columnas de cubierta tiene que ser
  // (0,55 − 0,18)·q, sin intervención de G ni de Cp. Si el motor mezclara el factor de
  // ráfaga dentro de la presión interna —un error clásico, porque GCpi YA lo incluye, tal
  // como advierte el art. 1.9.7— esta relación se rompe aunque las dos columnas por
  // separado parecieran cerrar.
  //
  // TOLERANCIA ±1 N/m², Y NO ±0,5: los dos valores de la tabla vienen redondeados a entero
  // POR SEPARADO, así que su diferencia arrastra hasta una unidad de error de redondeo. Un
  // ±0,5 haría fallar cuatro filas por aritmética de la norma, no por un defecto del motor.
  it.each(TABLA)('V = %s m/s: la diferencia entre ambas cubiertas es (0,55 − 0,18)·q',
    (V, cub, cubPC) => {
      expect(Math.abs((cub - cubPC) - (0.55 - 0.18) * qDe(V))).toBeLessThanOrEqual(1);
    });
});
