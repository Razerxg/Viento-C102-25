// LA MEMORIA EN MARKDOWN.
import { describe, it, expect } from 'vitest';
import { analizarDireccion, DIRECCIONES, normalizarGeo } from '../src/engine/edificio.js';
import { resultantes } from '../src/engine/resultantes.js';
import { estadosDeCarga, envolventeCritica, exencion247 } from '../src/engine/envolvente.js';
import { aplicabilidadDeTodas } from '../src/engine/aplicabilidad.js';
import { factorRafaga, dimensionesDe } from '../src/engine/factorRafaga.js';
import { resolverV } from '../src/engine/velocidad.js';
import { kzt } from '../src/engine/topografia.js';
import { clasificar, regionDetritus } from '../src/engine/cerramiento.js';
import { riAplicado, gcpiDe } from '../src/constants/presionInterna.js';
import { memoriaMarkdown, indiceDe, num, tabla, tablaCSVU, figura } from '../src/lib/memoria.js';
import { INICIAL } from '../src/constants/inicial.js';
import { APP, RESPONSABILIDAD } from '../src/constants/version.js';

/** Arma el estado completo, igual que el contexto. */
function caso(over = {}) {
  const d = { ...INICIAL, proyecto: "Galpón", exposicion: "C",
    geo: { ...INICIAL.geo, a: "20", b: "30", hAlero: "6", theta: "20",
      tipo: "dos_aguas", cumbrera: "Y" }, ...over };
  const geoN = normalizarGeo(d.geo);
  const vel = resolverV({ origen: d.origenV, ciudad: d.ciudad, riesgo: d.riesgo });
  const sitio = { V: vel.V, vel, exposicion: d.exposicion, kd: 0.85, Kzt: 1, topo: null,
    altitud: 0, usarKe: true, puntosPerfil: 6 };
  const topo = kzt({ z_m: geoN.h });
  const detritus = regionDetritus({ ciudad: d.ciudad, riesgo: d.riesgo, origen: "tabla",
    V: vel.V });
  const cc = clasificar({ geo: geoN, aberturas: d.aberturas, riesgo: d.riesgo, detritus });
  const cerramiento = cc.clasificacion;
  const cerr = { ...cc, label: "Cerrado", modo: "calculado", efectiva: cerramiento, detritus,
    gcpiTabla: gcpiDe(cerramiento), gcpi: gcpiDe(cerramiento), modoRi: d.cerr.modoRi,
    RiAplicado: riAplicado({ modo: d.cerr.modoRi, calculado: cc.Ri }), Vi: cc.Vi };
  const rt = Object.fromEntries(DIRECCIONES.map(x => [x.id,
    factorRafaga({ h: geoN.h, ...dimensionesDe(geoN, x), exposicion: d.exposicion,
      V: vel.V, n1: Number(d.n1) || 0, beta: 0.02 })]));
  const gDe = (dir) => rt[dir.id].opciones.find(o => o.id === d.modoG)?.G ?? 0.85;
  const ENT = { geo: d.geo, sitio, cerramiento, G: gDe(DIRECCIONES[0]), gcpi: cerr.gcpi,
    ri: { modo: d.cerr.modoRi, calculado: cc.Ri, aplicado: cerr.RiAplicado },
    porticosCubierta: d.porticosCubierta, pisoSolidario: d.pisoSolidario };
  const todas = DIRECCIONES.map(x => analizarDireccion({ ...ENT, G: gDe(x) }, x));
  const act = todas[0];
  const resDe = (t) => resultantes(t, ENT);
  const exen = exencion247({ cond247: d.env.cond247, arts247: d.env.arts247,
    fundamento: d.env.fundamento247, h: geoN.h });
  const envCasos = { ...envolventeCritica(estadosDeCarga({ analizar: analizarDireccion,
    entrada: ENT, opc: { ...ENT, exentoArt247: exen.exento } })), exen };
  return { d, geoN, vel, sitio, topo, cerr, todas, act, resDe, envCasos,
    aplic: aplicabilidadDeTodas(todas), gDe, rafaga: rt[act.dir.id],
    env: envCasos, res: resDe(act) };
}

const MD = (over = {}, avisos = []) => memoriaMarkdown({ ...caso(over), avisos });
const BASE = MD();

describe('formato de números', () => {
  // ⚠ NO ES `toLocaleString`. El separador de miles del navegador depende del idioma del
  // SISTEMA, no del documento: la misma memoria abierta en una máquina en inglés saldría
  // con «1,224.45». Un documento de cálculo no puede cambiar de notación según quién lo
  // abra.
  it('coma decimal y punto de miles, siempre', () => {
    expect(num(1224.45, 2)).toBe("1.224,45");
    expect(num(1234567.8, 1)).toBe("1.234.567,8");
    expect(num(999, 0)).toBe("999");
    expect(num(1000, 0)).toBe("1.000");
    expect(num(0.55, 2)).toBe("0,55");
  });

  it('el signo menos es el tipográfico, no el guion', () => {
    expect(num(-1500.5, 1)).toBe("−1.500,5");
  });

  it('lo que no es un número da raya, no NaN', () => {
    for (const x of [null, undefined, NaN, Infinity, "hola"]) expect(num(x)).toBe("—");
  });
});

