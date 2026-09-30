// LAS REGLAS COMUNES DE DIBUJO.
//
// ── QUÉ SE PRUEBA ACÁ Y QUÉ NO ──────────────────────────────────────────────────
// Acá van las partes de las reglas que son CÁLCULO: medir un texto, decidir si una cota
// entra, elegir entre posiciones candidatas, agrupar regiones. Todas son funciones puras
// y se prueban como cualquier otra.
//
// Lo que NO se prueba acá es cómo queda el dibujo. Un `<text>` no tiene ancho hasta que un
// motor de texto lo mide con una fuente concreta, así que «este número quedó tachado» y
// «esta letra se lee a 8,6 px» sólo se pueden ver sobre el resultado renderizado: eso lo
// mide `scripts/qa-croquis.mjs` en Chromium, sobre las diez geometrías de la matriz.
//
// Los dos controles son complementarios y ninguno reemplaza al otro: éste corre en cada
// commit y explica POR QUÉ falla; el otro corre antes de una entrega y ve lo que este no
// puede ver.
import { describe, it, expect } from 'vitest';
import {
  TXT, anchoTexto, anchoEnLienzo, ubicar, candidatosAlrededor, escalaComun, mkView,
  escalaPorAncho, altoNecesario, ZOOMS,
} from '../src/components/svg/kit.jsx';
import { corto } from '../src/lib/formato.js';
import { unidades, PERFILES } from '../src/lib/unidades.js';
import { m, q, coef, EJE, cotaEje, pared } from '../src/components/svg/formatoCroquis.js';
import { LAYOUT, rotulosDeRegion, zonaEn, zonasPresentes } from '../src/engine/cyrZonas.js';
import { geometria } from '../src/lib/memoriaCapitulos.js';
import { normalizarGeo } from '../src/engine/edificio.js';

const GEO = normalizarGeo({ a: "7.5", b: "11", hAlero: "3", theta: "9",
  tipo: "dos_aguas", cumbrera: "Y" });

// ═══════════════════════════════════════════════════════════════════════════════
// LAS UNIDADES DEL CROQUIS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Un croquis acota en metros, sin ceros sobrantes', () => {
  it('`corto` no escribe ceros que no dicen nada', () => {
    // ⚠ NO ES `toFixed(2)`. Una planta de 11 × 7,5 se acotaba «11,00» y «7,50»: el ancho
    // de «11,00» es el 60 % más que el de «11», y un croquis con veinte cotas se llena de
    // ceros que empujan las etiquetas unas sobre otras.
    expect(corto(7.5)).toBe("7,5");
    expect(corto(11)).toBe("11");
    expect(corto(3.5912)).toBe("3,59");
    expect(corto(1)).toBe("1");
    expect(corto(0.24)).toBe("0,24");
  });

  it('el signo menos es el tipográfico, no el guión del teclado', () => {
    // En una cifra de croquis el guión se confunde con un trazo del dibujo.
    expect(corto(-1.69)).toBe("−1,69");
    expect(corto(-1.69)).not.toContain("-");
  });

  it('nunca inventa un número donde no hay dato', () => {
    expect(corto(null)).toBe("—");
    expect(corto(NaN)).toBe("—");
    expect(corto(Infinity)).toBe("—");
  });

  it('las longitudes salen en METROS y las presiones en kN/m²', () => {
    // El motor trabaja en N, m y N/m². La conversión la hace el perfil `croquis`, no el
    // croquis a mano: es la regla de `lib/unidades.js` para todo el repositorio.
    expect(m(7.5)).toBe("7,5");
    expect(m(11)).toBe("11");
    expect(q(1793)).toBe("1,79");
    expect(q(-1694)).toBe("−1,69");
    expect(coef(-0.9)).toBe("−0,9");
    expect(coef(0.6842)).toBe("0,68");
  });

  it('el perfil de croquis existe y no es el de la memoria', () => {
    // La memoria acota en milímetros, que es donde el número se transcribe a un plano. El
    // croquis de pantalla se mira: «11.000» con punto de miles se lee como once.
    expect(PERFILES.croquis.longitud).toBe("m");
    expect(PERFILES.croquis.presion).toBe("kN/m²");
    expect(PERFILES.memoria.longitud).toBe("mm");
    const Um = unidades(PERFILES.memoria);
    expect(Um.val.longitud(11)).toBe(11000);
  });
});

