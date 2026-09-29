// CAPÍTULO 5 — QUÉ FIGURA CORRESPONDE, Y CON QUÉ ALTURA.
//
// La selección es automática y siempre dice el motivo: la figura sale de la forma de la
// cubierta y de θ, y los dos entran en la memoria. Un (GC_p) correcto leído de la figura
// equivocada es el error más caro del capítulo y el que ningún control posterior detecta.
//
// ── LO QUE NO ESTÁ, NO SE APROXIMA ─────────────────────────────────────────────
// Cuando la geometría cae fuera de las figuras transcriptas, la selección devuelve un
// aviso de nivel `error` y NINGÚN número. No se adopta «la figura más parecida»: una
// cubierta a dos aguas de 50° no es una de 45°, y darle los coeficientes de la 5.3-2D
// sería inventar una figura que el reglamento no tiene.
import {
  FIGURAS, UBICACION, ALTURA_H,
} from "../constants/cyrCurvas.js";
import { gcpDeCurva } from "./cyr.js";
import { LAYOUT_DE_FIGURA } from "./cyrZonas.js";

/** Las formas de cubierta que el modelo de la app distingue. */
export const FORMA = {
  PLANA: "plana",
  DOS_AGUAS: "dosAguas",
  CUATRO_AGUAS: "cuatroAguas",
  VERTIENTE_UNICA: "vertienteUnica",
  OTRA: "otra",
};

/** Límites de la interpolación de cuatro aguas del comentario C 5.3.2. */
export const INTERPOLACION_CUATRO_AGUAS = { desde: "5.3-2F", hasta: "5.3-2G", theta1: 27, theta2: 45 };

/**
 * @param {string} motivo
 * @param {string} ref
 * @returns {Fuente}
 */
const noImplementada = (motivo, ref) => ({
  tipo: /** @type {const} */ ("noImplementada"),
  motivo,
  avisos: [{ nivel: "error", texto: motivo, ref }],
});

/**
 * @typedef {object} Fuente
 * @property {"figura"|"interpolacion"|"noImplementada"} tipo
 * @property {string} [figura]
 * @property {string} [desde]
 * @property {string} [hasta]
 * @property {number} [t]        peso de `hasta` en la interpolación, 0 a 1
 * @property {number} [theta]    la pendiente con la que se resolvió la interpolación
 * @property {string} [motivo]
 * @property {{nivel: string, texto: string, ref?: string}[]} avisos
 * @property {string} [porque]   el motivo de la selección, para la traza y la memoria
 */

/**
 * La figura de cubierta que corresponde a una forma y una pendiente.
 *
 * @param {{forma: string, theta: number}} p  theta en grados
 * @returns {Fuente}
 */
