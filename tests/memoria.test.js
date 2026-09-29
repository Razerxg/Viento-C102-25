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
import { analizarCyR } from '../src/engine/cyrPresiones.js';
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
  // Componentes y revestimientos: se arma igual que en el contexto, para que la memoria
  // reciba exactamente la misma forma de objeto que en la app.
  const cyr = analizarCyR({
    geo: geoN, V: vel.V, exposicion: d.exposicion, altitud: 0, kd: 0.85,
    kztDe: () => [1], gcpi: Math.abs(cerr.gcpi), parapeto: !!d.cyr.parapeto,
    elementos: (d.elementosCyR ?? []).map(el => ({ ...el, L: Number(el.L) || 0,
      s: Number(el.s) || 0, area: Number(el.area) || 0 })),
  });
  return { d, geoN, vel, sitio, topo, cerr, todas, act, resDe, envCasos,
    aplic: aplicabilidadDeTodas(todas), gDe, rafaga: rt[act.dir.id],
    env: envCasos, res: resDe(act), cyr, kdCyR: 0.85 };
}

const MD = (over = {}, avisos = []) => memoriaMarkdown({ ...caso(over), avisos });
const BASE = MD();

/**
 * El texto de un capítulo, buscado POR TÍTULO y no por número.
 *
 * ⚠ Los cortes iban con `indexOf("## 17.")`. Alcanzó con meter un capítulo nuevo —el de
 * componentes y revestimientos— para que cinco tests se pusieran a mirar el capítulo
 * equivocado y fallaran con mensajes que no decían nada del cambio real. El número de un
 * capítulo es una consecuencia del documento; el título es lo que el test quiere decir.
 */
const capitulo = (md, titulo) => {
  const i = md.search(new RegExp(`^## \\d+\\. ${titulo}`, "m"));
  if (i < 0) return "";
  const resto = md.slice(i + 3);
  const j = resto.search(/^## \d+\./m);
  return j < 0 ? md.slice(i) : md.slice(i, i + 3 + j);
};

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
        "Componentes y revestimientos",
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
    expect(BASE.indexOf("Carga mínima — art. 2.1.5"))
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
  it('el alcance declara las exclusiones', () => {
    const al = capitulo(BASE, "Alcance");
    // Con el capítulo 5 implementado, C&R deja de ser una exclusión y pasa a ser alcance
    // con su propia lista de lo que queda afuera. Lo que NO cambia es la advertencia de
    // que las presiones de los dos capítulos no se intercambian.
    expect(al).toMatch(/NO se intercambian con las del SPRFV/);
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
    const t = capitulo(BASE, "Casos de carga y envolvente");
    expect(t).toContain("Caso 2.1.5");
    expect(t).toMatch(/\*\*se agrega\*\*/);
    expect(t).toContain("C 2.1.5");
  });

  it('cada magnitud crítica dice de qué combinación sale', () => {
    const t = capitulo(BASE, "Casos de carga y envolvente");
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
    const t = capitulo(BASE, "Condiciones de uso");
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
    const t = capitulo(md, "Condiciones de uso");
    expect(t).toContain("Portón principal");
    expect(t).toMatch(/mantenerse cerradas durante el viento de diseño/);
    expect(t).toMatch(/diseñadas para\s+la presión del Capítulo 5/);
    expect(t).toContain("Las dos condiciones van juntas");
  });

  it('avisa cuando una declaración cambia el resultado', () => {
    const t = MD({ pisoSolidario: true, porticosCubierta: true });
    const s = capitulo(t, "Condiciones de uso");
    expect(s).toMatch(/la presión interna se autoequilibra/);
    expect(s).toMatch(/no se aplica el piso de la nota 7/);
  });
});

