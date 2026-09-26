// EL RUNNER DE CASOS, PROBADO CONTRA SÍ MISMO.
//
// Es infraestructura de verificación: si `comparar` tuviera la tolerancia al revés o
// dejara pasar un `null`, todos los casos de regresión darían verde sin comparar nada, y
// no habría forma de notarlo desde afuera.
import { describe, it, expect } from 'vitest';
import { comparar, estaCargado, TOL_REL_DEF } from './casos/runner.js';

describe('comparación con tolerancia relativa', () => {
  it('acepta dentro del 0,5 % y rechaza afuera', () => {
    expect(comparar({ a: 100.4 }, { a: 100 })).toEqual([]);      // 0,4 %
    expect(comparar({ a: 100.6 }, { a: 100 })).toHaveLength(1);  // 0,6 %
  });

  it('el borde exacto del 0,5 % entra', () => {
    expect(comparar({ a: 100.5 }, { a: 100 })).toEqual([]);
  });

  it('la tolerancia es RELATIVA, no absoluta', () => {
    // 0,5 % de 10.000 son 50: un desvío de 40 entra y el mismo 40 sobre 100 no.
    expect(comparar({ a: 10040 }, { a: 10000 })).toEqual([]);
    expect(comparar({ a: 140 }, { a: 100 })).toHaveLength(1);
  });

  it('en cero usa tolerancia absoluta, porque la relativa no existe ahí', () => {
    expect(comparar({ a: 1e-12 }, { a: 0 })).toEqual([]);
    expect(comparar({ a: 0.001 }, { a: 0 })).toHaveLength(1);
  });

  it('salta los esperados en null en vez de darlos por buenos', () => {
    // Es la diferencia entre «no verificado» y «verificado y pasa»: con `a` en null, el
    // 999 obtenido no se mira. Las dos claves se dan obtenidas para que el único motivo
    // posible de fallo sea la comparación de `b`, y no un obtenido ausente.
    expect(comparar({ a: 999, b: 5 }, { a: null, b: 5 })).toEqual([]);
    expect(comparar({ a: 999, b: 9 }, { a: null, b: 5 })).toHaveLength(1);
  });

  it('compara valores no numéricos por igualdad estricta', () => {
    expect(comparar({ m: "tabla" }, { m: "tabla" })).toEqual([]);
    expect(comparar({ m: "expresiones" }, { m: "tabla" })).toHaveLength(1);
  });

  it('un obtenido ausente o no finito es un fallo, no un cero', () => {
    expect(comparar({}, { a: 1 })).toHaveLength(1);
    expect(comparar({ a: NaN }, { a: 1 })).toHaveLength(1);
    expect(comparar({ a: Infinity }, { a: 1 })).toHaveLength(1);
  });

  it('respeta una tolerancia declarada por el caso', () => {
    expect(comparar({ a: 102 }, { a: 100 }, 0.05)).toEqual([]);
    expect(comparar({ a: 102 }, { a: 100 })).toHaveLength(1);
  });

  it('el mensaje dice cuánto se desvió y contra qué tolerancia', () => {
    const [m] = comparar({ a: 110 }, { a: 100 });
    expect(m).toMatch(/10\.000 %/);
    expect(m).toMatch(/0\.50 %/);
  });

  it('estaCargado distingue un caso vacío de uno con valores', () => {
    expect(estaCargado({ esperado: { a: null, b: null } })).toBe(false);
    expect(estaCargado({ esperado: { a: null, b: 1 } })).toBe(true);
    expect(estaCargado({})).toBeFalsy();
  });

  it('la tolerancia por defecto es 0,5 %', () => expect(TOL_REL_DEF).toBe(0.005));
});
