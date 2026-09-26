// ANEXO I — MOTOR. Cálculo puro, sin React.
//
// Secciones de forma uniforme: cilindros, prismas, perfiles, cables y tuberías. Es lo que
// falta cuando lo que hay que calcular no es un edificio ni una de las familias del
// capítulo 4, sino un elemento: un venteo, un tirante, un montante de un pórtico.
import { q as qDinamica, kz, kztEn } from './presionDinamica.js';
import { valorEnPares } from './interpolacion.js';
import { TERRENO } from '../constants/exposicion.js';
import {
  VB_I1, TABLA_I1, TABLA_I2, TABLA_I3A, TABLA_I3B, I3B_THETA_MAX, factorInclinacion,
  TABLA_I4, VB_I5, TABLA_I5, TABLA_I6, ALCANCE_ANEXO,
} from '../constants/anexo1.js';
// El parseo de los campos es uno solo: `lib/parseo.js`. Antes había tres `num()` en el
// motor y dos usaban `parseFloat` pelado, que con la coma habilitada en los campos lee
// «12,5» como 12 y descarta el resto sin avisar.
import { num } from '../lib/parseo.js';


const fc = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d).replace(".", ",") : "—");

// Interpolación con extremos congelados: las filas de tope de estas tablas son «≥ 10»,
// «≥ 20» y «40 o más», o sea que el propio reglamento dice que más allá vale lo mismo.
// La implementación es la común de `interpolacion.js`.
export const interp = valorEnPares;

// ── VELOCIDAD DE RÁFAGA A LA ALTURA z ──────────────────────────────────────────
//
//   V_z = (z/10)^α̂ · V
//
// con α̂ = 1/α de la Tabla 1.9-1, «la inversa del exponente α para la ley potencial de la
// velocidad de ráfaga de 3 segundos».
//
// ⚠ NO LLEVA EL FACTOR b̂. El perfil de ráfaga del art. 1.9 sí lo lleva —V_z = b̂·(z/10)^α̂·V—
// pero la expresión del Anexo I está escrita sin él, y acá se transcribe lo que dice el
// reglamento, no lo que uno supondría por analogía. Agregarlo cambiaría V_z entre un 16 %
// en exposición B y un 9 % en D, y con ella la columna de la que sale el C_f.
export function velocidadRafaga(z, V, exposicion) {
  const t = TERRENO[exposicion];
  if (!t) return null;
  const zz = num(z), v = num(V);
  if (!(zz > 0) || !(v > 0)) return null;
  return Math.pow(zz / 10, t.alfaG) * v;
}

// El parámetro de entrada de las Tablas I.1 y I.5. La nota 3 del Anexo lo justifica: para
// aire a presión y temperatura constantes Re = V·b/ν es proporcional a V·b, así que
// `V_z·b` es un número de Reynolds disfrazado.
export const vzb = (z, V, exposicion, b) => {
  const vz = velocidadRafaga(z, V, exposicion);
  return vz === null ? null : vz * num(b);
};

// ── COEFICIENTES ───────────────────────────────────────────────────────────────

// Tabla I.1. Entre 4 y 10 m²/s se interpola linealmente, como admite el art. I.2.
export function cfRedondeada(filaId, vzbValor) {
  const f = TABLA_I1.find(x => x.id === filaId);
  if (!f) return null;
  const v = num(vzbValor, -1);
  if (v < 0) return null;
  return { cf: interp(v, [[VB_I1[0], f.cf[0]], [VB_I1[1], f.cf[1]]]), fila: f, vzb: v,
    // Sirve para explicar en pantalla en qué parte de la transición está el cilindro.
    zona: v <= VB_I1[0] ? "subcrítica" : v >= VB_I1[1] ? "supercrítica" : "de transición" };
}

// Tabla I.2. Sin dependencia del Reynolds: un solo número.
export function cfAristaViva(filaId) {
  const f = TABLA_I2.find(x => x.id === filaId);
  return f ? { cf: f.cf, fila: f } : null;
}

