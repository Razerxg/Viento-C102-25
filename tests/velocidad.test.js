// ORIGEN DE V — art. 1.5.
//
// V es el dato de entrada de todo el cálculo y la presión va con V², así que una V
// equivocada no se nota: da un resultado plausible. Lo que estos tests protegen es que la
// app no deje pasar en silencio una V POR DEBAJO de la del mapa, que es el único caso en
// que el reglamento pone condiciones.
import { describe, it, expect } from 'vitest';
import { resolverV, interpolarIsotacas, desdeV50, FUNDAMENTOS_V, ORIGENES_V,
  RANGO_V, CONDICIONES_1_5_3 } from '../src/engine/velocidad.js';
import { CIUDADES, velocidadDe, factorV } from '../src/constants/velocidades.js';
import { INICIAL } from '../src/context/ProyectoContext.jsx';

describe('interpolación entre isotacas', () => {
  // Los tres puntos que definen una interpolación lineal.
  it('en el extremo de la isotaca 1, da V₁', () => {
    expect(interpolarIsotacas({ V1: 50, V2: 60, d1: 0, d2: 7 }).V).toBeCloseTo(50, 12);
  });
  it('en el extremo de la isotaca 2, da V₂', () => {
    expect(interpolarIsotacas({ V1: 50, V2: 60, d1: 7, d2: 0 }).V).toBeCloseTo(60, 12);
  });
  it('en el punto medio, da el promedio', () => {
    expect(interpolarIsotacas({ V1: 50, V2: 60, d1: 3, d2: 3 }).V).toBeCloseTo(55, 12);
  });

  // Sólo importa la PROPORCIÓN: es lo que permite medir sobre el mapa impreso, en
  // milímetros, sin georreferenciar nada.
  it('sólo importa la proporción entre las distancias', () => {
    const a = interpolarIsotacas({ V1: 42, V2: 63, d1: 12, d2: 36 }).V;
    for (const k of [0.001, 1000, 2.5]) {
      expect(interpolarIsotacas({ V1: 42, V2: 63, d1: 12 * k, d2: 36 * k }).V,
        `k=${k}`).toBeCloseTo(a, 9);
    }
    expect(a).toBeCloseTo(42 + 21 * 0.25, 9);
  });

  it('acepta coma decimal, como cualquier campo', () => {
    expect(interpolarIsotacas({ V1: "50,5", V2: "60,5", d1: "1", d2: "1" }).V)
      .toBeCloseTo(55.5, 9);
  });

  it('sin datos no inventa un valor', () => {
    expect(interpolarIsotacas({ V1: "", V2: 60, d1: 1, d2: 1 }).V).toBe(null);
    expect(interpolarIsotacas({ V1: 50, V2: 60, d1: 0, d2: 0 }).V).toBe(null);
    expect(interpolarIsotacas({ V1: 50, V2: 60, d1: 0, d2: 0 }).error).toMatch(/distancias/);
  });

  it('muestra la cuenta, que es lo único que la hace revisable', () => {
    expect(interpolarIsotacas({ V1: 50, V2: 60, d1: 3, d2: 1 }).cuenta)
      .toBe("V = 50,00 + (60,00 − 50,00)·3,00/(3,00 + 1,00)");
  });
});

