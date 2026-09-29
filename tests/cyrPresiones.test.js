// CAPÍTULO 5 — PRESIONES Y VERIFICACIÓN DE UN ELEMENTO.
//
// El núcleo del cálculo —p = q_h[(GC_p) − (GC_pi)], los dos signos de la presión interna y
// el mínimo del art. 5.2.2— lo verifica `cyrTabla5132.test.js` contra 960 presiones del
// propio reglamento, que es una fuente independiente. Acá van las piezas que esa tabla no
// puede cubrir: la nota de parapeto, la zona gobernante por sentido, el camino sin figura
// y la convención de signos.
import { describe, it, expect } from 'vitest';
import {
  P_MINIMA, PARAPETO_MINIMO, FIGURAS_CON_NOTA_PARAPETO, FORMA_DE_TIPO,
  gcpDeZona, presionDeZona, verificarElemento, analizarCyR,
} from '../src/engine/cyrPresiones.js';
import { FORMA, figuraCubierta } from '../src/engine/cyrFiguras.js';
import { normalizarGeo } from '../src/engine/edificio.js';
import { q } from '../src/engine/presionDinamica.js';
import { TIPO_ELEMENTO } from '../src/engine/cyrElementos.js';
import { FIGURAS } from '../src/constants/cyrCurvas.js';

const plana = figuraCubierta({ forma: FORMA.PLANA, theta: 0 });
const ctx = (extra = {}) => ({ qh: 1000, gcpi: 0.18, fuente: plana, theta: 0, parapeto: false, ...extra });

describe('presionDeZona — expresión (5.3-1) y los dos signos de (GC_pi)', () => {
  it('cada signo se combina con el (GC_pi) que lo agrava', () => {
    // Con q_h = 1.000 N/m² los números se leen directo: p = 1.000 · [(GC_p) − (GC_pi)].
    // Se mira la presión CALCULADA: los 480 N/m² del positivo quedan por debajo del mínimo
    // del art. 5.2.2, que tiene su propio bloque de tests más abajo.
    const r = presionDeZona(ctx(), { pos: 0.3, neg: -2.3 });
    expect(r.pPosCalculada).toBeCloseTo(1000 * (0.3 + 0.18), 9);   // el (GC_pi) negativo agrava el positivo
    expect(r.pNegCalculada).toBeCloseTo(1000 * (-2.3 - 0.18), 9);  // y al revés
    expect(r.pNeg).toBe(r.pNegCalculada);                          // la succión no necesita piso
    expect(r.gcpiUsado).toEqual({ pos: -0.18, neg: 0.18 });
  });

  it('el signo de (GC_pi) que llega no cambia el resultado: se usan los dos', () => {
    // Un (GC_pi) cargado como −0,18 no puede dar otra cosa que uno cargado como +0,18: la
    // nota 3 de la Tabla 1.11-1 obliga a considerar los dos signos, no a elegir uno.
    expect(presionDeZona(ctx({ gcpi: -0.18 }), { pos: 0.3, neg: -2.3 }))
      .toEqual(presionDeZona(ctx({ gcpi: 0.18 }), { pos: 0.3, neg: -2.3 }));
  });

  it('con (GC_pi) = 0 la presión es sólo la externa', () => {
    // Es el caso del art. 5.7 cuando las dos caras del voladizo no encierran volumen.
    const r = presionDeZona(ctx({ gcpi: 0 }), { pos: 0.3, neg: -2.3 });
    expect(r.pPosCalculada).toBeCloseTo(300, 9);
    expect(r.pNegCalculada).toBeCloseTo(-2300, 9);
  });
});

