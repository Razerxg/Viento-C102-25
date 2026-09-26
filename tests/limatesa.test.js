// CUBIERTA A CUATRO AGUAS — la cumbrera no es dato, es consecuencia.
//
// ── QUÉ ESTABA MAL ──────────────────────────────────────────────────────────────
// `remonte()` trataba el limatesa igual que el caballete: media luz NORMAL A LA CUMBRERA
// DECLARADA. Con una sola pendiente θ eso describe una pieza que no existe. Los cuatro
// planos se cortan de una sola manera: la cumbrera va según el lado LARGO, sube sobre
// media luz del lado CORTO, y su largo es |a − b|. Sólo con a = b no hay cumbrera y la
// pieza es una pirámide.
//
// Y el error NO era conservador: en la envolvente bajaba el corte y el vuelco y subía el
// levantamiento. Las cifras medidas están en `docs/PLAN.md`, como registro y no como
// test: comparar contra el código viejo exige emularlo, y una emulación que no reproduzca
// TAMBIÉN sus paredes —el limatesa viejo usaba rectángulos donde un caballete tiene
// hastial— da números que parecen confirmar y no confirman nada.
//
// Lo que protege la corrección son los tests de remonte, de reorientación de proyectos
// guardados y de silueta: propiedades del motor, no comparaciones históricas.
import { describe, it, expect } from 'vitest';
import { normalizarGeo, remonte, longitudCumbrera, cumbreraLimatesa, modoCubierta,
  analizarDireccion, DIRECCIONES } from '../src/engine/edificio.js';
import { aporteCubierta, resultantes } from '../src/engine/resultantes.js';
import { siluetaProyectada } from '../src/engine/fachadas.js';

const D = Object.fromEntries(DIRECCIONES.map(d => [d.id, d]));
const SITIO = { V: 45, exposicion: "C", kd: 0.85, Kzt: 1.0, altitud: 0, usarKe: false };
const mk = (geo, dir) => analizarDireccion({ geo, sitio: SITIO, cerramiento: "cerrado", G: 0.85 }, D[dir]);
const tan = (t) => Math.tan(t * Math.PI / 180);

describe('remonte y largo de cumbrera', () => {
  // El remonte sale SIEMPRE del lado corto, sea cual sea el que el proyecto declare.
  it('a < b, a > b y a = b', () => {
    for (const [a, b, theta] of [[20, 30, 25], [30, 20, 25], [25, 25, 25], [12, 40, 18]]) {
      for (const declarada of ["X", "Y"]) {
        const r = remonte({ tipo: "cuatro_aguas", theta, a, b, cumbrera: declarada });
        expect(r, `a=${a} b=${b} decl=${declarada}`)
          .toBeCloseTo((Math.min(a, b) / 2) * tan(theta), 9);
      }
      expect(longitudCumbrera({ tipo: "cuatro_aguas", a, b })).toBeCloseTo(Math.abs(a - b), 9);
    }
  });

  it('la cumbrera sale del lado largo, y con a = b no hay cumbrera', () => {
    expect(cumbreraLimatesa(30, 20)).toBe("X");
    expect(cumbreraLimatesa(20, 30)).toBe("Y");
    expect(longitudCumbrera({ tipo: "cuatro_aguas", a: 25, b: 25 })).toBe(0);
    expect(normalizarGeo({ a: 25, b: 25, hAlero: 6, theta: 25, tipo: "cuatro_aguas" }).piramide).toBe(true);
  });

  // No es una pirámide salvo que a = b. Con a ≠ b hay cumbrera de largo |a − b|.
  it('con a ≠ b hay cumbrera: NO es una pirámide', () => {
    const g = normalizarGeo({ a: 30, b: 20, hAlero: 6, theta: 25, tipo: "cuatro_aguas" });
    expect(g.piramide).toBe(false);
    expect(g.longitudCumbrera).toBeCloseTo(10, 9);
  });

  it('dos aguas y vertiente única no se tocan', () => {
    for (const [tipo, factor] of [["dos_aguas", 0.5], ["vertiente_unica", 1]]) {
      // Siguen usando la luz NORMAL a la cumbrera declarada, no el lado corto.
      expect(remonte({ tipo, theta: 25, a: 30, b: 20, cumbrera: "X" }))
        .toBeCloseTo(20 * factor * tan(25), 9);
      expect(longitudCumbrera({ tipo, a: 30, b: 20 })).toBe(null);
    }
  });
});

