// ENVOLVENTE DE CASOS DE CARGA — Figura 2.4-8 y exención del art. 2.4.7.
import { describe, it, expect } from 'vitest';
import { analizarDireccion, DIRECCIONES } from '../src/engine/edificio.js';
import { aporteParedes, aporteCubierta } from '../src/engine/resultantes.js';
import { CASOS_CARGA, CASOS_NOTA3, SIGNOS_GCPI, E_RIGIDA, excentricidad,
  exencion247, baseDireccion, envolventeCubierta, estadosDeCarga, envolventeCritica,
  CONDICIONES_247_2, ARTICULOS_247_DECLARADOS, DIAFRAGMAS } from '../src/engine/envolvente.js';

const D = Object.fromEntries(DIRECCIONES.map(d => [d.id, d]));
const SITIO = { V: 55.1, exposicion: "B", kd: 0.85, Kzt: 1.0, altitud: 0, usarKe: false };
// Galpón de control: planta claramente rectangular, para que las dos direcciones
// zonifiquen la cubierta de maneras distintas y la nota 2 tenga algo que decir.
const GEO = { a: "20", b: "40", hAlero: "6", theta: "0", tipo: "plana", cumbrera: "X" };
const ENT = { geo: GEO, sitio: SITIO, cerramiento: "cerrado", G: 0.85 };
const barrer = (opc = {}, entrada = ENT) =>
  estadosDeCarga({ analizar: analizarDireccion, entrada, opc });

describe('los cuatro casos de la Figura 2.4-8', () => {
  it('son cuatro, con los factores de pared de la figura', () => {
    expect(CASOS_CARGA.map(c => c.n)).toEqual([1, 2, 3, 4]);
    expect(CASOS_CARGA.map(c => c.factorPared)).toEqual([1.0, 0.75, 0.75, 0.563]);
    expect(CASOS_CARGA.filter(c => c.torsion).map(c => c.n)).toEqual([2, 4]);
    expect(CASOS_CARGA.filter(c => c.simultaneo).map(c => c.n)).toEqual([3, 4]);
  });

  // ⚠ ES LA TRAMPA DE LA FIGURA. Leyendo «75 % en los dos ejes» uno le pone 0,75 a todo;
  // la nota 2 deja la cubierta al 100 % de la presión del caso base sobre cada área.
  it('en los casos 3 y 4 la cubierta NO lleva el factor de las paredes', () => {
    const c3 = CASOS_CARGA[2], c4 = CASOS_CARGA[3];
    expect(c3.factorCubierta).toBe(1.0);
    expect(c3.factorCubierta).toBeGreaterThan(c3.factorPared);
    expect(c4.factorCubierta).toBe(0.75);
    expect(c4.factorCubierta).toBeGreaterThan(c4.factorPared);
    // Y el caso base del que sale cada uno: el 3 del 1, el 4 del 2.
    expect(c3.base).toBe(1);
    expect(c4.base).toBe(2);
    expect(c3.factorCubierta).toBe(CASOS_CARGA[c3.base - 1].factorCubierta);
    expect(c4.factorCubierta).toBe(CASOS_CARGA[c4.base - 1].factorCubierta);
  });

  it('el caso 2 es el 75 % del 1 en corte, paredes y cubierta juntas', () => {
    const es = barrer({ exentoArt247: false });
    const igual = (a, b) => a.dirs.join() === b.dirs.join()
      && a.casoInterno === b.casoInterno && a.casoNota3 === b.casoNota3;
    for (const e2 of es.filter(e => e.caso === 2 && e.eSigno === +1)) {
      const e1 = es.find(e => e.caso === 1 && igual(e, e2));
      expect(e2.cortante).toBeCloseTo(0.75 * e1.cortante, 9);
      expect(e2.levantamiento).toBeCloseTo(0.75 * e1.levantamiento, 9);
    }
  });
});

