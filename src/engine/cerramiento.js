// CLASIFICACIÓN DE CERRAMIENTO A PARTIR DE LAS ABERTURAS — arts. 1.2, 1.10 y 1.11.
//
// ── POR QUÉ ES LA DECISIÓN DE PROYECTO QUE MÁS PESA ─────────────────────────────
// Entre «cerrado» y «parcialmente cerrado» hay un factor de TRES en la presión interna
// —±0,18 contra ±0,55— y en una cubierta liviana eso decide el levantamiento. Hasta ahora
// la app pedía la clasificación como un dato: un desplegable con cuatro opciones y ninguna
// forma de saber si la elegida era la que correspondía.
//
// La sensibilidad es brutal y poco intuitiva: en un galpón, UNA sola puerta que pueda
// quedar abierta lo vuelve parcialmente cerrado (±0,55); DOS puertas, una en cada pared
// opuesta, lo devuelven a parcialmente abierto (±0,18), porque la segunda equilibra la
// presión. Es exactamente el tipo de resultado que hay que ver calculado y no recordar.
//
// ── EL PROCEDIMIENTO DEL ART. 1.10.2 ────────────────────────────────────────────
// Cada pared se supone A BARLOVENTO, una por vez, y se comparan sus aberturas contra las
// del RESTO de la envolvente —cubierta incluida—. El edificio se clasifica por la pared
// más desfavorable. Por eso la salida es una tabla por pared y no un número.
import { fachada } from './fachadas.js';
import { CERRAMIENTOS, ri } from '../constants/presionInterna.js';
import { velocidadDe } from '../constants/velocidades.js';
import { vDeFigura } from './velocidad.js';
import { num } from '../lib/parseo.js';

/** Las cuatro paredes, por el sentido de su normal exterior. */
export const PAREDES = [
  { id: "X-", eje: "X", signo: -1, nombre: "Pared −X" },
  { id: "X+", eje: "X", signo: +1, nombre: "Pared +X" },
  { id: "Y-", eje: "Y", signo: -1, nombre: "Pared −Y" },
  { id: "Y+", eje: "Y", signo: +1, nombre: "Pared +Y" },
];

/**
 * ÁREA REAL DE LA CUBIERTA — la inclinada, no la proyectada.
 *
 * Con UNA sola pendiente θ no hace falta sumar faldón por faldón: las proyecciones en
 * planta de los faldones cubren la planta EXACTAMENTE y ninguna se superpone, así que el
 * área inclinada total es la planta dividida por el coseno. Vale igual para dos aguas,
 * cuatro aguas y vertiente única; en la plana es la planta.
 */
export function areaCubierta(geo) {
  const plana = geo.a * geo.b;
  if (!(geo.theta > 0)) return plana;
  return plana / Math.cos(geo.theta * Math.PI / 180);
}

/**
 * VOLUMEN INTERNO NO DIVIDIDO, para el `R_i` de la expresión (1.11-1).
 *
 * ⚠ NO ES PLANTA × ALTURA MEDIA. En cuatro aguas eso SOBREESTIMA el volumen, y un `V_i`
 * mayor da un `R_i` MENOR: menos presión interna de la que corresponde, o sea del lado
 * inseguro. Se usa el volumen geométrico exacto.
 *
 *   plana ......................... a·b·h_e
 *   dos aguas y vertiente única ... a·b·(h_e + r/2)
 *   cuatro aguas .................. a·b·h_e + r·(a·b/2 − s²/6), con s el lado corto
 *
 * La de cuatro aguas se reduce, con a = b, a la pirámide: a²·h_e + a²·r/3.
 */
export function volumenInterno(geo) {
  const planta = geo.a * geo.b;
  const r = geo.hCumbre - geo.hAlero;
  if (!(r > 0)) return planta * geo.hAlero;
  if (geo.tipo === "cuatro_aguas") {
    const s = Math.min(geo.a, geo.b);
    return planta * geo.hAlero + r * (planta / 2 - s * s / 6);
  }
  return planta * (geo.hAlero + r / 2);
}

