// CONSOLIDACIÓN DE LA TRAZA — de los cinco motores a un solo árbol de bloques.
//
// Es la función que el panel, la memoria y el Word comparten. Cada uno la llama una vez y
// renderiza lo que sale: si el panel y la memoria armaran cada uno su recorrido, la
// primera vez que se agregue un paso a uno de los dos, la otra salida va a quedar atrás
// sin que nada falle.
//
// ⚠ NO CALCULA NADA. Lee resultados ya hechos y los reordena. Cualquier cuenta que
// aparezca acá es una segunda definición de algo que el motor ya resolvió, y el día que
// las dos se separen la memoria informa un número que el cálculo nunca usó.
import { paso, bloque, SIM, con, desdeTrazaVieja } from './traza.js';

const fc = (n, d = 2) => Number(n).toFixed(d).replace(".", ",");
const pct = (n) => `${fc(n, 1)} %`;

/** Los puntos de una interpolación, tal como los devuelve `engine/interpolacion.js`. */
const pts = (r) => r?.puntos?.length ? r.puntos : null;

// ── 1 · SITIO Y VELOCIDAD BÁSICA ────────────────────────────────────────────────
function bloqueVelocidad({ vel, d }) {
  const p = [];
  p.push(paso({
    id: "V", titulo: "Velocidad básica del viento", art: "Art. 1.5 · Figura 1.5-1",
    valor: vel.V, unidad: "m/s", dec: 1,
    donde: [SIM.V],
    texto: vel.V == null ? "sin determinar" : null,
    nota: vel.detalleOrigen,
  }));
  if (vel.cuenta) {
    p.push(paso({ id: "V_cuenta", titulo: "Cómo se obtuvo", art: "Art. 1.5",
      formula: vel.cuenta,
      donde: vel.origen === "v50"
        ? [{ sim: "v₅₀", desc: "velocidad básica del CIRSOC 102-2005", unidad: "m/s" },
          { sim: "I", desc: "factor de importancia de la categoría de riesgo",
            ref: "Tabla 1.5-2" }]
        : [{ sim: "V₁, V₂", desc: "velocidades de las dos isotacas adyacentes", unidad: "m/s" },
          { sim: "d₁, d₂", desc: "distancias del sitio a cada isotaca" }],
      texto: vel.V == null ? "—" : `${fc(vel.V, 1)} m/s`,
    }));
  }
  p.push(paso({
    id: "V_ref", titulo: "Contraste contra el mapa", art: "Art. 1.5.1",
    valor: vel.referencia == null ? null : Number(vel.referencia), unidad: "m/s", dec: 1,
    texto: vel.referencia == null
      ? (vel.usaCiudad === false
        ? "no corresponde — el sitio está fuera de la tabla y la V interpolada ES la lectura del mapa"
        : "sin ciudad de referencia")
      : null,
    nota: vel.dif == null ? null
      : `La V adoptada difiere en ${pct(vel.dif)} de la del mapa para esta categoría.`,
    tono: vel.dif != null && vel.dif < -1e-9 ? "aviso" : "info",
  }));
  return bloque({ id: "velocidad", titulo: "Velocidad básica del viento", art: "Art. 1.5",
    desc: "Es el dato del que depende todo el cálculo: la presión va con V².", pasos: p });
}

