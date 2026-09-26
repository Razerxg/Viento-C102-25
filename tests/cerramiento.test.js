// CLASIFICACIÓN DE CERRAMIENTO A PARTIR DE LAS ABERTURAS — arts. 1.2, 1.10 y 1.11.
//
// Las cuatro clasificaciones salen DIRECTO de las desigualdades del art. 1.2, así que los
// tests las controlan contra el texto y no contra el motor. Lo que más importa verificar
// es la SENSIBILIDAD: entre cerrado y parcialmente cerrado hay un factor de tres en la
// presión interna, y el salto lo produce una sola puerta.
import { describe, it, expect } from 'vitest';
import { normalizarGeo } from '../src/engine/edificio.js';
import { clasificar, regionDetritus, superficiesEnvolvente, areaCubierta,
  volumenInterno, condicionesPared, cuentaComoAbertura, areaAbertura,
  UMBRAL_DETRITUS } from '../src/engine/cerramiento.js';
import { fachada } from '../src/engine/fachadas.js';
import { ri, gcpiDe } from '../src/constants/presionInterna.js';
import { velocidadDe } from '../src/constants/velocidades.js';

// El galpón del proyectista: 20 × 30, alero 6, dos aguas a 15°, cumbrera paralela al lado
// de 30 m. Con b = 30 sobre Y, la cumbrera va según Y: las paredes LARGAS son las de
// normal X —30 m de ancho, rectángulos— y los HASTIALES las de normal Y.
const GALPON = normalizarGeo({ a: 20, b: 30, hAlero: 6, theta: 15,
  tipo: "dos_aguas", cumbrera: "Y" });
const SIN_DETRITUS = { esRegion: false };
const puerta = (superficie) => ({ superficie, tipo: "operable",
  ancho: 0.9, alto: 2.1, cantidad: 1, abiertaEnDiseno: true });
const clas = (aberturas, extra = {}) => clasificar({ geo: GALPON, aberturas,
  detritus: SIN_DETRITUS, riesgo: "II", ...extra });

describe('la envolvente y sus áreas', () => {
  it('las paredes largas son rectángulos y las cortas hastiales', () => {
    const s = Object.fromEntries(superficiesEnvolvente(GALPON).map(x => [x.id, x]));
    expect(s["X+"].forma).toBe("rectangulo");
    expect(s["X+"].Ag).toBeCloseTo(30 * 6, 9);
    expect(s["Y+"].forma).toBe("hastial");
    expect(s["Y+"].Ag).toBeCloseTo(fachada(GALPON, "Y", 1).area, 12);
  });

  // ── EL ÁREA DE CUBIERTA ES LA INCLINADA, Y SALE DE LA PLANTA SOBRE EL COSENO ───
  // Con una sola pendiente, las proyecciones en planta de los faldones cubren la planta
  // exactamente y ninguna se superpone. Este test lo comprueba sumando los cuatro
  // faldones de un limatesa por separado, que es el caso donde no es evidente.
  it('en cuatro aguas, los dos trapecios y los dos triángulos suman a·b/cosθ', () => {
    for (const [a, b, th] of [[30, 20, 25], [40, 12, 18], [25, 25, 30]]) {
      const g = normalizarGeo({ a, b, hAlero: 6, theta: th, tipo: "cuatro_aguas" });
      const s = Math.min(a, b), L = Math.max(a, b);
      const Lc = Math.abs(a - b);                     // largo de cumbrera
      const sec = 1 / Math.cos(th * Math.PI / 180);
      // Dos faldones trapeciales: bases L y Lc, altura en planta s/2. Dos triángulos de
      // punta: base s, altura en planta s/2. Todo en planta, y después al inclinado.
      const trapecios = 2 * ((L + Lc) / 2) * (s / 2);
      const triangulos = 2 * (s * (s / 2) / 2);
      expect(trapecios + triangulos, `${a}×${b}`).toBeCloseTo(a * b, 9);
      expect(areaCubierta(g), `${a}×${b}`).toBeCloseTo((trapecios + triangulos) * sec, 9);
    }
  });

  it('en cubierta plana el área es la planta', () => {
    const g = normalizarGeo({ a: 20, b: 30, hAlero: 6, theta: 0, tipo: "plana" });
    expect(areaCubierta(g)).toBeCloseTo(600, 9);
  });
});

