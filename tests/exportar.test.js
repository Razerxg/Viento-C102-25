// EXPORTACIÓN DE PRESIONES — CSV y JSON.
import { describe, it, expect } from 'vitest';
import { analizarDireccion, DIRECCIONES, normalizarGeo } from '../src/engine/edificio.js';
import { resultantes } from '../src/engine/resultantes.js';
import { estadosDeCarga, envolventeCritica } from '../src/engine/envolvente.js';
import { DIALECTOS, COLUMNAS, tituloColumna, unidadEnNombre, renglonesDe,
  csvPresiones, jsonPresiones } from '../src/lib/exportar.js';
import { PERFILES, convertir } from '../src/lib/unidades.js';
import { APP, RESPONSABILIDAD } from '../src/constants/version.js';

const SITIO = { V: 55.1, exposicion: "B", kd: 0.85, Kzt: 1.0, altitud: 0, usarKe: false,
  puntosPerfil: 6 };
const GEO = { a: "20", b: "30", hAlero: "6", theta: "25", tipo: "dos_aguas", cumbrera: "Y" };
const ENT = { geo: GEO, sitio: SITIO, cerramiento: "cerrado", G: 0.85 };
const TODAS = DIRECCIONES.map(d => analizarDireccion(ENT, d));
const RES = (t) => resultantes(t);
const ENV = envolventeCritica(estadosDeCarga({ analizar: analizarDireccion, entrada: ENT }));
const FECHA = new Date(Date.UTC(2026, 8, 27, 10, 0, 0));

/** Parte un renglón de CSV respetando las comillas. */
function partir(linea, sep) {
  const out = []; let act = "", dentro = false;
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i];
    if (ch === '"') {
      if (dentro && linea[i + 1] === '"') { act += '"'; i++; } else dentro = !dentro;
    } else if (ch === sep && !dentro) { out.push(act); act = ""; }
    else act += ch;
  }
  out.push(act);
  return out;
}

