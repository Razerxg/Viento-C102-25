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
import { tipoDe } from '../constants/cubiertas.js';

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
// Formato de display: COMA decimal. El punto queda para el dato. Mezclarlos produce un
// «1.234» que se lee mil doscientos de un lado y uno coma dos del otro.
const fc = (n, d = 2) => Number(n).toFixed(d).replace(".", ",");

const num = (v, d = 0) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : d;
};

// ── ALTURA DEL PUNTO MÁS ALTO ───────────────────────────────────────────────────
//
// ⚠ DEPENDE DEL TIPO DE CUBIERTA, y la diferencia es un factor DOS.
//
// En dos aguas la cumbrera está al medio y sube sobre media luz: `(luz/2)·tanθ`.
// En vertiente única sube sobre la luz ENTERA: `luz·tanθ`. Usar la fórmula del caballete
// simétrico en un techo a un agua subestima el remonte a la mitad, y con él la altura
// media, el `q_h` de toda la cubierta y el de las paredes a sotavento.
export function remonte({ tipo, theta, a, b, cumbrera }) {
  const t = num(theta);
  if (t <= 0) return 0;
  const luz = cumbrera === "X" ? num(b) : num(a);   // dimensión NORMAL a la cumbrera
  const tan = Math.tan(t * Math.PI / 180);
  return tipo === "vertiente_unica" ? luz * tan : (luz / 2) * tan;
}

// `h` es la ALTURA MEDIA DE CUBIERTA: el promedio entre el alero y el punto más alto.
// Excepción del art. 1.2: para θ ≤ 10° se toma directamente la altura de alero. No es un
// detalle de redondeo —define el q de toda la cubierta y de las paredes a sotavento—.
export function alturaMedia({ hAlero, theta, a, b, cumbrera, tipo = "dos_aguas" }) {
  const he = num(hAlero), t = num(theta);
  if (t <= 10) return he;
  return he + remonte({ tipo, theta: t, a, b, cumbrera }) / 2;
}

export function normalizarGeo(g) {
  const a = Math.max(0.1, num(g?.a, 20));          // dimensión según X
  const b = Math.max(0.1, num(g?.b, 30));          // dimensión según Y
  const hAlero = Math.max(0.1, num(g?.hAlero, 6));
  // ⚠ SI NO SE DECLARA TIPO, SE INFIERE DEL ÁNGULO — no se cae a «plana».
  //
  // Caer al primer tipo de la lista ponía θ = 0 y DESCARTABA EN SILENCIO el ángulo que el
  // usuario había escrito: la cubierta se inclinaba en el formulario y el cálculo seguía
  // siendo el de un techo plano. Un proyecto guardado antes de que existiera el tipo tiene
  // que seguir calculando lo mismo que calculaba, y eso era dos aguas.
  const tipo = g?.tipo ? tipoDe(g.tipo).id : (num(g?.theta, 0) > 0 ? "dos_aguas" : "plana");
  // Declarado el tipo, «plana» manda sobre el ángulo: si el tipo dice plana y el ángulo
  // dice 25°, uno de los dos miente, y gana el que el usuario eligió por su nombre. La
  // interfaz oculta el campo del ángulo en ese caso, para que la contradicción no exista.
  const theta = tipo === "plana" ? 0 : Math.max(0, Math.min(90, num(g?.theta, 0)));
  const cumbrera = g?.cumbrera === "Y" ? "Y" : "X";
  const pendienteHacia = g?.pendienteHacia ?? (cumbrera === "X" ? "+Y" : "+X");
  const h = alturaMedia({ hAlero, theta, a, b, cumbrera, tipo });
  return { a, b, hAlero, theta, cumbrera, tipo, pendienteHacia, h,
    hCumbre: hAlero + remonte({ tipo, theta, a, b, cumbrera }) };
}