// ── 2 · TERRENO Y TOPOGRAFÍA ────────────────────────────────────────────────────
function bloqueSitio({ sitio, topo, geoN }) {
  const p = [paso({
    id: "exposicion", titulo: "Categoría de exposición", art: "Art. 1.7",
    texto: sitio.exposicion,
    nota: "Requiere esa rugosidad en todo el sector de barlovento, por 800 m o 20 veces la "
      + "altura del edificio, lo que sea mayor (art. 1.7.3).",
  }), paso({
    id: "Kd", titulo: "Factor de direccionalidad", art: "Tabla 1.6-1",
    valor: sitio.kd, dec: 2, donde: [SIM.Kd],
    nota: "Se usa SÓLO con las combinaciones del CIRSOC 301: ya contiene la probabilidad "
      + "de que la dirección más desfavorable coincida con la velocidad máxima.",
  }), paso({
    id: "Ke", titulo: "Factor de altitud", art: "Tabla 1.13-1",
    valor: sitio.usarKe ? Math.exp(-0.000119 * Number(sitio.altitud)) : 1,
    dec: 4, donde: [SIM.Ke, { sim: "z_g", desc: "altitud sobre el nivel del mar",
      valor: sitio.altitud, unidad: "m" }],
    formula: "K_e = e^(−0,000119·z_g)",
    nota: sitio.usarKe ? null : "Desactivado: se adopta K_e = 1,0, que es lo conservador.",
  })];

  if (topo?.aplica) {
    p.push(paso({ id: "Kzt", titulo: "Factor topográfico", art: "Art. 1.8 · Figura 1.8-1",
      valor: topo.kzt, dec: 3,
      formula: "K_zt = (1 + K₁·K₂·K₃)²",
      donde: [con("K1", topo.K1), con("K2", topo.K2), con("K3", topo.K3)],
      nota: `Accidente ${topo.forma ?? "—"}, lado ${topo.lado ?? "—"}, `
        + `H/L_h = ${fc(topo.HLh)}. ⚠ K_zt NO es un número sino una FUNCIÓN de la altura: `
        + "este valor es el de la altura media de cubierta y cada superficie lo evalúa a "
        + "la cota que le corresponde." }));
  } else {
    p.push(paso({ id: "Kzt", titulo: "Factor topográfico", art: "Art. 1.8",
      valor: 1.0, dec: 3, donde: [SIM.Kzt], nota: topo?.motivo ?? "Sin accidente declarado." }));
  }
  p.push(paso({ id: "h", titulo: "Altura media de cubierta", art: "Art. 1.2",
    valor: geoN.h, unidad: "m", donde: [SIM.h,
      { sim: "h_e", desc: "altura de alero", valor: geoN.hAlero, unidad: "m" },
      { sim: "r", desc: "remonte de la cubierta", valor: geoN.hCumbre - geoN.hAlero,
        unidad: "m" }],
    formula: geoN.theta > 0 ? "h = h_e + r/2" : "h = h_e",
    nota: geoN.theta > 0 ? null : "Cubierta plana: la altura media es la del alero." }));
  return bloque({ id: "sitio", titulo: "Terreno, altitud y topografía",
    art: "Arts. 1.6 a 1.8", pasos: p });
}

// ── 3 · CERRAMIENTO Y PRESIÓN INTERNA ───────────────────────────────────────────
function bloqueCerramiento({ cerr }) {
  const p = [paso({
    id: "clasif", titulo: "Clasificación de cerramiento", art: "Art. 1.10",
    texto: cerr.label, nota: cerr.motivo,
  })];
  if (cerr.detritus) {
    p.push(paso({ id: "detritus", titulo: "Región con detritus arrastrados por el viento",
      art: cerr.detritus.ref ?? "Art. 1.10.3.1",
      texto: cerr.detritus.esRegion ? "Sí" : "No",
      valor: cerr.detritus.V, unidad: "m/s", dec: 1,
      donde: [{ sim: `V_${cerr.detritus.figura}`,
        desc: `velocidad de la Figura 1.5-1${cerr.detritus.figura}`,
        valor: cerr.detritus.V, unidad: "m/s" }],
      formula: cerr.detritus.conversion?.cuenta ?? null,
      nota: cerr.detritus.motivo }));
  }
  p.push(paso({
    id: "Ri", titulo: "Reducción por gran volumen interior", art: "Art. 1.11.1",
    valor: cerr.RiAplicado, dec: 4,
    formula: "R_i = 0,5·(1 + 1/√(1 + V_i/(6950·A_og)))",
    donde: [con("Ri", cerr.RiAplicado), con("Vi", cerr.Vi), con("Aog", cerr.AogTotal)],
    // ⚠ EL VALOR CALCULADO VA AUNQUE NO SE APLIQUE. Informar sólo el adoptado hace que la
    // memoria no diga que hubo una decisión, que es justamente lo que hay que poder
    // revisar.
    nota: cerr.modoRi === "uno"
      ? (cerr.Ri == null
        ? "La expresión (1.11-1) no interviene en esta clasificación: sólo aplica a "
          + "edificios parcialmente cerrados. Se adopta R_i = 1,0."
        : `Se adopta R_i = 1,0 (art. 1.11.1), que es lo conservador. La expresión (1.11-1) `
          + `daría ${fc(cerr.Ri, 4)}: NO aplicado.`)
      : "Se adopta el valor de la expresión (1.11-1).",
  }));
  p.push(paso({
    id: "GCpi", titulo: "Coeficiente de presión interna", art: "Tabla 1.11-1",
    texto: `±${fc(Math.abs(cerr.gcpi), cerr.RiAplicado === 1 ? 2 : 4)}`,
    donde: [con("GCpi", `±${fc(Math.abs(cerr.gcpiTabla), 2)}`), con("Ri", cerr.RiAplicado)],
    formula: cerr.RiAplicado === 1 ? null : "(GC_pi) = (GC_pi)_tabla · R_i",
    nota: "Se aplica en sus DOS signos: la nota 3 exige considerar el positivo sobre todas "
      + "las superficies internas y el negativo sobre todas. No es elegir el peor: uno "
      + "gobierna el levantamiento de la cubierta y el otro la compresión de las paredes.",
  }));
  return bloque({ id: "cerramiento", titulo: "Cerramiento y presión interna",
    art: "Arts. 1.10 y 1.11", pasos: p });
}

