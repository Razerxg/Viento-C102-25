// LO QUE LA INTERFAZ PUEDE ROMPER EN SILENCIO.
//
// Un rediseño no tiene tests de aspecto: que una tarjeta se vea bien no se afirma en una
// expresión. Lo que sí se puede exigir es que las piezas que ENGANCHAN la interfaz con el
// resto no queden colgadas, y son justamente las que fallan sin decir nada:
//
//  · Un aviso que apunta a una pantalla que no existe pinta un punto en la barra lateral
//    de ninguna entrada y su botón «ir a» cae en la Guía. En pantalla se ve igual de bien.
//  · Un color declarado en un tema y no en el otro deja la variable CSS sin valor: en un
//    tema se ve y en el otro el elemento sale transparente o negro.
//  · Un nombre de pantalla escrito distinto en dos archivos —«Ráfaga» con y sin acento—
//    desactiva la mitad de la navegación sin ningún error en consola.
import { describe, it, expect } from 'vitest';
import { TEMAS, TONO, c, cssTemas } from '../src/components/tokens.js';
import { NAV, TABS, idxTab, SIN_DIRECCION, SIN_FICHA, PASOS } from '../src/constants/tabs.js';
import { avisosDe, porTab, contar, rotuloConteo } from '../src/lib/avisos.js';
import { normalizarGeo, analizarDireccion, DIRECCIONES } from '../src/engine/edificio.js';
import { factorRafaga, dimensionesDe } from '../src/engine/factorRafaga.js';
import { resultantes } from '../src/engine/resultantes.js';
import { kdDe } from '../src/constants/direccionalidad.js';
import { CERRAMIENTOS, nombreCerramiento } from '../src/constants/presionInterna.js';

describe('tokens de color', () => {
  it('los dos temas declaran exactamente las mismas claves', () => {
    // Si falta una en uno de los dos, `var(--vw-loQueSea)` no resuelve y el elemento se
    // pinta con el valor inicial de la propiedad. No hay error: simplemente, en ese tema
    // el borde desaparece o el texto queda negro sobre negro.
    const claro = Object.keys(TEMAS.claro).sort();
    const oscuro = Object.keys(TEMAS.oscuro).sort();
    expect(claro).toEqual(oscuro);
  });

  it('cada clave de tema tiene su variable en los dos bloques CSS', () => {
    const css = cssTemas();
    const [bloqueClaro, bloqueOscuro] = css.split('\n');
    for (const k of Object.keys(TEMAS.oscuro)) {
      expect(bloqueClaro).toContain(`--vw-${k}:`);
      expect(bloqueOscuro).toContain(`--vw-${k}:`);
    }
  });

  it('los alias que usan los croquis SVG siguen definidos', () => {
    // Los cinco croquis y el mapa se escribieron contra `var(--sup)` y compañía. Si un día
    // se borran los alias, los dibujos pierden el fondo de las etiquetas de cota y las
    // líneas de eje pasan por detrás del número, que es el problema que ese fondo resolvía.
    const css = cssTemas();
    for (const alias of ['--fondo:', '--sup:', '--borde:', '--txt:', '--txt2:', '--acento:'])
      expect(css).toContain(alias);
  });

  it('c.<clave> apunta a la variable CSS y no a un literal', () => {
    expect(c.canvas).toBe('var(--vw-canvas)');
    expect(c.azul).toBe('var(--vw-azul)');
  });
});

describe('navegación', () => {
  it('no hay pantallas repetidas', () => {
    expect(new Set(TABS).size).toBe(TABS.length);
  });

  it('el grupo de cada pantalla la contiene una sola vez', () => {
    const todas = NAV.flatMap(g => g.items);
    expect(todas).toEqual(TABS);
  });

  it('idxTab encuentra cada pantalla por su nombre', () => {
    for (const nombre of TABS) expect(TABS[idxTab(nombre)]).toBe(nombre);
  });

  it('idxTab cae en la primera pantalla ante un nombre desconocido', () => {
    // Es el comportamiento que hace que un aviso mal apuntado no rompa la app, y también
    // el que hace que el error sea invisible. Por eso los tests de abajo.
    expect(idxTab('Pantalla que no existe')).toBe(0);
  });

  it('las excepciones de dirección y de ficha nombran pantallas reales', () => {
    for (const n of [...SIN_DIRECCION, ...SIN_FICHA]) expect(TABS).toContain(n);
  });

  it('los pasos de la guía nombran pantallas reales', () => {
    for (const p of PASOS) expect(TABS).toContain(p.tab);
  });

  it('ninguna pantalla con selector de dirección está entre las que no lo llevan', () => {
    // El selector se dibuja cuando la pantalla NO está en SIN_DIRECCION. Las tres de
    // definición y el resumen tienen que estar; las de resultado por dirección, no.
    for (const n of ['Guía', 'Sitio', 'Edificio', 'Ráfaga', 'Resumen'])
      expect(SIN_DIRECCION.has(n)).toBe(true);
    for (const n of ['Presiones', 'Croquis', 'Resultantes'])
      expect(SIN_DIRECCION.has(n)).toBe(false);
  });
});

