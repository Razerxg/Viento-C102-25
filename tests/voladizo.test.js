// VOLADIZOS DE CUBIERTA — art. 2.4.4 (SPRFV) y art. 5.7 (C&R).
//
// ── LO QUE ESTE ARCHIVO CUIDA ───────────────────────────────────────────────────
// Un voladizo toca tres cosas que es fácil mezclar, y las tres tienen un lado que parece
// razonable y es falso:
//
//   · NO cambia `h` ni el área de pared. La altura media se mide sobre la línea de pared
//     y el vuelo no levanta el edificio;
//   · SÍ cambia la planta que se zonifica en el capítulo 5, pero NO la dimensión que
//     define `a` —nota 7 de la Fig. 5.3-2A—: son dos cosas distintas en dos lugares
//     distintos, y usar la planta con vuelos para las dos agranda `a` y corre la zona 3
//     de esquina justo donde más succiona;
//   · cuál es el voladizo a BARLOVENTO depende de la dirección de viento, así que el
//     modelo no puede ser «un vuelo» sino cuatro, uno por borde.
import { describe, it, expect } from 'vitest';
import {
  BORDES, normalizarVoladizo, gruposDe, plantaDeCubierta, vueloABarlovento,
  aporteDeVoladizo,
} from '../src/engine/voladizo.js';
import { normalizarGeo, DIRECCIONES } from '../src/engine/edificio.js';
import { analizarCyR } from '../src/engine/cyrPresiones.js';
import { UBICACION } from '../src/constants/cyrCurvas.js';
import { geometria } from '../src/lib/memoriaCapitulos.js';

const conVuelo = (g, voladizo) => normalizarGeo({ ...g, voladizo });

// ═══════════════════════════════════════════════════════════════════════════════
// EL MODELO: CUATRO BORDES, AGRUPADOS SEGÚN EL TIPO DE CUBIERTA
// ═══════════════════════════════════════════════════════════════════════════════

describe('Los grupos de bordes siguen al tipo de cubierta', () => {
  it('plana y cuatro aguas: vuelo perimetral, un solo número', () => {
    for (const tipo of ["plana", "cuatro_aguas"]) {
      const g = gruposDe({ tipo, cumbrera: "X", pendienteHacia: "+Y" });
      expect(g, tipo).toHaveLength(1);
      expect(g[0].bordes.sort(), tipo).toEqual([...BORDES].sort());
    }
  });

  it('dos aguas: los aleros son los bordes NORMALES a la cumbrera', () => {
    // ⚠ Es la confusión clásica. Con la cumbrera según X, el agua cae hacia ±Y: los
    // aleros son los bordes de Y y los hastiales los de X. Al revés, el vuelo declarado
    // «en aleros» terminaría en los frontones.
    const conX = gruposDe({ tipo: "dos_aguas", cumbrera: "X", pendienteHacia: "+Y" });
    expect(conX.find(x => x.id === "aleros").bordes).toEqual(["+Y", "-Y"]);
    expect(conX.find(x => x.id === "hastiales").bordes).toEqual(["+X", "-X"]);

    const conY = gruposDe({ tipo: "dos_aguas", cumbrera: "Y", pendienteHacia: "+X" });
    expect(conY.find(x => x.id === "aleros").bordes).toEqual(["+X", "-X"]);
  });

  it('vertiente única: alero alto, alero bajo y los dos laterales', () => {
    // El alero BAJO es el borde al que llega la pendiente; el ALTO, el opuesto.
    const g = gruposDe({ tipo: "vertiente_unica", cumbrera: "Y", pendienteHacia: "+Y" });
    expect(g.find(x => x.id === "bajo").bordes).toEqual(["+Y"]);
    expect(g.find(x => x.id === "alto").bordes).toEqual(["-Y"]);
    expect(g.find(x => x.id === "laterales").bordes.sort()).toEqual(["+X", "-X"]);
  });
});