describe('art. 5.2.2 — el mínimo de 0,80 kN/m²', () => {
  it('actúa en cada sentido POR SEPARADO', () => {
    // «...no debe ser menor que una presión neta de 0,80 kN/m² actuando en cualquier
    // dirección normal a la superficie». Un elemento con mucha succión no queda exento del
    // mínimo en el sentido positivo porque el negativo lo supere: son dos verificaciones.
    const r = presionDeZona({ qh: 500, gcpi: 0.18 }, { pos: 0.3, neg: -2.3 });
    expect(r.pPosCalculada).toBeCloseTo(240, 9);
    expect(r.pNegCalculada).toBeCloseTo(-1240, 9);
    expect(r.pPos).toBe(P_MINIMA);            // levantado
    expect(r.pNeg).toBeCloseTo(-1240, 9);     // intacto
    expect(r.gobiernaMinimo).toEqual({ pos: true, neg: false });
  });

  it('guarda siempre la presión calculada al lado de la adoptada', () => {
    // Sin ese par, la memoria no puede decir que el mínimo gobernó: mostraría 800 N/m² sin
    // manera de saber si salió de la expresión o del piso.
    const r = presionDeZona({ qh: 100, gcpi: 0.18 }, { pos: 0.3, neg: -0.9 });
    expect(r.pPos).toBe(P_MINIMA);
    expect(r.pNeg).toBe(-P_MINIMA);
    expect(r.pPosCalculada).toBeCloseTo(48, 9);
    expect(r.pNegCalculada).toBeCloseTo(-108, 9);
  });

  it('es 800 N/m² y no el 750 del art. 2.1.5', () => {
    // Son dos mínimos distintos: el del capítulo 2 se aplica al SPRFV sobre el área
    // proyectada del edificio; éste, a cada componente y en cada sentido.
    expect(P_MINIMA).toBe(800);
  });
});

describe('Nota 5 de la Fig. 5.3-2A — parapeto de 1 m o más', () => {
  const conParapeto = ctx({ parapeto: true });

  it('el negativo de la zona 3 se iguala al de la zona 2', () => {
    const sin = gcpDeZona(ctx(), { superficie: "cubierta", zona: "3", A: 5 });
    const con = gcpDeZona(conParapeto, { superficie: "cubierta", zona: "3", A: 5 });
    const zona2 = gcpDeZona(ctx(), { superficie: "cubierta", zona: "2", A: 5 });
    expect(con.neg).toBeCloseTo(zona2.neg, 12);
    expect(con.neg).toBeGreaterThan(sin.neg);      // menos succión que sin parapeto
    expect(con.notas.some(n => n.ref === "Fig. 5.3-2A, nota 5")).toBe(true);
  });

  it('los positivos de las zonas 2 y 3 se igualan a los de pared 4 y 5', () => {
    for (const [zona, zonaPared] of [["2", "4"], ["3", "5"]]) {
      const con = gcpDeZona(conParapeto, { superficie: "cubierta", zona, A: 5 });
      const esperado = FIGURAS["5.3-1"].curvas.pared[zonaPared].pos;
      // Sin la reducción del 10 % de la nota 5 de la Fig. 5.3-1: esa nota es para
      // elementos de PARED, y acá el elemento es de cubierta. Es además lo conservador.
      expect(con.pos, `zona ${zona}`).toBeCloseTo(esperado[0][1] - (esperado[0][1] - esperado[1][1])
        * (Math.log10(5) / Math.log10(50)), 9);
      expect(con.notas.some(n => n.texto.includes(`zona de pared ${zonaPared}`))).toBe(true);
    }
  });

  it('la zona 1 y la 1′ no se tocan', () => {
    for (const zona of ["1'", "1"]) {
      const sin = gcpDeZona(ctx(), { superficie: "cubierta", zona, A: 5 });
      const con = gcpDeZona(conParapeto, { superficie: "cubierta", zona, A: 5 });
      expect(con.pos, zona).toBeCloseTo(sin.pos, 12);
      expect(con.neg, zona).toBeCloseTo(sin.neg, 12);
      expect(con.notas, zona).toEqual([]);
    }
  });

  it('la nota existe SÓLO en la 5.3-2A entre las figuras implementadas', () => {
    // Se leyó nota por nota. La Fig. 5.4-1 tiene una equivalente —su nota 7— pero es de
    // h > 20 m, otra etapa. Extenderla a las 2B a 2G «porque es lo mismo» sería inventarla.
    expect(FIGURAS_CON_NOTA_PARAPETO).toEqual(["5.3-2A"]);
    const dosAguas = ctx({ fuente: figuraCubierta({ forma: FORMA.DOS_AGUAS, theta: 15 }), theta: 15, parapeto: true });
    const con = gcpDeZona(dosAguas, { superficie: "cubierta", zona: "3", A: 5 });
    const sin = gcpDeZona({ ...dosAguas, parapeto: false }, { superficie: "cubierta", zona: "3", A: 5 });
    expect(con).toEqual(sin);
  });

  it('la altura que dispara la nota es 1 m', () => {
    expect(PARAPETO_MINIMO).toBe(1);
  });
});

