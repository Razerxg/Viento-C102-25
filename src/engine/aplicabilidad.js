// APLICABILIDAD — en qué fila y en qué columna de la Figura 2.4-1 cayó este edificio.
//
// ── POR QUÉ EXISTE ─────────────────────────────────────────────────────────────
// Las tablas del reglamento se leen con los extremos CONGELADOS: la fila de sotavento
// dice «L/B ≥ 4» y la de cubierta «h/L ≥ 1,0», así que un edificio con L/B = 12 toma el
// mismo −0,20 que uno con L/B = 4 y eso es correcto. El problema es que, escrito así, el
// resultado no distingue entre «cayó dentro de la tabla» y «quedó afuera y se adoptó el
// extremo». Los dos dan un número plausible, y sólo uno de los dos se puede controlar
// contra el papel interpolando entre dos filas.
//
// Y hay un tercer caso que no es ninguno de los dos: los tramos donde el motor EXTIENDE
// la figura. Entre 45° y 60° se interpola hacia un nodo que la figura escribe como
// expresión y no como número; por encima de 80° el faldón a barlovento pasa a tratarse
// como pared mientras el de sotavento se sigue leyendo de la tabla de cubierta. Eso no es
// una transcripción, es una lectura, y tiene que estar dicho.
//
// Este módulo no calcula ninguna presión: lee un análisis ya hecho y dice, magnitud por
// magnitud, dónde cayó y qué significa. De acá salen la tarjeta de Presiones y los avisos
// globales.
import { ANG_BARLOVENTO, ANG_SOTAVENTO, CP_PENDIENTE_EXTREMA,
  CP_PARED } from '../constants/presionesExternas.js';

const fc = (x, d = 2) => Number(x).toFixed(d).replace(".", ",");

/** Filas de h/L de las tablas de cubierta de la Figura 2.4-1. */
export const HL_TABULADO = [0.25, 1.0];
/** Puntos de L/B de la pared a sotavento. */
export const LB_TABULADO = [CP_PARED.sotavento.puntos[0][0],
  CP_PARED.sotavento.puntos.at(-1)[0]];
/** Umbral de «edificio de baja altura», art. 1.2. */
export const BAJA_ALTURA = { h: 18 };

/**
 * Los cuatro estados posibles de una lectura de tabla. No son grados de un mismo eje:
 * significan cosas distintas y por eso llevan tonos distintos.
 *
 *   dentro    · cayó entre dos filas tabuladas y se interpoló. Se controla contra el papel.
 *   extremo   · quedó fuera del rango y se adoptó el valor del extremo, que es lo que la
 *               propia figura manda —sus filas dicen «≤» y «≥»—. Correcto, pero conviene
 *               saber que no hubo interpolación.
 *   extendido · el motor hizo una lectura que la figura no escribe explícitamente.
 *   fuera     · el caso no está cubierto por lo implementado.
 */
export const ESTADOS = {
  dentro: { tono: "info", label: "dentro de la tabla" },
  extremo: { tono: "info", label: "en el extremo de la tabla" },
  extendido: { tono: "aviso", label: "lectura extendida" },
  fuera: { tono: "error", label: "fuera de lo implementado" },
};

/** Relación L/B — la que fija el Cp de la pared a sotavento. */
function itemLB(a) {
  const x = a.L / a.B;
  const [lo, hi] = LB_TABULADO;
  const extremo = x > hi || x < lo;
  return {
    id: "LB", magnitud: "L/B", valor: x, texto: fc(x),
    rango: `${fc(lo, 0)} a ${fc(hi, 0)}`,
    estado: extremo ? "extremo" : "dentro",
    ref: "Figura 2.4-1 — pared a sotavento",
    titulo: "Relación en planta L/B",
    detalle: extremo
      ? `L/B = ${fc(x)} supera el último punto tabulado (L/B ≥ 4). La figura da el mismo `
        + "−0,20 para todo valor mayor, así que se adopta ése: NO se extrapoló la "
        + "pendiente de la recta, que daría un Cp que la figura no da."
      : `L/B = ${fc(x)} cae entre los puntos 0–1 (−0,50), 2 (−0,30) y ≥4 (−0,20), y el Cp `
        + "sale interpolado linealmente entre ellos, que es lo que autoriza la nota 2.",
  };
}

/** Relación h/L — la que elige la FILA de las tablas de cubierta. */
function itemHL(a) {
  const x = a.hL;
  const [lo, hi] = HL_TABULADO;
  const extremo = x > hi || x < lo;
  const cual = x > hi ? "h/L ≥ 1,0" : "h/L ≤ 0,25";
  return {
    id: "hL", magnitud: "h/L", valor: x, texto: fc(x),
    rango: `${fc(lo)} a ${fc(hi)}`,
    estado: extremo ? "extremo" : "dentro",
    ref: "Figura 2.4-1 — tablas de cubierta",
    titulo: "Relación de esbeltez h/L",
    detalle: extremo
      ? `h/L = ${fc(x)} cae fuera de las filas intermedias y se lee la fila «${cual}», que `
        + "es exactamente lo que la figura escribe para ese lado. No hay interpolación."
      : `h/L = ${fc(x)} se interpola entre las filas 0,25 · 0,5 · 1,0 de la figura.`,
  };
}