describe('la envolvente de cubierta por área — nota 2', () => {
  // La cubierta plana de control tiene franjas de 0 a h/2, h/2 a h, h a 2h y 2h en
  // adelante: las dos direcciones cortan la planta en franjas ORTOGONALES, y la
  // envolvente por área no es ninguna de las dos.
  const bDe = (id, casoNota3 = "negativo") =>
    baseDireccion(analizarDireccion(ENT, D[id]), { casoNota3, casoInterno: "conInternaPos" });

  it('cubre la planta entera, sin huecos ni solapes', () => {
    const bx = bDe("Wx+"), by = bDe("Wy+");
    const env = envolventeCubierta(bx, by);
    const area = env.celdas.reduce((a, c) => a + c.area, 0);
    expect(area).toBeCloseTo(bx.L * by.L, 6);
  });

  it('es MAYOR que el levantamiento de cualquiera de las dos direcciones sola', () => {
    const bx = bDe("Wx+"), by = bDe("Wy+");
    const env = envolventeCubierta(bx, by);
    // Cada dirección sola integra su propia zonificación sobre la planta entera.
    expect(env.V).toBeGreaterThan(bx.Vcub);
    expect(env.V).toBeGreaterThan(by.Vcub);
    // Y estrictamente mayor, no igual: si fueran iguales el test no distinguiría la
    // envolvente por área de quedarse con el mayor de los dos totales.
    expect(env.V).toBeGreaterThan(1.001 * Math.max(bx.Vcub, by.Vcub));
  });

  // Caso a mano, con la cuenta escrita: es el único que distingue la envolvente POR ÁREA
  // de quedarse con el mayor de los dos totales, que es el error que la nota 2 induce.
  //
  //   según X:  0–10 m → −1000 Pa   ·  10–20 m → −400 Pa
  //   según Y:  0–30 m → −600 Pa
  //   por área: (0–10)×(0–30) → 1000  ·  (10–20)×(0–30) → 600
  it('toma el mayor por celda, no el mayor de los dos totales', () => {
    const bx = { L: 20, signo: +1, zonas: [{ u0: 0, u1: 10, p: -1000 },
      { u0: 10, u1: 20, p: -400 }] };
    const by = { L: 30, signo: +1, zonas: [{ u0: 0, u1: 30, p: -600 }] };
    const env = envolventeCubierta(bx, by);
    const totalX = 1000 * 10 * 30 + 400 * 10 * 30;   // 420 000 N
    const totalY = 600 * 20 * 30;                    // 360 000 N
    expect(env.V).toBeCloseTo(1000 * 10 * 30 + 600 * 10 * 30, 6);   // 480 000 N
    expect(env.V).toBeGreaterThan(Math.max(totalX, totalY));
    // El centroide se corre hacia la franja más succionada, que es la de barlovento de X.
    expect(env.xBar).toBeCloseTo(8.75, 9);
    expect(env.yBar).toBeCloseTo(15, 9);
  });

  it('nunca queda por debajo de ninguna de las dos direcciones', () => {
    // La envolvente por celda es el máximo término a término, así que integrada no puede
    // dar menos que ninguna de las dos. Vale para cualquier zonificación.
    const bx = { L: 20, signo: +1, zonas: [{ u0: 0, u1: 6, p: -900 },
      { u0: 6, u1: 20, p: 200 }] };
    const by = { L: 30, signo: +1, zonas: [{ u0: 0, u1: 12, p: -300 },
      { u0: 12, u1: 30, p: -700 }] };
    const env = envolventeCubierta(bx, by);
    const total = (b, ancho) => b.zonas.reduce((a, z) => a - z.p * (z.u1 - z.u0) * ancho, 0);
    expect(env.V).toBeGreaterThanOrEqual(total(bx, by.L) - 1e-9);
    expect(env.V).toBeGreaterThanOrEqual(total(by, bx.L) - 1e-9);
  });

  // ⚠ LA COORDENADA DE LAS ZONAS ES DEL EJE, NO DEL VIENTO. `aporteCubierta` las
  // devuelve medidas desde el borde de BARLOVENTO, que con viento negativo es el extremo
  // lejano del eje. Sin dar vuelta la coordenada, la grilla del producto cruzaría las
  // franjas equivocadas y la envolvente por área saldría de celdas que no se superponen.
  it('las zonas se dan vuelta con el sentido del viento', () => {
    const mas = bDe("Wx+"), menos = bDe("Wx-");
    expect(mas.L).toBeCloseTo(menos.L, 9);
    // Con viento +X la primera zona arranca en el origen del eje; con −X, termina en L.
    expect(Math.min(...mas.zonas.map(z => z.u0))).toBeCloseTo(0, 9);
    expect(Math.max(...mas.zonas.map(z => z.u1))).toBeCloseTo(mas.L, 9);
    expect(mas.zonas[0].u0).toBeCloseTo(0, 9);
    expect(menos.zonas[0].u1).toBeCloseTo(menos.L, 9);
    // Y son la imagen especular una de la otra: misma presión, posición reflejada.
    for (let i = 0; i < mas.zonas.length; i++) {
      expect(menos.zonas[i].u1).toBeCloseTo(mas.L - mas.zonas[i].u0, 9);
      expect(menos.zonas[i].u0).toBeCloseTo(mas.L - mas.zonas[i].u1, 9);
    }
  });

  it('el centroide de la envolvente cae dentro de la planta', () => {
    const bx = bDe("Wx+"), by = bDe("Wy+");
    const env = envolventeCubierta(bx, by);
    expect(env.xBar).toBeGreaterThan(0);
    expect(env.xBar).toBeLessThan(bx.L);
    expect(env.yBar).toBeGreaterThan(0);
    expect(env.yBar).toBeLessThan(by.L);
  });
});

