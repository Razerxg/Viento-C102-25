// ARCHIVO DE PROYECTO — sobre, esquema y migración.
//
// ── EL PROBLEMA QUE RESUELVE ───────────────────────────────────────────────────
// Guardar y abrir ya existía, pero repartido en dos lugares que NO hacían lo mismo:
//
//   · `leer()` de `localStorage` fusionaba sub-objeto por sub-objeto —`geo`, `topo`,
//     `cerr`, `cap4`, `silo`, `anexo`, `vInterp`…—, así que un caso guardado antes de que
//     existiera un campo seguía abriendo con el valor por defecto del campo nuevo.
//   · `importar()` de un archivo hacía `{ ...INICIAL, ...v, geo: {...} }` y nada más. Un
//     archivo con un `topo` de tres claves REEMPLAZABA el objeto entero, y las claves que
//     ese archivo no traía quedaban en `undefined`. `num(undefined)` da NaN, y un NaN que
//     entra al motor sale como `—` en la pantalla sin ningún error: el caso se abre
//     «bien» y el cálculo está roto.
//
// Las dos rutas pasan ahora por `migrar()`, que es una sola función pura y testeable.
//
// ── EL SOBRE ───────────────────────────────────────────────────────────────────
// El archivo v1 era `{ app, v: 1, ...estado }`: la identificación y el estado en el mismo
// nivel. Un campo del proyecto llamado `app`, `v` o `version` habría pisado la
// identificación del archivo, y al abrirlo no habría forma de saber que pasó. En el v2 el
// estado vive dentro de `datos` y el sobre lleva la procedencia.
import { INICIAL } from '../constants/inicial.js';
import { APP, ESQUEMA, procedencia } from '../constants/version.js';

/**
 * Los sub-objetos que se fusionan CLAVE POR CLAVE contra el inicial.
 *
 * ⚠ ESTA LISTA TIENE QUE CONTENER TODOS. Si se agrega un sub-objeto al estado y no se lo
 * agrega acá, un archivo viejo lo va a reemplazar entero en vez de completarlo, y las
 * claves faltantes entran al motor como `undefined`. Hay un test que la contrasta contra
 * `INICIAL` y falla cuando aparece uno nuevo.
 */
export const SUBOBJETOS = Object.keys(INICIAL).filter(k => {
  const v = INICIAL[k];
  return v != null && typeof v === "object" && !Array.isArray(v);
});

/** Los arreglos del estado, que se copian tal cual pero validando que sean arreglos. */
export const ARREGLOS = Object.keys(INICIAL).filter(k => Array.isArray(INICIAL[k]));

/**
 * Fusiona un estado guardado contra el inicial, sub-objeto por sub-objeto.
 *
 * @param {any} v  lo que venía guardado; cualquier cosa que no sea un objeto da el inicial
 */
export function fusionar(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return { ...INICIAL };
  const out = { ...INICIAL, ...v };
  for (const k of SUBOBJETOS) {
    const g = v[k];
    out[k] = { ...INICIAL[k], ...(g && typeof g === "object" && !Array.isArray(g) ? g : null) };
  }
  for (const k of ARREGLOS) out[k] = Array.isArray(v[k]) ? v[k] : INICIAL[k];
  return out;
}

/** Los campos que la migración al esquema 3 descarta. Los usa el test que los persigue. */
export const CAMPOS_FUNDAMENTO = ["riesgoFundamento", "cerrFundamento",
  "env.fundamento247", "vManual.fundamento", "vManual.documento"];

/**
 * MIGRACIONES DE ESQUEMA.
 *
 * Cada una recibe el objeto entero tal como vino y devuelve el de la versión siguiente.
 * Se aplican en cadena, así que un archivo de la versión 1 pasa por todas hasta la actual
 * y nunca hay que escribir «de la 1 directo a la 4».
 */
