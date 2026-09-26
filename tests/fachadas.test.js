// FORMA REAL DE LAS FACHADAS.
//
// ── CÓMO SE VERIFICA ───────────────────────────────────────────────────────────
// El área de cada pared se compara contra la del POLÍGONO, armado vértice por vértice a
// partir de la envolvente del edificio y cerrado por la fórmula del zapatero. No comparte
// una línea de código con `fachadas.js`: si las dos usaran la misma expresión, el test
// verificaría que la expresión es igual a sí misma.
import { describe, it, expect } from 'vitest';
import { fachada, fachadasDe, anchoEn, areaHasta, momentoHasta } from '../src/engine/fachadas.js';
import { normalizarGeo, remonte, DIRECCIONES } from '../src/engine/edificio.js';

const D = DIRECCIONES;

/**
 * Altura del techo sobre el punto (x, y) de la planta. Es la definición geométrica de
 * cada tipo de cubierta, escrita acá aparte para no reusar nada del módulo que se prueba.
 */
function techoEn(g, x, y) {
  const { a, b, hAlero, tipo, cumbrera, pendienteHacia } = g;
  if (tipo === "plana") return hAlero;
  const r = remonte({ tipo, theta: g.theta, a, b, cumbrera });
  if (tipo === "vertiente_unica") {
    const ejePend = pendienteHacia.slice(1), signoPend = pendienteHacia[0] === "+" ? 1 : -1;
    const [u, luz] = ejePend === "X" ? [x, a] : [y, b];
    // Desciende hacia el sentido `signoPend`: en ese extremo vale hAlero.
    const t = signoPend > 0 ? u / luz : 1 - u / luz;
    return hAlero + r * (1 - t);
  }
  if (tipo === "cuatro_aguas") {
    // A cuatro aguas las cuatro paredes cierran en el alero, cualquiera sea el faldón.
    return hAlero;
  }
  // Dos aguas: la cumbrera corre según `cumbrera`, así que la altura depende de la
  // coordenada NORMAL a ella.
  const [u, luz] = cumbrera === "X" ? [y, b] : [x, a];
  return hAlero + r * (1 - Math.abs(2 * u / luz - 1));
}

/** Área del polígono de una pared, por el zapatero sobre sus vértices. */
function areaPoligono(g, eje, signo) {
  const { a, b } = g;
  const n = 400;
  // La pared corre a lo largo del otro eje; su borde superior es el techo justo encima.
  const largo = eje === "X" ? b : a;
  const fijo = eje === "X" ? (signo > 0 ? a : 0) : (signo > 0 ? b : 0);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const s = largo * i / n;
    const [x, y] = eje === "X" ? [fijo, s] : [s, fijo];
    pts.push([s, techoEn(g, x, y)]);
  }
  pts.push([largo, 0], [0, 0]);
  let A = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    A += x1 * y2 - x2 * y1;
  }
  return Math.abs(A) / 2;
}

const GEOS = [
  ["plana", { a: 20, b: 30, hAlero: 6, theta: 0, tipo: "plana", cumbrera: "X" }],
  ["dos aguas, cumbrera X", { a: 20, b: 30, hAlero: 6, theta: 25, tipo: "dos_aguas", cumbrera: "X" }],
  ["dos aguas, cumbrera Y", { a: 20, b: 30, hAlero: 6, theta: 25, tipo: "dos_aguas", cumbrera: "Y" }],
  ["cuatro aguas", { a: 20, b: 30, hAlero: 6, theta: 25, tipo: "cuatro_aguas", cumbrera: "X" }],
  ["vertiente única hacia +Y", { a: 20, b: 30, hAlero: 6, theta: 18, tipo: "vertiente_unica",
    cumbrera: "X", pendienteHacia: "+Y" }],
  ["vertiente única hacia −X", { a: 20, b: 30, hAlero: 6, theta: 18, tipo: "vertiente_unica",
    cumbrera: "Y", pendienteHacia: "-X" }],
];

describe('el área de cada fachada es la del polígono real', () => {
  for (const [nombre, crudo] of GEOS) {
    const g = normalizarGeo(crudo);
    for (const eje of ["X", "Y"]) {
      for (const signo of [1, -1]) {
        it(`${nombre} — pared con normal ${signo > 0 ? "+" : "−"}${eje}`, () => {
          const f = fachada(g, /** @type {any} */ (eje), /** @type {any} */ (signo));
          // El polígono se muestrea en 400 puntos: en un hastial el borde es quebrado y
          // la discretización deja un error del orden de 1/400².
          expect(f.area).toBeCloseTo(areaPoligono(g, eje, signo), 2);
        });
      }
    }
  }
});

describe('las cuatro direcciones ven las paredes que corresponden', () => {
  for (const [nombre, crudo] of GEOS) {
    const g = normalizarGeo(crudo);
    for (const dir of D) {
      it(`${nombre} — ${dir.id}`, () => {
        const f = fachadasDe(g, dir);
        // Barlovento y sotavento son las dos paredes NORMALES al viento: misma anchura.
        expect(f.barlovento.W).toBe(f.sotavento.W);
        expect(f.barlovento.W).toBe(dir.eje === "X" ? g.b : g.a);
        expect(f.lateral.W).toBe(dir.eje === "X" ? g.a : g.b);
        // Y el área total de la envolvente vertical no depende de la dirección elegida.
        const total = f.barlovento.area + f.sotavento.area + f.lateral.area + f.lateral2.area;
        const otra = fachadasDe(g, D.find(d => d.eje !== dir.eje));
        expect(total).toBeCloseTo(
          otra.barlovento.area + otra.sotavento.area + otra.lateral.area + otra.lateral2.area, 9);
      });
    }
  }
});