describe('el barrido', () => {
  it('recorre los dos signos de GC_pi y los dos casos de la nota 3', () => {
    const es = barrer();
    // ⚠ CONTRA LOS LITERALES, no contra `SIGNOS_GCPI`. Comparar la constante consigo
    // misma deja pasar que se le saque un signo: el test seguiría en verde con la mitad
    // del barrido, que es justo lo que este módulo existe para no hacer.
    expect(new Set(es.map(e => e.casoInterno)))
      .toEqual(new Set(["conInternaPos", "conInternaNeg"]));
    expect(SIGNOS_GCPI).toEqual(["conInternaPos", "conInternaNeg"]);
    expect(CASOS_NOTA3).toEqual(["negativo", "positivo"]);
    // En los casos por eje el caso de la nota 3 es uno solo; en los simultáneos son los
    // dos ejes, y nada obliga a que adopten el mismo.
    const porEje = new Set(es.filter(e => e.dirs.length === 1).map(e => e.casoNota3));
    expect(porEje).toEqual(new Set(CASOS_NOTA3));
    const simult = new Set(es.filter(e => e.dirs.length === 2).map(e => e.casoNota3));
    expect(simult.size).toBe(4);
    expect(simult.has("negativo/positivo")).toBe(true);
  });

  it('los casos torsionales llevan los dos signos de la excentricidad', () => {
    const es = barrer();
    for (const n of [2, 4])
      expect(new Set(es.filter(e => e.caso === n).map(e => e.eSigno))).toEqual(new Set([+1, -1]));
    // Y los no torsionales no llevan ninguno: un `eSigno` en un caso sin torsión
    // duplicaría estados idénticos.
    for (const n of [1, 3])
      expect(es.filter(e => e.caso === n).every(e => e.eSigno === null)).toBe(true);
  });

  it('el corte de los casos simultáneos compone las dos componentes', () => {
    for (const e of barrer().filter(x => x.dirs.length === 2)) {
      expect(e.Vx).toBeGreaterThan(0);
      expect(e.Vy).toBeGreaterThan(0);
      expect(e.cortante).toBeCloseTo(Math.hypot(e.Vx, e.Vy), 9);
      // Compuesto es MAYOR que cualquiera de las dos componentes: es la razón por la que
      // los casos 3 y 4 existen y no alcanza con mirar un eje por vez.
      expect(e.cortante).toBeGreaterThan(Math.max(e.Vx, e.Vy));
    }
  });

  // ⚠ ES EL BUG QUE TENÍA LA PRIMERA VERSIÓN. Elegía para la cubierta el caso de la nota
  // 3 que gobernaba el CORTE y con ese armaba también el levantamiento: el estado no era
  // ninguno de los dos y podía subestimar la magnitud que el otro caso agrava.
  it('el levantamiento no queda atado al caso de la nota 3 que gobierna el corte', () => {
    const geo = { a: "20", b: "40", hAlero: "6", theta: "30",
      tipo: "dos_aguas", cumbrera: "X" };
    const ent = { ...ENT, geo };
    const es = barrer({}, ent);
    const maxV = Math.max(...es.map(e => Math.abs(e.levantamiento)));
    // El mismo barrido restringido a un solo caso de la nota 3 tiene que dar MENOS o
    // igual: si diera lo mismo en los dos, el barrido no estaría aportando nada.
    const soloUno = CASOS_NOTA3.map(n3 => Math.max(...es
      .filter(e => e.casoNota3.split("/").every(x => x === n3))
      .map(e => Math.abs(e.levantamiento))));
    expect(Math.max(...soloUno)).toBeLessThanOrEqual(maxV + 1e-9);
    expect(Math.min(...soloUno)).toBeLessThan(maxV);
  });

  it('los dos signos de GC_pi dan levantamientos distintos, y el barrido toma el mayor', () => {
    const es = barrer();
    const maxDe = (sig) => Math.max(...es.filter(e => e.casoInterno === sig)
      .map(e => Math.abs(e.levantamiento)));
    const pos = maxDe("conInternaPos"), neg = maxDe("conInternaNeg");
    expect(pos).not.toBeCloseTo(neg, 3);
    expect(envolventeCritica(es).levantamiento.valor).toBeCloseTo(Math.max(pos, neg), 6);
  });
});

