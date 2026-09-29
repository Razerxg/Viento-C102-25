// LA APP NO PIDE FUNDAMENTAR DECISIONES DEL PROYECTISTA.
//
// ── LA DECISIÓN ────────────────────────────────────────────────────────────────
// Las HIPÓTESIS se declaran —qué modo de cerramiento, qué condiciones del art. 2.4.7, si
// el piso es solidario, qué R_i— porque cambian el cálculo y tienen que figurar en la
// memoria. Los FUNDAMENTOS no: los agrega el proyectista a mano.
//
// Había cinco campos de texto libre pidiéndolos, y dos de ellos producían avisos de nivel
// ERROR por estar vacíos: un proyecto correcto se anunciaba como «a revisar» por no haber
// escrito una frase.
//
// ⚠ ESTE ARCHIVO EXISTE PARA QUE NO VUELVAN. Un campo de fundamento es fácil de
// reintroducir sin querer —parece prolijidad— y nada en el cálculo se rompe cuando
// aparece.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { INICIAL } from '../src/constants/inicial.js';
import { migrar, serializar, CAMPOS_FUNDAMENTO } from '../src/lib/proyecto.js';
import { ESQUEMA } from '../src/constants/version.js';
import { resolverV } from '../src/engine/velocidad.js';
import { exencion247 } from '../src/engine/envolvente.js';
import * as velocidad from '../src/engine/velocidad.js';

const RAIZ = new URL('../src', import.meta.url).pathname;

/**
 * El código de un archivo, SIN comentarios.
 *
 * ⚠ SE SACAN A PROPÓSITO. Los comentarios que explican por qué un campo se eliminó
 * nombran ese campo, y un test que mire el archivo entero se dispara con la explicación
 * de su propio motivo. Lo que hay que perseguir es la ENTRADA, no la palabra.
 */
const codigo = (p) => readFileSync(p, "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .split("\n").map(l => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");

/** Todos los archivos de `src/`, recursivamente. */
function archivos(dir = RAIZ, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) archivos(p, out);
    else if (/\.jsx?$/.test(n)) out.push(p);
  }
  return out;
}

describe('no hay entradas de fundamento en la interfaz', () => {
  // Se buscan las ENTRADAS —un `<Campo label="Fundamento…">`, un `set("…Fundamento")`—
  // y no la palabra suelta: «fundamento físico» en un comentario de `presiones.js` no es
  // un campo, y prohibir la palabra haría que este test se desactive por ruidoso.
  const COMPONENTES = archivos().filter(p => p.includes("/components/"));

  it('los comentarios sí pueden nombrarlo: el test mira el código', () => {
    // Control del propio test. Si mirara el archivo entero, la explicación de por qué el
    // campo ya no está lo haría fallar, y la salida sería desactivarlo.
    const conNota = COMPONENTES.filter(p => /[Ff]undamento/.test(readFileSync(p, "utf8")));
    expect(conNota.length).toBeGreaterThan(0);
    for (const p of conNota) expect(codigo(p), p).not.toMatch(/[Ff]undamento/);
  });

  it('ningún componente tiene un campo con etiqueta «Fundamento»', () => {
    for (const p of COMPONENTES) {
      const src = codigo(p);
      expect(src, p).not.toMatch(/label=\{?"[^"]*[Ff]undamento/);
      expect(src, p).not.toMatch(/label=\{[^}]*[Ff]undamento[^}]*\}/);
    }
  });

  it('ningún componente pide un documento y su revisión', () => {
    for (const p of COMPONENTES) {
      const src = codigo(p);
      expect(src, p).not.toMatch(/label="Documento y revisión"/);
      expect(src, p).not.toMatch(/"[^"]*[Dd]ocumento y revisión/);
    }
  });

  it('ningún componente escribe en un campo de fundamento', () => {
    for (const p of COMPONENTES) {
      const src = codigo(p);
      expect(src, p).not.toMatch(/set\w*\(\s*["'][^"']*[Ff]undamento/);
      expect(src, p).not.toMatch(/\bd\.(cerrFundamento|riesgoFundamento)\b/);
      expect(src, p).not.toMatch(/\bfundamento247\b/);
      expect(src, p).not.toMatch(/\bFUNDAMENTOS_V\b/);
    }
  });

  it('ningún componente avisa por un fundamento faltante', () => {
    for (const p of COMPONENTES) {
      const src = codigo(p);
      expect(src, p).not.toMatch(/Falta el fundamento/);
      expect(src, p).not.toMatch(/[Ss]in fundamento declarado/);
    }
  });
});

describe('el estado no tiene campos de fundamento', () => {
  const rutas = (o, pre = "") => Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? rutas(v, `${pre}${k}.`) : [`${pre}${k}`]);

  it('INICIAL no declara ninguno', () => {
    for (const r of rutas(INICIAL)) {
      expect(r, r).not.toMatch(/[Ff]undamento/);
      expect(r, r).not.toMatch(/^vManual\.documento$/);
    }
  });

  it('los cinco que se eliminaron están listados, y ninguno sigue en INICIAL', () => {
    expect(CAMPOS_FUNDAMENTO.sort()).toEqual([
      "cerrFundamento", "env.fundamento247", "riesgoFundamento",
      "vManual.documento", "vManual.fundamento"]);
    const todas = rutas(INICIAL);
    for (const c of CAMPOS_FUNDAMENTO) expect(todas, c).not.toContain(c);
  });

  it('vManual queda sólo con la velocidad', () => {
    expect(Object.keys(INICIAL.vManual)).toEqual(["V"]);
  });

  it('env queda sólo con las declaraciones técnicas', () => {
    expect(Object.keys(INICIAL.env).sort()).toEqual(["arts247", "cond247", "diafragma"]);
  });
});

