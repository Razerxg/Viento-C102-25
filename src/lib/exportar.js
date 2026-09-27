// EXPORTACIÓN DE PRESIONES Y RESULTANTES — CSV y JSON.
//
// ── QUÉ SE EXPORTA Y POR QUÉ ASÍ ───────────────────────────────────────────────
// Lo que se lleva a un modelo estructural no es el resumen: es la presión de CADA cara y
// CADA zona, en las cuatro direcciones, con los dos signos de la presión interna. Y con
// ellos, lo que hace falta para poder auditarlos: el Cp, la presión dinámica con la que se
// calcularon y la referencia a la figura de donde salió el coeficiente.
//
// ── LAS UNIDADES VAN EN EL NOMBRE DE LA COLUMNA ────────────────────────────────
// En el JSON hay un campo `unidades`, que es lo que corresponde en un formato con
// estructura. En el CSV no: ahí la unidad va PEGADA al nombre de la columna
// —`p_gobernante_kN_m2`— porque un CSV se abre en cualquier cosa y lo primero que se
// pierde son las líneas de encabezado. Una columna que dice `presion` a secas es una
// columna que alguien va a leer en las unidades que supone.
//
// ── EL SEPARADOR ES UNA DECISIÓN DEL DESTINO, NO DEL AUTOR ─────────────────────
// Un CSV para Excel en español necesita `;` como separador de campos y coma decimal; uno
// para un script de Python o para Dynamo necesita `,` y punto decimal. Los dos se usan, y
// abrir el equivocado no da error: da una columna sola con todo el renglón adentro, o
// números partidos en dos. Por eso es un parámetro y no una constante.
import { convertir, PERFILES } from './unidades.js';
import { aporteCubierta } from '../engine/resultantes.js';
import { procedencia, procedenciaTexto } from '../constants/version.js';

/**
 * Los dos dialectos de CSV.
 *
 * `decimal` no es cosmético: con separador de campos `,` no se puede usar coma decimal
 * sin entrecomillar cada número, y entrecomillar números hace que Excel los lea como
 * texto. Los dos dialectos son coherentes por dentro.
 */
export const DIALECTOS = {
  programa: { id: "programa", label: "Para un programa (coma, punto decimal)",
    campo: ",", decimal: "." },
  excel: { id: "excel", label: "Para Excel en español (punto y coma, coma decimal)",
    campo: ";", decimal: "," },
};