// Tablas I.3A y I.3B. Devuelve las DOS componentes, porque el art. I.4 las pide juntas.
export function cfRectangular({ d, b, theta = 0 }) {
  const dd = num(d), bb = num(b);
  if (!(dd > 0) || !(bb > 0)) return null;
  const db = dd / bb;
  const cfxBase = interp(db, TABLA_I3A);
  const fInc = factorInclinacion(db, theta);
  const cfy = interp(db, TABLA_I3B);
  const avisos = [];
  if (db <= 1 && num(theta) > 0) {
    avisos.push({ tono: "info", texto:
      `Con d/b = ${fc(db)} ≤ 1 el art. I.4 no requiere mayorar C_fx por inclinación, así `
      + "que el factor no se aplicó." });
  }
  if (num(theta) > 15) {
    avisos.push({ tono: "error", texto:
      `θ = ${fc(theta, 1)}° > 15°: el art. I.4 define la mayoración [1 + (d/b)·tg θ] para `
      + "inclinaciones de hasta 15°. Más allá no da un valor." });
  }
  if (num(theta) > I3B_THETA_MAX) {
    avisos.push({ tono: "error", texto:
      `La Tabla I.3B da máximos de C_fy para θ < ${I3B_THETA_MAX}°. Su nota 3 es explícita: `
      + "para direcciones oblicuas mayores hace falta información más detallada o el "
      + "consejo de especialistas." });
  }
  // ⚠ EL PICO DE C_fx NO ESTÁ EN EL CUADRADO. Se avisa cuando la sección cae cerca de
  // d/b = 0,65, porque es la proporción que un proyectista no espera que sea la peor.
  if (db > 0.4 && db < 0.95) {
    avisos.push({ tono: "aviso", texto:
      `d/b = ${fc(db)} cae cerca del máximo de la Tabla I.3A, que NO está en el cuadrado `
      + "sino alrededor de 0,65, donde C_fx llega a 3,0 —un 36 % más que el 2,2 de la "
      + "sección cuadrada—." });
  }
  return { db, cfx: cfxBase * fInc, cfxBase, fInc, cfy, avisos };
}

// Tabla I.4. `θ` se mide en sentido ANTIHORARIO y sólo se dan los ángulos tabulados: el
// Anexo no autoriza interpolar entre ellos, así que se devuelve la fila completa y se
// destaca el ángulo pedido, en vez de inventar un valor a 30°.
export function cfPerfil(perfilId, theta = null) {
  const p = TABLA_I4.find(x => x.id === perfilId);
  if (!p) return null;
  const amb = (ang, eje) => (p.ambiguos ?? []).some(([a, e]) => a === String(ang) && e === eje);
  const filas = p.thetas.map((ang, i) => ({
    theta: ang, cfx: p.cfx[i], cfy: p.cfy[i],
    ambX: amb(ang, "x"), ambY: amb(ang, "y"),
  }));
  const idx = theta === null ? -1 : p.thetas.indexOf(num(theta));
  return { perfil: p, filas, idx,
    elegido: idx >= 0 ? filas[idx] : null,
    // Para dimensionar hace falta el peor de los ángulos, no el que uno eligió mirando.
    maxCfx: Math.max(...p.cfx.map(Math.abs)),
    maxCfy: Math.max(...p.cfy.map(Math.abs)) };
}

// Tabla I.5. Umbral 0,6 m²/s, SIN interpolación: la tabla da dos regímenes y nada entre
// medio, a diferencia de la I.1.
export function cfCable(filaId, vzbValor) {
  const f = TABLA_I5.find(x => x.id === filaId);
  if (!f) return null;
  const v = num(vzbValor, -1);
  if (v < 0) return null;
  const alto = v >= VB_I5;
  return { cf: alto ? f.alto : f.bajo, fila: f, vzb: v, alto };
}

// ── CORRECCIÓN POR ESBELTEZ — Tabla I.6 ────────────────────────────────────────
//
// Se llama `keEsbeltez` y NUNCA `Ke` a secas: el `Ke` del art. 1.12 es el factor de
// ALTITUD, y los dos multiplican a la misma fuerza.
export function keEsbeltez(esbeltez) {
  const e = num(esbeltez, -1);
  if (!(e > 0)) return null;
  const ke = interp(e, TABLA_I6);
  const fuera = e < ALCANCE_ANEXO.esbeltezTablaMin;
  return {
    ke, esbeltez: e, fuera,
    // Por debajo de ℓ/b = 8 la Tabla I.6 no da valor. Se adopta el 0,7 de su primera fila y
    // SE DICE, en vez de extrapolar: la tendencia de la tabla es decreciente, así que
    // estirarla daría un factor todavía menor, o sea una fuerza menor, que es el lado
    // inseguro justo donde el reglamento se calló.
    motivo: fuera
      ? `ℓ/b = ${fc(e)} < 8: la Tabla I.6 empieza en 8 y no da valores por debajo. Se `
        + "adopta 0,7, el primero de la tabla, sin extrapolar."
      : e >= ALCANCE_ANEXO.esbeltezMax
        ? `ℓ/b ≥ 40: no hay reducción, K_e = 1,0. El art. I.1 acota el Anexo a ℓ/b < 40, `
          + "así que acá se está justo en el borde de su alcance."
        : `Interpolado linealmente en la Tabla I.6, como admite su nota.`,
  };
}