// ── AVISOS ───────────────────────────────────────────────────────────────────────

// Arma un escenario completo, igual que el contexto: es la única forma de que el test
// recorra las mismas ramas que la aplicación en vez de una versión simplificada.
function escenario(over = {}) {
  const d = {
    exposicion: 'B', altitud: 0, cerramiento: 'cerrado', modoG: 'defecto', n1: '',
    beta: '0.02', geo: { a: '20', b: '30', hAlero: '6', theta: '0', tipo: 'plana' },
    V: 55, Kzt: 1, ...over,
  };
  const sitio = { V: d.V, exposicion: d.exposicion, kd: kdDe('edificio_sprfv'),
    Kzt: d.Kzt, altitud: d.altitud, usarKe: true, puntosPerfil: 6 };
  const geoN = normalizarGeo(d.geo);
  // ⚠ EL FACTOR DE RÁFAGA ES POR DIRECCIÓN. B es la dimensión normal al viento y L la
  // paralela, y se intercambian al girar 90°. El escenario tiene que armarlo igual que el
  // contexto o el test estaría probando una app que no existe.
  const rafagaTodas = Object.fromEntries(DIRECCIONES.map(dir => [dir.id, factorRafaga({
    h: geoN.h, ...dimensionesDe(geoN, dir), exposicion: d.exposicion, V: d.V,
    n1: parseFloat(d.n1) || 0, beta: parseFloat(d.beta) || 0.02 })]));
  const rafaga = rafagaTodas[DIRECCIONES[0].id];
  const G = rafaga.opciones.find(o => o.id === d.modoG)?.G ?? 0.85;
  const analisis = analizarDireccion({ geo: d.geo, sitio, cerramiento: d.cerramiento, G },
    DIRECCIONES[0]);
  return avisosDe({ geoN, sitio, cerramiento: d.cerramiento, rafaga, rafagaTodas,
    modoG: d.modoG, n1: d.n1, analisis, resultantes: resultantes(analisis) });
}

