// ARCHIVO DE PROYECTO — sobre, esquema y migración.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { migrar, fusionar, serializar, nombreArchivo, SUBOBJETOS,
  ARREGLOS } from '../src/lib/proyecto.js';
import { INICIAL } from '../src/constants/inicial.js';
import { APP, ESQUEMA, RESPONSABILIDAD, procedencia,
  procedenciaTexto, ahora } from '../src/constants/version.js';

describe('identidad de la aplicación', () => {
  // ⚠ LA VERSIÓN ESTÁ ESCRITA DOS VECES, acá y en package.json. No se importa el
  // manifiesto para no arrastrarlo al bundle, así que lo que impide que se separen es
  // este test y nada más.
  it('la versión coincide con la de package.json', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(APP.version).toBe(pkg.version);
    expect(APP.id).toBe(pkg.name);
  });

  it('la procedencia nombra la edición del reglamento y el procedimiento', () => {
    const p = procedencia({ proyecto: "Galpón" });
    expect(p.norma).toBe("CIRSOC 102-2025");
    expect(p.metodo).toMatch(/direccional/i);
    expect(p.proyecto).toBe("Galpón");
    expect(p.esquema).toBe(ESQUEMA);
    expect(p.responsabilidad).toBe(RESPONSABILIDAD);
  });

  it('sin nombre de proyecto no inventa el campo', () => {
    expect("proyecto" in procedencia()).toBe(false);
  });

  it('la fecha es ISO sin milisegundos, y es la que se le pasa', () => {
    const f = new Date(Date.UTC(2026, 8, 27, 12, 34, 56, 789));
    expect(ahora(f)).toBe("2026-09-27T12:34:56Z");
    expect(procedencia({ fecha: f }).generado).toBe("2026-09-27T12:34:56Z");
  });

  // La versión de texto y la de objeto salen del MISMO lugar: escritas aparte, un día la
  // memoria informa una versión y el JSON otra, y las dos salieron de la misma corrida.
  it('la procedencia en texto dice lo mismo que la de objeto', () => {
    const f = new Date(Date.UTC(2026, 0, 2, 3, 4, 5));
    const obj = procedencia({ proyecto: "X", fecha: f });
    const txt = Object.fromEntries(procedenciaTexto({ proyecto: "X", fecha: f }));
    expect(txt["Reglamento"]).toBe(obj.norma);
    expect(txt["Procedimiento"]).toBe(obj.metodo);
    expect(txt["Generado"]).toBe(obj.generado);
    expect(txt["Proyecto"]).toBe(obj.proyecto);
    expect(txt["Aplicación"]).toContain(obj.version);
    expect(txt["Responsabilidad"]).toBe(RESPONSABILIDAD);
  });
});

describe('la lista de sub-objetos cubre el estado entero', () => {
  // ⚠ ES LA QUE HACE QUE LA FUSIÓN FUNCIONE. Un sub-objeto que no esté acá lo reemplaza
  // entero un archivo viejo, y las claves que ese archivo no traiga entran al motor como
  // `undefined`: `num(undefined)` da NaN y el cálculo sale roto sin ningún error.
  it('están todos los objetos de INICIAL, y ninguno de más', () => {
    const esperados = Object.keys(INICIAL).filter(k => {
      const v = INICIAL[k];
      return v != null && typeof v === "object" && !Array.isArray(v);
    });
    expect([...SUBOBJETOS].sort()).toEqual(esperados.sort());
    expect(SUBOBJETOS.length).toBeGreaterThan(5);
    expect(SUBOBJETOS).toContain("geo");
    expect(SUBOBJETOS).toContain("topo");
    expect(SUBOBJETOS).toContain("env");
  });

  it('los arreglos se listan aparte', () => {
    expect(ARREGLOS).toContain("aberturas");
    for (const k of ARREGLOS) expect(Array.isArray(INICIAL[k])).toBe(true);
  });
});

describe('fusión contra el estado inicial', () => {
  it('un sub-objeto parcial se completa, no se reemplaza', () => {
    const r = fusionar({ topo: { forma: "loma_2d" } });
    expect(r.topo.forma).toBe("loma_2d");
    // Todas las demás claves de `topo` siguen ahí, con su valor por defecto.
    for (const k of Object.keys(INICIAL.topo))
      if (k !== "forma") expect(r.topo[k], k).toEqual(INICIAL.topo[k]);
  });

  it('ningún campo queda en «sin definir»', () => {
    // Es la condición que importa: un `undefined` entra al motor como NaN y sale como
    // «—» en la pantalla, sin ningún error que lo delate.
    const r = fusionar({ geo: { a: "50" }, cap4: { B: "9" } });
    const hoyos = [];
    const mirar = (o, ruta) => {
      for (const [k, v] of Object.entries(o)) {
        if (v === undefined) hoyos.push(`${ruta}${k}`);
        else if (v && typeof v === "object" && !Array.isArray(v)) mirar(v, `${ruta}${k}.`);
      }
    };
    mirar(r, "");
    expect(hoyos).toEqual([]);
  });

  it('un sub-objeto que viene como otra cosa no rompe nada', () => {
    for (const basura of [null, "texto", 3, []]) {
      const r = fusionar({ geo: basura });
      expect(r.geo).toEqual(INICIAL.geo);
    }
  });

  it('un arreglo que viene como objeto vuelve al inicial', () => {
    expect(fusionar({ aberturas: { 0: "x" } }).aberturas).toEqual([]);
    expect(fusionar({ aberturas: [{ tipo: "operable" }] }).aberturas)
      .toEqual([{ tipo: "operable" }]);
  });

  it('lo que no es un objeto da el estado inicial entero', () => {
    for (const basura of [null, undefined, "x", 7, []])
      expect(fusionar(basura)).toEqual(INICIAL);
  });
});

