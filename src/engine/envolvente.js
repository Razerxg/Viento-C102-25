// ENVOLVENTE DE CASOS DE CARGA — Figura 2.4-8 y art. 2.4.7.
//
// ── QUÉ FALTABA ────────────────────────────────────────────────────────────────
// La app calculaba una dirección por vez y con UN signo de GC_pi. Lo que el diseño
// necesita es la envolvente de todo lo que el reglamento exige considerar:
//
//   4 direcciones × 2 signos de GC_pi × 2 casos de la nota 3 × 4 casos de la Figura 2.4-8
//
// y, dentro de los casos con torsión, los dos signos de la excentricidad. Mirar una sola
// dirección con un solo signo puede dejar afuera justo la combinación que gobierna.
//
// ── LOS CUATRO CASOS ───────────────────────────────────────────────────────────
//   Caso 1  presión total sobre la proyección normal a CADA eje, por separado.
//   Caso 2  el 75 % del caso 1 —paredes Y cubierta— más torsión, por eje.
//   Caso 3  los dos ejes SIMULTÁNEOS, paredes al 75 %.
//   Caso 4  los dos ejes simultáneos, paredes al 56,3 %, más torsión en los dos ejes.
//
// ⚠ EN LOS CASOS 3 Y 4 LA CUBIERTA NO VA AL 75 %. La nota 2 de la figura dice que va al
// 100 % de la mayor presión —del caso 1 para el 3, del caso 2 para el 4— SOBRE CADA ÁREA,
// considerando las dos direcciones principales. O sea que el levantamiento no se reduce
// por el factor de los dos ejes simultáneos, que es justo lo contrario de lo que uno
// supondría al leer «75 % en los dos ejes».
//
// ── POR QUÉ LOS DOS CASOS DE LA NOTA 3 TAMBIÉN ENTRAN AL BARRIDO ───────────────
// Los dos valores del faldón a barlovento de la Figura 2.4-1 son ESTADOS DE CARGA
// distintos, no dos lecturas del mismo. Una versión anterior de este archivo elegía para
// la cubierta el caso que gobernaba el CORTE y con ese armaba también el levantamiento y
// el vuelco: el estado resultante no era ninguno de los dos y podía subestimar el
// levantamiento, que es justo la magnitud que el caso positivo agrava.
import { aporteParedes, aporteCubierta } from './resultantes.js';
import { DIRECCIONES } from './edificio.js';

/**
 * Los cuatro casos de la Figura 2.4-8.
 *
 * ⚠ LOS DOS CASOS TORSIONALES APLICAN A EDIFICIOS DE TODAS LAS ALTURAS. En el CIRSOC
 * 102-2005 estaban limitados a h > 20 m; omitirlos en un galpón bajo era correcto con la
 * edición anterior y ya no lo es. Sólo se saltean por la exención del art. 2.4.7.
 *
 * `factorPared` es el que afecta a las paredes. `factorCubierta` es el de la cubierta, y
 * NO siempre coincide: en los casos 3 y 4 la nota 2 la deja al 100 % de la presión del
 * caso base —el 1 para el 3, el 2 para el 4— sobre cada área.
 */
export const CASOS_CARGA = [
  { n: 1, label: "Caso 1 — presión total, cada eje por separado",
    factorPared: 1.0, factorCubierta: 1.0, simultaneo: false, torsion: false },
  { n: 2, label: "Caso 2 — 75 % con torsión, cada eje por separado",
    factorPared: 0.75, factorCubierta: 0.75, simultaneo: false, torsion: true, mt: 0.75 },
  { n: 3, label: "Caso 3 — los dos ejes simultáneos, paredes al 75 %",
    factorPared: 0.75, factorCubierta: 1.0, simultaneo: true, torsion: false, base: 1 },
  { n: 4, label: "Caso 4 — los dos ejes simultáneos, paredes al 56,3 %, con torsión",
    factorPared: 0.563, factorCubierta: 0.75, simultaneo: true, torsion: true,
    mt: 0.563, base: 2 },
];

