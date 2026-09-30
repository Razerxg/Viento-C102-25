// EL VOLUMEN DEL EDIFICIO EN 3D, CON SU CUBIERTA REAL Y SUS ALEROS.
//
// La versión anterior dibujaba SIEMPRE un prisma de tapa plana: un galpón a dos aguas con
// 30° se veía como una caja. El croquis contradecía el dato de entrada, que es peor que no
// tener croquis.
//
// Acá se arma la malla de caras con la geometría verdadera —plana, un agua o caballete— y
// se la proyecta con un pintor por profundidad, de modo que la cubierta se vea como es
// desde cualquier ángulo y sin tener que elegir a mano qué cara va adelante.
//
// ── LA CUBIERTA SE ARMA POR PLANO Y PLANTA, NO POR VÉRTICES ─────────────────────
// Cada faldón se declara con su POLÍGONO DE PLANTA y con la función `z(x, y)` de su plano.
// Los vértices salen de levantar el primero con la segunda. Antes se enumeraban los vértices
// a mano, y eso alcanzaba mientras la cubierta terminaba en la línea de pared; con voladizo
// hay que prolongar el faldón MÁS ALLÁ de esa línea manteniendo su pendiente, y con vértices
// a mano cada tipo de cubierta necesitaba su propio cálculo de la cota del vuelo —que es
// justo donde se cuela un faldón dibujado horizontal—.
//
// ── LOS ALEROS SON CARAS CON TIPO PROPIO ────────────────────────────────────────
// `voladizo_superior`, `voladizo_inferior` y `voladizo_canto` para la cubierta que sigue de
// largo; `alero` y `alero_inferior` para el alero adosado del art. 5.9. No son «cubierta»: el
// capítulo 2 les da un C_p propio a las caras inferiores a barlovento (art. 2.4.4) y el
// capítulo 5 los manda a otras figuras. Con el mismo tipo que la cubierta, el croquis les
// pintaría la presión del faldón y estaría mostrando un número que no es el de esa superficie.
//
// ⚠ EL ESPESOR DEL ALERO ES DE DIBUJO Y NO ES UN DATO DEL CÁLCULO. Ningún coeficiente
// depende de él. Se dibuja para que el canto se vea desde arriba —que es de donde se mira—
// y para poder rotular ahí el valor de la cara inferior, que de otro modo sólo se vería
// mirando el edificio desde abajo. Va como fracción de `h` para que se vea igual en un
// shelter de 2,4 m y en un galpón de 30.

import { caraVisible } from './camara3d.js';
import { recortarACaja } from './subdividir3d.js';

/** Espesor con que se DIBUJA un alero, como fracción de `h`. No es un dato del cálculo. */
export const ESPESOR_ALERO = 0.03;

const VUELO_CERO = { "+X": 0, "-X": 0, "+Y": 0, "-Y": 0 };

/**
 * Los faldones de una cubierta: su polígono de planta y el plano que los levanta.
 *
 * `planta` va en coordenadas del EDIFICIO, sin los vuelos; quien quiera la cubierta con
 * voladizo prolonga el polígono y usa la MISMA `z`, que es lo que garantiza que el vuelo
 * salga con la pendiente del faldón y no horizontal.
 *
 * @returns {{id: string, planta: [number,number][], z: (x: number, y: number) => number,
 *            borde: string[]}[]}
 *   `borde` son los bordes de la planta del edificio que ESE faldón alcanza: es lo que dice
 *   cuánto hay que prolongarlo por cada lado.
 *
 * @param {{a: number, b: number, hAlero: number, hCumbre: number, tipo: string,
 *          cumbrera: string, pendienteHacia?: string}} g
 */
