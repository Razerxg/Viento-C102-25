// LAS TABLAS TRANSCRITAS SE VERIFICAN, NO SE CONFÍAN.
//
// Todo el reglamento llegó como escaneo sin capa de texto: cada cifra de estos archivos se
// leyó de una imagen. Un valor mal leído da una presión plausible y un cálculo entero
// equivocado que ningún control de ingeniería detecta —es el modo de falla que gobierna
// este proyecto, anotado en CLAUDE.md—. Estos tests son la defensa.
//
// El criterio: no basta con repetir acá el número que está en el archivo, porque eso no
// prueba nada —si lo leí mal, lo copio mal dos veces—. Cada test tiene que apoyarse en una
// RELACIÓN que la norma impone y que un error de tipeo no puede satisfacer por casualidad.
import { describe, it, expect } from 'vitest';
import { CIUDADES, NOMBRES_CIUDAD, factorV, velocidadDe, I_RIESGO } from '../src/constants/velocidades.js';
import { KD, kdDe } from '../src/constants/direccionalidad.js';
import { CP_PARED, CP_CUBIERTA_BARLOVENTO, CP_CUBIERTA_SOTAVENTO, CP_CUBIERTA_PARALELO,
  ANG_BARLOVENTO, ANG_SOTAVENTO, FACTOR_AREA } from '../src/constants/presionesExternas.js';

describe('Figura 1.5-1D — velocidades por ciudad', () => {
  it('son las 29 ciudades de la figura', () => {
    expect(CIUDADES).toHaveLength(29);
    expect(new Set(NOMBRES_CIUDAD).size).toBe(29);
  });

  // EL TEST QUE IMPORTA. La expresión (C 1.5-6.1) obliga a que las tres columnas salgan de
  // un mismo v50 por tres factores fijos. Una cifra transpuesta —73,5 por 75,3— no admite
  // NINGÚN v50 que cierre las tres a la vez, así que cae acá.
  it.each(CIUDADES)('%s: las tres categorías se reconstruyen desde v50', (nom, v50, vI, vII, vIII) => {
    expect(Math.round(v50 * factorV("I") * 10) / 10).toBe(vI);
    expect(Math.round(v50 * factorV("II") * 10) / 10).toBe(vII);
    expect(Math.round(v50 * factorV("III") * 10) / 10).toBe(vIII);
  });

  // Los v50 son los del mapa del CIRSOC 102-2005, que venía en enteros y medios. Un v50 con
  // tres decimales sería señal de que alguna de las tres columnas se leyó mal.
  it.each(CIUDADES)('%s: v50 cae en la grilla de 0,5 m/s del mapa de 2005', (nom, v50) => {
    expect(Math.abs(v50 * 2 - Math.round(v50 * 2))).toBeLessThan(1e-9);
  });

  it('la categoría IV toma la misma columna que la III', () => {
    expect(I_RIESGO.IV).toBe(I_RIESGO.III);
    for (const [n] of CIUDADES) expect(velocidadDe(n, "IV")).toBe(velocidadDe(n, "III"));
  });

  // V crece con la categoría de riesgo: más consecuencia, período de retorno más largo
  // (300 → 700 → 1700 años). Una columna intercambiada rompe la monotonía.
  it.each(CIUDADES)('%s: V crece con la categoría de riesgo', (nom, v50, vI, vII, vIII) => {
    expect(vI).toBeLessThan(vII);
    expect(vII).toBeLessThan(vIII);
  });

  it('una ciudad que no está devuelve null, en vez de interpolar una velocidad inventada', () => {
    expect(velocidadDe("Tandil", "II")).toBeNull();
    expect(velocidadDe("Buenos Aires", "II")).toBe(55.1);
  });
});

describe('Tabla 1.6-1 — factor de direccionalidad Kd', () => {
  it('son las once filas de la tabla', () => expect(KD).toHaveLength(11));

  // Kd es una probabilidad conjunta: nunca amplifica.
  it.each(KD)('%s: Kd está entre 0,85 y 1,00', (clave, rot, kd) => {
    expect(kd).toBeGreaterThanOrEqual(0.85);
    expect(kd).toBeLessThanOrEqual(1.0);
  });

  // La forma de la sección ordena el factor: cuanto más se parece a un círculo, menos
  // probable es que la resistencia dependa de la dirección, y más alto el Kd.
  it('crece con la simetría de la sección: cuadrada < hexagonal < redonda', () => {
    expect(kdDe("chim_cuadrada")).toBeLessThan(kdDe("chim_hexagonal"));
    expect(kdDe("chim_hexagonal")).toBeLessThan(kdDe("chim_redonda"));
  });

  it('los edificios llevan 0,85 tanto en SPRFV como en C&R', () => {
    expect(kdDe("edificio_sprfv")).toBe(0.85);
    expect(kdDe("edificio_cyr")).toBe(0.85);
  });

  it('una clave que no existe devuelve null', () => expect(kdDe("inventada")).toBeNull());
});

