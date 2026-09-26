// FACTOR TOPOGRÁFICO K_zt — art. 1.8 y Figura 1.8-1.
//
// Es el parámetro que más puede cambiar el resultado de toda la app —llega a 3,15— y
// hasta ahora era el único del motor SIN UN SOLO TEST. Este archivo cubre las tres
// condiciones de aplicación, los dos métodos que el art. 1.8.2 permite, la asimetría de μ,
// la sustitución por pendiente fuerte y el recorte de los multiplicadores en cero.
import { describe, it, expect } from 'vitest';
import {
  kzt, interpolarTabla, muDe, TABLA_K1, TABLA_K2, TABLA_K3, AVISOS_FIJOS,
} from '../src/engine/topografia.js';
import { FORMAS_TOPO, CONDICIONES_KZT, HLH_TOPE } from '../src/constants/topografia.js';
import { leerParametros, correrCasos } from './casos/runner.js';

const FORMAS = ["loma_2D", "escarpa_2D", "colina_3D"];
const par = (id) => FORMAS_TOPO.find(f => f.id === id);

// Entrada mínima que cumple las tres condiciones, para no repetirla en cada test.
const base = (over = {}) => ({
  forma: "loma_2D", exposicion: "C", H_m: 30, Lh_m: 100, x_m: 0, lado: "barlovento",
  z_m: 0, cond1_confirmada: true, metodo: "expresiones", ...over,
});

// ═══════════════════════════════════════════════════════════════════════════════
// LA TRANSCRIPCIÓN, CONTRA EL ARCHIVO DE DATOS DEL PROYECTISTA
// ═══════════════════════════════════════════════════════════════════════════════