/** Los dos signos de GC_pi. Los dos entran siempre: ninguno domina las tres magnitudes. */
export const SIGNOS_GCPI = ["conInternaPos", "conInternaNeg"];
/** Los dos valores del faldón a barlovento que exige la nota 3 de la Figura 2.4-1. */
export const CASOS_NOTA3 = /** @type {const} */ (["negativo", "positivo"]);
/**
 * Las dos envolventes por área de la nota 2, en los casos simultáneos.
 *
 * «La mayor presión sobre cada área» no dice «la mayor succión»: hay que envolver en los
 * dos sentidos. La de arriba gobierna el levantamiento y el anclaje; la de abajo, la
 * compresión de correas y la flexión de los pórticos.
 */
export const SENTIDOS_CUBIERTA = /** @type {const} */ (["arriba", "abajo"]);

/** Excentricidad de la carga, para los casos torsionales. */
export const E_RIGIDA = 0.15;

/**
 * CONDICIONES DEL ART. 2.4.7.2 — las que la app puede contrastar con el modelo.
 *
 * Cumplida CUALQUIERA de las tres, los casos torsionales 2 y 4 quedan exceptuados y sólo
 * se verifican el 1 y el 3. `verifica` devuelve lo que la geometría dice de la condición,
 * cuando dice algo: la app no sabe cuántas plantas tiene el edificio —no es un dato del
 * modelo— pero sí sabe su altura, y puede desmentir una declaración imposible.
 */
export const CONDICIONES_247_2 = [
  { id: "una_planta", ref: "art. 2.4.7.2",
    label: "Edificio de UNA PLANTA con altura de cubierta h ≤ 10 m",
    verifica: ({ h }) => h <= 10,
    contra: "La altura media de cubierta supera los 10 m, así que esta condición no se "
      + "cumple aunque el edificio sea de una sola planta." },
  { id: "dos_livianas", ref: "art. 2.4.7.2",
    label: "Edificio de hasta DOS PLANTAS con entramado liviano",
    verifica: () => null, contra: "" },
  { id: "dos_flexibles", ref: "art. 2.4.7.2",
    label: "Edificio de hasta DOS PLANTAS con diafragmas flexibles",
    verifica: () => null, contra: "" },
];

/**
 * CONDICIONES DE LOS ART. 2.4.7.3 A 2.4.7.5 — declaración del proyectista.
 *
 * ⚠ EL TEXTO DE ESTOS ARTÍCULOS NO ESTÁ TRANSCRIPTO. Son condiciones sobre la
 * distribución de rigideces y la regularidad torsional del edificio, que dependen del
 * modelo estructural y no de la geometría de la envolvente: nada de lo que esta app
 * calcula alcanza para verificarlas. Se registran como declaración del proyectista, con
 * la cita del artículo y el fundamento que él escriba, para que quien revise la memoria
 * sepa contra qué contrastar. Poner acá un resumen del texto sería peor que no ponerlo:
 * invitaría a tildar la casilla sin abrir el reglamento.
 */
export const ARTICULOS_247_DECLARADOS = [
  { id: "art_2_4_7_3", ref: "art. 2.4.7.3",
    label: "Se verificaron las condiciones del art. 2.4.7.3" },
  { id: "art_2_4_7_4", ref: "art. 2.4.7.4",
    label: "Se verificaron las condiciones del art. 2.4.7.4" },
  { id: "art_2_4_7_5", ref: "art. 2.4.7.5",
    label: "Se verificaron las condiciones del art. 2.4.7.5" },
];

/** Cómo se comporta el diafragma. Decide cómo se APLICA M_T, no cuánto vale. */
export const DIAFRAGMAS = [
  { id: "rigido", label: "Diafragma rígido continuo",
    nota: "Nota 4: el momento torsor se aplica como tal sobre el diafragma, que lo "
      + "reparte entre los planos resistentes según sus rigideces." },
  { id: "flexible", label: "Diafragma flexible",
    nota: "Nota 4: sin diafragma rígido no hay pieza que tome el momento torsor "
      + "concentrado. Se reemplaza por el BLOQUE DE PRESIÓN DISTRIBUIDA sobre las paredes "
      + "con presión normal, que es la forma en que la figura lo dibuja." },
  { id: "sin", label: "Sin diafragma",
    nota: "Nota 4: sin diafragma no hay pieza que tome el momento torsor concentrado. "
      + "Se reemplaza por el BLOQUE DE PRESIÓN DISTRIBUIDA sobre las paredes con presión "
      + "normal." },
];

