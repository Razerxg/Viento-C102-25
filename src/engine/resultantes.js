// RESULTANTES EN LA BASE — corte total, levantamiento y momento de vuelco.
//
// Es lo que sale de esta aplicación hacia el cálculo de la estructura y de la fundación.
// Hasta acá el motor daba presiones por superficie; esto las integra.
//
// ── TRES SUTILEZAS QUE CAMBIAN EL RESULTADO ─────────────────────────────────────
//
// 1. **LA PRESIÓN INTERNA SE CANCELA EN EL CORTE Y NO EN EL LEVANTAMIENTO.**
//    En las paredes actúa por igual y en sentido opuesto sobre barlovento y sotavento, así
//    que su resultante horizontal es nula: el corte se calcula con las presiones EXTERNAS
//    solas. En la cubierta no hay nada que la compense, y ahí sí gobierna: es el término
//    que decide el levantamiento de una cubierta liviana.
//
// 2. **LA PARED A BARLOVENTO SE INTEGRA ESCALONADA.** Usa `q_z`, que crece con la altura.
//    Tomar `q_h` en toda su altura sobreestima el corte y, peor, corre el punto de
//    aplicación hacia arriba: el momento de vuelco sale más alto de lo que es.
//
// 3. **NOTA 7 DE LA FIGURA 2.4-1** — «el corte horizontal total no debe ser menor que el
//    determinado despreciando las fuerzas de viento sobre las superficies del techo». Con
//    cubierta inclinada las succiones de los dos faldones tienen componente horizontal y
//    pueden restar; la nota pone un piso. Se calcula el aporte real y después se aplica el
//    piso, informando cuál gobernó.
import { CP_PARED } from '../constants/presionesExternas.js';
import { cpSotavento } from './presiones.js';
import { momentoHasta } from './fachadas.js';

// ── APORTE DE LAS PAREDES ───────────────────────────────────────────────────────
//
// Devuelve fuerza horizontal y su momento respecto de la base. Sólo presiones externas:
// ver la sutileza 1.
export function aporteParedes({ analisis }) {
  const { L, B, qh, G, fachadas } = analisis;
  const bar = analisis.superficies.find(s => s.id === "pared_barlovento");

  // ── BARLOVENTO ────────────────────────────────────────────────────────────────
  // Se integra tramo a tramo, cada uno con su q_z Y CON SU ÁREA REAL. El área y el
  // momento estático de cada franja salen de la forma de la pared en forma cerrada: en un
  // hastial el ancho se va cerrando hacia la cumbrera, y tomar `B·dz` sobreestima
  // justamente la franja de mayor q_z y mayor brazo.
  let F = 0, M = 0;
  for (const t of bar.tramos) {
    const p = t.q * G * CP_PARED.barlovento.cp;      // externa
    F += p * t.area;
    M += p * t.momento;                              // ∫ p·z·ancho(z) dz, exacto
  }
  const fBar = F;

  // ── SOTAVENTO ─────────────────────────────────────────────────────────────────
  // q_h constante sobre el ÁREA REAL de la pared, que con viento paralelo a la cumbrera
  // incluye el frontón. Succiona, o sea que empuja al edificio en el MISMO sentido que el
  // viento: su aporte al corte se suma en valor absoluto.
  const sot = fachadas.sotavento;
  const pSot = qh * G * cpSotavento(L, B);
  const fSot = Math.abs(pSot) * sot.area;
  F += fSot;
  M += Math.abs(pSot) * momentoHasta(sot, sot.z2);

  return { F, M, barlovento: fBar, sotavento: fSot,
    areaBarlovento: bar.fachada.area, areaSotavento: sot.area };
}

// ── APORTE DE LA CUBIERTA ───────────────────────────────────────────────────────
//
// La presión actúa NORMAL a la superficie. Sobre un faldón de pendiente θ, con `p`
// positiva HACIA la superficie, la fuerza vale p·A_inclinada en la dirección −n, con n el
// normal exterior. Con A_inclinada = A_planta/cosθ eso da:
//
//   · componente vertical   V = −p · A_planta            (positiva hacia arriba)
//   · componente horizontal H = ±p · tanθ · A_planta     (positiva a favor del viento)
//
// ⚠ EL SIGNO DE H ESTABA INVERTIDO. Un faldón a BARLOVENTO asciende en el sentido del
// viento, así que su normal exterior tiene componente horizontal CONTRA el viento —para
// z = x·tanθ, n ∝ (−senθ, 0, cosθ)— y la fuerza, que va según −n, empuja A FAVOR:
//
//   barlovento:  H = +p·tanθ·A_planta
//   sotavento:   H = −p·tanθ·A_planta
//
// El código tenía −1 en barlovento y +1 en sotavento. En un caballete simétrico los dos
// faldones se cancelan y el error no se ve; aparece apenas los Cp difieren, que es
// siempre, y cambia el signo del aporte de la cubierta al corte.
//
// ⚠ H SE CALCULA SÓLO CON PRESIONES EXTERNAS. La presión interna actúa sobre las dos
// caras de la envolvente y su resultante horizontal se cancela; dejarla entrar hacía que
// el corte dependiera del signo de GC_pi, que es un dato de la ENVOLVENTE y no del
// empuje. En el levantamiento no se cancela y ahí sí entra.
const rad2 = (g) => g * Math.PI / 180;