// ── LA FUERZA ──────────────────────────────────────────────────────────────────

// K_zt a la altura de ESTA sección, por lo mismo que en el capítulo 4.
export const qEnAnexo = (z, sitio, kd) => qDinamica({
  z, V: sitio.V, exposicion: sitio.exposicion, kd,
  Kzt: kztEn(sitio, z), altitud: sitio.altitud ?? 0, usarKe: sitio.usarKe !== false,
});

// F = G · Cf · K_e(esbeltez) · A_f · q_z, expresiones (I.1) a (I.3).
export const fuerzaAnexo = ({ G, cf, keEsbeltez: ke, area, q }) =>
  num(G) * num(cf) * num(ke) * num(area) * num(q);

// ── ANÁLISIS COMPLETO ──────────────────────────────────────────────────────────

export const FAMILIAS_ANEXO = [
  { id: "redondeada", label: "Forma prismática con aristas redondeadas", tabla: "Tabla I.1",
    fig: "I.1a", porVzb: true,
    ayuda: "Cilindros, elipses y prismas con las aristas redondeadas. El coeficiente "
      + "depende del número de Reynolds, que el reglamento captura a través de V_z·b." },
  { id: "aristaviva", label: "Prisma con aristas vivas", tabla: "Tabla I.2", fig: "I.2",
    ayuda: "Polígonos de aristas vivas, salvo los rectangulares. Son INDEPENDIENTES del "
      + "número de Reynolds: el desprendimiento lo fija la arista." },
  { id: "rectangular", label: "Prisma de sección rectangular", tabla: "Tablas I.3A y I.3B",
    fig: "I.3A", ayuda: "Se tratan aparte de los demás poligonales, y con DOS componentes: "
      + "C_fx en la dirección del viento y C_fy transversal." },
  { id: "perfil", label: "Perfil estructural", tabla: "Tabla I.4", fig: "I.4a",
    ayuda: "Ángulos, secciones en cruz y Z, T, canales y doble T, con su C_fx y C_fy para "
      + "cada ángulo de incidencia." },
  { id: "cable", label: "Cable, tirante o tubería", tabla: "Tabla I.5", fig: "I.4b",
    porVzb: true, ayuda: "De esbeltez infinita. El umbral de régimen acá es V_z·b = 0,6 "
      + "m²/s, no el 4 y 10 de la Tabla I.1, y no hay interpolación entre los dos." },
];

export const familiaAnexoDe = (id) => FAMILIAS_ANEXO.find(f => f.id === id) ?? FAMILIAS_ANEXO[0];

