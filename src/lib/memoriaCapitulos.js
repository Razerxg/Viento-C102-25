// LOS CAPÍTULOS DE LA MEMORIA.
//
// Separado de `memoria.js` —que tiene el formato— porque son dos cosas que cambian por
// razones distintas: el formato lo fija el estudio, y los capítulos, el reglamento.
import { num, tabla, tablaCSVU, figura, itemDePaso } from './memoria.js';
import { unidades, PERFILES } from './unidades.js';
import { APP, RESPONSABILIDAD, procedenciaTexto } from '../constants/version.js';
import { CASOS_CARGA, CASO_MINIMO, CONDICIONES_247_2,
  ARTICULOS_247_DECLARADOS } from '../engine/envolvente.js';

const U = unidades(PERFILES.memoria);
const si = (b) => (b ? "Sí" : "No");

// ── 1 · INTRODUCCIÓN ───────────────────────────────────────────────────────────
export const introduccion = ({ d }) => `## 1. Introducción

La presente memoria determina las **acciones del viento** sobre la estructura del
proyecto **${d.proyecto || "sin nombre"}**, de acuerdo con el **${APP.norma}**,
Reglamento Argentino de Acción del Viento sobre las Construcciones.

Se aplica el **procedimiento direccional** del Capítulo 2 para el Sistema Principal
Resistente a la Fuerza del Viento (SPRFV) de un edificio de forma regular, en las cuatro
direcciones de viento que exige el art. 2.4.1.

El resultado son las presiones de diseño sobre cada superficie de la envolvente y las
resultantes en la base, listas para transcribir al modelo estructural.`;

// ── 2 · ALCANCE ────────────────────────────────────────────────────────────────
//
// ⚠ LAS EXCLUSIONES SON LA MITAD DEL CAPÍTULO. Una memoria que sólo dice lo que hizo
// invita a suponer que lo demás está adentro, y el modo de falla real de un cálculo de
// viento no es que se rompa: es que alguien use un número correcto para algo que ese
// número no cubre.
export const alcance = ({ rafaga, d, cyr }) => `## 2. Alcance

### 2.1. Qué determina esta memoria

- La **velocidad básica** del sitio y los factores que corrigen la presión dinámica.
- La **clasificación de cerramiento** y el coeficiente de presión interna.
- Las **presiones de diseño** sobre paredes y cubierta, cara por cara y zona por zona, en
  las cuatro direcciones y con los dos signos de la presión interna.
- Las **resultantes en la base** —corte, levantamiento, vuelco y momento torsor— y la
  envolvente de los casos de carga de la Figura 2.4-8, con el caso de carga mínima del
  art. 2.1.5 incorporado.${cyr?.figura ? `
- Las **presiones sobre componentes y revestimientos** (Capítulo 5, Parte 1, art. 5.3),
  por elemento y por zona, para los elementos listados en el capítulo correspondiente.` : ""}

### 2.2. Qué NO determina — exclusiones explícitas

${cyr?.figura ? `- **Las presiones de componentes y revestimientos NO se intercambian con las del SPRFV.**
  Una correa o una chapa **no se dimensionan** con las presiones del Capítulo 2 de esta
  memoria, ni una columna con las del Capítulo 5: son dos conjuntos de coeficientes
  distintos, para dos problemas distintos.
- **Del Capítulo 5 se cubren las figuras implementadas**: 5.3-1 (paredes) y 5.3-2A a
  5.3-2G (cubiertas planas, a dos aguas y a cuatro aguas). **Quedan fuera**: cubiertas de
  vertiente única (5.3-5A y 5B), escalonadas (5.3-3), a dos aguas múltiples (5.3-4), en
  diente de sierra (5.3-6), en cúpula (5.3-7), abovedadas (5.3-8), la superficie inferior
  de edificios elevados (art. 5.3.2.1), los edificios con \`h > 20 m\` (Fig. 5.4-1), los
  edificios abiertos (5.5-1 a 5.5-3), los parapetos (art. 5.6), los voladizos de cubierta
  (art. 5.7) y los aleros adosados (art. 5.9). Tampoco se cubren las **plantas
  irregulares** en L, en T o con esquinas de 135° o más (Fig. C 5.3-2): la geometría de
  este cálculo es rectangular.` : `- **Componentes y revestimientos (Capítulo 5): NO están determinados.** Las correas, las
  chapas, las fijaciones y las aberturas **no se dimensionan** con las presiones del
  SPRFV de esta memoria. El Capítulo 5 da coeficientes propios, por área tributaria y por
  zona de borde, que son mayores que los del sistema principal.`}
