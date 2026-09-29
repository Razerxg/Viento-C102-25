// IDENTIDAD DE LA APLICACIÓN Y DE LO QUE PRODUCE.
//
// ── POR QUÉ ESTÁ EN UN SOLO LUGAR ──────────────────────────────────────────────
// Todo lo que sale de acá —el JSON del proyecto, el CSV de presiones, la memoria— tiene
// que decir con qué versión de qué aplicación y contra qué edición del reglamento se
// calculó. Un listado de presiones sin eso es un papel sin procedencia: dentro de dos
// años nadie puede decir si salió de la edición 2005 o de la 2025, y las dos dan números
// plausibles para el mismo edificio.
//
// ⚠ `VERSION` SE REPITE EN `package.json`. No se importa de ahí para no arrastrar el
// manifiesto al bundle ni depender de `resolveJsonModule` en el navegador; en cambio hay
// un test que exige que coincidan. Dos números distintos para la misma versión es peor
// que uno solo escrito dos veces.

export const APP = {
  id: "viento-c102-25",
  nombre: "Viento CIRSOC 102-2025",
  version: "0.2.0",
  norma: "CIRSOC 102-2025",
  metodo: "Procedimiento direccional — SPRFV, capítulo 2",
  repositorio: "https://github.com/Razerxg/viento-c102-25",
};

/**
 * VERSIÓN DEL ESQUEMA DEL ARCHIVO DE PROYECTO.
 *
 * Sube SÓLO cuando un archivo viejo deja de poder leerse tal cual y hace falta migrarlo.
 * Agregar un campo nuevo no la sube: la fusión contra el estado inicial ya resuelve ese
 * caso, y subirla por cada campo haría que la lista de migraciones crezca sin que ninguna
 * haga nada.
 *
 *   1 · el objeto de estado, plano, con `{ app, v: 1 }` al lado.
 *   2 · `{ app, esquema, version, norma, generado, datos }`: el estado vive dentro de
 *       `datos` y el sobre lleva la procedencia. Antes el archivo mezclaba los dos
 *       niveles, así que un campo del proyecto llamado `app` o `v` habría pisado la
 *       identificación del archivo.
 *   3 · sin campos de fundamento. La app dejó de pedir que se justifiquen las decisiones
 *       del proyectista, así que `riesgoFundamento`, `cerrFundamento`,
 *       `env.fundamento247`, `vManual.fundamento` y `vManual.documento` se descartan al
 *       abrir. ⚠ ESTA SÍ SUBE LA VERSIÓN aunque «sólo» se borren campos: la fusión
 *       contra el inicial NO alcanza, porque un archivo viejo los trae y volverían a
 *       entrar al estado como claves huérfanas que nada lee y que se guardarían otra vez.
 */
export const ESQUEMA = 3;

/**
 * AVISO DE RESPONSABILIDAD PROFESIONAL.
 *
 * Va en TODA salida, no sólo en la memoria. El riesgo real de una herramienta de viento
 * no es que se rompa: es que entregue un número plausible bajo una hipótesis equivocada y
 * que alguien lo transcriba a un modelo sin mirar de dónde salió.
 */
export const RESPONSABILIDAD =
  "Esta aplicación es una AYUDA DE CÁLCULO. Los resultados no sustituyen el criterio ni "
  + "la responsabilidad del profesional interviniente, que debe verificar las hipótesis "
  + "adoptadas —exposición, topografía, cerramiento, sistema estructural— contra el "
  + "reglamento y contra el proyecto antes de usarlos.";

/** Fecha y hora en formato ISO, sin milisegundos: es lo que va en el sobre. */
export const ahora = (d = new Date()) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

/**
 * El sobre de procedencia que encabeza cualquier salida.
 *
 * @param {object} [o]
 * @param {string} [o.proyecto]  nombre del caso
 * @param {Date} [o.fecha]
 */
export const procedencia = ({ proyecto, fecha } = {}) => ({
  app: APP.id,
  aplicacion: APP.nombre,
  version: APP.version,
  norma: APP.norma,
  metodo: APP.metodo,
  esquema: ESQUEMA,
  generado: ahora(fecha),
  ...(proyecto ? { proyecto } : null),
  responsabilidad: RESPONSABILIDAD,
});

/**
 * La misma procedencia como renglones de texto, para el CSV y la memoria.
 *
 * Sale del MISMO objeto que la versión JSON: escrita aparte, un día la memoria informa
 * una versión y el JSON otra, y las dos salieron de la misma corrida.
 */
export const procedenciaTexto = (o = {}) => {
  const p = procedencia(o);
  return [
    ["Aplicación", `${p.aplicacion} v${p.version}`],
    ["Reglamento", p.norma],
    ["Procedimiento", p.metodo],
    ...(p.proyecto ? [["Proyecto", p.proyecto]] : []),
    ["Generado", p.generado],
    ["Responsabilidad", p.responsabilidad],
  ];
};
