// EL EDIFICIO: DE LA GEOMETRÍA A LA PRESIÓN SOBRE CADA SUPERFICIE.
//
// Arma, para cada dirección de viento, la lista completa de superficies con su coeficiente,
// su presión dinámica y su presión de diseño. Es donde se juntan el Capítulo 1 —que da q—
// y la Figura 2.4-1 —que da Cp—.
//
// ── CUATRO DIRECCIONES, NO DOS ───────────────────────────────────────────────────
// El viento se analiza según +X, −X, +Y y −Y. Los dos sentidos de un mismo eje NO son
// simétricos salvo que el edificio lo sea: con cubierta a un agua, o con la cumbrera
// descentrada, barlovento y sotavento intercambian coeficientes y el resultado cambia.
// Además las cuatro direcciones se corresponden una a una con las hipótesis Wx+, Wx−,
// Wy+, Wy− de las otras aplicaciones, que es lo que va a permitir exportarlas.
import { kz, q as qDinamica } from './presionDinamica.js';
import { ALTURAS_KZ } from '../constants/exposicion.js';
import { CP_PARED, CP_CUBIERTA_BARLOVENTO, CP_CUBIERTA_SOTAVENTO, CP_CUBIERTA_PARALELO,
  ANG_BARLOVENTO, ANG_SOTAVENTO, CERO_INTERPOLACION, CP_PENDIENTE_EXTREMA,
  FACTOR_AREA } from '../constants/presionesExternas.js';
import { interp, cpSotavento, presion, MINIMOS } from './presiones.js';
import { gcpiDe } from '../constants/presionInterna.js';

export const DIRECCIONES = [
  { id: "Wx+", eje: "X", signo: +1, label: "Viento según +X" },
  { id: "Wx-", eje: "X", signo: -1, label: "Viento según −X" },
  { id: "Wy+", eje: "Y", signo: +1, label: "Viento según +Y" },
  { id: "Wy-", eje: "Y", signo: -1, label: "Viento según −Y" },
];

// ── GEOMETRÍA ───────────────────────────────────────────────────────────────────
//
// Los campos vienen del formulario como STRINGS. Pasan por `num()` antes de cualquier
// cuenta: `h + e` con `e` string CONCATENA en vez de sumar, y el error no avisa.
const num = (v, d = 0) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : d;
};

// `h` es la ALTURA MEDIA DE CUBIERTA: el promedio entre el alero y el punto más alto.
// Excepción del art. 1.2: para θ ≤ 10° se toma directamente la altura de alero. No es un
// detalle de redondeo —define el q de toda la cubierta y de las paredes a sotavento—.
export function alturaMedia({ hAlero, theta, a, b, cumbrera }) {
  const he = num(hAlero), t = num(theta);
  if (t <= 10) return he;
  // la luz que cubre el faldón es la dimensión NORMAL a la cumbrera
  const luz = cumbrera === "X" ? num(b) : num(a);
  return he + (luz / 2) * Math.tan(t * Math.PI / 180) / 2;
}

export function normalizarGeo(g) {
  const a = Math.max(0.1, num(g?.a, 20));          // dimensión según X
  const b = Math.max(0.1, num(g?.b, 30));          // dimensión según Y
  const hAlero = Math.max(0.1, num(g?.hAlero, 6));
  const theta = Math.max(0, Math.min(90, num(g?.theta, 0)));
  const cumbrera = g?.cumbrera === "Y" ? "Y" : "X";
  const h = alturaMedia({ hAlero, theta, a, b, cumbrera });
  return { a, b, hAlero, theta, cumbrera, h };
}

// ── COEFICIENTES DE CUBIERTA ────────────────────────────────────────────────────
//
// Interpolación doble: primero en θ dentro de cada fila de h/L, después entre filas. El
// orden no cambia el resultado con interpolación bilineal, pero hacerlo así deja las dos
// etapas a la vista y permite testear cada una.
const HL_FILAS = [0.25, 0.5, 1.0];

// Celda de una fila para un ángulo dado. Devuelve `[negativo, positivo]`.
function celdaFila(fila, theta) {
  // θ ≥ 60°: la norma da la expresión 0,01·θ en vez de un valor
  if (theta >= 60) return [0.01 * theta, 0.01 * theta];
  const i = ANG_BARLOVENTO.findIndex(a => a >= theta);
  if (i <= 0) return fila[0];
  const c0 = fila[i - 1], c1 = fila[i];
  const t0 = ANG_BARLOVENTO[i - 1], t1 = ANG_BARLOVENTO[i];
  const f = (t1 - t0) === 0 ? 0 : (theta - t0) / (t1 - t0);
  const val = (c) => Array.isArray(c) && typeof c[0] === "string" ? [0.01 * theta, 0.01 * theta] : c;
  const v0 = val(c0), v1 = val(c1);
  return [0, 1].map(k => v0[k] + (v1[k] - v0[k]) * f);
}