/**
 * Las partes de cubierta que ve esta dirección, con su extensión en planta.
 *
 * `desde` y `hasta` se miden DESDE EL BORDE DE BARLOVENTO, en metros. Se usan para el
 * brazo en planta de la resultante vertical, que es lo que el vuelco necesita.
 */
function partesCubierta(analisis, casoNota3) {
  const { geo, L, modo } = analisis;
  const cub = analisis.superficies.filter(s => s.tipo === "cubierta");
  const buscar = (id) => cub.find(o => o.id === id);

  if (modo === "faldones") {
    const bar = buscar(casoNota3 === "positivo" ? "cub_barlovento_pos" : "cub_barlovento_neg");
    return [
      { s: bar, desde: 0, hasta: L / 2, sentido: +1 },
      { s: buscar("cub_sotavento"), desde: L / 2, hasta: L, sentido: -1 },
    ];
  }
  if (modo === "unica") {
    const esBar = analisis.caraUnica === "barlovento";
    const s = esBar
      ? buscar(casoNota3 === "positivo" ? "cub_unica_pos" : "cub_unica_neg")
      : buscar("cub_unica");
    // La superficie entera asciende con el viento si es a barlovento, y desciende si es a
    // sotavento: el mismo criterio de signo que los faldones.
    return [{ s, desde: 0, hasta: L, sentido: esBar ? +1 : -1 }];
  }

  // FRANJAS. La zonificación se mide desde el borde de barlovento y no distingue faldones,
  // así que el sentido de cada franja lo decide dónde cae respecto de la cumbrera.
  //
  // Con viento PARALELO a la cumbrera la pendiente es transversal al viento y no deja
  // componente horizontal: `sentido = 0` es exacto, no una simplificación. Con viento
  // normal y θ < 10° sí la hay, chica pero real, y se reparte partiendo cada franja en la
  // cumbrera.
  const norm = analisis.normalACumbrera;
  const xCumbrera = analisis.geo.tipo === "vertiente_unica" ? null : L / 2;
  const partes = [];
  for (const s of cub.filter(o => (casoNota3 === "positivo" ? o.caso === "positivo" : o.caso !== "positivo"))) {
    const d = (s.zona?.desde ?? 0) * geo.h;
    const h2 = Math.min((s.zona?.hasta ?? L / geo.h) * geo.h, L);
    if (!(h2 > d)) continue;
    if (!norm || geo.theta <= 0) { partes.push({ s, desde: d, hasta: h2, sentido: 0 }); continue; }
    if (xCumbrera == null) {
      // Vertiente única con θ < 10°: una sola pendiente en toda la luz.
      const pend = geo.pendienteHacia;
      const mismoEje = pend.slice(1) === analisis.dir.eje;
      const signoPend = pend[0] === "+" ? 1 : -1;
      const asciende = mismoEje && signoPend * analisis.dir.signo < 0;
      partes.push({ s, desde: d, hasta: h2, sentido: mismoEje ? (asciende ? +1 : -1) : 0 });
      continue;
    }
    const aBar = [d, Math.min(h2, xCumbrera)];
    const aSot = [Math.max(d, xCumbrera), h2];
    if (aBar[1] > aBar[0]) partes.push({ s, desde: aBar[0], hasta: aBar[1], sentido: +1 });
    if (aSot[1] > aSot[0]) partes.push({ s, desde: aSot[0], hasta: aSot[1], sentido: -1 });
  }
  return partes;
}

/**
 * @param {object} o
 * @param {any} o.analisis
 * @param {"negativo"|"positivo"} [o.casoNota3]  cuál de los dos valores del faldón a
 *   barlovento se adopta. La nota 3 exige calcular los dos.
 * @param {string} [o.casoInterno]  qué caso de presión interna gobierna el LEVANTAMIENTO.
 */
export function aporteCubierta({ analisis, casoNota3 = "negativo", casoInterno = "conInternaPos" }) {
  const { geo, B } = analisis;
  const tan = Math.tan(rad2(geo.theta));

  let V = 0, H = 0, Mv = 0;   // Mv = momento estático de V en planta, para el brazo
  const partes = [];

  for (const { s, desde, hasta, sentido } of partesCubierta(analisis, casoNota3)) {
    if (!s || !(hasta > desde)) continue;
    const areaProy = (hasta - desde) * B;
    const pInt = s[casoInterno];          // levantamiento: con presión interna
    const pExt = s.externa;               // corte: sólo externa
    const v = -pInt * areaProy;           // p negativa (succión) ⇒ V positivo = levanta
    const h = sentido * pExt * tan * areaProy;
    V += v; H += h;
    Mv += v * (desde + hasta) / 2;
    partes.push({ id: s.id, nombre: s.nombre, cp: s.cp, p: pInt, externa: pExt,
      desde, hasta, areaProy, vertical: v, horizontal: h, sentido });
  }
  // Punto de aplicación de la resultante vertical, medido desde el borde de barlovento.
  // Sin resultante no hay punto de aplicación: `null` y no un 0 que parezca una cota.
  const xV = Math.abs(V) > 1e-12 ? Mv / V : null;
  return { V, H, xV, partes, casoNota3 };
}

