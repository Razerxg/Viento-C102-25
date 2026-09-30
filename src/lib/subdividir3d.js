// RECORTE DE CARAS PLANAS POR SEMIPLANOS VERTICALES.
//
// Es la pieza que le faltaba al 3D para poder mostrar lo que el reglamento reparte: las
// franjas de la Fig. 2.4-1 sobre la cubierta y las zonas del capítulo 5 sobre cubierta y
// paredes. Las dos son PARTICIONES EN PLANTA de superficies que en 3D son caras enteras, así
// que hace falta cortar una cara por líneas verticales y quedarse con los pedazos.
//
// ── POR QUÉ RECORTAR Y NO PINTAR ENCIMA ─────────────────────────────────────────
// La alternativa era dibujar la cara completa y superponerle rectángulos de color. No
// funciona en 3D: un rectángulo de planta proyectado no coincide con el pedazo de faldón que
// tapa —el faldón está inclinado— y se corre tanto más cuanto mayor es la pendiente. Con el
// recorte, cada pedazo ES parte de la cara: comparte sus vértices, su normal y su sombreado,
// y no hay nada que pueda quedar desalineado.
//
// ── ES EXACTO, NO UNA APROXIMACIÓN ──────────────────────────────────────────────
// Las caras del edificio son PLANAS. Al cortar una arista, el punto de corte se interpola
// linealmente en las tres coordenadas con el parámetro que sale de la coordenada de planta;
// como el plano es lineal en (x, y), ese punto cae exactamente sobre la cara. No hay error de
// discretización en ningún lado: un faldón de 35° se corta igual de bien que una cubierta
// plana.
//
// El algoritmo es Sutherland–Hodgman, que vale para polígonos CONVEXOS recortados por un
// semiplano. Todas las caras de `mallaEdificio` son convexas —incluidos los tímpanos de cinco
// vértices— y un semiplano nunca parte un convexo en dos pedazos, así que la salida es un
// solo polígono y no hace falta el caso general.

/** Tolerancia en metros. Por debajo de esto dos vértices son el mismo punto. */
const EPS = 1e-9;

/**
 * Recorta un polígono por un semiplano VERTICAL definido en planta.
 *
 * @param {number[][]} pts   vértices `[x, y, z]`, en orden
 * @param {0|1} eje          0 = x · 1 = y
 * @param {number} corte     posición del plano de corte sobre ese eje
 * @param {1|-1} lado        `+1` conserva `coord ≥ corte` · `−1` conserva `coord ≤ corte`
 * @returns {number[][]}     el polígono recortado, o `[]` si no queda nada
 */
export function recortarPorPlano(pts, eje, corte, lado) {
  if (pts.length < 3) return [];
  const f = (p) => lado * (p[eje] - corte);      // ≥ 0 es «adentro»
  const salida = [];
  for (let i = 0; i < pts.length; i++) {
    const A = pts[i], B = pts[(i + 1) % pts.length];
    const fa = f(A), fb = f(B);
    if (fa >= -EPS) salida.push(A);
    // Sólo se corta cuando los dos extremos están CLARAMENTE a distinto lado. Con `>= 0` a
    // secas, una arista que apenas roza el plano —y en una grilla de cortes hay muchas—
    // generaba un vértice duplicado por cada corte, y el polígono terminaba con el triple de
    // puntos y un área de cero en los pedazos degenerados.
    if ((fa > EPS && fb < -EPS) || (fa < -EPS && fb > EPS)) {
      const t = fa / (fa - fb);
      salida.push([0, 1, 2].map(k => A[k] + t * (B[k] - A[k])));
    }
  }
  return sinRepetidos(salida);
}

/** Quita vértices consecutivos coincidentes, que es lo que dejan los cortes tangentes. */
function sinRepetidos(pts) {
  const out = [];
  for (const p of pts) {
    const u = out[out.length - 1];
    if (u && Math.abs(u[0] - p[0]) < EPS && Math.abs(u[1] - p[1]) < EPS
      && Math.abs(u[2] - p[2]) < EPS) continue;
    out.push(p);
  }
  if (out.length > 2) {
    const a = out[0], b = out[out.length - 1];
    if (Math.abs(a[0] - b[0]) < EPS && Math.abs(a[1] - b[1]) < EPS
      && Math.abs(a[2] - b[2]) < EPS) out.pop();
  }
  return out.length >= 3 ? out : [];
}

/**
 * Recorta un polígono a un rectángulo de planta.
 * @param {number[][]} pts
 * @param {{x0: number, x1: number, y0: number, y1: number}} caja
 */