- **Frecuencia natural n₁: no se determinó.** Se adopta la hipótesis
  de **estructura rígida** del art. 1.9.1${rafaga?.flexible
    ? " —⚠ CONTRADICHA por el n₁ declarado, ver el capítulo del factor de ráfaga—"
    : ""}. Si la estructura resultara flexible (n₁ < 1 Hz), el art. 1.9.2 exige el factor
  de ráfaga G_f de la expresión (1.9-10) y las presiones de esta memoria quedarían del
  lado inseguro.
- **Cubiertas aisladas y edificios abiertos** (Figuras 2.4-4 a 2.4-7), **cúpulas**
  (2.4-2), **cubiertas abovedadas** (2.4-3) y **mansardas**: fuera del alcance.
- **Dimensionamiento de elementos estructurales, fundaciones y anclajes.** Esta memoria
  determina acciones; no verifica secciones.

${RESPONSABILIDAD}`;

// ── 3 · DOCUMENTOS DE REFERENCIA ───────────────────────────────────────────────
// ⚠ LA TABLA VA VACÍA A PROPÓSITO. La app no pide fundamentar decisiones, así que no
// tiene de dónde sacar los documentos del proyecto: se deja el renglón para que el
// proyectista lo complete a mano. Inventar filas con lo que la app sí sabe —la norma, que
// ya tiene su propio capítulo— llenaría la tabla sin decir nada.
export const documentos = () => `## 3. Documentos de referencia

${tabla(["Documento", "Identificación", "Revisión"], [["Planos de proyecto", "—", "—"]])}

Completar con los documentos del proyecto antes de la emisión.`;

// ── 4 · NORMAS Y REGLAMENTOS ───────────────────────────────────────────────────
export const normas = ({ env }) => {
  const f = [
    ["CIRSOC 102-2025", "Reglamento Argentino de Acción del Viento sobre las Construcciones"],
    ["Comentarios al CIRSOC 102-2025", "Comentarios al reglamento"],
    ["Res. SOP 11/2026", "Aprobación y puesta en vigencia"],
  ];
  // ⚠ SÓLO LO CITADO. Una bibliografía con lo que «podría aplicar» hace que el lector no
  // sepa qué se usó de verdad; el 103 entra únicamente si se invocó el art. 2.4.7.3.
  if (env?.exen?.arts?.some(a => a.id === "art_2_4_7_3" && a.declarada)) {
    f.push(["INPRES-CIRSOC 103-2018", "Reglamento Argentino para Construcciones Sismorresistentes — "
      + "citado por la declaración del art. 2.4.7.3"]);
  }
  return `## 4. Normas y reglamentos a aplicar

${tabla(["Norma", "Título"], f)}`;
};

// ── 5 · MATERIALES ─────────────────────────────────────────────────────────────
export const materiales = () => `## 5. Materiales

**No corresponde.**

Esta memoria determina **acciones**; no verifica elementos. Las propiedades de los
materiales intervienen en el dimensionamiento, que es objeto de otra memoria.`;

// ── 6 · CARACTERÍSTICAS GEOMÉTRICAS ────────────────────────────────────────────
export const geometria = ({ geoN, act, nFig }) => {
  const f = [
    ["Dimensión en planta según X", "a", num(U.val.longitud(geoN.a), 0), U.u.longitud],
    ["Dimensión en planta según Y", "b", num(U.val.longitud(geoN.b), 0), U.u.longitud],
    ["Altura de alero", "h_e", num(U.val.longitud(geoN.hAlero), 0), U.u.longitud],
    ["Altura de cumbrera", "h_c", num(U.val.longitud(geoN.hCumbre), 0), U.u.longitud],
    ["**Altura media de cubierta**", "**h**",
      `**${num(U.val.longitud(geoN.h), 0)}**`, U.u.longitud],
    ["Ángulo de cubierta", "θ", num(geoN.theta, 1), "°"],
    ["Tipo de cubierta", "—", geoN.tipo.replace(/_/g, " "), "—"],
    ["Dirección de la cumbrera", "—", geoN.theta > 0 ? geoN.cumbrera : "no aplica", "—"],
  ];
  return `## 6. Características geométricas

${tablaCSVU(f)}

${figura(nFig, "planta y cortes del edificio, con las cuatro direcciones de viento")}

La **altura media de cubierta h** es la que gobierna la presión dinámica de sotavento, de
las paredes laterales y de la cubierta, y la fila de las tablas de coeficientes.`;
};

// ── CAPÍTULOS DE CÁLCULO, DESDE EL ÁRBOL CONSOLIDADO ───────────────────────────
//
// No se reescriben acá: salen de `lib/consolidar.js`, que es el mismo árbol que dibuja el
// panel. Con dos recorridos, el día que se agregue un paso a uno el otro queda atrás.
export const capituloDeBloque = (n, b) => [
  `## ${n}. ${b.titulo}${b.art ? ` — ${b.art}` : ""}`,
  "",
  b.desc ? `${b.desc}\n` : "",
  ...b.pasos.map(p => itemDePaso(p, "###")),
].join("\n");