const MIGRACIONES = {
  // v1 → v2: el estado se mete adentro de `datos` y el sobre queda afuera. `app` y `v`
  // eran del sobre y no del proyecto, así que no viajan a `datos`.
  1: (x) => {
    const { app, v, ...estado } = x;
    return { app: app ?? APP.id, esquema: 2, datos: estado };
  },
  // v2 → v3: se descartan los campos de fundamento. La app dejó de pedir que se
  // justifiquen las decisiones del proyectista; el fundamento lo agrega él a la memoria,
  // a mano.
  //
  // ⚠ SE DESCARTAN EN SILENCIO. No es una pérdida de datos de cálculo: ninguno de los
  // cinco entraba en ningún número. Avisar al abrir un proyecto viejo sería alarmar por
  // algo que el usuario no tiene que resolver, y el caso calcula exactamente igual.
  //
  // ⚠ BORRAR ACÁ ES SUFICIENTE, Y HUBO QUE PROBARLO. Había además un barrido después de
  // la fusión —`{ ...INICIAL, ...v }` conserva toda clave que el archivo traiga aunque el
  // inicial ya no la tenga— y las dos mecánicas hacían exactamente lo mismo: las
  // mutaciones que anulaban una de las dos no rompían ningún test, porque la otra tapaba
  // el agujero. Dos mecanismos para un trabajo son uno que un día se borra sin que nada
  // avise. Queda éste, que es el que corresponde: migrar es convertir un archivo viejo.
  2: (x) => {
    const datos = { ...(x.datos ?? {}) };
    for (const ruta of CAMPOS_FUNDAMENTO) {
      const [a, b] = ruta.split(".");
      if (b == null) { delete datos[a]; continue; }
      if (datos[a] && typeof datos[a] === "object") {
        datos[a] = { ...datos[a] };
        delete datos[a][b];
      }
    }
    return { ...x, esquema: 3, datos };
  },
};


/**
 * Lee cualquier archivo o cualquier estado guardado y devuelve el de hoy.
 *
 * Nunca lanza: un archivo ilegible tiene que dejar la app en un estado usable, no a
 * medias. Lo que sí hace es DECIR qué pasó, en `avisos`, para que la interfaz lo muestre
 * en vez de abrir en silencio un caso que no es el que el usuario eligió.
 *
 * @param {any} crudo
 * @returns {{ datos: any, desde: number|null, migrado: boolean, avisos: string[] }}
 */
export function migrar(crudo) {
  const avisos = [];
  if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) {
    return { datos: { ...INICIAL }, desde: null, migrado: false,
      avisos: ["El archivo no contiene un proyecto: se abrió el caso por defecto."] };
  }

  // ── DE QUÉ VERSIÓN ES ────────────────────────────────────────────────────────
  // Un objeto SIN sobre es el estado pelado de `localStorage`, que nunca tuvo versión: se
  // trata como el esquema 1, que es lo que era.
  const conSobre = typeof crudo.esquema === "number" || typeof crudo.v === "number";
  let esquema = conSobre ? (crudo.esquema ?? crudo.v) : 1;
  let x = crudo;

  if (conSobre && crudo.app && crudo.app !== APP.id) {
    avisos.push(`El archivo dice venir de «${crudo.app}» y no de «${APP.id}». Se intentó `
      + "abrir igual: revisá que los datos sean los que esperabas.");
  }

  if (esquema > ESQUEMA) {
    // Un archivo de una versión FUTURA no se puede migrar hacia atrás: no se sabe qué
    // cambió. Se abre lo que se entiende y se avisa, que es mejor que negarse —el usuario
    // tiene su caso adentro— y mucho mejor que abrirlo callado.
    avisos.push(`El archivo es de un esquema más nuevo (${esquema}) que el que entiende `
      + `esta versión (${ESQUEMA}). Se abrió lo que se pudo interpretar; puede faltar algo. `
      + "Conviene actualizar la aplicación.");
    return { datos: fusionar(x.datos ?? x), desde: esquema, migrado: false, avisos };
  }

  const desde = esquema;
  while (esquema < ESQUEMA) {
    const paso = MIGRACIONES[esquema];
    if (!paso) {
      avisos.push(`No hay migración del esquema ${esquema} al ${esquema + 1}. Se abrió el `
        + "archivo tal cual.");
      break;
    }
    x = paso(x);
    esquema = x.esquema;
  }

  const datos = fusionar(x.datos ?? x);
  if (desde < ESQUEMA && avisos.length === 0) {
    avisos.push(`Proyecto migrado del esquema ${desde} al ${ESQUEMA}. Al guardarlo se `
      + "escribe en el formato nuevo.");
  }
  return { datos, desde, migrado: desde < ESQUEMA, avisos };
}

/**
 * El archivo que se descarga: sobre de procedencia + estado.
 *
 * @param {any} d  el estado del proyecto
 * @param {Date} [fecha]
 */
export const serializar = (d, fecha) => ({
  ...procedencia({ proyecto: d?.proyecto, fecha }),
  datos: d,
});

/**
 * Nombre del archivo.
 *
 * Sale del nombre del proyecto: con «viento.json» para todos, una carpeta con seis casos
 * es seis archivos indistinguibles.
 */
export const nombreArchivo = (proyecto) =>
  `${String(proyecto || "viento").replace(/[^\w\- ]+/g, "").trim() || "viento"}.viento.json`;