/**
 * Evalúa la exención del art. 2.4.7.
 *
 * @param {object} o
 * @param {string[]} [o.cond247]   ids de `CONDICIONES_247_2` declarados
 * @param {string[]} [o.arts247]   ids de `ARTICULOS_247_DECLARADOS` declarados
 * @param {string} [o.fundamento]  qué escribió el proyectista
 * @param {number} o.h             altura media de cubierta, para contrastar
 */
export function exencion247({ cond247 = [], arts247 = [], fundamento = "", h }) {
  const detalle = CONDICIONES_247_2.map(cd => {
    const declarada = cond247.includes(cd.id);
    const geo = cd.verifica({ h });
    return { id: cd.id, ref: cd.ref, label: cd.label, declarada,
      // `null` = la app no tiene con qué opinar. `false` = la geometría la desmiente, y
      // eso pesa más que la casilla: una condición imposible no exime de nada.
      geo, desmentida: declarada && geo === false, contra: cd.contra };
  });
  const arts = ARTICULOS_247_DECLARADOS.map(a => ({ ...a, declarada: arts247.includes(a.id) }));
  const valida = detalle.some(x => x.declarada && x.geo !== false)
    || arts.some(x => x.declarada);
  return { exento: valida, detalle, arts, fundamento,
    desmentidas: detalle.filter(x => x.desmentida),
    sinFundamento: valida && String(fundamento).trim() === "" };
}

/**
 * Excentricidad `e`, en metros.
 *
 * En estructuras RÍGIDAS vale ±0,15·B, con el signo más desfavorable —por eso la
 * envolvente barre los dos—. En FLEXIBLES la figura remite a la expresión (2.4-5), que
 * combina la excentricidad elástica con la resonante y no es un simple 0,15·B.
 *
 * ⚠ LA (2.4-5) NO ESTÁ TRANSCRIPTA. Necesita `e_Q`, `e_R`, `g_Q`, `g_R` y los factores de
 * respuesta de fondo y resonante del art. 1.9.5, que hoy no son datos del modelo. Mientras
 * tanto se usa 0,15·B también en flexibles, que es lo que la figura da para rígidas, y se
 * avisa: puede quedar del lado inseguro.
 */
export function excentricidad({ B, flexible }) {
  return {
    e: E_RIGIDA * B,
    aproximada: !!flexible,
    ref: flexible ? "Figura 2.4-8 · expresión (2.4-5)" : "Figura 2.4-8",
    nota: flexible
      ? "Estructura FLEXIBLE: la figura remite a la expresión (2.4-5), que combina la "
        + "excentricidad elástica con la resonante. No está transcripta —necesita e_Q, "
        + "e_R, g_Q, g_R y los factores de respuesta del art. 1.9.5— así que se adopta "
        + "0,15·B, que es el valor de estructuras rígidas. PUEDE QUEDAR DEL LADO INSEGURO."
      : "Estructura rígida: e = ±0,15·B, con el signo más desfavorable.",
  };
}

/**
 * Los datos de UNA dirección, en UN estado de presión interna y UN caso de la nota 3,
 * descompuestos para poder recombinarlos.
 *
 * Se guardan las partes por separado —pared y cubierta— porque los casos 3 y 4 las
 * afectan con factores DISTINTOS, y escalar el total agregado daría otro número.
 *
 * @param {any} analisis
 * @param {object} o
 * @param {string} [o.casoInterno] @param {"negativo"|"positivo"} [o.casoNota3]
 * @param {boolean} [o.pisoSolidario] @param {boolean} [o.exentoNota7]
 */
export function baseDireccion(analisis, { casoInterno = "conInternaPos",
  casoNota3 = "negativo", pisoSolidario = false, exentoNota7 = false } = {}) {
  const par = aporteParedes({ analisis });
  const cub = aporteCubierta({ analisis, casoNota3, casoInterno, pisoSolidario });
  return {
    dir: analisis.dir, eje: analisis.dir.eje, signo: analisis.dir.signo,
    casoInterno, casoNota3,
    L: analisis.L, B: analisis.B, h: analisis.geo.h,
    Fpar: par.F, Mpar: par.M,
    Hcub: cub.H, Vcub: cub.V, xV: cub.xV,
    // Las zonas de cubierta en coordenada de PLANTA, para la envolvente por área de la
    // nota 2. `u0`/`u1` van de 0 a la dimensión del eje, en el sentido del eje y no del
    // viento: con viento negativo el borde de barlovento está en el extremo lejano.
    zonas: cub.partes.map(p => {
      const largo = analisis.L;
      const [u0, u1] = analisis.dir.signo > 0
        ? [p.desde, p.hasta] : [largo - p.hasta, largo - p.desde];
      return { u0, u1, p: p.p, vertical: p.vertical };
    }),
    exentoNota7,
  };
}

