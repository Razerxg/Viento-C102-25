// RESULTANTES EN LA BASE.
//
// Integrar presiones tiene tres trampas que no se ven en el número final, y cada una tiene
// su test: la presión interna se cancela en el corte pero NO en el levantamiento, la pared
// a barlovento hay que integrarla escalonada, y la nota 7 pone un piso al corte.
import { describe, it, expect } from 'vitest';
import { analizarDireccion, DIRECCIONES } from '../src/engine/edificio.js';
import { resultantes, aporteParedes, aporteCubierta, barridoAlero, envolvente } from '../src/engine/resultantes.js';
import { CP_PARED } from '../src/constants/presionesExternas.js';
import { cpSotavento } from '../src/engine/presiones.js';

const SITIO = { V: 55.1, exposicion: "B", kd: 0.85, Kzt: 1.0, altitud: 0, usarKe: false };
const ent = (geo, cerr = "cerrado") => ({ geo, sitio: SITIO, cerramiento: cerr, G: 0.85 });
const D = Object.fromEntries(DIRECCIONES.map(d => [d.id, d]));
const PLANA = { a: 20, b: 30, hAlero: 8, theta: 0, tipo: "plana", cumbrera: "X" };

describe('corte total', () => {
  const r = analizarDireccion(ent(PLANA), D["Wx+"]);

  // LA COMPROBACIÓN QUE VALE. El corte de paredes tiene forma cerrada cuando el edificio
  // es bajo y el perfil de q_z tiene un solo tramo: (0,8 + |Cp_sot|)·G·q·B·h. Si el motor
  // sumara la presión interna, este número no cerraría.
  // Por debajo de 5 m el perfil de q_z está CONGELADO, así que todos los tramos comparten
  // el mismo q y la integral tiene forma cerrada: (0,8 + |Cp_sot|)·G·q·B·h. No importa en
  // cuántos tramos esté partido —y por eso este test sobrevive a que cambie el número de
  // puntos—; lo que comprueba es que la integración no mete la presión interna.
  it('en la zona de q congelado coincide con la expresión cerrada, sin presión interna', () => {
    const bajo = analizarDireccion(ent({ ...PLANA, hAlero: 4.5 }), D["Wx+"]);
    const { B, geo, qh, G, L } = bajo;
    expect(new Set(bajo.perfil.map(t => t.q.toFixed(9))).size).toBe(1);   // un solo q
    const esperado = (CP_PARED.barlovento.cp + Math.abs(cpSotavento(L, B))) * G * qh * B * geo.hAlero;
    expect(aporteParedes({ analisis: bajo }).F).toBeCloseTo(esperado, 6);
  });

  // Si el corte incluyera la presión interna, cambiaría al cambiar el cerramiento. No debe.
  it('NO cambia con la clasificación de cerramiento: la presión interna se cancela', () => {
    const cerrado = analizarDireccion(ent(PLANA, "cerrado"), D["Wx+"]);
    const parcial = analizarDireccion(ent(PLANA, "parc_cerrado"), D["Wx+"]);
    expect(parcial.GCpi).not.toBe(cerrado.GCpi);                    // el dato sí cambió
    expect(resultantes(parcial).cortante).toBeCloseTo(resultantes(cerrado).cortante, 6);
  });

  // El levantamiento SÍ tiene que cambiar: en la cubierta no hay nada que compense la
  // presión interna, y es el término que decide una cubierta liviana.
  it('el levantamiento SÍ crece con un cerramiento más desfavorable', () => {
    const cerrado = resultantes(analizarDireccion(ent(PLANA, "cerrado"), D["Wx+"]));
    const parcial = resultantes(analizarDireccion(ent(PLANA, "parc_cerrado"), D["Wx+"]));
    expect(parcial.levantamiento).toBeGreaterThan(cerrado.levantamiento);
  });

  it('crece con la altura y con el cuadrado de la velocidad', () => {
    const c = (o) => resultantes(analizarDireccion(o, D["Wx+"])).cortante;
    expect(c(ent({ ...PLANA, hAlero: 16 }))).toBeGreaterThan(c(ent(PLANA)));
    const doble = { ...ent(PLANA), sitio: { ...SITIO, V: SITIO.V * 2 } };
    expect(c(doble) / c(ent(PLANA))).toBeCloseTo(4, 1);
  });
});