describe('renglones por cara y por zona', () => {
  // ⚠ LA PARED A BARLOVENTO NO ES UNA SUPERFICIE: es una pila de tramos, cada uno con su
  // q_z y su área real. Exportarla con un q_h único borra justamente lo que la distingue.
  it('la pared a barlovento sale tramo por tramo, con q_z creciente', () => {
    const r = renglonesDe(TODAS[0]).filter(x => x.superficie === "pared_barlovento");
    expect(r.length).toBeGreaterThan(1);
    for (let i = 1; i < r.length; i++) {
      expect(r[i].zDesde).toBeCloseTo(r[i - 1].zHasta, 9);
      expect(r[i].q).toBeGreaterThanOrEqual(r[i - 1].q);
    }
    // Y las áreas de los tramos suman el área real de la fachada.
    const an = TODAS[0];
    const sup = an.superficies.find(s => s.id === "pared_barlovento");
    expect(r.reduce((a, x) => a + x.area, 0)).toBeCloseTo(sup.fachada.area, 6);
  });

  // El perfil de la pared a barlovento arranca con un tramo de extensión nula en z = 0.
  // Al motor no le molesta —área cero, fuerza cero— pero en un archivo es un renglón con
  // área 0 al lado de otros con área real, y eso invita a sumarlo o a dividir por él.
  it('no salen tramos de extensión nula', () => {
    const an = TODAS[0];
    const sup = an.superficies.find(s => s.id === "pared_barlovento");
    // Primero: el artefacto existe de verdad, o el test no probaría nada.
    expect(sup.tramos.filter(t => !(t.hasta > t.desde)).length).toBeGreaterThan(0);
    for (const r of renglonesDe(an).filter(x => x.zDesde != null)) {
      expect(r.zHasta).toBeGreaterThan(r.zDesde);
      expect(r.area).toBeGreaterThan(0);
    }
  });

  it('las demás caras salen en un renglón, con q_h', () => {
    const r = renglonesDe(TODAS[0]).filter(x => x.superficie === "pared_sotavento");
    expect(r).toHaveLength(1);
    expect(r[0].q).toBeCloseTo(TODAS[0].qh, 9);
  });

  it('cada renglón trae la referencia a la figura de donde salió el Cp', () => {
    for (const an of TODAS) for (const r of renglonesDe(an)) {
      expect(r.referencia, `${an.dir.id} ${r.superficie}`).toMatch(/Figura 2\.4-1/);
    }
  });

  it('los dos signos de la presión interna viajan por separado', () => {
    // No es un ± del que se elige el peor: uno gobierna el levantamiento de la cubierta y
    // el otro la compresión de las paredes, en combinaciones distintas.
    for (const r of renglonesDe(TODAS[0])) {
      expect(r.conInternaPos).toBeLessThan(r.conInternaNeg);
      expect(Math.abs(r.gobernante))
        .toBeCloseTo(Math.max(Math.abs(r.conInternaPos), Math.abs(r.conInternaNeg)), 9);
    }
  });

  // Sin el área, quien recibe el archivo tiene que recalcular la partición de la
  // cubierta por su cuenta, que es exactamente donde aparecen los errores.
  it('cada zona de cubierta trae su área real y su proyección en planta', () => {
    for (const an of TODAS) {
      const cub = renglonesDe(an).filter(x => x.tipo === "cubierta");
      expect(cub.length, an.dir.id).toBeGreaterThan(0);
      const cos = Math.cos(an.geo.theta * Math.PI / 180);
      for (const r of cub) {
        expect(r.areaPlanta, `${an.dir.id} ${r.superficie}`).toBeGreaterThan(0);
        expect(r.area).toBeCloseTo(r.areaPlanta / cos, 6);
        // Con pendiente, la real es MAYOR que la proyección; sin pendiente, iguales.
        if (an.geo.theta > 0) expect(r.area).toBeGreaterThan(r.areaPlanta);
      }
    }
  });

  it('las zonas de cubierta de un caso cubren la planta entera', () => {
    // Es el control de que las áreas salen de la partición del motor y no de una cuenta
    // paralela: la suma de un caso de la nota 3 tiene que dar a·b.
    const an = TODAS[0];
    const unCaso = renglonesDe(an).filter(x => x.tipo === "cubierta"
      && !x.superficie.endsWith("_pos"));
    const suma = unCaso.reduce((a, x) => a + x.areaPlanta, 0);
    expect(suma).toBeCloseTo(an.L * an.B, 6);
  });

  // ⚠ UNA FRANJA PUEDE VENIR PARTIDA EN DOS. Con viento NORMAL a la cumbrera y θ < 10°
  // la cubierta va por franjas, pero cada franja se corta en la cumbrera para repartir el
  // sentido de su componente horizontal: el motor devuelve dos trozos con el MISMO
  // identificador, y quedarse con el último informaría la mitad del área.
  it('una franja partida por la cumbrera suma sus dos trozos', () => {
    const geo = { a: "40", b: "30", hAlero: "6", theta: "5", tipo: "dos_aguas", cumbrera: "Y" };
    const an = analizarDireccion({ ...ENT, geo }, DIRECCIONES[0]);   // Wx+, normal
    expect(an.modo).toBe("franjas");
    expect(an.normalACumbrera).toBe(true);
    const cub = renglonesDe(an).filter(x => x.tipo === "cubierta"
      && !x.superficie.endsWith("_pos"));
    expect(cub.reduce((a, x) => a + x.areaPlanta, 0)).toBeCloseTo(an.L * an.B, 6);
    // Y hay al menos una franja que cruza la cumbrera, o el test no probaría nada.
    const cruza = cub.some(x => x.xDesde * an.geo.h < an.L / 2
      && Math.min(x.xHasta * an.geo.h, an.L) > an.L / 2);
    expect(cruza).toBe(true);
  });

  it('las paredes no traen proyección en planta', () => {
    for (const r of renglonesDe(TODAS[0]).filter(x => x.tipo === "pared"))
      expect(r.areaPlanta).toBe(null);
  });

  it('las franjas de cubierta traen su zona', () => {
    // La dirección Wy va paralela a la cumbrera: zonifica en franjas.
    const an = TODAS.find(t => t.modo === "franjas");
    const franjas = renglonesDe(an).filter(x => x.superficie.startsWith("cub_franja"));
    expect(franjas.length).toBeGreaterThan(0);
    for (const f of franjas) expect(f.zona).toMatch(/^x /);
  });
});