describe('volumen interno para R_i', () => {
  // ⚠ NO ES PLANTA × ALTURA MEDIA. En cuatro aguas eso sobreestima, y un V_i mayor da un
  // R_i MENOR: menos presión interna de la que corresponde, o sea del lado inseguro.
  it('cuatro aguas: prisma más pirámide truncada, contra la suma por partes', () => {
    for (const [a, b, th] of [[30, 20, 25], [40, 12, 18]]) {
      const g = normalizarGeo({ a, b, hAlero: 6, theta: th, tipo: "cuatro_aguas" });
      const r = g.hCumbre - g.hAlero, s = Math.min(a, b), L = Math.max(a, b);
      // Volumen del techo: prisma triangular sobre la cumbrera (largo |a−b|) más dos
      // medias pirámides en las puntas, que juntas hacen una pirámide de base s × s.
      const prismaTecho = Math.abs(a - b) * (s * r / 2);
      const piramide = (s * s) * r / 3;
      expect(volumenInterno(g), `${a}×${b}`)
        .toBeCloseTo(a * b * 6 + prismaTecho + piramide, 6);
      expect(L).toBeGreaterThan(0);
    }
  });

  it('con a = b es el prisma más la pirámide completa', () => {
    const g = normalizarGeo({ a: 25, b: 25, hAlero: 6, theta: 30, tipo: "cuatro_aguas" });
    const r = g.hCumbre - g.hAlero;
    expect(volumenInterno(g)).toBeCloseTo(25 * 25 * 6 + 25 * 25 * r / 3, 6);
  });

  it('dos aguas y vertiente única: planta por la altura media del volumen', () => {
    for (const tipo of ["dos_aguas", "vertiente_unica"]) {
      const g = normalizarGeo({ a: 20, b: 30, hAlero: 6, theta: 15, tipo,
        cumbrera: "Y", pendienteHacia: "+X" });
      expect(volumenInterno(g), tipo)
        .toBeCloseTo(600 * (6 + (g.hCumbre - g.hAlero) / 2), 6);
    }
  });

  // Y que el criterio importe: el volumen exacto de un limatesa es MENOR que planta ×
  // altura media, así que usar el atajo daría un R_i menor.
  it('en cuatro aguas es MENOR que planta × altura media', () => {
    const g = normalizarGeo({ a: 30, b: 20, hAlero: 6, theta: 25, tipo: "cuatro_aguas" });
    expect(volumenInterno(g)).toBeLessThan(g.a * g.b * g.h);
    expect(ri(volumenInterno(g), 10)).toBeGreaterThan(ri(g.a * g.b * g.h, 10));
  });
});

describe('el galpón de control', () => {
  it('sin aberturas → CERRADO', () => {
    const r = clas([]);
    expect(r.clasificacion).toBe("cerrado");
    expect(r.gcpi).toBe(0.18);
    expect(r.Ri).toBe(null);
  });

  // LA SENSIBILIDAD. Una sola puerta que pueda quedar abierta lo vuelve parcialmente
  // cerrado, y ahí GC_pi pasa de ±0,18 a ±0,55: un factor de tres.
  it('una puerta de 0,9 × 2,1 en una pared larga → PARCIALMENTE CERRADO, gobierna esa pared', () => {
    const r = clas([puerta("X+")]);
    expect(r.clasificacion).toBe("parc_cerrado");
    expect(r.gobierna).toBe("X+");
    expect(r.gcpi).toBe(0.55);
    expect(r.gcpi / gcpiDe("cerrado")).toBeCloseTo(3.06, 1);
  });

  // Y la segunda puerta lo devuelve: equilibra la presión, así que ya no hay una pared
  // con A_o > 1,10·A_oi.
  it('una puerta en CADA pared larga → PARCIALMENTE ABIERTO', () => {
    const r = clas([puerta("X+"), puerta("X-")]);
    expect(r.clasificacion).toBe("parc_abierto");
    expect(r.gcpi).toBe(0.18);
  });

  it('portón de 5 × 5 en un hastial más las dos puertas → PARCIALMENTE CERRADO, gobierna el hastial', () => {
    const r = clas([puerta("X+"), puerta("X-"),
      { superficie: "Y+", tipo: "operable", ancho: 5, alto: 5, cantidad: 1, abiertaEnDiseno: true }]);
    expect(r.clasificacion).toBe("parc_cerrado");
    expect(r.gobierna).toBe("Y+");
  });

  it('parcialmente cerrado trae R_i y el volumen con el que se calculó', () => {
    const r = clas([puerta("X+")]);
    expect(r.Vi).toBeCloseTo(volumenInterno(GALPON), 9);
    expect(r.Ri).toBeCloseTo(ri(r.Vi, r.AogTotal), 12);
    expect(r.Ri).toBeGreaterThan(0.5);
    expect(r.Ri).toBeLessThanOrEqual(1);
  });
});