// Cp del faldón a BARLOVENTO, viento normal a la cumbrera, θ ≥ 10°.
// Devuelve los DOS casos que exige la nota 3: la pendiente está sujeta a presión positiva
// y negativa a la vez, y hay que calcular ambas. No es elegir la peor: una gobierna el
// levantamiento y la otra la compresión, en combinaciones distintas.
export function cpCubiertaBarlovento(hL, theta) {
  // Nota #: por encima de 80° la cubierta se comporta como pared
  if (theta > CP_PENDIENTE_EXTREMA.desde) return [CP_PENDIENTE_EXTREMA.cp, CP_PENDIENTE_EXTREMA.cp];
  const porFila = HL_FILAS.map(hl => celdaFila(CP_CUBIERTA_BARLOVENTO[hl], theta));
  return [0, 1].map(k => interp(HL_FILAS.map((hl, i) => [hl, porFila[i][k]]), hL));
}

export function cpCubiertaSotavento(hL, theta) {
  const porFila = HL_FILAS.map(hl =>
    interp(ANG_SOTAVENTO.map((a, i) => [a, CP_CUBIERTA_SOTAVENTO[hl][i]]), theta));
  return interp(HL_FILAS.map((hl, i) => [hl, porFila[i]]), hL);
}

// ── ZONIFICACIÓN DE CUBIERTA PARA θ < 10° Y PARA VIENTO PARALELO A LA CUMBRERA ──
//
// La cubierta se divide en franjas medidas desde el borde de barlovento, en múltiplos de h.
//
// ⚠ INTERPOLACIÓN ENTRE h/L = 0,5 Y h/L = 1,0: LA FIGURA DA ZONIFICACIONES DISTINTAS.
// Para h/L ≤ 0,5 son cuatro franjas (0–h/2, h/2–h, h–2h, >2h) y para h/L ≥ 1,0 son dos
// (0–h/2, >h/2). La nota 2 autoriza interpolar en h/L, pero no dice cómo apareadar franjas
// que no coinciden. Se adopta la lectura natural: la fila de h/L ≥ 1,0 se expresa con las
// MISMAS cuatro franjas, repitiendo −0,7 en las tres últimas —que es exactamente lo que
// dice «> h/2»—, y recién entonces se interpola franja contra franja. Queda anotado porque
// es una interpretación, no una transcripción.
const FRANJAS = [0.5, 1.0, 2.0, Infinity];

export function cpCubiertaParalelo(hL) {
  const expandir = (lista) => FRANJAS.map(f => {
    const franja = lista.find(x => x.hasta >= f) ?? lista.at(-1);
    return franja.cp;
  });
  const bajo = expandir(CP_CUBIERTA_PARALELO[0.5]);
  const alto = expandir(CP_CUBIERTA_PARALELO[1.0]);
  return FRANJAS.map((hasta, i) => ({
    hasta,
    cp: [0, 1].map(k => interp([[0.5, bajo[i][k]], [1.0, alto[i][k]]], hL)),
  }));
}

// ── PERFIL DE PRESIÓN DINÁMICA EN LA PARED A BARLOVENTO ─────────────────────────
//
// Es la ÚNICA superficie donde q varía: usa `qz`, evaluada a cada altura. El resto del
// edificio usa `qh`, constante. El perfil se corta en las alturas tabuladas de la
// Tabla 1.13-1 porque es como se lo dibuja y como se lo verifica a mano, y se cierra
// siempre en `h`, que rara vez cae justo en una de ellas.
export function perfilBarlovento({ h, sitio }) {
  const cortes = [...ALTURAS_KZ.filter(z => z < h), h];
  let previo = 0;
  return cortes.map(z => {
    const tramo = { desde: previo, hasta: z, z, kz: kz(z, sitio.exposicion), q: qDinamica({ ...sitio, z }) };
    previo = z;
    return tramo;
  });
}