/**
 * ENVOLVENTE DE LA CUBIERTA POR ÁREA — nota 2 de la Figura 2.4-8.
 *
 * Para los casos simultáneos, la cubierta toma en CADA ÁREA la mayor de las presiones de
 * las dos direcciones principales. No es lo mismo que tomar el mayor de los dos totales:
 * las dos direcciones zonifican la planta de maneras distintas —cada una en franjas desde
 * SU borde de barlovento— así que la envolvente por área es más grande que cualquiera de
 * las dos, y quedarse con el mayor total la subestimaría.
 *
 * Las dos zonificaciones son ortogonales, así que la grilla es el producto de las dos y la
 * integración es exacta: en cada celda se toma la presión mayor en valor absoluto de
 * levantamiento y se integra.
 */
export function envolventeCubierta(bx, by, sentido = "arriba") {
  // Presión de levantamiento por unidad de área, positiva hacia arriba.
  const pDe = (z) => -z.p;
  // ⚠ LA NOTA 2 DICE «LA MAYOR PRESIÓN», NO «LA MAYOR SUCCIÓN». Con las dos direcciones
  // succionando, la envolvente hacia arriba es la que manda y la de abajo no aporta. Pero
  // una cubierta poco inclinada con viento normal recibe PRESIÓN sobre el faldón a
  // barlovento —el segundo valor de la nota 3, e incluso el primero a partir de cierto
  // θ—, y ahí la envolvente hacia arriba se queda con la MENOR de las dos presiones
  // descendentes, que es lo contrario de envolver. Son dos envolventes, no una: la de
  // arriba gobierna el levantamiento y el anclaje, la de abajo la compresión de correas y
  // la flexión de los pórticos.
  const mejor = sentido === "abajo"
    ? (a, b) => Math.min(a, b)      // la MÁS descendente: la más negativa en levantamiento
    : (a, b) => Math.max(a, b);
  const celdas = [];
  for (const zx of bx.zonas) {
    for (const zy of by.zonas) {
      const dx = zx.u1 - zx.u0, dy = zy.u1 - zy.u0;
      if (!(dx > 0) || !(dy > 0)) continue;
      const p = mejor(pDe(zx), pDe(zy));
      celdas.push({ x0: zx.u0, x1: zx.u1, y0: zy.u0, y1: zy.u1, p, area: dx * dy });
    }
  }
  const V = celdas.reduce((a, c) => a + c.p * c.area, 0);
  const sx = celdas.reduce((a, c) => a + c.p * c.area * (c.x0 + c.x1) / 2, 0);
  const sy = celdas.reduce((a, c) => a + c.p * c.area * (c.y0 + c.y1) / 2, 0);
  return { V, sentido, xBar: Math.abs(V) > 1e-12 ? sx / V : null,
    yBar: Math.abs(V) > 1e-12 ? sy / V : null, celdas };
}

/** El brazo en planta, medido desde el borde de BARLOVENTO de esta dirección. */
const brazoDesdeBarlovento = (b, uBar) => (b.signo > 0 ? uBar : b.L - uBar);

/**
 * Un estado de carga completo, con sus resultantes.
 *
 * `cortante` es el módulo de la resultante horizontal: en los casos simultáneos las dos
 * componentes son ortogonales, así que se compone por Pitágoras.
 */
