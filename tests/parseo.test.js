// PARSEO DE LOS CAMPOS NUMÉRICOS.
//
// La regla: un solo separador —coma o punto— y es el DECIMAL. Sin separador de miles. Con
// más de uno, se rechaza. Lo que esto evita es que el programa adivine: «1.234» es mil
// doscientos treinta y cuatro para un lector y uno coma dos tres cuatro para otro, y
// adivinar bien el 99 % de las veces es peor que no adivinar, porque el 1 % restante es
// una altura mil veces más grande que pasa desapercibida.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parsear, num, opt, interpretado } from '../src/lib/parseo.js';

describe('un solo separador, y es el decimal', () => {
  const acepta = [
    ["12", 12], ["12,5", 12.5], ["12.5", 12.5],
    ["1.234", 1.234], ["1,234", 1.234],      // ⚠ UN separador es decimal, SIEMPRE
    ["0,5", 0.5], [",5", 0.5], [".5", 0.5], ["5,", 5],
    ["-3,5", -3.5], ["+7", 7], ["  8,25  ", 8.25],
    ["0", 0], ["000012", 12],
  ];
  for (const [txt, val] of acepta) {
    it(`«${txt}» → ${val}`, () => {
      const p = parsear(txt);
      expect(p.ok, p.error).toBe(true);
      expect(p.valor).toBeCloseTo(val, 12);
    });
  }
});

describe('lo que se rechaza, y con qué motivo', () => {
  it('más de un separador: el de miles no existe', () => {
    for (const txt of ["1.234,56", "1,234.56", "1.234.567", "1,2,3"]) {
      const p = parsear(txt);
      expect(p.ok, txt).toBe(false);
      expect(p.error, txt).toMatch(/más de un separador/);
      expect(p.error, txt).toMatch(/1234,56/);      // dice cómo escribirlo
    }
  });

  // `parseFloat` lee «12abc» como 12 y «1e3» como 1000: los dos son entradas que el
  // usuario no quiso escribir, y las dos pasaban antes sin decir nada.
  it('texto con basura, que `parseFloat` aceptaría a medias', () => {
    for (const txt of ["12abc", "abc", "1e3", "1 234", "12-5", "--3", "1/2"]) {
      const p = parsear(txt);
      expect(p.ok, txt).toBe(false);
      expect(p.error, txt).toBeTruthy();
    }
  });

  it('el valor rechazado NO se cuela como número', () => {
    for (const txt of ["12abc", "1.234,5", "1e3"]) {
      expect(parsear(txt).valor, txt).toBe(null);
      expect(num(txt, -1), txt).toBe(-1);
      expect(opt(txt), txt).toBeUndefined();
    }
  });
});

describe('el campo vacío significa «automático», no error', () => {
  // Es un patrón del repo: `col.zW`, el K_d del capítulo 4, los `Lx/Ly/Lb` del perfil.
  it('vacío es válido y no trae valor', () => {
    for (const txt of ["", "   ", null, undefined]) {
      const p = parsear(txt);
      expect(p.ok, String(txt)).toBe(true);
      expect(p.vacio, String(txt)).toBe(true);
      expect(p.valor, String(txt)).toBe(null);
    }
  });

  it('`num` cae al valor por defecto y `opt` devuelve undefined', () => {
    expect(num("", 7)).toBe(7);
    expect(num("")).toBe(0);
    expect(opt("")).toBeUndefined();
  });

  // La diferencia entre los dos: `num` no distingue un 0 escrito de un campo en blanco.
  it('un 0 ESCRITO no es un campo vacío', () => {
    expect(parsear("0").vacio).toBe(false);
    expect(opt("0")).toBe(0);
    expect(num("0", 7)).toBe(0);
  });
});

describe('un número ya parseado pasa de largo', () => {
  it('números', () => {
    expect(parsear(12.5).valor).toBe(12.5);
    expect(num(12.5)).toBe(12.5);
  });
  it('NaN e Infinity no', () => {
    expect(parsear(NaN).ok).toBe(false);
    expect(parsear(Infinity).ok).toBe(false);
  });
});

describe('el valor interpretado, que es lo que se muestra al lado del campo', () => {
  it('sale con coma decimal y sin ceros de relleno', () => {
    expect(interpretado("12.5").texto).toBe("12,5");
    expect(interpretado("6").texto).toBe("6");
    expect(interpretado("1.234").texto).toBe("1,234");
  });
  it('en un campo vacío no hay nada que mostrar', () => {
    expect(interpretado("").texto).toBe(null);
  });
  it('si el campo es inválido, lo que se muestra es el motivo', () => {
    const r = interpretado("1.234,5");
    expect(r.ok).toBe(false);
    expect(r.texto).toMatch(/más de un separador/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LA REGLA, VERIFICADA SOBRE EL CÓDIGO
// ═══════════════════════════════════════════════════════════════════════════════
describe('nadie parsea números por su cuenta', () => {
  const archivos = (dir) => readdirSync(dir).flatMap(n => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? archivos(p) : (/\.jsx?$/.test(p) ? [p] : []);
  });

  it('no queda ningún `parseFloat` ni `parseInt` fuera de lib/parseo.js', () => {
    const culpables = [];
    for (const dir of ["src/engine", "src/components", "src/context", "src/constants"]) {
      for (const f of archivos(dir)) {
        readFileSync(f, "utf8").split("\n").forEach((l, i) => {
          // Los comentarios que MENCIONAN parseFloat para explicar por qué no se usa no
          // cuentan: lo que se busca es la llamada.
          if (/\bparse(Float|Int)\s*\(/.test(l) && !/^\s*(\/\/|\*)/.test(l)) {
            culpables.push(`${f}:${i + 1}  ${l.trim()}`);
          }
        });
      }
    }
    expect(culpables, `Parsear va en lib/parseo.js:\n${culpables.join("\n")}`).toEqual([]);
  });

  it('los campos numéricos son type="text" con inputMode="decimal"', () => {
    const ui = readFileSync("src/components/ui.jsx", "utf8");
    expect(ui).toMatch(/type="text"\s+inputMode="decimal"/);
    // Y no queda ningún `type="number"` REAL, que delega el separador al idioma del
    // SISTEMA. Se saltean los comentarios, que lo mencionan justamente para explicar por
    // qué no se usa: si no, el propio comentario haría fallar al test.
    for (const f of archivos("src/components")) {
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/^\s*(\/\/|\*)/.test(l)) return;
        expect(/type="number"/.test(l), `${f}:${i + 1}`).toBe(false);
      });
    }
  });
});
