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
import { kztEn } from '../engine/presionDinamica.js';
import { num, opt } from '../lib/parseo.js';
import { resolverV } from '../engine/velocidad.js';
import { clasificar, regionDetritus, hayDiscrepancia } from '../engine/cerramiento.js';
import { ri as riDe, CERRAMIENTOS, riAplicado, gcpiDe } from '../constants/presionInterna.js';
import { factorRafaga, dimensionesDe } from '../engine/factorRafaga.js';
import { resultantes, barridoAlero, envolvente } from '../engine/resultantes.js';
import { estadosDeCarga, envolventeCritica, exencion247 } from '../engine/envolvente.js';
import { aplicabilidadDeTodas } from '../engine/aplicabilidad.js';
import { consolidar, trazaDelMotor } from '../lib/consolidar.js';
import { U } from '../lib/unidades.js';
import { velocidadDe } from '../constants/velocidades.js';
import { kdDe } from '../constants/direccionalidad.js';
import { analizarCyR } from '../engine/cyrPresiones.js';
import { TABS, idxTab } from '../constants/tabs.js';
import { INICIAL } from '../constants/inicial.js';
import { migrar, serializar, nombreArchivo } from '../lib/proyecto.js';
import { avisosDe, porTab, contar } from '../lib/avisos.js';

// Se re-exporta desde donde estaba: los tests y cualquier import viejo lo siguen
// encontrando acá, y la definición vive en un solo lado.
export { INICIAL };

const KEY = "viento_proyecto_v1";
const Ctx = createContext(null);
export const useProyecto = () => useContext(Ctx);

const leer = () => {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) || "null");
    if (v == null) return null;
    // ⚠ LA MISMA RUTA QUE UN ARCHIVO IMPORTADO. Antes esta función fusionaba sub-objeto
    // por sub-objeto y `importar()` no: un archivo con un `topo` de tres claves
    // reemplazaba el objeto entero y las que faltaban entraban al motor como `undefined`.
    return migrar(v);
  } catch { return null; }
};

