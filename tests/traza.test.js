// EL MODELO DE TRAZA — uno solo para el panel, la memoria y el Word.
import { describe, it, expect } from 'vitest';
import { paso, bloque, valorDe, puntosDe, desdeTrazaVieja, SIM, con } from '../src/lib/traza.js';
import { consolidar, trazaDelMotor } from '../src/lib/consolidar.js';
import { analizarDireccion, DIRECCIONES, normalizarGeo } from '../src/engine/edificio.js';
import { resultantes } from '../src/engine/resultantes.js';
import { estadosDeCarga, envolventeCritica } from '../src/engine/envolvente.js';
import { factorRafaga, dimensionesDe } from '../src/engine/factorRafaga.js';
import { resolverV } from '../src/engine/velocidad.js';
import { kzt } from '../src/engine/topografia.js';
import { clasificar, regionDetritus } from '../src/engine/cerramiento.js';
import { riAplicado, gcpiDe } from '../src/constants/presionInterna.js';
import { U, unidades, PERFILES } from '../src/lib/unidades.js';
import { analizarCyR } from '../src/engine/cyrPresiones.js';

// ── UN CASO COMPLETO, ARMADO COMO LO ARMA EL CONTEXTO ──────────────────────────
const GEO = { a: "20", b: "30", hAlero: "6", theta: "25", tipo: "dos_aguas", cumbrera: "Y" };
const geoN = normalizarGeo(GEO);
const vel = resolverV({ origen: "tabla", ciudad: "Buenos Aires", riesgo: "II" });
const sitio = { V: vel.V, vel, exposicion: "C", kd: 0.85, Kzt: 1, topo: null,
  altitud: 0, usarKe: true, puntosPerfil: 6 };
const topo = kzt({ z_m: geoN.h });
const cerrCalc = clasificar({ geo: geoN, aberturas: [], riesgo: "II",
  detritus: regionDetritus({ ciudad: "Buenos Aires", riesgo: "II" }) });
const cerr = { ...cerrCalc, label: "Cerrado", modo: "calculado", efectiva: "cerrado",
  gcpiTabla: gcpiDe("cerrado"), gcpi: gcpiDe("cerrado"), modoRi: "uno",
  RiAplicado: riAplicado({ modo: "uno", calculado: cerrCalc.Ri }),
  detritus: regionDetritus({ ciudad: "Buenos Aires", riesgo: "II" }) };
const rafaga = factorRafaga({ h: geoN.h, ...dimensionesDe(geoN, DIRECCIONES[0]),
  exposicion: "C", V: vel.V });
const G = 0.85;
const ENT = { geo: GEO, sitio, cerramiento: "cerrado", G, gcpi: cerr.gcpi,
  ri: { modo: "uno", calculado: cerrCalc.Ri, aplicado: 1 } };
const act = analizarDireccion(ENT, DIRECCIONES[0]);
const res = resultantes(act);
const envCasos = envolventeCritica(estadosDeCarga({ analizar: analizarDireccion,
  entrada: ENT }));
const TRAZA = consolidar({ vel, sitio, topo, geoN, cerr, rafaga, G, modoG: "defecto",
  act, res, envCasos, U, d: {} });

