// ESTÁTICA DE LA CUBIERTA — signo de la componente horizontal, y el vuelco de la vertical.
//
// ── LO QUE ESTABA MAL ──────────────────────────────────────────────────────────
// El signo de H estaba INVERTIDO: barlovento llevaba −1 y sotavento +1. En un caballete
// simétrico los dos faldones se cancelan y el error no se ve; aparece apenas los Cp
// difieren, que es siempre. Ninguno de los 797 tests que había lo detectaba, porque
// ninguno afirmaba el signo en términos absolutos: todos comparaban contra el propio
// motor. Por eso estos tests son ABSOLUTOS —dicen qué signo debe tener H, no que H sea
// igual a lo que el motor calcula—.
//
// La regla, con p positiva HACIA la superficie:
//   faldón a barlovento (asciende con el viento):  H = +p·tanθ·A_planta
//   faldón a sotavento:                            H = −p·tanθ·A_planta
import { describe, it, expect } from 'vitest';
import { analizarDireccion, DIRECCIONES } from '../src/engine/edificio.js';
import { aporteCubierta, aporteParedes, resultantes } from '../src/engine/resultantes.js';

const D = Object.fromEntries(DIRECCIONES.map(d => [d.id, d]));
const SITIO = { V: 55.1, exposicion: "B", kd: 0.85, Kzt: 1.0, altitud: 0, usarKe: false };
const mk = (geo, dir, cerr = "cerrado") =>
  analizarDireccion({ geo, sitio: SITIO, cerramiento: cerr, G: 0.85 }, D[dir]);

describe('signo de la componente horizontal de cubierta', () => {
  // La pendiente desciende hacia +Y y el viento va hacia −Y: la superficie ASCIENDE en el
  // sentido del viento, o sea que es toda a barlovento (nota 4). Con el caso positivo de
  // la nota 3, Cp = +0,36: presión, no succión.
  it('vertiente única a barlovento con Cp > 0 ⇒ H > 0', () => {
    const v = mk({ a: 20, b: 30, hAlero: 6, theta: 45, tipo: "vertiente_unica",
      cumbrera: "X", pendienteHacia: "+Y" }, "Wy-");
    expect(v.caraUnica).toBe("barlovento");
    const s = v.superficies.find(o => o.id === "cub_unica_pos");
    expect(s.cp).toBeGreaterThan(0);
    expect(aporteCubierta({ analisis: v, casoNota3: "positivo" }).H).toBeGreaterThan(0);
  });

  // Los dos faldones en succión. El de sotavento succiona más, y su H —negativo por su
  // signo, sobre una p negativa— resulta positivo y domina.
  it('dos aguas con |Cp_sot| > |Cp_bar|, ambos en succión ⇒ H > 0', () => {
    for (const theta of [20, 25, 30]) {
      const r = mk({ a: 20, b: 30, hAlero: 6, theta, tipo: "dos_aguas", cumbrera: "X" }, "Wy+");
      const bar = r.superficies.find(s => s.id === "cub_barlovento_neg");
      const sot = r.superficies.find(s => s.id === "cub_sotavento");
      expect(bar.cp, `θ=${theta}`).toBeLessThan(0);
      expect(sot.cp, `θ=${theta}`).toBeLessThan(0);
      expect(Math.abs(sot.cp), `θ=${theta}`).toBeGreaterThan(Math.abs(bar.cp));
      expect(aporteCubierta({ analisis: r }).H, `θ=${theta}`).toBeGreaterThan(0);
    }
  });

  // Y el recíproco, que es lo que separa «signo correcto» de «signo invertido»: cuando el
  // faldón de barlovento succiona MÁS, H cambia de signo.
  it('y al revés: con |Cp_bar| > |Cp_sot| en succión ⇒ H < 0', () => {
    const r = mk({ a: 20, b: 30, hAlero: 6, theta: 10.01, tipo: "dos_aguas", cumbrera: "X" }, "Wy+");
    const bar = r.superficies.find(s => s.id === "cub_barlovento_neg");
    const sot = r.superficies.find(s => s.id === "cub_sotavento");
    expect(Math.abs(bar.cp)).toBeGreaterThan(Math.abs(sot.cp));
    expect(aporteCubierta({ analisis: r }).H).toBeLessThan(0);
  });

  // La comprobación directa de la expresión, sin pasar por ningún caso particular.
  it('cada parte cumple H = sentido·p_externa·tanθ·A_planta', () => {
    const r = mk({ a: 20, b: 30, hAlero: 6, theta: 25, tipo: "dos_aguas", cumbrera: "X" }, "Wy+");
    const tan = Math.tan(25 * Math.PI / 180);
    const ap = aporteCubierta({ analisis: r });
    for (const p of ap.partes) {
      expect(p.horizontal, p.id).toBeCloseTo(p.sentido * p.externa * tan * p.areaProy, 9);
    }
    // Y el faldón a barlovento lleva sentido +1, el de sotavento −1.
    expect(ap.partes.find(p => p.id.includes("barlovento")).sentido).toBe(+1);
    expect(ap.partes.find(p => p.id === "cub_sotavento").sentido).toBe(-1);
  });
});