describe('las unidades van pegadas al nombre de la columna', () => {
  it('unidadEnNombre deja un identificador usable', () => {
    expect(unidadEnNombre("kN/m²")).toBe("kN_m2");
    expect(unidadEnNombre("kN·m")).toBe("kNm");
    expect(unidadEnNombre("m²")).toBe("m2");
    expect(unidadEnNombre("m")).toBe("m");
  });

  // ⚠ ES LO QUE EVITA QUE ALGUIEN LEA LA COLUMNA EN LAS UNIDADES QUE SUPONE. Un CSV se
  // abre en cualquier cosa y lo primero que se pierde son las líneas de encabezado.
  it('toda columna con magnitud lleva su unidad en el título', () => {
    for (const col of COLUMNAS) {
      const t = tituloColumna(col, PERFILES.datos);
      if (col.magnitud) expect(t).toContain(unidadEnNombre(PERFILES.datos[col.magnitud]));
      else expect(t).toBe(col.titulo);
    }
  });

  it('cambiar el perfil cambia el título y el número a la vez', () => {
    const datos = csvPresiones({ todas: TODAS, perfil: PERFILES.datos, cabecera: false });
    const mem = csvPresiones({ todas: TODAS, perfil: PERFILES.memoria, cabecera: false });
    // La longitud es lo único que cambia entre esos dos perfiles: m contra mm.
    expect(datos.split("\n")[0]).toContain("area_m2");
    expect(mem.split("\n")[0]).toContain("p_gobernante_kN_m2");
    expect(datos.split("\n")[0]).toContain("p_gobernante_kN_m2");
  });
});