export function recortarACaja(pts, { x0, x1, y0, y1 }) {
  let q = recortarPorPlano(pts, 0, x0, 1);
  if (q.length) q = recortarPorPlano(q, 0, x1, -1);
  if (q.length) q = recortarPorPlano(q, 1, y0, 1);
  if (q.length) q = recortarPorPlano(q, 1, y1, -1);
  return q;
}

/**
 * El área de la PROYECCIÓN HORIZONTAL de un polígono, en m².
 *
 * Sirve para descartar astillas: una grilla de cortes sobre una cara produce pedazos de área
 * nula en los bordes, y dibujarlos agrega cientos de polígonos invisibles con su trazo
 * encima —que sí se ve, como una línea de más—.
 */
export const areaEnPlanta = (pts) => {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const A = pts[i], B = pts[(i + 1) % pts.length];
    s += A[0] * B[1] - B[0] * A[1];
  }
  return Math.abs(s) / 2;
};

/** El área REAL de un polígono plano en 3D, en m². Es la de planta dividida por cos θ. */
export const areaReal = (pts) => {
  let [nx, ny, nz] = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0, z0] = pts[i], [x1, y1, z1] = pts[(i + 1) % pts.length];
    nx += (y0 - y1) * (z0 + z1);
    ny += (z0 - z1) * (x0 + x1);
    nz += (x0 - x1) * (y0 + y1);
  }
  return Math.hypot(nx, ny, nz) / 2;
};

/**
 * Subdivide una cara en FRANJAS perpendiculares a un eje de planta.
 *
 * @param {number[][]} pts
 * @param {0|1} eje
 * @param {{desde: number, hasta: number, dato: any}[]} franjas  intervalos sobre ese eje, en m
 * @param {number} [areaMinima]  en m²; por debajo el pedazo se descarta
 * @returns {{pts: number[][], dato: any}[]}
 */
export function porFranjas(pts, eje, franjas, areaMinima = 1e-6) {
  const salida = [];
  for (const f of franjas) {
    let q = recortarPorPlano(pts, eje, Math.min(f.desde, f.hasta), 1);
    if (q.length) q = recortarPorPlano(q, eje, Math.max(f.desde, f.hasta), -1);
    if (q.length && areaEnPlanta(q) > areaMinima) salida.push({ pts: q, dato: f.dato });
  }
  return salida;
}

/**
 * Subdivide una cara por una lista de celdas de planta.
 *
 * @param {number[][]} pts
 * @param {{x0: number, x1: number, y0: number, y1: number, dato: any}[]} celdas
 * @param {number} [areaMinima]
 * @returns {{pts: number[][], dato: any}[]}
 */
export function porCeldas(pts, celdas, areaMinima = 1e-6) {
  const salida = [];
  for (const cel of celdas) {
    const q = recortarACaja(pts, cel);
    if (q.length && areaEnPlanta(q) > areaMinima) salida.push({ pts: q, dato: cel.dato });
  }
  return salida;
}

/**
 * Une celdas CONTIGUAS de la misma fila con el mismo dato.
 *
 * ── POR QUÉ HACE FALTA ──────────────────────────────────────────────────────────
 * La cubierta de cuatro aguas no tiene zonas rectangulares: su franja de cumbrera y
 * limatesas es el conjunto de puntos a distancia ≤ a de segmentos a 45°, así que sus
 * regiones se aproximan con una grilla. Sin unir, una grilla de 28 × 28 da 784 celdas por
 * faldón y el croquis sale con miles de polígonos —y con el trazo de cada celda dibujando
 * una cuadrícula que no existe—. Unidas por fila quedan unas pocas decenas de tiras.
 *
 * Se une sólo en UNA dirección a propósito: la unión en dos direcciones es un problema de
 * rectangulación que necesita polígonos con agujeros, y acá no aporta nada —lo que molesta
 * es la cantidad de celdas, y el 96 % se va con la unión por filas—.
 *
 * @param {{x0: number, x1: number, y0: number, y1: number, dato: any}[]} celdas
 * @param {(a: any, b: any) => boolean} igual
 */
export function unirFilas(celdas, igual = (a, b) => a === b) {
  /** @type {Map<string, typeof celdas>} */
  const filas = new Map();
  for (const c of celdas) {
    const k = `${c.y0}|${c.y1}`;
    (filas.get(k) ?? filas.set(k, []).get(k)).push(c);
  }
  const salida = [];
  for (const fila of filas.values()) {
    fila.sort((p, q) => p.x0 - q.x0);
    let actual = null;
    for (const c of fila) {
      if (actual && igual(actual.dato, c.dato) && Math.abs(actual.x1 - c.x0) < EPS) {
        actual.x1 = c.x1;
        continue;
      }
      actual = { ...c };
      salida.push(actual);
    }
  }
  return salida;
}
