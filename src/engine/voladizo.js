// VOLADIZOS DE CUBIERTA — la prolongación del faldón más allá de la línea de pared.
//
// ── QUÉ ES Y QUÉ NO ES ──────────────────────────────────────────────────────────
// Un voladizo es la MISMA cubierta que sigue de largo: igual pendiente, igual estructura.
// No es un alero adosado a una pared, que es otra tipología con su propio artículo —el
// 5.9— y sus propias figuras. El comentario C 5.9 lo dice con todas las letras: «Los
// aleros adosados son diferentes de los voladizos de cubierta, que son simplemente
// extensiones de las cubiertas, de igual pendiente».
//
// ── EL MODELO: CUATRO BORDES ────────────────────────────────────────────────────
// Adentro, un voladizo son CUATRO VUELOS, uno por borde de la planta: `+X`, `−X`, `+Y`,
// `−Y`. No es una elección de comodidad: el reglamento trata distinto el voladizo a
// BARLOVENTO que los demás (art. 2.4.4), y cuál es el de barlovento depende de la
// dirección de viento que se esté analizando. Con un solo número «vuelo» no se puede
// responder esa pregunta.
//
// La pantalla los agrupa por tipo de cubierta —aleros y hastiales en dos aguas, perimetral
// en plana y cuatro aguas, alero alto / bajo / laterales en vertiente única— porque es
// como se piensa el vuelo al proyectar. La agrupación es de PRESENTACIÓN: el motor
// siempre ve los cuatro bordes.
//
// ── LO QUE EL VOLADIZO CAMBIA, Y LO QUE NO ──────────────────────────────────────
// ⚠ NO CAMBIA `h`. La altura media de cubierta se mide sobre la línea de PARED, y el
// voladizo no levanta el edificio. Tampoco cambia el área de las paredes.
//
// SÍ cambia:
//   · el área de cubierta que recibe levantamiento, y el BRAZO de esa área respecto del
//     centro —parte de ella queda fuera de la línea de pared, así que aporta más al
//     vuelco que el mismo metro cuadrado adentro—;
//   · en el capítulo 5, la DISTANCIA AL BORDE: la nota 7 de la Fig. 5.3-2A dice que «la
//     dimensión horizontal menor del edificio no incluirá ninguna dimensión de voladizo,
//     pero la distancia al borde, a, se medirá desde el borde exterior del voladizo».
//     O sea: `a` se calcula con el edificio y se aplica sobre la planta de la CUBIERTA.

/** Los cuatro bordes de la planta, por el sentido de su normal exterior. */
export const BORDES = /** @type {const} */ (["+X", "-X", "+Y", "-Y"]);

const num = (v, d = 0) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : d;
};

/**
 * Cómo se agrupan los cuatro bordes en la pantalla, por tipo de cubierta.
 *
 * `bordes` es una función de la geometría porque en dos aguas cuáles son los aleros y
 * cuáles los hastiales depende de sobre qué eje corre la cumbrera, y en vertiente única
 * cuál alero es el alto depende de hacia dónde desciende la pendiente.
 */
export const GRUPOS = {
  plana: () => [
    { id: "perimetral", label: "Vuelo perimetral", bordes: [...BORDES] },
  ],
  cuatro_aguas: () => [
    { id: "perimetral", label: "Vuelo perimetral", bordes: [...BORDES] },
  ],
  dos_aguas: ({ cumbrera }) => (cumbrera === "X"
    // Cumbrera según X: los aleros son los bordes normales a Y y los hastiales los de X.
    ? [{ id: "aleros", label: "Vuelo en aleros", bordes: ["+Y", "-Y"] },
       { id: "hastiales", label: "Vuelo en hastiales", bordes: ["+X", "-X"] }]
    : [{ id: "aleros", label: "Vuelo en aleros", bordes: ["+X", "-X"] },
       { id: "hastiales", label: "Vuelo en hastiales", bordes: ["+Y", "-Y"] }]),
  vertiente_unica: ({ pendienteHacia }) => {
    const bajo = pendienteHacia;
    const alto = bajo.startsWith("+") ? `-${bajo.slice(1)}` : `+${bajo.slice(1)}`;
    const laterales = BORDES.filter(b => b !== bajo && b !== alto);
    return [
      { id: "alto", label: "Vuelo en el alero alto", bordes: [alto] },
      { id: "bajo", label: "Vuelo en el alero bajo", bordes: [bajo] },
      { id: "laterales", label: "Vuelo en los laterales", bordes: laterales },
    ];
  },
};

/** Los grupos que corresponden a una geometría, con el tipo ya normalizado. */
export const gruposDe = (geo) => (GRUPOS[geo.tipo] ?? GRUPOS.plana)(geo);

