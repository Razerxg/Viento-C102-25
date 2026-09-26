// CASOS DE CARGA CONSISTENTES, PISO SOLIDARIO Y LA CARGA MÍNIMA COMPLETA.
//
// ── EL DEFECTO QUE ESTO FIJA ───────────────────────────────────────────────────
// `resultantes()` tomaba el corte del caso de la nota 3 que maximizaba H y el
// levantamiento del que maximizaba V, y los combinaba en UN vuelco. El número que salía
// no correspondía a ningún estado de carga: en el galpón de control parcialmente cerrado,
// viento Wy+, el momento en el borde de sotavento daba 6.649 kNm cuando el caso de
// succión daba 6.081 y el de presión 4.988.
//
// Un caso de carga es un conjunto de fuerzas CONCURRENTES. La envolvente toma máximos
// sobre casos, no máximos por componente.
import { describe, it, expect } from 'vitest';
import { analizarDireccion, DIRECCIONES } from '../src/engine/edificio.js';
import { resultantes, cargaMinima, aporteCubierta } from '../src/engine/resultantes.js';
import { MINIMOS } from '../src/engine/presiones.js';

const D = Object.fromEntries(DIRECCIONES.map(d => [d.id, d]));
// El galpón de control del proyectista.
const CONTROL = { V: 45, exposicion: "C", kd: 0.85, Kzt: 1.0, altitud: 0, usarKe: false };
const GALPON = { a: 30, b: 20, hAlero: 6, theta: 30, tipo: "dos_aguas", cumbrera: "X" };
const mk = (geo, dir, cerr = "cerrado", sitio = CONTROL) =>
  analizarDireccion({ geo, sitio, cerramiento: cerr, G: 0.85 }, D[dir]);

const GEOS = [
  ["dos aguas", GALPON],
  ["vertiente única", { a: 30, b: 20, hAlero: 6, theta: 20, tipo: "vertiente_unica",
    cumbrera: "X", pendienteHacia: "+Y" }],
  ["plana", { a: 30, b: 20, hAlero: 6, theta: 0, tipo: "plana", cumbrera: "X" }],
  ["cuatro aguas", { a: 30, b: 20, hAlero: 6, theta: 25, tipo: "cuatro_aguas", cumbrera: "X" }],
];

describe('cada magnitud informada sale de un estado de carga real', () => {
  // LA PROPIEDAD CENTRAL, barrida: ningún valor de la envolvente puede ser mayor que el
  // de TODOS los casos, porque entonces no sería de ninguno.
  for (const [nombre, geo] of GEOS) {
    for (const cerr of ["cerrado", "parc_cerrado"]) {
      for (const id of Object.keys(D)) {
        it(`${nombre} · ${cerr} · ${id}`, () => {
          const res = resultantes(mk(geo, id, cerr));
          expect(res.casos).toHaveLength(2);
          const de = (k, f) => {
            const valores = res.casos.map(f);
            // Es IGUAL a alguno de los casos…
            expect(valores.some(v => Math.abs(v - f(res)) < 1e-6), `${k}: ${f(res)} ∉ ${valores}`).toBe(true);
            // …y nunca mayor, en valor absoluto, que todos ellos.
            expect(Math.abs(f(res))).toBeLessThanOrEqual(Math.max(...valores.map(Math.abs)) + 1e-6);
          };
          de("cortante", r => r.cortante ?? r.cortante);
          de("vuelco", r => (r.momentos ? r.momentos.centro : r.momentos.centro));
          de("bordeSotavento", r => r.momentos.bordeSotavento);
          de("bordeBarlovento", r => r.momentos.bordeBarlovento);
          de("levantamiento", r => (r.V !== undefined ? r.V : r.levantamiento));
        });
      }
    }
  }

  // El caso concreto que el proyectista encontró.
  it('galpón de control, parcialmente cerrado, Wy+: el borde de sotavento es de un caso', () => {
    const res = resultantes(mk(GALPON, "Wy+", "parc_cerrado"));
    const porCaso = res.casos.map(c => c.momentos.bordeSotavento / 1000);
    expect(Math.max(...porCaso)).toBeCloseTo(6080.8, 0);
    expect(Math.min(...porCaso)).toBeCloseTo(4987.8, 0);
    // Y lo informado es el mayor de esos dos, no una mezcla mayor que ambos.
    expect(res.momentos.bordeSotavento / 1000).toBeCloseTo(6080.8, 0);
  });

  it('se informa qué caso gobierna cada magnitud', () => {
    const res = resultantes(mk(GALPON, "Wy+", "parc_cerrado"));
    for (const k of ["cortante", "levantamiento", "vuelco", "bordeBarlovento", "bordeSotavento"]) {
      expect(["negativo", "positivo"], k).toContain(res.gobernante[k]);
    }
  });

  it('cada caso trae la terna completa H, V, x_V y M', () => {
    for (const c of resultantes(mk(GALPON, "Wy+")).casos) {
      expect(typeof c.H).toBe("number");
      expect(typeof c.V).toBe("number");
      expect(typeof c.cortante).toBe("number");
      expect(c.momentos).toHaveProperty("centro");
      expect(c.momentos).toHaveProperty("bordeBarlovento");
      expect(c.momentos).toHaveProperty("bordeSotavento");
      // x_V puede ser null si V se anula, pero entonces el término vertical es 0.
      if (c.xV == null) expect(c.momentos.vertical).toBe(0);
    }
  });

  // Los dos casos son DISTINTOS de verdad: si dieran lo mismo, todo lo de arriba pasaría
  // sin verificar nada.
  it('los dos casos de la nota 3 dan resultados distintos', () => {
    const res = resultantes(mk(GALPON, "Wy+", "parc_cerrado"));
    expect(res.casos[0].V).not.toBeCloseTo(res.casos[1].V, 3);
    expect(res.casos[0].momentos.centro).not.toBeCloseTo(res.casos[1].momentos.centro, 3);
  });
});

