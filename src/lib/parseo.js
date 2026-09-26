// PARSEO DE LOS CAMPOS NUMÉRICOS — un solo separador, y es el decimal.
//
// ── LA REGLA ────────────────────────────────────────────────────────────────────
// Un campo numérico acepta coma o punto, indistintamente, como separador DECIMAL. No
// acepta separador de miles. Con más de un separador se rechaza y se dice por qué.
//
//   "12"        → 12          "12,5"  → 12,5      "12.5" → 12,5
//   "1.234"     → 1,234       ← UN separador es decimal, siempre
//   "1.234,56"  → rechazado   "1,234.56" → rechazado   "1.234.567" → rechazado
//
// ── POR QUÉ NO SE ACEPTA EL SEPARADOR DE MILES ──────────────────────────────────
// Porque «1.234» es mil doscientos treinta y cuatro para un lector y uno coma dos tres
// cuatro para otro, y el programa tendría que adivinar cuál. Adivinar bien el 99 % de las
// veces es peor que no adivinar: el 1 % restante es una altura de edificio mil veces más
// grande que pasa desapercibida porque el número «parece bien».
//
// Con la regla de un solo separador no hay nada que adivinar, y el valor interpretado se
// muestra al lado del campo para que la lectura del programa esté siempre a la vista.
//
// ── POR QUÉ NO ALCANZA CON `type="number"` ──────────────────────────────────────
// El input numérico del navegador decide qué acepta según el idioma del SISTEMA, no del
// documento: en una máquina en inglés rechaza la coma y en una en español rechaza el
// punto, y el campo queda vacío sin decir nada. Por eso los campos son `type="text"` con
// `inputMode="decimal"`, que en un teléfono abre igual el teclado numérico.

/** Coma o punto. */
const SEPARADORES = /[.,]/g;

/**
 * @typedef {object} Parseo
 * @property {boolean} ok
 * @property {number|null} valor   `null` si el campo está vacío
 * @property {boolean} vacio
 * @property {string} [error]      por qué se rechazó, en castellano
 */

/**
 * Interpreta el texto de un campo numérico.
 * @param {unknown} texto
 * @returns {Parseo}
 */
export function parsear(texto) {
  if (typeof texto === "number") {
    return Number.isFinite(texto)
      ? { ok: true, valor: texto, vacio: false }
      : { ok: false, valor: null, vacio: false, error: "No es un número." };
  }
  const s = String(texto ?? "").trim();
  // VACÍO NO ES ERROR. En este repo `""` significa «automático» en varios campos —`col.zW`,
  // la z de K_zt, el K_d del capítulo 4— y el motor cae a un valor derivado.
  if (s === "") return { ok: true, valor: null, vacio: true };

  const seps = s.match(SEPARADORES) ?? [];
  if (seps.length > 1) {
    return { ok: false, valor: null, vacio: false,
      error: "Hay más de un separador. Un solo separador —coma o punto— es el decimal, y "
        + "no se admite separador de miles: «1.234,56» hay que escribirlo «1234,56»." };
  }

  const normal = s.replace(",", ".");
  // Se exige la forma completa y no `parseFloat`, que lee «12abc» como 12 y «1e3» como
  // 1000: los dos son entradas que el usuario no quiso escribir.
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(normal)) {
    return { ok: false, valor: null, vacio: false,
      error: `«${s}» no es un número. Se escriben sólo dígitos y un separador decimal.` };
  }
  const n = Number(normal);
  if (!Number.isFinite(n)) {
    return { ok: false, valor: null, vacio: false, error: `«${s}» no es un número.` };
  }
  return { ok: true, valor: n, vacio: false };
}

/**
 * El número, o el valor por defecto. Es lo que usa el motor.
 *
 * ⚠ REEMPLAZA A LOS `parseFloat` SUELTOS. Había tres `num()` distintos en el motor y dos
 * de ellos no manejaban la coma: con la coma habilitada en los campos, `parseFloat("12,5")`
 * devuelve 12 y descarta el resto en silencio.
 *
 * @param {unknown} v @param {number} [porDefecto]
 */
export function num(v, porDefecto = 0) {
  const p = parsear(v);
  return p.ok && p.valor !== null ? p.valor : porDefecto;
}

/**
 * El número, o `undefined` si el campo está vacío. Es el patrón «vacío = automático»:
 * distinto de `num()`, que no puede diferenciar un 0 escrito de un campo en blanco.
 */
export function opt(v) {
  const p = parsear(v);
  return p.ok && p.valor !== null ? p.valor : undefined;
}

/** Cómo quedó interpretado, para mostrarlo al lado del campo. Coma decimal. */
export function interpretado(texto, dec = 3) {
  const p = parsear(texto);
  if (!p.ok) return { ok: false, texto: p.error };
  if (p.vacio) return { ok: true, texto: null };
  // Se recortan los ceros de más: «6» se lee «6», no «6,000».
  const redondeado = Number(p.valor.toFixed(dec));
  return { ok: true, texto: String(redondeado).replace(".", ",") };
}