export function figuraCubierta({ forma, theta }) {
  /** @returns {Fuente} */
  const fig = (figura, porque, avisos = []) =>
    ({ tipo: /** @type {const} */ ("figura"), figura, porque, avisos });

  if (!Number.isFinite(theta) || theta < 0) {
    return noImplementada(`Pendiente de cubierta inválida: θ = ${theta}°.`, "art. 5.3");
  }

  if (forma === FORMA.PLANA) return fig("5.3-2A", "cubierta plana");

  if (forma === FORMA.DOS_AGUAS) {
    if (theta <= 7) return fig("5.3-2A", "dos aguas con θ ≤ 7°");
    if (theta <= 20) return fig("5.3-2B", "dos aguas con 7° < θ ≤ 20°");
    if (theta <= 27) return fig("5.3-2C", "dos aguas con 20° < θ ≤ 27°");
    if (theta <= 45) return fig("5.3-2D", "dos aguas con 27° < θ ≤ 45°");
    return noImplementada(
      `Cubierta a dos aguas con θ = ${theta}°: las figuras del capítulo 5 llegan hasta 45°.`,
      "Figs. 5.3-2A a 5.3-2D");
  }

  if (forma === FORMA.CUATRO_AGUAS) {
    if (theta <= 7) {
      // La 5.3-2A se titula «cubiertas a dos aguas», pero el paso 6 del art. 5.3 agrupa
      // «cubiertas planas, cubiertas a dos y a cuatro aguas» bajo la Figura 5.3-2, y
      // dentro de esa familia es la única que cubre θ ≤ 7°: las de cuatro aguas arrancan
      // en 7°. Se adopta, y se declara, porque es una decisión de lectura y no un dato.
      return fig("5.3-2A", "cuatro aguas con θ ≤ 7°", [{
        nivel: "info",
        texto: "Con θ ≤ 7° se adopta la Fig. 5.3-2A, que se titula «cubiertas a dos aguas»: "
          + "las figuras de cuatro aguas (5.3-2E a 2G) arrancan en 7°, y el paso 6 del "
          + "art. 5.3 agrupa cubiertas planas, a dos y a cuatro aguas bajo la Figura 5.3-2.",
        ref: "art. 5.3, paso 6",
      }]);
    }
    if (theta <= 20) return fig("5.3-2E", "cuatro aguas con 7° < θ ≤ 20°");
    if (theta <= 27) return fig("5.3-2F", "cuatro aguas con 20° < θ ≤ 27°");
    if (theta < 45) {
      // C 5.3.2: entre 27° y 45° se interpola linealmente en θ, zona por zona, entre la
      // 5.3-2F evaluada en 27° y la 5.3-2G. La 2F no depende de θ dentro de su rango, así
      // que «evaluada en 27°» es su curva tal cual.
      const { desde, hasta, theta1, theta2 } = INTERPOLACION_CUATRO_AGUAS;
      return {
        tipo: /** @type {const} */ ("interpolacion"), desde, hasta, theta,
        t: (theta - theta1) / (theta2 - theta1),
        porque: `cuatro aguas con 27° < θ < 45°: interpolación lineal en θ entre la `
          + `Fig. ${desde} y la Fig. ${hasta}`,
        avisos: [],
      };
    }
    if (theta === 45) return fig("5.3-2G", "cuatro aguas con θ = 45°");
    return noImplementada(
      `Cubierta a cuatro aguas con θ = ${theta}°: las figuras del capítulo 5 llegan hasta 45°.`,
      "Figs. 5.3-2E a 5.3-2G");
  }

  if (forma === FORMA.VERTIENTE_UNICA) {
    // Nota 5 de la Fig. 5.3-5A: para θ ≤ 3° se usan los valores de la Fig. 5.3-2A.
    if (theta <= 3) {
      return fig("5.3-2A", "vertiente única con θ ≤ 3°", [{
        nivel: "info",
        texto: "La nota 5 de la Fig. 5.3-5A remite a la Fig. 5.3-2A para θ ≤ 3°.",
        ref: "Fig. 5.3-5A, nota 5",
      }]);
    }
    // Las dos figuras de vertiente única son las ÚNICAS del alcance sin ecuación en el
    // comentario: sus curvas se transcribieron midiendo el gráfico. Están verificadas, y
    // el aviso lo dice igual —es info, no reproche— porque es el primer lugar donde mirar
    // si algún día un número no cierra.
    const conAviso = (figura, porque) => fig(figura, porque, [{
      nivel: "info",
      texto: `Las curvas de la Fig. ${figura} no tienen ecuación en el comentario: se `
        + "transcribieron midiendo el gráfico de la figura. Conviene compararlas con el "
        + "gráfico que dibuja la app.",
      ref: `Fig. ${figura}`,
    }]);
    if (theta <= 10) return conAviso("5.3-5A", "vertiente única con 3° < θ ≤ 10°");
    if (theta <= 30) return conAviso("5.3-5B", "vertiente única con 10° < θ ≤ 30°");
    return noImplementada(
      `Cubierta de vertiente única con θ = ${theta}°: la Fig. 5.3-5B llega hasta 30°.`,
      "Fig. 5.3-5B");
  }

  return noImplementada(
    "La forma de cubierta declarada no corresponde a ninguna figura implementada del "
    + "capítulo 5. Quedan fuera del alcance las cubiertas escalonadas, a dos aguas "
    + "múltiples, en diente de sierra, en cúpula, abovedadas y de mansarda.",
    "art. 5.3.2");
}

/** La figura de paredes es siempre la 5.3-1 mientras h ≤ 20 m. */
/** @returns {Fuente} */
export const figuraPared = () => ({
  tipo: /** @type {const} */ ("figura"),
  figura: "5.3-1", porque: "paredes de edificios con h ≤ 20 m", avisos: [],
});

// ═══════════════════════════════════════════════════════════════════════════════
// LA REDUCCIÓN DEL 10 % EN PAREDES — nota 5 de la Fig. 5.3-1
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Los (GC_p) de pared se reducen un 10 % cuando θ ≤ 10°. Afecta a los dos signos, porque
 * la nota habla de «los valores de (GC_p)» sin distinguir.
 * @param {number} theta
 */