export function faldones({ a, b, hAlero, hCumbre, tipo, cumbrera, pendienteHacia }) {
  const plano = !(hCumbre > hAlero + 1e-9);
  if (plano) {
    return [{ id: "cub", planta: [[0, 0], [a, 0], [a, b], [0, b]],
      z: () => hAlero, borde: ["-X", "+X", "-Y", "+Y"] }];
  }

  if (tipo === "vertiente_unica") {
    // Un agua: el borde ALTO es el opuesto a aquel hacia el que desciende la pendiente.
    const hacia = pendienteHacia ?? (cumbrera === "X" ? "+Y" : "+X");
    const eje = hacia.endsWith("X") ? 0 : 1;
    const L = eje === 0 ? a : b;
    // La pendiente baja HACIA `hacia`: si mira a +X, el alero bajo está en x = a.
    const bajaAlFinal = hacia.startsWith("+");
    const z = (x, y) => {
      const u = eje === 0 ? x : y;
      const t = bajaAlFinal ? u / L : 1 - u / L;
      return hCumbre + (hAlero - hCumbre) * t;
    };
    return [{ id: "cub", planta: [[0, 0], [a, 0], [a, b], [0, b]], z,
      borde: ["-X", "+X", "-Y", "+Y"] }];
  }

  // Dos o cuatro aguas: cumbrera al medio, paralela al eje declarado.
  // ⚠ CUATRO AGUAS SE DIBUJA COMO DOS AGUAS, sin limatesas. Es una simplificación que ya
  // estaba y se conserva: el volumen sirve para ubicarse, y las limatesas se ven en la
  // planta de zonas, que sí las dibuja.
  const cumbX = cumbrera === "X";
  const eje = cumbX ? 1 : 0;              // el eje TRANSVERSAL a la cumbrera
  const L = cumbX ? b : a;
  const medio = L / 2;
  const zDe = (u) => hAlero + (hCumbre - hAlero) * (1 - Math.abs(u - medio) / medio);
  const z = (x, y) => zDe(eje === 0 ? x : y);

  return cumbX
    ? [{ id: "cub_y0", planta: [[0, 0], [a, 0], [a, medio], [0, medio]], z,
        borde: ["-X", "+X", "-Y"] },
       { id: "cub_yb", planta: [[0, medio], [a, medio], [a, b], [0, b]], z,
        borde: ["-X", "+X", "+Y"] }]
    : [{ id: "cub_x0", planta: [[0, 0], [medio, 0], [medio, b], [0, b]], z,
        borde: ["-X", "-Y", "+Y"] },
       { id: "cub_xa", planta: [[medio, 0], [a, 0], [a, b], [medio, b]], z,
        borde: ["+X", "-Y", "+Y"] }];
}

/** Prolonga un polígono de planta hacia afuera por los bordes que ese faldón alcanza. */
function conVuelos(planta, bordes, vuelo, { a, b }) {
  const d = (borde) => (bordes.includes(borde) ? (vuelo[borde] ?? 0) : 0);
  const [xMin, xMax] = [-d("-X"), a + d("+X")];
  const [yMin, yMax] = [-d("-Y"), b + d("+Y")];
  // El polígono es un rectángulo o media planta: se estira llevando cada vértice que está
  // SOBRE un borde del edificio hasta el borde de la cubierta. Un vértice interior —el de la
  // cumbrera— no se mueve, que es exactamente lo que hay que hacer.
  return planta.map(([x, y]) => [
    Math.abs(x) < 1e-9 ? xMin : Math.abs(x - a) < 1e-9 ? xMax : x,
    Math.abs(y) < 1e-9 ? yMin : Math.abs(y - b) < 1e-9 ? yMax : y,
  ]);
}

/**
 * Vértices y caras del edificio. Ejes del modelo: x, y en planta y z hacia arriba.
 *
 * @param {object} g
 * @param {number} g.a @param {number} g.b
 * @param {number} g.hAlero @param {number} g.hCumbre
 * @param {string} g.tipo @param {string} g.cumbrera @param {string} [g.pendienteHacia]
 * @param {{porBorde: Record<string, number>}} [g.voladizo]  vuelos por borde, en m
 * @param {{hay: boolean, pared: string, ancho: number, vuelo: number, hc: number}} [g.aleroAdosado]
 */
