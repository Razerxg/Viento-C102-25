// LA CIUDAD TIENE QUE SER COHERENTE CON EL ORIGEN DE V.
//
// ⚠ ANTES `resolverV()` Y `regionDetritus()` USABAN `d.ciudad` CUALQUIERA FUERA EL ORIGEN.
// Interpolando entre isotacas para un sitio que no está en la tabla, si en el desplegable
// había quedado «Neuquén», la comparación contra el mapa y la región con detritus salían
// de Neuquén. Los dos son números plausibles y ninguno de los dos avisa.
import { describe, it, expect } from 'vitest';
import { resolverV, vDeFigura, aFiguraA, aFiguraB } from '../src/engine/velocidad.js';
import { regionDetritus, UMBRAL_DETRITUS } from '../src/engine/cerramiento.js';
import { velocidadDe, I_RIESGO, CIUDADES } from '../src/constants/velocidades.js';

const interp = { V1: "60", V2: "70", d1: "10", d2: "30" };

describe('la proporción entre mapas — C 1.5-6.1', () => {
  // Los cuatro mapas son el MISMO campo con distinto período de retorno, y la relación es
  // V ∝ √I. Se comprueba contra la propia tabla de ciudades, que es una verificación
  // cruzada y no una cuenta escrita dos veces.
  it('reproduce la relación entre columnas de la tabla de ciudades', () => {
    // ⚠ LA TOLERANCIA ES RELATIVA Y NO ABSOLUTA. La tabla está redondeada a 0,1 m/s, así
    // que la relación no puede cerrar mejor que ese redondeo: Bahía Blanca da
    // 72,2/√1,15 = 67,33 contra los 67,4 tabulados, 0,11 % de diferencia. Exigir ±0,05
    // sería exigirle a la tabla una precisión que no tiene.
    const cerca = (a, b) => expect(Math.abs(a - b) / b).toBeLessThan(0.003);
    for (const [ciudad] of CIUDADES) {
      const vI = Number(velocidadDe(ciudad, "I"));
      const vII = Number(velocidadDe(ciudad, "II"));
      const vIII = Number(velocidadDe(ciudad, "III"));
      cerca(aFiguraA(vIII, "III"), vII);
      cerca(aFiguraB(vII), vIII);
      cerca(aFiguraA(vI, "I"), vII);
    }
    // Y las 29 ciudades se recorrieron de verdad.
    expect(CIUDADES.length).toBe(29);
  });

  it('la categoría II no se mueve', () => {
    expect(aFiguraA(55.1, "II")).toBeCloseTo(55.1, 12);
  });

  it('una categoría desconocida no inventa un número', () => {
    expect(aFiguraA(55, "Z")).toBe(null);
  });
});

describe('V de la figura que decide la región con detritus', () => {
  // v50 = 48 → V_A = 48·√1,5. Es EXACTO, no una conversión: la Figura 1.5-1A es el mapa
  // de categoría II y para categoría II vale I = 1,00, así que la misma expresión
  // V = v50·√(1,5·I) da directamente la V de esa figura.
  it('desde v50 es exacto por la misma expresión', () => {
    const r = vDeFigura({ figura: "A", origen: "v50", v50: "48" });
    expect(r.exacta).toBe(true);
    expect(r.V).toBeCloseTo(48 * Math.sqrt(1.5), 10);
    expect(r.V).toBeCloseTo(58.79, 2);
    expect(r.cuenta).toContain("√1,5");
  });

  it('desde v50 a la Figura 1.5-1B agrega el √1,15', () => {
    const r = vDeFigura({ figura: "B", origen: "v50", v50: "48" });
    expect(r.V).toBeCloseTo(48 * Math.sqrt(1.5) * Math.sqrt(1.15), 10);
    expect(r.cuenta).toContain("V_B");
  });

  // Categoría III interpolada con 63,0 m/s: la condición NO se evalúa con esos 63,0 sino
  // con la Figura 1.5-1A, y ahí da 63,0/√1,15 = 58,75 m/s, por debajo del umbral.
  it('una V interpolada de categoría III se lleva a la Figura 1.5-1A', () => {
    const r = vDeFigura({ figura: "A", origen: "interpolado", V: 63.0, riesgo: "III" });
    expect(r.exacta).toBe(false);
    expect(r.V).toBeCloseTo(63.0 * Math.sqrt(1 / 1.15), 10);
    expect(r.V).toBeCloseTo(58.75, 2);
    expect(r.V).toBeLessThan(UMBRAL_DETRITUS.V);
    expect(r.ref).toContain("C 1.5-6.1");
  });

  it('los orígenes que no se pueden convertir devuelven null', () => {
    expect(vDeFigura({ figura: "A", origen: "tabla", V: 60, riesgo: "II" })).toBe(null);
    expect(vDeFigura({ figura: "A", origen: "manual", V: 60, riesgo: "II" })).toBe(null);
    expect(vDeFigura({ figura: "A", origen: "v50", v50: "" })).toBe(null);
    expect(vDeFigura({ figura: "A", origen: "interpolado", V: null, riesgo: "II" })).toBe(null);
  });
});

