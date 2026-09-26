// UNIDADES — el único lugar donde se convierte.
//
// El motor trabaja en N, m, N/m² y la conversión ocurre en el borde. Lo que estos tests
// protegen no es la aritmética —multiplicar por 1e-3 no falla— sino las dos cosas que sí
// fallan: que el número y su unidad salgan del MISMO lugar, y que nadie vuelva a dividir
// por mil a mano en una pantalla.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { UNIDADES, PERFILES, convertir, unidades, U } from '../src/lib/unidades.js';

describe('los factores son exactos', () => {
  // Se comparan contra la definición del SI, no contra otra tabla del repo.
  const esperados = [
    ["fuerza", "N", 1], ["fuerza", "kN", 1e-3], ["fuerza", "MN", 1e-6],
    ["presion", "N/m²", 1], ["presion", "kN/m²", 1e-3], ["presion", "MPa", 1e-6],
    ["momento", "N·m", 1], ["momento", "kN·m", 1e-3],
    ["longitud", "m", 1], ["longitud", "cm", 100], ["longitud", "mm", 1000],
    ["area", "m²", 1], ["area", "cm²", 1e4], ["area", "mm²", 1e6],
    ["velocidad", "m/s", 1], ["velocidad", "km/h", 3.6],
  ];
  for (const [m, u, f] of esperados) {
    it(`${m} → ${u}`, () => {
      expect(convertir(m, 1, u)).toBeCloseTo(f, 12);
      expect(convertir(m, 12345, u)).toBeCloseTo(12345 * f, 6);
    });
  }

  it('kPa y kN/m² son la misma unidad, con dos nombres', () => {
    expect(convertir("presion", 1234, "kPa")).toBe(convertir("presion", 1234, "kN/m²"));
  });

  it('la unidad interna tiene factor 1 en las seis magnitudes', () => {
    for (const [m, def] of Object.entries(UNIDADES)) {
      expect(def.factores[def.interna], m).toBe(1);
    }
  });

  it('ida y vuelta devuelve el valor original', () => {
    for (const [m, def] of Object.entries(UNIDADES)) {
      for (const u of Object.keys(def.factores)) {
        const ida = convertir(m, 987.654, u);
        expect(ida / def.factores[u], `${m}/${u}`).toBeCloseTo(987.654, 9);
      }
    }
  });
});

describe('una unidad que no existe falla, y lo dice', () => {
  // Devolver `undefined` o pasar de largo sería lo peor posible: un número sin convertir
  // parece correcto.
  it('magnitud desconocida', () => {
    expect(() => convertir("torsion", 1, "kN")).toThrow(/magnitud desconocida/);
  });
  it('unidad ajena a la magnitud, con la lista de las que hay', () => {
    expect(() => convertir("fuerza", 1, "mm")).toThrow(/no es una unidad de fuerza/);
    expect(() => convertir("fuerza", 1, "mm")).toThrow(/N, kN, MN/);
  });
});

describe('el formateador saca junto el número y la unidad', () => {
  it('pantalla: fuerzas en kN, presiones en N/m², momentos en kN·m', () => {
    expect(U.fuerza(356_800)).toBe("356,8 kN");
    expect(U.presion(1841)).toBe("1841 N/m²");
    expect(U.momento(1_074_100)).toBe("1074,1 kN·m");
    expect(U.longitud(6)).toBe("6,00 m");
  });

  it('memoria: longitudes en mm y presiones en kN/m²', () => {
    const m = unidades(PERFILES.memoria);
    expect(m.longitud(6)).toBe("6000 mm");
    expect(m.presion(1841)).toBe("1,841 kN/m²");
    expect(m.fuerza(356_800)).toBe("356,8 kN");
  });

  it('datos: longitudes en m, que es lo que espera un modelo de barras', () => {
    expect(unidades(PERFILES.datos).longitud(6)).toBe("6,00 m");
  });

  // ⚠ LO QUE HACE QUE ESTO SIRVA. El texto no se arma concatenando: la unidad sale del
  // mismo perfil que el factor, así que no pueden discrepar.
  it('cambiar el perfil cambia el número Y la unidad a la vez', () => {
    for (const p of Object.values(PERFILES)) {
      const f = unidades(p);
      for (const mag of ["fuerza", "presion", "momento", "longitud"]) {
        const txt = f[mag](1000);
        expect(txt.endsWith(p[mag]), `${mag} en ${p[mag]}: ${txt}`).toBe(true);
        const num = parseFloat(txt.replace(p[mag], "").trim().replace(",", "."));
        expect(num, `${mag} en ${p[mag]}`).toBeCloseTo(convertir(mag, 1000, p[mag]), 2);
      }
    }
  });

  it('coma decimal, siempre', () => {
    expect(U.fuerza(1234.5)).toContain(",");
    expect(U.fuerza(1234.5)).not.toContain(".");
  });

  it('un valor no finito da «—» y no «NaN»', () => {
    expect(U.fuerza(NaN)).toBe("— kN");
    expect(U.fuerza(undefined)).toBe("— kN");
  });

  it('`val` devuelve el número crudo, que es lo que va a un CSV', () => {
    expect(U.val.fuerza(356_800)).toBeCloseTo(356.8, 9);
    expect(unidades(PERFILES.memoria).val.longitud(6)).toBe(6000);
  });

  it('`u` trae la unidad de cada magnitud, para encabezados y para el campo `unidades`', () => {
    expect(U.u.fuerza).toBe("kN");
    expect(unidades(PERFILES.memoria).u.longitud).toBe("mm");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LA REGLA, VERIFICADA SOBRE EL CÓDIGO
// ═══════════════════════════════════════════════════════════════════════════════
//
// «unidades.js es único y obligatorio para toda salida» no es una convención que se
// recuerda: es algo que se comprueba. Este test recorre los componentes y falla si
// reaparece una conversión a mano. Sin él, la regla dura hasta el próximo apuro.
describe('ninguna pantalla convierte unidades por su cuenta', () => {
  const archivos = (dir) => readdirSync(dir).flatMap(n => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? archivos(p) : (/\.jsx?$/.test(p) ? [p] : []);
  });

  // Una división o multiplicación por mil, con o sin espacios y con separador de miles.
  const CONVERSION = /[/*]\s*1[_\s]?000\b|[/*]\s*1e3\b/;

  it('src/components no divide ni multiplica por 1000', () => {
    const culpables = [];
    for (const f of archivos("src/components")) {
      readFileSync(f, "utf8").split("\n").forEach((linea, i) => {
        if (CONVERSION.test(linea)) culpables.push(`${f}:${i + 1}  ${linea.trim()}`);
      });
    }
    expect(culpables, `Convertir va en lib/unidades.js:\n${culpables.join("\n")}`).toEqual([]);
  });

  // Y que el test sepa reconocer una: si el patrón estuviera mal escrito, el de arriba
  // pasaría siempre y no verificaría nada.
  it('el patrón reconoce las formas que hay que atrapar', () => {
    for (const s of ["f(x / 1000, 1)", "v/1000", "x * 1000", "n / 1e3", "a / 1_000"]) {
      expect(CONVERSION.test(s), s).toBe(true);
    }
    for (const s of ["f(x, 1000)", "x / 100", "z * 10", "puntos: 1000"]) {
      expect(CONVERSION.test(s), s).toBe(false);
    }
  });
});