describe('la forma de un paso', () => {
  // Normalizar en `paso()` y no en cada productor es lo que permite que los tres
  // renderizadores confíen en que `donde` es un arreglo: si cada origen decidiera por su
  // cuenta, uno que devolviera `null` rompería una sola de las tres salidas.
  it('rellena los huecos, así ningún renderizador tiene que defenderse', () => {
    const p = paso({ id: "x", titulo: "Algo" });
    expect(p.donde).toEqual([]);
    expect(p.art).toBe("");
    expect(p.valor).toBe(null);
    expect(p.puntos).toBe(null);
    expect(p.tono).toBe("info");
    expect(p.dec).toBe(2);
  });

  it('el valor se escribe en un solo lugar', () => {
    expect(valorDe(paso({ id: "a", titulo: "t", valor: 1224.45, unidad: "kN·m", dec: 1 })))
      .toBe("1224,5 kN·m");
    expect(valorDe(paso({ id: "a", titulo: "t", texto: "no corresponde" })))
      .toBe("no corresponde");
    expect(valorDe(paso({ id: "a", titulo: "t" }))).toBe("—");
    // Coma decimal, siempre: el punto queda para el dato.
    expect(valorDe(paso({ id: "a", titulo: "t", valor: 0.85, dec: 3 }))).toBe("0,850");
  });

  it('los puntos de tabla se escriben como se leen con la norma al lado', () => {
    expect(puntosDe(paso({ id: "a", titulo: "t" }))).toBe(null);
    expect(puntosDe(paso({ id: "a", titulo: "t", puntos: [{ x: 2, y: -0.3 }] })))
      .toMatch(/Punto de tabla/);
    const dos = puntosDe(paso({ id: "a", titulo: "t",
      puntos: [{ x: 1, y: -0.5 }, { x: 2, y: -0.3 }] }));
    expect(dos).toMatch(/Interpolado entre/);
    expect(dos).toContain("−0,500".replace("−", "-"));
  });

  it('un bloque descarta los pasos vacíos', () => {
    const b = bloque({ id: "b", titulo: "T", pasos: [paso({ id: "a", titulo: "A" }), null] });
    expect(b.pasos).toHaveLength(1);
  });
});

describe('el diccionario de símbolos', () => {
  // Un diccionario y no una cadena escrita en cada paso: el mismo K_zt aparece en la
  // presión dinámica, en el perfil de la pared y en la memoria, y con tres descripciones
  // distintas el lector no sabe si son tres cosas.
  it('cada símbolo trae su descripción, y las referencias citan el reglamento', () => {
    for (const [k, v] of Object.entries(SIM)) {
      expect(v.sim, k).toBeTruthy();
      expect(v.desc.length, k).toBeGreaterThan(10);
      if (v.ref) expect(v.ref, k).toMatch(/Art\.|Tabla|Figura|Expresión/);
    }
  });

  it('`con` le pega el valor de este caso sin tocar el diccionario', () => {
    const x = con("Kzt", 1.23);
    expect(x.sim).toBe("K_zt");
    expect(x.valor).toBe(1.23);
    expect(SIM.Kzt.valor).toBeUndefined();
  });
});

describe('el adaptador de la traza vieja', () => {
  // `edificio.js` y los módulos del capítulo 4 ya están probados contra el reglamento:
  // se adaptan en vez de reescribirlos.
  it('convierte sin perder el artículo ni el valor', () => {
    const p = desdeTrazaVieja({ paso: "Velocidad básica", simbolo: "V", valor: 55.1,
      unidad: "m/s", dec: 1, ref: "Art. 1.5", detalle: "Ráfaga de 3 s." }, "m_");
    expect(p.titulo).toBe("Velocidad básica");
    expect(p.art).toBe("Art. 1.5");
    expect(valorDe(p)).toBe("55,1 m/s");
    // ⚠ EL `detalle` VIEJO NO ES UN «donde:»: es prosa, y va como nota.
    expect(p.nota).toBe("Ráfaga de 3 s.");
    expect(p.donde).toEqual([{ sim: "V", desc: "Velocidad básica" }]);
  });

  it('un paso sin valor numérico no inventa uno', () => {
    const p = desdeTrazaVieja({ paso: "Tratamiento", valor: null, texto: "faldones",
      ref: "Figura 2.4-1" });
    expect(p.valor).toBe(null);
    expect(valorDe(p)).toBe("faldones");
  });
});