describe('un proyecto guardado con la cumbrera sobre el lado corto se reorienta', () => {
  // a = 20 < b = 30, así que la cumbrera tiene que ir según Y. El proyecto dice X.
  const viejo = { a: 20, b: 30, hAlero: 6, theta: 25, tipo: "cuatro_aguas", cumbrera: "X" };

  it('se corrige al normalizar y queda dicho de dónde venía', () => {
    const g = normalizarGeo(viejo);
    expect(g.cumbreraDeclarada).toBe("X");
    expect(g.cumbrera).toBe("Y");
    expect(g.cumbreraReorientada).toBe(true);
  });

  it('avisa en la traza, con el largo de cumbrera y el motivo', () => {
    const paso = mk(viejo, "Wx+").traza.find(t => t.paso === "Cumbrera reorientada");
    expect(paso).toBeTruthy();
    expect(paso.texto).toBe("X → Y");
    expect(paso.detalle).toMatch(/lado LARGO/);
    expect(paso.detalle).toMatch(/10,00 m/);
  });

  it('no avisa cuando la cumbrera declarada ya era la correcta', () => {
    const g = normalizarGeo({ ...viejo, cumbrera: "Y" });
    expect(g.cumbreraReorientada).toBe(false);
    expect(mk({ ...viejo, cumbrera: "Y" }, "Wx+").traza
      .find(t => t.paso === "Cumbrera reorientada")).toBeUndefined();
  });

  it('en la pirámide no hay nada que reorientar', () => {
    expect(normalizarGeo({ a: 25, b: 25, hAlero: 6, theta: 25, tipo: "cuatro_aguas",
      cumbrera: "Y" }).cumbreraReorientada).toBe(false);
  });

  // La reorientación CAMBIA el resultado: por eso lleva aviso y no pasa en silencio.
  it('da vuelta qué dirección se trata en faldones', () => {
    const g = normalizarGeo(viejo);
    expect(modoCubierta({ geo: g, dir: D["Wx+"] }).modo).toBe("faldones");
    expect(modoCubierta({ geo: g, dir: D["Wy+"] }).modo).toBe("franjas");
  });
});

describe('la silueta del limatesa, exacta', () => {
  // ── EL CONTORNO REAL, INTEGRADO ───────────────────────────────────────────────
  // Limatesa de pendiente uniforme: la altura crece con la distancia al alero MÁS CERCANO
  // de los cuatro. Es la «transformada de distancia», que es lo que produce las cuatro
  // limatesas a 45° en planta. No comparte nada con `fachadas.js`.
  const contorno = (g, dir) => {
    const r = g.hCumbre - g.hAlero;
    const tanT = r / (Math.min(g.a, g.b) / 2);
    const techo = (x, y) => g.hAlero
      + Math.min(r, tanT * Math.min(x, g.a - x, y, g.b - y));
    const ancho = dir.eje === "X" ? g.b : g.a;
    const largo = dir.eje === "X" ? g.a : g.b;
    const N = 2000, M = 400;
    let area = 0, mom = 0;
    for (let i = 0; i < N; i++) {
      const u = ancho * (i + 0.5) / N;
      let z = 0;
      for (let k = 0; k <= M; k++) {
        const v = largo * k / M;
        const [x, y] = dir.eje === "X" ? [v, u] : [u, v];
        z = Math.max(z, techo(x, y));
      }
      area += z * (ancho / N);
      mom += (z * z / 2) * (ancho / N);
    }
    return { area, zBar: mom / area };
  };

  for (const [a, b] of [[30, 20], [20, 30], [40, 12], [25, 25]]) {
    const g = normalizarGeo({ a, b, hAlero: 6, theta: 25, tipo: "cuatro_aguas" });
    for (const dir of DIRECCIONES) {
      it(`${a} × ${b} — ${dir.id}`, () => {
        const sil = siluetaProyectada(g, dir);
        const real = contorno(g, dir);
        const areaMod = sil.pared + sil.cubierta;
        const momMod = sil.pared * sil.zBarPared
          + (sil.cubierta > 0 ? sil.cubierta * sil.zBarCubierta : 0);
        // TOLERANCIA EXACTA: ya no es cota superior. Lo que queda es el error de la
        // discretización del contorno, no una holgura del modelo.
        expect(areaMod, `área ${a}×${b} ${dir.id}`).toBeCloseTo(real.area, 1);
        expect(momMod / areaMod, `baricentro ${a}×${b} ${dir.id}`).toBeCloseTo(real.zBar, 2);
      });
    }
  }

  it('sobre el alero es el trapecio (B + Lc)/2·r', () => {
    const g = normalizarGeo({ a: 30, b: 20, hAlero: 6, theta: 25, tipo: "cuatro_aguas" });
    const sil = siluetaProyectada(g, D["Wy+"]);       // normal a la cumbrera (X)
    const r = g.hCumbre - g.hAlero;
    expect(sil.Lc).toBeCloseTo(10, 9);
    expect(sil.cubierta).toBeCloseTo((sil.B + 10) / 2 * r, 9);
    // Y el baricentro del trapecio: (r/3)·(B + 2Lc)/(B + Lc).
    expect(sil.zBarCubierta)
      .toBeCloseTo(g.hAlero + (r / 3) * (sil.B + 20) / (sil.B + 10), 9);
  });
});