// ── PRESIONES POR SUPERFICIE ───────────────────────────────────────────────────
export const tablaPresiones = ({ todas, nFig }) => {
  const filas = [];
  for (const an of todas) {
    for (const s of an.superficies) {
      if (s.tramos) {
        // La pared a barlovento va TRAMO POR TRAMO: es la única superficie con q variable,
        // y con un q_h único se borra lo que la distingue de las demás.
        for (const t of s.tramos) {
          filas.push([`${an.dir.id} · ${s.nombre}`,
            `z = ${num(t.desde, 2)} a ${num(t.hasta, 2)} m`, num(s.cp, 2),
            num(U.val.presion(t.q), 3), num(U.val.presion(t.conInternaPos), 3),
            num(U.val.presion(t.conInternaNeg), 3)]);
        }
        continue;
      }
      filas.push([`${an.dir.id} · ${s.nombre}`, s.zona
        ? `x = ${s.zona.desde}h a ${s.zona.hasta === Infinity ? "fin"
          : num(s.zona.hasta, 2)}h` : "—",
      num(s.cp, 2), num(U.val.presion(s.q), 3),
      num(U.val.presion(s.conInternaPos), 3), num(U.val.presion(s.conInternaNeg), 3)]);
    }
  }
  return `${tabla(["Superficie", "Zona", "C_p", `q [${U.u.presion}]`,
    `p con (GC_pi) + [${U.u.presion}]`, `p con (GC_pi) − [${U.u.presion}]`], filas)}

${figura(nFig, "diagrama de presiones sobre la envolvente, por dirección")}

Las dos últimas columnas son **casos de carga separados**, no un ± del que se elige el
peor: uno gobierna el levantamiento de la cubierta y el otro la compresión de las paredes,
en combinaciones distintas (nota 3 de la Tabla 1.11-1).`;
};

// ── RESULTANTES POR DIRECCIÓN ──────────────────────────────────────────────────
export const resultantesPorDireccion = ({ todas, resDe, gDe }) => {
  const filas = todas.map(t => {
    const r = resDe(t);
    return [t.dir.id, num(U.val.longitud(t.L), 0), num(U.val.longitud(t.B), 0),
      num(gDe(t.dir), 3), num(U.val.presion(t.qh), 3),
      `**${num(U.val.fuerza(Math.abs(r.cortante)), 1)}**`,
      `**${num(U.val.fuerza(Math.abs(r.levantamiento)), 1)}**`,
      `**${num(U.val.momento(Math.abs(r.vuelco)), 1)}**`];
  });
  return tabla(["Dirección", `L [${U.u.longitud}]`, `B [${U.u.longitud}]`, "G",
    `q_h [${U.u.presion}]`, `Corte [${U.u.fuerza}]`, `Levant. [${U.u.fuerza}]`,
    `Vuelco [${U.u.momento}]`], filas);
};