describe('normalizarVoladizo', () => {
  const geo = { tipo: "dos_aguas", cumbrera: "X", pendienteHacia: "+Y" };

  it('sin nada declarado, no hay voladizo y los cuatro vuelos son cero', () => {
    const v = normalizarVoladizo(undefined, geo);
    expect(v.hay).toBe(false);
    for (const b of BORDES) expect(v.porBorde[b]).toBe(0);
  });

  it('simétrico: el número del grupo se reparte a sus bordes', () => {
    const v = normalizarVoladizo(
      { modo: "simetrico", grupos: { aleros: "0.8", hastiales: "0.4" } }, geo);
    expect(v.hay).toBe(true);
    expect(v.porBorde["+Y"]).toBe(0.8);
    expect(v.porBorde["-Y"]).toBe(0.8);
    expect(v.porBorde["+X"]).toBe(0.4);
    expect(v.porBorde["-X"]).toBe(0.4);
  });

  it('por lado: cada borde va por su cuenta', () => {
    const v = normalizarVoladizo(
      { modo: "porLado", porBorde: { "+X": "1", "-X": "0", "+Y": "0.5", "-Y": "2" } }, geo);
    expect(v.porBorde).toEqual({ "+X": 1, "-X": 0, "+Y": 0.5, "-Y": 2 });
  });

  it('un vuelo negativo no existe: se recorta a cero', () => {
    const v = normalizarVoladizo({ modo: "porLado", porBorde: { "+X": "-3" } }, geo);
    expect(v.porBorde["+X"]).toBe(0);
    expect(v.hay).toBe(false);
  });

  it('acepta la coma decimal, como todos los campos del formulario', () => {
    const v = normalizarVoladizo({ modo: "simetrico", grupos: { aleros: "0,75" } }, geo);
    expect(v.porBorde["+Y"]).toBe(0.75);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LO QUE EL VOLADIZO CAMBIA Y LO QUE NO
// ═══════════════════════════════════════════════════════════════════════════════

describe('El voladizo no toca la altura ni la planta del edificio', () => {
  const base = { a: "20", b: "30", hAlero: "6", theta: "15", tipo: "dos_aguas", cumbrera: "X" };

  it('`a`, `b`, `h` y `hCumbre` son los mismos con y sin vuelo', () => {
    // ⚠ Es la tentación más directa y la más equivocada: sumar el vuelo a `b` para «tener
    // en cuenta» el voladizo. Con eso cambiarían el remonte, la altura media, el área de
    // las paredes y la relación h/L de las cuatro direcciones.
    const sin = normalizarGeo(base);
    const con = conVuelo(base, { modo: "simetrico", grupos: { aleros: "1.2", hastiales: "0.6" } });
    for (const k of ["a", "b", "h", "hAlero", "hCumbre", "theta"]) {
      expect(con[k], k).toBe(sin[k]);
    }
  });

  it('la planta de la CUBIERTA sí crece, y se sabe dónde empieza', () => {
    const geo = conVuelo(base, { modo: "porLado", porBorde: { "-X": "1", "+X": "2", "-Y": "0.5", "+Y": "0" } });
    const p = plantaDeCubierta(geo, geo.voladizo);
    expect(p.ancho).toBe(23);        // 20 + 1 + 2
    expect(p.largo).toBe(30.5);      // 30 + 0,5 + 0
    expect(p.x0).toBe(-1);
    expect(p.y0).toBe(-0.5);
  });
});

describe('El voladizo a barlovento depende de la dirección', () => {
  const geo = normalizarGeo({ a: "20", b: "30", hAlero: "6", theta: "0", tipo: "plana",
    voladizo: { modo: "porLado", porBorde: { "-X": "1.5", "+X": "0.5", "-Y": "0", "+Y": "0" } } });

  it('con viento según +X el borde a barlovento es el que mira a −X', () => {
    // ⚠ La cara que el viento golpea primero es la que mira CONTRA el viento: su normal
    // exterior apunta al viento. Es la convención de `fachadas.js`, y equivocarla pone la
    // presión positiva de la cara inferior en el borde de sotavento.
    const wxp = DIRECCIONES.find(d => d.id === "Wx+");
    expect(vueloABarlovento(geo.voladizo, wxp)).toBe(1.5);
    const wxn = DIRECCIONES.find(d => d.id === "Wx-");
    expect(vueloABarlovento(geo.voladizo, wxn)).toBe(0.5);
  });

  it('sobre el eje sin vuelo, no hay voladizo a barlovento', () => {
    const wyp = DIRECCIONES.find(d => d.id === "Wy+");
    expect(vueloABarlovento(geo.voladizo, wyp)).toBe(0);
  });
});

describe('El área y el brazo que aporta el voladizo', () => {
  const geo = normalizarGeo({ a: "20", b: "30", hAlero: "6", theta: "0", tipo: "plana",
    voladizo: { modo: "simetrico", grupos: { perimetral: "1" } } });
  const wxp = DIRECCIONES.find(d => d.id === "Wx+");

  it('cubre el anillo completo, sin contar dos veces las esquinas', () => {
    // Anillo de 1 m alrededor de 20 × 30: (22 × 32) − (20 × 30) = 704 − 600 = 104 m².
    const r = aporteDeVoladizo(geo, geo.voladizo, wxp);
    expect(r.area).toBeCloseTo(104, 9);
  });

  it('el brazo de cada franja está FUERA de la línea de pared', () => {
    // Es la razón de ser del brazo: un metro cuadrado de cubierta afuera aporta más al
    // vuelco que el mismo metro cuadrado adentro.
    const r = aporteDeVoladizo(geo, geo.voladizo, wxp);
    const bar = r.franjas.find(f => f.nombre === "barlovento");
    const sot = r.franjas.find(f => f.nombre === "sotavento");
    expect(Math.abs(bar.brazo)).toBeGreaterThan(geo.a / 2);
    expect(bar.brazo).toBeLessThan(0);          // barlovento, del lado negativo del eje
    expect(sot.brazo).toBeGreaterThan(geo.a / 2);
    // Las laterales corren paralelas al viento: su resultante pasa por el centro.
    for (const f of r.franjas.filter(x => x.nombre.startsWith("lateral"))) {
      expect(f.brazo).toBe(0);
    }
  });

  it('sin vuelo no aporta nada', () => {
    const sinVuelo = normalizarGeo({ a: "20", b: "30", hAlero: "6", theta: "0", tipo: "plana" });
    const r = aporteDeVoladizo(sinVuelo, sinVuelo.voladizo, wxp);
    expect(r.area).toBe(0);
    expect(r.franjas).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CAPÍTULO 5 — NOTA 7 Y ART. 5.7
// ═══════════════════════════════════════════════════════════════════════════════

const analizar = (geo, elementos = []) => analizarCyR({
  geo, V: 45, exposicion: "C", kd: 0.85, kztDe: () => [1], gcpi: 0.18, elementos });

describe('Nota 7 de la Fig. 5.3-2A — `a` con el edificio, medida desde el borde exterior', () => {
  const base = { a: "20", b: "30", hAlero: "6", theta: "0", tipo: "plana", cumbrera: "X" };

  it('`a` NO crece con el vuelo', () => {
    // «La dimensión horizontal menor del edificio no incluirá ninguna dimensión de
    // voladizo». Con 20 × 30 y h = 6: el 10 % de 20 es 2,0 contra 0,4·6 = 2,4 → gobierna
    // el 10 %. Sumando un vuelo de 1 m por lado, la menor pasaría a 22 y `a` a 2,2.
    const sin = analizar(normalizarGeo(base));
    const con = analizar(conVuelo(base, { modo: "simetrico", grupos: { perimetral: "1" } }));
    expect(sin.a.a).toBe(2);
    expect(con.a.a).toBe(2);
  });

  it('pero la planta que se zonifica sí incluye el vuelo', () => {
    // «…pero la distancia al borde, a, se medirá desde el borde exterior del voladizo».
    const con = analizar(conVuelo(base, { modo: "simetrico", grupos: { perimetral: "1" } }));
    expect(con.geoZonas.bx).toBe(22);
    expect(con.geoZonas.by).toBe(32);
  });

  it('y lo dice, en vez de cambiarlo en silencio', () => {
    const con = analizar(conVuelo(base, { modo: "simetrico", grupos: { perimetral: "1" } }));
    const aviso = con.avisos.find(a => a.ref === "Fig. 5.3-2A, nota 7");
    expect(aviso).toBeTruthy();
    expect(aviso.texto).toMatch(/sin los vuelos/);
  });
});

describe('Art. 5.7 — la composición de las dos caras', () => {
  const elem = (extra = {}) => ({ tipo: "correa", superficie: "cubierta",
    ubicacion: UBICACION.VOLADIZO, L: 5, s: 1.5, nombre: "V-1", ...extra });

  it('con θ ≤ 7° manda la curva de ALERO de la Fig. 5.3-2A, que ya trae las dos caras', () => {
    // Nota 6 de la figura: «Los valores de (GC_p) para los voladizos de cubierta incluyen
    // las contribuciones de presión de las superficies superior e inferior». Ahí no hay
    // nada que componer, y componer sería contarlas dos veces.
    const geo = conVuelo({ a: "20", b: "30", hAlero: "6", theta: "0", tipo: "plana" },
      { modo: "simetrico", grupos: { perimetral: "1" } });
    const r = analizar(geo, [elem()]).elementos[0];
    expect(r.fuente.figura).toBe("5.3-2A");
    // El aviso de composición NO aparece: no se compuso nada.
    for (const z of r.zonas) {
      expect((z.notas ?? []).some(n => n.ref === "art. 5.7"), z.zona).toBe(false);
    }
  });

  it('con θ > 7° se compone cubierta + pared adyacente, y las dos suman', () => {
    const geo = conVuelo({ a: "20", b: "30", hAlero: "6", theta: "15", tipo: "dos_aguas",
      cumbrera: "X" }, { modo: "simetrico", grupos: { aleros: "1" } });
    const an = analizar(geo, [elem(), elem({ ubicacion: undefined, nombre: "C-1" })]);
    const vol = an.elementos[0], cub = an.elementos[1];
    expect(an.figura).toBe("5.3-2B");

    for (const zv of vol.zonas) {
      const zc = cub.zonas.find(x => x.zona === zv.zona);
      // ⚠ EL VOLADIZO SIEMPRE ES MÁS EXIGIDO QUE LA MISMA ZONA DE CUBIERTA SOBRE EL
      // RECINTO. Las dos caras trabajan en el mismo sentido: el viento que empuja contra
      // la pared entra por debajo y levanta. Si algún día esto se invierte, alguien sumó
      // con el signo al revés.
      expect(zv.gcpNeg, `zona ${zv.zona}`).toBeLessThan(zc.gcpNeg);
      expect(zv.gcpPos, `zona ${zv.zona}`).toBeGreaterThan(zc.gcpPos);
      expect((zv.notas ?? []).some(n => n.ref === "art. 5.7"), zv.zona).toBe(true);
    }
  });

  it('la zona de ESQUINA de la cubierta va con la zona 5 de pared', () => {
    // «El (GC_p) para la superficie inferior, tomado igual a la zona de pared adyacente
    // según la Figura 5.3-1». La correspondencia es por posición en planta: la zona 3 de
    // cubierta y la 5 de pared son el mismo lugar del edificio.
    const geo = conVuelo({ a: "20", b: "30", hAlero: "6", theta: "15", tipo: "dos_aguas",
      cumbrera: "X" }, { modo: "simetrico", grupos: { aleros: "1" } });
    const r = analizar(geo, [elem()]).elementos[0];
    const z3 = r.zonas.find(z => z.zona === "3");
    const z1 = r.zonas.find(z => z.zona === "1");
    expect(z3.notas.find(n => n.ref === "art. 5.7").texto).toMatch(/zona 5 de pared/);
    expect(z1.notas.find(n => n.ref === "art. 5.7").texto).toMatch(/zona 4 de pared/);
  });
});

describe('Art. 5.7 — (GC_pi) = 0 cuando las dos caras no encierran un volumen', () => {
  const geo = conVuelo({ a: "20", b: "30", hAlero: "6", theta: "15", tipo: "dos_aguas",
    cumbrera: "X" }, { modo: "simetrico", grupos: { aleros: "1" } });
  const elem = (extra) => ({ tipo: "correa", superficie: "cubierta",
    ubicacion: UBICACION.VOLADIZO, L: 5, s: 1.5, nombre: "V-1", ...extra });

  it('por defecto SÍ hay presión interna: es lo conservador', () => {
    // El motor no puede deducir de la geometría si el voladizo tiene cielorraso. Es una
    // declaración del proyectista, y mientras no la haga se supone lo peor.
    const r = analizar(geo, [elem()]).elementos[0];
    expect(r.sinPresionInterna).toBe(false);
    expect(r.zonas[0].gcpiUsado.pos).toBeCloseTo(-0.18, 9);
  });

  it('declarado sin volumen interno, el (GC_pi) se va a cero', () => {
    const r = analizar(geo, [elem({ volumenInterno: false })]).elementos[0];
    expect(r.sinPresionInterna).toBe(true);
    expect(r.zonas[0].gcpiUsado).toEqual({ pos: -0, neg: 0 });
    expect(r.avisos.some(a => a.ref === "art. 5.7" && /sin volumen interno/i.test(a.texto)))
      .toBe(true);
  });

  it('sin presión interna la succión es MENOR: por eso el defecto es el otro', () => {
    const con = analizar(geo, [elem()]).elementos[0];
    const sin = analizar(geo, [elem({ volumenInterno: false })]).elementos[0];
    const peor = (r) => Math.min(...r.zonas.map(z => z.pNegCalculada));
    expect(peor(sin)).toBeGreaterThan(peor(con));
  });

  it('la declaración sólo vale para un VOLADIZO, no para cualquier elemento', () => {
    const r = analizar(geo, [elem({ ubicacion: undefined, volumenInterno: false })]).elementos[0];
    expect(r.sinPresionInterna).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LA TRAZA Y LA MEMORIA LO DICEN
// ═══════════════════════════════════════════════════════════════════════════════

describe('El voladizo queda escrito en la memoria y en la traza', () => {
  const geoN = conVuelo({ a: "20", b: "30", hAlero: "6", theta: "15", tipo: "dos_aguas",
    cumbrera: "X" }, { modo: "simetrico", grupos: { aleros: "1", hastiales: "0.5" } });

  it('la memoria informa los vuelos y la planta de cubierta', () => {
    const md = geometria({ geoN, act: { L: 30, B: 20, hL: 0.27 }, nFig: 1 });
    expect(md).toMatch(/Vuelo en aleros/);
    expect(md).toMatch(/Vuelo en hastiales/);
    expect(md).toMatch(/Planta de cubierta con el voladizo/);
    // La planta de cubierta va en mm, que es el perfil de la memoria: 21.000 × 32.000.
    expect(md).toMatch(/21\.000 × 32\.000/);
  });

  it('y dice lo que NO cambia, que es lo que se presta a error', () => {
    const md = geometria({ geoN, act: { L: 30, B: 20, hL: 0.27 }, nFig: 1 });
    expect(md).toMatch(/No modifica la altura media de cubierta/);
    expect(md).toMatch(/nota 7/);
  });

  it('sin voladizo no aparece ni el párrafo ni las filas', () => {
    // Un capítulo que habla de un voladizo que no existe es ruido en una memoria firmada.
    const sin = normalizarGeo({ a: "20", b: "30", hAlero: "6", theta: "15",
      tipo: "dos_aguas", cumbrera: "X" });
    const md = geometria({ geoN: sin, act: { L: 30, B: 20, hL: 0.27 }, nFig: 1 });
    expect(md).not.toMatch(/[Vv]oladizo/);
  });

  it('el croquis recibe la línea de pared dentro de la planta de cubierta', () => {
    // Es lo que hace que el dibujo explique por qué la distancia al borde se mide más
    // afuera que la dimensión que define `a`.
    const an = analizar(geoN);
    expect(an.voladizo.hay).toBe(true);
    expect(an.voladizo.pared).toEqual({ x: 0.5, y: 1, ancho: 20, largo: 30 });
  });
});