export function armarEstado({ caso, bx, by, eSigno, flexible, diafragma = "rigido",
  sentidoCubierta = "arriba" }) {
  const partes = [bx, by].filter(Boolean);
  const fp = caso.factorPared, fc = caso.factorCubierta;

  // ── CORTE POR EJE ─────────────────────────────────────────────────────────────
  // La nota 7 se aplica dentro de cada eje: el corte de un eje no puede quedar por debajo
  // del de sus paredes solas.
  const corteDe = (b) => {
    if (!b) return 0;
    const conCubierta = fp * b.Fpar + fc * b.Hcub;
    return b.exentoNota7 ? conCubierta : Math.max(conCubierta, fp * b.Fpar);
  };
  const Vx = corteDe(bx);
  const Vy = corteDe(by);
  const cortante = Math.hypot(Vx, Vy);

  // ── LEVANTAMIENTO ─────────────────────────────────────────────────────────────
  // En los casos simultáneos, la nota 2: la mayor presión de las dos direcciones SOBRE
  // CADA ÁREA. En los casos por eje, la de esa dirección.
  let V, arm = {};
  if (caso.simultaneo && bx && by) {
    const env = envolventeCubierta(bx, by, sentidoCubierta);
    V = fc * env.V;
    arm = { x: brazoDesdeBarlovento(bx, env.xBar ?? 0),
      y: brazoDesdeBarlovento(by, env.yBar ?? 0), porArea: true };
  } else {
    const b = /** @type {any} */ (bx ?? by);
    V = fc * b.Vcub;
    arm = { [b.eje === "X" ? "x" : "y"]: b.xV, porArea: false };
  }

  // ── VUELCO, POR EJE ───────────────────────────────────────────────────────────
  // Respecto del centro de la base, con la convención de siempre: positivo = tiende a
  // levantar el borde de barlovento de ese eje.
  const vuelcoDe = (b, brazo) => {
    if (!b) return 0;
    const horiz = fp * b.Mpar + fc * b.Hcub * b.h;
    const vert = brazo == null ? 0 : V * (b.L / 2 - brazo);
    return horiz + vert;
  };
  const Mx = vuelcoDe(bx, bx ? arm.x : null);
  const My = vuelcoDe(by, by ? arm.y : null);

  // ── TORSIÓN ───────────────────────────────────────────────────────────────────
  // M_T = f·(P_W + P_L)·B·e integrado en altura, que es f·F_paredes·e: el producto de
  // presiones por B integrado sobre la altura ES la fuerza total de las paredes.
  let MT = 0, eDet = null;
  if (caso.torsion) {
    eDet = partes.map(b => {
      const ex = excentricidad({ B: b.B, flexible });
      return { eje: b.eje, B: b.B, e: eSigno * ex.e, aproximada: ex.aproximada, nota: ex.nota };
    });
    MT = eDet.reduce((a, x, i) => a + caso.mt * partes[i].Fpar * x.e, 0);
  }
  // NOTA 4: el momento torsor se aplica SOBRE EL DIAFRAGMA RÍGIDO. Con diafragma flexible
  // o sin diafragma no hay pieza que lo tome concentrado y hay que reemplazarlo por el
  // bloque de presión distribuida sobre las paredes con presión normal. El valor de M_T
  // sigue siendo el mismo: lo que cambia es cómo se aplica, y eso no lo puede decidir
  // esta función.
  const comoBloque = caso.torsion && diafragma !== "rigido";

  return {
    caso: caso.n, label: caso.label,
    // Sólo los casos simultáneos tienen dos envolventes de cubierta; en los de un eje la
    // presión de la zona es la que es y no hay nada que envolver.
    sentidoCubierta: caso.simultaneo ? sentidoCubierta : null,
    casoInterno: partes[0].casoInterno,
    casoNota3: partes.map(b => b.casoNota3).join("/"),
    eSigno: caso.torsion ? eSigno : null,
    dirs: partes.map(b => b.dir.id),
    Vx, Vy, cortante, levantamiento: V, MT, comoBloque,
    vuelco: Math.max(Math.abs(Mx), Math.abs(My)),
    Mx, My, brazo: arm, excentricidades: eDet,
    factorPared: fp, factorCubierta: fc,
  };
}

/** Clave de la tabla de bases: dirección × signo de GC_pi × caso de la nota 3. */
const clave = (dirId, casoInterno, casoNota3) => `${dirId}|${casoInterno}|${casoNota3}`;

/**
 * TODOS los estados que el reglamento exige considerar.
 *
 * @param {object} e
 * @param {(entrada:any, dir:any)=>any} e.analizar  cómo obtener el análisis de una dirección
 * @param {any} e.entrada
 * @param {object} [e.opc]
 * @param {boolean} [e.opc.exentoArt247]  se cumplen las condiciones del art. 2.4.7
 * @param {boolean} [e.opc.flexible]      estructura flexible: e sale de la (2.4-5)
 * @param {string} [e.opc.diafragma]      "rigido" | "flexible" | "sin"
 * @param {boolean} [e.opc.porticosCubierta] @param {boolean} [e.opc.pisoSolidario]
 */