/** El nombre de una unidad, apto para un encabezado de columna. */
export const unidadEnNombre = (u) => String(u)
  .replace(/·/g, "").replace(/\//g, "_").replace(/²/g, "2").replace(/\s+/g, "");

/**
 * Área en PLANTA de cada zona de cubierta, por identificador de superficie.
 *
 * No se recalcula acá: sale de `aporteCubierta`, que es quien parte la cubierta en zonas
 * y ya resolvió los casos difíciles —la cumbrera que corta una franja en dos, el faldón
 * que llega hasta L/2, el limatesa—. Recalcularla en este archivo sería una segunda
 * definición de la misma partición, y el día que una de las dos cambie la exportación va
 * a informar un área que el cálculo no usó.
 *
 * Se recorren los DOS casos de la nota 3 porque cada uno nombra superficies distintas
 * para el faldón a barlovento; las que aparecen en los dos tienen la misma área.
 */
function areasDeCubierta(analisis) {
  const m = new Map();
  for (const caso of /** @type {const} */ (["negativo", "positivo"])) {
    const acum = new Map();
    // Una misma superficie puede venir partida en dos trozos —la cumbrera corta la
    // franja— y hay que sumarlos, no quedarse con el último.
    for (const p of aporteCubierta({ analisis, casoNota3: caso }).partes)
      acum.set(p.id, (acum.get(p.id) ?? 0) + p.areaProy);
    for (const [k, v] of acum) m.set(k, v);
  }
  return m;
}

/**
 * Las superficies de una dirección, aplanadas a renglones.
 *
 * La pared a barlovento no es UNA superficie: es una pila de tramos, cada uno con su `q_z`
 * y su área real. Exportar su `q_h` como si fuera plana borra justamente lo que distingue
 * a esa pared de las demás.
 */
export function renglonesDe(analisis) {
  const out = [];
  const base = { direccion: analisis.dir.id, eje: analisis.dir.eje };
  const areasCub = areasDeCubierta(analisis);
  // El área REAL de un faldón es su proyección en planta dividida por cos θ. Con una sola
  // pendiente vale para dos aguas, cuatro aguas y vertiente única: las proyecciones de los
  // faldones cubren la planta exactamente.
  const cos = Math.cos(analisis.geo.theta * Math.PI / 180);
  for (const s of analisis.superficies) {
    if (s.tramos) {
      for (const t of s.tramos) {
        // ⚠ EL PERFIL TRAE UN TRAMO DE EXTENSIÓN NULA EN z = 0. Al motor no le molesta
        // —aporta área cero y fuerza cero— pero en un archivo es un renglón con área 0 al
        // lado de otros con área real, y eso invita a sumarlo, a promediarlo o a dividir
        // por él. Se saltea acá y no en el motor, que lo usa como extremo del perfil.
        if (!(t.hasta > t.desde)) continue;
        out.push({ ...base, superficie: s.id, nombre: s.nombre, tipo: s.tipo,
          zona: `z ${t.desde.toFixed(2)}–${t.hasta.toFixed(2)} m`,
          zDesde: t.desde, zHasta: t.hasta, xDesde: null, xHasta: null,
          area: t.area, areaPlanta: null, cp: s.cp, q: t.q,
          externa: t.externa, conInternaPos: t.conInternaPos,
          conInternaNeg: t.conInternaNeg, gobernante: t.gobernante,
          referencia: s.cpRef });
      }
      continue;
    }
    out.push({ ...base, superficie: s.id, nombre: s.nombre, tipo: s.tipo,
      zona: s.zona ? `x ${s.zona.desde}h–${s.zona.hasta === Infinity ? "fin"
        : Number(s.zona.hasta).toFixed(2)}h` : "",
      zDesde: null, zHasta: null,
      xDesde: s.zona?.desde ?? null, xHasta: s.zona?.hasta ?? null,
      // En pared, el área de la fachada ya es la real. En cubierta, la proyección en
      // planta sale del motor y el área real es ésa sobre cos θ.
      area: s.tipo === "cubierta"
        ? (areasCub.has(s.id) ? areasCub.get(s.id) / cos : null)
        : (s.fachada?.area ?? null),
      areaPlanta: s.tipo === "cubierta" ? (areasCub.get(s.id) ?? null) : null,
      cp: s.cp, q: s.q,
      externa: s.externa, conInternaPos: s.conInternaPos,
      conInternaNeg: s.conInternaNeg, gobernante: s.gobernante,
      referencia: s.cpRef });
  }
  return out;
}

/**
 * LAS COLUMNAS DEL CSV, con su magnitud y de dónde sale cada una.
 *
 * Es también la documentación del esquema: el JSON publica esta misma lista, así que el
 * archivo trae adentro la descripción de sus propias columnas y no hace falta buscar un
 * documento aparte que puede no existir dentro de dos años.
 */
/** @type {{id:string,titulo:string,desc:string,magnitud?:import('./unidades.js').Magnitud}[]} */
export const COLUMNAS = [
  { id: "direccion", titulo: "direccion", desc: "Hipótesis de viento: Wx+, Wx−, Wy+, Wy−" },
  { id: "superficie", titulo: "superficie", desc: "Identificador de la cara o zona" },
  { id: "nombre", titulo: "nombre", desc: "Nombre legible de la superficie" },
  { id: "tipo", titulo: "tipo", desc: "pared o cubierta" },
  { id: "zona", titulo: "zona", desc: "Tramo de altura o franja de cubierta, si la hay" },
  { id: "area", titulo: "area", magnitud: "area",
    desc: "Área REAL sobre la que actúa la presión. En cubierta es la proyección en planta dividida por cos θ" },
  { id: "areaPlanta", titulo: "area_planta", magnitud: "area",
    desc: "Sólo en cubierta: proyección en planta de la zona, que es la que da la componente VERTICAL" },
  { id: "cp", titulo: "Cp", desc: "Coeficiente de presión externa, Figura 2.4-1" },
  { id: "q", titulo: "q", magnitud: "presion",
    desc: "Presión dinámica con la que se calculó: q_z en la pared a barlovento, q_h en el resto" },
  { id: "externa", titulo: "p_externa", magnitud: "presion",
    desc: "q·G·Cp — sólo presión externa" },
  { id: "conInternaPos", titulo: "p_gcpi_pos", magnitud: "presion",
    desc: "Con GC_pi POSITIVO: externa − q_i·|GC_pi|" },
  { id: "conInternaNeg", titulo: "p_gcpi_neg", magnitud: "presion",
    desc: "Con GC_pi NEGATIVO: externa + q_i·|GC_pi|" },
  { id: "gobernante", titulo: "p_gobernante", magnitud: "presion",
    desc: "El mayor de los dos en valor absoluto. ⚠ NO reemplaza a los dos: son casos de carga separados" },
  { id: "referencia", titulo: "referencia", desc: "Fila y columna de la figura de donde salió el Cp" },
];

/** El encabezado de una columna, con su unidad pegada cuando la tiene. */
/**
 * @param {{titulo:string,magnitud?:import('./unidades.js').Magnitud}} col
 * @param {Record<string,string>} perfil
 */
export const tituloColumna = (col, perfil) =>
  col.magnitud ? `${col.titulo}_${unidadEnNombre(perfil[col.magnitud])}` : col.titulo;

/**
 * Un campo de CSV, escapado si hace falta.
 * @param {any} v @param {{campo:string,decimal:string}} dial
 */
const campo = (v, dial) => {
  if (v == null) return "";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "";
    return v.toFixed(6).replace(/\.?0+$/, "").replace(".", dial.decimal) || "0";
  }
  const s = String(v);
  // ⚠ SE ESCAPA CONTRA EL SEPARADOR DEL DIALECTO, no contra los dos. Las referencias a la
  // figura traen comas —«h/L = 0,28»— y sin comillas, en el dialecto de coma, correrían
  // todas las columnas siguientes un lugar: el archivo se lee «bien» con los números
  // cambiados de lugar, que es el peor resultado posible. En el dialecto de punto y coma
  // esa misma coma es inofensiva y entrecomillarla sería ruido.
  return s.includes(dial.campo) || /["\n\r]/.test(s)
    ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * CSV de presiones por cara y zona, en las cuatro direcciones.
 *
 * @param {object} o
 * @param {any[]} o.todas    los cuatro análisis
 * @param {{campo:string,decimal:string}} [o.dialecto]
 * @param {Record<string,string>} [o.perfil]  unidades de salida
 * @param {string} [o.proyecto] @param {Date} [o.fecha]
 * @param {boolean} [o.cabecera]  líneas `#` de procedencia antes del encabezado
 */
export function csvPresiones({ todas, dialecto = DIALECTOS.programa,
  perfil = PERFILES.datos, proyecto, fecha, cabecera = true }) {
  const lineas = [];
  if (cabecera) {
    // ⚠ EMPIEZAN CON `#`. Es la convención que entienden pandas, R y la importación de
    // Excel; un parser que no la entienda va a leerlas como una columna sola, que se ve
    // enseguida. Escribirlas como renglones de datos sería peor: se mezclarían con las
    // presiones sin que nada las distinga.
    for (const [k, v] of procedenciaTexto({ proyecto, fecha })) lineas.push(`# ${k}: ${v}`);
    for (const c of COLUMNAS) {
      lineas.push(`# columna ${tituloColumna(c, perfil)}: ${c.desc}`);
    }
  }
  lineas.push(COLUMNAS.map(c => tituloColumna(c, perfil)).join(dialecto.campo));
  for (const an of todas) {
    for (const r of renglonesDe(an)) {
      lineas.push(COLUMNAS.map(c => {
        const v = r[c.id];
        return campo(c.magnitud && v != null ? convertir(c.magnitud, v, perfil[c.magnitud]) : v,
          dialecto);
      }).join(dialecto.campo));
    }
  }
  // Terminar en salto de línea: sin él, concatenar dos archivos pega el último renglón
  // de uno con el encabezado del otro.
  return lineas.join("\n") + "\n";
}

/**
 * JSON de presiones y resultantes.
 *
 * Lleva el sobre de procedencia, el campo `unidades`, la descripción de las columnas y,
 * además de las presiones, las resultantes por dirección y la envolvente de la Figura
 * 2.4-8 con la combinación que gobierna cada magnitud: es lo que se transcribe al modelo.
 *
 * @param {object} o
 * @param {any[]} o.todas @param {(t:any)=>any} o.resDe
 * @param {any} [o.envCasos] @param {any} [o.sitio] @param {any} [o.geoN]
 * @param {string} [o.cerramiento] @param {(d:any)=>number} [o.gDe]
 * @param {Record<string,string>} [o.perfil] @param {string} [o.proyecto] @param {Date} [o.fecha]
 */
export function jsonPresiones({ todas, resDe, envCasos, sitio, geoN, cerramiento, gDe,
  perfil = PERFILES.datos, proyecto, fecha }) {
  const v = (m, x) => (x == null || !Number.isFinite(x) ? null : convertir(m, x, perfil[m]));
  const estado = (g) => g?.estado == null ? null : {
    caso: g.estado.caso, direcciones: g.estado.dirs, casoInterno: g.estado.casoInterno,
    casoNota3: g.estado.casoNota3, signoExcentricidad: g.estado.eSigno,
  };

  return {
    ...procedencia({ proyecto, fecha }),
    unidades: { ...perfil },
    columnas: COLUMNAS.map(c => ({ campo: c.id,
      unidad: c.magnitud ? perfil[c.magnitud] : null, descripcion: c.desc })),
    sitio: sitio == null ? null : {
      velocidadBasica: v("velocidad", sitio.V), exposicion: sitio.exposicion,
      Kd: sitio.kd, Kzt_h: sitio.Kzt, altitud: v("longitud", sitio.altitud),
    },
    edificio: geoN == null ? null : {
      a: v("longitud", geoN.a), b: v("longitud", geoN.b),
      alturaAlero: v("longitud", geoN.hAlero), alturaMedia: v("longitud", geoN.h),
      theta: geoN.theta, tipoCubierta: geoN.tipo, cumbrera: geoN.cumbrera,
    },
    cerramiento: cerramiento ?? null,
    direcciones: todas.map(an => {
      const r = resDe ? resDe(an) : null;
      return {
        id: an.dir.id, eje: an.dir.eje, signo: an.dir.signo,
        L: v("longitud", an.L), B: v("longitud", an.B),
        qh: v("presion", an.qh), G: gDe ? gDe(an.dir) : an.G, GCpi: an.GCpi,
        tratamientoCubierta: an.modo,
        superficies: renglonesDe(an).map(x => ({
          ...x, area: v("area", x.area), areaPlanta: v("area", x.areaPlanta),
          q: v("presion", x.q),
          externa: v("presion", x.externa), conInternaPos: v("presion", x.conInternaPos),
          conInternaNeg: v("presion", x.conInternaNeg),
          gobernante: v("presion", x.gobernante),
        })),
        resultantes: r == null ? null : {
          cortante: v("fuerza", r.cortante), levantamiento: v("fuerza", r.levantamiento),
          vuelco: v("momento", r.vuelco),
          cargaMinima: v("fuerza", r.cargaMinima?.fuerza),
          gobiernaCargaMinima: !!r.gobiernaMinimo,
        },
      };
    }),
    // ⚠ LA ENVOLVENTE NO ES EL MÁXIMO POR COLUMNA DE LA TABLA DE ARRIBA. Cada magnitud
    // sale de UN estado de carga completo de la Figura 2.4-8, y el estado viaja con ella:
    // sin eso, quien recibe el archivo no puede saber de qué combinación salió el número.
    envolvente: envCasos == null ? null : {
      estadosBarridos: envCasos.estados.length,
      casosTorsionalesVerificados: envCasos.conTorsion,
      cortante: { valor: v("fuerza", envCasos.cortante.valor), estado: estado(envCasos.cortante) },
      levantamiento: { valor: v("fuerza", envCasos.levantamiento.valor),
        estado: estado(envCasos.levantamiento) },
      vuelco: { valor: v("momento", envCasos.vuelco.valor), estado: estado(envCasos.vuelco) },
      torsion: { valor: v("momento", envCasos.torsion.valor), estado: estado(envCasos.torsion) },
    },
  };
}