describe('qué forma le toca a cada pared', () => {
  const g = (o) => normalizarGeo(o);
  it('dos aguas: hastial en las paredes normales al eje de la cumbrera', () => {
    const dosX = g({ a: 20, b: 30, hAlero: 6, theta: 25, tipo: "dos_aguas", cumbrera: "X" });
    expect(fachada(dosX, "X", 1).forma).toBe("hastial");
    expect(fachada(dosX, "Y", 1).forma).toBe("rectangulo");
  });

  it('viento PARALELO a la cumbrera ⇒ barlovento es el hastial', () => {
    const dosX = g({ a: 20, b: 30, hAlero: 6, theta: 25, tipo: "dos_aguas", cumbrera: "X" });
    expect(fachadasDe(dosX, D.find(d => d.id === "Wx+")).barlovento.forma).toBe("hastial");
    expect(fachadasDe(dosX, D.find(d => d.id === "Wy+")).barlovento.forma).toBe("rectangulo");
  });

  it('cuatro aguas NO tiene hastial en ninguna pared', () => {
    const cuatro = g({ a: 20, b: 30, hAlero: 6, theta: 25, tipo: "cuatro_aguas", cumbrera: "X" });
    for (const eje of ["X", "Y"]) for (const s of [1, -1]) {
      expect(fachada(cuatro, eje, s).forma, `${eje}${s}`).toBe("rectangulo");
      expect(fachada(cuatro, eje, s).zTope).toBe(cuatro.hAlero);
    }
  });

  it('vertiente única: pared alta, pared baja y dos trapecios', () => {
    const v = g({ a: 20, b: 30, hAlero: 6, theta: 18, tipo: "vertiente_unica",
      cumbrera: "X", pendienteHacia: "+Y" });
    const r = remonte({ tipo: "vertiente_unica", theta: 18, a: 20, b: 30, cumbrera: "X" });
    expect(fachada(v, "Y", +1).zTope).toBeCloseTo(6, 9);          // desciende hacia +Y ⇒ baja
    expect(fachada(v, "Y", -1).zTope).toBeCloseTo(6 + r, 9);      // enfrente ⇒ alta
    expect(fachada(v, "X", +1).forma).toBe("trapecio");
    expect(fachada(v, "X", -1).forma).toBe("trapecio");
  });
});

describe('ancho, área acumulada y momento estático', () => {
  const g = normalizarGeo({ a: 20, b: 30, hAlero: 6, theta: 25, tipo: "dos_aguas", cumbrera: "X" });
  const f = fachada(g, "X", 1);   // hastial de ancho 30

  it('el ancho baja de W a 0 entre z1 y z2, y es 0 por encima', () => {
    expect(anchoEn(f, 0)).toBe(f.W);
    expect(anchoEn(f, f.z1)).toBe(f.W);
    expect(anchoEn(f, (f.z1 + f.z2) / 2)).toBeCloseTo(f.W / 2, 9);
    expect(anchoEn(f, f.z2)).toBeCloseTo(0, 12);
    expect(anchoEn(f, f.z2 + 1)).toBe(0);
  });

  // `areaHasta` y `momentoHasta` son la primitiva de `anchoEn` y de z·anchoEn. Si alguna
  // se desviara —un signo, un 2 de más en el denominador— la integración numérica no la
  // reproduciría, y con ella se integra TODA la pared a barlovento.
  it('son las primitivas de ancho(z) y de z·ancho(z)', () => {
    const N = 20000, dz = f.z2 / N;
    let A = 0, M = 0;
    for (let i = 0; i < N; i++) {
      const z = (i + 0.5) * dz;
      A += anchoEn(f, z) * dz;
      M += z * anchoEn(f, z) * dz;
    }
    expect(areaHasta(f, f.z2)).toBeCloseTo(A, 4);
    expect(momentoHasta(f, f.z2)).toBeCloseTo(M, 3);
    // Y en un punto intermedio, no sólo en el tope. La grilla se rehace sobre [0, zm]:
    // cortar la grilla anterior deja un último paso a medias y la diferencia que eso
    // introduce es mayor que la que el test quiere detectar.
    const zm = f.z1 + (f.z2 - f.z1) * 0.4;
    const dz2 = zm / N;
    let A2 = 0;
    for (let i = 0; i < N; i++) A2 += anchoEn(f, (i + 0.5) * dz2) * dz2;
    expect(areaHasta(f, zm)).toBeCloseTo(A2, 4);
  });

  it('areaHasta(z2) es el área total y no crece más allá', () => {
    expect(areaHasta(f, f.z2)).toBeCloseTo(f.area, 12);
    expect(areaHasta(f, f.z2 * 3)).toBeCloseTo(f.area, 12);
    expect(areaHasta(f, -1)).toBe(0);
  });

  it('en un rectángulo, el brazo del momento cae en la mitad de la altura', () => {
    const rectan = fachada(normalizarGeo({ a: 20, b: 30, hAlero: 6, theta: 0, tipo: "plana" }), "X", 1);
    expect(momentoHasta(rectan, rectan.z2) / rectan.area).toBeCloseTo(3, 9);
  });

  it('en un hastial el brazo sube por encima de la mitad del alero', () => {
    expect(momentoHasta(f, f.z2) / f.area).toBeGreaterThan(f.z1 / 2);
  });
});