describe('las piezas de formato', () => {
  it('la tabla canónica es Concepto · Símbolo · Valor · Unidad', () => {
    const t = tablaCSVU([["Altura media", "h", "7,82", "m"]]);
    expect(t.split("\n")[0]).toBe("| Concepto | Símbolo | Valor | Unidad |");
    expect(t.split("\n")).toHaveLength(3);
  });

  it('las figuras llevan el formato acordado', () => {
    expect(figura(3, "planta")).toBe("> **[FIGURA 3 — planta]**");
  });

  it('la tabla alinea a la derecha todo menos la primera columna', () => {
    expect(tabla(["a", "b", "c"], []).split("\n")[1]).toBe("|---|---:|---:|");
  });
});

describe('la estructura del documento', () => {
  it('los capítulos van en el orden acordado', () => {
    expect(indiceDe(BASE).split("\n").map(l => l.replace(/^- \d+\. /, "").split(" — ")[0]))
      .toEqual([
        "Introducción", "Alcance", "Documentos de referencia",
        "Normas y reglamentos a aplicar", "Materiales", "Características geométricas",
        "Velocidad básica del viento", "Categoría de exposición y factores del sitio",
        "Factor de efecto de ráfaga", "Cerramiento y presión interna",
        "Presión dinámica", "Coeficientes de presión externa",
        "Presiones de diseño por superficie", "Resultantes por dirección",
        "Carga mínima", "Casos de carga y envolvente",
        "Condiciones de uso y control operativo", "Conclusión", "Bibliografía"]);
  });

  // ⚠ RÁFAGA ANTES QUE CERRAMIENTO: es el orden de la Tabla 2.2-1 del reglamento, no el
  // orden en que la app calcula.
  it('el factor de ráfaga va antes que el cerramiento', () => {
    const i = indiceDe(BASE).split("\n");
    const pos = (t) => i.findIndex(l => l.includes(t));
    expect(pos("Factor de efecto de ráfaga")).toBeLessThan(pos("Cerramiento"));
  });

  it('la carga mínima va antes que los casos de carga', () => {
    expect(BASE.indexOf("## 15. Carga mínima"))
      .toBeLessThan(BASE.indexOf("## 16. Casos de carga"));
  });

  it('los números de capítulo son correlativos y no se repiten', () => {
    const ns = [...BASE.matchAll(/^## (\d+)\./gm)].map(m => Number(m[1]));
    expect(ns).toEqual(Array.from({ length: ns.length }, (_, k) => k + 1));
  });

  it('el capítulo 8 cita el 1.12, que es de donde sale K_e', () => {
    expect(BASE).toMatch(/## 8\. .*Arts\. 1\.6 a 1\.8 y 1\.12/);
  });

  it('la aplicabilidad es el 12.3 y se llama así', () => {
    expect(BASE).toContain("### 12.3. Aplicabilidad de la Fig. 2.4-1");
  });

  it('las figuras se numeran en orden y sin saltos', () => {
    const ns = [...BASE.matchAll(/\[FIGURA (\d+) —/g)].map(m => Number(m[1]));
    expect(ns.length).toBeGreaterThan(2);
    expect(ns).toEqual(Array.from({ length: ns.length }, (_, k) => k + 1));
  });
});

describe('la procedencia y el alcance', () => {
  it('encabeza con la versión, la norma y la responsabilidad', () => {
    expect(BASE).toContain(APP.norma);
    expect(BASE).toContain(APP.version);
    expect(BASE).toContain(RESPONSABILIDAD);
  });

  // Una memoria que sólo dice lo que hizo invita a suponer que lo demás está adentro, y
  // el modo de falla real no es que se rompa: es que alguien use un número correcto para
  // algo que ese número no cubre.
  it('el alcance declara las cuatro exclusiones', () => {
    const al = BASE.slice(BASE.indexOf("## 2. Alcance"), BASE.indexOf("## 3."));
    expect(al).toMatch(/Capítulo 5.*NO están determinados/s);
    expect(al).toContain("no se dimensionan");
    expect(al).toMatch(/n₁.*no se determinó/s);
    expect(al).toContain("**estructura rígida**");
    expect(al).toMatch(/Cubiertas aisladas y edificios abiertos/);
    expect(al).toMatch(/cúpulas/);
    expect(al).toMatch(/abovedadas/);
    expect(al).toMatch(/mansardas/);
  });

  it('«Materiales» dice No corresponde y explica por qué', () => {
    const m = BASE.slice(BASE.indexOf("## 5. Materiales"), BASE.indexOf("## 6."));
    expect(m).toContain("**No corresponde.**");
    expect(m).toMatch(/determina \*\*acciones\*\*; no verifica elementos/);
  });

  // Una memoria de acciones no verifica nada: inventar una fila «η | VERIFICA» haría
  // creer que sí.
  it('no hay aprovechamientos ni filas de verificación', () => {
    expect(BASE).not.toMatch(/VERIFICA/);
    expect(BASE).not.toMatch(/\bη\b/);
    expect(BASE).not.toMatch(/aprovechamiento/i);
  });
});

describe('la categoría de riesgo', () => {
  // ⚠ SIN FUNDAMENTO. El capítulo informa la categoría y el mapa que selecciona, que es
  // lo que hay que poder controlar; por qué se eligió esa categoría lo escribe el
  // proyectista en la memoria, a mano.
  it('va como 7.1, con el mapa que selecciona', () => {
    expect(BASE).toContain("### 7.1. Categoría de riesgo — Tabla 1.14-1");
    expect(BASE).toContain("Mapa de velocidad que selecciona");
    expect(BASE).toMatch(/Figura 1\.5-1A/);
  });

  it('cada categoría nombra su propio mapa', () => {
    expect(MD({ riesgo: "I" })).toMatch(/Mapa de velocidad que selecciona \| — \| Figura 1\.5-1C/);
    expect(MD({ riesgo: "II" })).toMatch(/Mapa de velocidad que selecciona \| — \| Figura 1\.5-1A/);
    expect(MD({ riesgo: "IV" })).toMatch(/Mapa de velocidad que selecciona \| — \| Figura 1\.5-1B/);
  });

  it('no pide ni menciona un fundamento', () => {
    const c = BASE.slice(BASE.indexOf("### 7.1."), BASE.indexOf("### 7.2") + 1 || BASE.indexOf("## 8."));
    expect(c).not.toMatch(/[Ff]undamento/);
    expect(BASE).not.toContain("Sin fundamento declarado");
  });
});

describe('los capítulos de cálculo', () => {
  it('cada fórmula va en línea propia seguida de «donde:»', () => {
    // Todo bloque de código tiene que estar seguido, en algún punto cercano, de un
    // «donde:»: una fórmula con símbolos sin declarar es una fórmula que hay que ir a
    // buscar a otro lado.
    const bloques = [...BASE.matchAll(/```\n([^`]+)\n```\n\ndonde:/g)];
    expect(bloques.length).toBeGreaterThan(5);
  });

  it('el artículo va en el título de cada ítem', () => {
    const h3 = [...BASE.matchAll(/^### (.+)$/gm)].map(m => m[1]);
    const conArt = h3.filter(x => /Art\.|Tabla|Figura|Expresi/.test(x));
    expect(conArt.length).toBeGreaterThan(h3.length * 0.5);
  });

  it('las unidades son las del perfil «memoria»: mm y kN/m²', () => {
    expect(BASE).toContain("kN/m²");
    expect(BASE).toMatch(/z \[mm\]/);
    // Y NO las de pantalla: si el árbol no se reconsolidara con este perfil, la presión
    // dinámica saldría en N/m² bajo un encabezado que dice kN/m².
    expect(BASE).not.toMatch(/q_z \[N\/m²\]/);
  });

  it('el perfil de q_z va tramo por tramo, sin el corte de extensión nula', () => {
    const t = BASE.slice(BASE.indexOf("## 11."), BASE.indexOf("## 12."));
    const filas = t.split("\n").filter(l => /^\| \d/.test(l));
    expect(filas.length).toBeGreaterThan(3);
    expect(filas.every(l => !/^\| 0 a 0 \|/.test(l))).toBe(true);
  });

  it('las presiones traen los dos signos de la presión interna, como casos separados', () => {
    const t = BASE.slice(BASE.indexOf("## 13."), BASE.indexOf("## 14."));
    expect(t).toContain("p con (GC_pi) +");
    expect(t).toContain("p con (GC_pi) −");
    expect(t).toMatch(/casos de carga separados/);
  });
});

describe('el caso de carga mínima y la envolvente', () => {
  it('la tabla de casos incluye el 2.1.5 y dice que se agrega', () => {
    const t = BASE.slice(BASE.indexOf("## 16."), BASE.indexOf("## 17."));
    expect(t).toContain("Caso 2.1.5");
    expect(t).toMatch(/\*\*se agrega\*\*/);
    expect(t).toContain("C 2.1.5");
  });

  it('cada magnitud crítica dice de qué combinación sale', () => {
    const t = BASE.slice(BASE.indexOf("## 16."), BASE.indexOf("## 17."));
    expect(t).toContain("Combinación que gobierna");
    expect(t).toMatch(/caso \d · W/);
  });

  it('con la exención declarada, M_T dice «no verificado»', () => {
    const md = MD({ env: { ...INICIAL.env, cond247: ["una_planta"],
      fundamento247: "galpón de una nave" } });
    expect(md).toContain("**no verificado**");
    expect(md).toMatch(/exención del art\. 2\.4\.7 declarada/);
  });
});

describe('condiciones de uso y control operativo', () => {
  // No es un capítulo de cortesía: son las hipótesis de las que depende el resultado.
  it('lista las declaraciones del sistema estructural', () => {
    const t = BASE.slice(BASE.indexOf("## 17."), BASE.indexOf("## 18."));
    expect(t).toContain("Piso solidario a la estructura");
    expect(t).toContain("entramados resistentes a momento");
    expect(t).toContain("Exención de los casos torsionales");
    expect(t).toContain("Factor R_i adoptado");
    expect(t).toContain("Categoría de exposición");
    expect(t).toContain("800 m o 20 veces la");
    expect(t).toContain("Velocidad adoptada");
  });

  it('las aberturas declaradas cerradas llevan las DOS condiciones', () => {
    const md = MD({ aberturas: [{ superficie: "X-", tipo: "operable", ancho: "4",
      alto: "4", abiertaEnDiseno: false, nombre: "Portón principal" }] });
    const t = md.slice(md.indexOf("## 17."), md.indexOf("## 18."));
    expect(t).toContain("Portón principal");
    expect(t).toMatch(/mantenerse cerradas durante el viento de diseño/);
    expect(t).toMatch(/diseñadas para\s+la presión del Capítulo 5/);
    expect(t).toContain("Las dos condiciones van juntas");
  });

  it('avisa cuando una declaración cambia el resultado', () => {
    const t = MD({ pisoSolidario: true, porticosCubierta: true });
    const s = t.slice(t.indexOf("## 17."), t.indexOf("## 18."));
    expect(s).toMatch(/la presión interna se autoequilibra/);
    expect(s).toMatch(/no se aplica el piso de la nota 7/);
  });
});

describe('la conclusión', () => {
  it('trae las cargas para el modelo y las observaciones vigentes', () => {
    const md = MD({}, [{ tono: "aviso", titulo: "Un aviso", detalle: "su detalle" }]);
    const t = md.slice(md.indexOf("## 18."), md.indexOf("## 19."));
    expect(t).toContain("Corte total en la base");
    expect(t).toContain("Momento torsor");
    expect(t).toContain("Un aviso");
    expect(t).toContain("su detalle");
  });

  it('sin observaciones lo dice', () => {
    const t = BASE.slice(BASE.indexOf("## 18."), BASE.indexOf("## 19."));
    expect(t).toContain("No hay observaciones pendientes");
  });
});

describe('el recuadro de NO APTA PARA EMISIÓN', () => {
  // Va PRIMERO y no al final: la memoria se sigue pudiendo descargar —es un borrador y
  // sirve para trabajar— pero tiene que decirlo antes de que alguien transcriba el primer
  // número.
  it('encabeza el documento y lista los errores', () => {
    const md = MD({}, [
      { tono: "error", titulo: "Edificio flexible", detalle: "G_f es obligatorio." },
      { tono: "aviso", titulo: "Otro", detalle: "no es error" }]);
    expect(md.startsWith("> ## ⛔ NO APTA PARA EMISIÓN")).toBe(true);
    expect(md).toContain("Edificio flexible");
    expect(md).toContain("BORRADOR DE TRABAJO");
    // Sólo los de nivel error: con los avisos adentro, el recuadro dejaría de significar.
    const rec = md.slice(0, md.indexOf("# Memoria"));
    expect(rec).not.toContain("Otro");
  });

  it('sin errores no aparece', () => {
    expect(BASE.startsWith("# Memoria de cálculo")).toBe(true);
    expect(BASE).not.toContain("NO APTA PARA EMISIÓN");
  });
});

describe('la bibliografía cita sólo lo aplicado', () => {
  it('sin el art. 2.4.7.3 declarado, no aparece el INPRES-CIRSOC 103', () => {
    expect(BASE).not.toContain("103-2018");
    expect(BASE).toContain("CIRSOC 102-2025");
    expect(BASE).toContain("Res");
  });

  it('con el art. 2.4.7.3 declarado, aparece', () => {
    const md = MD({ env: { ...INICIAL.env, arts247: ["art_2_4_7_3"],
      fundamento247: "verificación de regularidad" } });
    expect(md).toContain("INPRES-CIRSOC 103-2018");
    expect(md).toContain("art. 2.4.7.3");
  });
});
