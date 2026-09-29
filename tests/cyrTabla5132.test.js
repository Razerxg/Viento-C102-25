// CAPÍTULO 5 — EL MOTOR CONTRA LA TABLA 5.13-2 DEL PROPIO REGLAMENTO.
//
// ⚠ ES LA VERIFICACIÓN MÁS FUERTE DEL CAPÍTULO, Y LA ÚNICA DE VERDAD INDEPENDIENTE.
//
// Los tests contra las Tablas C 5.3-1 a C 5.3-8 comparan dos transcripciones MÍAS de la
// misma fuente: sirven para la conversión a puntos de quiebre y no para mucho más. Acá el
// contraste es contra 960 presiones que calcularon los autores de la norma. El comentario
// C 5.13 dice con qué las calcularon —Parte 1, h = 10 m, exposición B, K_z = 0,71,
// K_d = 0,85, K_zt = 1, K_e = 1, y los (GC_p) de las Figs. 5.3-1 y 5.3-2A—, así que el
// motor de la etapa 5.1 tiene que poder regenerarlas.
//
// Verifica de una sola vez, y contra números ajenos: la lectura del PDF, la interpolación
// en log A, la combinación de los dos signos de (GC_pi) en el sentido desfavorable y el
// mínimo de 0,80 kN/m² del art. 5.2.2 —que en esta tabla gobierna en más de la mitad de
// las celdas positivas, así que si estuviera mal no habría forma de no verlo—.
//
// ── K_z SE FIJA EN 0,71, QUE ES LO QUE DECLARA C 5.13 ──────────────────────────
// No se usa `kz(10, "B")` del motor, que da 0,7058: la diferencia es un −0,59 % uniforme
// que no tiene NADA que ver con el capítulo 5 —viene de que la norma tabula K_z redondeado
// a dos decimales y el motor usa la expresión continua de la nota 1 de la Tabla 1.13-1, lo
// que ya está decidido y testeado aparte—. Metido acá se comería la tolerancia y
// convertiría este control en uno de K_z.
import { describe, it, expect } from 'vitest';
import {
  VELOCIDADES, CERRADO, PARCIALMENTE_CERRADO, PARAMETROS_C513, GCPI,
} from './casos/tabla5132.js';
import { RHO_MEDIO, kz } from '../src/engine/presionDinamica.js';
import { FORMA, figuraCubierta, figuraPared, gcpDeFuente, reduccionPared } from '../src/engine/cyrFiguras.js';
import { UBICACION } from '../src/constants/cyrCurvas.js';
import { presionDeZona, gcpDeZona, P_MINIMA } from '../src/engine/cyrPresiones.js';

const { Kz, Kd, Kzt, Ke } = PARAMETROS_C513;
const qhDe = (V) => RHO_MEDIO * Kz * Kzt * Kd * Ke * V * V;

const TOL = 0.005;   // 0,5 %

// Las cubiertas de la tabla son planas: Fig. 5.3-2A, ubicación `cubierta`.
const fuenteCubierta = figuraCubierta({ forma: FORMA.PLANA, theta: 0 });

/**
 * El (GC_p) con el que la TABLA fue construida.
 *
 * ⚠ EN PAREDES NO LLEVA LA REDUCCIÓN DEL 10 % de la nota 5 de la Fig. 5.3-1, aunque la
 * tabla sea de cubiertas con θ ≤ 7°. No es una licencia del test: se midió: aplicándola,
 * las 192 celdas de pared se separan un 10 % y ninguna entra en la tolerancia. Hay un test
 * abajo que lo deja fijado, para que nadie «arregle» el motor hacia este lado.
 */
const gcpTabla = (ubicacion, zona, signo, A) => (ubicacion === "pared"
  ? gcpDeFuente(figuraPared(), { zona, signo, A, ubicacion: UBICACION.PARED }).valor
  : gcpDeFuente(fuenteCubierta, { zona, signo, A, ubicacion: UBICACION.CUBIERTA }).valor);

const regenerar = ({ ubicacion, zona, A }, V, gcpi) => {
  const pos = gcpTabla(ubicacion, zona, "pos", A);
  const neg = gcpTabla(ubicacion, zona, "neg", A);
  return presionDeZona({ qh: qhDe(V), gcpi }, { pos, neg });
};