// ── LOS CASOS DE CARGA Y LA ENVOLVENTE ─────────────────────────────────────────
export const casosYEnvolvente = ({ envCasos, nFig }) => {
  const fila = (n, label) => {
    const es = envCasos.estados.filter(e => e.caso === n);
    const mx = (k) => (es.length ? Math.max(...es.map(e => Math.abs(e[k]))) : null);
    const c = (v, conv) => (v == null ? "no se verifica" : num(conv(v), 1));
    return [label, c(mx("cortante"), U.val.fuerza), c(mx("levantamiento"), U.val.fuerza),
      c(mx("vuelco"), U.val.momento), c(mx("MT"), U.val.momento)];
  };
  const filas = [...CASOS_CARGA.map(cs => fila(cs.n, cs.label)),
    fila(CASO_MINIMO, "Caso 2.1.5 — carga mínima, sólo horizontal")];

  const rot = (g) => (g?.estado == null ? "—"
    : g.estado.caso === CASO_MINIMO
      ? `caso 2.1.5 · ${g.estado.dirs.join("+")}`
      : `caso ${g.estado.caso} · ${g.estado.dirs.join("+")} · (GC_pi) `
        + `${g.estado.casoInterno === "conInternaPos" ? "+" : "−"} · nota 3 `
        + `${g.estado.casoNota3}${g.estado.eSigno ? ` · e ${g.estado.eSigno > 0 ? "+" : "−"}` : ""}`);

  const crit = [
    ["**Corte total en la base**", "**V**",
      `**${num(U.val.fuerza(Math.abs(envCasos.cortante.valor)), 1)}**`, U.u.fuerza],
    ["**Levantamiento**", "**F_z**",
      `**${num(U.val.fuerza(Math.abs(envCasos.levantamiento.valor)), 1)}**`, U.u.fuerza],
    ["**Momento de vuelco**", "**M_v**",
      `**${num(U.val.momento(Math.abs(envCasos.vuelco.valor)), 1)}**`, U.u.momento],
    ["**Momento torsor**", "**M_T**",
      envCasos.conTorsion
        ? `**${num(U.val.momento(Math.abs(envCasos.torsion.valor)), 1)}**`
        : "**no verificado**", U.u.momento],
  ];

  return `${tabla(["Caso de carga", `Corte [${U.u.fuerza}]`, `Levant. [${U.u.fuerza}]`,
    `Vuelco [${U.u.momento}]`, `M_T [${U.u.momento}]`], filas)}

${figura(nFig, "los cuatro casos de carga de la Figura 2.4-8, en planta")}

El **caso 2.1.5** no es uno de los cuatro de la figura: es un caso de otro artículo que
**se agrega** a los de carga normal (C 2.1.5). Se aplica **horizontalmente** sobre las
áreas proyectadas en un plano vertical normal al viento, por lo que su levantamiento y su
momento torsor son nulos.

### Valores críticos para el modelo

${tablaCSVU(crit)}

${tabla(["Magnitud", "Combinación que gobierna"], [
    ["Corte total", rot(envCasos.cortante)],
    ["Levantamiento", rot(envCasos.levantamiento)],
    ["Momento de vuelco", rot(envCasos.vuelco)],
    ["Momento torsor", envCasos.conTorsion ? rot(envCasos.torsion)
      : "no verificado — exención del art. 2.4.7 declarada"],
  ])}

Se barrieron **${envCasos.estados.length} estados de carga**: 4 direcciones × 2 signos de
(GC_pi) × 2 casos de la nota 3 × los casos de la figura, con los dos signos de la
excentricidad en los torsionales y las dos envolventes de cubierta de la nota 2, más el
caso del art. 2.1.5 por dirección.

⚠ Cada valor crítico sale de **un estado de carga completo**, no de un máximo por
componente: el corte, el levantamiento y el vuelco de una misma fila corresponden al mismo
estado.`;
};