describe('resolverV y la ciudad', () => {
  it('con origen tabla, la ciudad es la referencia, como siempre', () => {
    const r = resolverV({ origen: "tabla", ciudad: "Neuquén", riesgo: "II" });
    expect(r.ciudadRef).toBe("Neuquén");
    expect(r.referencia).toBe(velocidadDe("Neuquén", "II"));
    expect(r.V).toBe(r.referencia);
  });

  // ⚠ ES EL BUG. La ciudad quedaba seleccionada del paso anterior y se usaba igual.
  it('con origen interpolado NO se usa la ciudad, aunque esté elegida', () => {
    const r = resolverV({ origen: "interpolado", ciudad: "Neuquén", riesgo: "II", interp });
    expect(r.ciudadRef).toBe(null);
    expect(r.referencia).toBe(null);
    expect(r.dif).toBe(null);
    expect(r.usaCiudad).toBe(false);
    // Y la V es la interpolada, no la de Neuquén.
    expect(r.V).not.toBe(velocidadDe("Neuquén", "II"));
    expect(r.V).toBeGreaterThan(60);
    expect(r.V).toBeLessThan(70);
  });

  it('con origen interpolado no aparece el aviso de «sin V de referencia»', () => {
    // El sitio está fuera de la tabla POR DEFINICIÓN: pedir una lectura del mapa para
    // contrastar sería pedir dos veces lo mismo.
    const r = resolverV({ origen: "interpolado", ciudad: "", riesgo: "II", interp });
    expect(r.avisos.some(a => a.texto.includes("Sin V de referencia"))).toBe(false);
  });

  it('con origen manual y «sin referencia», no hay ciudad', () => {
    const r = resolverV({ origen: "manual", ciudad: "", riesgo: "II",
      manual: { V: "62", fundamento: "art1_5_1" } });
    expect(r.ciudadRef).toBe(null);
    expect(r.referencia).toBe(null);
  });

  it('con origen manual y ciudad de referencia, sí se compara', () => {
    const r = resolverV({ origen: "manual", ciudad: "Buenos Aires", riesgo: "II",
      manual: { V: "62", fundamento: "art1_5_1" } });
    expect(r.ciudadRef).toBe("Buenos Aires");
    expect(r.referencia).toBe(velocidadDe("Buenos Aires", "II"));
    expect(r.dif).toBeGreaterThan(0);
  });

  it('con origen v50 el v50 viaja, para poder convertirlo después', () => {
    const r = resolverV({ origen: "v50", ciudad: "", riesgo: "II", v50: { V50: "48" } });
    expect(r.v50).toBe(48);
    expect(r.V).toBeCloseTo(48 * Math.sqrt(1.5 * I_RIESGO.II), 10);
  });
});

