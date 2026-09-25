// Kz: LA FÓRMULA CONTRA LAS 60 CELDAS DE LA TABLA 1.13-1.
//
// El motor calcula Kz con la expresión de la nota 1 y no interpolando la tabla, porque la
// fórmula es continua. Pero entonces la tabla queda sin usar, y una tabla que nadie lee no
// verifica nada: acá se usa como CONTROL. Sus 60 celdas tienen que reconstruirse desde α y
// zg, que son seis números de la Tabla 1.9-1.
//
// El banco de la Tabla 2.5-2 no puede cubrir esto: evalúa sólo a z = 10 m en exposición B,
// o sea UNA de las 60 celdas. Lo comprobé bajo mutación —quitarle a Kz el congelamiento
// por debajo de 5 m no le mueve un solo test— y por eso este archivo existe.
import { describe, it, expect } from 'vitest';
import { kz } from '../src/engine/presionDinamica.js';
import { TERRENO, KZ_TABLA, ALTURAS_KZ, KZ_MAX, EXPOSICIONES } from '../src/constants/exposicion.js';

// TOLERANCIA 0,01, Y ESTÁ JUSTIFICADA POR LA NORMA. El comentario C 1.13.1 dice que donde
// los valores recalculados quedaban dentro de 0,01 de los del CIRSOC 102-2005, la comisión
// CONSERVÓ los viejos. La tabla no es la fórmula redondeada: exigir igualdad exacta daría
// rojo por una decisión deliberada del reglamento y no por un error de transcripción.
const TOL = 0.01;

describe('Kz — la fórmula reproduce la Tabla 1.13-1', () => {
  const casos = EXPOSICIONES.flatMap(e => ALTURAS_KZ.map((z, i) => [e, z, KZ_TABLA[e][i]]));

  it('son 60 celdas: tres exposiciones por veinte alturas', () => {
    expect(casos).toHaveLength(60);
  });

  it.each(casos)('exposición %s, z = %s m → %s', (exp, z, tabulado) => {
    expect(Math.abs(kz(z, exp) - tabulado)).toBeLessThanOrEqual(TOL);
  });

  // La primera fila de la tabla dice «0 - 5», un rango y no una altura: por debajo de 5 m
  // el perfil se CONGELA. Sin eso Kz tendería a cero al ras del suelo y la presión sobre
  // el zócalo saldría casi nula, que es físicamente falso y además inseguro.
  it.each(EXPOSICIONES)('exposición %s: por debajo de 5 m el perfil queda congelado', (exp) => {
    const k5 = kz(5, exp);
    for (const z of [0, 1, 2.5, 4, 4.999]) expect(kz(z, exp)).toBe(k5);
    expect(kz(5.001, exp)).toBeGreaterThan(k5);
  });

  // Por encima de la altura gradiente el perfil deja de crecer y se topea en 2,41.
  //
  // ⚠ EN EXPOSICIÓN B ESE TRAMO NO EXISTE. La nota 1 lo define para `zg < z ≤ 1000 m`, y
  // en B resulta zg = 1000 m, así que el intervalo es VACÍO: el perfil llega a 2,41
  // justo en el extremo del alcance del reglamento y no hay ninguna altura por encima.
  // En C (zg = 750) y en D (zg = 590) sí hay tramo constante. Una primera versión de este
  // test daba por sentado que `zg + 1` siempre es válido y fallaba en B contra un motor
  // correcto, que es la forma más fácil de terminar «arreglando» el código bueno.
  it.each(EXPOSICIONES)('exposición %s: el perfil llega a 2,41 en zg', (exp) => {
    const { zg } = TERRENO[exp];
    expect(kz(zg, exp)).toBeCloseTo(KZ_MAX, 10);     // continuo en el empalme
  });

  it.each(["C", "D"])('exposición %s: entre zg y 1000 m el perfil es constante', (exp) => {
    const { zg } = TERRENO[exp];
    expect(kz(zg + 1, exp)).toBe(KZ_MAX);
    expect(kz(1000, exp)).toBe(KZ_MAX);
  });

  it('en exposición B el tramo constante es vacío: zg coincide con el tope de 1000 m', () => {
    expect(TERRENO.B.zg).toBe(1000);
    expect(kz(1000, "B")).toBeCloseTo(KZ_MAX, 10);
    expect(kz(1001, "B")).toBeNull();
  });

  it('por encima de 1000 m devuelve null: el reglamento no cubre esa altura', () => {
    for (const e of EXPOSICIONES) expect(kz(1001, e)).toBeNull();
  });

  // Un terreno más rugoso frena más el viento cerca del suelo: a igual altura,
  // B < C < D. Si dos filas de la Tabla 1.9-1 estuvieran intercambiadas, esto cae.
  it.each(ALTURAS_KZ)('z = %s m: Kz crece con la rugosidad decreciente (B < C < D)', (z) => {
    expect(kz(z, "B")).toBeLessThan(kz(z, "C"));
    expect(kz(z, "C")).toBeLessThan(kz(z, "D"));
  });

  it('Kz crece monótonamente con la altura en las tres exposiciones', () => {
    for (const e of EXPOSICIONES) {
      for (let i = 1; i < ALTURAS_KZ.length; i++) {
        expect(kz(ALTURAS_KZ[i], e)).toBeGreaterThan(kz(ALTURAS_KZ[i - 1], e));
      }
    }
  });

  it('una exposición inexistente devuelve null, en vez de caer a un default silencioso', () => {
    expect(kz(10, "A")).toBeNull();          // la categoría A se eliminó en esta edición
    expect(kz(10, "")).toBeNull();
  });
});