describe('H se calcula sólo con presiones externas', () => {
  // La presión interna actúa sobre las dos caras de la envolvente: su resultante
  // horizontal se cancela. Si entrara, el corte dependería del signo de GC_pi, que es un
  // dato de la clasificación de cerramiento y no del empuje del viento.
  const geos = [
    ["dos aguas", { a: 20, b: 30, hAlero: 6, theta: 25, tipo: "dos_aguas", cumbrera: "X" }, "Wy+"],
    ["vertiente única", { a: 20, b: 30, hAlero: 6, theta: 20, tipo: "vertiente_unica",
      cumbrera: "X", pendienteHacia: "+Y" }, "Wy-"],
    ["franjas, θ < 10°", { a: 20, b: 30, hAlero: 6, theta: 8, tipo: "dos_aguas", cumbrera: "X" }, "Wy+"],
    ["plana", { a: 20, b: 30, hAlero: 6, theta: 0, tipo: "plana", cumbrera: "X" }, "Wy+"],
  ];
  for (const [nombre, geo, dir] of geos) {
    it(`${nombre}: H no cambia al variar GC_pi`, () => {
      const hs = ["cerrado", "parc_cerrado", "parc_abierto"].map(c =>
        aporteCubierta({ analisis: mk(geo, dir, c) }).H);
      // Los tres GC_pi son distintos de verdad, si no el test no verificaría nada.
      const gcpi = ["cerrado", "parc_cerrado", "parc_abierto"].map(c => mk(geo, dir, c).GCpi);
      expect(new Set(gcpi.map(g => g.toFixed(4))).size).toBeGreaterThan(1);
      for (const h of hs) expect(h, nombre).toBeCloseTo(hs[0], 9);
    });
  }

  it('el levantamiento SÍ cambia con GC_pi, que es donde no se cancela', () => {
    const geo = { a: 20, b: 30, hAlero: 6, theta: 25, tipo: "dos_aguas", cumbrera: "X" };
    const a = aporteCubierta({ analisis: mk(geo, "Wy+", "cerrado") }).V;
    const b = aporteCubierta({ analisis: mk(geo, "Wy+", "parc_cerrado") }).V;
    expect(b).toBeGreaterThan(a);
  });
});

describe('los dos casos de la nota 3 y el que gobierna el corte', () => {
  it('se evalúan los dos y se adopta el de mayor corte', () => {
    const r = mk({ a: 20, b: 30, hAlero: 6, theta: 25, tipo: "dos_aguas", cumbrera: "X" }, "Wy+");
    const res = resultantes(r);
    expect(res.detalle.casos).toHaveLength(2);
    const par = aporteParedes({ analisis: r }).F;
    const mejor = Math.max(...res.detalle.casos.map(c => par + c.H));
    expect(res.cortante).toBeCloseTo(Math.max(mejor, par), 6);
    expect(["negativo", "positivo"]).toContain(res.casoNota3);
  });

  it('el levantamiento es la envolvente de los dos casos', () => {
    const r = mk({ a: 20, b: 30, hAlero: 6, theta: 25, tipo: "dos_aguas", cumbrera: "X" }, "Wy+");
    const res = resultantes(r);
    expect(res.levantamiento).toBe(Math.max(...res.detalle.casos.map(c => c.V)));
  });
});

describe('vuelco con la resultante vertical de cubierta', () => {
  const geo = { a: 20, b: 40, hAlero: 6, theta: 25, tipo: "dos_aguas", cumbrera: "X" };
  const r = mk(geo, "Wy+");
  const res = resultantes(r);

  it('informa V y su punto de aplicación en planta', () => {
    expect(res.verticalCubierta.V).toBeCloseTo(res.levantamiento, 9);
    expect(res.verticalCubierta.xV).toBeGreaterThan(0);
    expect(res.verticalCubierta.xV).toBeLessThan(r.L);
  });

  it('el punto de aplicación es el centroide de las partes verticales', () => {
    const c = res.detalle.casos.find(c => c.casoNota3 === res.verticalCubierta.casoNota3);
    const num = c.partes.reduce((a, p) => a + p.vertical * (p.desde + p.hasta) / 2, 0);
    expect(c.xV).toBeCloseTo(num / c.V, 9);
  });

  // ⚠ LA IDENTIDAD VALE DENTRO DE UN CASO, NO SOBRE LA ENVOLVENTE. Los tres momentos de
  // la envolvente pueden venir de casos distintos de la nota 3, y entonces no guardan
  // entre sí ninguna relación lineal: cada uno es el de SU estado de carga.
  it('dentro de cada caso, el momento cambia sólo por el término vertical', () => {
    for (const c of res.casos) {
      const { centro, bordeBarlovento, bordeSotavento, horizontal, vertical } = c.momentos;
      expect(centro - horizontal, c.casoNota3).toBeCloseTo(vertical, 6);
      expect(bordeSotavento - centro, c.casoNota3).toBeCloseTo(centro - bordeBarlovento, 6);
      expect(bordeSotavento - bordeBarlovento, c.casoNota3).toBeCloseTo(c.V * r.L, 6);
    }
  });

  it('el desglose de la envolvente sale del MISMO caso que su total', () => {
    const { centro, horizontal, vertical } = res.momentos;
    expect(centro - horizontal).toBeCloseTo(vertical, 6);
  });

  it('el término vertical es V·(L/2 − x_V) del caso que gobierna el vuelco', () => {
    const plano = resultantes(mk({ a: 20, b: 40, hAlero: 6, theta: 0, tipo: "plana" }, "Wy+"));
    const c = plano.casos.find(c => c.casoNota3 === plano.gobernante.vuelco);
    expect(plano.momentos.centro - plano.momentos.horizontal)
      .toBeCloseTo(c.V * (20 - c.xV), 6);
  });

  it('el vuelco informado es el tomado respecto del centro de la base', () => {
    expect(res.vuelco).toBe(res.momentos.centro);
  });
});