export function estadosDeCarga({ analizar, entrada, opc = {} }) {
  // ── EXENCIÓN DEL ART. 2.4.7 ───────────────────────────────────────────────────
  // Cumpliendo las condiciones del artículo se verifican SÓLO los casos 1 y 3: los dos
  // torsionales quedan exceptuados.
  const casos = opc.exentoArt247 ? CASOS_CARGA.filter(c => !c.torsion) : CASOS_CARGA;
  const exentoNota7 = opc.porticosCubierta === true;
  const pisoSolidario = opc.pisoSolidario === true;
  const diafragma = opc.diafragma ?? "rigido";

  // El análisis de presiones NO depende del signo de GC_pi ni del caso de la nota 3 —los
  // dos valores viajan dentro de cada superficie—, así que se hace una vez por dirección
  // y se recombina. Al revés serían dieciséis análisis completos para nada.
  const bases = {};
  for (const d of DIRECCIONES) {
    const analisis = analizar(entrada, d);
    for (const casoInterno of SIGNOS_GCPI)
      for (const casoNota3 of CASOS_NOTA3)
        bases[clave(d.id, casoInterno, casoNota3)] = baseDireccion(analisis,
          { casoInterno, casoNota3, pisoSolidario, exentoNota7 });
  }
  const porEje = { X: DIRECCIONES.filter(d => d.eje === "X"),
    Y: DIRECCIONES.filter(d => d.eje === "Y") };

  const estados = [];
  for (const casoInterno of SIGNOS_GCPI) {
    for (const caso of casos) {
      const signosE = caso.torsion ? [+1, -1] : [0];
      for (const eSigno of signosE) {
        if (!caso.simultaneo) {
          // Un eje por vez: las cuatro direcciones, cada una sola, en sus dos casos de
          // la nota 3.
          for (const d of DIRECCIONES) for (const n3 of CASOS_NOTA3) {
            const b = bases[clave(d.id, casoInterno, n3)];
            estados.push(armarEstado({ caso, bx: d.eje === "X" ? b : null,
              by: d.eje === "Y" ? b : null, eSigno, flexible: opc.flexible, diafragma }));
          }
        } else {
          // Los dos ejes a la vez: las cuatro combinaciones de sentidos, y dentro de cada
          // una los dos casos de la nota 3 de CADA eje por separado. Son estados de carga
          // independientes: nada obliga a que los dos ejes adopten el mismo.
          for (const dx of porEje.X) for (const dy of porEje.Y)
            for (const nx of CASOS_NOTA3) for (const ny of CASOS_NOTA3)
              // Las DOS envolventes de cubierta de la nota 2: la que maximiza el
              // levantamiento y la que maximiza la presión hacia abajo. Con las dos
              // direcciones succionando, la segunda no aporta nada y queda dominada; con
              // presión sobre el faldón a barlovento, es la que gobierna.
              for (const sentidoCubierta of SENTIDOS_CUBIERTA) {
                estados.push(armarEstado({ caso,
                  bx: bases[clave(dx.id, casoInterno, nx)],
                  by: bases[clave(dy.id, casoInterno, ny)],
                  eSigno, flexible: opc.flexible, diafragma, sentidoCubierta }));
              }
        }
      }
    }
  }
  return estados;
}

/** La envolvente: por cada magnitud, el máximo en valor absoluto y de qué estado salió. */
export function envolventeCritica(estados) {
  const de = (k) => {
    const g = estados.reduce((a, b) => (Math.abs(b[k]) > Math.abs(a[k]) ? b : a), estados[0]);
    return { valor: g[k], estado: g };
  };
  return {
    cortante: de("cortante"), levantamiento: de("levantamiento"),
    vuelco: de("vuelco"), torsion: de("MT"),
    // Que HAYA casos torsionales en el barrido es lo que distingue «torsión nula» de
    // «torsión no verificada»: sin este dato la pantalla no puede decir cuál de las dos.
    conTorsion: estados.some(e => e.caso === 2 || e.caso === 4),
    comoBloque: estados.some(e => e.comoBloque),
    estados,
  };
}