describe('la pared a barlovento se integra escalonada', () => {
  // ⚠ ESTE BLOQUE SE REESCRIBIÓ. La primera versión comparaba el corte escalonado contra
  // el de q_h con un `toBeLessThan` pelado. Bajo la mutación «usar q_h en todos los
  // tramos» los dos valores son MATEMÁTICAMENTE IGUALES, y diferían sólo en el último bit
  // —1318577,9135662117 contra 1318577,913566212—, así que el test pasaba por ruido de
  // punto flotante y no por la propiedad. Un test que decide por el bit 53 no decide nada.
  //
  // Ahora se acota por arriba Y por abajo con dos cotas físicas independientes: la fuerza
  // tiene que quedar estrictamente entre «q en la base por toda la altura» y «q en el tope
  // por toda la altura», porque q_z crece de forma monótona entre ambos.
  it('queda estrictamente entre las dos cotas de presión uniforme', () => {
    const alto = analizarDireccion(ent({ ...PLANA, hAlero: 40 }), D["Wx+"]);
    expect(alto.perfil.length).toBeGreaterThan(5);
    const { B, G, geo, qh, perfil } = alto;
    const cota = (q) => q * G * CP_PARED.barlovento.cp * B * geo.hAlero;
    const F = aporteParedes({ analisis: alto }).barlovento;
    expect(F).toBeGreaterThan(cota(perfil[0].q) * 1.05);   // por encima de la cota inferior
    expect(F).toBeLessThan(cota(qh) * 0.95);               // y por debajo de la superior
  });

  // El brazo por encima de h/2 no alcanza para distinguir «centro del tramo» de «tope del
  // tramo»: las dos dan un brazo alto. Lo que SÍ las separa es un caso de presión
  // uniforme, donde el centroide tiene que dar exactamente h/2. Se arma a mano un análisis
  // sintético con cuatro tramos de igual q: es una entrada controlada, independiente de
  // cómo el motor construye el perfil.
  it('con presión uniforme el centroide cae exactamente en h/2', () => {
    const h = 20, B = 30, G = 0.85, q = 1000;
    // Pared rectangular: el área de un tramo es B·dz y su momento estático B·(z₂²−z₁²)/2.
    // Se escriben a mano, no se piden a `fachadas.js`, para que la entrada siga siendo
    // independiente de cómo el motor arma la geometría.
    const tramos = [0, 5, 10, 15].map(z => ({ desde: z, hasta: z + 5, q,
      area: B * 5, momento: B * ((z + 5) ** 2 - z ** 2) / 2 }));
    const pared = { W: B, z1: h, z2: h, area: B * h, zTope: h, forma: "rectangulo" };
    const falso = { geo: { hAlero: h }, B, L: 20, qh: q, G,
      fachadas: { barlovento: pared, sotavento: pared, lateral: pared, lateral2: pared },
      superficies: [{ id: "pared_barlovento", tramos, fachada: pared }] };
    const par = aporteParedes({ analisis: falso });
    const mBar = par.M - par.sotavento * h / 2;
    expect(mBar / par.barlovento).toBeCloseTo(h / 2, 9);
  });

  it('el brazo real queda por encima de h/2, porque la presión pesa más arriba', () => {
    const alto = analizarDireccion(ent({ ...PLANA, hAlero: 40 }), D["Wx+"]);
    const par = aporteParedes({ analisis: alto });
    const mBar = par.M - par.sotavento * alto.geo.hAlero / 2;
    expect(mBar / par.barlovento).toBeGreaterThan(alto.geo.hAlero / 2);
  });
});