describe('el motor no exporta ni devuelve fundamentos', () => {
  it('velocidad.js ya no publica la lista de fundamentos ni sus condiciones', () => {
    expect("FUNDAMENTOS_V" in velocidad).toBe(false);
    expect("CONDICIONES_1_5_3" in velocidad).toBe(false);
    // Lo que SÍ sigue: qué ES V, que no es un fundamento sino la definición del dato.
    expect(velocidad.AVISO_QUE_ES_V.texto).toMatch(/RÁFAGA DE 3 SEGUNDOS/);
  });

  it('`resolverV` no devuelve fundamento ni documento, en ningún origen', () => {
    for (const origen of ["tabla", "manual", "v50", "interpolado"]) {
      const r = resolverV({ origen, ciudad: "Neuquén", riesgo: "II", manual: { V: 70 },
        v50: { V50: "48" }, interp: { V1: "60", V2: "70", d1: "10", d2: "30" } });
      expect("fundamento" in r, origen).toBe(false);
      expect("documento" in r, origen).toBe(false);
    }
  });

  it('`exencion247` no devuelve `sinFundamento`', () => {
    const x = exencion247({ cond247: ["una_planta"], h: 6 });
    expect("sinFundamento" in x).toBe(false);
    expect("fundamento" in x).toBe(false);
  });
});

describe('ningún aviso del motor pide fundamentar', () => {
  // ⚠ ERAN DOS DE NIVEL ERROR. Un proyecto correcto se anunciaba como «a revisar» —y la
  // memoria arrancaba con el recuadro NO APTA PARA EMISIÓN— por no haber escrito una
  // frase que el cálculo no usa.
  it('resolverV no produce avisos de fundamento en ningún origen', () => {
    for (const origen of ["tabla", "manual", "v50", "interpolado"]) {
      for (const V of [40, 70]) {
        const r = resolverV({ origen, ciudad: "Neuquén", riesgo: "II", manual: { V },
          v50: { V50: "48" }, interp: { V1: "60", V2: "70", d1: "10", d2: "30" } });
        for (const a of r.avisos) {
          expect(a.texto, `${origen}/${V}`).not.toMatch(/[Ff]undament/);
          expect(a.texto, `${origen}/${V}`).not.toMatch(/Falta indicar el documento/);
        }
      }
    }
  });

  it('una V menor que la del mapa no es un error', () => {
    const r = resolverV({ origen: "manual", ciudad: "Neuquén", riesgo: "II",
      manual: { V: 40 } });
    expect(r.avisos.some(a => a.tono === "error")).toBe(false);
    expect(r.ok).toBe(true);
  });
});

