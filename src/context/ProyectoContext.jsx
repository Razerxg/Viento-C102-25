// ESTADO DEL PROYECTO — el único lugar donde viven los datos de entrada y el cálculo.
//
// Antes todo esto era una docena de `useState` dentro de `App.jsx`, y los análisis se
// rehacían en el cuerpo del componente. Eso tenía dos consecuencias concretas:
//
//  · **No se podía partir la pantalla.** Cualquier intento de sacar un bloque a otra
//    pantalla obligaba a pasarle ocho props y sus ocho setters. Es la razón por la que la
//    app era una sola columna infinita: no era una decisión de diseño, era lo único que
//    el estado permitía.
//  · **NO SE GUARDABA NADA.** Recargar la página tiraba el edificio entero. En una
//    herramienta donde definir el caso son quince campos, eso no es un detalle.
//
// Ahora el estado está acá, el cálculo se memoiza una sola vez y se comparte, y hay
// autoguardado en `localStorage` más exportación e importación a JSON.
import { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { analizarDireccion, normalizarGeo, DIRECCIONES } from '../engine/edificio.js';
import { analizarAccesorio, analizarSilo, familiaDe } from '../engine/otrasEstructuras.js';
import { analizarAnexo } from '../engine/anexo1.js';
import { kzt as calcularKzt } from '../engine/topografia.js';
import { num, opt } from '../lib/parseo.js';
import { gcpiDe } from '../constants/presionInterna.js';
import { factorRafaga } from '../engine/factorRafaga.js';
import { resultantes, barridoAlero, envolvente } from '../engine/resultantes.js';
import { velocidadDe } from '../constants/velocidades.js';
import { kdDe } from '../constants/direccionalidad.js';
import { TABS, idxTab } from '../constants/tabs.js';
import { avisosDe, porTab, contar } from '../lib/avisos.js';

const KEY = "viento_proyecto_v1";
const Ctx = createContext(null);
export const useProyecto = () => useContext(Ctx);

// ESTADO INICIAL — un caso completo, no campos vacíos.
//
// Abrir en blanco obliga a inventar un edificio antes de poder ver qué hace la app, y el
// que llega por primera vez no sabe qué inventar. Con un caso cargado, la primera
// pantalla ya muestra presiones y el usuario cambia lo que le interesa.
export const INICIAL = {
  proyecto: "Edificio sin nombre",
  ciudad: "Buenos Aires",
  riesgo: "II",
  exposicion: "B",
  altitud: "0",
  usarKe: true,
  cerramiento: "cerrado",
  // ── TOPOGRAFÍA, art. 1.8 ────────────────────────────────────────────────────
  // Por defecto SIN accidente declarado, que es terreno llano y K_zt = 1,0. No es lo
  // mismo que «se supone 1,0»: acá el 1,0 sale de que el usuario no declaró ninguna loma,
  // y la app lo dice con ese motivo.
  topo: {
    forma: "", exposicionLocal: "", H_m: "", Lh_m: "", x_m: "0",
    lado: "barlovento", cond1: false, metodo: "expresiones",
    // Opción CONSERVADORA por defecto: los multiplicadores de la Fig. 1.8-1 suponen
    // viento en la dirección de máxima pendiente (nota 3), así que aplicarlos en las
    // cuatro es mayorar. Desactivarla exige declarar en qué direcciones aplica.
    todasLasDirecciones: true, direcciones: ["Wx+"],
  },
  geo: { a: "20", b: "30", hAlero: "6", theta: "0", cumbrera: "X",
    tipo: "plana", pendienteHacia: "+Y" },
  n1: "",
  beta: "0.02",
  modoG: "defecto",
  tipoFrec: "",
  puntosPerfil: "10",
  // Excepción de la propia nota 7 de la Figura 2.4-1: «excepto para SPRFVs en el techo
  // consistentes en entramados resistentes a momento». Por defecto NO, o sea con piso.
  porticosCubierta: false,
  // El piso es parte de la estructura —contenedor, shelter sobre skid, módulo— y la
  // presión interna se autoequilibra. Desactivado por defecto: lo conservador.
  pisoSolidario: false,

  // ── CAPÍTULO 4 ──────────────────────────────────────────────────────────────
  // Un caso cargado por defecto, igual que el edificio: abrir en blanco obliga a inventar
  // un cartel antes de poder ver qué hace la pantalla.
  cap4: {
    familia: "cartel_lleno",
    kd: "",              // "" = el que la Tabla 1.6-1 da para esta familia
    // pared libre / cartel lleno
    B: "6", s: "2", h: "5", eps: "", t: "", Lr: "", dobleCara: false,
    // cartel abierto / entramado
    epsAb: "0.25", miembro: "plano", Dmiembro: "0.05",
    // chimenea / tanque
    hChim: "20", Dchim: "3", filaChimenea: "circ_super_suave",
    // torre reticulada
    hTorre: "30", BTorre: "2", epsTorre: "0.25", seccionTorre: "cuadrada",
    redondos: false, diagonal: false,
    // equipo sobre cubierta
    Bedif: "30", hedif: "12", Ledif: "40", Af: "6", Ar: "9",
  },
  // ⚠ EL SILO LLEVA SU PROPIO K_d. Antes tomaba el de la pantalla de Accesorios, así que
  // elegir «cartel lleno» allá dejaba el tanque calculado con K_d = 0,85 en vez de 1,00:
  // un 15 % menos de presión sobre otra estructura, sin que nada lo dijera. Por defecto va
  // la fila de chimeneas y tanques redondos, que es lo que un silo cilíndrico es.
  silo: { D: "10", H: "18", theta: "25", separacion: "5", elevado: false, C: "",
    kd: "chim_redonda" },
  // ANEXO I — secciones de forma uniforme. Lleva su propio K_d por el mismo motivo que el
  // silo: un caño redondo va por la fila de chimeneas redondas, no por el 0,85 del edificio.
  anexo: { familia: "redondeada", kd: "chim_redonda",
    b: "0.5", L: "12", z: "6", d: "0.5", theta: "0",
    filaI1: "cil_liso", filaI2: "cuad_cara", filaI5: "tub_lisa",
    perfil: "angulo", thetaPerfil: "0" },
};

const leer = () => {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) || "null");
    // Fusión superficial contra el inicial: un archivo guardado antes de que existiera un
    // campo tiene que seguir abriendo, con el valor por defecto del campo nuevo. Sin esto
    // agregar un campo rompe todos los proyectos guardados, y no hay forma de enterarse
    // hasta que alguien abre el suyo.
    return v && typeof v === "object" ? { ...INICIAL, ...v,
      geo: { ...INICIAL.geo, ...(v.geo || {}) },
      topo: { ...INICIAL.topo, ...(v.topo || {}) },
      cap4: { ...INICIAL.cap4, ...(v.cap4 || {}) },
      silo: { ...INICIAL.silo, ...(v.silo || {}) },
      anexo: { ...INICIAL.anexo, ...(v.anexo || {}) } } : null;
  } catch { return null; }
};