describe('la conclusión', () => {
  it('trae las cargas para el modelo y las observaciones vigentes', () => {
    const md = MD({}, [{ tono: "aviso", titulo: "Un aviso", detalle: "su detalle" }]);
    const t = capitulo(md, "Conclusión");
    expect(t).toContain("Corte total en la base");
    expect(t).toContain("Momento torsor");
    expect(t).toContain("Un aviso");
    expect(t).toContain("su detalle");
  });

  it('sin observaciones lo dice', () => {
    const t = capitulo(BASE, "Conclusión");
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


// ═══════════════════════════════════════════════════════════════════════════════
// EL CAPÍTULO DE COMPONENTES Y REVESTIMIENTOS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Capítulo de componentes y revestimientos', () => {
  it('aparece, con su artículo y su expresión', () => {
    expect(BASE).toMatch(/## \d+\. Componentes y revestimientos — Capítulo 5, art\. 5\.3/);
    expect(BASE).toContain("p = q_h · [ (GC_p) − (GC_pi) ]");
  });

  it('avisa que sus presiones NO se intercambian con las del capítulo 2', () => {
    // Es el error de uso más caro del reglamento: dimensionar una correa con la presión
    // del SPRFV. La memoria tiene que decirlo donde se lee, no sólo en el alcance.
    expect(BASE).toMatch(/no son las del Capítulo 2/);
    expect(BASE).toMatch(/ya incluyen el factor de efecto de ráfaga/);
  });

  it('dice que en la Parte 1 q_h rige también en las paredes', () => {
    // Es la diferencia con el capítulo 2 que más fácil se pasa por alto.
    expect(BASE).toMatch(/rige también en las paredes/);
  });

  it('los parámetros generales salen de la TRAZA, no reescritos en el capítulo', () => {
    // El bloque `cyr` del árbol consolidado ya trae figura, altura, q_h, `a`, (GC_pi), la
    // expresión (5.3-1) y el mínimo, cada uno con su fórmula, su «donde:» y su artículo.
    // Reescribirlos en el capítulo sería la tercera versión de los mismos números —panel,
    // memoria y capítulo— y la primera en quedar atrás.
    const cap = capitulo(BASE, "Componentes y revestimientos");
    for (const s of ["Figura aplicable", "Altura de referencia de la figura",
      "Presión dinámica", "Dimensión de borde", "Presión de diseño",
      "Presión neta mínima"]) {
      expect(cap, s).toContain(s);
    }
    // Con su fórmula y su artículo, que es lo que hace que se pueda rehacer la cuenta.
    expect(cap).toContain("p = q_h · [ (GC_p) − (GC_pi) ]");
    expect(cap).toMatch(/Art\. 5\.2\.2/);
  });

  it('los pasos POR ELEMENTO no entran al capítulo: los reemplaza la tabla', () => {
    // Son uno por elemento y por zona. En el panel están, porque ahí no hay tabla; acá
    // dirían lo mismo que la tabla de abajo, renglón por renglón.
    const cap = capitulo(BASE, "Componentes y revestimientos");
    expect(cap).not.toMatch(/### .*— área efectiva de viento/);
    expect(cap).not.toMatch(/### .*— zona \d/);
  });

  it('lleva la figura de las curvas (GC_p) usadas', () => {
    const cap = capitulo(BASE, "Componentes y revestimientos");
    expect(cap).toMatch(/\[FIGURA \d+ — curvas \(GC_p\) usadas/);
    expect(cap).toMatch(/reducción del 10 % en paredes/);
  });

  it('lleva la tabla de anchos de zona, que es lo que va al plano', () => {
    expect(BASE).toContain("Zonas y sus anchos");
    expect(BASE).toMatch(/\| Zona \| Qué mide \| Expresión \|/);
  });

  it('lista los elementos con las DOS áreas', () => {
    expect(BASE).toMatch(/A efectiva \[m²\]/);
    expect(BASE).toMatch(/A tributaria \[m²\]/);
    expect(BASE).toMatch(/Correa de cubierta/);
    // Y explica por qué son dos.
    expect(BASE).toMatch(/dos áreas distintas/);
  });

  it('lista TODAS las zonas de cada elemento y no sólo la gobernante', () => {
    const cap = BASE.slice(BASE.indexOf("Componentes y revestimientos — Capítulo 5"));
    const filas = cap.split("\n").filter(l => /^\| \*{0,2}Correa de cubierta/.test(l));
    // La cubierta del caso es a dos aguas de 20°: Fig. 5.3-2C, tres zonas.
    expect(filas).toHaveLength(3);
  });

  it('el capítulo va DESPUÉS de las resultantes y la envolvente del SPRFV', () => {
    // Intercalado entre las dos tablas de presiones, quedan una al lado de la otra y se
    // confunden, que es justo lo que este capítulo existe para evitar.
    const iEnv = BASE.indexOf("Casos de carga y envolvente");
    const iCyR = BASE.indexOf("Componentes y revestimientos — Capítulo 5");
    expect(iEnv).toBeGreaterThan(0);
    expect(iCyR).toBeGreaterThan(iEnv);
  });

  it('el Alcance deja de excluir C&R y pasa a listar qué figuras quedan afuera', () => {
    expect(BASE).toMatch(/\*\*presiones sobre componentes y revestimientos\*\*/);
    expect(BASE).toMatch(/Del Capítulo 5 se cubren las figuras implementadas/);
    for (const fuera of ["5.3-5A", "5.3-3", "5.3-6", "art. 5.6", "art. 5.7",
      "plantas\n  irregulares"]) {
      expect(BASE, fuera).toMatch(new RegExp(fuera));
    }
    // Y ya no dice que NO están determinados.
    expect(BASE).not.toMatch(/Capítulo 5\): NO están determinados/);
  });

  it('sin figura aplicable el capítulo no se escribe, y el Alcance vuelve a excluirlo', () => {
    // Vertiente única de 18°: la Fig. 5.3-5B no está transcripta todavía.
    const md = MD({ geo: { ...INICIAL.geo, tipo: "vertiente_unica", theta: "18",
      a: "20", b: "30", hAlero: "6" } });
    expect(md).not.toMatch(/## \d+\. Componentes y revestimientos/);
    expect(md).toMatch(/Capítulo 5\): NO están determinados/);
  });

  it('la numeración de figuras sigue siendo correlativa con el capítulo nuevo', () => {
    const nums = [...BASE.matchAll(/\[FIGURA (\d+) —/g)].map(m => Number(m[1]));
    expect(nums).toEqual(nums.map((_, i) => i + 1));
    expect(nums.length).toBeGreaterThanOrEqual(4);
  });

  it('el índice incluye el capítulo nuevo y sigue numerado sin saltos', () => {
    const idx = indiceDe(BASE).split("\n");
    expect(idx.some(l => /Componentes y revestimientos/.test(l))).toBe(true);
    const n = idx.map(l => Number(l.match(/^- (\d+)\./)[1]));
    expect(n).toEqual(n.map((_, i) => i + 1));
  });
});