describe('la prioridad del art. 1.10.5', () => {
  // Las dos definiciones no son excluyentes. Sin la regla, dos proyectistas sacarían
  // GC_pi de 0,00 y de 0,55 para el mismo edificio.
  // ⚠ EL SOLAPAMIENTO NO SE DA EN CUALQUIER EDIFICIO, Y CUESTA CONSTRUIRLO.
  //
  // La condición (1) de parcialmente cerrado pide que UNA pared tenga más aberturas que
  // 1,10 veces TODO el resto de la envolvente; «abierto» pide que las otras tres estén al
  // 80 % o más, y entre ellas está la pared OPUESTA, de igual área. En un galpón normal
  // las dos cosas son incompatibles: la opuesta sola ya aporta más que el tope de la
  // evaluada. Y la condición (2) pide además A_oi/A_gi ≤ 0,20, o sea que el resto esté
  // mayormente CERRADO, que es lo contrario de abierto.
  //
  // El solapamiento aparece sólo en un edificio muy alargado y de techo grande: ahí la
  // pared larga supera a las otras tres, y el techo —cerrado— diluye la relación
  // A_oi/A_gi por debajo de 0,20. Con 200 × 10 y alero 3 m se da exacto: 0,1985.
  //
  // Que haga falta buscarlo tanto no le quita valor a la regla: es justamente el caso en
  // que dos proyectistas sacarían GC_pi de 0,00 y de 0,55 para el mismo edificio.
  it('todas las paredes con ≥ 80 % de aberturas y además condición de parcialmente cerrado → ABIERTO', () => {
    const g = normalizarGeo({ a: 200, b: 10, hAlero: 3, theta: 0, tipo: "plana" });
    const sup = Object.fromEntries(superficiesEnvolvente(g).map(s => [s.id, s.Ag]));
    const aberturas = ["Y+", "Y-", "X+", "X-"].map(id => ({
      superficie: id, tipo: "permanente", cantidad: 1,
      area: sup[id] * (id === "Y+" ? 1.00 : 0.80) }));
    const r = clasificar({ geo: g, aberturas, detritus: SIN_DETRITUS, riesgo: "II" });

    // Primero, que el caso sea REALMENTE el del solapamiento: la pared Y+ cumple a la vez
    // «abierto» y las dos condiciones de parcialmente cerrado.
    const fila = r.filas.find(x => x.id === "Y+");
    const c = Object.fromEntries(fila.condiciones.map(x => [x.id, x.cumple]));
    expect(c.abierto).toBe(true);
    expect(c.pc1).toBe(true);
    expect(c.pc2).toBe(true);
    expect(fila.Aoi / fila.Agi).toBeLessThanOrEqual(0.20);

    // Y entonces, la prioridad del art. 1.10.5.
    expect(r.clasificacion).toBe("abierto");
    expect(r.gcpi).toBe(0);
    expect(r.motivo).toMatch(/1\.10\.5/);
  });

  it('sin el solapamiento, todas abiertas siguen dando ABIERTO', () => {
    const sup = Object.fromEntries(superficiesEnvolvente(GALPON).map(s => [s.id, s.Ag]));
    const aberturas = ["X+", "X-", "Y+", "Y-"].map(id => ({
      superficie: id, tipo: "permanente", area: sup[id] * 0.85, cantidad: 1 }));
    const r = clasificar({ geo: GALPON, aberturas, detritus: SIN_DETRITUS, riesgo: "II" });
    expect(r.clasificacion).toBe("abierto");
  });
});