export function mallaEdificio({ a, b, hAlero, hCumbre, tipo, cumbrera, pendienteHacia,
  voladizo, aleroAdosado }) {
  const plano = !(hCumbre > hAlero + 1e-9);
  const V = [];
  // ⚠ LOS VÉRTICES SE COMPARTEN, NO SE DUPLICAN. Desde que la cubierta se arma por planta y
  // plano en vez de por índices a mano, cada faldón pedía sus cuatro puntos y los del alero
  // salían dos veces: una por la pared y otra por el techo. Con vértices repetidos el sólido
  // deja de estar cerrado —ninguna arista queda compartida por dos caras— y se pierde la
  // única comprobación que tiene esta malla de que el volumen es un volumen y no un montón de
  // polígonos sueltos. Se redondea a un décimo de milímetro, que es muy fino para una cota de
  // obra y muy grueso para el error de punto flotante de un plano inclinado.
  const indice = new Map();
  const p = (x, y, z) => {
    const k = [x, y, z].map(u => Math.round(u * 1e4)).join(",");
    const y0 = indice.get(k);
    if (y0 !== undefined) return y0;
    V.push([x, y, z]);
    indice.set(k, V.length - 1);
    return V.length - 1;
  };
  const caras = [];
  const cara = (pts, tipoCara, id, extra = {}) =>
    caras.push({ v: pts.map(([x, y, z]) => p(x, y, z)), tipo: tipoCara, id, ...extra });

  // los cuatro pies y los cuatro aleros, que son los que definen las paredes
  const p0 = p(0, 0, 0), p1 = p(a, 0, 0), p2 = p(a, b, 0), p3 = p(0, b, 0);
  const a0 = p(0, 0, hAlero), a1 = p(a, 0, hAlero), a2 = p(a, b, hAlero), a3 = p(0, b, hAlero);
  const pared = (i, j, k, l, id) => caras.push({ v: [i, j, k, l], tipo: "pared", id });

  // ⚠ EL SÓLIDO VA CERRADO, CON PISO. Sin la cara de abajo, la vista «desde abajo»
  // muestra el interior del edificio y se ve rota. El piso nunca recibe presión de viento,
  // así que se marca con su propio tipo y se pinta neutro.
  caras.push({ v: [p0, p3, p2, p1], tipo: "piso", id: "z0" });

  const cumbX = cumbrera === "X";
  if (plano) {
    pared(p0, p1, a1, a0, "y0"); pared(p1, p2, a2, a1, "xa");
    pared(p2, p3, a3, a2, "yb"); pared(p3, p0, a0, a3, "x0");
  } else if (tipo === "vertiente_unica") {
    const hacia = pendienteHacia ?? (cumbX ? "+Y" : "+X");
    const sube = { "+Y": "y0", "-Y": "yb", "+X": "x0", "-X": "xa" }[hacia];
    const alto = { y0: [a0, a1], yb: [a3, a2], x0: [a0, a3], xa: [a1, a2] };
    const arriba = new Set(alto[sube]);
    const c = [a0, a1, a2, a3].map(i => (arriba.has(i) ? p(V[i][0], V[i][1], hCumbre) : i));
    pared(p0, p1, c[1], c[0], "y0"); pared(p1, p2, c[2], c[1], "xa");
    pared(p2, p3, c[3], c[2], "yb"); pared(p3, p0, c[0], c[3], "x0");
  } else {
    const c0 = cumbX ? p(0, b / 2, hCumbre) : p(a / 2, 0, hCumbre);
    const c1 = cumbX ? p(a, b / 2, hCumbre) : p(a / 2, b, hCumbre);
    if (cumbX) {
      caras.push({ v: [p0, p1, a1, a0], tipo: "pared", id: "y0" });
      caras.push({ v: [p2, p3, a3, a2], tipo: "pared", id: "yb" });
      caras.push({ v: [p1, p2, a2, c1, a1], tipo: "pared", id: "xa" });   // tímpano
      caras.push({ v: [p3, p0, a0, c0, a3], tipo: "pared", id: "x0" });
    } else {
      caras.push({ v: [p3, p0, a0, a3], tipo: "pared", id: "x0" });
      caras.push({ v: [p1, p2, a2, a1], tipo: "pared", id: "xa" });
      caras.push({ v: [p0, p1, a1, c0, a0], tipo: "pared", id: "y0" });
      caras.push({ v: [p2, p3, a3, c1, a2], tipo: "pared", id: "yb" });
    }
  }

  // ── LA CUBIERTA, CON SU VOLADIZO SI LO HAY ───────────────────────────────────
  const vuelo = voladizo?.porBorde ?? VUELO_CERO;
  const hayVuelo = Object.values(vuelo).some(x => x > 1e-9);
  const esp = ESPESOR_ALERO * Math.max(hAlero, 1);

  for (const f of faldones({ a, b, hAlero, hCumbre, tipo, cumbrera, pendienteHacia })) {
    const planta = hayVuelo ? conVuelos(f.planta, f.borde, vuelo, { a, b }) : f.planta;
    const levantar = (poly, dz = 0) => poly.map(([x, y]) => [x, y, f.z(x, y) + dz]);

    if (!hayVuelo) {
      cara(levantar(planta), "cubierta", f.id);
      continue;
    }

    // ── LA CUBIERTA SE PARTE EN LA LÍNEA DE PARED ────────────────────────────
    //
    // ⚠ EL FALDÓN SOBRE EL RECINTO Y EL QUE VUELA NO SON LA MISMA SUPERFICIE, aunque estén
    // en el mismo plano y se vean como una sola chapa. En el capítulo 5 un elemento que está
    // en el vuelo lleva `ubicacion: "voladizo"` y su (GC_p) sale de componer las dos caras
    // (art. 5.7): es mayor que el del mismo elemento sobre el recinto, en los dos sentidos.
    // Dibujados como una cara sola, el croquis pintaría todo el faldón con el coeficiente del
    // interior y el vuelo saldría MENOS exigido de lo que es.
    const dentro = recortarACaja(levantar(planta), { x0: 0, x1: a, y0: 0, y1: b });
    if (dentro.length >= 3) cara(dentro.map(q => [q[0], q[1], q[2]]), "cubierta", f.id);

    // El marco de afuera, en cuatro rectángulos DISJUNTOS que cubren exactamente lo que
    // sobresale. Las esquinas van con las tiras de X, que llevan el ancho completo; es el
    // mismo reparto con el que `aporteDeVoladizo` cuenta las áreas, así que el dibujo y el
    // cálculo parten el vuelo igual.
    const [X0, X1] = [-(vuelo["-X"] ?? 0), a + (vuelo["+X"] ?? 0)];
    const [Y0, Y1] = [-(vuelo["-Y"] ?? 0), b + (vuelo["+Y"] ?? 0)];
    // ⚠ CADA TIRA LLEVA EL BORDE DEL QUE SALE, y no es rotulado: el art. 2.4.4 da la presión
    // positiva de la cara inferior SÓLO al voladizo a barlovento, y cuál es depende de la
    // dirección que se esté mirando. Sin el borde, el croquis le pinta ese C_p = +0,8 a los
    // cuatro vuelos y muestra una presión que tres de ellos no reciben.
    const marco = [
      { borde: "-X", x0: X0, x1: 0, y0: Y0, y1: Y1 },
      { borde: "+X", x0: a, x1: X1, y0: Y0, y1: Y1 },
      { borde: "-Y", x0: 0, x1: a, y0: Y0, y1: 0 },
      { borde: "+Y", x0: 0, x1: a, y0: b, y1: Y1 },
    ];
    marco.forEach((r, i) => {
      if (r.x1 - r.x0 < 1e-9 || r.y1 - r.y0 < 1e-9) return;
      const arriba = recortarACaja(levantar(planta), r);
      if (arriba.length < 3) return;
      cara(arriba.map(q => [q[0], q[1], q[2]]), "voladizo_superior", `${f.id}_vuelo${i}`,
        { borde: r.borde });
      // ⚠ LA CARA INFERIOR EXISTE SÓLO SOBRE EL VUELO. Estaba armada con la planta entera, así
      // que desde abajo se veía una «cara inferior del vuelo» cubriendo todo el edificio —y en
      // el modo C&R se pintaba con el coeficiente compuesto sobre una superficie que no es
      // voladizo—. Adentro de la línea de pared no hay cara inferior: hay cielorraso.
      //
      // Va con el recorrido invertido para que su normal mire hacia ABAJO y sólo se vea desde
      // abajo; el valor de esa cara además se rotula en el canto, que sí se ve desde arriba.
      const abajo = recortarACaja(levantar(planta, -esp), r);
      if (abajo.length >= 3) {
        cara([...abajo].reverse().map(q => [q[0], q[1], q[2]]), "voladizo_inferior",
          `${f.id}_inf${i}`, { borde: r.borde });
      }
    });

    // EL CANTO, una faja vertical por cada borde con vuelo. Es lo único del alero que se ve
    // desde arriba, que es de donde se mira un croquis isométrico.
    for (const borde of f.borde) {
      if (!(vuelo[borde] > 1e-9)) continue;
      const seg = aristaDelBorde(planta, borde, { a, b, vuelo });
      if (!seg) continue;
      const [A, B] = seg;
      cara([[A[0], A[1], f.z(A[0], A[1])], [B[0], B[1], f.z(B[0], B[1])],
        [B[0], B[1], f.z(B[0], B[1]) - esp], [A[0], A[1], f.z(A[0], A[1]) - esp]],
      "voladizo_canto", `${f.id}_canto_${borde}`, { borde });
    }
  }

  // ── EL ALERO ADOSADO DEL ART. 5.9 ────────────────────────────────────────────
  if (aleroAdosado?.hay) caras.push(...losaDeAlero(aleroAdosado, { a, b }, p, esp));

  return { V, caras, plano };
}