describe('conversión desde el V50 del 102-2005', () => {
  // ── EL CONTROL FUERTE ──────────────────────────────────────────────────────────
  // La Figura 1.5-1D se construyó con esta misma expresión, así que convertir el V50 de
  // CUALQUIER ciudad tabulada tiene que devolver exactamente su fila. Es un cruce entre
  // dos cosas independientes: la tabla transcripta y la fórmula del comentario.
  it('reproduce las tres columnas de las 29 ciudades', () => {
    for (const [nombre, v50] of CIUDADES) {
      for (const cat of ["I", "II", "III", "IV"]) {
        expect(desdeV50({ V50: v50, riesgo: cat }).V, `${nombre} cat ${cat}`)
          .toBeCloseTo(velocidadDe(nombre, cat), 1);
      }
    }
  });

  it('Neuquén: 48 → 58,8 en categoría II y 63,0 en III-IV', () => {
    expect(desdeV50({ V50: 48, riesgo: "II" }).V).toBeCloseTo(58.8, 1);
    expect(desdeV50({ V50: 48, riesgo: "III" }).V).toBeCloseTo(63.0, 1);
    expect(desdeV50({ V50: 48, riesgo: "IV" }).V).toBeCloseTo(63.0, 1);
    expect(desdeV50({ V50: 48, riesgo: "I" }).V).toBeCloseTo(54.8, 1);
  });

  it('es V50·√(1,5·I), y el factor sale de `factorV`', () => {
    for (const cat of ["I", "II", "III", "IV"]) {
      expect(desdeV50({ V50: 55, riesgo: cat }).V).toBeCloseTo(55 * factorV(cat), 12);
    }
  });

  it('sin V50 no inventa nada', () => {
    expect(desdeV50({ V50: "", riesgo: "II" }).V).toBe(null);
    expect(desdeV50({ V50: 48, riesgo: "Z" }).V).toBe(null);
  });
});

describe('la regla de avisos según el fundamento', () => {
  const tonos = (r) => r.avisos.map(a => a.tono);
  const enNeuquen = (V, fundamento) => resolverV({
    origen: "manual", ciudad: "Neuquén", riesgo: "II",
    manual: { V, fundamento, documento: "ESP-001 rev. B" },
  });

  // La referencia: Neuquén categoría II son 58,8 m/s.
  it('V MAYOR que la del mapa: permitido con cualquier fundamento (art. 1.5.1)', () => {
    for (const f of FUNDAMENTOS_V) {
      const r = enNeuquen(70, f.id);
      expect(tonos(r), f.id).not.toContain("error");
      expect(r.avisos.some(a => a.tono === "info" && /supera/.test(a.texto)), f.id).toBe(true);
      expect(r.dif, f.id).toBeGreaterThan(0);
    }
  });

  it('V MENOR sin el art. 1.5.3: error', () => {
    for (const f of FUNDAMENTOS_V.filter(x => !x.permiteMenor)) {
      const r = enNeuquen(48, f.id);
      expect(tonos(r), f.id).toContain("error");
      expect(r.ok, f.id).toBe(false);
    }
  });

  // El 1.5.3 es el único que habilita apartarse hacia abajo, y cuando se usa hay que
  // poder mostrar las cinco condiciones: se listan enteras.
  it('V MENOR con el art. 1.5.3: aviso, no error, con las condiciones listadas', () => {
    const r = enNeuquen(48, "art1_5_3");
    expect(tonos(r)).not.toContain("error");
    expect(tonos(r)).toContain("aviso");
    const a = r.avisos.find(x => x.ref === "Art. 1.5.3");
    expect(a.lista).toEqual(CONDICIONES_1_5_3);
    expect(a.lista.length).toBe(5);
    expect(a.lista.join(" ")).toMatch(/error de muestreo/);
    expect(a.lista.join(" ")).toMatch(/3 segundos a 10 m/);
  });

  it('sin fundamento declarado: error', () => {
    expect(tonos(enNeuquen(70, ""))).toContain("error");
  });

  it('fundamento del comitente sin documento: aviso de trazabilidad', () => {
    const r = resolverV({ origen: "manual", ciudad: "Neuquén", riesgo: "II",
      manual: { V: 70, fundamento: "comitente", documento: "" } });
    expect(r.avisos.some(a => /documento/.test(a.texto))).toBe(true);
  });

  it('el aviso fijo de qué ES V aparece siempre en la opción manual', () => {
    const r = enNeuquen(70, "art1_5_1");
    const a = r.avisos.find(x => /RÁFAGA DE 3 SEGUNDOS/.test(x.texto));
    expect(a.tono).toBe("info");
    expect(a.texto).toMatch(/33 %/);
    expect(a.texto).toMatch(/58,8/);
  });

  // Y el ejemplo del aviso es cierto: 48 contra 58,8 da un 33 % menos de presión.
  it('el 33 % del ejemplo se verifica', () => {
    expect(1 - (48 / 58.8) ** 2).toBeCloseTo(0.333, 2);
  });

  it('sitio fuera de la tabla: avisa que no se puede comparar', () => {
    const r = resolverV({ origen: "manual", ciudad: "", riesgo: "II",
      manual: { V: 55, fundamento: "art1_5_1" } });
    expect(r.referencia).toBe(null);
    expect(r.avisos.some(a => /no se puede verificar/.test(a.texto))).toBe(true);
  });

  it('fuera del rango 30–100 m/s es un error de entrada', () => {
    for (const V of [RANGO_V.min - 1, RANGO_V.max + 1, 5, 300]) {
      const r = resolverV({ origen: "manual", ciudad: "", riesgo: "II",
        manual: { V, fundamento: "art1_5_1" } });
      expect(r.fueraDeRango, String(V)).toBe(true);
      expect(r.avisos.some(a => a.tono === "error"), String(V)).toBe(true);
    }
    for (const V of [RANGO_V.min, 55, RANGO_V.max]) {
      expect(resolverV({ origen: "manual", ciudad: "", riesgo: "II",
        manual: { V, fundamento: "art1_5_1" } }).fueraDeRango, String(V)).toBe(false);
    }
  });
});

