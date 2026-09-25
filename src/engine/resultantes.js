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

const rad = (g) => g * Math.PI / 180;

// ── APORTE DE LAS PAREDES ───────────────────────────────────────────────────────
//
// Devuelve fuerza horizontal y su momento respecto de la base. Sólo presiones externas:
// ver la sutileza 1.
export function aporteParedes({ analisis }) {
  const { geo, B, L, qh, G } = analisis;
  const bar = analisis.superficies.find(s => s.id === "pared_barlovento");

  // barlovento: se integra tramo a tramo, cada uno con su q_z
  let F = 0, M = 0;
  for (const t of bar.tramos) {
    const p = t.q * G * CP_PARED.barlovento.cp;      // externa
    const dz = t.hasta - t.desde;
    const f = p * B * dz;
    F += f;
    M += f * (t.desde + t.hasta) / 2;                // brazo al centro del tramo
  }
  // sotavento: presión constante en toda la altura. Succiona, o sea que empuja al edificio
  // en el MISMO sentido que el viento: su aporte al corte se suma en valor absoluto.
  const pSot = qh * G * cpSotavento(L, B);
  const fSot = Math.abs(pSot) * B * geo.hAlero;
  F += fSot;
  M += fSot * geo.hAlero / 2;

  return { F, M, barlovento: F - fSot, sotavento: fSot };
}

// ── APORTE DE LA CUBIERTA ───────────────────────────────────────────────────────
//
// La presión actúa NORMAL a la superficie. Sobre un faldón de pendiente θ eso da:
//   · componente vertical   = p · (área proyectada en planta)
//   · componente horizontal = p · tanθ · (área proyectada en planta) · sentido
//
// El `sentido` sale de hacia dónde mira la cara: un faldón que asciende en la dirección
// del viento tiene su normal inclinada hacia atrás, y su succión tira del edificio HACIA
// BARLOVENTO. Por eso los dos faldones de un caballete simétrico se cancelan cuando sus
// coeficientes son iguales, y sólo la diferencia entre ellos deja corte.
export function aporteCubierta({ analisis, casoInterno = "conInternaPos" }) {
  const { geo, B, L, modo } = analisis;
  const th = rad(geo.theta);
  const cub = analisis.superficies.filter(s => s.tipo === "cubierta");

  let V = 0, H = 0;      // vertical (positivo = hacia arriba) y horizontal (positivo = a favor del viento)
  const partes = [];

  // Para el levantamiento se toma el caso de presión interna que lo AGRAVA, que es el
  // positivo: empuja la cubierta desde adentro hacia afuera.
  const casos = modo === "faldones"
    ? [["cub_barlovento_neg", L / 2, -1], ["cub_sotavento", L / 2, +1]]
    : modo === "unica"
      ? [[cub.find(s => s.caso !== "positivo")?.id, L, analisis.caraUnica === "barlovento" ? -1 : +1]]
      : cub.filter(s => s.caso !== "positivo").map(s => {
          const d = (s.zona?.desde ?? 0) * geo.h, h2 = Math.min((s.zona?.hasta ?? L / geo.h) * geo.h, L);
          return [s.id, Math.max(0, h2 - d), 0];      // franjas: θ < 10° o viento paralelo ⇒ sin componente horizontal apreciable
        });

  for (const [id, largo, sentido] of casos) {
    const s = cub.find(o => o.id === id);
    if (!s || !(largo > 0)) continue;
    const areaProy = largo * B;
    const p = s[casoInterno];
    V += -p * areaProy;                       // p negativo (succión) ⇒ V positivo = levanta
    H += sentido * p * Math.tan(th) * areaProy;
    partes.push({ id, nombre: s.nombre, cp: s.cp, p, areaProy,
      vertical: -p * areaProy, horizontal: sentido * p * Math.tan(th) * areaProy });
  }
  return { V, H, partes };
}

// ── RESULTANTES ─────────────────────────────────────────────────────────────────
export function resultantes(analisis) {
  const par = aporteParedes({ analisis });
  const cub = aporteCubierta({ analisis });

  // Nota 7: el corte no puede quedar por debajo del de paredes solas.
  const conCubierta = par.F + cub.H;
  const gobiernaNota7 = conCubierta < par.F;
  const cortante = Math.max(conCubierta, par.F);

  // Momento de vuelco respecto de la base, por las fuerzas horizontales. El aporte de la
  // cubierta actúa a la altura media de cubierta.
  const mCub = cub.H * analisis.geo.h;
  const vuelco = par.M + (gobiernaNota7 ? 0 : mCub);

  return {
    cortante, vuelco,
    levantamiento: cub.V,
    gobiernaNota7,
    detalle: { paredes: par, cubierta: cub, corteParedes: par.F, corteCubierta: cub.H },
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