export function ProyectoProvider({ children }) {
  const inicio = typeof window === "undefined" ? null : leer();
  const [d, setD] = useState(() => inicio?.datos ?? INICIAL);
  // Lo que hubo que hacer para abrir el caso: migración de esquema, archivo de otra app,
  // archivo más nuevo que la aplicación. Se muestra una vez, al abrir.
  const [aperturaAvisos, setAperturaAvisos] = useState(() => inicio?.avisos ?? []);
  const [tab, setTab] = useState(0);
  const [iDir, setIDir] = useState(0);
  const [guardadoEn, setGuardadoEn] = useState(null);
  const fileRef = useRef(null);

  // Un setter por campo evita que cada pantalla escriba `setD(x => ({...x, k: v}))` a
  // mano: repetido en veinte lugares, es donde aparece el que pisa el objeto entero.
  const set = useCallback((k) => (v) => setD(x => ({ ...x, [k]: v })), []);
  /** Setter para un sub-objeto cualquiera del estado, por nombre. */
  const setSub = useCallback((obj) => (k) => (v) =>
    setD(x => ({ ...x, [obj]: { ...x[obj], [k]: v } })), []);
  const setGeo = useCallback((k) => (v) => setD(x => ({ ...x, geo: { ...x.geo, [k]: v } })), []);
  const setTopo = useCallback((k) => (v) => setD(x => ({ ...x, topo: { ...x.topo, [k]: v } })), []);
  // Un setter por sub-objeto. Con `set("cap4")` habría que reconstruir el objeto entero en
  // cada pantalla, que es donde alguien pisa un campo sin querer.
  const setCap4 = useCallback((k) => (v) => setD(x => ({ ...x, cap4: { ...x.cap4, [k]: v } })), []);
  const setSilo = useCallback((k) => (v) => setD(x => ({ ...x, silo: { ...x.silo, [k]: v } })), []);
  const setAnexo = useCallback((k) => (v) => setD(x => ({ ...x, anexo: { ...x.anexo, [k]: v } })), []);
  const setEnv = useCallback((k) => (v) => setD(x => ({ ...x, env: { ...x.env, [k]: v } })), []);
  const setCyR = useCallback((k) => (v) => setD(x => ({ ...x, cyr: { ...x.cyr, [k]: v } })), []);
  const setElementosCyR = useCallback((f) => setD(x => ({
    ...x, elementosCyR: typeof f === "function" ? f(x.elementosCyR ?? []) : f })), []);

  // AUTOGUARDADO. Diferido medio segundo: sin la demora se escribe en `localStorage` en
  // cada tecla de cada campo numérico.
  useEffect(() => {
    const id = setTimeout(() => {
      try { window.localStorage.setItem(KEY, JSON.stringify(d)); setGuardadoEn(new Date()); } catch {}
    }, 500);
    return () => clearTimeout(id);
  }, [d]);

  // ── VELOCIDAD BÁSICA ────────────────────────────────────────────────────────
  // `resolverV` devuelve V junto con la referencia del mapa, la diferencia y los avisos:
  // la velocidad y su justificación viajan juntas, porque una V sin origen declarado no
  // se puede revisar.
  const vel = useMemo(() => resolverV({
    origen: d.origenV ?? "tabla", ciudad: d.ciudad, riesgo: d.riesgo,
    interp: d.vInterp, manual: d.vManual, v50: d.vConv,
  }), [d.origenV, d.ciudad, d.riesgo, d.vInterp, d.vManual, d.vConv]);
  const V = vel.V ?? 0;

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
    V, vel, exposicion: d.exposicion, kd: kdDe("edificio_sprfv"),
    // El escalar sigue siendo el de la cubierta: es el que usan q_h y las trazas. Lo que
    // hace variar K_zt con la altura es `topo`, y sólo está cuando el cálculo APLICA.
    Kzt: topo.kzt, topo: topo.aplica ? entradaTopo : null,
    altitud: num(d.altitud), usarKe: d.usarKe !== false,
    puntosPerfil: num(d.puntosPerfil, 10),
  }), [V, vel, d.exposicion, d.altitud, d.usarKe, d.puntosPerfil, topo.kzt, topo.aplica, entradaTopo]);

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


  // ── CERRAMIENTO ─────────────────────────────────────────────────────────────
  // La región con detritus se evalúa acá porque necesita V y la categoría de riesgo, que
  // son datos de Sitio; la clasificación necesita además la geometría, que es de Edificio.
  // ⚠ LA CIUDAD LA DECIDE `resolverV`, NO EL DESPLEGABLE. Interpolando entre isotacas el
  // sitio está fuera de la tabla por definición, y si en el selector había quedado
  // «Neuquén» la región con detritus salía de Neuquén. `vel.ciudadRef` es `null` en ese
  // caso, y la V del sitio se lleva al mapa de la figura por la proporción de la C 1.5-6.1.
  const detritus = useMemo(() => regionDetritus({
    ciudad: vel.ciudadRef, riesgo: d.riesgo, esSalud: d.cerr.esSalud,
    distanciaCosta: d.cerr.distanciaCosta, declarada: d.cerr.detritusDeclarada,
    origen: d.origenV ?? "tabla", V: vel.V, v50: vel.v50,
  }), [vel.ciudadRef, vel.V, vel.v50, d.origenV, d.riesgo, d.cerr.esSalud,
    d.cerr.distanciaCosta, d.cerr.detritusDeclarada]);

  const cerrCalc = useMemo(() => clasificar({
    geo: geoN, aberturas: d.aberturas, detritus, riesgo: d.riesgo,
  }), [geoN, d.aberturas, detritus, d.riesgo]);

  // `V_i` vacío = automático: el volumen geométrico exacto. Editable porque el art. 1.11
  // habla del volumen NO DIVIDIDO, y con cielorraso hermético o tabiques estancos hay que
  // tomar sólo el del recinto que tiene la abertura dominante.
  const ViAuto = cerrCalc.Vi;
  const Vi = opt(d.cerr.Vi) ?? ViAuto;
  // La expresión (1.11-1) sólo interviene en parcialmente cerrados; en el resto no hay
  // nada que reducir y `Ri` queda en `null`, que NO es lo mismo que 1,0: uno dice «no
  // aplica» y el otro «aplica y da 1».
  const Ri = cerrCalc.clasificacion === "parc_cerrado" ? riDe(Vi, cerrCalc.AogTotal) : null;

  // La clasificación que EFECTIVAMENTE usa el cálculo.
  const cerramiento = d.cerrModo === "calculado" ? cerrCalc.clasificacion : d.cerramiento;

  // ⚠ R_i SE MOSTRABA Y NO SE APLICABA. La pantalla informaba R_i = 0,9327 y las
  // presiones usaban ±0,55 en vez de ±0,513. Ahora el modo es una decisión declarada y el
  // valor elegido viaja a TODOS los consumidores.
  const modoRi = d.cerr.modoRi ?? "uno";
  const RiAplicado = riAplicado({ modo: modoRi, calculado: Ri });
  const gcpiTabla = gcpiDe(cerramiento) ?? 0;
  const gcpiEfectivo = gcpiTabla * RiAplicado;
  const riTraza = { modo: modoRi, calculado: Ri, aplicado: RiAplicado };
  const cerr = { ...cerrCalc, Vi, ViAuto, Ri, detritus, modo: d.cerrModo,
    declarada: d.cerramiento, efectiva: cerramiento,

    // ⚠ `label` Y `motivo` SIGUEN A LA CLASIFICACIÓN EFECTIVA, NO A LA CALCULADA. En modo
    // declarado, mostrar la etiqueta de la calculada junto al GC_pi de la declarada da
    // una pantalla que se contradice a sí misma: decía «Cerrado» y «±0,55».
    label: CERRAMIENTOS.find(x => x.id === cerramiento)?.label ?? "—",
    gcpiTabla, gcpi: gcpiEfectivo, modoRi, RiAplicado, riTraza,
    motivo: d.cerrModo === "calculado" ? cerrCalc.motivo
      : "Clasificación DECLARADA por el proyectista.",
    motivoCalculado: cerrCalc.motivo,
    calculada: cerrCalc.clasificacion,
    // La regla vive en `engine/cerramiento.js`: escrita adentro de este `useMemo` no se
    // puede probar, y es una regla —cuándo dos lecturas del mismo edificio se
    // contradicen—, no un detalle de la pantalla.
    discrepa: hayDiscrepancia({ modo: d.cerrModo, aberturas: d.aberturas,
      declarada: d.cerramiento, calculada: cerrCalc.clasificacion }) };

  // El factor de ráfaga se calcula ANTES del análisis y lo alimenta: cuál de las tres
  // vías del art. 1.9 se adopta cambia TODAS las presiones, así que no puede quedar como
  // un bloque informativo al costado.
  // ── FACTOR DE EFECTO DE RÁFAGA, POR DIRECCIÓN ──────────────────────────────
  //
  // ⚠ NO ES UNO SOLO PARA EL EDIFICIO. En (1.9-8), `B` es la dimensión NORMAL al viento y
  // en (1.9-15), `L` la PARALELA: las dos se intercambian al girar el viento 90°. Antes
  // esto se llamaba una vez con `B = max(a,b)` y ese G se aplicaba a las cuatro
  // direcciones. Como Q baja cuando B crece, ésa es la elección que da el G MÁS CHICO: en
  // una nave de 20 × 100 m daba 0,790 donde a la dirección que sopla contra la cara de
  // 20 m le corresponde 0,854. Un 8 % de menos en todas las presiones de esa dirección,
  // del lado inseguro, sin nada en el resultado que lo delate.
  const rafagaPara = useCallback((dir, h = geoN.h, planta = geoN) => factorRafaga({
    h, ...dimensionesDe(planta, dir),
    exposicion: d.exposicion, V, n1: num(d.n1), beta: num(d.beta, 0.02),
  }), [geoN, d.exposicion, V, d.n1, d.beta]);

  const rafagaTodas = useMemo(() => Object.fromEntries(
    DIRECCIONES.map(dir => [dir.id, rafagaPara(dir)])), [rafagaPara]);
  const gDe = useCallback((dir, r) =>
    (r ?? rafagaTodas[dir.id]).opciones.find(o => o.id === d.modoG)?.G ?? 0.85,
    [rafagaTodas, d.modoG]);

  // La pantalla de Ráfaga muestra la dirección ACTIVA, igual que Presiones y Resultantes.
  const rafaga = rafagaTodas[DIRECCIONES[Math.min(iDir, 3)].id];
  const G = gDe(DIRECCIONES[Math.min(iDir, 3)], rafaga);

  const entrada = useMemo(() => ({ geo: d.geo, sitio, cerramiento, G,
    modoG: d.modoG, gcpi: gcpiEfectivo, ri: riTraza }),
  [d.geo, sitio, cerramiento, G, d.modoG, gcpiEfectivo,
    riTraza.modo, riTraza.calculado, riTraza.aplicado]);

  const todas = useMemo(
    () => DIRECCIONES.map(dir => analizarDireccion(
      { ...entrada, sitio: sitioDe(dir), G: gDe(dir) }, dir)),
    [entrada, sitioDe, gDe]);
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

  // ── CASOS DE CARGA DE LA FIGURA 2.4-8 ──────────────────────────────────────
  //
  // La envolvente barre 4 direcciones × 2 signos de GC_pi × 2 casos de la nota 3 × los
  // casos de la figura, con los dos signos de la excentricidad en los torsionales. Es lo
  // que reemplaza a mirar una dirección por vez: hasta acá la pantalla mostraba la
  // dirección seleccionada y el proyectista tenía que recorrer el selector a mano.
  //
  // ⚠ ES LA MISMA `entrada` QUE `todas`, PERO SIN `sitioDe`. La exención topográfica por
  // dirección se resuelve adentro de `analizar`, así que se le pasa una función que ya la
  // aplica: sin eso, la envolvente usaría K_zt en las cuatro direcciones aunque el
  // proyectista lo hubiera limitado a algunas.
  const analizarConSitio = useCallback((ent, dir) =>
    analizarDireccion({ ...ent, sitio: sitioDe(dir) }, dir), [sitioDe]);

  // `flexible` sale del MISMO criterio que el factor de ráfaga —n₁ < 1 Hz, art. 1.2—, no
  // de una casilla aparte: dos definiciones de «edificio flexible» en la misma app es
  // cómo se llega a un G_f de flexible con una excentricidad de rígido.
  const esFlexible = rafaga.flexible || d.modoG === "flexible";

  const exen = useMemo(() => exencion247({
    cond247: d.env.cond247, arts247: d.env.arts247, h: geoN.h,
  }), [d.env.cond247, d.env.arts247, geoN.h]);

  const envCasos = useMemo(() => {
    const estados = estadosDeCarga({ analizar: analizarConSitio, entrada, opc: {
      ...opcRes, exentoArt247: exen.exento, flexible: esFlexible,
      diafragma: d.env.diafragma,
    } });
    return { ...envolventeCritica(estados), exen, flexible: esFlexible,
      diafragma: d.env.diafragma };
  }, [analizarConSitio, entrada, opcRes, exen, esFlexible, d.env.diafragma]);

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
    // ⚠ EL SITIO Y EL G SE REHACEN EN CADA PUNTO. La curva usaba el `entrada` pelado, así
    // que ignoraba la exención topográfica por dirección y congelaba el G del alero
    // actual. Con el G calculado o el de flexible eso hace que la curva no sea la
    // continuación del número que muestran las otras pantallas.
    preparar: (hAlero) => {
      const g = normalizarGeo({ ...d.geo, hAlero });
      return { sitio: sitioDe(dir), G: gDe(dir, rafagaPara(dir, g.h, g)) };
    },
  }))), [entrada, d.geo, sitioDe, gDe, rafagaPara]);

  // ── CAPÍTULO 4 ─────────────────────────────────────────────────────────────
  //
  // ⚠ EL K_d NO ES EL DEL EDIFICIO. La Tabla 1.6-1 da un valor por TIPO DE ESTRUCTURA:
  // 0,85 para carteles y torres reticuladas de sección usual, 0,90 en chimeneas cuadradas,
  // 0,95 en hexagonales y 1,00 en redondas y octogonales. Arrastrar el 0,85 del edificio a
  // una chimenea redonda baja la carga un 15 % sin ninguna justificación, y el resultado
  // sigue siendo un número plausible.
  const cap4Kd = d.cap4.kd || familiaDe(d.cap4.familia).kd;
  const kdCap4 = kdDe(cap4Kd) ?? 0.85;

  // ── EL G QUE VIAJA AL CAPÍTULO 4 ───────────────────────────────────────────
  // Esas estructuras no son el edificio y su factor de ráfaga debería salir de su propia
  // geometría; hoy arrastran el del edificio. Mientras siga siendo así, se les pasa el
  // MAYOR de las cuatro direcciones y no el de la dirección activa: cambiar de dirección
  // en el selector no puede mover la presión sobre un cartel.
  const gCap4 = useMemo(() => Math.max(...DIRECCIONES.map(dir => gDe(dir))), [gDe]);

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
    return analizarAccesorio({ familia: c.familia, datos, sitio, kd: kdCap4, G: gCap4 });
  }, [d.cap4, sitio, kdCap4, gCap4]);

  const kdSilo = kdDe(d.silo.kd || "chim_redonda") ?? 1.0;
  const silo = useMemo(() => analizarSilo({
    // El silo comparte el cerramiento del edificio, así que comparte también su R_i: si
    // usara el GC_pi sin reducir, dos pantallas informarían presiones internas distintas
    // para la misma envolvente.
    datos: d.silo, sitio, kd: kdSilo, G: gCap4, gcpi: gcpiEfectivo,
  }), [d.silo, sitio, kdSilo, gCap4, gcpiEfectivo]);

  const kdAnexo = kdDe(d.anexo.kd || "chim_redonda") ?? 1.0;
  const anexo = useMemo(() => analizarAnexo({
    familia: d.anexo.familia, sitio, kd: kdAnexo, G: gCap4,
    datos: { b: d.anexo.b, L: d.anexo.L, z: d.anexo.z, d: d.anexo.d, theta: d.anexo.theta,
      filaI1: d.anexo.filaI1, filaI2: d.anexo.filaI2, filaI5: d.anexo.filaI5,
      perfil: d.anexo.perfil, thetaPerfil: num(d.anexo.thetaPerfil) },
  }), [d.anexo, sitio, kdAnexo, gCap4]);

  // ── COMPONENTES Y REVESTIMIENTOS — CAPÍTULO 5 ──────────────────────────────
  //
  // Otro camino de cálculo sobre el MISMO edificio: no pide un solo dato nuevo salvo la
  // lista de elementos. Toma V, exposición, altitud, geometría y el GC_pi que ya salió del
  // cerramiento —con su R_i aplicado—, y su único parámetro propio es el K_d de la fila
  // «Edificios — componentes y revestimientos» de la Tabla 1.6-1, que es 0,85 igual que el
  // del SPRFV pero sale de otra fila y conviene que se vea de dónde.
  //
  // ⚠ K_zt ENTRA COMO FUNCIÓN Y NO COMO NÚMERO. La figura del capítulo 5 decide si la
  // altura de referencia es la media o la del alero, y eso recién se sabe adentro del
  // motor; K_zt hay que evaluarlo a ESA altura. Se pasa `kztDe(z)`, que devuelve una
  // entrada por dirección, y el motor toma el máximo: C&R es envolvente de todas las
  // direcciones, así que quedarse con el de una sola dejaría afuera la que agrava.
  const kdCyR = kdDe("edificio_cyr") ?? 0.85;
  const elementosCyR = useMemo(() => (d.elementosCyR ?? []).map(el => ({
    ...el, L: num(el.L), s: num(el.s), area: num(el.area),
  })), [d.elementosCyR]);

  const cyr = useMemo(() => analizarCyR({
    geo: geoN, V, exposicion: d.exposicion, altitud: num(d.altitud, 0), kd: kdCyR,
    kztDe: (z) => DIRECCIONES.map(dir => kztEn(sitioDe(dir), z)),
    gcpi: Math.abs(gcpiEfectivo), parapeto: !!d.cyr.parapeto, elementos: elementosCyR,
  }), [geoN, V, d.exposicion, d.altitud, kdCyR, sitioDe, gcpiEfectivo, d.cyr.parapeto,
    elementosCyR]);

  // ── APLICABILIDAD ──────────────────────────────────────────────────────────
  // En qué fila y en qué columna de la Figura 2.4-1 cayó cada dirección, y cuáles de esas
  // lecturas la figura no escribe. Es lo que convierte «el número salió» en «el número
  // salió de acá y se puede controlar contra el papel».
  const aplic = useMemo(() => aplicabilidadDeTodas(todas), [todas]);

  // ── LA TRAZA CONSOLIDADA ───────────────────────────────────────────────────
  // UN solo árbol para el panel, la memoria y el Word. Con tres lectores y cinco
  // formatos, lo que pasa es que el panel se corrige y la memoria queda atrás —o al
  // revés— y dos salidas de la misma corrida dicen cosas distintas.
  const traza = useMemo(() => consolidar({ vel, sitio, topo, geoN, cerr, rafaga, G,
    modoG: d.modoG, act, res, envCasos, U, d }),
  [vel, sitio, topo, geoN, cerr, rafaga, G, d.modoG, act, res, envCasos, d]);
  const trazaMotor = useMemo(() => trazaDelMotor(act), [act]);

  const avisos = useMemo(() => avisosDe({
    geoN, sitio, cerramiento: d.cerramiento, rafaga, modoG: d.modoG, n1: d.n1,
    analisis: act, resultantes: res, accesorio, silo, anexo, topo, aplic, rafagaTodas,
  }), [geoN, sitio, d.cerramiento, rafaga, d.modoG, d.n1, act, res, accesorio, silo, anexo,
    topo, aplic, rafagaTodas]);

  const irA = useCallback((nombre) => setTab(idxTab(nombre)), []);

  const nuevo = () => {
    setD(INICIAL); setIDir(0); setTab(0); setAperturaAvisos([]);
    try { window.localStorage.removeItem(KEY); } catch {}
  };

  const exportar = () => {
    // El sobre de procedencia lo arma `lib/proyecto.js`: versión de la app, edición del
    // reglamento, procedimiento, fecha y aviso de responsabilidad. Un archivo de
    // presiones sin eso no se puede auditar dentro de dos años.
    const blob = new Blob([JSON.stringify(serializar(d), null, 2)],
      { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nombreArchivo(d.proyecto);
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importar = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const m = migrar(JSON.parse(String(r.result)));
        setD(m.datos);
        setAperturaAvisos(m.avisos);
        setIDir(0);
      } catch {
        // Un archivo que no es JSON no debe dejar la app en un estado a medias: se
        // conserva lo que había y se dice que no se pudo leer.
        setAperturaAvisos(["No se pudo leer el archivo: no es un JSON válido."]);
      }
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
      V, vel, setSub, sitio, geoN, rafaga, rafagaTodas, gDe, gCap4, G,
      todas, act, res, resDe, maxAbs, curvas,
      cerr, cerramiento, envCasos, setEnv, aplic, traza, trazaMotor,
      cyr, kdCyR, setCyR, elementosCyR: d.elementosCyR, setElementosCyR,
      avisos, avisosPorTab: porTab(avisos), conteo: contar(avisos),
      guardadoEn, nuevo, exportar, importar, fileRef,
      aperturaAvisos, descartarAperturaAvisos: () => setAperturaAvisos([]),
    }}>{children}</Ctx.Provider>
  );
}