describe('las tablas del motor coinciden con tests/casos/kzt/figura_1_8_1.json', () => {
  // El archivo lo carga el proyectista desde el PDF. Que el motor lo repita no verifica
  // el PDF, pero sí impide que las dos copias se separen: si alguien corrige una celda en
  // el JSON y no en el motor, salta acá.
  const fig = leerParametros('kzt', 'figura_1_8_1.json');

  it('los parámetros de las expresiones son los mismos', () => {
    for (const id of FORMAS) {
      const p = fig.parametros[id], f = par(id);
      expect(f.k1, id).toEqual(p.K1_sobre_HLh);
      expect(f.gamma, id).toBe(p.gamma);
      expect(f.muBar, id).toBe(p.mu_barlovento);
      expect(f.muSot, id).toBe(p.mu_sotavento);
    }
  });

  it('las condiciones del art. 1.8.1 son las mismas', () => {
    expect(CONDICIONES_KZT.hLhMin).toBe(fig.condiciones_1_8_1.HLh_min);
    expect(CONDICIONES_KZT.hMin).toEqual(fig.condiciones_1_8_1.H_min_m);
  });

  it('las tres tablas son las mismas, celda por celda', () => {
    const cols = (t) => t.columnas.slice(1);
    for (const [tabla, motor, eje] of [
      [fig.tabla_K1, TABLA_K1, "hLh"], [fig.tabla_K2, TABLA_K2, "xLh"], [fig.tabla_K3, TABLA_K3, "zLh"],
    ]) {
      expect(motor[eje]).toEqual(tabla.filas.map(f => f[0]));
      cols(tabla).forEach((nombre, j) => {
        expect(motor[nombre], nombre).toEqual(tabla.filas.map(f => f[j + 1]));
      });
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONSISTENCIA ENTRE LOS DOS MÉTODOS QUE EL ART. 1.8.2 PERMITE
// ═══════════════════════════════════════════════════════════════════════════════

describe('tabla ↔ expresiones, con los parámetros de exposición C', () => {
  // La tabla está construida numéricamente con los cocientes de exposición C. Reproducirla
  // desde las expresiones es la verificación cruzada de las dos transcripciones: si una
  // celda estuviera mal leída, no cerraría.
  //
  // TOLERANCIA ABSOLUTA 0,005 + 1e-9: media unidad de la última cifra impresa. No es
  // arbitraria: hay celdas justo en el límite, como K1 de loma 2D en H/Lh = 0,50, donde la
  // expresión da 0,725 y la tabla imprime 0,72. El epsilon está para que el `<=` no lo
  // decida el último bit del flotante.
  const TOL = 0.005 + 1e-9;

  it('K1 — 21 celdas', () => {
    let celdas = 0;
    TABLA_K1.hLh.forEach((hLh, i) => {
      for (const id of FORMAS) {
        const esperado = par(id).k1.C * hLh;
        expect(Math.abs(TABLA_K1[id][i] - esperado), `${id} en H/Lh = ${hLh}`)
          .toBeLessThanOrEqual(TOL);
        celdas++;
      }
    });
    expect(celdas).toBe(21);
  });

  it('K2 — las dos columnas, con su μ', () => {
    TABLA_K2.xLh.forEach((xLh, i) => {
      for (const [col, mu] of [["escarpa_2D_sotavento", 4], ["otros_casos", 1.5]]) {
        const esperado = Math.max(0, 1 - xLh / mu);
        expect(Math.abs(TABLA_K2[col][i] - esperado), `${col} en x/Lh = ${xLh}`)
          .toBeLessThanOrEqual(TOL);
      }
    });
  });

  // ⚠ UNA SOLA EXCEPCIÓN EN TODA LA FIGURA, Y SE DECLARA EN VEZ DE AFLOJAR LA TOLERANCIA.
  //
  // K3 de escarpa en z/Lh = 2,00: la tabla imprime 0,00 y la expresión da e^(−2,5·2) =
  // 0,0067. Es la tabla la que redondeó a cero un valor que no lo es. Ampliar la
  // tolerancia global a 0,007 para tapar esta celda dejaría pasar un error de
  // transcripción en cualquiera de las otras treinta y ocho.
  const EXCEPCION = { forma: "escarpa_2D", zLh: 2.00, tabla: 0.00, expresion: 0.0067 };

  it('K3 — 39 celdas, con la excepción de escarpa en z/Lh = 2 declarada', () => {
    let excepciones = 0, celdas = 0;
    TABLA_K3.zLh.forEach((zLh, i) => {
      for (const id of FORMAS) {
        const esperado = Math.exp(-par(id).gamma * zLh);
        const dif = Math.abs(TABLA_K3[id][i] - esperado);
        celdas++;
        if (id === EXCEPCION.forma && zLh === EXCEPCION.zLh) {
          excepciones++;
          expect(TABLA_K3[id][i]).toBe(EXCEPCION.tabla);
          expect(esperado).toBeCloseTo(EXCEPCION.expresion, 4);
          expect(dif).toBeGreaterThan(TOL);     // que siga siendo la excepción que creemos
          continue;
        }
        expect(dif, `${id} en z/Lh = ${zLh}`).toBeLessThanOrEqual(TOL);
      }
    });
    expect(celdas).toBe(39);
    expect(excepciones, "apareció más de una excepción: revisar la transcripción").toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LAS TRES CONDICIONES DEL ART. 1.8.1, UNA POR UNA
// ═══════════════════════════════════════════════════════════════════════════════

describe('condiciones de aplicación', () => {
  it('sin confirmar la ubicación, K_zt = 1,0 y lo dice', () => {
    // Es cualitativa: no hay expresión que la decida. Sin la confirmación explícita del
    // proyectista, el motor no puede suponerla.
    const r = kzt(base({ cond1_confirmada: false }));
    expect(r.kzt).toBe(1.0);
    expect(r.aplica).toBe(false);
    expect(r.motivo).toMatch(/1\.8\.1/);
    expect(r.condiciones.find(c => c.id === "ubicacion").cumple).toBe(false);
  });

  it('con H/Lh < 0,20, K_zt = 1,0', () => {
    const r = kzt(base({ H_m: 10, Lh_m: 100 }));
    expect(r.kzt).toBe(1.0);
    expect(r.condiciones.find(c => c.id === "pendiente").cumple).toBe(false);
  });

  it('el umbral de H es 5 m en C y D, y 20 m en B — no 4,5 ni 18', () => {
    // Otras ediciones traen 4,5 m y 18 m. El 102-2025 no.
    expect(CONDICIONES_KZT.hMin).toEqual({ B: 20, C: 5, D: 5 });
    expect(kzt(base({ exposicion: "C", H_m: 4.9, Lh_m: 10 })).aplica).toBe(false);
    expect(kzt(base({ exposicion: "C", H_m: 5.1, Lh_m: 10 })).aplica).toBe(true);
    expect(kzt(base({ exposicion: "B", H_m: 19, Lh_m: 50 })).aplica).toBe(false);
    expect(kzt(base({ exposicion: "B", H_m: 21, Lh_m: 50 })).aplica).toBe(true);
  });

  it('son EXACTAMENTE tres condiciones', () => {
    // Ni aislamiento del accidente, ni 100H, ni 3 km, ni factor 2 sobre el terreno de
    // barlovento: el art. 1.8.1 del 102-2025 no los tiene.
    expect(kzt(base()).condiciones.map(c => c.id))
      .toEqual(["ubicacion", "pendiente", "altura"]);
  });

  it('reporta TODAS las que fallan, no sólo la primera', () => {
    const r = kzt(base({ cond1_confirmada: false, H_m: 10, Lh_m: 100 }));
    expect(r.condiciones.filter(c => !c.cumple)).toHaveLength(2);
    expect(r.motivo).toMatch(/condiciones 1 y 2/);
  });

  it('un valle con H negativa da 1,0 sin reducir nada', () => {
    const r = kzt(base({ H_m: -30 }));
    expect(r.kzt).toBe(1.0);
    expect(r.motivo).toMatch(/valle/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LOS MULTIPLICADORES
// ═══════════════════════════════════════════════════════════════════════════════

describe('asimetría de μ según el lado de la cresta', () => {
  it('la escarpa atenúa mucho más lento a sotavento', () => {
    expect(muDe("escarpa_2D", "sotavento")).toBe(4);
    expect(muDe("escarpa_2D", "barlovento")).toBe(1.5);
  });

  it('la loma y la colina usan 1,5 de los dos lados', () => {
    for (const id of ["loma_2D", "colina_3D"]) {
      expect(muDe(id, "barlovento"), id).toBe(1.5);
      expect(muDe(id, "sotavento"), id).toBe(1.5);
    }
  });

  it('a igual x, la escarpa a sotavento da un K2 mayor que a barlovento', () => {
    const e = { forma: "escarpa_2D", H_m: 30, Lh_m: 100, x_m: 100, z_m: 5 };
    const sot = kzt(base({ ...e, lado: "sotavento" }));
    const bar = kzt(base({ ...e, lado: "barlovento" }));
    expect(sot.K2).toBeCloseTo(1 - 100 / (4 * 100), 9);
    expect(bar.K2).toBeCloseTo(1 - 100 / (1.5 * 100), 9);
    expect(sot.K2).toBeGreaterThan(bar.K2);
  });
});

describe('recorte de los multiplicadores en cero', () => {
  it('K2 se recorta cuando |x| supera μ·Lh, y no se va negativo', () => {
    const r = kzt(base({ x_m: 500 }));       // μ·Lh = 150
    expect(r.K2).toBe(0);
    expect(r.kzt).toBe(1.0);                  // (1 + K1·0·K3)² = 1
    expect(r.avisos.some(a => /recorta/.test(a.texto))).toBe(true);
  });

  it('con el método de tabla, x/Lh > 4 da K2 = 0', () => {
    const r = kzt(base({ metodo: "tabla", lado: "sotavento", forma: "escarpa_2D", x_m: 500 }));
    expect(r.K2).toBe(0);
    expect(r.trazas.K2.nota).toMatch(/x\/Lh > 4/);
  });

  it('con el método de tabla, z/Lh > 2 da K3 = 0', () => {
    const r = kzt(base({ metodo: "tabla", z_m: 300 }));
    expect(r.K3).toBe(0);
    expect(r.trazas.K3.nota).toMatch(/z\/Lh > 2/);
  });

  it('los tres multiplicadores son siempre ≥ 0', () => {
    for (const x_m of [0, 50, 150, 400]) {
      for (const z_m of [0, 10, 100, 400]) {
        const r = kzt(base({ x_m, z_m }));
        expect(r.K1).toBeGreaterThanOrEqual(0);
        expect(r.K2).toBeGreaterThanOrEqual(0);
        expect(r.K3).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('sustitución por pendiente fuerte — nota 2', () => {
  // Con H/Lh > 0,5 se adopta 0,5 para K1 y se sustituye Lh por 2H en K2 y K3. Sin esto,
  // una loma muy escarpada daría un K_zt creciente sin límite.
  const empinado = { forma: "loma_2D", H_m: 40, Lh_m: 50, x_m: 20, z_m: 8 };

  it('con expresiones: K1 se topea y Lh pasa a 2H', () => {
    const r = kzt(base({ ...empinado }));
    expect(r.empinado).toBe(true);
    expect(r.HLh).toBeCloseTo(0.8, 9);
    expect(r.HLh_ef).toBe(HLH_TOPE);
    expect(r.Lh_ef_m).toBe(80);
    expect(r.K1).toBeCloseTo(par("loma_2D").k1.C * 0.5, 9);
    expect(r.K2).toBeCloseTo(1 - 20 / (1.5 * 80), 9);
    expect(r.K3).toBeCloseTo(Math.exp(-3 * 8 / 80), 9);
  });

  it('con tablas: se entra con las MISMAS relaciones efectivas', () => {
    // La sustitución es una regla sobre los datos de entrada, no sobre el método.
    const r = kzt(base({ ...empinado, metodo: "tabla" }));
    expect(r.Lh_ef_m).toBe(80);
    expect(r.xLh).toBeCloseTo(20 / 80, 9);
    expect(r.zLh).toBeCloseTo(8 / 80, 9);
    expect(r.K1).toBeCloseTo(TABLA_K1.loma_2D[TABLA_K1.hLh.indexOf(0.5)], 9);
  });

  it('el aviso de la nota 2 aparece sólo cuando corresponde', () => {
    expect(kzt(base({ ...empinado })).avisos.some(a => /nota 2/.test(a.ref))).toBe(true);
    expect(kzt(base()).avisos.some(a => /nota 2/.test(a.ref))).toBe(false);
  });
});

describe('techo de K_zt', () => {
  // Loma 2D, exposición D, H/Lh ≥ 0,5, en la cresta y al nivel del terreno: es el máximo
  // que el art. 1.8 puede producir. K1 = 1,55 × 0,5 = 0,775 → (1 + 0,775)² = 3,150625.
  const TECHO = Math.pow(1 + 1.55 * 0.5, 2);
  it('loma 2D en exposición D, x = 0 y z = 0 da ≈ 3,15', () => {
    const r = kzt(base({ forma: "loma_2D", exposicion: "D", H_m: 60, Lh_m: 100, x_m: 0, z_m: 0 }));
    expect(r.K1).toBeCloseTo(0.775, 9);
    expect(r.K2).toBe(1);
    expect(r.K3).toBe(1);
    expect(r.kzt).toBeCloseTo(TECHO, 9);
    expect(r.kzt).toBeCloseTo(3.1506, 3);
  });

  it('ninguna combinación admisible lo supera', () => {
    let max = 0;
    for (const forma of FORMAS) {
      for (const exposicion of ["B", "C", "D"]) {
        for (const lado of ["barlovento", "sotavento"]) {
          for (const H_m of [25, 60, 200]) {
            const r = kzt(base({ forma, exposicion, lado, H_m, Lh_m: 100, x_m: 0, z_m: 0 }));
            if (r.aplica) max = Math.max(max, r.kzt);
          }
        }
      }
    }
    expect(max).toBeLessThanOrEqual(TECHO + 1e-9);
    // …y alguna combinación LO ALCANZA: si no, el barrido no probó el techo.
    expect(max).toBeCloseTo(TECHO, 9);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MÉTODO, AVISOS Y TRAZABILIDAD
// ═══════════════════════════════════════════════════════════════════════════════

describe('los dos métodos del art. 1.8.2', () => {
  it('por defecto se usan las expresiones', () => {
    expect(kzt({ forma: "loma_2D", exposicion: "C", H_m: 30, Lh_m: 100, x_m: 0, z_m: 5,
      cond1_confirmada: true }).metodo).toBe("expresiones");
  });

  it('en exposición C los dos métodos dan prácticamente lo mismo', () => {
    // Es el contraste que justifica que el art. 1.8.2 los permita indistintamente.
    const e = { forma: "escarpa_2D", exposicion: "C", H_m: 30, Lh_m: 100, x_m: 50,
      lado: "sotavento", z_m: 10 };
    const ex = kzt(base({ ...e, metodo: "expresiones" }));
    const ta = kzt(base({ ...e, metodo: "tabla" }));
    expect(Math.abs(ex.kzt - ta.kzt) / ex.kzt).toBeLessThan(0.02);
  });

  it('en exposición D con tablas avisa que subestima K1', () => {
    const r = kzt(base({ exposicion: "D", metodo: "tabla", H_m: 40, Lh_m: 100, z_m: 5 }));
    const a = r.avisos.find(x => /subestima K1/.test(x.texto));
    expect(a).toBeDefined();
    expect(a.tono).toBe("aviso");
    // el porcentaje informado es real, entre 6,5 % y 10,5 % según la forma
    const pct = parseFloat(a.texto.match(/en ([\d,]+) %/)[1].replace(",", "."));
    expect(pct).toBeGreaterThan(6);
    expect(pct).toBeLessThan(11);
  });

  it('en exposición B o C con tablas NO aparece ese aviso', () => {
    for (const exposicion of ["B", "C"]) {
      const r = kzt(base({ exposicion, metodo: "tabla", H_m: 40, Lh_m: 100, z_m: 5 }));
      expect(r.avisos.some(x => /subestima K1/.test(x.texto)), exposicion).toBe(false);
    }
  });
});

describe('avisos que el art. 1.8 exige tener presentes siempre', () => {
  it('terreno complejo, aceleración vertical y dirección de máxima pendiente', () => {
    const r = kzt(base({ z_m: 5 }));
    for (const patron of [/montañoso/, /ACELERACIÓN VERTICAL/, /MÁXIMA PENDIENTE/]) {
      expect(r.avisos.some(a => patron.test(a.texto)), String(patron)).toBe(true);
    }
    expect(AVISOS_FIJOS).toHaveLength(3);
  });

  it('a barlovento más allá de Lh, avisa que la condición 1 es dudosa', () => {
    const r = kzt(base({ lado: "barlovento", x_m: 120, Lh_m: 100, z_m: 5 }));
    expect(r.avisos.some(a => /mitad superior/.test(a.texto))).toBe(true);
  });
});

describe('trazabilidad de la interpolación', () => {
  it('devuelve los dos puntos de tabla entre los que interpoló', () => {
    const r = interpolarTabla(0.275, TABLA_K1.hLh, TABLA_K1.loma_2D);
    expect(r.interpolado).toBe(true);
    expect(r.puntos).toEqual([{ x: 0.25, y: 0.36 }, { x: 0.30, y: 0.43 }]);
    expect(r.valor).toBeCloseTo(0.395, 9);
  });

  it('en un punto de la tabla no dice que interpoló', () => {
    const r = interpolarTabla(0.30, TABLA_K1.hLh, TABLA_K1.loma_2D);
    expect(r.interpolado).toBe(false);
    expect(r.valor).toBe(0.43);
    expect(r.puntos).toEqual([{ x: 0.30, y: 0.43 }]);
  });

  it('en los bordes congela, sin extrapolar, y lo declara', () => {
    const bajo = interpolarTabla(0.05, TABLA_K1.hLh, TABLA_K1.loma_2D);
    const alto = interpolarTabla(9, TABLA_K1.hLh, TABLA_K1.loma_2D);
    expect(bajo.valor).toBe(0.29);
    expect(alto.valor).toBe(0.72);
    expect(bajo.nota).toMatch(/por debajo/);
    expect(alto.nota).toMatch(/por encima/);
  });

  it('el resultado del método de tabla trae la traza de los tres multiplicadores', () => {
    const r = kzt(base({ metodo: "tabla", H_m: 27.5, Lh_m: 100, x_m: 37, z_m: 13 }));
    for (const k of ["K1", "K2", "K3"]) {
      expect(r.trazas[k].interpolado, k).toBe(true);
      expect(r.trazas[k].puntos, k).toHaveLength(2);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REGRESIÓN CONTRA LOS CASOS DEL PROYECTISTA
// ═══════════════════════════════════════════════════════════════════════════════

correrCasos({ describe, it, expect }, 'kzt', (entrada) => {
  const r = kzt(entrada);
  return { K1: r.K1, K2: r.K2, K3: r.K3, Kzt: r.kzt };
});