describe('región con detritus, sin ciudad', () => {
  const base = { riesgo: "II", esSalud: false, distanciaCosta: "", declarada: false };

  it('desde v50 se decide con la V convertida, no por declaración', () => {
    const r = regionDetritus({ ...base, ciudad: null, origen: "v50", v50: "48",
      V: 48 * Math.sqrt(1.5) });
    expect(r.porDeclaracion).toBe(false);
    expect(r.fuente).toBe("convertida");
    expect(r.V).toBeCloseTo(58.79, 2);
    expect(r.esRegion).toBe(false);
    expect(r.motivo).toContain("√1,5");
  });

  // El caso que pidió el proyectista: categoría III, V interpolada de 63,0 m/s.
  it('categoría III interpolada con 63,0 m/s NO es región con detritus', () => {
    const r = regionDetritus({ ...base, riesgo: "III", ciudad: null,
      origen: "interpolado", V: 63.0 });
    expect(r.figura).toBe("A");          // cat. III que no es salud va por la 1.5-1A
    expect(r.V).toBeCloseTo(58.75, 2);
    expect(r.esRegion).toBe(false);
    expect(r.ref).toContain("C 1.5-6.1");
    expect(r.conversion.ref).toContain("C 1.5-6.1");
  });

  it('la misma V sin convertir SÍ habría dado región con detritus', () => {
    // Es la medida del error que se evitó: 63,0 ≥ 63 activa la condición.
    expect(63.0).toBeGreaterThanOrEqual(UMBRAL_DETRITUS.V);
    expect(58.75).toBeLessThan(UMBRAL_DETRITUS.V);
  });

  it('una instalación de salud de categoría III va por la Figura 1.5-1B', () => {
    const r = regionDetritus({ ...base, riesgo: "III", esSalud: true, ciudad: null,
      origen: "interpolado", V: 63.0 });
    expect(r.figura).toBe("B");
    // V_A = 63,0/√1,15 y de vuelta a B: da los 63,0 originales, porque la categoría del
    // edificio y la de la figura coinciden.
    expect(r.V).toBeCloseTo(63.0, 6);
    expect(r.esRegion).toBe(true);
  });

  it('con origen manual y sin referencia, sigue siendo una declaración', () => {
    const r = regionDetritus({ ...base, ciudad: null, origen: "manual", V: 70 });
    expect(r.porDeclaracion).toBe(true);
    expect(r.fuente).toBe("declaracion");
    expect(r.esRegion).toBe(false);
    expect(regionDetritus({ ...base, ciudad: null, origen: "manual", V: 70,
      declarada: true }).esRegion).toBe(true);
  });
});

describe('región con detritus, con ciudad', () => {
  it('la tabla gobierna y no se convierte nada', () => {
    const r = regionDetritus({ ciudad: "Buenos Aires", riesgo: "II", esSalud: false,
      distanciaCosta: "", declarada: false, origen: "tabla", V: 55.1 });
    expect(r.fuente).toBe("tabla");
    expect(r.conversion).toBe(null);
    expect(r.V).toBe(velocidadDe("Buenos Aires", "II"));
  });

  // ⚠ ES EL OTRO LADO DEL MISMO BUG. Con la ciudad puesta en `null` por `resolverV`, ya
  // no hay forma de que una ciudad del paso anterior se cuele en esta cuenta.
  it('interpolando, la ciudad seleccionada no llega hasta acá', () => {
    const vel = resolverV({ origen: "interpolado", ciudad: "Comodoro Rivadavia",
      riesgo: "II", interp: { V1: "60", V2: "70", d1: "10", d2: "30" } });
    const r = regionDetritus({ ciudad: vel.ciudadRef, riesgo: "II", esSalud: false,
      distanciaCosta: "", declarada: false, origen: "interpolado", V: vel.V });
    expect(r.fuente).toBe("convertida");
    expect(r.V).toBeCloseTo(vel.V, 10);   // categoría II: no se mueve
    // Comodoro Rivadavia es de las más ventosas de la tabla: con su V, la condición se
    // activaría. Con la del sitio interpolado, no.
    expect(Number(velocidadDe("Comodoro Rivadavia", "II")))
      .toBeGreaterThanOrEqual(UMBRAL_DETRITUS.V);
    expect(r.esRegion).toBe(false);
  });
});
