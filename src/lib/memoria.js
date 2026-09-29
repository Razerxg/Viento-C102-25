// MEMORIA DE CÁLCULO EN MARKDOWN.
//
// ── QUÉ ES Y QUÉ NO ES ─────────────────────────────────────────────────────────
// Es una memoria de ACCIONES: determina las cargas de viento sobre el SPRFV y las deja
// listas para el modelo estructural. NO verifica ningún elemento, así que no lleva
// aprovechamientos ni filas «η | VERIFICA»: inventarlas haría creer que algo se verificó.
//
// ── EL ÁRBOL ES EL DE `lib/consolidar.js` ──────────────────────────────────────
// El panel, esta memoria y el Word renderizan LO MISMO. Los capítulos de cálculo salen de
// los bloques consolidados; lo que este archivo agrega es la estructura clásica de
// memoria —alcance, documentos, materiales, condiciones de uso, conclusión— y el formato.
//
// ── FORMATO ────────────────────────────────────────────────────────────────────
//   · tablas `Concepto | Símbolo | Valor | Unidad`
//   · la fórmula en línea propia, seguida de «donde:»
//   · el artículo en el título de cada ítem
//   · figuras como `> **[FIGURA N — descripción]**`
//   · coma decimal y punto de miles, perfil «memoria» de unidades
//   · los resultados clave en negrita
import { unidades, PERFILES } from './unidades.js';
import { APP, RESPONSABILIDAD, procedenciaTexto } from '../constants/version.js';
import { valorDe, puntosDe } from './traza.js';

const U = unidades(PERFILES.memoria);

/**
 * Coma decimal y punto de miles.
 *
 * ⚠ NO ES `toLocaleString`. El separador de miles del navegador depende del idioma del
 * SISTEMA, no del documento: la misma memoria abierta en una máquina en inglés saldría
 * con «1,224.45» y en una en español con «1.224,45». Un documento de cálculo no puede
 * cambiar de notación según quién lo abra.
 */
export function num(n, dec = 2) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const [ent, frac] = Math.abs(Number(n)).toFixed(dec).split(".");
  const miles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${Number(n) < 0 ? "−" : ""}${miles}${frac ? `,${frac}` : ""}`;
}

/** Una tabla de Markdown, con los anchos que hagan falta. */
export const tabla = (encabezados, filas) => [
  `| ${encabezados.join(" | ")} |`,
  `|${encabezados.map((_, i) => (i === 0 ? "---" : "---:")).join("|")}|`,
  ...filas.map(f => `| ${f.join(" | ")} |`),
].join("\n");

/** La tabla canónica de la memoria. */
export const tablaCSVU = (filas) =>
  tabla(["Concepto", "Símbolo", "Valor", "Unidad"], filas);

/**
 * Una figura.
 *
 * Se numeran en orden de aparición y el contador vive en el generador: escribirlas a mano
 * es cómo se llega a dos figuras 4 y ninguna 5.
 */
export const figura = (n, desc) => `> **[FIGURA ${n} — ${desc}]**`;

/** Un paso del árbol consolidado, escrito como ítem de memoria. */
export function itemDePaso(p, nivel = "###") {
  const l = [];
  // `nivel` en `null` deja el paso SIN encabezado: es para cuando el paso ES el capítulo
  // —la carga mínima, por ejemplo— y repetir el título daría «## 15. Carga mínima» y
  // debajo «### Carga mínima».
  if (nivel) l.push(`${nivel} ${p.titulo}${p.art ? ` — ${p.art}` : ""}`, "");
  if (p.formula) l.push("", "```", p.formula, "```", "");
  if (p.donde?.length) {
    l.push("donde:", "");
    for (const x of p.donde) {
      // Dos decimales y no tres: un área de «109,191 m²» sugiere una precisión de
      // milímetro cuadrado que la geometría declarada no tiene.
      const v = x.valor == null ? "" : ` = **${typeof x.valor === "number"
        ? num(x.valor, Number.isInteger(x.valor) ? 0 : 2) : x.valor}**`
        + (x.unidad ? ` ${x.unidad}` : "");
      l.push(`- \`${x.sim}\` · ${x.desc}${v}${x.ref ? ` (${x.ref})` : ""}`);
    }
    l.push("");
  }
  const val = valorDe(p);
  if (val && val !== "—") l.push(`**${p.titulo}: ${val}**`, "");
  const pts = puntosDe(p);
  if (pts) l.push(`${pts}.`, "");
  if (p.nota) l.push(p.nota, "");
  return l.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// EL DOCUMENTO COMPLETO