describe('avisos del modelo', () => {
  // ⚠ ESTE ES EL TEST QUE JUSTIFICA EL ARCHIVO.
  //
  // Un `tab` mal escrito no rompe nada visible: el botón «Sitio →» lleva a la Guía y el
  // punto de la barra lateral no aparece en ninguna entrada. La app se ve idéntica y el
  // aviso deja de ser alcanzable. Se barren muchas combinaciones justamente porque cada
  // rama del registro apunta a una pantalla distinta.
  it('todo aviso apunta a una pantalla que existe, en cualquier escenario', () => {
    const casos = [
      {}, { exposicion: 'C' }, { exposicion: 'D' },
      { cerramiento: 'parc_cerrado' }, { cerramiento: 'abierto' },
      { cerramiento: 'parc_abierto' },
      { n1: '0.5' }, { n1: '0.5', modoG: 'flexible' }, { n1: '3' },
      { modoG: 'calculado' }, { exposicion: 'C', modoG: 'calculado' },
      { geo: { a: '20', b: '30', hAlero: '6', theta: '25', tipo: 'mansarda', cumbrera: 'X' } },
      { geo: { a: '20', b: '30', hAlero: '30', theta: '25', tipo: 'dos_aguas', cumbrera: 'Y' } },
      { geo: { a: '20', b: '30', hAlero: '180', theta: '0', tipo: 'plana' } },
      { geo: { a: '20', b: '30', hAlero: '8', theta: '15', tipo: 'vertiente_unica',
        cumbrera: 'X', pendienteHacia: '+Y' } },
    ];
    let vistos = 0;
    for (const caso of casos) {
      const av = escenario(caso);
      for (const a of av) {
        expect(TABS, `aviso «${a.id}» apunta a «${a.tab}»`).toContain(a.tab);
        expect(Object.keys(TONO), `aviso «${a.id}» usa el tono «${a.tono}»`).toContain(a.tono);
        expect(a.titulo.length).toBeGreaterThan(0);
        expect(a.detalle.length).toBeGreaterThan(0);
        vistos++;
      }
    }
    // Que el barrido haya producido avisos de verdad: si un refactor dejara `avisosDe`
    // devolviendo la lista vacía, los `for` de arriba no ejecutarían nada y el test
    // pasaría en verde sin haber mirado nada.
    expect(vistos).toBeGreaterThan(20);
  });

  it('los identificadores no se repiten dentro de un mismo escenario', () => {
    // Se usan como `key` de React: repetidos, dos avisos comparten nodo y uno de los dos
    // no se dibuja.
    for (const caso of [{}, { exposicion: 'D', cerramiento: 'parc_cerrado', n1: '0.4' }]) {
      const ids = escenario(caso).map(a => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('edificio flexible con un G que no corresponde es un ERROR, no un aviso', () => {
    // Es la única condición del registro en la que el reglamento no deja elegir: con
    // n₁ < 1 Hz, G_f es obligatorio. Degradarlo a «aviso» lo dejaría en el mismo nivel
    // que el recordatorio de K_zt, que sí es opinable.
    const a = escenario({ n1: '0.4' }).find(x => x.id === 'flexible');
    expect(a).toBeDefined();
    expect(a.tono).toBe('error');
    expect(a.tab).toBe('Ráfaga');
  });

  it('elegido el G flexible, el error desaparece', () => {
    expect(escenario({ n1: '0.4', modoG: 'flexible' }).some(x => x.id === 'flexible')).toBe(false);
  });

  it('con n₁ ≥ 1 Hz no hay error de flexibilidad', () => {
    expect(escenario({ n1: '2.5' }).some(x => x.id === 'flexible')).toBe(false);
  });

  // ⚠ NO LO DECIDE LA EXPOSICIÓN SOLA, COMO DECÍA ESTE TEST. Q depende de (B + h)/L_z̄,
  // así que el tamaño pesa tanto como la turbulencia: el galpón chico de 20 × 30 supera
  // el 0,85 hasta en exposición B, y una nave de 200 × 120 queda por debajo hasta en D.
  // La versión anterior afirmaba «en B queda por debajo» y era cierta sólo para la planta
  // por defecto medida con B = max(a, b), que era el único G que la app calculaba.
  it('el aviso de G calculado aparece cuando el calculado supera al 0,85, y no siempre', () => {
    const CHICO = { a: '20', b: '30', hAlero: '6', theta: '0', tipo: 'plana', cumbrera: 'X' };
    const GRANDE = { a: '200', b: '120', hAlero: '30', theta: '0', tipo: 'plana', cumbrera: 'X' };
    // Chico: lo supera en las TRES exposiciones.
    for (const e of ['B', 'C', 'D'])
      expect(escenario({ exposicion: e, geo: CHICO }).some(x => x.id === 'gSupera')).toBe(true);
    // Grande: no lo supera en ninguna. Si el aviso se disparara siempre, dejaría de
    // significar algo.
    for (const e of ['B', 'C', 'D'])
      expect(escenario({ exposicion: e, geo: GRANDE }).some(x => x.id === 'gSupera')).toBe(false);
  });

  it('el aviso no le echa la culpa a la exposición', () => {
    // El texto tiene que decir de qué depende de verdad, porque la lectura intuitiva
    // —«en terreno liso el calculado sube»— es la que hace fallar el caso del galpón
    // chico en exposición B.
    const CHICO = { a: '20', b: '30', hAlero: '6', theta: '0', tipo: 'plana', cumbrera: 'X' };
    const av = escenario({ exposicion: 'B', geo: CHICO }).find(x => x.id === 'gSupera');
    expect(av.detalle).toMatch(/No lo decide la exposición sola/);
    expect(av.detalle).toMatch(/B \+ h/);
  });

  // ⚠ EL AVISO MIRA LAS CUATRO DIRECCIONES, NO LA ACTIVA. Desde que G se calcula por
  // dirección, el calculado puede superar al 0,85 en una y no en otra; si el aviso
  // dependiera de la seleccionada, aparecería y desaparecería al mover el selector.
  it('el aviso de G calculado no depende de qué dirección esté seleccionada', () => {
    // Nave muy alargada en exposición C: según el eje largo B = 20 y el calculado supera
    // al 0,85; según el corto B = 120 y no.
    const geo = { a: '120', b: '20', hAlero: '6', theta: '0', tipo: 'plana', cumbrera: 'X' };
    const av = escenario({ exposicion: 'C', geo }).find(x => x.id === 'gSupera');
    expect(av).toBeDefined();
    expect(av.detalle).toMatch(/de las 4 direcciones/);
    // Y el número informado es el MAYOR de las que lo superan, no el de la primera.
    const geoN = normalizarGeo(geo);
    const gs = DIRECCIONES.map(dir => factorRafaga({ h: geoN.h, ...dimensionesDe(geoN, dir),
      exposicion: 'C', V: 55, n1: 0, beta: 0.02 }).rig.G);
    expect(Math.max(...gs)).toBeGreaterThan(0.85);
    expect(Math.min(...gs)).toBeLessThan(0.85);
    expect(av.detalle).toContain(Math.max(...gs).toFixed(3).replace('.', ','));
  });

  it('no avisa del G calculado si no se está adoptando el 0,85', () => {
    expect(escenario({ exposicion: 'D', modoG: 'calculado' }).some(x => x.id === 'gSupera')).toBe(false);
  });

  it('la cubierta no implementada es un error apuntado a Edificio', () => {
    const a = escenario({ geo: { a: '20', b: '30', hAlero: '6', theta: '25',
      tipo: 'mansarda', cumbrera: 'X' } }).find(x => x.id === 'mansarda');
    expect(a).toBeDefined();
    expect(a.tono).toBe('error');
    expect(a.tab).toBe('Edificio');
  });

  it('los avisos salen ordenados por gravedad', () => {
    const peso = { error: 0, aviso: 1, info: 2 };
    const av = escenario({ exposicion: 'D', cerramiento: 'parc_cerrado', n1: '0.4' });
    const pesos = av.map(a => peso[a.tono]);
    expect(pesos).toEqual([...pesos].sort((x, y) => x - y));
    // …y el barrido tiene que haber producido los tres niveles, o el orden no se probó.
    expect(new Set(pesos).size).toBeGreaterThan(1);
  });
});

describe('resumen de avisos por pantalla', () => {
  it('cada pantalla toma el tono MÁS GRAVE, no el último', () => {
    // El punto de la barra lateral es uno solo por pantalla. Si tomara el último, una
    // pantalla con un error y dos informativos se vería informativa.
    const m = porTab([
      { tab: 'Ráfaga', tono: 'info' },
      { tab: 'Ráfaga', tono: 'error' },
      { tab: 'Ráfaga', tono: 'aviso' },
      { tab: 'Sitio', tono: 'info' },
    ]);
    expect(m['Ráfaga']).toBe('error');
    expect(m.Sitio).toBe('info');
  });

  it('el mismo resultado sea cual sea el orden de entrada', () => {
    const av = [{ tab: 'Sitio', tono: 'aviso' }, { tab: 'Sitio', tono: 'error' }];
    expect(porTab(av).Sitio).toBe('error');
    expect(porTab([...av].reverse()).Sitio).toBe('error');
  });

  it('contar separa los tres niveles', () => {
    const n = contar([{ tono: 'error' }, { tono: 'info' }, { tono: 'info' }, { tono: 'aviso' }]);
    expect(n).toEqual({ error: 1, aviso: 1, info: 2 });
  });
});

describe('rótulo del contador de avisos', () => {
  it('concuerda el plural', () => {
    // Decía «1 avisos» en los cuatro lugares donde estaba escrito a mano.
    expect(rotuloConteo({ error: 0, aviso: 1, info: 3 }).txt).toBe('1 aviso');
    expect(rotuloConteo({ error: 0, aviso: 2, info: 0 }).txt).toBe('2 avisos');
  });

  it('el error manda sobre el aviso, y el aviso sobre el silencio', () => {
    expect(rotuloConteo({ error: 1, aviso: 5, info: 9 }).tono).toBe('error');
    expect(rotuloConteo({ error: 0, aviso: 5, info: 9 }).tono).toBe('aviso');
    // Los informativos NO encienden el indicador: son decisiones que el reglamento ya
    // tomó, y si contaran el badge estaría siempre en ámbar y dejaría de significar algo.
    expect(rotuloConteo({ error: 0, aviso: 0, info: 9 }).tono).toBe('ok');
  });
});

describe('nombre de la clasificación de cerramiento', () => {
  it('«cerrado» y «parcialmente abierto» comparten el GC_pi', () => {
    // Es la premisa del bug: mientras dos clasificaciones compartan coeficiente, buscar
    // por coeficiente devuelve la equivocada. Si algún día la tabla cambiara y los
    // valores dejaran de repetirse, este test avisa que la advertencia ya no aplica.
    const cerrado = CERRAMIENTOS.find(x => x.id === 'cerrado');
    const parcAbierto = CERRAMIENTOS.find(x => x.id === 'parc_abierto');
    expect(cerrado.gcpi).toBe(parcAbierto.gcpi);
  });

  it('cada id devuelve SU etiqueta, no la del primero con el mismo GC_pi', () => {
    for (const x of CERRAMIENTOS)
      expect(nombreCerramiento(x.id)).toBe(x.label.toLowerCase());
    expect(nombreCerramiento('cerrado')).toBe('cerrado');
    expect(nombreCerramiento('parc_abierto')).toBe('parcialmente abierto');
  });

  it('un id desconocido no rompe la nota', () => {
    expect(nombreCerramiento('lo que sea')).toBe('—');
  });
});

// Las tres pantallas de «no es un edificio»: las dos del capítulo 4 y la del Anexo I.
// Van juntas porque responden la misma pregunta y lo que cambia es de qué tabla sale el
// coeficiente; un grupo propio con una sola entrada llamada «Anexo I» obligaría a saber de
// antemano que existe.
const OTRAS = ['Accesorios', 'Silos y tanques', 'Secciones uniformes'];

describe('el capítulo 4, el Anexo I y su navegación', () => {
  it('sus pantallas existen y son un grupo aparte', () => {
    for (const n of OTRAS) expect(TABS).toContain(n);
    const grupo = NAV.find(g => (g.grupo ?? "").includes('cap. 4'));
    expect(grupo).toBeDefined();
    expect(grupo.items).toEqual(OTRAS);
  });

  it('no llevan selector de dirección', () => {
    // Un coeficiente de fuerza ya contempla la dirección más desfavorable dentro del propio
    // C_f y de sus casos: ofrecer «estás mirando Wx+» sería mentir.
    for (const n of OTRAS) expect(SIN_DIRECCION.has(n), n).toBe(true);
  });

  it('sí llevan ficha de estado', () => {
    // Lo que muestra la ficha —V, exposición, K_zt, altitud— es justamente lo que estas
    // pantallas comparten con el edificio, y es lo que hay que poder mirar sin volver a Sitio.
    for (const n of OTRAS) expect(SIN_FICHA.has(n), n).toBe(false);
  });
});

// ── FIGURAS DEL REGLAMENTO ───────────────────────────────────────────────────────
//
// Un `?` que abre una figura inexistente no rompe nada: se ve el panel con el título, el
// hueco de la imagen rota, y listo. En una app cuyo argumento es «acá está de dónde sale
// cada número», eso es peor que no tener el ícono.
import fs from 'node:fs';
import path from 'node:path';
import { FIGURAS, figuraDe } from '../src/constants/figuras.js';

describe('registro de figuras', () => {
  const dir = new URL('../public/figuras/', import.meta.url).pathname;

  it('cada figura declarada tiene su archivo en disco', () => {
    const ids = Object.keys(FIGURAS);
    expect(ids.length).toBeGreaterThan(10);
    for (const id of ids) {
      const f = FIGURAS[id];
      const p = path.join(dir, `${f.archivo}.png`);
      expect(fs.existsSync(p), `falta ${f.archivo}.png para la figura ${id}`).toBe(true);
      // Un PNG de cero bytes pasaría el existsSync y se vería igual de roto.
      expect(fs.statSync(p).size, f.archivo).toBeGreaterThan(5000);
    }
  });

  it('no hay archivos huérfanos en public/figuras', () => {
    // Al revés: una imagen que nadie referencia son cien kilobytes que se publican y no se
    // usan, y la señal de que un `?` se quitó sin querer.
    const usados = new Set(Object.values(FIGURAS).map(f => `${f.archivo}.png`));
    for (const archivo of fs.readdirSync(dir)) {
      expect(usados.has(archivo), `${archivo} no lo referencia ninguna figura`).toBe(true);
    }
  });

  it('cada figura dice qué es y de dónde sale', () => {
    for (const [id, f] of Object.entries(FIGURAS)) {
      expect(f.titulo, id).toMatch(/(Figura|Tabla)/);
      // La referencia a página es lo que permite ir al papel a controlar.
      expect(f.ref, id).toMatch(/pág/);
      expect(f.nota.length, id).toBeGreaterThan(40);
    }
  });

  it('figuraDe devuelve null ante un id desconocido, sin romper', () => {
    expect(figuraDe("no existe")).toBeNull();
  });
});
