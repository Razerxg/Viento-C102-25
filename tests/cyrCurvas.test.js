// CAPÍTULO 5 — LAS CURVAS DE (GC_p) CONTRA LAS ECUACIONES DE SU PROPIO COMENTARIO.
//
// ⚠ ESTE ES EL TEST QUE JUSTIFICA HABER TRANSCRIPTO LAS CURVAS COMO POLIGONALES.
//
// `constants/cyrCurvas.js` guarda cada curva como puntos de quiebre. Este archivo
// transcribe, POR SEPARADO Y DE LA MISMA TABLA, las ecuaciones de las Tablas C 5.3-1 a
// C 5.3-8, y las evalúa en diez áreas contra la poligonal. Son dos transcripciones
// independientes del mismo dato: una cifra mal copiada de un lado no cierra contra el
// otro.
//
// Es el mismo mecanismo que la Figura 4.4-1 contra el ajuste de superficie del comentario
// C 4.4.1, y que la Tabla 1.13-1 contra la fórmula de K_z. La diferencia es que acá la
// fuente de las dos transcripciones es la misma tabla, así que lo que este test protege
// es la CONVERSIÓN a puntos de quiebre, no la lectura del PDF. La lectura la protege el
// control cruzado contra la Tabla 5.13-2, que llega después y es independiente de veras.
import { describe, it, expect } from 'vitest';
import {
  FIGURAS, FIGURAS_LISTA, FIGURAS_PENDIENTES, ERRATAS, UBICACION, ALTURA_H, ETIQUETA_ALTURA_H,
} from '../src/constants/cyrCurvas.js';
import { gcpDeCurva, gcp } from '../src/engine/cyr.js';

const log = Math.log10;

// Las áreas del enunciado del proyectista. No son diez números cualquiera: caen a los dos
// lados de cada meseta y JUSTO SOBRE todos los puntos de quiebre de las ocho tablas
// —1, 2, 10, 20, 30, 50 y 100 m²—, que es donde un tramo mal convertido se separa.
// Un test de más abajo exige que esa cobertura siga siendo cierta.
const AREAS = [0.5, 1, 1.5, 2, 5, 10, 20, 30, 50, 100];

const TOL = 0.005;  // el propio reglamento redondea a 0,1; 0,005 es medio dígito del papel

// ═══════════════════════════════════════════════════════════════════════════════
// LAS ECUACIONES, COMO LAS IMPRIME EL COMENTARIO
// ═══════════════════════════════════════════════════════════════════════════════
//
// Se escriben con la misma forma de la tabla —meseta, recta, meseta— y con los
// coeficientes tal cual: 0,1766 y no 0,177. Leerlas al lado del PDF tiene que ser
// inmediato; por eso no se factoriza nada.

// Tabla C 5.3-1 — Paredes, h ≤ 20 m
const T1 = {
  pos:  A => A <= 1 ? 1.0 : A <= 50 ? 1.0 - 0.1766 * log(A) : 0.7,
  neg4: A => A <= 1 ? -1.1 : A <= 50 ? -1.1 + 0.1766 * log(A) : -0.8,
  neg5: A => A <= 1 ? -1.4 : A <= 50 ? -1.4 + 0.3532 * log(A) : -0.8,
};

// Tabla C 5.3-2 — Dos aguas, θ ≤ 7°
const T2 = {
  pos:   A => A <= 1 ? 0.3 : A <= 10 ? 0.3 - 0.1 * log(A) : 0.2,
  sv1p:  A => A <= 10 ? -0.9 : A <= 100 ? -1.4 + 0.5000 * log(A) : -0.4,
  sv1:   A => A <= 1 ? -1.7 : A <= 50 ? -1.7 + 0.4120 * log(A) : -1.0,
  sv2:   A => A <= 1 ? -2.3 : A <= 50 ? -2.3 + 0.5297 * log(A) : -1.4,
  sv3:   A => A <= 1 ? -3.2 : A <= 50 ? -3.2 + 1.0595 * log(A) : -1.4,
  cv1:   A => A <= 1 ? -1.7 : A <= 10 ? -1.7 + 0.1000 * log(A)
                            : A <= 50 ? -2.4584 + 0.8584 * log(A) : -1.0,
  // El «A > 50,0» es la errata: la tabla imprime «A > 5,0». Ver el bloque de erratas.
  cv2:   A => A <= 1 ? -2.3 : A <= 50 ? -2.3 + 0.7063 * log(A) : -1.1,
  cv3:   A => A <= 1 ? -3.2 : A <= 50 ? -3.2 + 1.2360 * log(A) : -1.1,
};