// ── ANÁLISIS COMPLETO PARA UNA DIRECCIÓN ────────────────────────────────────────
export function analizarDireccion({ geo, sitio, cerramiento, G = 0.85 }, dir) {
  const g = normalizarGeo(geo);
  // B es normal al viento y L paralela: se intercambian según el eje analizado
  const L = dir.eje === "X" ? g.a : g.b;
  const B = dir.eje === "X" ? g.b : g.a;
  const hL = g.h / L;
  const normalACumbrera = g.cumbrera !== dir.eje;

  const qh = qDinamica({ ...sitio, z: g.h });
  const GCpi = gcpiDe(cerramiento) ?? 0;
  // `qi` es qh salvo la presión interna positiva en parcialmente cerrados y abiertos, que
  // se evalúa a la altura de la abertura más alta (art. 2.4.1). Sin esa abertura declarada
  // se cae a qh, que es el criterio conservador que el propio reglamento admite.
  const qi = qh;

  const sup = [];
  const agregar = (o) => sup.push({ ...o, ...presion({ q: o.q, qi, G, Cp: o.cp, GCpi }) });

  // paredes
  const perfil = perfilBarlovento({ h: g.h, sitio });
  sup.push({
    id: "pared_barlovento", nombre: "Pared a barlovento", tipo: "pared", usar: "qz",
    cp: CP_PARED.barlovento.cp, perfil,
    // cada tramo lleva su propia presión: es lo que dibuja el croquis escalonado
    tramos: perfil.map(t => ({ ...t,
      ...presion({ q: t.q, qi, G, Cp: CP_PARED.barlovento.cp, GCpi }) })),
  });
  agregar({ id: "pared_sotavento", nombre: "Pared a sotavento", tipo: "pared", usar: "qh",
    cp: cpSotavento(L, B), q: qh, relacion: `L/B = ${(L / B).toFixed(2)}` });
  agregar({ id: "pared_lateral", nombre: "Paredes laterales", tipo: "pared", usar: "qh",
    cp: CP_PARED.lateral.cp, q: qh });

  // cubierta
  if (normalACumbrera && g.theta >= 10) {
    const [cpNeg, cpPos] = cpCubiertaBarlovento(hL, g.theta);
    agregar({ id: "cub_barlovento_neg", nombre: "Faldón a barlovento — caso de succión",
      tipo: "cubierta", usar: "qh", cp: cpNeg, q: qh, caso: "negativo" });
    agregar({ id: "cub_barlovento_pos", nombre: "Faldón a barlovento — caso de presión",
      tipo: "cubierta", usar: "qh", cp: cpPos, q: qh, caso: "positivo" });
    agregar({ id: "cub_sotavento", nombre: "Faldón a sotavento", tipo: "cubierta",
      usar: "qh", cp: cpCubiertaSotavento(hL, g.theta), q: qh });
  } else {
    const zonas = cpCubiertaParalelo(hL);
    let desde = 0;
    zonas.forEach((z, i) => {
      const hasta = z.hasta === Infinity ? L / g.h : Math.min(z.hasta, L / g.h);
      if (desde >= L / g.h) return;                 // la franja cae fuera del edificio
      const etiqueta = z.hasta === Infinity ? `> ${desde}h` : `${desde}h a ${z.hasta}h`;
      agregar({ id: `cub_franja_${i}`, nombre: `Cubierta — franja ${etiqueta}`,
        tipo: "cubierta", usar: "qh", cp: z.cp[0], q: qh, zona: { desde, hasta }, caso: "negativo" });
      agregar({ id: `cub_franja_${i}_pos`, nombre: `Cubierta — franja ${etiqueta} (2° caso)`,
        tipo: "cubierta", usar: "qh", cp: z.cp[1], q: qh, zona: { desde, hasta }, caso: "positivo" });
      desde = z.hasta;
    });
  }

  return { dir, geo: g, L, B, hL, qh, GCpi, normalACumbrera, superficies: sup, perfil };
}

export const analizarEdificio = (entrada) =>
  DIRECCIONES.map(d => analizarDireccion(entrada, d));

// ── CASOS DE CARGA DE LA FIGURA 2.4-8 ───────────────────────────────────────────
//
// Cuatro casos, y los dos torsionales aplican AHORA A EDIFICIOS DE TODAS LAS ALTURAS: en
// el CIRSOC 102-2005 estaban limitados a h > 20 m. Omitirlos en un galpón bajo era
// correcto con la edición anterior y ya no lo es.
export const CASOS_CARGA = [
  { n: 1, label: "Caso 1 — presión total, cada eje por separado", factor: 1.0, torsion: false },
  { n: 2, label: "Caso 2 — 75 % con torsión", factor: 0.75, torsion: true, e: 0.15 },
  { n: 3, label: "Caso 3 — 75 % en los dos ejes simultáneos", factor: 0.75, torsion: false },
  { n: 4, label: "Caso 4 — 56,3 % en los dos ejes con torsión", factor: 0.563, torsion: true, e: 0.15 },
];

// M_T por unidad de altura, expresiones de la Figura 2.4-8.
export const momentoTorsor = ({ pW, pL, B, factor, e = 0.15 }) =>
  factor * (Math.abs(pW) + Math.abs(pL)) * B * (e * B);