describe('Paredes — la reducción del 10 % entra por el contexto', () => {
  it('con θ ≤ 10° reduce los DOS signos y lo anota', () => {
    const con = gcpDeZona(ctx({ theta: 5 }), { superficie: "pared", zona: "4", A: 1 });
    expect(con.pos).toBeCloseTo(1.0 * 0.9, 12);
    expect(con.neg).toBeCloseTo(-1.1 * 0.9, 12);
    expect(con.notas[0].ref).toBe("Fig. 5.3-1, nota 5");
  });

  it('con θ > 10° no reduce ni anota nada', () => {
    const sin = gcpDeZona(ctx({ theta: 15 }), { superficie: "pared", zona: "4", A: 1 });
    expect(sin.pos).toBeCloseTo(1.0, 12);
    expect(sin.neg).toBeCloseTo(-1.1, 12);
    expect(sin.notas).toEqual([]);
  });

  it('la pared no depende de la figura de cubierta que traiga el contexto', () => {
    const a = gcpDeZona(ctx({ theta: 15, fuente: figuraCubierta({ forma: FORMA.DOS_AGUAS, theta: 15 }) }),
      { superficie: "pared", zona: "5", A: 10 });
    const b = gcpDeZona(ctx({ theta: 15, fuente: figuraCubierta({ forma: FORMA.CUATRO_AGUAS, theta: 15 }) }),
      { superficie: "pared", zona: "5", A: 10 });
    expect(a).toEqual(b);
  });
});