/**
 * La arista de un polígono de planta que cae sobre un borde de la CUBIERTA.
 * Es donde va el canto del vuelo de ese borde.
 */
function aristaDelBorde(planta, borde, { a, b, vuelo }) {
  const eje = borde.endsWith("X") ? 0 : 1;
  const L = eje === 0 ? a : b;
  const pos = borde.startsWith("+") ? L + (vuelo[borde] ?? 0) : -(vuelo[borde] ?? 0);
  const sobre = planta.filter(q => Math.abs(q[eje] - pos) < 1e-9);
  if (sobre.length < 2) return null;
  // De los vértices que caen sobre el borde, los dos EXTREMOS sobre el otro eje.
  const otro = eje === 0 ? 1 : 0;
  const orden = [...sobre].sort((u, w) => u[otro] - w[otro]);
  return [orden[0], orden[orden.length - 1]];
}

/**
 * La losa del alero adosado: cara superior, cara inferior y su canto.
 *
 * ⚠ VA CENTRADA SOBRE SU PARED, Y ESO ES UNA CONVENCIÓN DE DIBUJO. El art. 5.9 pide el ancho
 * del alero pero no dónde empieza sobre la pared: no entra en ningún coeficiente. Centrarlo
 * es la única elección que no inventa una excentricidad, y el croquis lo dice.
 */
