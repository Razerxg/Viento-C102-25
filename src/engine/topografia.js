// FACTOR TOPOGRÁFICO K_zt — art. 1.8 y Figura 1.8-1 del CIRSOC 102-2025.
//
//   K_zt = (1 + K1·K2·K3)²        expresión (1.8-1)
//
// Es el factor que más puede cambiar el resultado de toda la app: en una loma
// bidimensional con H/Lh ≥ 0,5 en exposición D, con el edificio en la cresta y al nivel
// del terreno, llega a **3,15**. Adoptar 1,0 ahí no es conservador, es equivocado.
//
// ── LAS TRES CONDICIONES DEL ART. 1.8.1 SON EXACTAMENTE TRES ───────────────────
// Ni una más. Otras ediciones y otros reglamentos agregan requisitos —que el accidente
// esté aislado, que sobresalga un factor 2 sobre el terreno de 3 km a barlovento, o
// umbrales de 4,5 m y 18 m— que en el 102-2025 NO están. Verificado contra el articulado:
// las condiciones son ubicación, H/Lh ≥ 0,2 y H mínima por exposición, y nada más.
//
// ── LA PRIMERA CONDICIÓN ES CUALITATIVA ────────────────────────────────────────
// «La estructura se localiza en la mitad superior de una loma o colina, o cerca de la
// cresta de una escarpa.» No hay expresión que la decida: la confirma el proyectista
// mirando el emplazamiento. Por eso entra como una confirmación explícita y, sin ella,
// K_zt = 1,0 con el motivo dicho. Un 1,0 por omisión es indistinguible de un 1,0 por
// descuido, y esa es justamente la diferencia que importa.

// `interpolarTabla` es el interpolador común. Se reexporta con este nombre porque es
// como lo nombra la trazabilidad de K_zt y como lo buscan sus tests.
import { interpolar as interpolarTabla } from './interpolacion.js';
export { interpolarTabla };
import { FORMAS_TOPO, CONDICIONES_KZT, HLH_TOPE } from '../constants/topografia.js';

/** @typedef {"loma_2D"|"escarpa_2D"|"colina_3D"} FormaTopo */
/** @typedef {"B"|"C"|"D"} Exposicion */
/** @typedef {"barlovento"|"sotavento"} LadoCresta */
/** @typedef {"expresiones"|"tabla"} MetodoKzt */

/**
 * @typedef {object} PuntoInterp
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {object} ValorTrazado
 * @property {number} valor
 * @property {boolean} interpolado
 * @property {PuntoInterp[]} puntos  Los puntos de tabla efectivamente usados.
 * @property {string} [nota]
 */

// ── TABLAS DE LA FIGURA 1.8-1 ───────────────────────────────────────────────────
//
// ⚠ SOBRE LA VALIDEZ DE ESTAS TABLAS POR EXPOSICIÓN.
//
// Numéricamente, la columna de K1 reproduce (K1/(H/Lh))_C × (H/Lh): está construida con
// los cocientes de exposición C. **Pero normativamente la nota 4 dice que los
// multiplicadores valen para cualquier exposición**, así que usar la tabla en exposición D
// es una vía que el reglamento habilita, no un error del usuario.
//
// Las dos cosas son ciertas a la vez y conviene no confundirlas: el art. 1.8.2 permite
// expresiones o tablas indistintamente. Lo que sí corresponde es AVISAR, porque en
// exposición D la tabla queda por debajo del K1 que dan las expresiones —entre 6,5 % y
// 10,5 % según la forma— y esa diferencia va en contra de la seguridad.

/** K1 en función de H/Lh. Columnas: loma_2D · escarpa_2D · colina_3D. */
const TABLA_K1 = {
  hLh:        [0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50],
  loma_2D:    [0.29, 0.36, 0.43, 0.51, 0.58, 0.65, 0.72],
  escarpa_2D: [0.17, 0.21, 0.26, 0.30, 0.34, 0.38, 0.43],
  colina_3D:  [0.21, 0.26, 0.32, 0.37, 0.42, 0.47, 0.53],
};

/**
 * K2 en función de |x|/Lh. Dos columnas, y cuál se usa depende del LADO de la cresta:
 * la de escarpa a sotavento (μ = 4) y la de todos los demás casos (μ = 1,5).
 */