describe('cubierta', () => {
  it('una cubierta plana no aporta corte horizontal', () => {
    const r = analizarDireccion(ent(PLANA), D["Wx+"]);
    expect(aporteCubierta({ analisis: r }).H).toBeCloseTo(0, 9);
  });

  it('la succión de la cubierta levanta: el vertical sale positivo', () => {
    const r = analizarDireccion(ent(PLANA), D["Wx+"]);
    expect(aporteCubierta({ analisis: r }).V).toBeGreaterThan(0);
  });

  // NOTA 7. Con caballete, las componentes horizontales de los dos faldones se oponen y
  // pueden restar; la norma impone que el corte total no baje del de paredes solas.
  it('el corte nunca queda por debajo del de paredes solas (nota 7)', () => {
    for (const th of [10, 20, 30, 45]) {
      const r = analizarDireccion(ent({ ...PLANA, theta: th, tipo: "dos_aguas" }), D["Wy+"]);
      const res = resultantes(r);
      expect(res.cortante).toBeGreaterThanOrEqual(res.detalle.corteParedes - 1e-9);
    }
  });

  // Los dos faldones de un caballete tienen su normal inclinada en sentidos OPUESTOS, así
  // que sus componentes horizontales se restan. Si el motor las sumara en el mismo sentido
  // —un error de signo perfectamente plausible— el corte de cubierta se duplicaría en vez
  // de cancelarse, y ningún test de magnitud lo vería.
  it('las componentes horizontales de los dos faldones tienen signos opuestos', () => {
    const r = analizarDireccion(ent({ ...PLANA, theta: 30, tipo: "dos_aguas" }), D["Wy+"]);
    const { partes } = aporteCubierta({ analisis: r });
    expect(partes).toHaveLength(2);
    expect(Math.sign(partes[0].horizontal)).toBe(-Math.sign(partes[1].horizontal));
  });

  it('informa cuándo gobernó el piso de la nota 7, en vez de aplicarlo callado', () => {
    const casos = [10, 20, 30, 45].map(th =>
      resultantes(analizarDireccion(ent({ ...PLANA, theta: th, tipo: "dos_aguas" }), D["Wy+"])));
    for (const c of casos) expect(typeof c.gobiernaNota7).toBe("boolean");
  });
});

describe('barrido sobre la altura de alero', () => {
  const barrido = barridoAlero({ analizar: analizarDireccion, entrada: ent(PLANA),
    direccion: D["Wx+"], desde: 4, hasta: 30, pasos: 13 });

  it('devuelve un punto por paso, con la altura que se pidió', () => {
    expect(barrido).toHaveLength(14);
    expect(barrido[0].hAlero).toBe(4);
    expect(barrido.at(-1).hAlero).toBe(30);
  });

  // LO QUE EL GRÁFICO TIENE QUE MOSTRAR, y que no es evidente: el corte crece MÁS QUE
  // proporcionalmente con la altura —porque q_z también crece—, el vuelco se dispara
  // todavía más rápido, y el levantamiento casi no se mueve porque la cubierta no crece.
  it('el corte crece más que proporcionalmente con la altura', () => {
    const a = barrido[0], b = barrido.at(-1);
    expect(b.cortante / a.cortante).toBeGreaterThan(b.hAlero / a.hAlero);
  });

  it('el vuelco crece más rápido que el corte', () => {
    const a = barrido[0], b = barrido.at(-1);
    expect(b.vuelco / a.vuelco).toBeGreaterThan(b.cortante / a.cortante);
  });

  it('el levantamiento apenas se mueve: la cubierta no cambia de tamaño', () => {
    const a = barrido[0], b = barrido.at(-1);
    expect(b.levantamiento / a.levantamiento).toBeLessThan(b.cortante / a.cortante);
  });

  it('las tres magnitudes crecen monótonamente', () => {
    for (const k of ["cortante", "vuelco", "levantamiento"]) {
      for (let i = 1; i < barrido.length; i++) {
        expect(Math.abs(barrido[i][k])).toBeGreaterThan(Math.abs(barrido[i - 1][k]) - 1e-6);
      }
    }
  });
});

describe('envolvente de las cuatro direcciones', () => {
  const porDir = DIRECCIONES.map(d => barridoAlero({ analizar: analizarDireccion,
    entrada: ent(PLANA), direccion: d, desde: 4, hasta: 20, pasos: 8 }));
  const env = envolvente(porDir);

  // Mirar una sola dirección puede dejar afuera justo la que gobierna: en planta
  // rectangular la cara ancha recibe más corte que la angosta.
  it('toma el peor de las cuatro en cada altura', () => {
    env.forEach((e, i) => {
      const peor = Math.max(...porDir.map(d => d[i].cortante));
      expect(e.cortante).toBeCloseTo(peor, 6);
    });
  });

  it('en planta rectangular la envolvente supera estrictamente a alguna dirección', () => {
    const menor = Math.min(...porDir.map(d => d.at(-1).cortante));
    expect(env.at(-1).cortante).toBeGreaterThan(menor);
  });
});
