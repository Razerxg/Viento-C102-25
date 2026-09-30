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
import { normalizarGeo, DIRECCIONES, analizarDireccion } from '../src/engine/edificio.js';
import { aporteCubierta } from '../src/engine/resultantes.js';
import { CP_VOLADIZO_INFERIOR } from '../src/constants/presionesExternas.js';
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

  it('⚠ NORMALIZAR DOS VECES DA LO MISMO', () => {
    // `normalizarGeo` se llama sobre una geometría YA normalizada en más de un camino:
    // `analizarDireccion` lo hace con lo que recibe, venga del formulario o de otro
    // análisis. Un voladizo ya normalizado trae `grupos` como ARREGLO y no como objeto
    // por id; leyéndolo como objeto, los cuatro vuelos se iban a cero y el voladizo
    // desaparecía en silencio: el edificio se calculaba sin él y nada lo decía.
    const una = normalizarGeo({ a: "20", b: "30", hAlero: "6", theta: "15",
      tipo: "dos_aguas", cumbrera: "X",
      voladizo: { modo: "simetrico", grupos: { aleros: "1", hastiales: "0.5" } } });
    const dos = normalizarGeo(una);
    expect(dos.voladizo.porBorde).toEqual(una.voladizo.porBorde);
    expect(dos.voladizo.hay).toBe(true);
    expect(normalizarGeo(dos).voladizo.porBorde).toEqual(una.voladizo.porBorde);
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

// ═══════════════════════════════════════════════════════════════════════════════
// CAPÍTULO 2 — ART. 2.4.4
// ═══════════════════════════════════════════════════════════════════════════════

const SITIO = { exposicion: "C", V: 45, altitud: 0, kd: 0.85, Kzt: 1, puntosPerfil: 10 };
const CERR = { gcpi: 0.18, RiAplicado: 1 };
const dirDe = (id) => DIRECCIONES.find(d => d.id === id);
/** El análisis del capítulo 2 en una dirección. `analizar` ya es el del capítulo 5. */
const cap2 = (geo, dir = dirDe("Wx+")) => analizarDireccion(
  { geo, sitio: SITIO, cerramiento: CERR, G: 0.85, modoG: "defecto" }, dir);

describe('Art. 2.4.4 — la cara inferior del voladizo a barlovento', () => {
  const base = { a: "20", b: "30", hAlero: "6", theta: "0", tipo: "plana", cumbrera: "X" };
  const conVueloX = conVuelo(base,
    { modo: "porLado", porBorde: { "-X": "1.2", "+X": "0.8", "-Y": "0", "+Y": "0" } });

  it('aparece como superficie propia, con C_p = +0,8', () => {
    const r = cap2(conVueloX);
    const inf = r.superficies.find(s => s.id === "voladizo_inferior");
    expect(inf).toBeTruthy();
    expect(inf.cp).toBe(CP_VOLADIZO_INFERIOR);
    expect(inf.cp).toBe(0.8);
    expect(inf.cpRef).toMatch(/2\.4\.4/);
  });

  it('usa q_h, la misma que la cara superior de cubierta', () => {
    // El artículo no lo dice: lo definió el proyectista. En cubierta inclinada es además
    // lo conservador, porque h > h_alero.
    const r = cap2(conVueloX);
    const inf = r.superficies.find(s => s.id === "voladizo_inferior");
    expect(inf.usar).toBe("qh");
    expect(inf.q).toBe(r.qh);
  });

  it('el factor de ráfaga multiplica, como en toda la Fig. 2.4-1', () => {
    // Si las dos caras se suman, tienen que estar en las mismas unidades.
    const r = cap2(conVueloX);
    const inf = r.superficies.find(s => s.id === "voladizo_inferior");
    expect(inf.externa).toBeCloseTo(r.qh * r.G * 0.8, 6);
  });

  it('⚠ SÓLO EN EL BORDE A BARLOVENTO, y cuál es depende de la dirección', () => {
    // Con viento según +X la cara que el viento golpea primero es la que mira a −X, que
    // acá tiene 1,2 m de vuelo. Con viento según −X, el de barlovento es el de +X.
    const wxp = cap2(conVueloX, dirDe("Wx+"));
    expect(wxp.superficies.find(s => s.id === "voladizo_inferior").voladizo.vuelo).toBe(1.2);
    const wxn = cap2(conVueloX, dirDe("Wx-"));
    expect(wxn.superficies.find(s => s.id === "voladizo_inferior").voladizo.vuelo).toBe(0.8);
  });

  it('sobre el eje sin vuelo NO aparece la superficie', () => {
    // Agregarla con área cero llenaría la tabla de resultados de renglones en cero.
    const wyp = cap2(conVueloX, dirDe("Wy+"));
    expect(wyp.superficies.find(s => s.id === "voladizo_inferior")).toBeUndefined();
  });

  it('⚠ LA CARA INFERIOR NO ES UNA SUPERFICIE DE CUBIERTA', () => {
    // Media docena de consumidores filtran por `tipo === "cubierta"` para quedarse con
    // los faldones: la integración de las resultantes, el croquis de elevación, la vista
    // 3D y la exportación. Con el tipo de cubierta, la cara inferior entraba en el reparto
    // de franjas como si fuera un faldón que cubre toda la planta —640 m² donde el
    // voladizo tiene 32— y daba vuelta el signo del levantamiento.
    const r = cap2(conVueloX);
    expect(r.superficies.find(s => s.id === "voladizo_inferior").tipo).toBe("voladizo");
    const cubiertas = r.superficies.filter(s => s.tipo === "cubierta");
    expect(cubiertas.some(s => s.id === "voladizo_inferior")).toBe(false);
  });

  it('sin voladizo declarado no existe', () => {
    const r = cap2(normalizarGeo(base));
    expect(r.superficies.find(s => s.id === "voladizo_inferior")).toBeUndefined();
    expect(r.voladizo).toBeNull();
  });
});

describe('El voladizo en las resultantes: más levantamiento y más vuelco', () => {
  const base = { a: "20", b: "30", hAlero: "6", theta: "0", tipo: "plana", cumbrera: "X" };
  const sin = cap2(normalizarGeo(base));
  const con = cap2(conVuelo(base, { modo: "simetrico", grupos: { perimetral: "1" } }));

  it('el área de cubierta crece con el anillo del vuelo', () => {
    const a = (r) => aporteCubierta({ analisis: r }).partes
      .filter(p => !p.caraInferior).reduce((t, p) => t + p.areaProy, 0);
    // Anillo de 1 m alrededor de 20 × 30: 704 − 600 = 104 m².
    expect(a(con) - a(sin)).toBeCloseTo(104, 6);
  });

  it('el levantamiento crece, y crece MÁS que en proporción al área', () => {
    // ⚠ Es el punto del artículo. La cara superior del voladizo succiona como el resto de
    // la cubierta, y ADEMÁS la inferior del de barlovento recibe presión positiva que
    // empuja hacia arriba. Si el signo de esa cara estuviera al revés, el levantamiento
    // crecería MENOS que el área y este test lo diría.
    const V = (r) => aporteCubierta({ analisis: r }).V;
    expect(V(con)).toBeGreaterThan(V(sin));
    const areaSin = aporteCubierta({ analisis: sin }).partes
      .reduce((t, p) => t + p.areaProy, 0);
    expect(V(con) / V(sin)).toBeGreaterThan((areaSin + 104) / areaSin);
  });

  it('la cara inferior entra con el signo que LEVANTA', () => {
    const r = aporteCubierta({ analisis: con });
    const inf = r.partes.find(p => p.caraInferior);
    expect(inf).toBeTruthy();
    expect(inf.p).toBeGreaterThan(0);        // presión positiva: empuja la cara de abajo
    expect(inf.vertical).toBeGreaterThan(0); // y el aporte vertical levanta
  });

  it('la cara inferior NO aporta corte', () => {
    // Es una fuerza normal a una superficie casi horizontal; su componente horizontal ya
    // está contada en la cara de arriba a través de la pendiente.
    const r = aporteCubierta({ analisis: con });
    expect(r.partes.find(p => p.caraInferior).horizontal).toBe(0);
  });

  it('⚠ EL BRAZO DEL VOLADIZO CAE FUERA DE LA LÍNEA DE PARED', () => {
    // Es lo que hace que un metro cuadrado de cubierta afuera aporte más al vuelco que el
    // mismo metro cuadrado adentro. La franja de barlovento va de −1 a 0.
    const r = aporteCubierta({ analisis: con });
    const bar = r.partes.find(p => p.desde < 0 && !p.caraInferior);
    expect(bar).toBeTruthy();
    expect(bar.desde).toBe(-1);
    expect(bar.hasta).toBe(0);
    const sot = r.partes.find(p => p.hasta > con.L);
    expect(sot.desde).toBe(con.L);
  });

  it('el punto de aplicación se corre hacia barlovento', () => {
    // El voladizo de barlovento suma su propia cara inferior, que el de sotavento no
    // tiene: el centro de la resultante vertical se corre hacia el viento.
    const xSin = aporteCubierta({ analisis: sin }).xV;
    const xCon = aporteCubierta({ analisis: con }).xV;
    expect(xCon).toBeLessThan(xSin);
  });

  it('los vuelos laterales ensanchan las franjas, no agregan una parte suelta', () => {
    // Una franja de cubierta con vuelo lateral mide B más los dos vuelos: partirla en
    // tres duplicaría los rótulos y no cambiaría un número.
    const soloLat = cap2(conVuelo(base,
      { modo: "porLado", porBorde: { "-X": "0", "+X": "0", "-Y": "1", "+Y": "1" } }));
    const r = aporteCubierta({ analisis: soloLat });
    expect(r.partes.every(p => p.desde >= 0 && p.hasta <= soloLat.L + 1e-9)).toBe(true);
    const anchoEfectivo = r.partes[0].areaProy / (r.partes[0].hasta - r.partes[0].desde);
    expect(anchoEfectivo).toBeCloseTo(soloLat.B + 2, 6);
  });
});