describe('la componente horizontal usa el área trapecial de los faldones', () => {
  // Los triángulos de punta inclinan TRANSVERSALMENTE al viento: su componente horizontal
  // va según el otro eje y se cancela entre sí. El levantamiento, en cambio, sigue sobre
  // la media planta entera.
  const base = { a: 30, b: 20, hAlero: 6, theta: 25 };

  it('H de cuatro aguas = H de dos aguas × (B + Lc)/(2B)', () => {
    for (const theta of [15, 25, 35]) {
      // Las dos geometrías comparten remonte, h y h/L, así que comparten los Cp: lo único
      // que cambia es el área que empuja.
      const dos = mk({ ...base, theta, tipo: "dos_aguas", cumbrera: "X" }, "Wy+");
      const cua = mk({ ...base, theta, tipo: "cuatro_aguas" }, "Wy+");
      expect(cua.geo.h, `θ=${theta}`).toBeCloseTo(dos.geo.h, 9);
      const factor = (cua.B + cua.geo.longitudCumbrera) / (2 * cua.B);
      expect(aporteCubierta({ analisis: cua }).H, `θ=${theta}`)
        .toBeCloseTo(aporteCubierta({ analisis: dos }).H * factor, 6);
    }
  });

  it('el levantamiento NO lleva ese factor: la succión de las puntas también levanta', () => {
    const dos = mk({ ...base, tipo: "dos_aguas", cumbrera: "X" }, "Wy+");
    const cua = mk({ ...base, tipo: "cuatro_aguas" }, "Wy+");
    expect(aporteCubierta({ analisis: cua }).V).toBeCloseTo(aporteCubierta({ analisis: dos }).V, 6);
  });

  it('en la pirámide el factor es 1/2', () => {
    const p = mk({ a: 25, b: 25, hAlero: 6, theta: 25, tipo: "cuatro_aguas" }, "Wy+");
    for (const parte of aporteCubierta({ analisis: p }).partes) {
      expect(parte.factorH, parte.id).toBeCloseTo(0.5, 9);
    }
  });

  it('en dos aguas y vertiente única el factor es 1', () => {
    for (const geo of [{ ...base, tipo: "dos_aguas", cumbrera: "X" },
      { ...base, tipo: "vertiente_unica", cumbrera: "X", pendienteHacia: "+Y" }]) {
      for (const parte of aporteCubierta({ analisis: mk(geo, "Wy+") }).partes) {
        expect(parte.factorH, `${geo.tipo} ${parte.id}`).toBe(1);
      }
    }
  });
});