describe('piso solidario a la estructura', () => {
  const geo = GALPON;
  const conPiso = (cerr) => resultantes(mk(geo, "Wy+", cerr), { pisoSolidario: true });
  const sinPiso = (cerr) => resultantes(mk(geo, "Wy+", cerr));

  // LA PROPIEDAD QUE PIDIÓ EL PROYECTISTA. Con el piso declarado, la presión interna se
  // autoequilibra: el empuje sobre la cubierta tiene su reacción sobre el piso.
  it('declarado: V y M no dependen de GC_pi', () => {
    const rs = ["cerrado", "parc_cerrado", "parc_abierto"].map(conPiso);
    const gcpi = ["cerrado", "parc_cerrado", "parc_abierto"].map(c => mk(geo, "Wy+", c).GCpi);
    expect(new Set(gcpi.map(g => g.toFixed(4))).size).toBeGreaterThan(1);
    for (const r of rs) {
      expect(r.levantamiento).toBeCloseTo(rs[0].levantamiento, 6);
      expect(r.vuelco).toBeCloseTo(rs[0].vuelco, 6);
      expect(r.momentos.bordeSotavento).toBeCloseTo(rs[0].momentos.bordeSotavento, 6);
    }
  });

  it('sin declarar: V y M SÍ dependen de GC_pi', () => {
    const a = sinPiso("cerrado"), b = sinPiso("parc_cerrado");
    expect(b.levantamiento).toBeGreaterThan(a.levantamiento);
    // Se compara contra un BORDE y no contra el centro, por lo que dice el test de abajo.
    expect(b.momentos.bordeSotavento).not.toBeCloseTo(a.momentos.bordeSotavento, 3);
    expect(b.momentos.bordeBarlovento).not.toBeCloseTo(a.momentos.bordeBarlovento, 3);
  });

  // ── UNA PROPIEDAD GENERAL QUE APARECIÓ AL ESCRIBIR ESTOS TESTS ────────────────
  // El momento respecto del CENTRO de la base NUNCA depende de GC_pi, aunque el
  // levantamiento sí. La presión interna es uniforme sobre toda la planta de cubierta,
  // así que su resultante vertical cae en el baricentro de la planta, o sea en L/2: su
  // brazo respecto del centro es cero. Respecto de un BORDE no lo es.
  //
  // No es una curiosidad —es la razón por la que el test de arriba no se puede escribir
  // sobre `vuelco`— y es además un control cruzado del signo de V y del brazo en planta:
  // con el brazo mal calculado, esta cancelación no se daría.
  it('el momento respecto del CENTRO no depende de GC_pi, en ninguna geometría', () => {
    for (const [nombre, geo] of GEOS) {
      for (const id of Object.keys(D)) {
        const a = resultantes(mk(geo, id, "cerrado"));
        const b = resultantes(mk(geo, id, "parc_cerrado"));
        const esc = Math.max(1, Math.abs(a.vuelco));
        expect(Math.abs(b.vuelco - a.vuelco) / esc, `${nombre} ${id}`).toBeLessThan(1e-9);
        // Y que el levantamiento SÍ cambie: si no, no habría nada que cancelar.
        expect(b.levantamiento, `${nombre} ${id}`).toBeGreaterThan(a.levantamiento);
      }
    }
  });

  it('declararlo baja el levantamiento, y más cuanto mayor sea GC_pi', () => {
    for (const cerr of ["cerrado", "parc_cerrado"]) {
      expect(conPiso(cerr).levantamiento, cerr).toBeLessThan(sinPiso(cerr).levantamiento);
    }
    const caida = (cerr) => 1 - conPiso(cerr).levantamiento / sinPiso(cerr).levantamiento;
    expect(caida("parc_cerrado")).toBeGreaterThan(caida("cerrado"));
  });

  // ⚠ LO QUE NO CAMBIA. La presión neta sobre la cubierta —chapas, correas, fijaciones—
  // sigue siendo externa ± interna: lo que se autoequilibra es la resultante GLOBAL.
  it('la presión neta sobre la cubierta no cambia', () => {
    const r = mk(geo, "Wy+", "parc_cerrado");
    const antes = r.superficies.filter(s => s.tipo === "cubierta")
      .map(s => [s.conInternaPos, s.conInternaNeg]);
    resultantes(r, { pisoSolidario: true });
    const despues = r.superficies.filter(s => s.tipo === "cubierta")
      .map(s => [s.conInternaPos, s.conInternaNeg]);
    expect(despues).toEqual(antes);
  });

  it('el corte tampoco cambia: H ya salía sólo de las externas', () => {
    for (const cerr of ["cerrado", "parc_cerrado"]) {
      expect(conPiso(cerr).cortante, cerr).toBeCloseTo(sinPiso(cerr).cortante, 6);
    }
  });

  it('la traza dice qué se declaró, con qué artículo y qué cambió', () => {
    const t = conPiso("cerrado").trazaDeclaraciones;
    const piso = t.find(x => x.id === "piso");
    expect(piso.declarado).toBe(true);
    expect(piso.efecto).toMatch(/autoequilibra|externas|NO entra/i);
    const nota7 = t.find(x => x.id === "nota7");
    expect(nota7.ref).toMatch(/nota 7/i);
    // La excepción está en la PROPIA nota 7, no en el C 2.1.5.
    expect(JSON.stringify(t)).not.toMatch(/C 2\.1\.5/);
  });
});

