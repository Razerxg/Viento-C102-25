// RUNNER DE CASOS DE REGRESIÓN.
//
// Lee los `.json` de `tests/casos/<área>/`, arma un test por caso y compara contra los
// valores que cargó el proyectista a mano.
//
// ── POR QUÉ UN CASO SIN VALORES NO FALLA, PERO TAMPOCO PASA ────────────────────
// Los `esperado` en `null` se emiten como `test.todo`: quedan listados en la salida de
// vitest, contados aparte, y no rompen la suite. Es deliberado. Si rompieran, la tentación
// sería llenarlos con lo que devuelve el motor —que es exactamente lo que no verifica
// nada—; y si no aparecieran, nadie se acordaría de que faltan.
import fs from 'node:fs';
import path from 'node:path';

const TOL_REL_DEF = 0.005;      // 0,5 %
const TOL_ABS_CERO = 1e-9;      // la relativa no está definida en cero

/** @param {string} dir Subdirectorio de tests/casos, p. ej. "kzt" */
export function leerCasos(dir) {
  const base = path.join(new URL('.', import.meta.url).pathname, dir);
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base)
    .filter(f => f.endsWith('.json'))
    .flatMap(f => {
      const datos = JSON.parse(fs.readFileSync(path.join(base, f), 'utf8'));
      // Un archivo de parámetros de tabla es un objeto, no un array: no es un caso.
      if (!Array.isArray(datos)) return [];
      return datos.map(c => ({ ...c, archivo: f }));
    });
}

/** @param {string} dir @returns {object} el objeto del archivo de parámetros */
export function leerParametros(dir, archivo) {
  const p = path.join(new URL('.', import.meta.url).pathname, dir, archivo);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// ¿Este caso tiene algún valor cargado? Si todos son null, es un `todo`.
export const estaCargado = (caso) =>
  caso.esperado && Object.values(caso.esperado).some(v => v !== null && v !== undefined);

/**
 * Compara un obtenido contra un esperado con tolerancia relativa.
 * Devuelve la lista de discrepancias, vacía si todo cierra.
 */
export function comparar(obtenido, esperado, tolRel = TOL_REL_DEF) {
  const fallos = [];
  for (const [clave, esp] of Object.entries(esperado)) {
    if (esp === null || esp === undefined) continue;      // todavía sin cargar
    const obt = obtenido?.[clave];
    if (typeof esp !== "number") {
      if (obt !== esp) fallos.push(`${clave}: se esperaba ${esp} y se obtuvo ${obt}`);
      continue;
    }
    if (!Number.isFinite(obt)) {
      fallos.push(`${clave}: se esperaba ${esp} y se obtuvo ${obt}`);
      continue;
    }
    const dif = Math.abs(obt - esp);
    const ok = esp === 0 ? dif <= TOL_ABS_CERO : dif / Math.abs(esp) <= tolRel;
    if (!ok) {
      const rel = esp === 0 ? "—" : `${(100 * dif / Math.abs(esp)).toFixed(3)} %`;
      fallos.push(`${clave}: se esperaba ${esp}, se obtuvo ${obt} (desvío ${rel}, `
        + `tolerancia ${(100 * tolRel).toFixed(2)} %)`);
    }
  }
  return fallos;
}

/**
 * Declara los tests de un directorio de casos.
 * @param {object} api            {describe, it, expect} de vitest
 * @param {string} dir            subdirectorio de tests/casos
 * @param {(entrada:object)=>object} evaluar  corre el motor sobre la entrada del caso
 */
export function correrCasos({ describe, it, expect }, dir, evaluar) {
  const casos = leerCasos(dir);
  describe(`casos de regresión — ${dir}`, () => {
    if (!casos.length) {
      it.todo(`no hay casos cargados en tests/casos/${dir}`);
      return;
    }
    for (const caso of casos) {
      const nombre = `${caso.id}${caso.descripcion ? ` — ${caso.descripcion}` : ""}`;
      if (!estaCargado(caso)) {
        // Sin valores a mano no hay nada que verificar, pero el caso QUEDA A LA VISTA.
        it.todo(`${nombre} (esperados sin cargar)`);
        continue;
      }
      it(nombre, () => {
        const fallos = comparar(evaluar(caso.entrada), caso.esperado,
          caso.tolerancia_rel ?? TOL_REL_DEF);
        expect(fallos, fallos.join("\n")).toEqual([]);
      });
    }
  });
}

export { TOL_REL_DEF, TOL_ABS_CERO };