describe('la traza consolidada', () => {
  // ⚠ LA PRESIÓN DINÁMICA Y LOS COEFICIENTES SON DOS BLOQUES, NO UNO. La memoria los
  // pide como capítulos separados —11 y 12—, y un bloque que se parte en dos capítulos
  // obligaría al renderizador a saber dónde cortarlo.
  it('cubre los siete bloques, en el orden del cálculo', () => {
    expect(TRAZA.map(b => b.id)).toEqual(["velocidad", "sitio", "cerramiento", "rafaga",
      "dinamica", "coeficientes", "resultantes"]);
  });

  it('todo paso tiene título, artículo y algo que mostrar', () => {
    for (const b of TRAZA) {
      expect(b.pasos.length, b.id).toBeGreaterThan(0);
      for (const p of b.pasos) {
        expect(p.titulo.length, `${b.id}/${p.id}`).toBeGreaterThan(3);
        expect(p.art, `${b.id}/${p.id}`).toMatch(/Art\.|Tabla|Figura|Expresi|Dirección/);
        expect(valorDe(p), `${b.id}/${p.id}`).not.toBe("");
      }
    }
  });

  // ⚠ ES LA CONDICIÓN QUE HACE ÚTIL AL «donde:». Una fórmula con seis símbolos y tres
  // explicados es una fórmula que hay que ir a buscar a otro lado.
  it('toda fórmula declara TODOS sus símbolos', () => {
    // Los símbolos se escriben en la fórmula tal como los nombra el «donde:».
    for (const b of TRAZA) for (const p of b.pasos) {
      if (!p.formula) continue;
      expect(p.donde.length, `${b.id}/${p.id}`).toBeGreaterThan(0);
      // Cada entrada del «donde:» aparece en la fórmula, o la fórmula la usa por su
      // nombre alterno; lo que no puede pasar es que el «donde:» esté vacío.
      const declarados = p.donde.map(x => x.sim).join(" ");
      expect(declarados.length, `${b.id}/${p.id}`).toBeGreaterThan(0);
    }
  });

  it('los identificadores no se repiten: se usan como key al renderizar', () => {
    const ids = TRAZA.flatMap(b => b.pasos.map(p => `${b.id}/${p.id}`));
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(TRAZA.map(b => b.id)).size).toBe(TRAZA.length);
  });

  it('el valor que informa es el que calculó el motor, no uno recalculado', () => {
    const buscar = (b, p) => TRAZA.find(x => x.id === b).pasos.find(x => x.id === p);
    expect(buscar("velocidad", "V").valor).toBe(vel.V);
    expect(buscar("sitio", "h").valor).toBe(geoN.h);
    expect(buscar("rafaga", "G").valor).toBe(G);
    // La presión dinámica sale convertida al perfil de unidades que se le pasa: acá el
    // de pantalla, que trabaja en N/m², así que coincide con el valor interno.
    expect(buscar("dinamica", "qh").valor).toBe(U.val.presion(act.qh));
    expect(buscar("cerramiento", "Ri").valor).toBe(cerr.RiAplicado);
  });

  it('la envolvente informa la combinación que gobierna cada magnitud', () => {
    const b = TRAZA.find(x => x.id === "resultantes");
    for (const id of ["Vtot", "Up", "Mv", "MT"]) {
      const p = b.pasos.find(x => x.id === id);
      expect(p, id).toBeDefined();
      expect(p.nota, id).toMatch(/caso \d/);
    }
    expect(b.pasos.find(x => x.id === "barrido").texto)
      .toBe(String(envCasos.estados.length));
  });

  it('el R_i no aplicado se informa igual', () => {
    const p = TRAZA.find(b => b.id === "cerramiento").pasos.find(x => x.id === "Ri");
    // En un edificio cerrado la expresión no interviene, y eso se dice en vez de informar
    // un 1,0 pelado que parecería un resultado.
    expect(p.nota).toMatch(/no interviene|NO aplicado/);
  });

  it('marca con aviso lo que descansa en una hipótesis', () => {
    const flex = factorRafaga({ h: geoN.h, ...dimensionesDe(geoN, DIRECCIONES[0]),
      exposicion: "C", V: vel.V, n1: 0.5, beta: 0.02 });
    const t = consolidar({ vel, sitio, topo, geoN, cerr, rafaga: flex, G: 0.85,
      modoG: "defecto", act, res, envCasos, U, d: {} });
    const g = t.find(b => b.id === "rafaga").pasos.find(x => x.id === "G");
    expect(g.tono).toBe("error");
  });

  it('sin casos torsionales lo dice, en vez de informar M_T = 0', () => {
    const exento = envolventeCritica(estadosDeCarga({ analizar: analizarDireccion,
      entrada: ENT, opc: { exentoArt247: true } }));
    const t = consolidar({ vel, sitio, topo, geoN, cerr, rafaga, G, modoG: "defecto",
      act, res, envCasos: exento, U, d: {} });
    const p = t.find(b => b.id === "resultantes").pasos.find(x => x.id === "MT");
    expect(p.texto).toBe("no verificado");
    expect(p.tono).toBe("aviso");
    expect(p.nota).toMatch(/no se verificó/);
  });
});