describe('el CSV', () => {
  const csv = (o = {}) => csvPresiones({ todas: TODAS, proyecto: "Galpón",
    fecha: FECHA, ...o });

  it('la cabecera dice la versión, la norma y la responsabilidad', () => {
    const c = csv();
    expect(c).toContain(`# Reglamento: ${APP.norma}`);
    expect(c).toContain(`v${APP.version}`);
    expect(c).toContain("# Proyecto: Galpón");
    expect(c).toContain("2026-09-27T10:00:00Z");
    expect(c).toContain(RESPONSABILIDAD.slice(0, 40));
  });

  it('la cabecera describe cada columna', () => {
    const c = csv();
    for (const col of COLUMNAS)
      expect(c).toContain(`# columna ${tituloColumna(col, PERFILES.datos)}:`);
  });

  it('todas las líneas de cabecera empiezan con #', () => {
    // Es la convención que entienden pandas, R y la importación de Excel. Escribirlas
    // como renglones de datos las mezclaría con las presiones sin nada que las distinga.
    const l = csv().split("\n");
    const primeraDato = l.findIndex(x => !x.startsWith("#"));
    expect(primeraDato).toBeGreaterThan(0);
    expect(l.slice(primeraDato).every(x => !x.startsWith("#"))).toBe(true);
  });

  it('sin cabecera, la primera línea es el encabezado de columnas', () => {
    const l = csvPresiones({ todas: TODAS, cabecera: false }).split("\n");
    expect(l[0]).toBe(COLUMNAS.map(c => tituloColumna(c, PERFILES.datos)).join(","));
  });

  it('hay un renglón por cara y por tramo, en las cuatro direcciones', () => {
    const l = csvPresiones({ todas: TODAS, cabecera: false }).split("\n").filter(Boolean);
    const esperados = TODAS.reduce((a, t) => a + renglonesDe(t).length, 0);
    expect(l.length - 1).toBe(esperados);
  });

  // ⚠ ABRIR EL DIALECTO EQUIVOCADO NO DA ERROR: da una columna sola con todo el renglón
  // adentro, o números partidos en dos. Por eso son coherentes por dentro.
  it('el dialecto de Excel usa punto y coma con coma decimal', () => {
    const c = csvPresiones({ todas: TODAS, dialecto: DIALECTOS.excel, cabecera: false });
    const enc = c.split("\n")[0];
    expect(enc).toContain(";");
    expect(enc.split(";")).toHaveLength(COLUMNAS.length);
    const fila = c.split("\n")[1].split(";");
    expect(fila).toHaveLength(COLUMNAS.length);
    // Y los números llevan coma decimal.
    expect(c).toMatch(/;-?\d+,\d+;/);
    // ⚠ NO SE ENTRECOMILLA POR LA COMA. Las referencias traen comas —«h/L = 0,28»— y en
    // este dialecto son inofensivas: el separador es `;`. Entrecomillarlas sería ruido, y
    // además Excel lee un número entrecomillado como texto.
    expect(c).not.toContain('"');
  });

  it('en el dialecto de coma, las referencias con coma SÍ van entrecomilladas', () => {
    // Sin comillas correrían todas las columnas siguientes un lugar, y el archivo se lee
    // «bien» con los números cambiados de lugar: el peor resultado posible.
    const c = csvPresiones({ todas: TODAS, dialecto: DIALECTOS.programa, cabecera: false });
    expect(c).toContain('"Figura 2.4-1');
  });

  it('el dialecto de programa usa coma con punto decimal', () => {
    const c = csvPresiones({ todas: TODAS, dialecto: DIALECTOS.programa, cabecera: false });
    expect(c.split("\n")[0].split(",")).toHaveLength(COLUMNAS.length);
    expect(c).toMatch(/,-?\d+\.\d+,/);
  });

  it('un texto con el separador adentro va entrecomillado', () => {
    // Las referencias a la figura traen comas: sin comillas correrían todas las columnas
    // siguientes un lugar, y el archivo se lee «bien» con los números cambiados de lugar.
    const c = csvPresiones({ todas: TODAS, dialecto: DIALECTOS.programa, cabecera: false });
    expect(c).toContain('"');
    for (const linea of c.split("\n").slice(1).filter(Boolean)) {
      expect(partir(linea, ",")).toHaveLength(COLUMNAS.length);
    }
  });

  it('los valores salen convertidos al perfil, no en unidades internas', () => {
    const c = csvPresiones({ todas: TODAS, perfil: PERFILES.datos, cabecera: false,
      dialecto: DIALECTOS.programa });
    const iQ = COLUMNAS.findIndex(x => x.id === "q");
    const campos = partir(c.split("\n")[1], ",");
    expect(campos).toHaveLength(COLUMNAS.length);
    const q = Number(campos[iQ]);
    const primera = renglonesDe(TODAS[0])[0];
    expect(q).toBeCloseTo(convertir("presion", primera.q, PERFILES.datos.presion), 4);
    // Y NO es el valor interno: si lo fuera, el archivo diría kN/m² con números en N/m².
    expect(q).not.toBeCloseTo(primera.q, 2);
  });

  it('termina en salto de línea', () => {
    // Sin él, concatenar dos archivos pega el último renglón con el encabezado del otro.
    expect(csv().endsWith("\n")).toBe(true);
  });
});