describe('los valores justo en el límite', () => {
  // Las cuatro desigualdades del art. 1.2, evaluadas EN el límite. Es donde un `<` por un
  // `≤` cambia la clasificación y con ella la presión interna.
  const cond = (o) => Object.fromEntries(condicionesPared(o).map(c => [c.id, c]));

  it('A_o = 0,4 m² con A_g grande: cumple cerrado, no parcialmente cerrado (2)', () => {
    // A_g = 180 ⇒ 0,01·A_g = 1,8, así que el mínimo es 0,4.
    const c = cond({ Ao: 0.4, Ag: 180, Aoi: 0.1, Agi: 1000 });
    expect(c.cerrado.cumple).toBe(true);
    expect(c.pc2.cumple).toBe(false);          // pide A_o ESTRICTAMENTE mayor
  });

  it('A_o = 0,01·A_g con A_g chica: el mínimo es 0,01·A_g y no 0,4', () => {
    // A_g = 30 ⇒ 0,01·A_g = 0,3 < 0,4.
    const c = cond({ Ao: 0.3, Ag: 30, Aoi: 0.01, Agi: 1000 });
    expect(c.cerrado.der).toBeCloseTo(0.3, 12);
    expect(c.cerrado.cumple).toBe(true);
    expect(cond({ Ao: 0.31, Ag: 30, Aoi: 0.01, Agi: 1000 }).cerrado.cumple).toBe(false);
  });

  it('A_o = 1,10·A_oi: NO cumple parcialmente cerrado (1), que pide mayor estricto', () => {
    expect(cond({ Ao: 11, Ag: 180, Aoi: 10, Agi: 1000 }).pc1.cumple).toBe(false);
    expect(cond({ Ao: 11.001, Ag: 180, Aoi: 10, Agi: 1000 }).pc1.cumple).toBe(true);
  });

  it('A_oi/A_gi = 0,20: cumple, porque la condición es ≤', () => {
    const c = cond({ Ao: 50, Ag: 180, Aoi: 200, Agi: 1000 });
    expect(c.pc2.rel).toBeCloseTo(0.20, 12);
    expect(c.pc2.cumple).toBe(true);
    expect(cond({ Ao: 50, Ag: 180, Aoi: 201, Agi: 1000 }).pc2.cumple).toBe(false);
  });

  it('A_o = 0,8·A_g: cumple abierto, porque la condición es ≥', () => {
    expect(cond({ Ao: 144, Ag: 180, Aoi: 0, Agi: 1000 }).abierto.cumple).toBe(true);
    expect(cond({ Ao: 143.9, Ag: 180, Aoi: 0, Agi: 1000 }).abierto.cumple).toBe(false);
  });
});

describe('región con detritus — art. 1.10.3.1', () => {
  // ⚠ LA V QUE DECIDE NO ES SIEMPRE LA DE LA CATEGORÍA DEL EDIFICIO.
  it('Neuquén categoría III que NO es salud: se evalúa con la Figura 1.5-1A, y NO es región', () => {
    const r = regionDetritus({ ciudad: "Neuquén", riesgo: "III", esSalud: false });
    expect(r.figura).toBe("A");
    expect(r.V).toBe(velocidadDe("Neuquén", "II"));
    expect(r.V).toBe(58.8);
    expect(r.esRegion).toBe(false);
    // Y con la V de SU categoría —63,0— habría dado que sí: es justo el error que evita.
    expect(velocidadDe("Neuquén", "III")).toBeGreaterThanOrEqual(UMBRAL_DETRITUS.V);
    expect(r.motivo).toMatch(/no es instalación de salud/);
  });

  it('Neuquén categoría III de SALUD: se evalúa con la Figura 1.5-1B, y SÍ es región', () => {
    const r = regionDetritus({ ciudad: "Neuquén", riesgo: "III", esSalud: true });
    expect(r.figura).toBe("B");
    expect(r.V).toBe(velocidadDe("Neuquén", "III"));
    expect(r.esRegion).toBe(true);
  });

  it('Bahía Blanca categoría II: 67,4 m/s, SÍ es región', () => {
    const r = regionDetritus({ ciudad: "Bahía Blanca", riesgo: "II", esSalud: false });
    expect(r.V).toBe(67.4);
    expect(r.esRegion).toBe(true);
    expect(r.porV).toBe(true);
  });

  it('categoría IV siempre por la Figura 1.5-1B', () => {
    expect(regionDetritus({ ciudad: "Neuquén", riesgo: "IV", esSalud: false }).figura).toBe("B");
  });

  it('la segunda vía: V ≥ 58 m/s a menos de 1.500 m de la costa', () => {
    // Buenos Aires categoría II son 55,1: no llega ni por una vía ni por la otra.
    expect(regionDetritus({ ciudad: "Buenos Aires", riesgo: "II",
      distanciaCosta: 500 }).esRegion).toBe(false);
    // Mar del Plata son 62,5: no llega a 63, pero sí a 58 estando en la costa.
    const mdq = regionDetritus({ ciudad: "Mar del Plata", riesgo: "II", distanciaCosta: 500 });
    expect(mdq.V).toBe(62.5);
    expect(mdq.porV).toBe(false);
    expect(mdq.porCosta).toBe(true);
    expect(mdq.esRegion).toBe(true);
    // Y tierra adentro, no.
    expect(regionDetritus({ ciudad: "Mar del Plata", riesgo: "II",
      distanciaCosta: 5000 }).esRegion).toBe(false);
  });

  it('sin ciudad tabulada, pasa a ser una declaración del proyectista', () => {
    const r = regionDetritus({ ciudad: "", riesgo: "II", declarada: true });
    expect(r.porDeclaracion).toBe(true);
    expect(r.esRegion).toBe(true);
    expect(r.V).toBe(null);
    expect(regionDetritus({ ciudad: "", riesgo: "II", declarada: false }).esRegion).toBe(false);
  });
});