describe('verificarElemento — todas las zonas, siempre', () => {
  const correa = { tipo: TIPO_ELEMENTO.CORREA, superficie: "cubierta", L: 6, s: 1.5, nombre: "C-1" };

  it('devuelve las cuatro zonas de la figura, no sólo la gobernante', () => {
    // Una correa tipo se repite por toda la cubierta: saber cuál zona gobierna exige
    // haberlas calculado todas, y la tabla de la pantalla las muestra todas.
    const r = verificarElemento(ctx(), correa);
    expect(r.zonas.map(z => z.zona)).toEqual(["1'", "1", "2", "3"]);
    expect(r.area.A).toBeCloseTo(12, 9);
    expect(r.sinFigura).toBe(false);
  });

  it('la zona gobernante se decide POR SENTIDO', () => {
    const r = verificarElemento(ctx(), correa);
    // En la Fig. 5.3-2A la succión crece hacia la esquina, así que el negativo lo gobierna
    // la zona 3. El positivo es el MISMO en las cuatro zonas —la Tabla C 5.3-2 dice
    // «Todas las zonas»—, así que ahí gobierna la primera y ninguna es peor que otra.
    expect(r.gobierna.neg).toBe("3");
    const positivas = new Set(r.zonas.map(z => Math.round(z.pPos * 1e6)));
    expect(positivas.size).toBe(1);
    expect(r.gobierna.pos).toBe("1'");
  });

  it('un elemento de pared usa las zonas de pared', () => {
    const r = verificarElemento(ctx({ theta: 15 }),
      { tipo: TIPO_ELEMENTO.LARGUERO, superficie: "pared", L: 4, s: 1.2 });
    expect(r.zonas.map(z => z.zona)).toEqual(["4", "5"]);
    expect(r.gobierna.neg).toBe("5");
  });

  it('sin figura aplicable informa el elemento igual, sin números', () => {
    // Desaparecer de la tabla sería peor que aparecer sin resultado: el proyectista tiene
    // que ver que ese elemento quedó sin verificar y por qué.
    const sinFig = ctx({ fuente: figuraCubierta({ forma: FORMA.DOS_AGUAS, theta: 60 }), theta: 60 });
    const r = verificarElemento(sinFig, correa);
    expect(r.sinFigura).toBe(true);
    expect(r.zonas).toEqual([]);
    expect(r.gobierna).toBeNull();
    expect(r.avisos.some(a => a.nivel === "error")).toBe(true);
    // Pero el área sí se calcula: es del elemento y no depende de la figura.
    expect(r.area.A).toBeCloseTo(12, 9);
  });

  it('el aviso del art. 5.2.3 sale del área TRIBUTARIA, no de la efectiva', () => {
    // Son dos áreas distintas y el artículo habla de la tributaria. Una correa de 20 m
    // cada 3,5 m tiene 70 m² tributarios y 133,3 m² efectivos: si el umbral se midiera con
    // la efectiva, avisaría también en casos que el artículo no alcanza.
    const avisa = (el) => verificarElemento(ctx(), { superficie: "cubierta", tipo: TIPO_ELEMENTO.CORREA, ...el })
      .avisos.some(a => a.ref === "art. 5.2.3");

    // Tributaria 70 m² y efectiva 133,3 m²: las dos pasan el umbral y avisa.
    const grande = verificarElemento(ctx(), { tipo: TIPO_ELEMENTO.CORREA, superficie: "cubierta", L: 20, s: 3.5 });
    expect(grande.area.tributaria).toBeCloseTo(70, 9);
    expect(grande.area.A).toBeCloseTo(20 * 20 / 3, 9);
    expect(avisa({ L: 20, s: 3.5 })).toBe(true);

    // ⚠ EL CASO QUE SEPARA LAS DOS LECTURAS. Correa de 24 m cada 2,70 m: el tercio manda,
    // así que la efectiva es 24 × 8 = 192 m² —bien por encima del umbral— mientras que la
    // TRIBUTARIA es 64,8 m² y no llega. El art. 5.2.3 habla de la tributaria, así que acá
    // NO corresponde avisar. Medido con la efectiva, el aviso saldría igual y el test no
    // lo vería si no existiera este caso.
    const limite = verificarElemento(ctx(), { tipo: TIPO_ELEMENTO.CORREA, superficie: "cubierta", L: 24, s: 2.7 });
    expect(limite.area.tributaria).toBeCloseTo(64.8, 9);
    expect(limite.area.A).toBeCloseTo(192, 9);
    expect(avisa({ L: 24, s: 2.7 })).toBe(false);

    expect(avisa({ L: 6, s: 1.5 })).toBe(false);
  });

  it('arrastra los avisos de la figura, del área y de las notas', () => {
    const r = verificarElemento(ctx({ theta: 5, parapeto: true }), correa);
    const refs = new Set(r.avisos.map(a => a.ref));
    expect(refs.has("C 1.2")).toBe(true);                 // la regla del tercio
    expect(refs.has("Fig. 5.3-2A, nota 5")).toBe(true);   // el parapeto
    // Con q_h = 1.000 N/m² el (GC_p) positivo de 0,3 da 480 N/m², así que el mínimo del
    // art. 5.2.2 gobierna el sentido positivo y el elemento lo informa.
    expect(r.minimoGobiernaAlgo).toBe(true);
  });

  it('marca cuándo el mínimo gobernó algo', () => {
    const flojo = verificarElemento(ctx({ qh: 200 }), correa);
    expect(flojo.minimoGobiernaAlgo).toBe(true);
    expect(flojo.zonas.every(z => z.pPos === P_MINIMA)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EL EDIFICIO ENTERO
// ═══════════════════════════════════════════════════════════════════════════════

describe('analizarCyR — de la geometría del proyecto a los elementos verificados', () => {
  const geoDe = (g) => normalizarGeo({ a: "20", b: "30", hAlero: "6", theta: "0",
    tipo: "plana", cumbrera: "X", ...g });
  const correr = (g, extra = {}) => analizarCyR({
    geo: geoDe(g), V: 45, exposicion: "B", altitud: 0, kd: 0.85,
    kztDe: () => [1], gcpi: 0.18, elementos: [], ...extra,
  });

  it('elige la figura y la altura que le corresponde, y las declara', () => {
    const plana = correr({});
    expect(plana.figura).toBe("5.3-2A");
    expect(plana.altura.cual).toBe("alero");
    expect(plana.altura.valor).toBeCloseTo(6, 9);

    // Dos aguas de 25°: Fig. 5.3-2C, que usa la altura MEDIA y no la del alero.
    const inclinada = correr({ tipo: "dos_aguas", theta: "25" });
    expect(inclinada.figura).toBe("5.3-2C");
    expect(inclinada.altura.cual).toBe("media");
    expect(inclinada.altura.valor).toBeGreaterThan(6);
    expect(inclinada.altura.valor).toBeCloseTo(inclinada.altura.media, 12);
  });

  it('q_h se evalúa a la altura de la figura, no a la media siempre', () => {
    // Es la consecuencia práctica de lo anterior: con θ = 25° la Fig. 5.3-2C pide la
    // altura media, que en una nave de 20 m de ancho está 2,3 m por encima del alero, y
    // q_h sube con ella. Usar el alero daría presiones menores en toda la envolvente.
    const inclinada = correr({ tipo: "dos_aguas", theta: "25" });
    const alAlero = q({ z: inclinada.altura.alero, V: 45, exposicion: "B", kd: 0.85, Kzt: 1, altitud: 0 });
    expect(inclinada.qh).toBeGreaterThan(alAlero);
  });

  it('K_zt entra como el MÁXIMO entre las direcciones', () => {
    // C&R es envolvente de todas las direcciones: el (GC_p) ya lo es, así que tomar el
    // K_zt de una sola dirección dejaría afuera justo la que agrava.
    const uno = correr({}, { kztDe: () => [1, 1, 1, 1] });
    const varias = correr({}, { kztDe: () => [1, 1.31, 1.05, 1] });
    expect(varias.Kzt).toBeCloseTo(1.31, 9);
    expect(varias.qh / uno.qh).toBeCloseTo(1.31, 6);
  });

  it('la dimensión `a` se mide con la altura de la figura', () => {
    const r = correr({});
    // Nave de 20 × 30 m con alero a 6 m: 10 % de 20 = 2,0 contra 0,4 × 6 = 2,4.
    expect(r.a.a).toBeCloseTo(2, 9);
    expect(r.a.gobierna).toMatch(/10 %/);
  });

  it('avisa —con nivel error— si el edificio se pasa de los 20 m de la Parte 1', () => {
    const alto = correr({ hAlero: "24" });
    expect(alto.avisos.some(a => a.nivel === "error" && /Parte 1/.test(a.texto))).toBe(true);
  });

  it('un parapeto declarado donde la nota no existe lo dice, en vez de no hacer nada', () => {
    // Declarar un parapeto y que no cambie ningún número es el silencio que hay que
    // evitar: el proyectista creería que se tuvo en cuenta.
    const r = correr({ tipo: "dos_aguas", theta: "15" }, { parapeto: true });
    expect(r.avisos.some(a => /no modifica los \(GC_p\)/.test(a.texto))).toBe(true);
    const enA = correr({}, { parapeto: true });
    expect(enA.avisos.some(a => /no modifica los \(GC_p\)/.test(a.texto))).toBe(false);
  });

  it('informa qué zonas existen en ESTE edificio, cubierta y pared', () => {
    // Nave de 20 × 30 con h de alero 6 m: 2,4h = 14,4 < 20, así que están las cuatro.
    expect(correr({}).zonasCubierta).toEqual(["1'", "1", "2", "3"]);
    // Una caseta de 5 × 6 m con la misma altura no llega a 1,2h = 7,2 m en ninguna
    // dirección: desaparecen la 1' y la 1, y queda la franja de 0,2h con el interior en
    // zona 2. Es el cuarto escenario de la Fig. C 5-1, y sale de la geometría.
    expect(correr({ a: "5", b: "6" }).zonasCubierta).toEqual(["2", "3"]);
    // Un gabinete de 2,0 × 2,2 m junto al mismo alero está por debajo de 0,4h = 2,4 m:
    // toda la cubierta es zona 3. Es el quinto escenario, el del comentario C 5.1.
    expect(correr({ a: "2", b: "2.2" }).zonasCubierta).toEqual(["3"]);
    expect(correr({}).zonasPared).toEqual(["4", "5"]);
  });

  it('verifica cada elemento de la lista', () => {
    const r = correr({}, { elementos: [
      { tipo: TIPO_ELEMENTO.CORREA, superficie: "cubierta", L: 6, s: 1.5, nombre: "C-1" },
      { tipo: TIPO_ELEMENTO.LARGUERO, superficie: "pared", L: 4, s: 1.2, nombre: "L-1" },
    ] });
    expect(r.elementos).toHaveLength(2);
    expect(r.elementos[0].zonas.map(z => z.zona)).toEqual(["1'", "1", "2", "3"]);
    expect(r.elementos[1].zonas.map(z => z.zona)).toEqual(["4", "5"]);
    expect(r.elementos[0].gobierna.neg).toBe("3");
  });

  it('con el mínimo gobernando todas las zonas, la gobernante es la MÁS exigida', () => {
    // Todas quedan en 800 N/m² y cualquiera «gobierna» por igual. Informar la primera
    // diría que manda la zona interior cuando la que empuja el diseño es la de esquina.
    const flojo = correr({}, { V: 20, elementos: [
      { tipo: TIPO_ELEMENTO.CORREA, superficie: "cubierta", L: 6, s: 1.5 }] });
    const el = flojo.elementos[0];
    expect(el.zonas.every(z => Math.abs(z.pNeg) === P_MINIMA)).toBe(true);
    expect(el.gobierna.neg).toBe("3");
  });

  it('una cubierta sin figura no calcula, y lo dice en todos lados', () => {
    const r = correr({ tipo: "vertiente_unica", theta: "18" }, { elementos: [
      { tipo: TIPO_ELEMENTO.CHAPA, superficie: "cubierta", L: 3, s: 1 }] });
    expect(r.figura).toBeUndefined();
    expect(r.zonasCubierta).toEqual([]);
    expect(r.avisos.some(a => a.nivel === "error")).toBe(true);
    expect(r.elementos[0].sinFigura).toBe(true);
    // Las paredes siguen teniendo figura: la 5.3-1 no depende del tipo de cubierta.
    expect(r.zonasPared).toEqual(["4", "5"]);
  });

  it('los cuatro tipos de cubierta de la app tienen su forma del capítulo 5', () => {
    expect(FORMA_DE_TIPO).toEqual({
      plana: FORMA.PLANA, dos_aguas: FORMA.DOS_AGUAS,
      cuatro_aguas: FORMA.CUATRO_AGUAS, vertiente_unica: FORMA.VERTIENTE_UNICA,
    });
  });
});