function losaDeAlero(al, { a, b }, p, esp) {
  const eje = al.pared.endsWith("X") ? 0 : 1;      // eje NORMAL a la pared
  const L = eje === 0 ? a : b;                      // largo del edificio en ese eje
  const W = eje === 0 ? b : a;                      // frente de la pared
  const signo = al.pared.startsWith("+") ? 1 : -1;
  const base = signo > 0 ? L : 0;
  const punta = base + signo * Math.max(0, al.vuelo);
  const ancho = Math.min(Math.max(0, al.ancho), W);
  const s0 = (W - ancho) / 2, s1 = s0 + ancho;
  const z = al.hc;

  /** De (normal, tangencial) a (x, y), según de qué pared cuelga. */
  const xy = (n, t) => (eje === 0 ? [n, t] : [t, n]);
  const sup = [xy(base, s0), xy(punta, s0), xy(punta, s1), xy(base, s1)];
  const cara = (pts, zz, tipoCara, id) => ({
    v: pts.map(([x, y]) => p(x, y, zz)), tipo: tipoCara, id,
  });

  // El recorrido de la cara superior tiene que dar normal hacia ARRIBA y el de la inferior
  // hacia abajo; con la pared a −X o −Y el signo del vuelo invierte el giro, así que se
  // normaliza mirando el área con signo en planta en vez de escribir cuatro casos.
  const antihorario = (pts) => {
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
      const A = pts[i], B = pts[(i + 1) % pts.length];
      s += A[0] * B[1] - B[0] * A[1];
    }
    return s > 0 ? pts : [...pts].reverse();
  };
  const arriba = antihorario(sup);

  const salida = [
    cara(arriba, z, "alero", "alero_sup"),
    cara([...arriba].reverse(), z - esp, "alero_inferior", "alero_inf"),
  ];
  // El canto, en la punta del vuelo: es lo que se ve desde arriba.
  const A = xy(punta, s0), B = xy(punta, s1);
  salida.push({
    v: [p(A[0], A[1], z), p(B[0], B[1], z), p(B[0], B[1], z - esp), p(A[0], A[1], z - esp)],
    tipo: "alero", id: "alero_canto",
  });
  return salida;
}