export function analizarAnexo({ familia, datos, sitio, kd, G }) {
  const fam = familiaAnexoDe(familia);
  const d = datos ?? {};
  const b = num(d.b), L = num(d.L), z = num(d.z);
  if (!(b > 0) || !(L > 0) || !(z > 0)) return null;

  const area = b * L;                    // A_f = b·ℓ
  const esbeltez = L / b;
  const ke = keEsbeltez(esbeltez);
  const q = qEnAnexo(z, sitio, kd);
  const vz = velocidadRafaga(z, sitio.V, sitio.exposicion);
  const vzbV = vz === null ? null : vz * b;

  const avisos = [];
  if (esbeltez >= ALCANCE_ANEXO.esbeltezMax) {
    avisos.push({ tono: "aviso", texto:
      `ℓ/b = ${fc(esbeltez)} ≥ 40. El art. I.1 escribe estas expresiones para esbelteces `
      + "MENORES que 40; a partir de ahí no hay corrección que aplicar (K_e = 1,0) y "
      + "conviene revisar si el elemento no entra mejor por el capítulo 4." });
  }
  if (ke?.fuera) avisos.push({ tono: "aviso", texto: ke.motivo });

  let cf = null, cfy = null, extra = {}, pasos = [];

  if (familia === "redondeada") {
    const r = cfRedondeada(d.filaI1 ?? TABLA_I1[0].id, vzbV);
    if (!r) return null;
    cf = r.cf; extra = r;
    pasos = [
      { paso: "Velocidad de ráfaga a z", simbolo: "V_z", valor: vz, dec: 2, unidad: "m/s",
        ref: "Art. I.2", detalle: `V_z = (z/10)^α̂·V con α̂ = 1/α de la Tabla 1.9-1. `
          + `Exposición ${sitio.exposicion}: α̂ = ${fc(TERRENO[sitio.exposicion].alfaG, 4)}.` },
      { paso: "Parámetro de entrada", simbolo: "V_z·b", valor: r.vzb, dec: 2, unidad: "m²/s",
        ref: "Tabla I.1", detalle: `Régimen ${r.zona}. La nota 3 lo explica: para aire a `
          + "presión y temperatura constantes, Re es proporcional a V·b." },
      { paso: "Coeficiente de fuerza", simbolo: "C_f", valor: r.cf, dec: 3, unidad: "",
        ref: "Tabla I.1", detalle: `${r.fila.label}. Entre 4 y 10 m²/s se interpola `
          + `linealmente (${fc(r.fila.cf[0], 1)} → ${fc(r.fila.cf[1], 1)}).` },
    ];

  } else if (familia === "aristaviva") {
    const r = cfAristaViva(d.filaI2 ?? TABLA_I2[0].id);
    if (!r) return null;
    cf = r.cf; extra = r;
    pasos = [{ paso: "Coeficiente de fuerza", simbolo: "C_f", valor: r.cf, dec: 2, unidad: "",
      ref: "Tabla I.2", detalle: `${r.fila.label}. Las secciones de aristas vivas son `
        + "independientes del número de Reynolds (art. I.3)." }];

  } else if (familia === "rectangular") {
    const r = cfRectangular({ d: num(d.d), b, theta: num(d.theta) });
    if (!r) return null;
    cf = r.cfx; cfy = r.cfy; extra = r;
    avisos.push(...r.avisos);
    pasos = [
      { paso: "Relación de dimensiones", simbolo: "d/b", valor: r.db, dec: 3, unidad: "",
        ref: "Tabla I.3A", detalle: `d = ${fc(num(d.d))} m (paralela al viento) · `
          + `b = ${fc(b)} m (normal al viento).` },
      { paso: "Coeficiente longitudinal", simbolo: "C_fx", valor: r.cfxBase, dec: 3,
        unidad: "", ref: "Tabla I.3A",
        detalle: "El máximo de la tabla no está en el cuadrado sino en d/b ≈ 0,65." },
    ];
    if (r.fInc !== 1) pasos.push({ paso: "Mayoración por inclinación",
      simbolo: "1+(d/b)·tg θ", valor: r.fInc, dec: 3, unidad: "", ref: "Art. I.4",
      detalle: `Para d/b > 1 con el prisma inclinado θ = ${fc(num(d.theta), 1)}° ≤ 15°.` });
    pasos.push({ paso: "Coeficiente transversal", simbolo: "C_fy", valor: r.cfy, dec: 3,
      unidad: "", ref: "Tabla I.3B", detalle: "Es ±: los dos signos son casos de carga. "
        + `Válido para θ < ${I3B_THETA_MAX}° (nota 2).` });

  } else if (familia === "perfil") {
    const r = cfPerfil(d.perfil ?? TABLA_I4[0].id, d.thetaPerfil ?? 0);
    if (!r) return null;
    cf = r.elegido ? r.elegido.cfx : r.maxCfx;
    cfy = r.elegido ? r.elegido.cfy : r.maxCfy;
    extra = r;
    pasos = [
      { paso: "Perfil", simbolo: "", valor: null, texto: r.perfil.label, unidad: "",
        ref: "Tabla I.4", detalle: "La relación d/b del dibujo es lo que identifica la fila; "
          + "la dimensión b no siempre es normal al flujo (nota de la tabla)." },
      { paso: "Ángulo de incidencia", simbolo: "θ", valor: num(d.thetaPerfil), dec: 0,
        unidad: "°", ref: "Art. I.5",
        detalle: "Medido SIEMPRE en sentido antihorario. El Anexo sólo da los ángulos "
          + "tabulados y no autoriza interpolar entre ellos." },
      { paso: "Coeficiente longitudinal", simbolo: "C_fx", valor: cf, dec: 2, unidad: "",
        ref: "Tabla I.4", detalle: r.elegido?.ambX
          ? "La figura escribe ± en esta celda: el signo es indeterminado y hay que "
            + "verificar con los dos." : "Signo según los ejes dibujados en la figura." },
      { paso: "Coeficiente transversal", simbolo: "C_fy", valor: cfy, dec: 2, unidad: "",
        ref: "Tabla I.4", detalle: r.elegido?.ambY
          ? "La figura escribe ± en esta celda: hay que verificar con los dos signos."
          : "Signo según los ejes dibujados en la figura." },
    ];

  } else if (familia === "cable") {
    const r = cfCable(d.filaI5 ?? TABLA_I5[0].id, vzbV);
    if (!r) return null;
    cf = r.cf; extra = r;
    pasos = [
      { paso: "Velocidad de ráfaga a z", simbolo: "V_z", valor: vz, dec: 2, unidad: "m/s",
        ref: "Art. I.2", detalle: "V_z = (z/10)^α̂·V." },
      { paso: "Parámetro de entrada", simbolo: "V_z·b", valor: r.vzb, dec: 3, unidad: "m²/s",
        ref: "Tabla I.5", detalle: `Umbral 0,6 m²/s. Acá está por ${r.alto ? "encima" : "debajo"}, `
          + "y la tabla NO tiene tramo de interpolación entre los dos regímenes." },
      { paso: "Coeficiente de fuerza", simbolo: "C_f", valor: r.cf, dec: 2, unidad: "",
        ref: "Tabla I.5", detalle: `${r.fila.grupo} — ${r.fila.label}.` },
    ];
  }

  if (cf === null || q === null || !ke) return null;

  const F = fuerzaAnexo({ G, cf, keEsbeltez: ke.ke, area, q });
  const Fy = cfy === null ? null : fuerzaAnexo({ G, cf: cfy, keEsbeltez: ke.ke, area, q });

  return {
    fam, b, L, z, area, esbeltez, ke, q, vz, vzb: vzbV, cf, cfy, F, Fy, extra, avisos,
    traza: [
      { paso: "Velocidad básica", simbolo: "V", valor: sitio.V, dec: 1, unidad: "m/s",
        ref: "Art. 1.5 · Figuras 1.5-1 A-D", detalle: "Ráfaga de 3 s a 10 m, exposición C." },
      { paso: "Factor de direccionalidad", simbolo: "K_d", valor: kd, dec: 2, unidad: "",
        ref: "Tabla 1.6-1", detalle: "Por tipo de estructura. El Anexo no lo menciona "
          + "—arrastra la numeración de la edición anterior— pero entra por (1.13-1)." },
      { paso: "Coeficiente de exposición", simbolo: "K_z", valor: kz(z, sitio.exposicion),
        dec: 3, unidad: "", ref: "Art. 1.13.1",
        detalle: `Exposición ${sitio.exposicion}, z = ${fc(z)} m, el baricentro de A_f.` },
      { paso: "Presión dinámica", simbolo: "q_z", valor: q, dec: 0, unidad: "N/m²",
        ref: "Expresión (1.13-1)", detalle: "Evaluada a la altura del baricentro de A_f, "
          + "como pide el art. I.1." },
      { paso: "Factor de efecto de ráfaga", simbolo: "G", valor: G, dec: 3, unidad: "",
        ref: "Art. 1.9", detalle: "El Anexo lo cita como «art. 5.8», que es la numeración "
          + "de la edición anterior; el vigente es el 1.9." },
      ...pasos,
      { paso: "Esbeltez", simbolo: "ℓ/b", valor: esbeltez, dec: 2, unidad: "",
        ref: "Art. I.7", detalle: `ℓ = ${fc(L)} m · b = ${fc(b)} m.` },
      { paso: "Corrección por esbeltez", simbolo: "K_e", valor: ke.ke, dec: 3, unidad: "",
        ref: "Tabla I.6", detalle: `${ke.motivo} ⚠ Este K_e es el de ESBELTEZ, no el factor `
          + "de altitud del art. 1.12, que lleva el mismo símbolo." },
      { paso: "Área proyectada", simbolo: "A_f", valor: area, dec: 3, unidad: "m²",
        ref: "Art. I.1", detalle: `A_f = b·ℓ = ${fc(b)} × ${fc(L)}.` },
      { paso: "Fuerza de viento", simbolo: "F", valor: F, dec: 0, unidad: "N",
        ref: "Expresión (I.1)", detalle: `F = G·C_f·K_e·A_f·q_z.` },
    ],
  };
}