describe('la traza del motor se conserva aparte', () => {
  // Son los pasos que el motor emite mientras calcula. Sirven para contrastar el árbol
  // consolidado contra lo que el motor realmente hizo.
  it('trae todos los pasos del análisis, adaptados', () => {
    const b = trazaDelMotor(act);
    expect(b.pasos.length).toBe(act.traza.length);
    expect(b.pasos.every(p => p.titulo && p.art !== undefined)).toBe(true);
  });

  it('los identificadores del motor no chocan con los del árbol consolidado', () => {
    const suyos = new Set(trazaDelMotor(act).pasos.map(p => p.id));
    const otros = new Set(TRAZA.flatMap(b => b.pasos.map(p => p.id)));
    for (const id of suyos) expect(otros.has(id), id).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EL BLOQUE DE COMPONENTES Y REVESTIMIENTOS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Traza de componentes y revestimientos', () => {
  const geo = normalizarGeo({ a: "20", b: "30", hAlero: "6", theta: "0", tipo: "plana",
    cumbrera: "X" });
  const cyr = analizarCyR({
    geo, V: 45, exposicion: "B", altitud: 0, kd: 0.85, kztDe: () => [1], gcpi: 0.18,
    elementos: [{ tipo: "correa", superficie: "cubierta", L: 6, s: 1.5, nombre: "C-1" }],
  });
  const cerrCyR = { gcpi: 0.18, RiAplicado: 1, modoRi: "uno", label: "Cerrado" };
  const Ud = unidades(PERFILES.datos);
  const arbol = consolidar({ vel, sitio, topo, geoN, cerr: cerrCyR, rafaga, G,
    modoG: "defecto", act, res, envCasos, U: Ud, d: {}, cyr, kdCyR: 0.85 });
  const bCyR = arbol.find(b => b.id === "cyr");

  it('el bloque existe y va ÚLTIMO, después de cerrar el SPRFV', () => {
    expect(bCyR).toBeTruthy();
    expect(arbol[arbol.length - 1].id).toBe("cyr");
  });

  it('sin figura aplicable el bloque no aparece, en vez de aparecer vacío', () => {
    const sinFig = analizarCyR({
      geo: normalizarGeo({ a: "20", b: "30", hAlero: "6", theta: "60",
        tipo: "dos_aguas" }),
      V: 45, exposicion: "B", kd: 0.85, kztDe: () => [1], gcpi: 0.18, elementos: [] });
    const a2 = consolidar({ vel, sitio, topo, geoN, cerr: cerrCyR, rafaga, G, modoG: "defecto",
      act, res, envCasos, U: Ud, d: {}, cyr: sinFig, kdCyR: 0.85 });
    expect(a2.find(b => b.id === "cyr")).toBeUndefined();
  });

  it('⚠ NO CALCULA: cada valor del bloque es idénticamente el del motor', () => {
    // Es la regla de todo el consolidador y acá importa el doble, porque el bloque tiene
    // que repetir presiones, áreas y coeficientes. Una cuenta hecha de nuevo sería una
    // segunda definición, y el día que las dos se separen la memoria informaría un número
    // que el cálculo nunca usó.
    const de = (id) => bCyR.pasos.find(x => x.id === id);
    expect(de("cyr_qh").valor).toBe(Ud.val.presion(cyr.qh));
    expect(de("cyr_h").valor).toBe(Ud.val.longitud(cyr.altura.valor));
    expect(de("cyr_min").valor).toBe(Ud.val.presion(800));
    expect(de("cyr_gcpi").valor).toBe(Math.abs(cerrCyR.gcpi));
    expect(de("cyr_A_C-1").valor).toBe(Ud.val.area(cyr.elementos[0].area.A));
    // Y las presiones de cada zona, dígito por dígito contra el motor.
    for (const z of cyr.elementos[0].zonas) {
      const p = de(`cyr_z_C-1_${z.zona}`);
      expect(p, `zona ${z.zona}`).toBeTruthy();
      expect(p.texto).toContain(Ud.val.presion(z.pPos).toFixed(3).replace(".", ","));
      expect(p.texto).toContain(Ud.val.presion(z.pNeg).toFixed(3).replace(".", ","));
    }
  });

  it('la fórmula, el «donde:» y el artículo están en cada paso que los necesita', () => {
    const qh = bCyR.pasos.find(x => x.id === "cyr_qh");
    expect(qh.formula).toContain("0,613");
    expect(qh.donde.map(x => x.sim)).toContain("K_zt");
    expect(qh.nota).toMatch(/TAMBIÉN en las paredes/);
    const p = bCyR.pasos.find(x => x.id === "cyr_p");
    expect(p.formula).toBe("p = q_h · [ (GC_p) − (GC_pi) ]");
    expect(p.art).toContain("5.3-1");
    for (const x of bCyR.pasos) expect(x.art, x.id).toBeTruthy();
  });

  it('dice cuándo gobierna el mínimo, y con qué presión sin él', () => {
    // Sin ese par, la traza mostraría 800 N/m² sin manera de saber si salió de la
    // expresión o del piso del art. 5.2.2.
    const flojo = analizarCyR({ geo, V: 20, exposicion: "B", kd: 0.85, kztDe: () => [1],
      gcpi: 0.18, elementos: [{ tipo: "correa", superficie: "cubierta", L: 6, s: 1.5,
        nombre: "C-1" }] });
    const b = consolidar({ vel, sitio, topo, geoN, cerr: cerrCyR, rafaga, G, modoG: "defecto",
      act, res, envCasos, U: Ud, d: {}, cyr: flojo, kdCyR: 0.85 }).find(x => x.id === "cyr");
    const z = b.pasos.find(x => x.id === "cyr_z_C-1_3");
    expect(z.nota).toMatch(/Gobierna el mínimo del art\. 5\.2\.2/);
    expect(z.nota).toMatch(/sin él/);
    expect(z.tono).toBe("aviso");
    expect(b.pasos.find(x => x.id === "cyr_min").tono).toBe("aviso");
  });

  it('la dimensión a aparece salvo en la 5.3-2A, que zonifica por h', () => {
    expect(bCyR.pasos.find(x => x.id === "cyr_zonas")).toBeTruthy();
    expect(bCyR.pasos.find(x => x.id === "cyr_a")).toBeUndefined();
    const conA = analizarCyR({
      geo: normalizarGeo({ a: "20", b: "30", hAlero: "6", theta: "15", tipo: "dos_aguas",
        cumbrera: "X" }),
      V: 45, exposicion: "B", kd: 0.85, kztDe: () => [1], gcpi: 0.18, elementos: [] });
    const b = consolidar({ vel, sitio, topo, geoN, cerr: cerrCyR, rafaga, G, modoG: "defecto",
      act, res, envCasos, U: Ud, d: {}, cyr: conA, kdCyR: 0.85 }).find(x => x.id === "cyr");
    expect(b.pasos.find(x => x.id === "cyr_a").valor).toBe(Ud.val.longitud(conA.a.a));
  });
});