// ── 17 · CONDICIONES DE USO Y CONTROL OPERATIVO ────────────────────────────────
//
// ⚠ NO ES UN CAPÍTULO DE CORTESÍA. Son las hipótesis DECLARADAS de las que depende el
// resultado: si alguna deja de cumplirse en obra o en operación, el cálculo de esta
// memoria deja de ser válido y no hay nada en los números que lo delate.
export const condicionesDeUso = ({ cerr, d, env, res, sitio, topo, aplic, vel, rafaga }) => {
  const l = [];
  const item = (t, v, nota) => l.push(`- **${t}:** ${v}${nota ? ` ${nota}` : ""}`);

  l.push("### 17.1. Aberturas y cerramiento", "");
  item("Clasificación adoptada", cerr.label,
    `(${cerr.modo === "calculado" ? "calculada a partir de las aberturas declaradas"
      : "declarada por el proyectista"}).`);
  const cerradas = (d.aberturas ?? []).filter(a => a.tipo === "operable" && !a.abiertaEnDiseno);
  if (cerradas.length) {
    item(`Aberturas consideradas CERRADAS (${cerradas.length})`,
      cerradas.map(a => a.nombre || a.tipo).join(", "),
      "— **deben mantenerse cerradas durante el viento de diseño y estar diseñadas para "
      + "la presión del Capítulo 5** (art. 1.10.2.1). Las dos condiciones van juntas.");
  }
  const portones = (d.aberturas ?? []).filter(a => a.tipo === "porton");
  if (portones.length) {
    item(`Portones de enrollar o seccionales (${portones.length})`,
      portones.map(a => a.nombre || "portón").join(", "),
      "— en región con detritus exigen ensayo de impacto de proyectiles (art. 1.10.4).");
  }
  const vidrios = (d.aberturas ?? []).filter(a => a.tipo === "vidriado");
  if (vidrios.length) {
    item(`Vidriados (${vidrios.length})`, vidrios.map(a => a.nombre || "vidriado").join(", "),
      `— ${cerr.detritus?.esRegion
        ? "el sitio ESTÁ en región con detritus: se consideran abiertos salvo que se "
          + "protejan o se ensayen (art. 1.10.3.1)."
        : "el sitio no está en región con detritus."}`);
  }
  item("Factor R_i adoptado", num(cerr.RiAplicado, 4),
    cerr.modoRi === "uno" ? "(art. 1.11.1, valor conservador)."
      : `(expresión (1.11-1), con V_i = ${num(cerr.Vi, 0)} m³). **Si el volumen interior `
        + "se subdivide con tabiques o cielorrasos estancos, esta reducción deja de ser "
        + "aplicable tal como está calculada.**");

  l.push("", "### 17.2. Sistema estructural declarado", "");
  item("Piso solidario a la estructura", si(d.pisoSolidario),
    d.pisoSolidario ? "— la presión interna se autoequilibra y **no entra** en el "
      + "levantamiento global ni en el vuelco. ⚠ Las chapas, las correas y sus fijaciones "
      + "siguen viendo externa ± interna." : "");
  item("SPRFV de cubierta con entramados resistentes a momento", si(d.porticosCubierta),
    d.porticosCubierta ? "— **no se aplica el piso de la nota 7** de la Figura 2.4-1. Sin "
      + "esa condición, el corte informado sería el de las paredes solas." : "");
  item("Exención de los casos torsionales (art. 2.4.7)", si(env?.exen?.exento),
    env?.exen?.exento
      ? `— declarada: ${[...CONDICIONES_247_2, ...ARTICULOS_247_DECLARADOS]
        .filter(c => (d.env?.cond247 ?? []).includes(c.id) || (d.env?.arts247 ?? []).includes(c.id))
        .map(c => c.ref).join(", ")}. **Los casos 2 y 4 no se verificaron.**`
      : "— se verifican los cuatro casos.");
  item("Comportamiento del diafragma", d.env?.diafragma ?? "rigido",
    d.env?.diafragma !== "rigido"
      ? "— la nota 4 no admite aplicar M_T como momento concentrado: va como bloque de "
        + "presión distribuida sobre las paredes. **Esa distribución no la arma esta "
        + "memoria.**" : "");

  l.push("", "### 17.3. Condiciones del sitio", "");
  item("Categoría de exposición", sitio.exposicion,
    `— requiere esa rugosidad en todo el sector de barlovento por **800 m o 20 veces la `
    + `altura del edificio, lo que sea mayor** (art. 1.7.3). Un claro, un río o un campo `
    + `abierto dentro de esa distancia obliga a recalcular.`);
  item("Factor topográfico K_zt", num(topo?.kzt ?? 1, 3),
    topo?.aplica
      ? `— accidente ${topo.forma ?? "—"} declarado. **Si la topografía de barlovento `
        + "cambia, el factor deja de ser el calculado.**"
      : "— sin accidente topográfico declarado: terreno llano.");
  item("Categoría de riesgo", d.riesgo,
    "— Tabla 1.14-1. **Un cambio de uso u ocupación cambia el mapa de velocidad que "
    + "corresponde leer**, y con él la V de diseño.");

  l.push("", "### 17.4. Velocidad básica", "");
  item("Velocidad adoptada", `${num(vel.V, 1)} m/s`, `— ${vel.detalleOrigen ?? ""}`);
  item("Factor de efecto de ráfaga", num(rafaga.opciones.find(o => o.id === d.modoG)?.G ?? 0.85, 3),
    "— se adopta la hipótesis de **estructura rígida**: no se determinó n₁. "
    + "Si resultara n₁ < 1 Hz, el art. 1.9.2 exige G_f y estas presiones quedan del lado "
    + "inseguro.");

  if (aplic?.extendidas?.length) {
    l.push("", "### 17.5. Lecturas extendidas de la Figura 2.4-1", "");
    for (const x of aplic.extendidas) l.push(`- **${x.titulo}:** ${x.detalle}`);
  }
  return `## 17. Condiciones de uso y control operativo

Las hipótesis declaradas de las que depende este cálculo. **Si alguna deja de cumplirse en
obra o en operación, los valores de esta memoria dejan de ser válidos**, y no hay nada en
los números que lo delate.

${l.join("\n")}`;
};