const TABLA_K2 = {
  xLh:                  [0.00, 0.50, 1.00, 1.50, 2.00, 2.50, 3.00, 3.50, 4.00],
  escarpa_2D_sotavento: [1.00, 0.88, 0.75, 0.63, 0.50, 0.38, 0.25, 0.13, 0.00],
  otros_casos:          [1.00, 0.67, 0.33, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
};

/** K3 en función de z/Lh. Columnas: loma_2D · escarpa_2D · colina_3D. */
const TABLA_K3 = {
  zLh:        [0.00, 0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90, 1.00, 1.50, 2.00],
  loma_2D:    [1.00, 0.74, 0.55, 0.41, 0.30, 0.22, 0.17, 0.12, 0.09, 0.07, 0.05, 0.01, 0.00],
  escarpa_2D: [1.00, 0.78, 0.61, 0.47, 0.37, 0.29, 0.22, 0.17, 0.14, 0.11, 0.08, 0.02, 0.00],
  colina_3D:  [1.00, 0.67, 0.45, 0.30, 0.20, 0.14, 0.09, 0.06, 0.04, 0.03, 0.02, 0.00, 0.00],
};

export { TABLA_K1, TABLA_K2, TABLA_K3 };

// Las notas de trazabilidad se leen en la app y salen en la memoria: van con coma
// decimal como el resto de la salida, no con el punto que imprime JS.
const dec = (n, d) => Number(n).toFixed(d).replace(".", ",");

/**
 * μ según el lado de la cresta.
 *
 * La columna «Escarpa bidim.» de la tabla de K2 es la de SOTAVENTO: la estela de
 * aceleración se extiende hacia atrás y por eso atenúa mucho más lento (μ = 4). A
 * barlovento, la escarpa usa μ = 1,5, que es la columna «todos los otros casos». La loma
 * 2D y la colina 3D usan 1,5 de los dos lados.
 * @param {FormaTopo} forma @param {LadoCresta} lado @returns {number}
 */
export function muDe(forma, lado) {
  const f = FORMAS_TOPO.find(o => o.id === forma);
  if (!f) return 1.5;
  return lado === "sotavento" ? f.muSot : f.muBar;
}

/** La columna de K2 que corresponde al lado y a la forma. */
const columnaK2 = (forma, lado) =>
  forma === "escarpa_2D" && lado === "sotavento" ? "escarpa_2D_sotavento" : "otros_casos";

/**
 * Factor topográfico completo.
 *
 * @param {object} e
 * @param {FormaTopo} [e.forma]
 * @param {Exposicion} e.exposicion
 * @param {number} e.H_m              altura de la loma, escarpa o colina
 * @param {number} e.Lh_m             distancia a barlovento de la cresta hasta donde el
 *                                    terreno está a media altura de H
 * @param {number} e.x_m              distancia horizontal DESDE LA CRESTA
 * @param {LadoCresta} [e.lado]       de qué lado de la cresta, declarado explícitamente
 * @param {number} e.z_m              altura sobre el terreno LOCAL del emplazamiento
 * @param {boolean} [e.cond1_confirmada]  el proyectista confirma la condición 1.8.1(a)
 * @param {MetodoKzt} [e.metodo]
 */
export function kzt({
  forma, exposicion, H_m, Lh_m, x_m, lado = "barlovento", z_m,
  cond1_confirmada = false, metodo = "expresiones",
}) {
  const f = FORMAS_TOPO.find(o => o.id === forma);
  const H = Number(H_m), Lh = Number(Lh_m), x = Math.abs(Number(x_m) || 0), z = Number(z_m);

  /** Avisos que NO dependen de que el cálculo aplique: valen siempre que haya topografía. */
  const avisos = [];

  // ── LAS TRES CONDICIONES, EVALUADAS Y REPORTADAS UNA POR UNA ─────────────────
  // Se evalúan todas aunque una ya haya fallado: la salida tiene que poder decir CUÁLES
  // fallaron, no sólo la primera. Con una sola, el usuario corrige esa y se encuentra con
  // otra, y así.
  const condiciones = [
    {
      id: "ubicacion", ref: "Art. 1.8.1, condición 1",
      texto: "La estructura está en la mitad superior de una loma o colina, o cerca de la "
        + "cresta de una escarpa.",
      cumple: !!cond1_confirmada,
      // Es cualitativa: no hay expresión que la decida, la confirma el proyectista.
      cualitativa: true,
    },
    {
      id: "pendiente", ref: "Art. 1.8.1, condición 2",
      texto: "H/Lh ≥ 0,20.",
      cumple: Number.isFinite(H) && Number.isFinite(Lh) && Lh > 0 && H / Lh >= CONDICIONES_KZT.hLhMin,
      valor: Number.isFinite(H) && Lh > 0 ? H / Lh : null,
    },
    {
      id: "altura", ref: "Art. 1.8.1, condición 3",
      texto: `H ≥ ${CONDICIONES_KZT.hMin[exposicion] ?? "—"} m para exposición ${exposicion}.`,
      cumple: Number.isFinite(H) && H >= (CONDICIONES_KZT.hMin[exposicion] ?? Infinity),
      valor: Number.isFinite(H) ? H : null,
    },
  ];

  const unoPorFalta = (motivo) => ({
    kzt: 1.0, K1: 0, K2: 0, K3: 0, aplica: false, motivo, condiciones, avisos,
    metodo, forma: forma ?? null, lado, HLh: null, HLh_ef: null, Lh_ef_m: null,
    trazas: null,
  });

  if (!f) return unoPorFalta("No se declaró una forma topográfica: se adopta terreno llano.");

  // VALLES CON H NEGATIVA: no se implementa ninguna reducción. La condición 1.8.1 pide
  // estar en la mitad SUPERIOR de una loma o cerca de la cresta de una escarpa, y el
  // requisito K ≥ 0 impide que el producto baje de 1. El resultado es K_zt = 1,0.
  //
  // ⚠ SE EVALÚA ANTES QUE EL CONTROL DE DATOS FALTANTES. Una H negativa es un dato
  // PRESENTE y válido —el usuario describió un valle—, no un dato que falta; atribuirlo a
  // un formulario incompleto mandaría a revisar el lugar equivocado.
  if (Number.isFinite(H) && H < 0) {
    return unoPorFalta("H negativa (valle): el art. 1.8 no prevé reducción de la presión "
      + "por topografía. K_zt = 1,0.");
  }

  if (!(H > 0) || !(Lh > 0) || !Number.isFinite(z) || z < 0) {
    return unoPorFalta("Faltan H, Lh o z del accidente topográfico.");
  }

  const fallan = condiciones.filter(c => !c.cumple);
  if (fallan.length) {
    const lista = fallan.map(c => `«${c.texto}»`).join(" y ");
    return unoPorFalta(`No se cumple ${fallan.length === 1 ? "la condición" : "las condiciones"} `
      + `${fallan.map(c => c.ref.replace("Art. 1.8.1, condición ", "")).join(" y ")} del `
      + `art. 1.8.1: ${lista} K_zt = 1,0.`);
  }

  // ── SUSTITUCIÓN POR PENDIENTE FUERTE ────────────────────────────────────────
  // Nota 2 de la figura: por encima de H/Lh = 0,5 el efecto deja de depender de la
  // pendiente. Se usa H/Lh = 0,5 para K1 y se sustituye Lh por 2H en K2 y K3. Aplica
  // igual con expresiones y con tablas: es una regla sobre los datos de entrada, no
  // sobre el método.
  const HLh = H / Lh;
  const empinado = HLh > HLH_TOPE;
  const HLh_ef = Math.min(HLh, HLH_TOPE);
  const Lh_ef_m = empinado ? 2 * H : Lh;
  if (empinado) {
    avisos.push({ tono: "info", ref: "Figura 1.8-1, nota 2", texto:
      `H/Lh = ${dec(HLh, 3)} > 0,5: se adopta H/Lh = 0,5 para K1 y se `
      + `sustituye Lh por 2H = ${dec((2 * H), 2)} m en K2 y K3.` });
  }

  const mu = muDe(forma, lado);
  const xLh = x / Lh_ef_m;
  const zLh = z / Lh_ef_m;

  /** @type {ValorTrazado} */ let t1;
  /** @type {ValorTrazado} */ let t2;
  /** @type {ValorTrazado} */ let t3;

  if (metodo === "tabla") {
    t1 = interpolarTabla(HLh_ef, TABLA_K1.hLh, TABLA_K1[forma]);
    const col = columnaK2(forma, lado);
    t2 = interpolarTabla(xLh, TABLA_K2.xLh, TABLA_K2[col]);
    t3 = interpolarTabla(zLh, TABLA_K3.zLh, TABLA_K3[forma]);
    // Fuera del rango tabulado el multiplicador es CERO, no el último valor: la figura
    // llega a x/Lh = 4 y a z/Lh = 2 con 0,00, y más allá el efecto ya se extinguió.
    if (xLh > TABLA_K2.xLh[TABLA_K2.xLh.length - 1]) {
      t2 = { valor: 0, interpolado: false, puntos: [{ x: 4, y: 0 }],
        nota: "x/Lh > 4: fuera del alcance de la tabla, K2 = 0" };
    }
    if (zLh > TABLA_K3.zLh[TABLA_K3.zLh.length - 1]) {
      t3 = { valor: 0, interpolado: false, puntos: [{ x: 2, y: 0 }],
        nota: "z/Lh > 2: fuera del alcance de la tabla, K3 = 0" };
    }
    if (exposicion === "D") {
      const exacto = f.k1[exposicion] * HLh_ef;
      const sub = exacto > 0 ? 100 * (exacto - t1.valor) / exacto : 0;
      avisos.push({ tono: "aviso", ref: "Figura 1.8-1, nota 4 · art. 1.8.2", texto:
        `Método de tabla en exposición D. La nota 4 habilita los multiplicadores para `
        + `cualquier exposición, pero la tabla está construida numéricamente con los `
        + `cocientes de exposición C: acá subestima K1 en ${dec(sub, 1)} % `
        + `(${dec(t1.valor, 3)} contra ${dec(exacto, 3)} `
        + `por expresiones). Ese desvío va en contra de la seguridad.` });
    }
  } else {
    // Expresiones de la Figura 1.8-1.
    const k1 = f.k1[exposicion] * HLh_ef;
    t1 = { valor: k1, interpolado: false, puntos: [],
      nota: `(K1/(H/Lh))_${exposicion} = ${dec(f.k1[exposicion], 2)} × H/Lh = ${dec(HLh_ef, 3)}` };
    t2 = { valor: 1 - x / (mu * Lh_ef_m), interpolado: false, puntos: [],
      nota: `1 − |x|/(μ·Lh) con |x| = ${dec(x, 1)} m, μ = ${dec(mu, 1)} y Lh = ${dec(Lh_ef_m, 1)} m` };
    t3 = { valor: Math.exp(-f.gamma * zLh), interpolado: false, puntos: [],
      nota: `e^(−γ·z/Lh) con γ = ${dec(f.gamma, 1)} y z/Lh = ${dec(zLh, 3)}` };
  }

  // K1, K2 y K3 ≥ 0. El que puede irse negativo es K2, cuando |x| supera μ·Lh: la
  // atenuación lineal cruza el cero y a partir de ahí el accidente ya no acelera nada.
  const K1 = Math.max(0, t1.valor);
  const K2 = Math.max(0, t2.valor);
  const K3 = Math.max(0, t3.valor);
  if (t2.valor < 0) {
    avisos.push({ tono: "info", ref: "Figura 1.8-1", texto:
      `|x| = ${dec(x, 1)} m supera μ·Lh = ${dec((mu * Lh_ef_m), 1)} m: `
      + "K2 se recorta en 0 y el accidente deja de acelerar el viento en ese punto." });
  }

  // La condición 1 es cualitativa, pero hay un caso en que la geometría la contradice:
  // a barlovento, más allá de Lh el terreno ya bajó a menos de la mitad de H, así que el
  // emplazamiento no está en la mitad superior de nada.
  if (lado === "barlovento" && x > Lh) {
    avisos.push({ tono: "aviso", ref: "Art. 1.8.1, condición 1", texto:
      `A barlovento con |x| = ${dec(x, 1)} m > Lh = ${dec(Lh, 1)} m, `
      + "el emplazamiento queda fuera de la mitad superior del accidente. Revisar si la "
      + "condición 1 del art. 1.8.1 se cumple de verdad." });
  }

  avisos.push(...AVISOS_FIJOS);

  return {
    kzt: Math.pow(1 + K1 * K2 * K3, 2),
    K1, K2, K3, aplica: true, motivo: null,
    condiciones, avisos, metodo, forma, lado, mu,
    HLh, HLh_ef, Lh_ef_m, empinado, xLh, zLh,
    trazas: { K1: t1, K2: t2, K3: t3 },
  };
}

/**
 * Avisos que el art. 1.8 exige tener presentes SIEMPRE que se aplique topografía, porque
 * son límites del propio artículo y no del caso particular.
 */
export const AVISOS_FIJOS = [
  { tono: "info", ref: "C 1.8", texto:
    "El art. 1.8 no cubre terreno complejo ni montañoso. En esos casos el comentario "
    + "remite al Capítulo 6, procedimiento de túnel de viento." },
  { tono: "info", ref: "C 1.8", texto:
    "Los multiplicadores no contemplan la ACELERACIÓN VERTICAL de origen topográfico, que "
    + "puede ser significativa sobre cubiertas cerca de la cresta." },
  { tono: "info", ref: "Figura 1.8-1, nota 3", texto:
    "Los multiplicadores suponen viento en la dirección de MÁXIMA PENDIENTE. Para otras "
    + "direcciones el efecto es menor; adoptar el mismo K_zt en todas es conservador." },
];