// ── CÓMO SE TRATA LA CUBIERTA EN ESTA DIRECCIÓN ─────────────────────────────────
//
// Devuelve el modo y EL MOTIVO, porque el motivo es justamente lo que el usuario no puede
// deducir mirando un número. Tres modos posibles:
//
//   "franjas"  — zonificada desde el borde de barlovento (θ < 10°, o viento paralelo)
//   "faldones" — partida en barlovento y sotavento (dos o cuatro aguas, viento normal)
//   "unica"    — una sola superficie, toda barlovento o toda sotavento (nota 4)
export function modoCubierta({ geo, dir }) {
  const normal = geo.cumbrera !== dir.eje;
  if (geo.theta < 10) {
    return { modo: "franjas", normal, motivo:
      `θ = ${geo.theta}° < 10°: la Figura 2.4-1 zonifica en franjas desde el borde de `
      + "barlovento, cualquiera sea la dirección del viento." };
  }
  if (!normal) {
    return { modo: "franjas", normal, motivo:
      `El viento es PARALELO a la cumbrera (cumbrera según ${geo.cumbrera}), y para viento `
      + "paralelo la figura zonifica en franjas para todo θ." };
  }
  if (geo.tipo === "vertiente_unica") {
    // Nota 4: la superficie entera es barlovento o sotavento. Cuál, lo decide hacia dónde
    // CAE la pendiente: la normal de la superficie tiene su componente horizontal en esa
    // dirección, así que si el viento sopla en sentido contrario, la cara lo enfrenta.
    const pend = geo.pendienteHacia;
    const mismoEje = pend.slice(1) === dir.eje;
    const signoPend = pend[0] === "+" ? 1 : -1;
    const cara = !mismoEje ? null : (signoPend * dir.signo < 0 ? "barlovento" : "sotavento");
    return { modo: "unica", normal, cara, motivo:
      `Nota 4 de la Figura 2.4-1: en cubierta de vertiente única la superficie COMPLETA es `
      + `superficie a ${cara ?? "barlovento o sotavento"}. La pendiente desciende hacia `
      + `${pend} y el viento sopla hacia ${dir.signo > 0 ? "+" : "−"}${dir.eje}.` };
  }
  return { modo: "faldones", normal, motivo:
    `Cubierta ${geo.tipo === "cuatro_aguas" ? "a cuatro aguas" : "a dos aguas"} con θ = `
    + `${geo.theta}° ≥ 10° y viento NORMAL a la cumbrera: se parte en faldón a barlovento `
    + "y faldón a sotavento, cada uno con su Cp." };
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
  const L = dir.eje === "X" ? g.a : g.b;
  const B = dir.eje === "X" ? g.b : g.a;
  const hL = g.h / L;
  const mc = modoCubierta({ geo: g, dir });

  const qh = qDinamica({ ...sitio, z: g.h });
  const GCpi = gcpiDe(cerramiento) ?? 0;
  const qi = qh;

  // ── LA TRAZA ──────────────────────────────────────────────────────────────────
  // Cada paso con su valor, su referencia al reglamento y de dónde salió. No es un lujo:
  // un resultado de viento no se puede revisar sin saber qué fila de qué tabla se usó, y
  // sin eso la aplicación obliga a confiar en ella, que es lo contrario de lo que una
  // herramienta de cálculo tiene que pedir.
  const traza = [
    { paso: "Velocidad básica", simbolo: "V", dec: 1, valor: sitio.V, unidad: "m/s",
      ref: "Art. 1.5 · Figuras 1.5-1 A-D",
      detalle: "Ráfaga de 3 s a 10 m sobre el terreno, en exposición C." },
    { paso: "Factor de direccionalidad", simbolo: "K_d", dec: 2, valor: sitio.kd, unidad: "",
      ref: "Tabla 1.6-1",
      detalle: "Edificios — SPRFV. Sólo válido con las combinaciones del Apéndice B." },
    { paso: "Coeficiente de exposición en la cubierta", simbolo: "K_h", dec: 3, valor: kz(g.h, sitio.exposicion),
      unidad: "", ref: "Art. 1.13.1 · Tabla 1.13-1, nota 1",
      detalle: `Exposición ${sitio.exposicion}, z = h = ${fc(g.h)} m. `
        + `K_z = 2,41·(z/z_g)^(2/α) con α y z_g de la Tabla 1.9-1.` },
    { paso: "Factor topográfico", simbolo: "K_zt", dec: 2, valor: sitio.Kzt ?? 1, unidad: "",
      ref: "Art. 1.8", detalle: (sitio.Kzt ?? 1) === 1
        ? "Terreno llano. NO corresponde si el edificio está en la mitad superior de una "
          + "loma o cerca de la cresta de una escarpa."
        : "Calculado con la Figura 1.8-1." },
    { paso: "Factor de altitud", simbolo: "K_e", dec: 3, valor: sitio.usarKe === false ? 1
        : Math.exp(-0.000119 * (sitio.altitud || 0)), unidad: "",
      ref: "Art. 1.12 · Tabla 1.12-1, nota 2",
      detalle: `K_e = e^(−0,000119·z_g) con z_g = ${sitio.altitud || 0} m sobre el nivel del mar.` },
    { paso: "Presión dinámica en la cubierta", simbolo: "q_h", dec: 0, valor: qh, unidad: "N/m²",
      ref: "Expresión (1.13-1)",
      detalle: "q = 0,613·K_z·K_zt·K_d·K_e·V². El 0,613 es ½·ρ con ρ = 1,225 kg/m³." },
    { paso: "Factor de efecto de ráfaga", simbolo: "G", dec: 2, valor: G, unidad: "",
      ref: "Art. 1.9.1", detalle: "Valor por defecto para edificio rígido (n₁ ≥ 1 Hz)." },
    { paso: "Coeficiente de presión interna", simbolo: "GC_pi", dec: 2, valor: GCpi,
      unidad: "", texto: `±${GCpi.toFixed(2).replace(".", ",")}`,
      ref: "Tabla 1.11-1",
      detalle: "Se aplica en sus DOS signos: la nota 3 exige considerar el positivo sobre "
        + "todas las superficies internas y el negativo sobre todas." },
    { paso: "Relación de esbeltez de la cubierta", simbolo: "h/L", dec: 2, valor: hL, unidad: "",
      ref: "Figura 2.4-1", detalle: `h = ${fc(g.h)} m · L = ${fc(L)} m `
        + "(dimensión paralela al viento). Es la fila de la tabla de cubiertas." },
    { paso: "Relación en planta", simbolo: "L/B", dec: 2, valor: L / B, unidad: "",
      ref: "Figura 2.4-1", detalle: `L = ${fc(L)} m · B = ${fc(B)} m `
        + "(normal al viento). Es lo que fija el Cp de la pared a sotavento." },
    { paso: "Tratamiento de la cubierta", simbolo: "", valor: null, unidad: "",
      ref: "Figura 2.4-1", texto: mc.modo, detalle: mc.motivo },
  ];

  const sup = [];
  const agregar = (o) => sup.push({ ...o, ...presion({ q: o.q, qi, G, Cp: o.cp, GCpi }) });

  const perfil = perfilBarlovento({ h: g.h, sitio });
  sup.push({
    id: "pared_barlovento", nombre: "Pared a barlovento", tipo: "pared", usar: "qz",
    cp: CP_PARED.barlovento.cp, perfil,
    cpRef: "Figura 2.4-1 — pared a barlovento, todos los valores de L/B",
    tramos: perfil.map(t => ({ ...t,
      ...presion({ q: t.q, qi, G, Cp: CP_PARED.barlovento.cp, GCpi }) })),
  });
  agregar({ id: "pared_sotavento", nombre: "Pared a sotavento", tipo: "pared", usar: "qh",
    cp: cpSotavento(L, B), q: qh, relacion: `L/B = ${fc(L / B)}`,
    cpRef: `Figura 2.4-1 — pared a sotavento, interpolado en L/B = ${fc(L / B)} `
      + "entre los puntos 0–1 (−0,5), 2 (−0,3) y ≥4 (−0,2)" });
  agregar({ id: "pared_lateral", nombre: "Paredes laterales", tipo: "pared", usar: "qh",
    cp: CP_PARED.lateral.cp, q: qh,
    cpRef: "Figura 2.4-1 — paredes laterales, todos los valores de L/B" });

  const refFila = `h/L = ${fc(hL)}, interpolado entre las filas 0,25 · 0,5 · 1,0`;

  if (mc.modo === "faldones") {
    const [cpNeg, cpPos] = cpCubiertaBarlovento(hL, g.theta);
    agregar({ id: "cub_barlovento_neg", nombre: "Faldón a barlovento — caso de succión",
      tipo: "cubierta", usar: "qh", cp: cpNeg, q: qh, caso: "negativo",
      cpRef: `Figura 2.4-1 — barlovento, θ = ${g.theta}°, ${refFila}` });
    agregar({ id: "cub_barlovento_pos", nombre: "Faldón a barlovento — caso de presión",
      tipo: "cubierta", usar: "qh", cp: cpPos, q: qh, caso: "positivo",
      cpRef: `Figura 2.4-1 — barlovento, segundo valor de la celda (nota 3), θ = ${g.theta}°` });
    agregar({ id: "cub_sotavento", nombre: "Faldón a sotavento", tipo: "cubierta",
      usar: "qh", cp: cpCubiertaSotavento(hL, g.theta), q: qh,
      cpRef: `Figura 2.4-1 — sotavento, θ = ${g.theta}°, ${refFila}` });
  } else if (mc.modo === "unica") {
    // Nota 4: una sola superficie, con el Cp de la columna que corresponda.
    if (mc.cara === "barlovento") {
      const [cpNeg, cpPos] = cpCubiertaBarlovento(hL, g.theta);
      agregar({ id: "cub_unica_neg", nombre: "Cubierta completa — caso de succión",
        tipo: "cubierta", usar: "qh", cp: cpNeg, q: qh, caso: "negativo",
        cpRef: `Figura 2.4-1 nota 4 — toda la superficie a barlovento, θ = ${g.theta}°, ${refFila}` });
      agregar({ id: "cub_unica_pos", nombre: "Cubierta completa — caso de presión",
        tipo: "cubierta", usar: "qh", cp: cpPos, q: qh, caso: "positivo",
        cpRef: `Figura 2.4-1 nota 4 — toda la superficie a barlovento, segundo valor (nota 3)` });
    } else {
      agregar({ id: "cub_unica", nombre: "Cubierta completa — a sotavento",
        tipo: "cubierta", usar: "qh", cp: cpCubiertaSotavento(hL, g.theta), q: qh,
        cpRef: `Figura 2.4-1 nota 4 — toda la superficie a sotavento, θ = ${g.theta}°, ${refFila}` });
    }
  } else {
    const zonas = cpCubiertaParalelo(hL);
    let desde = 0;
    zonas.forEach((z, i) => {
      if (desde >= L / g.h) return;
      const etiqueta = z.hasta === Infinity ? `> ${desde}h` : `${desde}h a ${z.hasta}h`;
      const hasta = z.hasta === Infinity ? L / g.h : Math.min(z.hasta, L / g.h);
      const ref = `Figura 2.4-1 — franja ${etiqueta} desde el borde de barlovento, `
        + `h/L = ${fc(hL)}`;
      agregar({ id: `cub_franja_${i}`, nombre: `Cubierta — franja ${etiqueta}`,
        tipo: "cubierta", usar: "qh", cp: z.cp[0], q: qh, zona: { desde, hasta },
        caso: "negativo", cpRef: ref });
      agregar({ id: `cub_franja_${i}_pos`, nombre: `Cubierta — franja ${etiqueta} (2° caso)`,
        tipo: "cubierta", usar: "qh", cp: z.cp[1], q: qh, zona: { desde, hasta },
        caso: "positivo", cpRef: `${ref} — segundo valor de la celda (nota 3)` });
      desde = z.hasta;
    });
  }

  return { dir, geo: g, L, B, hL, qh, GCpi, G, cerramiento, sitio,
    modo: mc.modo, motivoModo: mc.motivo, caraUnica: mc.cara,
    normalACumbrera: mc.normal, superficies: sup, perfil, traza };
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