describe('Las dimensiones de planta se llaman X e Y, nunca a ni b', () => {
  it('la notación es la de la Fig. 2.4-8', () => {
    // ⚠ EN EL CAPÍTULO 5 `a` ES EL ANCHO DE ZONA, y se acota en el mismo croquis. Llamar
    // `a` también al lado de la planta pone dos magnitudes distintas bajo la misma letra
    // en la misma figura: el proyectista leía «a = 7,50 m» al lado de «a = 1.000».
    expect(EJE.X).toBe("B_X");
    expect(EJE.Y).toBe("B_Y");
    expect(cotaEje("X", 7.5)).toBe("B_X = 7,5");
    expect(cotaEje("Y", 11)).toBe("B_Y = 11");
    expect(cotaEje("X", 7.5)).not.toMatch(/^a /);
  });

  it('una pared se nombra por la cara que mira', () => {
    // «La pared larga» no alcanza cuando hay que llevar el croquis a un plano.
    expect(pared("X", 1)).toBe("Pared +X");
    expect(pared("Y", -1)).toBe("Pared −Y");
  });

  it('la memoria usa la misma notación que el croquis', () => {
    // El pedido es explícito: croquis, tablas y memoria, los tres. Si la memoria dijera
    // «a» y el croquis «B_X», el lector tendría que adivinar que son lo mismo —y en el
    // capítulo de componentes se encontraría con OTRA `a`, que no lo es—.
    const md = geometria({ geoN: GEO, act: { L: 11, B: 7.5, hL: 0.33 }, nFig: 1 });
    expect(md).toContain("B_X");
    expect(md).toContain("B_Y");
    expect(md).not.toMatch(/^\| Dimensión en planta según X \| a \|/m);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EL TEXTO NO ESCALA CON EL DIBUJO
// ═══════════════════════════════════════════════════════════════════════════════

describe('Medición de texto', () => {
  it('mide más un texto más largo, y es monótona', () => {
    // En jsdom no hay canvas y se usa el respaldo por cantidad de letras. Lo que el test
    // puede exigir en los dos entornos es la monotonía, que es de lo que depende la
    // decisión de si una cota entra.
    expect(anchoTexto("11", 11)).toBeLessThan(anchoTexto("11.000", 11));
    expect(anchoTexto("a = 1", 11)).toBeLessThan(anchoTexto("a = 1,25 m", 11));
    expect(anchoTexto("11", 22)).toBeGreaterThan(anchoTexto("11", 11));
  });

  it('el ancho en el lienzo escala con `k`', () => {
    // `k` son unidades de viewBox por píxel: un croquis dibujado más chico en pantalla
    // necesita MÁS unidades de viewBox para el mismo texto de 11 px.
    const a1 = anchoEnLienzo("1,79 kN/m²", TXT.min, 1);
    const a2 = anchoEnLienzo("1,79 kN/m²", TXT.min, 2);
    expect(a2 / a1).toBeCloseTo(2, 6);
  });

  it('nunca devuelve menos que el mínimo de tamaño', () => {
    // El piso de 11 px se aplica en el kit y no en cada llamador: si se pide 8, se mide 11.
    expect(anchoEnLienzo("abc", 8, 1)).toBe(anchoEnLienzo("abc", TXT.min, 1));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LA ESCALA COMPARTIDA
// ═══════════════════════════════════════════════════════════════════════════════

describe('Dos vistas del mismo edificio comparten escala', () => {
  const planta = { ancho: 560, alto: 360, w: 7.5, h: 11, margen: 56 };
  const elevacion = { ancho: 400, alto: 360, w: 11, h: 3.6, margen: 44 };

  it('la común es la MÁS CHICA de las dos', () => {
    // Con la más grande, alguna vista se sale de su lienzo. Es la única elección que
    // deja las dos adentro.
    const e = escalaComun([planta, elevacion]);
    const sola = (v) => Math.min((v.ancho - 2 * v.margen) / v.w, (v.alto - 2 * v.margen) / v.h);
    expect(e).toBeLessThanOrEqual(sola(planta) + 1e-9);
    expect(e).toBeLessThanOrEqual(sola(elevacion) + 1e-9);
    expect(e).toBeCloseTo(Math.min(sola(planta), sola(elevacion)), 9);
  });

  it('con la escala fija las dos vistas dan los mismos píxeles por metro', () => {
    // Es exactamente lo que exige el control automático, dentro del 1 %.
    const e = escalaComun([planta, elevacion]);
    const v1 = mkView({ ...planta, xMin: 0, xMax: planta.w, yMin: 0, yMax: planta.h, escalaFija: e });
    const v2 = mkView({ ...elevacion, xMin: 0, xMax: elevacion.w, yMin: 0, yMax: elevacion.h, escalaFija: e });
    expect(v1.esc).toBeCloseTo(v2.esc, 9);
    expect(v1.l(3)).toBeCloseTo(v2.l(3), 9);
  });

  it('cada vista sigue cabiendo en su caja con la escala común', () => {
    const e = escalaComun([planta, elevacion]);
    for (const caja of [planta, elevacion]) {
      expect(caja.w * e).toBeLessThanOrEqual(caja.ancho - 2 * caja.margen + 1e-9);
      expect(caja.h * e).toBeLessThanOrEqual(caja.alto - 2 * caja.margen + 1e-9);
    }
  });

  it('`mkView` sigue invirtiendo el eje Y', () => {
    // +y es una ALTURA en el modelo y va hacia abajo en SVG. Si esto se rompe, algún
    // croquis sale dado vuelta y nada más lo nota.
    const v = mkView({ ancho: 200, alto: 200, xMin: 0, xMax: 10, yMin: 0, yMax: 10, margen: 10 });
    expect(v.y(10)).toBeLessThan(v.y(0));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LA UBICACIÓN DE RÓTULOS
// ═══════════════════════════════════════════════════════════════════════════════

describe('ubicar — prueba de posiciones contra lo ya ocupado', () => {
  const medida = { w: 20, h: 20 };

  it('con lugar libre gana el primer candidato, que es el preferido', () => {
    const r = ubicar(candidatosAlrededor(100, 100, 40, 40), [], medida);
    expect([r.x, r.y]).toEqual([100, 100]);
    expect(r.apretado).toBe(false);
  });

  it('con el preferido ocupado, se corre al siguiente', () => {
    const ocupado = [{ x: 100, y: 100, w: 20, h: 20 }];
    const r = ubicar(candidatosAlrededor(100, 100, 40, 40), ocupado, medida);
    expect([r.x, r.y]).not.toEqual([100, 100]);
    expect(r.apretado).toBe(false);
  });

  it('sin ningún lugar libre devuelve el último, marcado `apretado`', () => {
    // Se dibuja igual: un número mal puesto se corrige mirando y uno ausente no se nota.
    const cands = candidatosAlrededor(100, 100, 40, 40);
    const todos = cands.map(c => ({ ...c, w: 40, h: 40 }));
    const r = ubicar(cands, todos, medida);
    expect(r.apretado).toBe(true);
    expect([r.x, r.y]).toEqual([cands[cands.length - 1].x, cands[cands.length - 1].y]);
  });

  it('es PURA: el mismo llamado da el mismo resultado', () => {
    // ⚠ NO ES UN REGISTRO MUTABLE QUE SE LLENA DURANTE EL RENDER. Con eso, el resultado
    // dependería del orden en que React monte los hijos, y en modo estricto —que renderiza
    // dos veces— el mismo rótulo saldría en dos lugares distintos.
    const cands = candidatosAlrededor(50, 60, 30, 30);
    const ocup = [{ x: 50, y: 60, w: 20, h: 20 }];
    const a = ubicar(cands, ocup, medida);
    const b = ubicar(cands, ocup, medida);
    expect(a).toEqual(b);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// UN RÓTULO POR REGIÓN CONEXA
// ═══════════════════════════════════════════════════════════════════════════════

describe('rotulosDeRegion — como numeran las figuras del reglamento', () => {
  it('la cubierta plana tiene CUATRO esquinas de zona 3, no una', () => {
    // El croquis ponía un rótulo por ZONA: un solo ③ para cuatro esquinas idénticas y
    // tres franjas sin marcar. Las figuras numeran cada región.
    const geo = { layout: LAYOUT.PLANA_H, bx: 20, by: 30, h: 6 };
    const r = rotulosDeRegion(geo);
    expect(r.filter(x => x.zona === "3")).toHaveLength(4);
    expect(r.filter(x => x.zona === "2")).toHaveLength(1);   // la 2 es un anillo: UNA región
  });

  it('cuatro aguas: el perímetro es UN anillo y los faldones son cuatro', () => {
    // Acá se ve por qué las regiones salen de la clasificación y no de las piezas de
    // dibujo: el perímetro se pinta con cuatro rectángulos superpuestos y es una sola
    // región, y la banda de cumbrera y limatesas también.
    const geo = { layout: LAYOUT.CUATRO_AGUAS, bx: 20, by: 30, h: 6, a: 2, ejeCumbrera: "Y" };
    const r = rotulosDeRegion(geo);
    expect(r.filter(x => x.zona === "3")).toHaveLength(1);
    expect(r.filter(x => x.zona === "2")).toHaveLength(1);
    expect(r.filter(x => x.zona === "1")).toHaveLength(4);
  });

  it('cada punto de rótulo cae en su propia zona', () => {
    for (const geo of [
      { layout: LAYOUT.PLANA_H, bx: 20, by: 30, h: 6 },
      { layout: LAYOUT.DOS_AGUAS_CUMBRERA, bx: 20, by: 30, h: 6, a: 2, ejeCumbrera: "Y" },
      { layout: LAYOUT.CUATRO_AGUAS, bx: 20, by: 30, h: 6, a: 2, ejeCumbrera: "Y" },
      { layout: LAYOUT.UNA_AGUA_PRIMADA, bx: 20, by: 30, h: 6, a: 2, pendienteHacia: "+Y" },
      { layout: LAYOUT.UNA_AGUA, bx: 10, by: 20, h: 4, a: 1, pendienteHacia: "-X" },
    ]) {
      for (const r of rotulosDeRegion(geo)) {
        expect(zonaEn(r.x, r.y, geo), `${geo.layout} ${r.region}`).toBe(r.zona);
      }
    }
  });

  it('no se pierde ninguna zona, y no inventa ninguna', () => {
    for (const geo of [
      { layout: LAYOUT.PLANA_H, bx: 20, by: 30, h: 6 },
      { layout: LAYOUT.DOS_AGUAS_ESQUINAS, bx: 20, by: 30, h: 6, a: 2, ejeCumbrera: "Y" },
      { layout: LAYOUT.UNA_AGUA_PRIMADA, bx: 20, by: 30, h: 6, a: 2, pendienteHacia: "+Y" },
    ]) {
      const vistas = [...new Set(rotulosDeRegion(geo).map(r => r.zona))].sort();
      expect(vistas, geo.layout).toEqual([...zonasPresentes(geo)].sort());
    }
  });

  it('la clave de región es estable y única', () => {
    // El croquis la usa como `key` de React y el control automático la usa para parear
    // cada región con su número. Dos regiones con la misma clave dejarían una sin control.
    const geo = { layout: LAYOUT.PLANA_H, bx: 20, by: 30, h: 6 };
    const claves = rotulosDeRegion(geo).map(r => r.region);
    expect(new Set(claves).size).toBe(claves.length);
    expect(rotulosDeRegion(geo).map(r => r.region)).toEqual(claves);
    for (const k of claves) expect(k).toMatch(/^[0-9]'?#[0-9]+$/);
  });

  it('dos celdas adyacentes de la misma zona son UNA región', () => {
    // La grilla de corte parte celdas del mismo color a propósito, para no perderse
    // ninguna frontera. Si eso se viera en el dibujo, habría números repetidos sobre una
    // franja continua.
    const geo = { layout: LAYOUT.UNA_AGUA_PRIMADA, bx: 40, by: 20, h: 6, a: 2,
      pendienteHacia: "+Y" };
    // La franja del alero bajo es continua a lo ancho de la planta: un solo ②.
    expect(rotulosDeRegion(geo).filter(r => r.zona === "2")).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LA ESCALA SALE DEL ANCHO Y EL ALTO SALE DEL DIBUJO
// ═══════════════════════════════════════════════════════════════════════════════

describe('escalaPorAncho — el dibujo llena la columna en vez de encogerse', () => {
  // La caja real de la planta de un croquis de C&R: 549 px de ancho con 56 de margen.
  const planta = (w, h) => ({ ancho: 549, margen: 56, w, h });

  it('ignora el alto: la escala la fija el ANCHO disponible', () => {
    // ⚠ ES LA DIFERENCIA CON `escalaComun`, que toma el mínimo de los dos. Con la caja de
    // alto fijo, el galpón de 20 × 30 se dibujaba a 8,4 px/m cuando el ancho daba para
    // 21,9: dos tercios de la lámina eran aire y el croquis salía dos veces y media más
    // chico de lo que podía.
    const e = escalaPorAncho([planta(20, 30)]);
    expect(e).toBeCloseTo((549 - 112) / 20, 9);
    const antes = escalaComun([{ ...planta(20, 30), alto: 363 }]);
    expect(e / antes).toBeGreaterThan(2.5);
  });

  it('el alto de la caja se deriva del dibujo', () => {
    const v = planta(20, 30);
    const e = escalaPorAncho([v]);
    expect(altoNecesario(v, e)).toBe(Math.ceil(30 * e + 112));
  });

  it('con varias vistas toma la más exigente: es la escala COMÚN', () => {
    // Sigue valiendo la regla de que dos vistas del mismo edificio comparten escala.
    const e = escalaPorAncho([planta(20, 30), planta(50, 10)]);
    expect(e).toBeCloseTo((549 - 112) / 50, 9);
  });

  it('el tope de alto evita una lámina de varias pantallas', () => {
    // Una planta de 10 × 200 m pediría 8.700 px de alto. Pasado el tope vuelve a
    // gobernar el alto, que es el comportamiento de antes.
    const v = planta(10, 200);
    const sinTope = escalaPorAncho([v]);
    const conTope = escalaPorAncho([v], { altoMaximo: 900 });
    expect(conTope).toBeLessThan(sinTope);
    expect(altoNecesario(v, conTope)).toBeLessThanOrEqual(900);
  });

  it('los factores de zoom arrancan en 1 y llegan al 3', () => {
    // El 1× tiene que ser el primero: es el que sale por defecto, y con la escala ya
    // ajustada al ancho es el que la mayoría no va a necesitar cambiar.
    expect(ZOOMS[0]).toBe(1);
    expect(Math.max(...ZOOMS)).toBe(3);
    expect([...ZOOMS].sort((a, b) => a - b)).toEqual(ZOOMS);
  });
});