/**
 * Régimen del ángulo de cubierta.
 *
 * ⚠ EN MODO FRANJAS θ NO ENTRA EN EL Cp. La zonificación por distancia al borde de
 * barlovento depende de `h`, no de la pendiente. Decirlo importa: alguien que cambia θ de
 * 5° a 8° y no ve moverse ningún coeficiente tiene derecho a sospechar que la app no lo
 * está leyendo.
 */
function itemTheta(a) {
  const th = a.geo.theta;
  const base = { id: "theta", magnitud: "θ", valor: th, texto: `${fc(th, 1)}°`,
    titulo: "Ángulo de cubierta θ", ref: "Figura 2.4-1" };

  if (a.modo === "franjas") {
    return { ...base, rango: "no indexa", estado: "dentro", etiqueta: "no interviene",
      detalle: th < 10
        ? `θ = ${fc(th, 1)}° < 10°: la tabla de viento normal a la cumbrera empieza en 10°, `
          + "así que la cubierta va por FRANJAS medidas desde el borde de barlovento. En "
          + "ese régimen el Cp depende de h y no de θ."
        : "En esta dirección el viento es PARALELO a la cumbrera y la figura zonifica en "
          + "franjas para todo θ: la pendiente no entra en el Cp." };
  }
  if (th > CP_PENDIENTE_EXTREMA.desde) {
    return { ...base, rango: `${ANG_BARLOVENTO[0]}° a ${CP_PENDIENTE_EXTREMA.desde}°`,
      estado: "extendido",
      detalle: `θ = ${fc(th, 1)}° supera los ${CP_PENDIENTE_EXTREMA.desde}° de la nota de `
        + `la figura, que manda tratar la cubierta como PARED: el faldón a barlovento toma `
        + `Cp = ${fc(CP_PENDIENTE_EXTREMA.cp)}. ⚠ El faldón a SOTAVENTO se sigue leyendo de `
        + "la tabla de cubierta (−0,60), que es lo que la figura dice literalmente; si se "
        + "lo tratara como pared a sotavento saldría entre −0,50 y −0,20. La figura no "
        + "resuelve esa contradicción y acá se adopta la lectura literal." };
  }
  if (th >= 60) {
    return { ...base, rango: `${ANG_BARLOVENTO[0]}° a 60°`, estado: "extremo",
      detalle: `θ = ${fc(th, 1)}° ≥ 60°: la figura no da un valor de tabla sino la `
        + `expresión 0,01·θ = ${fc(0.01 * th)}, y en ese régimen ya no existe el caso de `
        + "succión del faldón a barlovento: la pendiente es tan empinada que sólo recibe "
        + "presión." };
  }
  if (th > ANG_BARLOVENTO.at(-2)) {
    return { ...base, rango: `${ANG_BARLOVENTO[0]}° a 60°`, estado: "extendido",
      detalle: `θ = ${fc(th, 1)}° cae entre la última columna tabulada (45°) y el nodo de `
        + "60°, donde la figura escribe una EXPRESIÓN y no un número. Se interpola hacia "
        + `0,01·60 = 0,60 —el valor fijo del nodo, no el 0,01·θ del ángulo que se está `
        + "calculando—, y el caso de succión vale 0 en todo el tramo porque a 45° ya es 0." };
  }
  return { ...base, rango: `${ANG_BARLOVENTO[0]}° a ${ANG_BARLOVENTO.at(-1)}°`,
    estado: "dentro",
    detalle: `θ = ${fc(th, 1)}° cae entre las columnas ${ANG_BARLOVENTO.join("° · ")}° de la `
      + "figura y el Cp sale interpolado entre las dos que lo encierran. El faldón a "
      + `sotavento se lee de su propia tabla, con columnas ${ANG_SOTAVENTO.join("° · ")}°`
      + (th >= ANG_SOTAVENTO.at(-1)
        ? `: con θ ≥ ${ANG_SOTAVENTO.at(-1)}° esa tabla se congela en −0,60.` : ".") };
}

/**
 * Edificio de baja altura, art. 1.2: `h ≤ 18 m` Y `h ≤ menor dimensión horizontal`.
 *
 * No cambia ningún número de esta app —acá todo se calcula por el método DIRECCIONAL, que
 * vale para edificios de todas las alturas— pero decide si además existe la alternativa
 * del método de la envolvente, que da otras cargas y no está implementado. Callarlo haría
 * creer que el camino que la app recorre es el único disponible.
 */
