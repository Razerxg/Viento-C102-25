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
import { analizarEdificio, analizarDireccion, normalizarGeo, DIRECCIONES } from '../engine/edificio.js';
import { analizarAccesorio, analizarSilo, familiaDe } from '../engine/otrasEstructuras.js';
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
  geo: { a: "20", b: "30", hAlero: "6", theta: "0", cumbrera: "X",
    tipo: "plana", pendienteHacia: "+Y" },
  n1: "",
  beta: "0.02",
  modoG: "defecto",
  tipoFrec: "",
  puntosPerfil: "10",

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
      cap4: { ...INICIAL.cap4, ...(v.cap4 || {}) },
      silo: { ...INICIAL.silo, ...(v.silo || {}) } } : null;
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
  // Un setter por sub-objeto. Con `set("cap4")` habría que reconstruir el objeto entero en
  // cada pantalla, que es donde alguien pisa un campo sin querer.
  const setCap4 = useCallback((k) => (v) => setD(x => ({ ...x, cap4: { ...x.cap4, [k]: v } })), []);
  const setSilo = useCallback((k) => (v) => setD(x => ({ ...x, silo: { ...x.silo, [k]: v } })), []);

  // AUTOGUARDADO. Diferido medio segundo: sin la demora se escribe en `localStorage` en
  // cada tecla de cada campo numérico.
  useEffect(() => {
    const id = setTimeout(() => {
      try { window.localStorage.setItem(KEY, JSON.stringify(d)); setGuardadoEn(new Date()); } catch {}
    }, 500);
    return () => clearTimeout(id);
  }, [d]);

  const V = velocidadDe(d.ciudad, d.riesgo) ?? 0;

  const sitio = useMemo(() => ({
    V, exposicion: d.exposicion, kd: kdDe("edificio_sprfv"), Kzt: 1.0,
    altitud: parseFloat(d.altitud) || 0, usarKe: d.usarKe !== false,
    puntosPerfil: parseInt(d.puntosPerfil, 10) || 10,
  }), [V, d.exposicion, d.altitud, d.usarKe, d.puntosPerfil]);

  const geoN = useMemo(() => normalizarGeo(d.geo), [d.geo]);

  // El factor de ráfaga se calcula ANTES del análisis y lo alimenta: cuál de las tres
  // vías del art. 1.9 se adopta cambia TODAS las presiones, así que no puede quedar como
  // un bloque informativo al costado.
  const rafaga = useMemo(() => factorRafaga({
    h: geoN.h, B: Math.max(geoN.a, geoN.b), L: Math.min(geoN.a, geoN.b),
    exposicion: d.exposicion, V, n1: parseFloat(d.n1) || 0, beta: parseFloat(d.beta) || 0.02,
  }), [geoN.h, geoN.a, geoN.b, d.exposicion, V, d.n1, d.beta]);

  const G = rafaga.opciones.find(o => o.id === d.modoG)?.G ?? 0.85;

  const entrada = useMemo(() => ({ geo: d.geo, sitio, cerramiento: d.cerramiento, G }),
    [d.geo, sitio, d.cerramiento, G]);

  const todas = useMemo(() => analizarEdificio(entrada), [entrada]);
  const act = todas[Math.min(iDir, todas.length - 1)];
  const res = useMemo(() => resultantes(act), [act]);

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

  const avisos = useMemo(() => avisosDe({
    geoN, sitio, cerramiento: d.cerramiento, rafaga, modoG: d.modoG, n1: d.n1,
    analisis: act, resultantes: res, accesorio, silo,
  }), [geoN, sitio, d.cerramiento, rafaga, d.modoG, d.n1, act, res, accesorio, silo]);

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
      d, set, setGeo, setD, setCap4, setSilo,
      accesorio, silo, kdCap4, cap4Kd, kdSilo,
      proyecto: d.proyecto, setProyecto: set("proyecto"),
      tab, setTab, irA, nombreTab: TABS[tab] ?? TABS[0],
      iDir, setIDir, direcciones: DIRECCIONES,
      V, sitio, geoN, rafaga, G, todas, act, res, maxAbs, curvas,
      avisos, avisosPorTab: porTab(avisos), conteo: contar(avisos),
      guardadoEn, nuevo, exportar, importar, fileRef,
    }}>{children}</Ctx.Provider>
  );
}