// ═══════════════════════════════════════════════════════════════════════════════
import * as C from './memoriaCapitulos.js';
import { consolidar } from './consolidar.js';

// ⚠ RÁFAGA ANTES QUE CERRAMIENTO. La Tabla 2.2-1 del propio reglamento pone el factor de
// efecto de ráfaga (art. 1.9) antes que la clasificación de cerramiento y la presión
// interna (arts. 1.10 y 1.11). El árbol consolidado los emite en el orden en que la app
// los calcula, que no es el mismo; acá se reordenan para que la memoria siga al
// reglamento y no a la implementación.


/**
 * Genera la memoria completa en Markdown.
 *
 * @param {any} e  todo el estado del proyecto, tal como lo expone el contexto
 * @returns {string}
 */
export function memoriaMarkdown(e) {
  const { avisos = [], envCasos, todas, resDe, gDe, geoN, act, d, cerr, sitio,
    topo, aplic, vel, rafaga, env, accesorio, cyr, kdCyR } = e;
  // ⚠ SE VUELVE A CONSOLIDAR CON EL PERFIL «MEMORIA». Es el MISMO árbol —la misma
  // función— pero la conversión de unidades ocurre en el borde, y el borde de la memoria
  // no es el de la pantalla: acá las longitudes van en mm y las presiones en kN/m².
  // `res` es el de la dirección activa: `consolidar` lo necesita para el caso de carga
  // mínima, y la memoria recibe `resDe` porque también arma la tabla de las cuatro.
  const traza = consolidar({ ...e, res: e.res ?? e.resDe(e.act), U });
  const errores = avisos.filter(a => a.tono === "error");
  const bloque = (id) => traza.find(b => b.id === id);

  // Las figuras se numeran en ORDEN DE APARICIÓN y el contador vive acá: escribir los
  // números a mano es cómo se llega a dos figuras 4 y ninguna 5.
  let fig = 0;
  const nf = () => ++fig;
  // ⚠ LA DE GEOMETRÍA SE RESERVA ANTES DE ARMAR LOS CAPÍTULOS DE CÁLCULO. Los capítulos
  // se construyen en un arreglo aparte y recién después se intercalan, así que pedir su
  // número al momento de escribir el capítulo 6 —que ocurre DESPUÉS— daba la figura 3 en
  // el capítulo 6 y la 1 en el 13. Lo encontró el test que exige numeración correlativa.
  const figGeometria = nf();

  // ── ¿HAY UN EQUIPO SOBRE CUBIERTA? ──────────────────────────────────────────
  // Art. 4.5.1. Es la única estructura del capítulo 4 que carga AL EDIFICIO y que usa su
  // `h`, así que va como capítulo opcional de ESTA memoria; las demás —carteles,
  // chimeneas, torres, silos, Anexo I— son otro objeto y llevan memoria propia.
  const conEquipo = d.cap4?.familia === "equipo" && accesorio?.fuerza != null;

  const cap = [];
  let n = 6;
  const push = (titulo, cuerpo) => { n += 1; cap.push(`## ${n}. ${titulo}\n\n${cuerpo}`); };
  const pushBloque = (id, titulo) => {
    const b = bloque(id);
    if (!b) return;
    n += 1;
    cap.push([`## ${n}. ${titulo ?? b.titulo}${b.art ? ` — ${b.art}` : ""}`, "",
      b.desc ? `${b.desc}\n` : "",
      ...b.pasos.map(p => itemDePaso(p, "###"))].join("\n"));
  };

  // 7 · velocidad, con la categoría de riesgo adelante
  n += 1;
  const bv = bloque("velocidad");
  cap.push([`## ${n}. ${bv.titulo} — ${bv.art}`, "",
    `### ${n}.1. Categoría de riesgo — Tabla 1.14-1`, "",
    `La categoría de riesgo **elige el mapa de velocidad**: entre categoría II y IV hay un`,
    `período de retorno distinto y una V distinta para el mismo sitio.`, "",
    tablaCSVU([
      ["Categoría de riesgo", "—", `**${d.riesgo}**`, "—"],
      ["Mapa de velocidad que selecciona", "—",
        d.riesgo === "I" ? "Figura 1.5-1C" : d.riesgo === "II" ? "Figura 1.5-1A"
          : "Figura 1.5-1B", "—"],
    ]), "",
    ...bv.pasos.map(p => itemDePaso(p, "###"))].join("\n"));

  pushBloque("sitio", "Categoría de exposición y factores del sitio");
  cap[cap.length - 1] = cap[cap.length - 1]
    .replace(/— Arts\. 1\.6 a 1\.8/, "— Arts. 1.6 a 1.8 y 1.12");
  pushBloque("rafaga");
  pushBloque("cerramiento");
  // 11 · presión dinámica, con el perfil de q_z tramo por tramo.
  pushBloque("dinamica");
  cap[cap.length - 1] += "\n" + C.tablaPerfilQz({ act });
  // 12 · coeficientes de presión externa, con la aplicabilidad como 12.3.
  pushBloque("coeficientes");

  if (aplic) {
    const ap = aplic.porDir[0];
    cap[cap.length - 1] += `\n### ${n}.3. Aplicabilidad de la Fig. 2.4-1\n\n`
      + tabla(["Magnitud", "Valor", "Rango tabulado", "Lectura"],
        ap.items.map(x => [x.magnitud, x.texto, x.rango, x.etiqueta]))
      + `\n\n«En el extremo» no es un error: las filas de la figura dicen ≤ y ≥, y adoptar `
      + `el extremo es lo que manda. Lo que sí hay que mirar es una **lectura extendida**: `
      + `una que la figura no escribe.\n`
      + (aplic.extendidas.length
        ? `\n${aplic.extendidas.map(x => `⚠ **${x.titulo}** — ${x.detalle}`).join("\n\n")}\n`
        : "");
  }

  push("Presiones de diseño por superficie — art. 2.4.1",
    C.tablaPresiones({ todas, nFig: nf() }));
  push("Resultantes por dirección — art. 2.4",
    C.resultantesPorDireccion({ todas, resDe, gDe }));

  // Carga mínima: capítulo propio, ANTES de los casos de carga.
  const pMin = bloque("resultantes").pasos.find(p => p.id === "min");
  push("Carga mínima — art. 2.1.5", itemDePaso(pMin, null));

  push("Casos de carga y envolvente — Figura 2.4-8 y art. 2.4.7",
    C.casosYEnvolvente({ envCasos, nFig: nf() }));

  // ⚠ C&R VA DESPUÉS DE TODO EL SPRFV Y ANTES DEL EQUIPO SOBRE CUBIERTA. Quien lee la
  // memoria tiene que poder cerrar el sistema principal antes de empezar con las correas;
  // intercalado entre las presiones y las resultantes, las dos tablas de presiones quedan
  // una al lado de la otra y se confunden, que es justo el error de uso más caro del
  // reglamento.
  if (cyr?.figura) {
    push("Componentes y revestimientos — Capítulo 5, art. 5.3",
      C.componentesYRevestimientos({ cyr, cerr, kdCyR, nFig: nf() }));
  }

  if (conEquipo) {
    push("Equipo o estructura sobre cubierta — art. 4.5.1",
      [`El equipo declarado carga **al edificio** y usa su altura media \`h\`, por eso va en`,
        `esta memoria y no en una separada.`, "",
        tablaCSVU([
          ["Fuerza resultante", "F", `**${num(U.val.fuerza(accesorio.fuerza), 1)}**`,
            U.u.fuerza],
        ]), "",
        accesorio.avisos?.map(a => `- ${a.texto}`).join("\n") ?? ""].join("\n"));
  }

  const nCond = n + 1, nConc = n + 2, nBib = n + 3;
  const cuerpo = [
    C.encabezado({ d }),
    C.introduccion({ d }),
    C.alcance({ rafaga, d, cyr }),
    C.documentos(),
    C.normas({ env }),
    C.materiales(),
    C.geometria({ geoN, act, nFig: figGeometria }),
    ...cap,
    C.condicionesDeUso({ cerr, d, env, res: resDe(act), sitio, topo, aplic, vel, rafaga })
      .replace(/^## 17\./, `## ${nCond}.`).replace(/### 17\./g, `### ${nCond}.`),
    C.conclusion({ envCasos, avisos, todas, resDe })
      .replace(/^## 18\./, `## ${nConc}.`).replace(/### 18\./g, `### ${nConc}.`),
    C.bibliografia({ env }).replace(/^## 19\./, `## ${nBib}.`),
  ].join("\n\n---\n\n");

  return C.recuadroNoApta(errores) + cuerpo + "\n";
}

/** El índice, sacado de los encabezados `##` del propio documento. */
export const indiceDe = (md) => md.split("\n")
  .filter(l => /^## \d+\./.test(l))
  .map(l => `- ${l.replace(/^## /, "")}`).join("\n");