// ── LAS EXCEPCIONES, RECONOCIDAS POR NOMBRE ────────────────────────────────────
//
// No se amplía la tolerancia: cada desvío se identifica por su fila, y el test exige que
// esté DENTRO de la banda medida. Una tolerancia más ancha taparía un error nuevo; una
// banda por excepción falla si el desvío cambia, que es justo lo que se quiere saber.
const EXCEPCIONES = [
  {
    nombre: "cubierta zona 1, A = 2 m²",
    donde: (f) => f.ubicacion === "cubierta" && f.zona === "1" && f.A === 2,
    signo: "neg", banda: [0.010, 0.016],
    motivo: "la tabla da entre 1,1 % y 1,4 % más de succión que la ecuación de la "
      + "Tabla C 5.3-2 en esa única área. No hay otra área ni otra zona con el mismo "
      + "desvío, así que no es la curva: es ese punto.",
  },
  {
    nombre: "paredes zona 5, A = 5 m², positivo",
    donde: (f) => f.ubicacion === "pared" && f.zona === "5" && f.A === 5,
    signo: "pos", banda: [0.010, 0.025],
    motivo: "la tabla distingue el positivo de la zona 5 del de la zona 4, y la Tabla "
      + "C 5.3-1 les da la MISMA ecuación («Positivo: Zonas 4 y 5»). El desvío de la "
      + "zona 4 en esa misma área queda por debajo del 0,5 % y no necesita excepción.",
  },
  {
    nombre: "ERRATA — cubierta zona 2, A = 1 m², V = 42,9 m/s, cerrado",
    donde: (f) => f.ubicacion === "cubierta" && f.zona === "2" && f.A === 1,
    signo: "neg", soloV: 42.9, soloCaso: "cerrado", banda: [0.14, 0.16],
    motivo: "la tabla repite el −1.468 N/m² de la columna de 40 m/s. Corresponde −1.689. "
      + "Con (GC_pi) = ±0,55 la misma celda cierra bien, así que es esa celda y no la curva.",
  },
];

const excepcionDe = (fila, V, signo, caso) => EXCEPCIONES.find(e =>
  e.donde(fila) && e.signo === signo
  && (e.soloV === undefined || e.soloV === V)
  && (e.soloCaso === undefined || e.soloCaso === caso));

const CASOS = [
  { caso: "cerrado", etiqueta: "cerrados y parcialmente abiertos", filas: CERRADO, gcpi: GCPI.cerrado },
  { caso: "parcial", etiqueta: "parcialmente cerrados", filas: PARCIALMENTE_CERRADO, gcpi: GCPI.parcialmenteCerrado },
];

