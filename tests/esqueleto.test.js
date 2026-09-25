// El esqueleto tiene UN test, y no es de relleno: verifica que la suite corre de verdad
// en Actions. Un repositorio cuyo `npm test` no ejecuta nada pasa en verde para siempre,
// y el día que se agregue el primer test del motor nadie se entera de que el CI nunca lo
// estuvo mirando.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

describe('esqueleto del repositorio', () => {
  it('la suite se ejecuta', () => expect(1 + 1).toBe(2));

  // CLAUDE.md no es documentación opcional acá: lleva la advertencia de no transcribir
  // coeficientes sin el documento, que es la regla que gobierna todo el proyecto.
  it('CLAUDE.md conserva la advertencia sobre las tablas de la norma', () => {
    const md = fs.readFileSync(new URL('../CLAUDE.md', import.meta.url), 'utf8');
    expect(md).toMatch(/NO ESTÁN EN LA MEMORIA DEL MODELO/);
    expect(md).toMatch(/test de verificación/);
  });
});