describe('el momento torsor', () => {
  const eDe = (B) => E_RIGIDA * B;

  it('en el caso 2 es 0,75·F_paredes·e de ESE eje', () => {
    const es = barrer().filter(e => e.caso === 2 && e.eSigno === +1 && e.dirs[0] === "Wx+");
    const an = analizarDireccion(ENT, D["Wx+"]);
    const F = aporteParedes({ analisis: an }).F;
    for (const e of es) expect(e.MT).toBeCloseTo(0.75 * F * eDe(an.B), 6);
  });

  // La expresión de la figura es M_T = f·(P_W + P_L)·B·e POR UNIDAD DE ALTURA. Integrar
  // presiones por B sobre la altura ES la fuerza total de las paredes, así que el momento
  // total sale de la fuerza total: no hace falta integrar el torsor aparte.
  it('sale de la fuerza total de las paredes, que es la integral de (P_W+P_L)·B', () => {
    const an = analizarDireccion(ENT, D["Wx+"]);
    const par = aporteParedes({ analisis: an });
    expect(par.F).toBeCloseTo(par.barlovento + par.sotavento, 9);
    const e = barrer().find(x => x.caso === 2 && x.eSigno === +1 && x.dirs[0] === "Wx+");
    expect(e.MT).toBeCloseTo(0.75 * (par.barlovento + par.sotavento) * eDe(an.B), 6);
  });

  // ⚠ LO QUE LE FALTABA AL CÓDIGO VIEJO. `momentoTorsor` cubría un solo eje; el caso 4
  // tiene los dos a la vez y sus torsiones SUMAN.
  it('en el caso 4 suman los dos ejes', () => {
    const e4 = barrer().find(x => x.caso === 4 && x.eSigno === +1
      && x.dirs.join() === "Wx+,Wy+" && x.casoNota3 === "negativo/negativo");
    const ax = analizarDireccion(ENT, D["Wx+"]), ay = analizarDireccion(ENT, D["Wy+"]);
    const Fx = aporteParedes({ analisis: ax }).F, Fy = aporteParedes({ analisis: ay }).F;
    const esperado = 0.563 * (Fx * eDe(ax.B) + Fy * eDe(ay.B));
    expect(e4.MT).toBeCloseTo(esperado, 6);
    // Y es estrictamente mayor que cualquiera de los dos términos solos: un caso 4 que
    // cubriera un eje nada más daría alguno de estos dos.
    expect(Math.abs(e4.MT)).toBeGreaterThan(Math.abs(0.563 * Fx * eDe(ax.B)));
    expect(Math.abs(e4.MT)).toBeGreaterThan(Math.abs(0.563 * Fy * eDe(ay.B)));
    expect(e4.excentricidades.map(x => x.eje)).toEqual(["X", "Y"]);
  });

  it('los dos signos de e dan el mismo módulo y signos opuestos', () => {
    const es = barrer();
    const mismo = (a, b) => a.caso === b.caso && a.dirs.join() === b.dirs.join()
      && a.casoInterno === b.casoInterno && a.casoNota3 === b.casoNota3;
    for (const e of es.filter(x => x.eSigno === +1)) {
      const op = es.find(x => x.eSigno === -1 && mismo(x, e));
      expect(op.MT).toBeCloseTo(-e.MT, 9);
    }
  });

  it('los casos sin torsión tienen M_T nulo', () => {
    for (const e of barrer().filter(x => x.caso === 1 || x.caso === 3)) {
      expect(e.MT).toBe(0);
      expect(e.excentricidades).toBeNull();
    }
  });
});