// ── 4 · FACTOR DE RÁFAGA ────────────────────────────────────────────────────────
function bloqueRafaga({ rafaga, G, modoG, act }) {
  const r = rafaga.rig;
  const p = [paso({
    id: "G", titulo: "Factor de efecto de ráfaga", art: rafaga.flexible
      ? "Art. 1.9.5 · expresión (1.9-10)" : "Art. 1.9",
    valor: G, dec: 3, donde: [SIM.G], nota: rafaga.motivo,
    tono: rafaga.flexible && modoG !== "flexible" ? "error" : "info",
  }), paso({
    id: "G_dims", titulo: "Dimensiones que entran en G", art: "Expresiones (1.9-7) a (1.9-9)",
    texto: `B = ${fc(act.B)} m · L = ${fc(act.L)} m`,
    donde: [con("B", act.B), con("L", act.L)],
    // ⚠ NO ES UN DATO FIJO DEL EDIFICIO. B y L se intercambian al girar el viento 90°, así
    // que G cambia con la dirección: sólo el 0,85 por defecto es el mismo en las cuatro.
    nota: "B es la dimensión NORMAL al viento y L la PARALELA: se intercambian al girar el "
      + "viento 90°, así que el G calculado y el de edificio flexible cambian con la "
      + "dirección. Sólo el valor por defecto de 0,85 es el mismo en las cuatro.",
  })];
  if (modoG !== "defecto") {
    p.push(paso({ id: "G_Q", titulo: "Respuesta de fondo", art: "Expresión (1.9-8)",
      valor: r.Q, dec: 3,
      formula: "Q = √(1/(1 + 0,63·((B + h)/L_z̄)^0,63))",
      donde: [con("Q", r.Q), con("Iz", r.Iz), con("Lz", r.Lz),
        { sim: "z̄", desc: "altura equivalente, 0,6·h pero no menor que z_mín",
          valor: r.zb, unidad: "m" }] }));
  }
  return bloque({ id: "rafaga", titulo: "Factor de efecto de ráfaga", art: "Art. 1.9",
    pasos: p });
}