// Tabla C 5.3-3 — Dos aguas, 7° < θ ≤ 20°
const T3 = {
  pos: A => A <= 1 ? 0.6 : A <= 20 ? 0.6 - 0.2306 * log(A) : 0.3,
  z1:  A => A <= 2 ? -2.0 : A <= 30 ? -2.3839 + 1.2754 * log(A) : -0.5,
  z2:  A => A <= 1 ? -2.7 : A <= 20 ? -2.7 + 1.3067 * log(A) : -1.0,
  z3:  A => A <= 1 ? -3.6 : A <= 10 ? -3.6 + 1.800 * log(A) : -1.8,
};

// Tabla C 5.3-4 — Dos aguas, 20° < θ ≤ 27°
const T4 = {
  pos: A => A <= 1 ? 0.6 : A <= 20 ? 0.6 - 0.2306 * log(A) : 0.3,
  z1:  A => A <= 1 ? -1.5 : A <= 20 ? -1.5 + 0.5380 * log(A) : -0.8,
  z2:  A => A <= 1 ? -2.5 : A <= 10 ? -2.5 + 1.300 * log(A) : -1.2,
  z3:  A => A <= 1 ? -3.0 : A <= 10 ? -3.0 + 1.600 * log(A) : -1.4,  // la tabla dice «−1.4»
};

// Tabla C 5.3-5 — Dos aguas, 27° < θ ≤ 45°
const T5 = {
  pos: A => A <= 1 ? 0.9 : A <= 20 ? 0.9 - 0.3074 * log(A) : 0.5,
  z1:  A => A <= 1 ? -1.8 : A <= 10 ? -1.8 + 1.000 * log(A) : -0.8,
  z2:  A => A <= 1 ? -2.0 : A <= 20 ? -2.0 + 0.7686 * log(A) : -1.0,
  z3:  A => A <= 1 ? -2.5 : A <= 20 ? -2.5 + 1.1529 * log(A) : -1.0,
};

// Tabla C 5.3-6 — Cuatro aguas, 7° < θ ≤ 20°
const T6 = {
  pos: A => A <= 1 ? 0.7 : A <= 10 ? 0.7 - 0.400 * log(A) : 0.3,
  z1:  A => A <= 2 ? -1.8 : A <= 20 ? -2.1010 + 1.0000 * log(A) : -0.8,
  z2:  A => A <= 1 ? -2.4 : A <= 20 ? -2.4 + 0.8455 * log(A) : -1.3,
  z3:  A => A <= 1 ? -2.6 : A <= 20 ? -2.6 + 0.9223 * log(A) : -1.4,
};

// Tabla C 5.3-7 — Cuatro aguas, 20° < θ ≤ 27°. La tabla escribe «Zonas 2 y 3» en UN renglón.
const T7 = {
  pos:  A => A <= 1 ? 0.7 : A <= 10 ? 0.7 - 0.400 * log(A) : 0.3,
  z1:   A => A <= 1 ? -1.4 : A <= 20 ? -1.4 + 0.4612 * log(A) : -0.8,
  z2y3: A => A <= 1 ? -2.0 : A <= 20 ? -2.0 + 0.7686 * log(A) : -1.0,
};