describe('la excentricidad', () => {
  it('en estructura rígida es 0,15·B, sin aviso', () => {
    const x = excentricidad({ B: 30, flexible: false });
    expect(x.e).toBeCloseTo(0.15 * 30, 12);
    expect(x.aproximada).toBe(false);
    expect(x.ref).not.toMatch(/2\.4-5/);
  });

  // La (2.4-5) no está transcripta. El valor que se adopta mientras tanto es el de
  // rígidas, que PUEDE QUEDAR DEL LADO INSEGURO, y el aviso es lo único que lo dice.
  it('en estructura flexible avisa que la (2.4-5) no está transcripta', () => {
    const x = excentricidad({ B: 30, flexible: true });
    expect(x.e).toBeCloseTo(0.15 * 30, 12);
    expect(x.aproximada).toBe(true);
    expect(x.ref).toMatch(/2\.4-5/);
    expect(x.nota).toMatch(/INSEGURO/);
  });

  it('los estados de una estructura flexible arrastran el aviso', () => {
    const e = barrer({ flexible: true }).find(x => x.caso === 2);
    expect(e.excentricidades.every(x => x.aproximada)).toBe(true);
    const rig = barrer({ flexible: false }).find(x => x.caso === 2);
    expect(rig.excentricidades.every(x => x.aproximada)).toBe(false);
    // El VALOR es el mismo: lo que cambia es que uno está declarado como aproximado.
    expect(e.MT).toBeCloseTo(rig.MT, 9);
  });
});

describe('la exención del art. 2.4.7', () => {
  it('sin declaración no exime: se barren los cuatro casos', () => {
    const x = exencion247({ h: 6 });
    expect(x.exento).toBe(false);
    const es = barrer({ exentoArt247: false });
    expect(new Set(es.map(e => e.caso))).toEqual(new Set([1, 2, 3, 4]));
  });

  it('declarada, quedan SÓLO los casos 1 y 3', () => {
    const es = barrer({ exentoArt247: true });
    expect(new Set(es.map(e => e.caso))).toEqual(new Set([1, 3]));
    expect(es.every(e => e.MT === 0)).toBe(true);
    expect(envolventeCritica(es).conTorsion).toBe(false);
    // Y el barrido completo sí los tiene: si `conTorsion` fuera siempre false, la
    // pantalla no podría distinguir «torsión nula» de «torsión no verificada».
    expect(envolventeCritica(barrer()).conTorsion).toBe(true);
  });

  it('una planta con h ≤ 10 m exime; con h > 10 m la geometría la desmiente', () => {
    const ok = exencion247({ cond247: ["una_planta"], fundamento: "galpón de una nave", h: 6 });
    expect(ok.exento).toBe(true);
    expect(ok.desmentidas).toHaveLength(0);
    const no = exencion247({ cond247: ["una_planta"], fundamento: "galpón de una nave", h: 12 });
    expect(no.exento).toBe(false);
    expect(no.desmentidas.map(x => x.id)).toEqual(["una_planta"]);
    // Justo en el límite la condición se cumple: el artículo dice h ≤ 10 m.
    expect(exencion247({ cond247: ["una_planta"], h: 10 }).desmentidas).toHaveLength(0);
    expect(exencion247({ cond247: ["una_planta"], h: 10.001 }).desmentidas).toHaveLength(1);
  });

  it('las condiciones que la app no puede verificar no se desmienten nunca', () => {
    for (const id of ["dos_livianas", "dos_flexibles"]) {
      const x = exencion247({ cond247: [id], fundamento: "declarado", h: 40 });
      expect(x.exento).toBe(true);
      expect(x.desmentidas).toHaveLength(0);
      expect(x.detalle.find(c => c.id === id).geo).toBeNull();
    }
  });

  it('los art. 2.4.7.3 a 2.4.7.5 eximen por declaración, con su cita', () => {
    expect(ARTICULOS_247_DECLARADOS.map(a => a.ref))
      .toEqual(["art. 2.4.7.3", "art. 2.4.7.4", "art. 2.4.7.5"]);
    for (const a of ARTICULOS_247_DECLARADOS) {
      const x = exencion247({ arts247: [a.id], fundamento: "informe X", h: 40 });
      expect(x.exento).toBe(true);
      expect(x.arts.find(y => y.id === a.id).declarada).toBe(true);
    }
  });

  it('una exención sin fundamento se marca', () => {
    expect(exencion247({ cond247: ["una_planta"], h: 6 }).sinFundamento).toBe(true);
    expect(exencion247({ cond247: ["una_planta"], fundamento: " ", h: 6 }).sinFundamento).toBe(true);
    expect(exencion247({ cond247: ["una_planta"], fundamento: "una nave", h: 6 })
      .sinFundamento).toBe(false);
    // Sin exención no hay nada que fundamentar: el aviso sería ruido en cada proyecto.
    expect(exencion247({ h: 6 }).sinFundamento).toBe(false);
  });

  it('las tres condiciones del 2.4.7.2 citan el artículo', () => {
    expect(CONDICIONES_247_2).toHaveLength(3);
    for (const cd of CONDICIONES_247_2) expect(cd.ref).toBe("art. 2.4.7.2");
  });
});