// ── CARAS VISIBLES ──────────────────────────────────────────────────────────────
//
// La cámara vive en `camara3d.js`, portada de la app de bases: mismo arrastre, mismo
// encuadre y mismas vistas ortogonales que allá, para que las dos aplicaciones no se
// sientan como dos programas distintos.

// Normal saliente por el método del área de Newell: funciona con polígonos de cualquier
// número de vértices —los tímpanos tienen cinco— y no supone que sean planos perfectos.
export function normal(pts) {
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0, z0] = pts[i], [x1, y1, z1] = pts[(i + 1) % pts.length];
    nx += (y0 - y1) * (z0 + z1);
    ny += (z0 - z1) * (x0 + x1);
    nz += (x0 - x1) * (y0 + y1);
  }
  const n = Math.hypot(nx, ny, nz) || 1;
  return [nx / n, ny / n, nz / n];
}

// Caras que miran al observador, ordenadas de LEJOS A CERCA: pintar en ese orden resuelve
// la oclusión sin z-buffer. El edificio es convexo, así que ordenar por la profundidad del
// centroide es exacto.
export function carasVisibles(malla, cam) {
  return visiblesDe(malla.caras.map(c => ({ ...c, pts: c.v.map(i => malla.V[i]) })), cam);
}

/**
 * Lo mismo, pero sobre piezas que ya traen sus puntos: es lo que necesita el 3D cuando las
 * caras vienen RECORTADAS en franjas o en zonas y ya no son las caras de la malla.
 *
 * ⚠ EL ORDEN POR PROFUNDIDAD DEL CENTROIDE ES EXACTO MIENTRAS EL SÓLIDO SEA CONVEXO, y con
 * aleros deja de serlo: un alero adosado sobresale de su pared. En la práctica no molesta
 * —las piezas de un mismo plano son disjuntas en planta, y el alero que sobresale está más
 * cerca de la cámara, que es justo lo que el orden por centroide resuelve bien— pero queda
 * anotado: si algún día aparece un alero que pase por detrás de otro cuerpo, hace falta
 * partir polígonos y no alcanza con ordenar.
 *
 * @param {{pts: number[][]}[]} piezas
 */
export function visiblesDe(piezas, cam) {
  return piezas
    .map(c => {
      const cen = [0, 1, 2].map(k => c.pts.reduce((s, q) => s + q[k], 0) / c.pts.length);
      return { ...c, n: normal(c.pts), cerca: cam.cerca(cen[0], cen[1], cen[2]) };
    })
    .filter(c => caraVisible(cam, c.n))
    .sort((a, b) => a.cerca - b.cerca);
}