// ── 18 · CONCLUSIÓN ────────────────────────────────────────────────────────────
export const conclusion = ({ envCasos, avisos, todas, resDe }) => {
  const errores = avisos.filter(a => a.tono === "error");
  const otros = avisos.filter(a => a.tono === "aviso");
  const crit = [
    ["Corte total en la base", "V",
      num(U.val.fuerza(Math.abs(envCasos.cortante.valor)), 1), U.u.fuerza],
    ["Levantamiento", "F_z",
      num(U.val.fuerza(Math.abs(envCasos.levantamiento.valor)), 1), U.u.fuerza],
    ["Momento de vuelco", "M_v",
      num(U.val.momento(Math.abs(envCasos.vuelco.valor)), 1), U.u.momento],
    ["Momento torsor", "M_T", envCasos.conTorsion
      ? num(U.val.momento(Math.abs(envCasos.torsion.valor)), 1) : "no verificado",
    U.u.momento],
  ];
  const porDir = todas.map(t => {
    const r = resDe(t);
    return [t.dir.id, num(U.val.fuerza(Math.abs(r.cortante)), 1),
      num(U.val.fuerza(Math.abs(r.levantamiento)), 1),
      num(U.val.momento(Math.abs(r.vuelco)), 1)];
  });

  return `## 18. Conclusión

Se determinaron las acciones del viento sobre el SPRFV según el ${APP.norma},
procedimiento direccional del Capítulo 2, en las cuatro direcciones del art. 2.4.1.

### 18.1. Cargas para el modelo

${tablaCSVU(crit.map(([a, b, c, dd]) => [`**${a}**`, `**${b}**`, `**${c}**`, dd]))}

${tabla(["Dirección", `Corte [${U.u.fuerza}]`, `Levantamiento [${U.u.fuerza}]`,
    `Vuelco [${U.u.momento}]`], porDir)}

${envCasos.minimoGobiernaAlgo
    ? `⚠ **Gobierna el caso de carga mínima del art. 2.1.5** en `
      + `${Object.entries(envCasos.gobiernaMinimo).filter(([, v]) => v).map(([k]) => k)
        .join(" y ")}.`
    : "El cálculo gobierna sobre la carga mínima del art. 2.1.5 en todas las magnitudes."}

### 18.2. Observaciones vigentes

${errores.length === 0 && otros.length === 0
    ? "No hay observaciones pendientes."
    : [...errores, ...otros].map(a =>
      `- **[${a.tono === "error" ? "A REVISAR" : "aviso"}] ${a.titulo}** — ${a.detalle}`)
      .join("\n")}`;
};

// ── 19 · BIBLIOGRAFÍA ──────────────────────────────────────────────────────────
export const bibliografia = ({ env }) => {
  const l = [
    "- **CIRSOC 102-2025** — Reglamento Argentino de Acción del Viento sobre las "
      + "Construcciones. INTI-CIRSOC.",
    "- **Comentarios al CIRSOC 102-2025** — INTI-CIRSOC.",
    "- **Resolución SOP 11/2026** — Aprobación y puesta en vigencia del CIRSOC 102-2025.",
  ];
  if (env?.exen?.arts?.some(a => a.id === "art_2_4_7_3" && a.declarada)) {
    l.push("- **INPRES-CIRSOC 103-2018** — Reglamento Argentino para Construcciones "
      + "Sismorresistentes. Citado por la declaración del art. 2.4.7.3.");
  }
  return `## 19. Bibliografía

${l.join("\n")}

Se cita únicamente lo efectivamente aplicado en este cálculo.`;
};

// ── EL RECUADRO DE «NO APTA PARA EMISIÓN» ──────────────────────────────────────
//
// ⚠ VA PRIMERO Y NO AL FINAL. Una memoria con un error de hipótesis se sigue pudiendo
// descargar —es un borrador y sirve para trabajar— pero tiene que decirlo antes de que
// alguien transcriba el primer número.
export const recuadroNoApta = (errores) => errores.length === 0 ? "" : `> ## ⛔ NO APTA PARA EMISIÓN
>
> Este documento tiene **${errores.length} observación${errores.length === 1 ? "" : "es"} de
> nivel error** sin resolver. Se emite como **BORRADOR DE TRABAJO**.
>
${errores.map(a => `> - **${a.titulo}** — ${a.detalle}`).join("\n")}

`;

export const encabezado = ({ d }) => {
  const p = procedenciaTexto({ proyecto: d.proyecto });
  return `# Memoria de cálculo — Acción del viento

${tabla(["", ""], p.map(([k, v]) => [`**${k}**`, v]))}
`;
};

export { si, U as UNIDADES_MEMORIA };

// ── EL PERFIL DE q_z EN LA PARED A BARLOVENTO ──────────────────────────────────
//
// Es la única superficie con presión dinámica variable, y la tabla es lo que se
// transcribe al modelo. Van los TRAMOS y no los puntos: el corte en z = 0 tiene extensión
// nula y en una tabla de áreas es un renglón con 0 que invita a sumarlo.
export const tablaPerfilQz = ({ act }) => {
  const s = act.superficies.find(x => x.id === "pared_barlovento");
  if (!s?.tramos?.length) return "";
  const filas = s.tramos.map(t => [
    `${num(U.val.longitud(t.desde), 0)} a ${num(U.val.longitud(t.hasta), 0)}`,
    num(t.kz, 3), num(t.kzt, 3), num(U.val.presion(t.q), 3),
    num(U.val.area(t.area), 2),
    t.gobierna === "inferior" ? "extremo inferior" : "extremo superior",
  ]);
  return `${tabla([`z [${U.u.longitud}]`, "K_z", "K_zt", `q_z [${U.u.presion}]`,
    `Área [${U.u.area}]`, "Gobierna"], filas)}

El área de cada tramo sale de la **forma real de la pared**, no de \`B·dz\`: en el frontón
de un hastial el ancho se va cerrando hacia la cumbrera, y multiplicar por B de más
sobreestima justamente la franja de mayor q_z y mayor brazo.`;
};