describe('la nota 4 — cómo se aplica M_T', () => {
  it('con diafragma rígido el momento se aplica como tal', () => {
    const es = barrer({ diafragma: "rigido" });
    expect(es.every(e => e.comoBloque === false)).toBe(true);
    expect(envolventeCritica(es).comoBloque).toBe(false);
  });

  it('sin diafragma rígido los casos torsionales van como bloque distribuido', () => {
    for (const dia of ["flexible", "sin"]) {
      const es = barrer({ diafragma: dia });
      expect(es.filter(e => e.caso === 2 || e.caso === 4).every(e => e.comoBloque)).toBe(true);
      // Los casos sin torsión no tienen nada que repartir.
      expect(es.filter(e => e.caso === 1 || e.caso === 3).every(e => !e.comoBloque)).toBe(true);
      expect(envolventeCritica(es).comoBloque).toBe(true);
    }
  });

  it('el VALOR de M_T no depende del diafragma', () => {
    const a = barrer({ diafragma: "rigido" }), b = barrer({ diafragma: "flexible" });
    expect(a.map(e => e.MT)).toEqual(b.map(e => e.MT));
  });

  it('los tres comportamientos están declarados con su nota', () => {
    expect(DIAFRAGMAS.map(x => x.id)).toEqual(["rigido", "flexible", "sin"]);
    for (const x of DIAFRAGMAS) expect(x.nota).toMatch(/Nota 4/);
  });
});