describe('Tabla 5.13-2 — el motor la regenera', () => {
  it('la transcripción tiene las 960 celdas que imprime el reglamento', () => {
    expect(VELOCIDADES).toHaveLength(16);
    let celdas = 0;
    for (const { filas } of CASOS) {
      expect(filas).toHaveLength(15);
      for (const f of filas) {
        expect(f.pos, `${f.ubicacion}·${f.zona}·${f.A}`).toHaveLength(16);
        expect(f.neg, `${f.ubicacion}·${f.zona}·${f.A}`).toHaveLength(16);
        celdas += 32;
      }
    }
    expect(celdas).toBe(960);
  });

  for (const { caso, etiqueta, filas, gcpi } of CASOS) {
    it(`edificios ${etiqueta}, (GC_pi) = ±${gcpi}`, () => {
      const fuera = [];
      let comparadas = 0;
      for (const fila of filas) {
        VELOCIDADES.forEach((V, j) => {
          const r = regenerar(fila, V, gcpi);
          for (const [signo, mio, tabla] of [
            ["pos", r.pPos, fila.pos[j]],
            ["neg", -r.pNeg, fila.neg[j]],
          ]) {
            comparadas++;
            const d = Math.abs(mio - tabla) / tabla;
            const exc = excepcionDe(fila, V, signo, caso);
            const donde = `${fila.ubicacion} z${fila.zona} A=${fila.A} V=${V} ${signo}: `
              + `motor ${Math.round(mio)} · tabla ${tabla} · ${(d * 100).toFixed(2)} %`;
            if (!exc) { if (d > TOL) fuera.push(donde); continue; }
            // Dentro de una excepción el desvío tiene que estar en SU banda, salvo que la
            // celda la gobierne el mínimo del art. 5.2.2: ahí el (GC_p) no interviene y la
            // celda cierra exacto, que es lo que pasa en las columnas de menor velocidad.
            // Lo que NO se admite es un desvío intermedio, ni uno mayor que la banda: eso
            // sería otra cosa, y esta excepción no la cubre.
            if (d <= TOL) continue;
            expect(d, `${exc.nombre} — ${donde}`).toBeGreaterThanOrEqual(exc.banda[0]);
            expect(d, `${exc.nombre} — ${donde}`).toBeLessThanOrEqual(exc.banda[1]);
          }
        });
      }
      expect(comparadas).toBe(480);
      expect(fuera, `${fuera.length} celdas fuera del 0,5 %:\n${fuera.slice(0, 12).join("\n")}`)
        .toEqual([]);
    });
  }

  it('las excepciones declaradas son exactamente las celdas que se salen, y ninguna más', () => {
    // Si alguna excepción dejara de ser necesaria —porque se corrigió algo— este test la
    // señala, en vez de dejarla como una exención permanente que nadie vuelve a mirar.
    for (const exc of EXCEPCIONES) {
      let vistas = 0;
      for (const { caso, filas, gcpi } of CASOS) {
        for (const fila of filas) {
          VELOCIDADES.forEach((V, j) => {
            if (!excepcionDe(fila, V, exc.signo, caso) || !exc.donde(fila)) return;
            const r = regenerar(fila, V, gcpi);
            const mio = exc.signo === "pos" ? r.pPos : -r.pNeg;
            const tabla = exc.signo === "pos" ? fila.pos[j] : fila.neg[j];
            if (Math.abs(mio - tabla) / tabla > TOL) vistas++;
          });
        }
      }
      expect(vistas, `${exc.nombre} ya no se sale de la tolerancia`).toBeGreaterThan(0);
    }
  });

  it('la tabla NO aplica la reducción del 10 % de la nota 5 de la Fig. 5.3-1', () => {
    // Es una comprobación, no una suposición: con la reducción aplicada, las paredes se
    // separan alrededor del 10 % y prácticamente ninguna celda entra en la tolerancia.
    // La reducción sigue viva en el motor y tiene su propio test; lo que no corresponde es
    // aplicarla al regenerar ESTA tabla.
    expect(reduccionPared(0).factor).toBe(0.9);
    let dentro = 0, total = 0;
    for (const fila of CERRADO.filter(f => f.ubicacion === "pared")) {
      VELOCIDADES.forEach((V, j) => {
        const r = regenerar(fila, V, GCPI.cerrado);
        const conReduccion = presionDeZona({ qh: qhDe(V), gcpi: GCPI.cerrado }, {
          pos: gcpTabla("pared", fila.zona, "pos", fila.A) * 0.9,
          neg: gcpTabla("pared", fila.zona, "neg", fila.A) * 0.9,
        });
        total++;
        if (Math.abs(-conReduccion.pNeg - fila.neg[j]) / fila.neg[j] <= TOL) dentro++;
        expect(Math.abs(-r.pNeg - fila.neg[j]) / fila.neg[j], `${fila.zona} A=${fila.A} V=${V}`)
          .toBeLessThanOrEqual(TOL);
      });
    }
    // Las celdas que igual coinciden con reducción son las que gobierna el mínimo de
    // 800 N/m², donde el (GC_p) no interviene.
    expect(dentro).toBeLessThan(total / 2);
  });

  it('el mínimo del art. 5.2.2 gobierna donde la tabla dice 800, y no donde dice más', () => {
    // La tabla es un banco de prueba del mínimo: sus columnas positivas valen exactamente
    // +800 hasta que la velocidad las levanta, y ahí pasan a 807, 833, 959… Un mínimo mal
    // puesto —aplicado a la envolvente y no por sentido, o con el 0,75 del art. 2.1.5—
    // rompe la frontera entre esas dos zonas de la tabla.
    let enMinimo = 0, porEncima = 0;
    for (const fila of CERRADO) {
      VELOCIDADES.forEach((V, j) => {
        const r = regenerar(fila, V, GCPI.cerrado);
        const donde = `${fila.ubicacion} z${fila.zona} A=${fila.A} V=${V}`;
        if (fila.pos[j] === P_MINIMA) {
          expect(r.gobiernaMinimo.pos, `${donde}: la tabla dice 800`).toBe(true);
          expect(r.pPos, donde).toBe(P_MINIMA);
          enMinimo++;
        } else {
          expect(r.gobiernaMinimo.pos, `${donde}: la tabla dice ${fila.pos[j]}`).toBe(false);
          porEncima++;
        }
      });
    }
    expect(enMinimo).toBeGreaterThan(100);
    expect(porEncima).toBeGreaterThan(20);
  });

  it('K_z tabulado y K_z calculado difieren 0,59 %, y por eso el control fija el tabulado', () => {
    // Queda escrito con su número: si alguien cambia la expresión de K_z, este test dice
    // cuánto se movió antes de que el control cruzado empiece a fallar por otra cosa.
    expect(kz(10, "B")).toBeCloseTo(0.7058, 4);
    expect(Math.round(kz(10, "B") * 100) / 100).toBe(Kz);
    expect(Math.abs(kz(10, "B") - Kz) / Kz).toBeCloseTo(0.0059, 4);
  });
});

describe('gcpDeZona reproduce la tabla en cubierta, donde no hay nota que la aparte', () => {
  it('las 9 filas de cubierta salen iguales por el camino completo del motor', () => {
    // El bloque de arriba llama a `gcpDeFuente` directo para poder desactivar la nota 5 en
    // paredes. En cubierta no hay nada que desactivar, así que ahí se puede recorrer el
    // camino entero —`gcpDeZona`, con su contexto y sus notas— y tiene que dar lo mismo.
    const ctx = { qh: qhDe(49), gcpi: GCPI.cerrado, fuente: fuenteCubierta, theta: 0, parapeto: false };
    for (const fila of CERRADO.filter(f => f.ubicacion === "cubierta")) {
      const g = gcpDeZona(ctx, { superficie: "cubierta", zona: fila.zona, A: fila.A });
      const p = presionDeZona(ctx, g);
      const j = VELOCIDADES.indexOf(49);
      const exc = excepcionDe(fila, 49, "neg", "cerrado");
      if (exc) continue;
      expect(Math.abs(-p.pNeg - fila.neg[j]) / fila.neg[j], `z${fila.zona} A=${fila.A}`)
        .toBeLessThanOrEqual(TOL);
      expect(g.notas).toEqual([]);
    }
  });
});