// ── 5 · PRESIÓN DINÁMICA ────────────────────────────────────────────────────────
//
// ⚠ LA UNIDAD SALE DEL PERFIL QUE LE PASAN, no escrita a mano. El panel trabaja en N/m² y
// la memoria en kN/m²: con la unidad fija acá, una de las dos salidas mostraría el número
// de la otra debajo de su propio encabezado, que es el error que `lib/unidades.js` existe
// para hacer imposible.
function bloquePresionDinamica({ act, U }) {
  const p = [paso({
    id: "qh", titulo: "Presión dinámica en la altura media de cubierta", art: "Art. 1.13",
    valor: U.val.presion(act.qh), unidad: U.u.presion, dec: U.u.presion === "N/m²" ? 0 : 3,
    formula: "q_h = 0,613·K_h·K_zt(h)·K_d·K_e·V²",
    donde: [SIM.qh, SIM.Kh, SIM.Kzt, SIM.Kd, SIM.Ke, SIM.V],
    nota: "El 0,613 lleva la densidad del aire y la conversión de unidades: con V en m/s "
      + "da N/m². La usan sotavento, las paredes laterales y la cubierta; la pared a "
      + "barlovento usa q_z, que varía con la altura.",
  }), paso({
    id: "qz", titulo: "Perfil de presión dinámica en la pared a barlovento", art: "Art. 1.13",
    formula: "q_z = 0,613·K_z(z)·K_zt(z)·K_d·K_e·V²",
    donde: [SIM.qz, SIM.Kz, SIM.Kzt],
    texto: `${act.superficies.find(s2 => s2.id === "pared_barlovento")?.tramos.length ?? 0} `
      + "tramos, ver la tabla",
    // ⚠ K_zt NO ES UN ESCALAR. K₃ = e^(−γ·z/L_h) decae con la altura, así que sobre una
    // loma el factor es máximo al ras del suelo. Cada tramo se evalúa en sus DOS extremos
    // y gobierna el mayor producto K_z·K_zt: con K_z congelado por debajo de z_mín, el
    // peor punto de la franja de base es el piso y no el techo.
    nota: "Es la única superficie con q variable. Cada tramo se evalúa en sus DOS extremos "
      + "y gobierna el mayor producto K_z·K_zt: con K_zt variable el peor punto de la "
      + "franja de base puede ser el piso y no el techo.",
  })];
  return bloque({ id: "dinamica", titulo: "Presión dinámica", art: "Art. 1.13",
    desc: `Dirección ${act.dir.label}.`, pasos: p });
}

// ── 6 · COEFICIENTES DE PRESIÓN EXTERNA ─────────────────────────────────────────
function bloqueCoeficientes({ act }) {
  const p = [paso({
    id: "p", titulo: "Presión de diseño sobre cada superficie",
    art: "Art. 2.4.1 · expresión (2.4-1)",
    formula: "p = q·G·C_p − q_i·(GC_pi)",
    donde: [SIM.p, SIM.qz, SIM.G, SIM.Cp, SIM.qi, SIM.GCpi],
    texto: "por superficie, ver la tabla",
    nota: "q es q_z en la pared a barlovento —evaluada a la altura de cada punto— y q_h en "
      + "el resto. La presión interna se resta con su signo, y los dos signos son casos "
      + "de carga separados.",
  }), paso({
    id: "modo", titulo: "Tratamiento de la cubierta", art: "Figura 2.4-1",
    texto: act.modo === "unica" ? `superficie completa a ${act.caraUnica}` : act.modo,
    nota: act.motivoModo,
  })];
  return bloque({ id: "coeficientes", titulo: "Coeficientes de presión externa",
    art: "Figura 2.4-1", desc: `Dirección ${act.dir.label}.`, pasos: p });
}