describe('la carga mínima es un caso de carga completo', () => {
  it('trae punto de aplicación y momento en la base', () => {
    const m = cargaMinima(mk(GALPON, "Wy+"));
    expect(m.zBar).toBeGreaterThan(0);
    expect(m.momento).toBeCloseTo(m.fuerza * m.zBar, 6);
  });

  it('el momento es la suma de los de cada área, cada una en su baricentro', () => {
    const m = cargaMinima(mk(GALPON, "Wy+"));
    expect(m.partes).toHaveLength(2);
    expect(m.momento).toBeCloseTo(m.partes.reduce((a, p) => a + p.fuerza * p.zBar, 0), 6);
    expect(m.fuerza).toBeCloseTo(m.partes.reduce((a, p) => a + p.fuerza, 0), 6);
  });

  // El baricentro conjunto queda ENTRE los dos, y más cerca del de pared porque paga casi
  // el doble de presión. Si se hubiera pesado por área y no por fuerza, no sería así.
  it('el baricentro conjunto se pesa por FUERZA, no por área', () => {
    const m = cargaMinima(mk(GALPON, "Wy+"));
    const porArea = (m.areaPared * m.zBarPared + m.areaCubierta * m.zBarCubierta)
      / (m.areaPared + m.areaCubierta);
    expect(m.zBar).toBeLessThan(porArea);
    expect(m.zBar).toBeGreaterThan(m.zBarPared);
    expect(m.zBar).toBeLessThan(m.zBarCubierta);
  });

  it('con cubierta plana el baricentro es el de la pared sola', () => {
    const m = cargaMinima(mk(GEOS[2][1], "Wy+"));
    expect(m.areaCubierta).toBe(0);
    expect(m.zBar).toBeCloseTo(m.zBarPared, 9);
    expect(m.zBar).toBeCloseTo(6 / 2, 9);          // rectángulo de 6 m
  });

  it('en el hastial el baricentro sube por encima de la mitad del alero', () => {
    // Viento paralelo a la cumbrera: la pared es el hastial y la cubierta no agrega.
    const m = cargaMinima(mk(GALPON, "Wx+"));
    expect(m.areaCubierta).toBeCloseTo(0, 9);
    expect(m.zBarPared).toBeGreaterThan(3);
  });

  it('en edificio abierto es una sola parte, sobre A_f', () => {
    const m = cargaMinima(mk(GALPON, "Wy+", "abierto"));
    expect(m.partes).toHaveLength(1);
    expect(m.partes[0].presion).toBe(MINIMOS.abierto);
    expect(m.momento).toBeCloseTo(m.fuerza * m.zBar, 6);
  });
});