export const reduccionPared = (theta) => (theta <= 10
  ? { factor: 0.9, aplica: true, ref: "Fig. 5.3-1, nota 5" }
  : { factor: 1, aplica: false, ref: "Fig. 5.3-1, nota 5" });

// ═══════════════════════════════════════════════════════════════════════════════
// QUÉ ALTURA USA LA FIGURA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cuál de las dos alturas corresponde, resolviendo la condición de θ de cada figura.
 *
 * Importa tres veces: fija las zonas de la Fig. 5.3-2A, entra en la dimensión `a` de todas
 * las demás, y es la altura a la que se evalúa `q_h`.
 *
 * @param {string} figura
 * @param {number} theta
 * @returns {{cual: "alero"|"media", porque: string}}
 */
export function alturaDe(figura, theta) {
  const decl = FIGURAS[figura]?.alturaH;
  if (!decl) throw new Error(`alturaDe: figura desconocida «${figura}»`);
  if (decl === ALTURA_H.ALERO) {
    return { cual: "alero", porque: `la notación de la Fig. ${figura} define h como la altura del alero` };
  }
  if (decl === ALTURA_H.MEDIA) {
    return { cual: "media", porque: `la notación de la Fig. ${figura} define h como la altura media de la cubierta` };
  }
  return theta <= 10
    ? { cual: "alero", porque: `la notación de la Fig. ${figura} manda usar la altura del alero con θ ≤ 10°` }
    : { cual: "media", porque: `θ = ${theta}° > 10°: la Fig. ${figura} usa la altura media de la cubierta` };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUAR (GC_p) A TRAVÉS DE LA FUENTE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Las zonas de la fuente, en el orden de la figura.
 * @param {Fuente} fuente
 */
export function zonasDe(fuente) {
  const fig = fuente.tipo === "interpolacion" ? fuente.desde : fuente.figura;
  return fig ? FIGURAS[fig].zonas : [];
}

/**
 * La zonificación de la fuente.
 * @param {Fuente} fuente
 */
export function layoutDe(fuente) {
  const fig = fuente.tipo === "interpolacion" ? fuente.desde : fuente.figura;
  return fig ? LAYOUT_DE_FIGURA[fig] : null;
}

/**
 * (GC_p) de una zona y un signo, para un área efectiva.
 *
 * @param {Fuente} fuente
 * @param {{zona: string, signo: "pos"|"neg", A: number, ubicacion?: string}} p
 */
export function gcpDeFuente(fuente, { zona, signo, A, ubicacion = UBICACION.CUBIERTA }) {
  if (fuente.tipo === "noImplementada") {
    throw new Error(`gcpDeFuente: no hay figura aplicable (${fuente.motivo})`);
  }
  const leer = (figura) => {
    const f = FIGURAS[figura];
    if (!f.ubicaciones.includes(ubicacion)) {
      // Es la guarda que impide que un elemento de cubierta sobre el recinto termine
      // leyendo la curva del alero, que es otro elemento y otra presión interna.
      throw new Error(`gcpDeFuente: la Fig. ${figura} no tiene curva para la ubicación `
        + `«${ubicacion}»; tiene ${f.ubicaciones.join(", ")}`);
    }
    const curva = f.curvas[ubicacion][zona]?.[signo];
    if (!curva) throw new Error(`gcpDeFuente: la Fig. ${figura} no tiene zona «${zona}»`);
    return gcpDeCurva(curva, A);
  };

  if (fuente.tipo === "figura") {
    const r = leer(fuente.figura);
    return { valor: r.valor, puntos: r.puntos, figura: fuente.figura, interpoladoEnTheta: false };
  }

  // Interpolación en θ, ZONA POR ZONA, como dice C 5.3.2: primero se lee cada figura con
  // el área del elemento y recién después se mezcla. Mezclar las curvas y leer después
  // daría otro número, porque la lectura es lineal en log A y no en A.
  const a = leer(fuente.desde), b = leer(fuente.hasta);
  return {
    valor: a.valor + fuente.t * (b.valor - a.valor),
    puntos: [...a.puntos, ...b.puntos],
    figura: `${fuente.desde}–${fuente.hasta}`,
    interpoladoEnTheta: true,
    extremos: { [fuente.desde]: a.valor, [fuente.hasta]: b.valor, t: fuente.t },
  };
}