// ── 6 · RESULTANTES Y ENVOLVENTE ────────────────────────────────────────────────
function bloqueResultantes({ res, envCasos, U }) {
  const rot = (g) => g?.estado == null ? "—"
    : `caso ${g.estado.caso} · ${g.estado.dirs.join("+")} · GC_pi `
      + `${g.estado.casoInterno === "conInternaPos" ? "+" : "−"} · nota 3 ${g.estado.casoNota3}`
      + (g.estado.eSigno ? ` · e ${g.estado.eSigno > 0 ? "+" : "−"}` : "");
  const mag = (id, titulo, g, magnitud) => paso({
    id, titulo, art: "Figura 2.4-8",
    texto: `${U.n[magnitud](Math.abs(g.valor), 1)} ${U.u[magnitud]}`,
    nota: `Combinación que gobierna: ${rot(g)}.`,
  });
  const p = [
    paso({ id: "barrido", titulo: "Estados de carga barridos", art: "Figura 2.4-8",
      texto: `${envCasos.estados.length}`,
      nota: "4 direcciones × 2 signos de GC_pi × 2 casos de la nota 3 × los casos de la "
        + "figura, con los dos signos de la excentricidad en los torsionales y las dos "
        + "envolventes de cubierta de la nota 2." }),
    mag("Vtot", "Corte total en la base", envCasos.cortante, "fuerza"),
    mag("Up", "Levantamiento", envCasos.levantamiento, "fuerza"),
    mag("Mv", "Momento de vuelco", envCasos.vuelco, "momento"),
    envCasos.conTorsion
      ? mag("MT", "Momento torsor", envCasos.torsion, "momento")
      : paso({ id: "MT", titulo: "Momento torsor", art: "Art. 2.4.7",
        texto: "no verificado", tono: "aviso",
        nota: "Se declaró la exención del art. 2.4.7, así que los casos 2 y 4 no se "
          + "barrieron. No significa que el edificio no torsione: significa que no se "
          + "verificó." }),
    paso({ id: "min", titulo: "Carga mínima", art: "Art. 2.1.5",
      texto: `${U.n.fuerza(res.cargaMinima.fuerza, 1)} ${U.u.fuerza}`,
      formula: res.cargaMinima.abierto ? "F = 0,75 kN/m² · A_f"
        : "F = 0,75 kN/m² · A_pared + 0,40 kN/m² · A_cubierta",
      donde: [{ sim: "A_pared", desc: "área de pared proyectada en un plano normal al viento",
        valor: res.cargaMinima.areaPared, unidad: "m²" },
      { sim: "A_cubierta", desc: "lo que la silueta agrega por encima de la pared",
        valor: res.cargaMinima.areaCubierta, unidad: "m²" }],
      nota: "Es un caso de carga SEPARADO que se AGREGA a los normales (C 2.1.5), "
        + "aplicado horizontalmente sobre las áreas proyectadas en un plano vertical "
        + "normal al viento. Entra en la envolvente como un estado más. "
        + (envCasos.minimoGobiernaAlgo
          ? `⚠ GOBIERNA en ${Object.entries(envCasos.gobiernaMinimo)
            .filter(([, v]) => v).map(([k]) => k).join(" y ")}.`
          : "No gobierna ninguna magnitud de la envolvente."),
      tono: envCasos.minimoGobiernaAlgo ? "aviso" : "info" }),
  ];
  return bloque({ id: "resultantes", titulo: "Resultantes en la base",
    art: "Art. 2.4 · Figura 2.4-8",
    desc: "Envolvente de todos los estados que el reglamento exige considerar.", pasos: p });
}

/**
 * TODA la traza del caso, en un solo árbol.
 *
 * @param {object} e
 * @param {any} e.vel @param {any} e.sitio @param {any} e.topo @param {any} e.geoN
 * @param {any} e.cerr @param {any} e.rafaga @param {number} e.G @param {string} e.modoG
 * @param {any} e.act @param {any} e.res @param {any} e.envCasos @param {any} e.U
 * @param {any} e.d
 * @returns {ReturnType<typeof bloque>[]}
 */
export function consolidar({ vel, sitio, topo, geoN, cerr, rafaga, G, modoG, act, res,
  envCasos, U, d }) {
  return [
    bloqueVelocidad({ vel, d }),
    bloqueSitio({ sitio, topo, geoN }),
    bloqueCerramiento({ cerr }),
    bloqueRafaga({ rafaga, G, modoG, act }),
    bloquePresionDinamica({ act, U }),
    bloqueCoeficientes({ act }),
    bloqueResultantes({ res, envCasos, U }),
  ];
}

/**
 * La traza de la dirección activa tal como la produce `edificio.js`, adaptada al modelo.
 *
 * Se conserva aparte y no se funde con `consolidar`: son los pasos que el motor emite
 * mientras calcula, y sirven para contrastar el árbol consolidado contra lo que el motor
 * realmente hizo. Si un día los dos discrepan, es que el consolidador está reordenando
 * algo que el motor ya no calcula así.
 */
export const trazaDelMotor = (act) =>
  bloque({ id: "motor", titulo: "Traza del motor", art: "Dirección " + act.dir.id,
    desc: "Los pasos tal como los emite el cálculo, sin reordenar.",
    pasos: (act.traza ?? []).map(t => desdeTrazaVieja(t, "m_")) });