// ── COMPONENTES Y REVESTIMIENTOS — CAPÍTULO 5 ──────────────────────────────────
//
// Va DESPUÉS de todos los capítulos del SPRFV y no mezclado entre ellos: es otro camino de
// cálculo sobre el mismo edificio, y quien lee la memoria tiene que poder cerrar el
// sistema principal antes de empezar con las correas.
//
// ⚠ LAS PRESIONES DE ESTE CAPÍTULO NO SON LAS DEL CAPÍTULO 2, Y HAY QUE DECIRLO. Es el
// error de uso más caro del reglamento: dimensionar una correa con la presión del SPRFV.
// Los (GC_p) del capítulo 5 son mayores —son picos locales sobre áreas chicas— y además
// ya incluyen el factor de ráfaga.
export const componentesYRevestimientos = ({ cyr, cerr, kdCyR, nFig, nFigCurvas, bloque }) => {
  if (!cyr) return "";
  const p2 = (x) => num(x, 2);

  // ── LOS PASOS GENERALES SALEN DE LA TRAZA, NO SE REESCRIBEN ────────────────
  // El bloque `cyr` del árbol consolidado ya tiene figura, altura, q_h, `a`, (GC_pi),
  // la expresión (5.3-1) y el mínimo, cada uno con su fórmula, su «donde:» y su artículo.
  // Escribirlos otra vez acá sería la tercera versión de los mismos números —panel,
  // memoria y este capítulo— y la primera en quedar atrás.
  //
  // Los pasos POR ELEMENTO no entran: son uno por elemento y por zona, y en la memoria
  // los reemplaza la tabla de abajo, que dice lo mismo en una fila. En el panel sí están,
  // porque ahí no hay tabla.
  const generales = (bloque?.pasos ?? [])
    .filter(x => !/^cyr_(el|A|z)_/.test(x.id))
    .map(x => itemDePaso(x, "###")).join("\n");

  const cab = [
    "Las presiones de este capítulo **no son las del Capítulo 2** y no se intercambian con",
    "ellas. Los coeficientes del Capítulo 5 son picos locales sobre áreas chicas, resultan",
    "mayores que los del sistema principal, y **ya incluyen el factor de efecto de ráfaga**,",
    "que no se debe separar (art. 5.2.4).", "",
    "Se aplica la **Parte 1** del capítulo (art. 5.3), para edificios con `h ≤ 20 m`:", "",
    "```",
    "p = q_h · [ (GC_p) − (GC_pi) ]                     (5.3-1)",
    "```", "",
    "donde:", "",
    "- `q_h` — presión dinámica evaluada a la altura que define la figura. **En la Parte 1",
    "  rige también en las paredes**, a diferencia del procedimiento direccional del",
    "  Capítulo 2, donde la pared a barlovento se evalúa con `q_z` variable en altura.",
    "- `(GC_p)` — coeficiente de presión externa de la figura que corresponda, función del",
    "  **área efectiva de viento** del elemento y de la **zona** en que está.",
    "- `(GC_pi)` — coeficiente de presión interna, con **los dos signos siempre**",
    "  (nota 3 de la Tabla 1.11-1).",
  ].join("\n");

  const parametros = tablaCSVU([
    ["Figura de cubierta adoptada", "—", `**${cyr.figura ?? "no aplica"}**`, "—"],
    ["Motivo de la selección", "—", cyr.fuente?.porque ?? "—", "—"],
    ["Figura de paredes", "—", "5.3-1", "—"],
    [`Altura de referencia — ${cyr.altura.porque}`, "h",
      `**${num(U.val.longitud(cyr.altura.valor), 0)}**`, U.u.longitud],
    ["Factor topográfico — máximo entre las cuatro direcciones", "K_zt",
      num(cyr.Kzt, 3), "—"],
    ["Factor de direccionalidad — fila «Edificios, componentes y revestimientos»", "K_d",
      num(kdCyR ?? 0.85, 2), "—"],
    ["Presión dinámica a la altura de la figura", "q_h",
      `**${num(U.val.presion(cyr.qh ?? 0), 3)}**`, U.u.presion],
    [`Dimensión de borde — gobierna ${cyr.a.gobierna}`, "a",
      `**${num(U.val.longitud(cyr.a.a), 0)}**`, U.u.longitud],
    ["Coeficiente de presión interna, los dos signos", "(GC_pi)",
      `±${num(Math.abs(cerr?.gcpi ?? 0), 3)}`, "—"],
    ["Presión neta mínima de diseño — art. 5.2.2", "p_mín",
      num(U.val.presion(800), 2), U.u.presion],
  ]);

  const anchos = tabla(["Zona", "Qué mide", "Expresión", `Medida [${U.u.longitud}]`],
    (cyr.cotas ?? []).map(k => [`**${k.zona}**`, k.que, `\`${k.simbolo}\``,
      k.valor2 != null ? `${num(U.val.longitud(k.valor), 0)} × ${num(U.val.longitud(k.valor2), 0)}`
        : k.hasta != null ? `${num(U.val.longitud(k.desde), 0)} a ${num(U.val.longitud(k.hasta), 0)}`
          : k.desde != null ? `más de ${num(U.val.longitud(k.desde), 0)}`
            : k.valor != null ? num(U.val.longitud(k.valor), 0) : "—"]));

  const filas = [];
  for (const el of cyr.elementos ?? []) {
    if (el.sinFigura) {
      filas.push([`**${el.elemento.nombre ?? "—"}**`, el.superficie, "—",
        num(U.val.area(el.area.A), 2), num(U.val.area(el.area.tributaria), 2),
        "—", "—", "no se verifica", "no se verifica"]);
      continue;
    }
    for (const z of el.zonas) {
      const gob = z.zona === el.gobierna.pos || z.zona === el.gobierna.neg;
      const m = (v, activo) => (activo ? `**${v}**` : v);
      filas.push([gob ? `**${el.elemento.nombre ?? "—"}**` : (el.elemento.nombre ?? "—"),
        el.superficie, `**${z.zona}**`,
        num(U.val.area(el.area.A), 2), num(U.val.area(el.area.tributaria), 2),
        p2(z.gcpPos), p2(z.gcpNeg),
        m(num(U.val.presion(z.pPos), 3), z.zona === el.gobierna.pos),
        m(num(U.val.presion(z.pNeg), 3), z.zona === el.gobierna.neg)]);
    }
  }

  const tablaElementos = filas.length === 0
    ? "_No se cargaron elementos para verificar._"
    : tabla(["Elemento", "Superficie", "Zona", `A efectiva [${U.u.area}]`,
      `A tributaria [${U.u.area}]`, "(GC_p)+", "(GC_p)−",
      `p+ [${U.u.presion}]`, `p− [${U.u.presion}]`], filas);

  const conMinimo = (cyr.elementos ?? []).some(e => e.minimoGobiernaAlgo);
  const avisos = (cyr.avisos ?? []).filter(a => a.nivel === "error" || a.nivel === "aviso");

  return [
    cab, "",
    generales || ["### Parámetros del cálculo", "",
      "Ninguno es dato nuevo: todos salen de los capítulos anteriores de esta memoria.", "",
      parametros].join("\n"), "",
    "### Zonas y sus anchos", "",
    "Son las medidas que se transcriben al plano de revestimiento y de correas.", "",
    anchos, "",
    figura(nFig, "zonas de componentes y revestimientos, en planta de cubierta y elevación de pared"),
    "",
    "### Curvas (GC_p) usadas", "",
    "El coeficiente de cada elemento se lee de estas curvas con su área efectiva de",
    "viento. Son los mismos puntos de quiebre que usa el cálculo, ya con las notas de la",
    "figura aplicadas —la reducción del 10 % en paredes y las sustituciones del parapeto—.",
    "",
    figura(nFigCurvas, `curvas (GC_p) usadas, Fig. ${cyr.figura} y Fig. 5.3-1`), "",
    "### Elementos verificados", "",
    "El `(GC_p)` se lee con el **área efectiva de viento** y la presión se aplica sobre el",
    "**área tributaria real** (C 1.2): son dos áreas distintas y la tabla informa las dos.",
    "Se listan **todas las zonas** de la figura, no sólo la gobernante: el mismo elemento",
    "tipo se usa en varias zonas de la obra. La zona gobernante de cada sentido va en",
    "negrita.", "",
    tablaElementos, "",
    conMinimo
      ? "⚠ En los valores marcados con el mínimo, la presión adoptada es la **mínima de "
        + `${num(U.val.presion(800), 2)} ${U.u.presion}` + " del art. 5.2.2 y no la que "
        + "resulta de la expresión (5.3-1). No confundir con el mínimo de 0,75 kN/m² del "
        + "art. 2.1.5, que es del SPRFV y se aplica sobre el área proyectada del edificio."
      : "",
    avisos.length
      ? `\n${avisos.map(a => `⚠ **${a.ref ?? "Aviso"}** — ${a.texto}`).join("\n\n")}`
      : "",
  ].filter(Boolean).join("\n");
};
