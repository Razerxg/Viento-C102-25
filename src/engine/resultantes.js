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
import { momentoHasta, siluetaProyectada } from './fachadas.js';
import { MINIMOS } from './presiones.js';

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
 * @param {boolean} [o.pisoSolidario]  el piso es parte de la estructura: la presión
 *   interna se autoequilibra y la resultante vertical global sale sólo de las externas.
 */
export function aporteCubierta({ analisis, casoNota3 = "negativo",
  casoInterno = "conInternaPos", pisoSolidario = false }) {
  const { geo, B } = analisis;
  const tan = Math.tan(rad2(geo.theta));

  let V = 0, H = 0, Mv = 0;   // Mv = momento estático de V en planta, para el brazo
  const partes = [];

  for (const { s, desde, hasta, sentido } of partesCubierta(analisis, casoNota3)) {
    if (!s || !(hasta > desde)) continue;
    const areaProy = (hasta - desde) * B;
    // ── PISO SOLIDARIO A LA ESTRUCTURA ────────────────────────────────────────
    // La presión interna actúa sobre TODA la envolvente interior, piso incluido. Si el
    // piso es parte de la estructura —un contenedor, un shelter sobre skid, un módulo—
    // la componente vertical que empuja la cubierta hacia arriba tiene su reacción
    // empujando el piso hacia abajo, y el par se autoequilibra: no llega ni al
    // levantamiento global ni al vuelco. En un edificio apoyado en el terreno no hay tal
    // piso y la presión interna sí levanta.
    //
    // ⚠ NO CAMBIA LA PRESIÓN NETA SOBRE LA CUBIERTA. Las chapas, las correas y sus
    // fijaciones siguen viendo externa ± interna: lo que se autoequilibra es la
    // RESULTANTE GLOBAL, no la carga local.
    const pInt = pisoSolidario ? s.externa : s[casoInterno];
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
/**
 * CARGA MÍNIMA DEL ART. 2.1.5 — un CASO DE CARGA APARTE, no un piso por cara.
 *
 * ⚠ ANTES HABÍA UN `aplicarMinimoPared` QUE SUBÍA CADA PRESIÓN A 0,75 kN/m². Eso no es lo
 * que dice el artículo y estaba mal de dos maneras: aplicaba el mínimo superficie por
 * superficie —cuando el 2.1.5 habla del SISTEMA— y no distinguía pared de cubierta, que
 * llevan 0,75 y 0,40. Además nunca se usó: estaba exportado y ningún archivo lo llamaba.
 *
 * El artículo pide, sobre las áreas PROYECTADAS en un plano vertical normal al viento:
 *   · cerrado o parcialmente cerrado: 0,75 kN/m²·A_pared + 0,40 kN/m²·A_cubierta,
 *     aplicadas SIMULTÁNEAMENTE;
 *   · abierto: 0,75 kN/m²·A_f.
 *
 * Devuelve el caso COMPLETO —fuerza, punto de aplicación y momento en la base—, no sólo
 * la fuerza: un caso de carga sin punto de aplicación no se puede combinar con nada.
 */
export function cargaMinima(analisis) {
  const sil = siluetaProyectada(analisis.geo, analisis.dir);
  const abierto = analisis.cerramiento === "abierto";

  const partes = abierto
    ? [{ id: "af", label: "A_f (pared + cubierta proyectadas)", presion: MINIMOS.abierto,
         area: sil.pared + sil.cubierta,
         zBar: sil.zBarCubierta == null ? sil.zBarPared
           : (sil.pared * sil.zBarPared + sil.cubierta * sil.zBarCubierta)
             / (sil.pared + sil.cubierta) }]
    : [{ id: "pared", label: "Pared proyectada", presion: MINIMOS.pared,
         area: sil.pared, zBar: sil.zBarPared },
       { id: "cubierta", label: "Cubierta proyectada", presion: MINIMOS.cubierta,
         area: sil.cubierta, zBar: sil.zBarCubierta ?? 0 }];

  const conFuerza = partes.map(p => ({ ...p, fuerza: p.presion * p.area,
    momento: p.presion * p.area * p.zBar }));
  const fuerza = conFuerza.reduce((a, p) => a + p.fuerza, 0);
  const momento = conFuerza.reduce((a, p) => a + p.momento, 0);

  return {
    fuerza, momento,
    // Punto de aplicación de la resultante: baricentro pesado de las partes.
    zBar: fuerza > 1e-9 ? momento / fuerza : null,
    partes: conFuerza,
    areaPared: sil.pared, zBarPared: sil.zBarPared,
    areaCubierta: sil.cubierta, zBarCubierta: sil.zBarCubierta,
    abierto, nota: sil.nota,
    ref: abierto ? "Art. 2.1.5 — edificio abierto: 0,75 kN/m² sobre A_f"
      : "Art. 2.1.5 — 0,75 kN/m² sobre la pared y 0,40 kN/m² sobre la cubierta, "
        + "proyectadas en un plano vertical normal al viento y simultáneas" };
}

/**
 * UN ESTADO DE CARGA COMPLETO para uno de los dos casos de la nota 3.
 *
 * ── POR QUÉ HACE FALTA LA TERNA ENTERA ─────────────────────────────────────────
 * Antes `resultantes()` tomaba el corte del caso que maximizaba H y el levantamiento del
 * que maximizaba V, y los combinaba en un solo vuelco. El número que salía no correspondía
 * a NINGÚN estado de carga: en un galpón parcialmente cerrado, viento Wy+, el momento en
 * el borde de sotavento daba 6.649 kNm cuando el caso de succión daba 6.081 y el de
 * presión 4.988.
 *
 * Un caso de carga es un conjunto de fuerzas CONCURRENTES. La envolvente se arma tomando
 * máximos SOBRE CASOS, no máximos por componente, y diciendo qué caso gobierna cada
 * magnitud. Es además la estructura que necesitan la envolvente de direcciones y las
 * reacciones de base: ahí cada caso viaja entero.
 */
function estadoDeCarga({ analisis, par, casoNota3, exentoNota7, pisoSolidario }) {
  const cub = aporteCubierta({ analisis, casoNota3, pisoSolidario });

  const conCubierta = par.F + cub.H;
  // NOTA 7 de la Figura 2.4-1: el corte no puede quedar por debajo del de las paredes
  // solas… «excepto para SPRFVs en el techo consistentes en entramados resistentes a
  // momento», que es la excepción que el usuario declara. Por defecto el piso se aplica.
  const gobiernaNota7 = !exentoNota7 && conCubierta < par.F;
  const cortante = gobiernaNota7 ? par.F : conCubierta;

  // Convención: momento POSITIVO = el que tiende a levantar el borde de BARLOVENTO. Una
  // fuerza horizontal a la cota z aporta F·z —el brazo es la altura, cualquiera sea el
  // punto de la base respecto del que se tome, porque la fuerza es horizontal—. Un
  // levantamiento V aplicado a la abscisa x aporta V·(x_ref − x).
  const mCub = cub.H * analisis.geo.h;
  const horizontal = par.M + (gobiernaNota7 ? 0 : mCub);
  const momentoDe = (xRef) => horizontal + (cub.xV == null ? 0 : cub.V * (xRef - cub.xV));
  const L = analisis.L;

  return {
    casoNota3,
    H: cub.H, V: cub.V, xV: cub.xV,
    cortante, gobiernaNota7,
    vuelco: momentoDe(L / 2),
    momentos: {
      centro: momentoDe(L / 2),
      bordeBarlovento: momentoDe(0),
      bordeSotavento: momentoDe(L),
      horizontal,
      vertical: cub.xV == null ? 0 : cub.V * (L / 2 - cub.xV),
    },
    partes: cub.partes,
  };
}

/**
 * @param {any} analisis
 * @param {object} [opc]
 * @param {boolean} [opc.porticosCubierta]  el SPRFV de cubierta son entramados resistentes
 *   a momento. La propia nota 7 de la Figura 2.4-1 exceptúa ese caso del piso al corte.
 *   Por defecto NO, que es el piso aplicado.
 * @param {boolean} [opc.pisoSolidario]  el piso es parte de la estructura, así que la
 *   presión interna se autoequilibra en la resultante vertical global y en el vuelco.
 */
export function resultantes(analisis, opc = {}) {
  const par = aporteParedes({ analisis });
  const exentoNota7 = opc.porticosCubierta === true;
  const pisoSolidario = opc.pisoSolidario === true;

  // Los DOS casos de la nota 3, cada uno completo.
  const casos = ["negativo", "positivo"].map(c =>
    estadoDeCarga({ analisis, par, casoNota3: /** @type {any} */ (c),
      exentoNota7, pisoSolidario }));

  /** Máximo en VALOR ABSOLUTO sobre los casos, devolviendo el caso entero. */
  const gobierna = (f) => casos.reduce((a, b) => (Math.abs(f(b)) > Math.abs(f(a)) ? b : a));

  const cCorte = gobierna(c => c.cortante);
  const cLev = gobierna(c => c.V);
  const cVuelco = gobierna(c => c.momentos.centro);
  const cBar = gobierna(c => c.momentos.bordeBarlovento);
  const cSot = gobierna(c => c.momentos.bordeSotavento);

  // ── EDIFICIO ABIERTO: EL RESULTADO NO ES VÁLIDO ───────────────────────────────
  // Un edificio abierto no se resuelve con los Cp de la Figura 2.4-1 sino con los C_N de
  // las Figuras 2.4-4 a 2.4-7, que no están implementados. Devolver un número igual sería
  // devolver el de otro edificio.
  const valido = analisis.cerramiento !== "abierto";
  const minimo = cargaMinima(analisis);

  return {
    // Cada escalar de la envolvente SALE DE UN CASO, y se dice de cuál.
    cortante: cCorte.cortante,
    levantamiento: cLev.V,
    vuelco: cVuelco.momentos.centro,
    gobiernaNota7: cCorte.gobiernaNota7,
    casoNota3: cCorte.casoNota3,

    /** Qué caso gobierna cada magnitud. */
    gobernante: {
      cortante: cCorte.casoNota3, levantamiento: cLev.casoNota3,
      vuelco: cVuelco.casoNota3, bordeBarlovento: cBar.casoNota3,
      bordeSotavento: cSot.casoNota3,
    },

    // Los momentos también son de un caso cada uno, y el desglose horizontal/vertical
    // viene del MISMO caso que el total: si no, la suma no cerraría.
    momentos: {
      centro: cVuelco.momentos.centro,
      bordeBarlovento: cBar.momentos.bordeBarlovento,
      bordeSotavento: cSot.momentos.bordeSotavento,
      horizontal: cVuelco.momentos.horizontal,
      vertical: cVuelco.momentos.vertical,
    },

    verticalCubierta: { V: cLev.V, xV: cLev.xV, casoNota3: cLev.casoNota3 },

    valido,
    motivoInvalido: valido ? null
      : "Edificio ABIERTO. El capítulo 2 lo resuelve con los coeficientes C_N de las "
        + "Figuras 2.4-4 a 2.4-7, que todavía no están implementados. Lo que se muestra "
        + "sale de aplicar los Cp de la Figura 2.4-1, que son de edificios cerrados: no "
        + "corresponde usarlo.",
    cargaMinima: minimo,
    gobiernaMinimo: minimo.fuerza > Math.abs(cCorte.cortante),
    exentoNota7, pisoSolidario,

    /**
     * Traza de las DECLARACIONES del proyectista: qué se declaró, qué artículo lo
     * habilita y qué cambió en el resultado. Son las dos cosas que la app no puede
     * deducir de la geometría, así que tienen que quedar escritas junto al número.
     */
    trazaDeclaraciones: [
      { id: "nota7", declarado: exentoNota7,
        titulo: "SPRFV de cubierta con entramados resistentes a momento",
        ref: "Figura 2.4-1, nota 7",
        efecto: exentoNota7
          ? "NO se aplica el piso al corte. Las componentes horizontales de cubierta "
            + "pueden restar, porque el sistema de cubierta las toma."
          : "Se aplica el piso: el corte no baja del de las paredes solas. Es la regla "
            + "general de la nota 7." },
      { id: "piso", declarado: pisoSolidario,
        titulo: "Piso solidario a la estructura",
        ref: "Art. 2.4.1 · equilibrio de la presión interna",
        efecto: pisoSolidario
          ? "La presión interna NO entra en la resultante vertical global ni en el "
            + "vuelco: actúa sobre toda la envolvente interior, y el empuje sobre la "
            + "cubierta tiene su reacción sobre el piso. La presión NETA sobre la "
            + "cubierta —chapas, correas, fijaciones— no cambia."
          : "La presión interna SÍ levanta: sin piso estructural no hay nada que tome su "
            + "reacción. Es la hipótesis conservadora y la que corresponde a un edificio "
            + "apoyado en el terreno." },
    ],

    /** Los dos estados de carga completos, para la envolvente y las reacciones de base. */
    casos,
    detalle: { paredes: par, cubierta: { H: cCorte.H, V: cLev.V, partes: cCorte.partes },
      casos, corteParedes: par.F, corteCubierta: cCorte.H },
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