// Tabla C 5.3-8 — Cuatro aguas, θ = 45°
const T8 = {
  pos: A => A <= 1 ? 0.7 : A <= 10 ? 0.7 - 0.4000 * log(A) : 0.3,
  z1:  A => A <= 1 ? -1.5 : A <= 20 ? -1.5 + 0.6149 * log(A) : -0.7,
  z2:  A => A <= 1 ? -1.8 : A <= 20 ? -1.8 + 0.7686 * log(A) : -0.8,
  z3:  A => A <= 1 ? -2.4 : A <= 20 ? -2.4 + 1.0761 * log(A) : -1.0,
};

// figura · variante · zona · signo → ecuación
const ECUACIONES = [
  ["5.3-1", "pared", "4", "pos", T1.pos], ["5.3-1", "pared", "4", "neg", T1.neg4],
  ["5.3-1", "pared", "5", "pos", T1.pos], ["5.3-1", "pared", "5", "neg", T1.neg5],

  ["5.3-2A", "cubierta", "1'", "pos", T2.pos], ["5.3-2A", "cubierta", "1'", "neg", T2.sv1p],
  ["5.3-2A", "cubierta", "1", "pos", T2.pos],  ["5.3-2A", "cubierta", "1", "neg", T2.sv1],
  ["5.3-2A", "cubierta", "2", "pos", T2.pos],  ["5.3-2A", "cubierta", "2", "neg", T2.sv2],
  ["5.3-2A", "cubierta", "3", "pos", T2.pos],  ["5.3-2A", "cubierta", "3", "neg", T2.sv3],
  ["5.3-2A", "voladizo", "1'", "pos", T2.pos], ["5.3-2A", "voladizo", "1'", "neg", T2.cv1],
  ["5.3-2A", "voladizo", "1", "pos", T2.pos],  ["5.3-2A", "voladizo", "1", "neg", T2.cv1],
  ["5.3-2A", "voladizo", "2", "pos", T2.pos],  ["5.3-2A", "voladizo", "2", "neg", T2.cv2],
  ["5.3-2A", "voladizo", "3", "pos", T2.pos],  ["5.3-2A", "voladizo", "3", "neg", T2.cv3],

  ["5.3-2B", "cubierta", "1", "pos", T3.pos], ["5.3-2B", "cubierta", "1", "neg", T3.z1],
  ["5.3-2B", "cubierta", "2", "pos", T3.pos], ["5.3-2B", "cubierta", "2", "neg", T3.z2],
  ["5.3-2B", "cubierta", "3", "pos", T3.pos], ["5.3-2B", "cubierta", "3", "neg", T3.z3],

  ["5.3-2C", "cubierta", "1", "pos", T4.pos], ["5.3-2C", "cubierta", "1", "neg", T4.z1],
  ["5.3-2C", "cubierta", "2", "pos", T4.pos], ["5.3-2C", "cubierta", "2", "neg", T4.z2],
  ["5.3-2C", "cubierta", "3", "pos", T4.pos], ["5.3-2C", "cubierta", "3", "neg", T4.z3],

  ["5.3-2D", "cubierta", "1", "pos", T5.pos], ["5.3-2D", "cubierta", "1", "neg", T5.z1],
  ["5.3-2D", "cubierta", "2", "pos", T5.pos], ["5.3-2D", "cubierta", "2", "neg", T5.z2],
  ["5.3-2D", "cubierta", "3", "pos", T5.pos], ["5.3-2D", "cubierta", "3", "neg", T5.z3],

  ["5.3-2E", "cubierta", "1", "pos", T6.pos], ["5.3-2E", "cubierta", "1", "neg", T6.z1],
  ["5.3-2E", "cubierta", "2", "pos", T6.pos], ["5.3-2E", "cubierta", "2", "neg", T6.z2],
  ["5.3-2E", "cubierta", "3", "pos", T6.pos], ["5.3-2E", "cubierta", "3", "neg", T6.z3],

  ["5.3-2F", "cubierta", "1", "pos", T7.pos], ["5.3-2F", "cubierta", "1", "neg", T7.z1],
  ["5.3-2F", "cubierta", "2", "pos", T7.pos], ["5.3-2F", "cubierta", "2", "neg", T7.z2y3],
  ["5.3-2F", "cubierta", "3", "pos", T7.pos], ["5.3-2F", "cubierta", "3", "neg", T7.z2y3],

  ["5.3-2G", "cubierta", "1", "pos", T8.pos], ["5.3-2G", "cubierta", "1", "neg", T8.z1],
  ["5.3-2G", "cubierta", "2", "pos", T8.pos], ["5.3-2G", "cubierta", "2", "neg", T8.z2],
  ["5.3-2G", "cubierta", "3", "pos", T8.pos], ["5.3-2G", "cubierta", "3", "neg", T8.z3],
];