function itemBajaAltura(a) {
  const menor = Math.min(a.geo.a, a.geo.b);
  const es = a.geo.h <= BAJA_ALTURA.h && a.geo.h <= menor;
  return {
    id: "bajaAltura", magnitud: "h", valor: a.geo.h, texto: `${fc(a.geo.h)} m`, cumple: es,
    rango: `h ≤ ${BAJA_ALTURA.h} m y h ≤ ${fc(menor)} m`,
    estado: "dentro", etiqueta: es ? "cumple" : "no cumple",
    ref: "Art. 1.2 — definición",
    titulo: es ? "Es un edificio de baja altura" : "No es un edificio de baja altura",
    detalle: es
      ? `h = ${fc(a.geo.h)} m no supera los ${BAJA_ALTURA.h} m ni la menor dimensión en `
        + `planta (${fc(menor)} m). El método DIRECCIONAL que usa esta app vale igual —es `
        + "para edificios de todas las alturas— pero además existe el método de la "
        + "envolvente, que puede dar cargas distintas y NO está implementado acá."
      : `h = ${fc(a.geo.h)} m supera ${a.geo.h > BAJA_ALTURA.h
        ? `los ${BAJA_ALTURA.h} m` : `la menor dimensión en planta (${fc(menor)} m)`}, así `
        + "que el método de la envolvente no es aplicable y el direccional es el camino.",
  };
}

/** Relación h/B — no indexa la Figura 2.4-1, pero sí entra en el factor de ráfaga. */
function itemHB(a) {
  const x = a.geo.h / a.B;
  return {
    id: "hB", magnitud: "h/B", valor: x, texto: fc(x), rango: "no indexa",
    estado: "dentro", etiqueta: "informativa", ref: "Art. 1.9 — factor de efecto de ráfaga",
    titulo: "Relación h/B",
    detalle: `h = ${fc(a.geo.h)} m · B = ${fc(a.B)} m (normal al viento). ⚠ NO elige `
      + "ninguna fila de la Figura 2.4-1: el Cp de sotavento va por L/B y el de cubierta "
      + "por h/L. Donde h y B entran juntos es en el factor de respuesta de fondo Q del "
      + "art. 1.9, que baja G en edificios grandes.",
  };
}

/** Todas las lecturas de tabla de UNA dirección, con su estado. */
export function aplicabilidad(analisis) {
  const items = [itemHL(analisis), itemLB(analisis), itemTheta(analisis),
    itemHB(analisis), itemBajaAltura(analisis)]
    // La etiqueta por defecto sale del estado. Las filas que NO son lecturas de tabla
    // —h/B, la baja altura, θ en modo franjas— traen la suya: rotular «dentro de la
    // tabla» algo que no indexa ninguna tabla es decir una cosa que no es cierta.
    .map(x => ({ ...x, tono: ESTADOS[x.estado].tono,
      etiqueta: x.etiqueta ?? ESTADOS[x.estado].label, deTabla: x.etiqueta === undefined }));
  // El tono de la dirección es el MÁS GRAVE de sus items, no el último: una lectura
  // extendida entre cuatro informativas tiene que verse como aviso.
  const orden = { error: 0, aviso: 1, info: 2 };
  const tono = items.reduce((a, x) => (orden[x.tono] < orden[a] ? x.tono : a), "info");
  return { dir: analisis.dir, items, tono,
    extendidas: items.filter(x => x.estado === "extendido"),
    // ⚠ LOS EXTREMOS SE CUENTAN APARTE. Llevan tono «info» a propósito —adoptar el
    // extremo es lo que la figura manda— pero el rótulo de la tarjeta no puede decir
    // «todo dentro de tabla» cuando dos filas dicen «en el extremo».
    extremos: items.filter(x => x.estado === "extremo") };
}

/**
 * Las cuatro direcciones juntas, sin repetir lo que no cambia entre ellas.
 *
 * `θ`, `h/B`, `h/L` y `L/B` SÍ cambian con la dirección —L y B se intercambian, y la
 * cubierta puede ir en faldones en un eje y en franjas en el otro—, así que la tabla es
 * por dirección. Lo que no cambia es la baja altura, que va una sola vez.
 */
export function aplicabilidadDeTodas(todas) {
  const porDir = todas.map(t => aplicabilidad(t));
  const orden = { error: 0, aviso: 1, info: 2 };
  const tono = porDir.reduce((a, x) => (orden[x.tono] < orden[a] ? x.tono : a), "info");
  // Las lecturas extendidas se juntan SIN repetir: el mismo θ > 80° aparece en las cuatro
  // direcciones y listarlo cuatro veces hace que se deje de leer.
  const vistas = new Map();
  for (const p of porDir) for (const x of p.extendidas) if (!vistas.has(x.id)) vistas.set(x.id, x);
  return { porDir, tono, extendidas: [...vistas.values()],
    extremos: porDir.reduce((n, p) => Math.max(n, p.extremos.length), 0),
    bajaAltura: porDir[0].items.find(x => x.id === "bajaAltura") };
}