/**
 * Normaliza lo que trae el formulario a los cuatro vuelos, en metros.
 *
 * @param {any} v          el sub-objeto `voladizo` del proyecto
 * @param {{tipo: string, cumbrera: string, pendienteHacia: string}} geo
 * @returns {{hay: boolean, modo: "simetrico"|"porLado", porBorde: Record<string, number>,
 *            grupos: {id: string, label: string, bordes: string[], vuelo: number}[]}}
 */
export function normalizarVoladizo(v, geo) {
  const modo = v?.modo === "porLado" ? "porLado" : "simetrico";
  const grupos = gruposDe(geo);
  /** @type {Record<string, number>} */
  const porBorde = { "+X": 0, "-X": 0, "+Y": 0, "-Y": 0 };

  if (modo === "porLado") {
    for (const b of BORDES) porBorde[b] = Math.max(0, num(v?.porBorde?.[b]));
  } else {
    // Simétrico: un número por GRUPO, que se reparte a sus bordes.
    for (const g of grupos) {
      const vuelo = Math.max(0, num(v?.grupos?.[g.id]));
      for (const b of g.bordes) porBorde[b] = vuelo;
    }
  }
  const hay = BORDES.some(b => porBorde[b] > 1e-9);
  return {
    hay, modo, porBorde,
    grupos: grupos.map(g => ({ ...g, vuelo: porBorde[g.bordes[0]] })),
  };
}

/**
 * La planta de la CUBIERTA, con los vuelos sumados, y de dónde a dónde va respecto de la
 * planta del edificio.
 *
 * `x0` e `y0` son negativos o cero: es cuánto sobresale la cubierta antes del origen de
 * la planta del edificio. Sirven para dibujar y para clasificar zonas sobre la cubierta.
 */
export function plantaDeCubierta(geo, vol) {
  const { porBorde } = vol;
  return {
    x0: -porBorde["-X"], y0: -porBorde["-Y"],
    ancho: geo.a + porBorde["-X"] + porBorde["+X"],
    largo: geo.b + porBorde["-Y"] + porBorde["+Y"],
  };
}

/**
 * El vuelo del borde a BARLOVENTO para una dirección de viento.
 *
 * ⚠ EL BORDE A BARLOVENTO ES EL QUE MIRA CONTRA EL VIENTO. Con viento según +X, la cara
 * que el viento golpea primero es la que mira a −X: su normal exterior apunta al viento.
 * Es la misma convención que usa `fachadas.js`, y equivocarla pone la presión positiva de
 * la cara inferior del voladizo en el borde de sotavento, que es donde justamente no va.
 *
 * @param {{eje: "X"|"Y", signo: 1|-1}} dir
 */
export function vueloABarlovento(vol, dir) {
  const borde = `${dir.signo > 0 ? "-" : "+"}${dir.eje}`;
  return vol.porBorde[borde] ?? 0;
}

/**
 * El área de cubierta que aporta el voladizo y el brazo de su resultante.
 *
 * `area` es la proyección horizontal —que es la que recibe el levantamiento— y `brazo` la
 * distancia de su centro de gravedad al centro de la planta del EDIFICIO, medida sobre el
 * eje del viento. El brazo importa: un metro cuadrado de cubierta fuera de la línea de
 * pared aporta más al vuelco que el mismo metro cuadrado adentro, y el voladizo está todo
 * afuera.
 *
 * @param {{eje: "X"|"Y", signo: 1|-1}} dir
 */
export function aporteDeVoladizo(geo, vol, dir) {
  const ejeX = dir.eje === "X";
  const L = ejeX ? geo.a : geo.b;          // dimensión sobre el eje del viento
  const B = ejeX ? geo.b : geo.a;          // dimensión normal al viento
  const bar = `${dir.signo > 0 ? "-" : "+"}${dir.eje}`;
  const sot = `${dir.signo > 0 ? "+" : "-"}${dir.eje}`;
  const lateral = BORDES.filter(b => !b.endsWith(dir.eje));

  const vBar = vol.porBorde[bar], vSot = vol.porBorde[sot];
  const anchoConLaterales = B + lateral.reduce((t, b) => t + vol.porBorde[b], 0);

  // Las dos franjas normales al viento, más las dos laterales. Las esquinas se cuentan
  // UNA vez: van con las franjas de barlovento y sotavento, que ya llevan el ancho total.
  const franjas = [
    { nombre: "barlovento", area: vBar * anchoConLaterales, brazo: -(L / 2 + vBar / 2) },
    { nombre: "sotavento", area: vSot * anchoConLaterales, brazo: L / 2 + vSot / 2 },
    ...lateral.map(b => ({ nombre: `lateral ${b}`, area: vol.porBorde[b] * L, brazo: 0 })),
  ].filter(f => f.area > 1e-9);

  const area = franjas.reduce((t, f) => t + f.area, 0);
  return { area, franjas, vueloBarlovento: vBar, vueloSotavento: vSot };
}