describe('la envolvente crítica', () => {
  it('cada magnitud sale de un estado que existe en el barrido', () => {
    const es = barrer();
    const env = envolventeCritica(es);
    for (const k of ["cortante", "levantamiento", "vuelco", "torsion"]) {
      expect(es).toContain(env[k].estado);
      const campo = k === "torsion" ? "MT" : k;
      expect(Math.abs(env[k].valor)).toBeCloseTo(
        Math.max(...es.map(e => Math.abs(e[campo]))), 6);
      expect(env[k].valor).toBe(env[k].estado[campo]);
    }
  });

  // El levantamiento de la envolvente tiene que superar al de cualquier dirección sola:
  // es lo que la nota 2 agrega y la razón por la que esta pantalla existe.
  it('el levantamiento supera al de cualquier dirección por separado', () => {
    const es = barrer();
    const solas = Math.max(...es.filter(e => e.dirs.length === 1)
      .map(e => Math.abs(e.levantamiento)));
    const todos = envolventeCritica(es).levantamiento;
    expect(Math.abs(todos.valor)).toBeGreaterThan(solas);
    expect(todos.estado.dirs).toHaveLength(2);
    expect(todos.estado.brazo.porArea).toBe(true);
  });

  // ⚠ EL BRAZO SE MIDE DESDE EL BORDE DE BARLOVENTO, NO DESDE EL ORIGEN DEL EJE. El
  // centroide de la envolvente por área sale en coordenada del eje; el vuelco lo necesita
  // referido a barlovento, que con viento negativo está en el otro extremo. Medirlo mal
  // no rompe nada visible: da un vuelco plausible, con el brazo espejado.
  it('el brazo del levantamiento se mide desde barlovento', () => {
    // El edificio de control es simétrico según X, así que los dos sentidos del eje
    // tienen que dar el MISMO brazo medido desde su propio barlovento —y darían
    // distinto si se midiera desde el origen, porque el centroide no cae en L/2—.
    const de = (dx) => barrer().find(e => e.caso === 3 && e.dirs.join() === `${dx},Wy+`
      && e.casoNota3 === "negativo/negativo" && e.casoInterno === "conInternaPos");
    const mas = de("Wx+"), menos = de("Wx-");
    expect(menos.brazo.x).toBeCloseTo(mas.brazo.x, 9);
    expect(menos.Mx).toBeCloseTo(mas.Mx, 6);
    // Y el centroide NO cae en el medio del eje: si cayera, medir desde el origen o
    // desde barlovento daría lo mismo y el test no distinguiría nada.
    expect(Math.abs(mas.brazo.x - 20 / 2)).toBeGreaterThan(0.5);
  });

  it('la nota 7 pone un piso al corte de cada eje por separado', () => {
    // ⚠ CON θ = 30° EL PISO NO SE ACTIVA NUNCA y el test no probaría nada: a esa
    // pendiente las componentes horizontales de los dos faldones suman al corte. Hace
    // falta una cubierta POCO inclinada, donde la succión del faldón a barlovento tira
    // hacia atrás. Con θ = 10° el piso gobierna en 60 de los 144 estados.
    const geo = { a: "20", b: "40", hAlero: "6", theta: "10", tipo: "dos_aguas", cumbrera: "X" };
    const ent = { ...ENT, geo };
    const con = barrer({ porticosCubierta: false }, ent);
    const sin = barrer({ porticosCubierta: true }, ent);
    for (let i = 0; i < con.length; i++)
      expect(con[i].cortante).toBeGreaterThanOrEqual(sin[i].cortante - 1e-9);
    // Y en alguno tiene que ser ESTRICTAMENTE mayor, o el piso no se estaría aplicando.
    const activos = con.filter((e, i) => e.cortante > sin[i].cortante + 1e-6);
    expect(activos.length).toBeGreaterThan(0);
    // El piso es el de las paredes solas de ese eje, escalado por el factor del caso.
    for (const e of activos.filter(x => x.dirs.length === 1)) {
      const b = baseDireccion(analizarDireccion(ent, D[e.dirs[0]]),
        { casoNota3: e.casoNota3, casoInterno: e.casoInterno });
      expect(e.cortante).toBeCloseTo(e.factorPared * b.Fpar, 6);
      expect(e.cortante).toBeGreaterThan(e.factorPared * b.Fpar + e.factorCubierta * b.Hcub);
    }
  });
});

describe('el piso solidario llega a la envolvente', () => {
  // Es una declaración que baja el levantamiento global hasta la mitad. Si no viajara
  // hasta acá, la pantalla de resultantes y la envolvente informarían números distintos
  // para el mismo edificio.
  it('baja el levantamiento de todos los estados', () => {
    const con = envolventeCritica(barrer({ pisoSolidario: true }));
    const sin = envolventeCritica(barrer({ pisoSolidario: false }));
    expect(Math.abs(con.levantamiento.valor)).toBeLessThan(Math.abs(sin.levantamiento.valor));
  });
});

describe('consistencia con el motor de una dirección', () => {
  // El caso 1 de un eje solo tiene que dar EXACTAMENTE lo que da `aporteCubierta` para
  // esa dirección y ese caso: si divergen, la memoria informa un levantamiento que el
  // motor de presiones nunca calculó.
  it('el caso 1 de una dirección reproduce el aporte de cubierta', () => {
    for (const id of Object.keys(D)) for (const n3 of CASOS_NOTA3) {
      const an = analizarDireccion(ENT, D[id]);
      const cub = aporteCubierta({ analisis: an, casoNota3: n3, casoInterno: "conInternaPos" });
      const e = barrer().find(x => x.caso === 1 && x.dirs[0] === id
        && x.casoNota3 === n3 && x.casoInterno === "conInternaPos");
      expect(e.levantamiento).toBeCloseTo(cub.V, 9);
    }
  });
});