/** Las cinco superficies de la envolvente, con su área bruta. */
export function superficiesEnvolvente(geo) {
  const paredes = PAREDES.map(p => {
    const f = fachada(geo, /** @type {any} */ (p.eje), /** @type {any} */ (p.signo));
    return { ...p, tipo: /** @type {const} */ ("pared"), Ag: f.area, forma: f.forma };
  });
  return [...paredes, {
    id: "cubierta", eje: null, signo: 0, nombre: "Cubierta",
    tipo: /** @type {const} */ ("cubierta"), Ag: areaCubierta(geo), forma: "inclinada",
  }];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS DE ABERTURA
// ═══════════════════════════════════════════════════════════════════════════════
//
// El criterio de cada tipo viene precargado con lo que dice el reglamento, y la app
// PREGUNTA lo que el reglamento deja al proyectista en vez de suponerlo.
export const TIPOS_ABERTURA = [
  {
    id: "permanente", ref: "Art. 1.2 · C 1.10",
    label: "Permanente — rejilla o persiana fija, toma de aire, vano sin cerramiento, "
      + "ventilación de cumbrera, rendija deliberada del revestimiento",
    detalle: "Siempre es abertura. La definición del art. 1.2 no distingue tamaño ni "
      + "intención: el C 1.10 enumera entre los ejemplos las rendijas alrededor de puertas "
      + "y las rendijas deliberadas en el revestimiento.",
  },
  {
    id: "operable", ref: "Art. 1.10.2.1",
    label: "Puerta, portón o ventana OPERABLE",
    detalle: "Es abertura si puede estar abierta durante el viento de diseño, o si no se "
      + "diseña para resistir la presión del Capítulo 5. La app pregunta las dos cosas: "
      + "suponer que estará cerrada es la hipótesis que más veces resulta falsa.",
    pregunta: "¿Se considera abierta durante el viento de diseño?",
  },
  {
    id: "porton", ref: "Art. 1.10.4",
    label: "Portón de enrollar o seccional",
    detalle: "En región con detritus exige ensayo de impacto de proyectiles y diseño según "
      + "el Capítulo 5. En categorías I y II se puede OMITIR esa verificación, y entonces "
      + "el portón se considera ABIERTO.",
    pregunta: "¿Tiene ensayo de proyectiles y diseño según el Capítulo 5?",
  },
  {
    id: "vidriado", ref: "Art. 1.10.3",
    label: "Vidriado",
    detalle: "En región con detritus y categorías II a IV, los vidriados se consideran "
      + "ABIERTOS salvo que estén protegidos según el art. 1.10.3.2. Excepción: los "
      + "vidriados a más de 20 m del terreno y a más de 10 m por encima de cubiertas con "
      + "grava o balasto dentro de un radio de 450 m.",
    pregunta: "¿Está protegido según el art. 1.10.3.2?",
  },
];

/** Área de UNA abertura declarada: por dimensiones o directa, por la cantidad. */
export function areaAbertura(ab) {
  const n = Math.max(0, num(ab?.cantidad, 1));
  const directa = num(ab?.area);
  const unidad = directa > 0 ? directa : num(ab?.ancho) * num(ab?.alto);
  return unidad * n;
}

/**
 * ¿Esta abertura CUENTA como abertura a los fines del art. 1.10?
 *
 * Devuelve también el motivo y el artículo: en una revisión, lo que se discute no es el
 * número sino por qué una puerta se contó y otra no.
 */
export function cuentaComoAbertura(ab, { detritus, riesgo }) {
  const t = ab?.tipo;
  const si = (motivo, ref) => ({ cuenta: true, motivo, ref });
  const no = (motivo, ref) => ({ cuenta: false, motivo, ref });

  if (t === "permanente") {
    return si("Abertura permanente: lo es siempre, cualquiera sea su tamaño.", "Art. 1.2");
  }
  if (t === "operable") {
    return ab?.abiertaEnDiseno
      ? si("Declarada como que puede estar abierta durante el viento de diseño.", "Art. 1.10.2.1")
      : no("Declarada como cerrada durante el viento de diseño y diseñada para la presión "
        + "del Capítulo 5.", "Art. 1.10.2.1");
  }
  if (t === "porton") {
    if (!detritus) {
      return ab?.abiertaEnDiseno
        ? si("Fuera de región con detritus, cuenta por la misma regla que una puerta "
          + "operable: se declaró que puede estar abierta.", "Art. 1.10.2.1")
        : no("Fuera de región con detritus y declarado cerrado durante el viento de diseño.",
          "Art. 1.10.2.1");
    }
    return ab?.protegida
      ? no("En región con detritus, con ensayo de proyectiles y diseño según el Capítulo 5.",
        "Art. 1.10.4")
      : si("En región con detritus y SIN ensayo de proyectiles: se considera abierto. En "
        + "categorías I y II la verificación se puede omitir, y omitirla tiene este precio.",
        "Art. 1.10.4");
  }
  if (t === "vidriado") {
    const alcanzado = ["II", "III", "IV"].includes(riesgo);
    if (!detritus || !alcanzado) {
      return no(detritus
        ? `Categoría ${riesgo}: el art. 1.10.3 alcanza a las categorías II a IV.`
        : "Fuera de región con detritus.", "Art. 1.10.3");
    }
    if (ab?.exencionAltura) {
      return no("Exceptuado: a más de 20 m del terreno y a más de 10 m por encima de "
        + "cubiertas con grava o balasto dentro de un radio de 450 m.", "Art. 1.10.3");
    }
    return ab?.protegida
      ? no("Protegido según el art. 1.10.3.2.", "Art. 1.10.3.2")
      : si("En región con detritus, categoría alcanzada y sin protección: se considera "
        + "abierto.", "Art. 1.10.3");
  }
  return no("Tipo de abertura no reconocido.", "Art. 1.2");
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGIÓN CON DETRITUS — art. 1.10.3.1
// ═══════════════════════════════════════════════════════════════════════════════
//
// ⚠ LA V QUE DECIDE NO ES SIEMPRE LA DE LA CATEGORÍA DEL EDIFICIO.
//
//   · categoría II, y categoría III que NO sea instalación de salud → Figura 1.5-1A
//   · instalaciones de salud de categoría III, y categoría IV ....... Figura 1.5-1B
//
// O sea que un edificio de categoría III que no sea un hospital se evalúa con el mapa de
// 700 años y no con el suyo de 1.700. Usar la V de la categoría lo metería en región con
// detritus sin corresponder, y de ahí saldrían vidriados «abiertos» y un parcialmente
// cerrado con ±0,55.
export const UMBRAL_DETRITUS = { V: 63, Vcosta: 58, distanciaCosta: 1500 };

/**
 * @param {object} o
 * @param {string} [o.ciudad]   `""` o ausente = el sitio no está en la tabla
 * @param {string} o.riesgo @param {boolean} [o.esSalud]
 * @param {any} [o.distanciaCosta] @param {boolean} [o.declarada]
 * @param {string} [o.origen]   de dónde salió la V del sitio
 * @param {number|null} [o.V]   la V adoptada, de la categoría del edificio
 * @param {any} [o.v50]         el v50 del 102-2005, cuando el origen es ése
 */
export function regionDetritus({ ciudad, riesgo, esSalud, distanciaCosta, declarada,
  origen, V: Vsitio, v50 }) {
  const figura = (riesgo === "IV" || (riesgo === "III" && esSalud)) ? "B" : "A";
  // La Figura 1.5-1A es el mapa de categoría II; la 1.5-1B, el de III-IV.
  const deTabla = /** @type {number|null} */ (
    ciudad ? velocidadDe(ciudad, figura === "B" ? "III" : "II") : null);
  const dist = num(distanciaCosta, Infinity);

  // ── FUERA DE LA TABLA, SE CONVIERTE ──────────────────────────────────────────
  // ⚠ ANTES, SIN CIUDAD, ESTO ERA SIEMPRE UNA DECLARACIÓN. Pero cuando la V se interpoló
  // entre isotacas o se convirtió de un v50, la V del sitio ya es una lectura del mapa:
  // lo único que falta es llevarla al mapa de la figura que corresponde, que es la misma
  // proporción `V ∝ √I` de la C 1.5-6.1. Dejarlo como declaración obligaba a volver al
  // mapa en papel para algo que la app ya tiene.
  const conv = deTabla == null
    ? vDeFigura({ figura, origen, V: Vsitio, riesgo, v50 }) : null;
  const V = deTabla ?? conv?.V ?? null;

  if (V == null) {
    // Sin V de la figura la app no puede decidir: pasa a ser una declaración del
    // proyectista, que es quien tiene el mapa a la vista.
    return { esRegion: !!declarada, V: null, figura, porDeclaracion: true, fuente: "declaracion",
      conversion: null,
      motivo: "No hay V de la "
        + `Figura 1.5-1${figura} para evaluar la condición: el sitio no está en la tabla de `
        + "ciudades y la velocidad adoptada no se puede llevar a esa figura. Queda "
        + "declarado por el proyectista leyendo el mapa.",
      ref: "Art. 1.10.3.1" };
  }
  const porV = V >= UMBRAL_DETRITUS.V;
  const porCosta = V >= UMBRAL_DETRITUS.Vcosta && dist <= UMBRAL_DETRITUS.distanciaCosta;
  const esRegion = porV || porCosta;
  const fc = (n) => n.toFixed(1).replace(".", ",");
  return {
    esRegion, V, figura, porDeclaracion: false, porV, porCosta,
    fuente: deTabla != null ? "tabla" : "convertida", conversion: conv,
    motivo: (conv ? `${conv.cuenta}. ` : "") + (esRegion
      ? (porV
        ? `V = ${fc(V)} m/s de la Figura 1.5-1${figura} ≥ ${UMBRAL_DETRITUS.V} m/s.`
        : `V = ${fc(V)} m/s ≥ ${UMBRAL_DETRITUS.Vcosta} m/s y el sitio está a `
          + `${fc(dist)} m de la costa, dentro de los ${UMBRAL_DETRITUS.distanciaCosta} m.`)
      : `V = ${fc(V)} m/s de la Figura 1.5-1${figura}: no llega a los `
        + `${UMBRAL_DETRITUS.V} m/s, ni a los ${UMBRAL_DETRITUS.Vcosta} m/s a menos de `
        + `${UMBRAL_DETRITUS.distanciaCosta} m de la costa.`
      + (riesgo === "III" && !esSalud
        ? ` ⚠ Categoría III que no es instalación de salud: se evalúa con la Figura `
          + `1.5-1A —el mapa de 700 años— y no con el de la categoría.`
        : ""))
      + (conv ? ` La V del sitio se llevó a la Figura 1.5-1${figura} por la proporción `
        + `entre mapas${conv.exacta ? "" : " de la C 1.5-6.1"}.` : ""),
    ref: "Art. 1.10.3.1" + (conv ? ` · ${conv.ref}` : ""),
  };
}

/**
 * ¿HAY DOS LECTURAS DEL MISMO EDIFICIO QUE NO COINCIDEN?
 *
 * Se avisa sólo cuando las dos lecturas existen de verdad: el modo es **declarado** —en
 * el calculado no hay nada que comparar, porque la clasificación ES la calculada—, hay
 * aberturas cargadas, y las dos clasificaciones difieren.
 *
 * ⚠ ANTES DEPENDÍA DE QUE HUBIERA UN FUNDAMENTO ESCRITO. Ese campo ya no existe, y no
 * hacía falta: elegir el modo declarado YA es la declaración. Con el modo por defecto y
 * sin aberturas no hay discrepancia posible, así que el aviso no aparece en cada proyecto
 * nuevo.
 *
 * Vive acá y no en el contexto porque es una REGLA —cuándo dos lecturas se contradicen—,
 * y una regla escrita adentro de un `useMemo` no se puede probar.
 *
 * @param {object} o
 * @param {string} [o.modo] @param {any[]} [o.aberturas]
 * @param {string} [o.declarada] @param {string} [o.calculada]
 */
export const hayDiscrepancia = ({ modo, aberturas = [], declarada, calculada }) =>
  modo === "declarado" && aberturas.length > 0 && declarada !== calculada;

// ═══════════════════════════════════════════════════════════════════════════════
// LA VERIFICACIÓN, PARED POR PARED
// ═══════════════════════════════════════════════════════════════════════════════

/** Las cuatro condiciones del art. 1.2, para una pared supuesta a barlovento. */
export function condicionesPared({ Ao, Ag, Aoi, Agi }) {
  const menor = Math.min(0.01 * Ag, 0.4);
  const rel = Agi > 0 ? Aoi / Agi : 0;
  return [
    { id: "cerrado", etiqueta: "Cerrado",
      expresion: "A_o ≤ mín(0,01·A_g ; 0,4 m²)",
      izq: Ao, der: menor, cumple: Ao <= menor + 1e-12, ref: "Art. 1.2" },
    { id: "abierto", etiqueta: "Abierto",
      expresion: "A_o ≥ 0,8·A_g",
      izq: Ao, der: 0.8 * Ag, cumple: Ao >= 0.8 * Ag - 1e-12, ref: "Art. 1.2" },
    { id: "pc1", etiqueta: "Parcialmente cerrado (1)",
      expresion: "A_o > 1,10·A_oi",
      izq: Ao, der: 1.1 * Aoi, cumple: Ao > 1.1 * Aoi + 1e-12, ref: "Art. 1.2" },
    { id: "pc2", etiqueta: "Parcialmente cerrado (2)",
      expresion: "A_o > mín(0,4 m² ; 0,01·A_g)  y  A_oi/A_gi ≤ 0,20",
      izq: Ao, der: menor, rel, cumple: Ao > menor + 1e-12 && rel <= 0.20 + 1e-12,
      ref: "Art. 1.2" },
  ];
}

/**
 * Clasifica el edificio a partir de sus aberturas.
 *
 * @param {object} e
 * @param {any} e.geo               geometría normalizada
 * @param {any[]} e.aberturas       cada una con `superficie` y sus datos
 * @param {any} e.detritus          salida de `regionDetritus`
 * @param {string} e.riesgo
 */
export function clasificar({ geo, aberturas = [], detritus, riesgo }) {
  const sup = superficiesEnvolvente(geo);
  const AgTotal = sup.reduce((a, s) => a + s.Ag, 0);

  // Qué abertura cuenta y cuál no, con su motivo.
  const evaluadas = aberturas.map(ab => {
    const v = cuentaComoAbertura(ab, { detritus: !!detritus?.esRegion, riesgo });
    return { ...ab, ...v, area: areaAbertura(ab) };
  });
  const AoDe = (id) => evaluadas
    .filter(a => a.cuenta && a.superficie === id)
    .reduce((s, a) => s + a.area, 0);

  const areas = Object.fromEntries(sup.map(s => [s.id, AoDe(s.id)]));
  const AogTotal = Object.values(areas).reduce((a, b) => a + b, 0);

  // Art. 1.10.2: cada pared se supone a barlovento, UNA POR VEZ, y se la compara contra
  // el resto de la envolvente —cubierta incluida—.
  const filas = sup.filter(s => s.tipo === "pared").map(s => {
    const Ao = areas[s.id], Ag = s.Ag;
    const Aoi = AogTotal - Ao, Agi = AgTotal - Ag;
    return { ...s, Ao, Ag, Aoi, Agi, condiciones: condicionesPared({ Ao, Ag, Aoi, Agi }) };
  });

  const cumple = (fila, id) => fila.condiciones.find(c => c.id === id)?.cumple;

  // ── EL ORDEN IMPORTA ──────────────────────────────────────────────────────────
  // El art. 1.10.5 da prioridad a ABIERTO sobre parcialmente cerrado: las dos definiciones
  // no son excluyentes, y sin la regla dos proyectistas sacarían GC_pi de 0,00 y de 0,55
  // para el mismo edificio.
  const todasAbiertas = filas.every(f => cumple(f, "abierto"));
  const gobiernaPC = filas.find(f => cumple(f, "pc1") && cumple(f, "pc2"));
  const todasCerradas = filas.every(f => cumple(f, "cerrado"));

  let clasificacion, motivo, gobierna = null;
  if (todasAbiertas) {
    clasificacion = "abierto";
    motivo = "Todas las paredes cumplen A_o ≥ 0,8·A_g."
      + (gobiernaPC ? " También se cumple la condición de parcialmente cerrado, y el "
        + "art. 1.10.5 da prioridad a ABIERTO." : "");
  } else if (gobiernaPC) {
    clasificacion = "parc_cerrado";
    gobierna = gobiernaPC.id;
    motivo = `Supuesta a barlovento la ${gobiernaPC.nombre}, se cumplen las dos `
      + "condiciones de parcialmente cerrado.";
  } else if (todasCerradas) {
    clasificacion = "cerrado";
    motivo = "Todas las paredes cumplen A_o ≤ mín(0,01·A_g ; 0,4 m²).";
  } else {
    clasificacion = "parc_abierto";
    motivo = "No se cumplen las condiciones de cerrado, parcialmente cerrado ni abierto. "
      + "El ejemplo del C 1.2 es un estacionamiento abierto.";
  }

  const def = CERRAMIENTOS.find(c => c.id === clasificacion);
  const Vi = volumenInterno(geo);
  const Ri = clasificacion === "parc_cerrado" ? ri(Vi, AogTotal) : null;

  return {
    clasificacion, motivo, gobierna, filas, superficies: sup, evaluadas,
    AgTotal, AogTotal, areas,
    gcpi: def?.gcpi ?? 0, label: def?.label ?? "—",
    Vi, Ri, ref: "Arts. 1.2, 1.10 y 1.11",
  };
}