const curvaDe = (fig, ubicacion, zona, signo) => FIGURAS[fig].curvas[ubicacion][zona][signo];

// ═══════════════════════════════════════════════════════════════════════════════
// EL HARNESS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Tablas C 5.3-1 a C 5.3-8 — las ecuaciones contra los puntos de quiebre', () => {
  it('cada curva reproduce su ecuación en las diez áreas', () => {
    let comparaciones = 0;
    for (const [fig, ubic, zona, signo, ecuacion] of ECUACIONES) {
      const curva = curvaDe(fig, ubic, zona, signo);
      for (const A of AREAS) {
        const donde = `${fig} · ${ubic} · zona ${zona} · ${signo} · A = ${A} m²`;
        expect(Math.abs(gcp(curva, A) - ecuacion(A)), donde).toBeLessThanOrEqual(TOL);
        comparaciones++;
      }
    }
    // 56 curvas × 10 áreas. Si el barrido se vacía por un error de nombre, el bucle pasa
    // sin comparar nada y el test queda verde sin haber verificado una sola curva.
    expect(comparaciones).toBe(560);
  });

  it('las diez áreas cubren TODOS los puntos de quiebre de las ocho tablas', () => {
    // Si un quiebre cayera fuera de la lista, el tramo que empieza ahí podría estar mal
    // convertido y el barrido de arriba no lo vería: el error se esconde justo entre dos
    // áreas de control. Este test es el que mantiene honesto al anterior.
    const quiebres = new Set();
    for (const fig of FIGURAS_LISTA) {
      const f = FIGURAS[fig];
      for (const v of f.ubicaciones) {
        for (const z of f.zonas) {
          for (const s of ["pos", "neg"]) f.curvas[v][z][s].forEach(([A]) => quiebres.add(A));
        }
      }
    }
    expect([...quiebres].sort((a, b) => a - b)).toEqual([1, 2, 10, 20, 30, 50, 100]);
    for (const q of quiebres) expect(AREAS, `quiebre en A = ${q} m²`).toContain(q);
  });

  it('cada ecuación está realmente ejercitada — ninguna entrada del mapa quedó suelta', () => {
    // Un par figura/zona mal escrito daría `undefined` en `curvaDe` y reventaría, pero una
    // ECUACIÓN duplicada por copiar y pegar —la misma función en dos zonas distintas— no
    // rompe nada: las dos curvas la cumplirían si también se copió el renglón de la tabla.
    // Salvo las tres que el reglamento comparte a propósito, cada negativa es distinta.
    const negativas = ECUACIONES.filter(([, , , s]) => s === "neg").map(([, , , , f]) => f);
    const unicas = new Set(negativas);
    // T2.cv1 va en las zonas 1 y 1' (la tabla dice «Zonas 1 y 1'») y T7.z2y3 en las 2 y 3.
    expect(negativas.length - unicas.size).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LAS DOS ERRATAS DEL COMENTARIO
// ═══════════════════════════════════════════════════════════════════════════════

describe('Erratas de las Tablas C 5.3-2 y C 5.3-4', () => {
  it('están registradas en el código, con su figura y su zona', () => {
    expect(ERRATAS).toHaveLength(2);
    const c532 = ERRATAS.find(e => e.tabla === "C 5.3-2");
    expect(c532).toMatchObject({ figura: "5.3-2A", ubicacion: UBICACION.VOLADIZO, zona: "2" });
    expect(ERRATAS.find(e => e.tabla === "C 5.3-4")).toMatchObject({ figura: "5.3-2C", zona: "3" });
  });

  it('C 5.3-2 zona 2 con voladizo: el «A > 5,0» abre un salto de 0,706 y el 50,0 cierra exacto', () => {
    // La recta −2,3 + 0,7063 log A vale −1,80631 en A = 5 m². Si la meseta de −1,1
    // empezara ahí, como dice el papel, la curva daría un escalón de 0,706 en el medio de
    // un gráfico que en la figura es continuo. En A = 50 la recta llega a −1,10002.
    const recta = A => -2.3 + 0.7063 * log(A);
    expect(recta(5)).toBeCloseTo(-1.80632, 4);
    expect(Math.abs(recta(5) - (-1.1))).toBeCloseTo(0.706, 3);
    expect(recta(50)).toBeCloseTo(-1.1, 4);
    // Y la curva transcripta es la corregida: sigue la recta hasta 50.
    expect(gcp(curvaDe("5.3-2A", "voladizo", "2", "neg"), 10)).toBeCloseTo(recta(10), 3);
  });

  it('C 5.3-4 zona 3: el «−1.4» con punto es −1,4, y cae exacto sobre la recta', () => {
    expect(-3.0 + 1.600 * log(10)).toBeCloseTo(-1.4, 10);
    expect(gcp(curvaDe("5.3-2C", "cubierta", "3", "neg"), 100)).toBeCloseTo(-1.4, 10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROPIEDADES QUE TIENEN TODAS LAS FIGURAS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Forma de las curvas', () => {
  const todas = [];
  for (const fig of FIGURAS_LISTA) {
    const f = FIGURAS[fig];
    for (const v of f.ubicaciones) for (const z of f.zonas) for (const s of ["pos", "neg"]) {
      todas.push([`${fig}·${v}·${z}·${s}`, f.curvas[v][z][s], s]);
    }
  }

  it('hay 56 curvas y todas están bien formadas', () => {
    expect(todas).toHaveLength(56);
    for (const [donde, curva] of todas) {
      expect(curva.length, donde).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < curva.length; i++) {
        expect(curva[i][0], `${donde}: áreas crecientes`).toBeGreaterThan(curva[i - 1][0]);
      }
      for (const [A, g] of curva) {
        expect(Number.isFinite(A) && A > 0, donde).toBe(true);
        expect(Number.isFinite(g), donde).toBe(true);
      }
    }
  });

  it('el signo de cada curva es el que dice su nombre', () => {
    // Un `pos` y un `neg` intercambiados al copiar daría un cálculo entero al revés, y el
    // barrido contra las ecuaciones no lo vería si TAMBIÉN se intercambiaron allá.
    for (const [donde, curva, signo] of todas) {
      for (const [, g] of curva) {
        if (signo === "pos") expect(g, donde).toBeGreaterThan(0);
        else expect(g, donde).toBeLessThan(0);
      }
    }
  });

  it('el (GC_p) pierde magnitud al crecer el área, en las 56 curvas', () => {
    // Es la propiedad física del capítulo: cuanto más grande el elemento, menos
    // correlacionado el pico de succión sobre toda su superficie. Vale para las ocho
    // tablas sin una sola excepción, así que un par de puntos transpuesto salta acá.
    for (const [donde, curva] of todas) {
      for (let i = 1; i < curva.length; i++) {
        expect(Math.abs(curva[i][1]), `${donde}, punto ${i}`)
          .toBeLessThanOrEqual(Math.abs(curva[i - 1][1]));
      }
    }
  });

  it('la esquina nunca es menos succionada que el borde, ni el borde que el interior', () => {
    // Zona 3 ≤ zona 2 ≤ zona 1 ≤ zona 1', en negativo y a igual área. Es cómo está armada
    // la zonificación: si dos curvas se cruzaran, la zona gobernante dejaría de ser la que
    // dibuja el croquis. En la Fig. 5.3-2F las zonas 2 y 3 empatan, que es lo que dice el
    // reglamento; por eso la comparación es ≤ y no <.
    const orden = ["3", "2", "1", "1'"];
    for (const fig of FIGURAS_LISTA) {
      const f = FIGURAS[fig];
      if (f.superficie !== "cubierta") continue;
      for (const v of f.ubicaciones) {
        // El gráfico del ALERO se cruza; tiene su propio test, abajo.
        if (v === UBICACION.VOLADIZO) continue;
        const zs = orden.filter(z => f.zonas.includes(z));
        for (const A of AREAS) {
          for (let i = 1; i < zs.length; i++) {
            const donde = `${fig}·${v}: zona ${zs[i - 1]} vs ${zs[i]}, A = ${A} m²`;
            expect(gcp(f.curvas[v][zs[i - 1]].neg, A), donde)
              .toBeLessThanOrEqual(gcp(f.curvas[v][zs[i]].neg, A) + 1e-12);
          }
        }
      }
    }
    // Y en paredes, la zona 5 (esquina) nunca por encima de la 4.
    for (const A of AREAS) {
      expect(gcp(FIGURAS["5.3-1"].curvas.pared["5"].neg, A))
        .toBeLessThanOrEqual(gcp(FIGURAS["5.3-1"].curvas.pared["4"].neg, A) + 1e-12);
    }
  });

  it('la Fig. 5.3-2F comparte curva entre las zonas 2 y 3', () => {
    const c = FIGURAS["5.3-2F"].curvas.cubierta;
    expect(c["2"].neg).toEqual(c["3"].neg);
    expect(c["2"].pos).toEqual(c["3"].pos);
  });

  it('las curvas de cubierta y de alero son distintas, zona por zona', () => {
    // Los dos gráficos de la Fig. 5.3-2A son DOS UBICACIONES DEL ELEMENTO, no dos
    // edificios: CUBIERTAS es un elemento sobre el recinto cerrado y ALERO uno ubicado en
    // el voladizo, cuyo (GC_p) ya incluye las dos caras (nota 6). Compararlos no dice
    // «con voladizo el techo se carga más»: son elementos distintos, con presión interna
    // distinta —la del alero sale del art. 5.7—.
    //
    // Lo que sí fija este test son los números de las curvas, que es lo que se controla
    // contra el papel: en el alero las zonas 1 y 1' llegan más abajo que en la cubierta, y
    // las zonas 2 y 3 menos, porque su meseta final es −1,1 contra −1,4.
    const { cubierta, voladizo } = FIGURAS["5.3-2A"].curvas;
    const dif = (z, A) => gcp(voladizo[z].neg, A) - gcp(cubierta[z].neg, A);
    for (const A of AREAS) {
      expect(dif("1'", A), `zona 1', A = ${A} m²`).toBeLessThan(-0.4);
      expect(dif("1", A), `zona 1, A = ${A} m²`).toBeLessThanOrEqual(1e-12);
      for (const z of ["2", "3"]) {
        expect(dif(z, A), `zona ${z}, A = ${A} m²`).toBeGreaterThanOrEqual(-1e-12);
      }
    }
    expect(Math.min(...AREAS.map(A => dif("1", A)))).toBeCloseTo(-0.312, 3);
    expect(Math.max(...AREAS.map(A => dif("2", A)))).toBeCloseTo(0.300, 3);
    expect(gcp(voladizo["2"].neg, 100)).toBeCloseTo(-1.1, 10);
    expect(gcp(cubierta["2"].neg, 100)).toBeCloseTo(-1.4, 10);
  });

  it('en el gráfico del alero, las zonas 1 y 2 se cruzan — y el cruce es ruido de redondeo', () => {
    // ÚNICA EXCEPCIÓN al orden de severidad de todo el capítulo. Entre A = 9,76 y 11,0 m²
    // la zona 1 del alero queda por DEBAJO de la zona 2, hasta 0,0063 en A = 10 m². No es
    // un error de transcripción: sale de los coeficientes tal como los imprime el
    // comentario (−1,7 + 0,1000 log A contra −2,3 + 0,7063 log A, que se igualan en
    // A = 9,7627), y 0,006 está un orden por debajo del 0,1 con que el reglamento redondea
    // sus (GC_p). En el gráfico las dos curvas se tocan y no se distinguen.
    //
    // Queda fijado acá para que la próxima vez que alguien vea el cruce sepa que ya se
    // miró, y para que el día que se corrija un coeficiente se note que el cruce cambió.
    const { voladizo } = FIGURAS["5.3-2A"].curvas;
    // Positivo = la zona 1 quedó MÁS succionada que la zona 2, que es el orden invertido.
    const invertido = A => gcp(voladizo["2"].neg, A) - gcp(voladizo["1"].neg, A);
    expect(invertido(9.5)).toBeLessThan(0);          // antes del cruce, el orden es el normal
    expect(invertido(10)).toBeCloseTo(0.0063, 4);    // el peor punto
    expect(invertido(12)).toBeLessThan(0);           // pasado el cruce vuelve a ordenarse
    for (const A of AREAS) expect(invertido(A), `A = ${A} m²`).toBeLessThan(0.01);
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// METADATOS DE LAS FIGURAS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Qué declara cada figura', () => {
  it('las ocho figuras están en la lista y la lista no sale de Object.keys', () => {
    expect(FIGURAS_LISTA).toHaveLength(8);
    expect(new Set(FIGURAS_LISTA)).toEqual(new Set(Object.keys(FIGURAS)));
  });

  it('el orden de las zonas NO puede salir de Object.keys', () => {
    // La zona 1' es la INTERIOR y va primera en la figura; «1», «2» y «3» parecen enteros
    // y JavaScript los adelanta. Este test no verifica el reglamento: verifica que la
    // trampa sigue siendo real, para que nadie reemplace `zonas` por `Object.keys` viendo
    // que «total, da lo mismo».
    const curvas = FIGURAS["5.3-2A"].curvas.cubierta;
    expect(Object.keys(curvas)).toEqual(["1", "2", "3", "1'"]);
    expect(FIGURAS["5.3-2A"].zonas).toEqual(["1'", "1", "2", "3"]);
  });

  it('las zonas declaradas son exactamente las que tienen curva, en toda variante', () => {
    for (const fig of FIGURAS_LISTA) {
      const f = FIGURAS[fig];
      expect(f.ubicaciones.length, fig).toBeGreaterThanOrEqual(1);
      for (const v of f.ubicaciones) {
        expect(new Set(Object.keys(f.curvas[v])), `${fig}·${v}`).toEqual(new Set(f.zonas));
      }
      expect(new Set(Object.keys(f.curvas)), fig).toEqual(new Set(f.ubicaciones));
    }
  });

  it('sólo la 5.3-2A tiene curva de alero, y sólo ella zonifica por h', () => {
    // La ubicación es del ELEMENTO, no del edificio: `voladizo` existe únicamente donde la
    // figura trae su propio gráfico de alero. En las 2B a 2G el voladizo se arma por suma
    // (art. 5.7), y por eso ahí no hay curva que ofrecer.
    for (const fig of FIGURAS_LISTA) {
      const f = FIGURAS[fig];
      const esperado = fig === "5.3-1"
        ? { ubicaciones: [UBICACION.PARED], zonificaPor: "a" }
        : fig === "5.3-2A"
          ? { ubicaciones: [UBICACION.CUBIERTA, UBICACION.VOLADIZO], zonificaPor: "h" }
          : { ubicaciones: [UBICACION.CUBIERTA], zonificaPor: "a" };
      expect({ ubicaciones: f.ubicaciones, zonificaPor: f.zonificaPor }, fig).toEqual(esperado);
    }
  });

  it('cada figura declara qué altura usa, leída de su notación', () => {
    // Confundir la altura media con la del alero cambia las zonas de la 5.3-2A, la
    // dimensión `a` de todas las demás y la altura a la que se evalúa q_h: tres cosas a la
    // vez y ninguna visible en el resultado.
    expect(FIGURAS["5.3-2A"].alturaH).toBe(ALTURA_H.ALERO);
    for (const fig of ["5.3-1", "5.3-2B", "5.3-2E", "5.3-2F"]) {
      expect(FIGURAS[fig].alturaH, fig).toBe(ALTURA_H.ALERO_SI_THETA_10);
    }
    for (const fig of ["5.3-2C", "5.3-2D", "5.3-2G"]) {
      expect(FIGURAS[fig].alturaH, fig).toBe(ALTURA_H.MEDIA);
    }
    for (const fig of FIGURAS_LISTA) {
      expect(ETIQUETA_ALTURA_H[FIGURAS[fig].alturaH], fig).toBeTruthy();
    }
  });

  it('cada figura dice de qué tabla del comentario salen sus números', () => {
    const tablas = FIGURAS_LISTA.map(f => FIGURAS[f].tabla);
    expect(tablas).toEqual(["C 5.3-1", "C 5.3-2", "C 5.3-3", "C 5.3-4",
                            "C 5.3-5", "C 5.3-6", "C 5.3-7", "C 5.3-8"]);
    for (const fig of FIGURAS_LISTA) {
      expect(FIGURAS[fig].pagina, fig).toMatch(/^Cap\. 5-\d{3}$/);
      expect(FIGURAS[fig].titulo, fig).toBeTruthy();
    }
  });

  it('las figuras de vertiente única están declaradas como pendientes, no faltando', () => {
    // No tienen ecuación en el comentario: son sólo gráfico. Que estén en una lista aparte
    // —y no simplemente ausentes— es lo que permite que la selección de figura diga «esta
    // figura todavía no está transcripta» en vez de «no aplica ninguna».
    expect(Object.keys(FIGURAS_PENDIENTES)).toEqual(["5.3-5A", "5.3-5B"]);
    for (const [fig, d] of Object.entries(FIGURAS_PENDIENTES)) {
      expect(FIGURAS_LISTA, fig).not.toContain(fig);
      expect(d.motivo, fig).toMatch(/transcribir el gráfico/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EL EVALUADOR
// ═══════════════════════════════════════════════════════════════════════════════

describe('gcpDeCurva — interpolación en log A con los extremos congelados', () => {
  const curva = FIGURAS["5.3-2A"].curvas.cubierta["3"].neg;  // [[1, −3,2], [50, −1,4]]

  it('congela por debajo y por encima, y lo dice', () => {
    expect(gcpDeCurva(curva, 0.1)).toMatchObject({ valor: -3.2, fuera: "debajo" });
    expect(gcpDeCurva(curva, 500)).toMatchObject({ valor: -1.4, fuera: "encima" });
    // En el punto de quiebre no está ni fuera ni interpolado.
    expect(gcpDeCurva(curva, 50)).toMatchObject({ valor: -1.4, fuera: null, interpolado: false });
  });

  it('interpola en log A y no en A', () => {
    // A = 7,0711 m² es la media GEOMÉTRICA de 1 y 50: en log A cae justo en el medio del
    // tramo, así que el (GC_p) tiene que ser el promedio de los extremos. En A no cae en
    // el medio ni cerca, y daría −3,0.
    const medio = Math.sqrt(1 * 50);
    expect(gcp(curva, medio)).toBeCloseTo((-3.2 + -1.4) / 2, 10);
    expect(gcp(curva, medio)).not.toBeCloseTo(-3.0, 1);
  });

  it('devuelve los puntos usados en ÁREA, no en logaritmo', () => {
    const r = gcpDeCurva(curva, 5);
    expect(r.interpolado).toBe(true);
    expect(r.puntos.map(p => p.A)).toEqual([1, 50]);
    expect(r.puntos.map(p => p.gcp)).toEqual([-3.2, -1.4]);
  });

  it('rechaza un área que no sea positiva en vez de devolver un número plausible', () => {
    // `Math.log10(0)` es −Infinity y la interpolación devolvería el primer punto, que es
    // el (GC_p) más desfavorable de la curva: un elemento con el área sin cargar saldría
    // calculado y del lado seguro, que es la peor forma de esconder un dato faltante.
    for (const A of [0, -1, NaN]) {
      expect(() => gcpDeCurva(curva, A)).toThrow(/área efectiva tiene que ser positiva/);
    }
  });
});