describe('las cuatro vías dan V', () => {
  it('tabla', () => {
    expect(resolverV({ origen: "tabla", ciudad: "Neuquén", riesgo: "II" }).V).toBe(58.8);
  });
  it('interpolado', () => {
    expect(resolverV({ origen: "interpolado", ciudad: "", riesgo: "II",
      interp: { V1: 50, V2: 60, d1: 1, d2: 1 } }).V).toBeCloseTo(55, 9);
  });
  it('manual', () => {
    expect(resolverV({ origen: "manual", ciudad: "", riesgo: "II",
      manual: { V: 62, fundamento: "art1_5_1" } }).V).toBe(62);
  });
  it('conversión', () => {
    expect(resolverV({ origen: "v50", ciudad: "Neuquén", riesgo: "II",
      v50: { V50: 48 } }).V).toBeCloseTo(58.8, 1);
  });

  it('tabla sin ciudad: error, y no un 0 que parezca una velocidad', () => {
    const r = resolverV({ origen: "tabla", ciudad: "", riesgo: "II" });
    expect(r.V).toBe(null);
    expect(r.avisos.some(a => a.tono === "error")).toBe(true);
  });

  it('cada origen trae su detalle para la traza', () => {
    const casos = [
      ["tabla", { ciudad: "Neuquén" }],
      ["interpolado", { interp: { V1: 50, V2: 60, d1: 1, d2: 1 } }],
      ["manual", { manual: { V: 62, fundamento: "art1_5_1" } }],
      ["v50", { v50: { V50: 48 } }],
    ];
    for (const [origen, extra] of casos) {
      const r = resolverV({ origen, ciudad: "", riesgo: "II", ...extra });
      expect(r.detalleOrigen, origen).toBeTruthy();
    }
    expect(ORIGENES_V.map(o => o.id)).toEqual(["tabla", "interpolado", "manual", "v50"]);
  });
});

describe('migración de proyectos guardados', () => {
  // Un proyecto guardado antes de este cambio no trae `origenV`. Tiene que quedar en
  // «tabla», que es exactamente lo que estaba usando: si quedara en otra vía, al abrirlo
  // cambiaría la velocidad y con ella todo el cálculo.
  it('el estado inicial arranca en «tabla»', () => {
    expect(INICIAL.origenV).toBe("tabla");
  });

  it('un proyecto sin los campos nuevos se resuelve por tabla', () => {
    const viejo = { ciudad: "Neuquén", riesgo: "II", exposicion: "B" };
    const fusionado = { ...INICIAL, ...viejo };
    expect(fusionado.origenV).toBe("tabla");
    expect(resolverV({ origen: fusionado.origenV, ciudad: fusionado.ciudad,
      riesgo: fusionado.riesgo }).V).toBe(velocidadDe("Neuquén", "II"));
  });

  it('los sub-objetos nuevos existen y están vacíos', () => {
    for (const k of ["vInterp", "vManual", "vConv"]) {
      expect(INICIAL[k], k).toBeTruthy();
      expect(Object.values(INICIAL[k]).every(v => v === ""), k).toBe(true);
    }
  });
});