describe('qué abertura cuenta y por qué', () => {
  const ev = (ab, ctx = {}) => cuentaComoAbertura(ab, { detritus: false, riesgo: "II", ...ctx });

  it('la permanente cuenta siempre', () => {
    expect(ev({ tipo: "permanente" }).cuenta).toBe(true);
    expect(ev({ tipo: "permanente" }, { detritus: true }).cuenta).toBe(true);
  });

  it('la operable cuenta si se declara que puede estar abierta', () => {
    expect(ev({ tipo: "operable", abiertaEnDiseno: true }).cuenta).toBe(true);
    expect(ev({ tipo: "operable", abiertaEnDiseno: false }).cuenta).toBe(false);
  });

  it('el portón en región con detritus cuenta salvo que tenga ensayo de proyectiles', () => {
    expect(ev({ tipo: "porton" }, { detritus: true }).cuenta).toBe(true);
    expect(ev({ tipo: "porton", protegida: true }, { detritus: true }).cuenta).toBe(false);
    // Fuera de región, vale la regla de la puerta operable.
    expect(ev({ tipo: "porton", abiertaEnDiseno: false }).cuenta).toBe(false);
  });

  it('el vidriado sólo cuenta en región con detritus y categorías II a IV', () => {
    expect(ev({ tipo: "vidriado" }, { detritus: true, riesgo: "II" }).cuenta).toBe(true);
    expect(ev({ tipo: "vidriado" }, { detritus: true, riesgo: "I" }).cuenta).toBe(false);
    expect(ev({ tipo: "vidriado" }, { detritus: false, riesgo: "II" }).cuenta).toBe(false);
    expect(ev({ tipo: "vidriado", protegida: true }, { detritus: true, riesgo: "IV" }).cuenta).toBe(false);
    // La excepción de altura del art. 1.10.3.
    expect(ev({ tipo: "vidriado", exencionAltura: true },
      { detritus: true, riesgo: "III" }).cuenta).toBe(false);
  });

  it('cada decisión viene con su motivo y su artículo', () => {
    for (const tipo of ["permanente", "operable", "porton", "vidriado"]) {
      const r = ev({ tipo }, { detritus: true });
      expect(r.motivo.length, tipo).toBeGreaterThan(20);
      expect(r.ref, tipo).toMatch(/Art\./);
    }
  });

  it('el área sale de las dimensiones o directa, por la cantidad', () => {
    expect(areaAbertura({ ancho: 0.9, alto: 2.1, cantidad: 4 })).toBeCloseTo(7.56, 9);
    expect(areaAbertura({ area: 3, cantidad: 2 })).toBe(6);
    expect(areaAbertura({ ancho: "0,9", alto: "2,1" })).toBeCloseTo(1.89, 9);   // coma decimal
  });
});

describe('R_i — expresión (1.11-1)', () => {
  it('se reduce cuando V_i/A_og es grande, y nunca supera 1', () => {
    let previo = Infinity;
    for (const Vi of [0, 100, 1000, 5000, 20000, 1e6]) {
      const r = ri(Vi, 5);
      expect(r).toBeLessThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(previo + 1e-12);
      previo = r;
    }
    // El piso de la expresión es 0,5: con V_i → ∞ el término de la raíz tiende a cero.
    // No baja de ahí por mucho que crezca el volumen.
    expect(ri(1e6, 5)).toBeLessThan(0.60);
    expect(ri(1e12, 5)).toBeGreaterThan(0.5);
    expect(ri(1e12, 5)).toBeCloseTo(0.5, 3);
  });

  it('con más área de aberturas sube, porque el interior se presuriza más rápido', () => {
    expect(ri(5000, 20)).toBeGreaterThan(ri(5000, 2));
  });

  it('sólo se calcula en parcialmente cerrado', () => {
    expect(clas([]).Ri).toBe(null);
    expect(clas([puerta("X+")]).Ri).not.toBe(null);
  });
});