// ── RESULTANTES ─────────────────────────────────────────────────────────────────
//
// ── EL VUELCO INCLUYE LA RESULTANTE VERTICAL ───────────────────────────────────
// Antes el vuelco eran sólo las fuerzas horizontales. La succión de la cubierta es una
// fuerza vertical con brazo en planta, y en un edificio bajo y largo es el término que
// más pesa: con L = 40 m el brazo llega a 20 m, más que la altura.
//
// Convención: momento POSITIVO = el que tiende a levantar el borde de BARLOVENTO. Una
// fuerza horizontal a favor del viento, a la cota z, aporta F·z —el brazo es la altura,
// cualquiera sea el punto de la base respecto del que se tome, porque la fuerza es
// horizontal—. Un levantamiento V aplicado a la abscisa x aporta V·(x_ref − x).
export function resultantes(analisis) {
  const par = aporteParedes({ analisis });

  // Nota 3 de la Figura 2.4-1: el faldón a barlovento está sujeto a presión positiva y
  // negativa a la vez, y hay que calcular las dos. Gobierna el corte la que dé mayor.
  const casos = ["negativo", "positivo"].map(c =>
    aporteCubierta({ analisis, casoNota3: /** @type {any} */ (c) }));
  const cub = casos.reduce((a, b) => (par.F + b.H > par.F + a.H ? b : a));

  const conCubierta = par.F + cub.H;
  const gobiernaNota7 = conCubierta < par.F;
  const cortante = Math.max(conCubierta, par.F);

  // El levantamiento se toma como la envolvente de los dos casos de la nota 3.
  const levCaso = casos.reduce((a, b) => (b.V > a.V ? b : a));

  const L = analisis.L;
  const mCub = cub.H * analisis.geo.h;           // horizontal de cubierta, a la cota h
  const mHoriz = par.M + (gobiernaNota7 ? 0 : mCub);
  const momentoDe = (xRef) => mHoriz
    + (levCaso.xV == null ? 0 : levCaso.V * (xRef - levCaso.xV));

  return {
    cortante,
    // El vuelco de referencia es el tomado respecto del CENTRO de la base.
    vuelco: momentoDe(L / 2),
    momentos: {
      centro: momentoDe(L / 2),
      bordeBarlovento: momentoDe(0),
      bordeSotavento: momentoDe(L),
      horizontal: mHoriz,
      vertical: levCaso.xV == null ? 0 : levCaso.V * (L / 2 - levCaso.xV),
    },
    levantamiento: levCaso.V,
    verticalCubierta: { V: levCaso.V, xV: levCaso.xV, casoNota3: levCaso.casoNota3 },
    gobiernaNota7, casoNota3: cub.casoNota3,
    detalle: { paredes: par, cubierta: cub, casos,
      corteParedes: par.F, corteCubierta: cub.H },
  };
}

// ── BARRIDO SOBRE LA ALTURA DE ALERO ────────────────────────────────────────────
//
// Con qué crece cada resultante NO es evidente: el corte crece más que linealmente porque
// `q_z` crece con la altura, el levantamiento apenas cambia porque la cubierta no crece, y
// el vuelco es el que se dispara. Verlo en una curva es lo que permite elegir la altura.
export function barridoAlero({ analizar, entrada, direccion, desde = 3, hasta = 30, pasos = 28 }) {
  const out = [];
  for (let i = 0; i <= pasos; i++) {
    const hAlero = desde + (hasta - desde) * i / pasos;
    const r = analizar({ ...entrada, geo: { ...entrada.geo, hAlero } }, direccion);
    const res = resultantes(r);
    out.push({ hAlero, h: r.geo.h, ...res, qh: r.qh });
  }
  return out;
}

// La envolvente de las cuatro direcciones: es lo que gobierna el diseño, y mirar una sola
// dirección puede dejar afuera justo la que manda.
export function envolvente(porDireccion) {
  const n = porDireccion[0].length;
  return Array.from({ length: n }, (_, i) => {
    const fila = porDireccion.map(d => d[i]);
    const max = (k) => fila.reduce((m, f) => Math.abs(f[k]) > Math.abs(m[k]) ? f : m, fila[0]);
    return { hAlero: fila[0].hAlero, h: fila[0].h,
      cortante: max("cortante").cortante,
      levantamiento: max("levantamiento").levantamiento,
      vuelco: max("vuelco").vuelco };
  });
}