describe('Figura 2.4-1 — coeficientes de presión externa', () => {
  // La asignación de qz/qh no es cosmética: barlovento varía con la altura y el resto no.
  // Confundirlos aplana el diagrama de presiones del edificio entero.
  it('sólo la pared a barlovento usa qz; el resto usa qh', () => {
    expect(CP_PARED.barlovento.usar).toBe("qz");
    expect(CP_PARED.sotavento.usar).toBe("qh");
    expect(CP_PARED.lateral.usar).toBe("qh");
  });

  it('barlovento empuja y sotavento y laterales succionan', () => {
    expect(CP_PARED.barlovento.cp).toBeGreaterThan(0);
    expect(CP_PARED.lateral.cp).toBeLessThan(0);
    for (const [, cp] of CP_PARED.sotavento.puntos) expect(cp).toBeLessThan(0);
  });

  // La succión de sotavento se ALIVIA en edificios largos: el flujo se reengancha. Si la
  // tabla estuviera cargada al revés, la monotonía se rompe.
  it('la succión de sotavento decrece en magnitud al crecer L/B', () => {
    const p = CP_PARED.sotavento.puntos;
    for (let i = 1; i < p.length; i++) {
      expect(p[i][0]).toBeGreaterThan(p[i - 1][0]);           // L/B creciente
      expect(Math.abs(p[i][1])).toBeLessThanOrEqual(Math.abs(p[i - 1][1]));
    }
  });

  it('las tres relaciones h/L de barlovento traen una columna por ángulo tabulado', () => {
    for (const hL of [0.25, 0.5, 1.0]) {
      expect(CP_CUBIERTA_BARLOVENTO[hL]).toHaveLength(ANG_BARLOVENTO.length);
      expect(CP_CUBIERTA_SOTAVENTO[hL]).toHaveLength(ANG_SOTAVENTO.length);
    }
  });

  // A barlovento, la succión se convierte en empuje a medida que la cubierta se empina:
  // el primer valor de cada columna sube monótonamente con θ. Es la física de la tabla, y
  // una celda transpuesta la rompe.
  it.each([[0.25], [0.5], [1.0]])('h/L = %s: el Cp de barlovento crece con el ángulo', (hL) => {
    const col = CP_CUBIERTA_BARLOVENTO[hL].slice(0, -1).map(c => c[0]);   // sin la de 0,01θ
    for (let i = 1; i < col.length; i++) expect(col[i]).toBeGreaterThanOrEqual(col[i - 1]);
  });

  // Cuanto más alto el edificio respecto de su fondo, más fuerte la succión de borde.
  it('a igual ángulo, un h/L mayor da más succión a barlovento', () => {
    for (let i = 0; i < 3; i++) {
      expect(CP_CUBIERTA_BARLOVENTO[1.0][i][0]).toBeLessThan(CP_CUBIERTA_BARLOVENTO[0.25][i][0]);
    }
  });

  it('el sotavento de la cubierta es siempre succión', () => {
    for (const hL of [0.25, 0.5, 1.0]) {
      for (const cp of CP_CUBIERTA_SOTAVENTO[hL]) expect(cp).toBeLessThan(0);
    }
  });

  // La fila de h/L ≥ 1,0 NO es monótona en el ángulo —va −0,7 · −0,6 · −0,6—, así que el
  // test de monotonía por fila no la cubre. Lo que sí impone la figura son estas dos
  // relaciones, y entre las dos sí queda encerrada.
  it('a partir de 20° el sotavento vale −0,6 cualquiera sea h/L: es una columna constante', () => {
    for (const hL of [0.25, 0.5, 1.0]) expect(CP_CUBIERTA_SOTAVENTO[hL][2]).toBe(-0.6);
  });

  it.each(ANG_SOTAVENTO.map((a, i) => [a, i]))(
    'θ = %s°: la succión de sotavento no disminuye al crecer h/L', (ang, i) => {
      expect(CP_CUBIERTA_SOTAVENTO[0.5][i]).toBeLessThanOrEqual(CP_CUBIERTA_SOTAVENTO[0.25][i]);
      expect(CP_CUBIERTA_SOTAVENTO[1.0][i]).toBeLessThanOrEqual(CP_CUBIERTA_SOTAVENTO[0.5][i]);
    });

  // Viento paralelo a la cumbrera: la succión se alivia al alejarse del borde de barlovento.
  // Las franjas tienen que venir ordenadas y terminar en Infinity, o la última zona de la
  // cubierta se quedaría sin coeficiente.
  it.each([[0.5], [1.0]])('h/L = %s: las franjas van en orden y cubren toda la cubierta', (hL) => {
    const fr = CP_CUBIERTA_PARALELO[hL];
    for (let i = 1; i < fr.length; i++) {
      expect(fr[i].hasta).toBeGreaterThan(fr[i - 1].hasta);
      expect(Math.abs(fr[i].cp[0])).toBeLessThanOrEqual(Math.abs(fr[i - 1].cp[0]));
    }
    expect(fr.at(-1).hasta).toBe(Infinity);
  });

  // El segundo valor de cada celda es el −0,18 de la nota 3, que es el caso de presión
  // interna leve. Donde aparece, es SIEMPRE ese número.
  it('el segundo caso de las franjas paralelas es siempre −0,18', () => {
    for (const hL of [0.5, 1.0]) {
      for (const f of CP_CUBIERTA_PARALELO[hL]) expect(f.cp[1]).toBe(-0.18);
    }
  });

  it('el factor de reducción por área decrece y arranca en 1,0', () => {
    expect(FACTOR_AREA[0]).toEqual([10, 1.0]);
    for (let i = 1; i < FACTOR_AREA.length; i++) {
      expect(FACTOR_AREA[i][0]).toBeGreaterThan(FACTOR_AREA[i - 1][0]);
      expect(FACTOR_AREA[i][1]).toBeLessThan(FACTOR_AREA[i - 1][1]);
    }
  });
});