describe('migración de esquema', () => {
  it('un estado pelado, sin sobre, se trata como el esquema 1', () => {
    // Es lo que hay en `localStorage`, que nunca tuvo versión.
    const m = migrar({ proyecto: "Viejo", geo: { a: "40" } });
    expect(m.desde).toBe(1);
    expect(m.migrado).toBe(true);
    expect(m.datos.proyecto).toBe("Viejo");
    expect(m.datos.geo.a).toBe("40");
    expect(m.datos.geo.b).toBe(INICIAL.geo.b);
    expect(m.avisos.join(" ")).toMatch(/migrado/i);
  });

  it('un archivo v1 pierde el sobre y conserva el estado', () => {
    const m = migrar({ app: "viento-c102-25", v: 1, proyecto: "P", exposicion: "D",
      topo: { forma: "escarpa_2d" } });
    expect(m.datos.proyecto).toBe("P");
    expect(m.datos.exposicion).toBe("D");
    expect(m.datos.topo.forma).toBe("escarpa_2d");
    // ⚠ `app` y `v` eran del SOBRE y no del proyecto: no pueden viajar a los datos, o
    // quedarían guardados como si fueran campos del edificio.
    expect("app" in m.datos).toBe(false);
    expect("v" in m.datos).toBe(false);
  });

  it('un archivo v2 se abre sin migrar', () => {
    const arch = serializar({ ...INICIAL, proyecto: "Nuevo" });
    const m = migrar(arch);
    expect(m.desde).toBe(ESQUEMA);
    expect(m.migrado).toBe(false);
    expect(m.avisos).toEqual([]);
    expect(m.datos.proyecto).toBe("Nuevo");
  });

  it('ida y vuelta: serializar y volver a migrar da el mismo estado', () => {
    const d = { ...INICIAL, proyecto: "Ida y vuelta", exposicion: "C",
      geo: { ...INICIAL.geo, a: "33", theta: "22" }, aberturas: [{ tipo: "operable" }] };
    expect(migrar(serializar(d)).datos).toEqual(d);
  });

  it('un archivo de un esquema más nuevo se abre con aviso, no se rechaza', () => {
    // El usuario tiene su caso adentro: negarse es peor que abrir lo que se entienda, y
    // MUCHO mejor que abrirlo en silencio.
    const m = migrar({ app: APP.id, esquema: ESQUEMA + 5, datos: { proyecto: "Futuro" } });
    expect(m.datos.proyecto).toBe("Futuro");
    expect(m.migrado).toBe(false);
    expect(m.avisos.join(" ")).toMatch(/más nuevo/i);
    // Y lo que ese archivo no traiga sigue completándose.
    expect(m.datos.geo).toEqual(INICIAL.geo);
  });

  it('un archivo de otra aplicación avisa y se abre igual', () => {
    const m = migrar({ app: "otra-cosa", esquema: 2, datos: { proyecto: "Ajeno" } });
    expect(m.avisos.join(" ")).toMatch(/otra-cosa/);
    expect(m.datos.proyecto).toBe("Ajeno");
  });

  it('basura no lanza y devuelve el caso por defecto con aviso', () => {
    for (const basura of [null, undefined, "{}", 42, []]) {
      const m = migrar(basura);
      expect(m.datos).toEqual(INICIAL);
      expect(m.avisos.length).toBeGreaterThan(0);
      expect(m.desde).toBe(null);
    }
  });
});

describe('el sobre del archivo', () => {
  it('la identificación y el estado están en niveles distintos', () => {
    // En el v1 estaban mezclados: un campo del proyecto llamado `app`, `v` o `version`
    // habría pisado la identificación del archivo sin que nada lo dijera.
    const arch = serializar({ ...INICIAL, app: "campo del usuario", version: "9.9" });
    expect(arch.app).toBe(APP.id);
    expect(arch.version).toBe(APP.version);
    expect(arch.datos.app).toBe("campo del usuario");
    expect(arch.datos.version).toBe("9.9");
    // Y al abrirlo vuelven donde estaban.
    const m = migrar(arch);
    expect(m.datos.app).toBe("campo del usuario");
    expect(m.datos.version).toBe("9.9");
  });

  it('lleva la responsabilidad profesional', () => {
    expect(serializar(INICIAL).responsabilidad).toBe(RESPONSABILIDAD);
    expect(RESPONSABILIDAD).toMatch(/AYUDA DE CÁLCULO/);
  });
});

describe('nombre del archivo', () => {
  it('sale del nombre del proyecto', () => {
    expect(nombreArchivo("Galpón norte")).toBe("Galpn norte.viento.json");
    expect(nombreArchivo("a/b\\c:d")).toBe("abcd.viento.json");
  });

  it('sin nombre usable cae en «viento»', () => {
    for (const x of ["", "   ", null, undefined, "///"])
      expect(nombreArchivo(x)).toBe("viento.viento.json");
  });
});