export function ProyectoProvider({ children }) {
  const [d, setD] = useState(() => (typeof window === "undefined" ? INICIAL : (leer() ?? INICIAL)));
  const [tab, setTab] = useState(0);
  const [iDir, setIDir] = useState(0);
  const [guardadoEn, setGuardadoEn] = useState(null);
  const fileRef = useRef(null);

  // Un setter por campo evita que cada pantalla escriba `setD(x => ({...x, k: v}))` a
  // mano: repetido en veinte lugares, es donde aparece el que pisa el objeto entero.
  const set = useCallback((k) => (v) => setD(x => ({ ...x, [k]: v })), []);
  const setGeo = useCallback((k) => (v) => setD(x => ({ ...x, geo: { ...x.geo, [k]: v } })), []);
  const setTopo = useCallback((k) => (v) => setD(x => ({ ...x, topo: { ...x.topo, [k]: v } })), []);
  // Un setter por sub-objeto. Con `set("cap4")` habría que reconstruir el objeto entero en
  // cada pantalla, que es donde alguien pisa un campo sin querer.
  const setCap4 = useCallback((k) => (v) => setD(x => ({ ...x, cap4: { ...x.cap4, [k]: v } })), []);
  const setSilo = useCallback((k) => (v) => setD(x => ({ ...x, silo: { ...x.silo, [k]: v } })), []);
  const setAnexo = useCallback((k) => (v) => setD(x => ({ ...x, anexo: { ...x.anexo, [k]: v } })), []);

  // AUTOGUARDADO. Diferido medio segundo: sin la demora se escribe en `localStorage` en
  // cada tecla de cada campo numérico.
  useEffect(() => {
    const id = setTimeout(() => {
      try { window.localStorage.setItem(KEY, JSON.stringify(d)); setGuardadoEn(new Date()); } catch {}
    }, 500);
    return () => clearTimeout(id);
  }, [d]);

  const V = velocidadDe(d.ciudad, d.riesgo) ?? 0;

  const geoN = useMemo(() => normalizarGeo(d.geo), [d.geo]);

  // ── FACTOR TOPOGRÁFICO ──────────────────────────────────────────────────────
  //
  // K_zt NO ES UN NÚMERO, ES UNA FUNCIÓN DE LA ALTURA. K3 = e^(−γ·z/Lh) decae con z, así
  // que sobre una loma el factor es máximo al ras del suelo y va bajando. Había un campo
  // «z de evaluación» que lo congelaba en un valor: se eliminó, porque tomar la altura
  // media de cubierta NO es conservador —abajo de z_mín K_z queda congelado mientras
  // K_zt sigue creciendo hacia abajo, y ahí la presión real supera a la calculada—.
  //
  // Lo que viaja al motor son los DATOS del accidente sin altura (`sitio.topo`), y cada
  // superficie evalúa K_zt a la z que le corresponde. `topo` de acá es el cálculo a la
  // altura media de cubierta, que es el que se informa en la pantalla Sitio.
  const entradaTopo = useMemo(() => ({
    forma: d.topo.forma || undefined,
    exposicion: d.topo.exposicionLocal || d.exposicion,
    H_m: opt(d.topo.H_m), Lh_m: opt(d.topo.Lh_m),
    x_m: num(d.topo.x_m), lado: d.topo.lado,
    cond1_confirmada: !!d.topo.cond1, metodo: d.topo.metodo,
  }), [d.topo, d.exposicion]);

  const topo = useMemo(() => calcularKzt({ ...entradaTopo, z_m: geoN.h }),
    [entradaTopo, geoN.h]);

  // K_zt a nivel del terreno: es el máximo de todo el perfil y va en la pantalla junto al
  // de la cubierta, para que se vea el rango en el que se mueve.
  const topoBase = useMemo(() => calcularKzt({ ...entradaTopo, z_m: 0 }), [entradaTopo]);

  const sitio = useMemo(() => ({
    V, exposicion: d.exposicion, kd: kdDe("edificio_sprfv"),
    // El escalar sigue siendo el de la cubierta: es el que usan q_h y las trazas. Lo que
    // hace variar K_zt con la altura es `topo`, y sólo está cuando el cálculo APLICA.
    Kzt: topo.kzt, topo: topo.aplica ? entradaTopo : null,
    altitud: num(d.altitud), usarKe: d.usarKe !== false,
    puntosPerfil: num(d.puntosPerfil, 10),
  }), [V, d.exposicion, d.altitud, d.usarKe, d.puntosPerfil, topo.kzt, topo.aplica, entradaTopo]);

  /**
   * El `sitio` que le toca a UNA dirección.
   *
   * La nota 3 de la Fig. 1.8-1 dice que los multiplicadores suponen viento en la
   * dirección de máxima pendiente. Con «aplicar a todas» —el defecto— K_zt va en las
   * cuatro, que es mayorar; con la opción desactivada, sólo en las declaradas, y las
   * demás quedan en 1,0.
   */
  const sitioDe = useCallback((dir) => {
    if (!topo.aplica) return sitio;
    if (d.topo.todasLasDirecciones) return sitio;
    // Sin efecto en esta dirección se cae al terreno llano COMPLETO: K_zt = 1,0 y sin
    // datos de accidente, o la pared a barlovento lo seguiría evaluando por tramo.
    return (d.topo.direcciones ?? []).includes(dir.id)
      ? sitio : { ...sitio, Kzt: 1.0, topo: null };
  }, [sitio, topo.aplica, d.topo.todasLasDirecciones, d.topo.direcciones]);


  // El factor de ráfaga se calcula ANTES del análisis y lo alimenta: cuál de las tres
  // vías del art. 1.9 se adopta cambia TODAS las presiones, así que no puede quedar como
  // un bloque informativo al costado.
  const rafaga = useMemo(() => factorRafaga({
    h: geoN.h, B: Math.max(geoN.a, geoN.b), L: Math.min(geoN.a, geoN.b),
    exposicion: d.exposicion, V, n1: num(d.n1), beta: num(d.beta, 0.02),
  }), [geoN.h, geoN.a, geoN.b, d.exposicion, V, d.n1, d.beta]);

  const G = rafaga.opciones.find(o => o.id === d.modoG)?.G ?? 0.85;

  const entrada = useMemo(() => ({ geo: d.geo, sitio, cerramiento: d.cerramiento, G,
    modoG: d.modoG }), [d.geo, sitio, d.cerramiento, G, d.modoG]);

  const todas = useMemo(
    () => DIRECCIONES.map(dir => analizarDireccion({ ...entrada, sitio: sitioDe(dir) }, dir)),
    [entrada, sitioDe]);
  const act = todas[Math.min(iDir, todas.length - 1)];
  // Dos DECLARACIONES del proyectista sobre el sistema estructural, que la app no puede
  // deducir de la geometría: la excepción de la nota 7 de la Figura 2.4-1, y si el piso
  // es parte de la estructura —lo que hace que la presión interna se autoequilibre—.
  const opcRes = useMemo(() => ({ porticosCubierta: d.porticosCubierta === true,
    pisoSolidario: d.pisoSolidario === true }), [d.porticosCubierta, d.pisoSolidario]);
  const res = useMemo(() => resultantes(act, opcRes), [act, opcRes]);
  // Las pantallas que recorren las cuatro direcciones tienen que usar LA MISMA
  // declaración que la dirección activa: llamando a `resultantes(t)` pelado, la tabla de
  // las cuatro aplicaba el piso de la nota 7 aunque el usuario lo hubiera eximido.
  const resDe = useCallback((t) => resultantes(t, opcRes), [opcRes]);

  // El máximo se toma sobre TODO el edificio y TODAS las direcciones. Si se normalizara
  // por dirección, cada croquis usaría su propia escala y dos croquis lado a lado dirían
  // cosas distintas con el mismo color.
  const maxAbs = useMemo(() => Math.max(...todas.flatMap(t =>
    t.superficies.flatMap(s => s.tramos
      ? s.tramos.map(x => Math.abs(x.gobernante))
      : [Math.abs(s.gobernante ?? 0)]))), [todas]);

  // Envolvente de las cuatro direcciones sobre el rango de alturas de alero. Son ~120
  // análisis completos: se memoiza aparte para no rehacerlos al girar el 3D ni al cambiar
  // de pantalla.
  const curvas = useMemo(() => envolvente(DIRECCIONES.map(dir => barridoAlero({
    analizar: analizarDireccion, entrada, direccion: dir,
    desde: 3, hasta: 30, pasos: 27,
  }))), [entrada]);

  // ── CAPÍTULO 4 ─────────────────────────────────────────────────────────────
  //
  // ⚠ EL K_d NO ES EL DEL EDIFICIO. La Tabla 1.6-1 da un valor por TIPO DE ESTRUCTURA:
  // 0,85 para carteles y torres reticuladas de sección usual, 0,90 en chimeneas cuadradas,
  // 0,95 en hexagonales y 1,00 en redondas y octogonales. Arrastrar el 0,85 del edificio a
  // una chimenea redonda baja la carga un 15 % sin ninguna justificación, y el resultado
  // sigue siendo un número plausible.
  const cap4Kd = d.cap4.kd || familiaDe(d.cap4.familia).kd;
  const kdCap4 = kdDe(cap4Kd) ?? 0.85;

  const accesorio = useMemo(() => {
    const c = d.cap4;
    const datos = {
      cartel_lleno:   { B: c.B, s: c.s, h: c.h, eps: c.eps, t: c.t, Lr: c.Lr, dobleCara: c.dobleCara },
      cartel_abierto: { B: c.B, s: c.s, h: c.h, eps: c.epsAb, miembro: c.miembro, Dmiembro: c.Dmiembro },
      chimenea:       { h: c.hChim, D: c.Dchim, filaChimenea: c.filaChimenea },
      torre:          { h: c.hTorre, B: c.BTorre, eps: c.epsTorre,
                        seccionTorre: c.seccionTorre, redondos: c.redondos, diagonal: c.diagonal },
      equipo:         { Bedif: c.Bedif, hedif: c.hedif, Ledif: c.Ledif, Af: c.Af, Ar: c.Ar },
    }[c.familia];
    return analizarAccesorio({ familia: c.familia, datos, sitio, kd: kdCap4, G });
  }, [d.cap4, sitio, kdCap4, G]);

  const kdSilo = kdDe(d.silo.kd || "chim_redonda") ?? 1.0;
  const silo = useMemo(() => analizarSilo({
    datos: d.silo, sitio, kd: kdSilo, G, gcpi: gcpiDe(d.cerramiento) ?? 0,
  }), [d.silo, sitio, kdSilo, G, d.cerramiento]);

  const kdAnexo = kdDe(d.anexo.kd || "chim_redonda") ?? 1.0;
  const anexo = useMemo(() => analizarAnexo({
    familia: d.anexo.familia, sitio, kd: kdAnexo, G,
    datos: { b: d.anexo.b, L: d.anexo.L, z: d.anexo.z, d: d.anexo.d, theta: d.anexo.theta,
      filaI1: d.anexo.filaI1, filaI2: d.anexo.filaI2, filaI5: d.anexo.filaI5,
      perfil: d.anexo.perfil, thetaPerfil: num(d.anexo.thetaPerfil) },
  }), [d.anexo, sitio, kdAnexo, G]);

  const avisos = useMemo(() => avisosDe({
    geoN, sitio, cerramiento: d.cerramiento, rafaga, modoG: d.modoG, n1: d.n1,
    analisis: act, resultantes: res, accesorio, silo, anexo, topo,
  }), [geoN, sitio, d.cerramiento, rafaga, d.modoG, d.n1, act, res, accesorio, silo, anexo, topo]);

  const irA = useCallback((nombre) => setTab(idxTab(nombre)), []);

  const nuevo = () => {
    setD(INICIAL); setIDir(0); setTab(0);
    try { window.localStorage.removeItem(KEY); } catch {}
  };

  const exportar = () => {
    const blob = new Blob([JSON.stringify({ app: "viento-c102-25", v: 1, ...d }, null, 2)],
      { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    // El nombre del archivo sale del nombre del proyecto: con «viento.json» para todos,
    // una carpeta con seis casos es seis archivos indistinguibles.
    a.download = `${(d.proyecto || "viento").replace(/[^\w\- ]+/g, "").trim() || "viento"}.viento.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importar = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const v = JSON.parse(String(r.result));
        setD({ ...INICIAL, ...v, geo: { ...INICIAL.geo, ...(v.geo || {}) } });
      } catch { /* un archivo que no es JSON no debe dejar la app en un estado a medias */ }
    };
    r.readAsText(f);
    e.target.value = "";
  };

  return (
    <Ctx.Provider value={{
      d, set, setGeo, setD, setCap4, setSilo, setAnexo, setTopo,
      topo, topoBase, sitioDe,
      accesorio, silo, anexo, kdCap4, cap4Kd, kdSilo, kdAnexo,
      proyecto: d.proyecto, setProyecto: set("proyecto"),
      tab, setTab, irA, nombreTab: TABS[tab] ?? TABS[0],
      iDir, setIDir, direcciones: DIRECCIONES,
      V, sitio, geoN, rafaga, G, todas, act, res, resDe, maxAbs, curvas,
      avisos, avisosPorTab: porTab(avisos), conteo: contar(avisos),
      guardadoEn, nuevo, exportar, importar, fileRef,
    }}>{children}</Ctx.Provider>
  );
}