describe('el JSON', () => {
  const json = () => jsonPresiones({ todas: TODAS, resDe: RES, envCasos: ENV,
    sitio: SITIO, geoN: normalizarGeo(GEO), cerramiento: "cerrado",
    proyecto: "Galpón", fecha: FECHA });

  it('lleva el sobre de procedencia y el campo unidades', () => {
    const j = json();
    expect(j.app).toBe(APP.id);
    expect(j.norma).toBe(APP.norma);
    expect(j.generado).toBe("2026-09-27T10:00:00Z");
    expect(j.responsabilidad).toBe(RESPONSABILIDAD);
    expect(j.unidades).toEqual(PERFILES.datos);
  });

  it('trae adentro la descripción de sus propias columnas', () => {
    const j = json();
    expect(j.columnas.map(c => c.campo)).toEqual(COLUMNAS.map(c => c.id));
    for (const c of j.columnas) expect(c.descripcion.length).toBeGreaterThan(10);
    // Y la unidad de cada campo es la del perfil, no la interna.
    expect(j.columnas.find(c => c.campo === "q").unidad).toBe(PERFILES.datos.presion);
    expect(j.columnas.find(c => c.campo === "cp").unidad).toBe(null);
  });

  it('las cuatro direcciones con sus superficies y sus resultantes', () => {
    const j = json();
    expect(j.direcciones.map(x => x.id)).toEqual(["Wx+", "Wx-", "Wy+", "Wy-"]);
    for (const dir of j.direcciones) {
      expect(dir.superficies.length).toBeGreaterThan(3);
      expect(dir.resultantes.cortante).toBeGreaterThan(0);
      expect(typeof dir.resultantes.gobiernaCargaMinima).toBe("boolean");
    }
    // Las resultantes están en kN, no en N.
    const r0 = RES(TODAS[0]);
    expect(j.direcciones[0].resultantes.cortante)
      .toBeCloseTo(convertir("fuerza", r0.cortante, "kN"), 6);
  });

  // ⚠ LA ENVOLVENTE NO ES EL MÁXIMO POR COLUMNA DE LA TABLA DE PRESIONES. Cada magnitud
  // sale de UN estado de carga completo de la Figura 2.4-8, y el estado viaja con ella.
  it('la envolvente viaja con el estado de carga que la gobierna', () => {
    const j = json();
    expect(j.envolvente.estadosBarridos).toBe(ENV.estados.length);
    expect(j.envolvente.casosTorsionalesVerificados).toBe(true);
    for (const k of ["cortante", "levantamiento", "vuelco", "torsion"]) {
      const e = j.envolvente[k].estado;
      expect([1, 2, 3, 4], k).toContain(e.caso);
      expect(e.direcciones.length, k).toBeGreaterThan(0);
      expect(["conInternaPos", "conInternaNeg"], k).toContain(e.casoInterno);
    }
    expect(j.envolvente.torsion.estado.caso).toBe(4);
    expect(j.envolvente.torsion.estado.signoExcentricidad).not.toBe(null);
  });

  it('sin envolvente ni resultantes el archivo sigue siendo válido', () => {
    // La pantalla siempre los tiene, pero el módulo es público y no puede reventar.
    const j = jsonPresiones({ todas: TODAS });
    expect(j.envolvente).toBe(null);
    expect(j.direcciones[0].resultantes).toBe(null);
    expect(j.sitio).toBe(null);
    expect(j.direcciones[0].superficies.length).toBeGreaterThan(3);
  });

  it('una envolvente sin estados no rompe el archivo', () => {
    // El módulo es público y lo usan dos pantallas. Una envolvente vacía —cuatro casos
    // exceptuados y ninguno corrido— no puede tirar la exportación abajo.
    const vacia = { estados: [], conTorsion: false,
      cortante: { valor: 0 }, levantamiento: { valor: 0 },
      vuelco: { valor: 0 }, torsion: { valor: 0 } };
    const j = jsonPresiones({ todas: TODAS, envCasos: vacia });
    expect(j.envolvente.estadosBarridos).toBe(0);
    for (const k of ["cortante", "levantamiento", "vuelco", "torsion"])
      expect(j.envolvente[k].estado, k).toBe(null);
  });

  it('es serializable y no tiene valores no finitos', () => {
    const texto = JSON.stringify(json());
    expect(texto).not.toContain("NaN");
    expect(texto).not.toContain("Infinity");
    expect(JSON.parse(texto).direcciones).toHaveLength(4);
  });
});