describe('la migración al esquema 3', () => {
  const VIEJO = {
    app: "viento-c102-25", esquema: 2,
    datos: {
      proyecto: "Caso con fundamentos", exposicion: "D", riesgo: "III",
      riesgoFundamento: "Escuela de gran ocupación",
      cerramiento: "parc_cerrado", cerrModo: "declarado",
      cerrFundamento: "Relevamiento de obra, doc. XX rev. A",
      origenV: "manual",
      vManual: { V: "72", fundamento: "comitente", documento: "ESP-001 rev. B" },
      env: { cond247: ["una_planta"], arts247: [], fundamento247: "Cálculo de regularidad",
        diafragma: "flexible" },
      geo: { a: "25", b: "35", hAlero: "7", theta: "18" },
    },
  };

  it('el esquema subió, y la migración existe', () => {
    expect(ESQUEMA).toBe(3);
    expect(migrar(VIEJO).desde).toBe(2);
    expect(migrar(VIEJO).migrado).toBe(true);
  });

  it('descarta los cinco campos, y nada más', () => {
    const { datos } = migrar(VIEJO);
    expect("riesgoFundamento" in datos).toBe(false);
    expect("cerrFundamento" in datos).toBe(false);
    expect("fundamento247" in datos.env).toBe(false);
    expect("fundamento" in datos.vManual).toBe(false);
    expect("documento" in datos.vManual).toBe(false);
    // Lo que el proyecto declaró y SÍ cambia el cálculo, sigue.
    expect(datos.exposicion).toBe("D");
    expect(datos.riesgo).toBe("III");
    expect(datos.cerramiento).toBe("parc_cerrado");
    expect(datos.cerrModo).toBe("declarado");
    expect(datos.vManual.V).toBe("72");
    expect(datos.env.cond247).toEqual(["una_planta"]);
    expect(datos.env.diafragma).toBe("flexible");
    expect(datos.geo.a).toBe("25");
  });

  // ⚠ LA FUSIÓN NO BORRA. `{ ...INICIAL, ...v }` conserva toda clave que el archivo traiga
  // aunque el inicial ya no la tenga, así que los campos eliminados volverían a entrar por
  // ahí y se guardarían otra vez en el archivo nuevo.
  it('los campos no vuelven a entrar por la fusión contra el inicial', () => {
    const { datos } = migrar(VIEJO);
    const texto = JSON.stringify(serializar(datos));
    expect(texto).not.toContain("riesgoFundamento");
    expect(texto).not.toContain("cerrFundamento");
    expect(texto).not.toContain("fundamento247");
    expect(texto).not.toContain("ESP-001");
    expect(texto).not.toContain("Relevamiento de obra");
  });

  it('un archivo del esquema 1, plano, también los pierde', () => {
    const { datos } = migrar({ app: "viento-c102-25", v: 1, proyecto: "Viejo viejo",
      riesgoFundamento: "algo", vManual: { V: "60", fundamento: "comitente" } });
    expect("riesgoFundamento" in datos).toBe(false);
    expect("fundamento" in datos.vManual).toBe(false);
    expect(datos.proyecto).toBe("Viejo viejo");
    expect(datos.vManual.V).toBe("60");
  });

  // Se descartan EN SILENCIO: ninguno entraba en ningún número, y avisar al abrir un
  // proyecto viejo sería alarmar por algo que el usuario no tiene que resolver.
  it('no se avisa por los campos descartados', () => {
    const av = migrar(VIEJO).avisos.join(" ");
    expect(av).not.toMatch(/[Ff]undament/);
    expect(av).not.toMatch(/descart/i);
    // El único aviso es el de la migración de esquema, que sí conviene decir.
    expect(av).toMatch(/migrado del esquema 2 al 3/);
  });

  it('un proyecto del esquema anterior abre y queda completo', () => {
    const { datos } = migrar(VIEJO);
    const hoyos = [];
    const mirar = (o, ruta) => {
      for (const [k, v] of Object.entries(o)) {
        if (v === undefined) hoyos.push(`${ruta}${k}`);
        else if (v && typeof v === "object" && !Array.isArray(v)) mirar(v, `${ruta}${k}.`);
      }
    };
    mirar(datos, "");
    expect(hoyos).toEqual([]);
    // Y trae todas las claves del inicial: nada quedó sin completar.
    for (const k of Object.keys(INICIAL)) expect(datos, k).toHaveProperty(k);
  });
});
