// PRIMITIVAS COMPARTIDAS DE LOS CROQUIS.
//
// Todo croquis de esta app se arma con estas piezas. Tenerlas en un solo lugar no es para
// ahorrar líneas: es para que las cotas, las flechas y los rótulos se vean IGUAL en los
// nueve dibujos. Cuando cada croquis define su propia cota, terminan con tres tamaños de
// letra y dos grosores de línea, y el conjunto se lee como tres documentos distintos.
//
// ── LAS CUATRO REGLAS QUE GOBIERNAN ESTE ARCHIVO ────────────────────────────────
//
// 1 · EL TEXTO NO ESCALA CON EL DIBUJO. Un `<text font-size="11">` dentro de un `viewBox`
//     de 620 unidades, renderizado en una tarjeta de 470 px, se lee a 8,2 px; en la vista
//     3D, a 5,9. Medido por el control automático: 6.298 textos por debajo del mínimo en
//     la matriz entera. `Lienzo` mide su ancho real y publica el factor `k = viewBox/px`;
//     cada texto pide su tamaño en PÍXELES y acá se multiplica por `k`. El mínimo son
//     11 px y se aplica acá, no en cada llamador.
//
// 2 · EL TEXTO LLEVA HALO, NO UN RECTÁNGULO OPACO DETRÁS. El rectángulo tapaba el dibujo
//     —y en un croquis lo que está detrás del número suele ser justo la línea que el
//     número acota—. Con `paint-order: stroke` el trazo del color del fondo se dibuja
//     ANTES del relleno: el texto se lee sobre cualquier cosa y no borra nada.
//
// 3 · LA COTA MIDE SU TEXTO. Con el ancho real —medido con el motor de texto, no estimado
//     por cantidad de letras— decide si entra entre las líneas de referencia. Si no
//     entra, se va afuera con línea guía; si afuera tampoco hay lugar, se omite y el
//     croquis lo declara. La línea de cota se INTERRUMPE detrás del texto.
//
// 4 · LOS CROQUIS DEL MISMO EDIFICIO COMPARTEN ESCALA. `Lienzo` la publica en
//     `data-escala` (unidades de viewBox por metro) junto con `data-edificio`, y el
//     control automático exige que coincidan dentro del 1 %. Sin eso, planta y elevación
//     del mismo galpón se dibujan a tamaños distintos y no se pueden comparar mirando.
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { c, TAM, FUENTE } from '../tokens.js';

// ── TAMAÑOS, EN PÍXELES DE PANTALLA ─────────────────────────────────────────────
// No en unidades de `viewBox`: ver la regla 1. `min` es el piso que exige el control.
export const TXT = { min: 11, cota: 11, rotulo: 11.5, zona: 12, titulo: 12.5 };

/** El fondo sobre el que se dibuja un croquis: es el halo del texto y el relleno del círculo de zona. */
const PAPEL = c.raised;

// ── MEDICIÓN DE TEXTO ───────────────────────────────────────────────────────────
// Con el motor de texto del navegador, no contando letras: «1.793 N/m²» y «11111111111»
// tienen los mismos caracteres y anchos muy distintos, y una cota que decide por cantidad
// de letras se equivoca justo en los números angostos, que son la mayoría.
//
// En jsdom no hay canvas: el respaldo por cantidad de letras mantiene los tests andando,
// y de todos modos es sólo una estimación para decidir dónde poner un rótulo.
//
// ⚠ A JSDOM SE LO PREGUNTA POR EL `userAgent` Y NO SE PRUEBA A VER QUÉ PASA. Su
// `getContext` no tira: devuelve `null` y escribe «Not implemented» en la consola
// virtual, y la prueba de humo de las pantallas falla si alguna escribe en la consola —que
// es justamente para lo que está—. Detectarlo antes de llamar es lo único que evita un
// error de consola por cada texto de cada croquis.
const SIN_CANVAS = typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent);
let ctx2d;
const cache = new Map();
export function anchoTexto(texto, tam, peso = 400) {
  const clave = `${peso}|${tam}|${texto}`;
  const visto = cache.get(clave);
  if (visto !== undefined) return visto;
  let w;
  try {
    if (ctx2d === undefined) {
      ctx2d = (typeof document === "undefined" || SIN_CANVAS) ? null
        : document.createElement("canvas").getContext("2d");
    }
    if (ctx2d) {
      ctx2d.font = `${peso} ${tam}px ${FUENTE}`;
      w = ctx2d.measureText(String(texto)).width;
    }
  } catch { w = undefined; }
  if (!(w > 0)) w = String(texto).length * tam * 0.56;
  cache.set(clave, w);
  return w;
}

// ── EL FACTOR DE ESCALA DEL TEXTO ───────────────────────────────────────────────
const CtxK = createContext(1);
/** Unidades de `viewBox` por píxel de pantalla. Multiplicá por esto cualquier tamaño. */
export const useEscalaTexto = () => useContext(CtxK);

/** El ancho que va a ocupar un texto, en unidades de `viewBox`. */
export const anchoEnLienzo = (texto, tam, k, peso = 400) =>
  anchoTexto(texto, Math.max(TXT.min, tam), peso) * k;

// ── VISTA: DEL MODELO A LA PANTALLA ─────────────────────────────────────────────
//
// ⚠ INVIERTE EL EJE Y. En el modelo +y es HACIA ARRIBA —es una altura— y en SVG +y va
// hacia abajo. Si no se resuelve acá, cada croquis lo resuelve por su cuenta y alguno
// queda dado vuelta. Rotular los ejes teniendo esto presente.
//
// `esc` es unidades de `viewBox` por metro: es lo que `Lienzo` publica en `data-escala` y
// lo que permite exigir que dos vistas del mismo edificio compartan escala. Cuando tienen
// que compartirla se calcula con `escalaComun` y se pasa en `escalaFija`.
export function mkView({ ancho, alto, xMin, xMax, yMin, yMax, margen = 40, escalaFija }) {
  const w = Math.max(1e-9, xMax - xMin), h = Math.max(1e-9, yMax - yMin);
  const esc = escalaFija ?? Math.min((ancho - 2 * margen) / w, (alto - 2 * margen) / h);
  const dx = (ancho - w * esc) / 2 - xMin * esc;
  const dy = (alto - h * esc) / 2 + yMax * esc;
  return { esc, x: (mx) => mx * esc + dx, y: (my) => dy - my * esc, l: (m) => m * esc };
}

/**
 * La escala común a varias vistas del mismo edificio: la MÁS CHICA de las que cada una
 * usaría por su cuenta. Con la más grande, alguna se sale de su lienzo.
 *
 * @param {{ancho:number, alto:number, w:number, h:number, margen?:number}[]} vistas
 */
export const escalaComun = (vistas) => Math.min(...vistas.map(v =>
  Math.min((v.ancho - 2 * (v.margen ?? 40)) / Math.max(1e-9, v.w),
    (v.alto - 2 * (v.margen ?? 40)) / Math.max(1e-9, v.h))));

// ── LA ESCALA SALE DEL ANCHO; EL ALTO SALE DEL DIBUJO ───────────────────────────
//
// ⚠ ANTES LA CAJA TENÍA ALTO FIJO Y EL DIBUJO SE ENCOGÍA PARA ENTRAR. Medido sobre la
// matriz de control: el galpón de 20 × 30 se dibujaba a 8,4 px/m cuando el ancho
// disponible daba para 21,9. Dos tercios del croquis eran aire a los costados y el dibujo
// salía dos veces y media más chico de lo que podía. No es una cuestión de gusto: en un
// shelter de 2,4 × 3,0 las franjas de zona miden centímetros, y comprimido no se ven.
//
// Acá la escala la fija el ANCHO —que es lo que la columna de verdad limita— y el alto de
// la caja se deriva del dibujo. `altoMaximo` es la única concesión: una planta muy
// alargada pediría una lámina de varias pantallas de alto, y ahí vuelve a gobernar el
// alto, que es el comportamiento de antes.
export function escalaPorAncho(vistas, { altoMaximo = Infinity } = {}) {
  return Math.min(...vistas.map(v => {
    const m = v.margen ?? 40;
    const porAncho = (v.ancho - 2 * m) / Math.max(1e-9, v.w);
    const tope = (Math.min(v.altoMaximo ?? altoMaximo, Infinity) - 2 * m)
      / Math.max(1e-9, v.h);
    return Math.min(porAncho, tope);
  }));
}

/** El alto que necesita una caja para contener su dibujo a esa escala. */
export const altoNecesario = (v, esc) => Math.ceil(v.h * esc + 2 * (v.margen ?? 40));

/** Los factores de zoom que ofrece la barra del croquis. */
export const ZOOMS = [1, 1.5, 2, 3];

// ── TEXTO ───────────────────────────────────────────────────────────────────────
/**
 * El único `<text>` del repositorio. Todo rótulo, cota y número de zona pasa por acá, así
 * que el mínimo de tamaño y el halo se aplican una vez y no nueve.
 *
 * `tam` va en PÍXELES DE PANTALLA. `rot` gira alrededor del punto de anclaje.
 */
export function Texto({ x, y, texto, color = c.txt2, tam = TXT.rotulo, peso = 400,
  ancla = "middle", halo = true, rot = 0, ...resto }) {
  const k = useEscalaTexto();
  const px = Math.max(TXT.min, tam);
  const t = (
    <text x={x} y={y} fill={color} fontSize={px * k} fontWeight={peso} textAnchor={ancla}
      dominantBaseline="central" style={halo ? {
        paintOrder: "stroke", stroke: PAPEL, strokeWidth: 3.2 * k,
        strokeLinejoin: "round", strokeLinecap: "round",
      } : undefined} {...resto}>{texto}</text>
  );
  return rot ? <g transform={`rotate(${rot} ${x} ${y})`}>{t}</g> : t;
}

// ── RÓTULO ──────────────────────────────────────────────────────────────────────
// Se conserva el nombre porque lo usan los nueve croquis. Ya no dibuja el rectángulo
// opaco: con halo se lee igual y no borra el dibujo que tiene debajo.
export function Rotulo({ x, y, texto, color = c.txt, tam = TXT.rotulo, peso = 400,
  ancla = "middle", rot = 0, ...resto }) {
  return <Texto x={x} y={y} texto={texto} color={color} tam={tam} peso={peso}
    ancla={ancla} rot={rot} {...resto} />;
}

// ── UBICACIÓN DE RÓTULOS, POR PRUEBA DE POSICIONES ──────────────────────────────
//
// ⚠ ES UNA FUNCIÓN PURA Y SE LLAMA AL ARMAR EL DIBUJO, NO AL PINTARLO. Un registro
// mutable que cada `<Rotulo>` fuera llenando durante el render daría resultados distintos
// según el orden en que React monte los hijos, y en modo estricto —que renderiza dos
// veces— daría dos ubicaciones distintas para el mismo rótulo.
//
// `candidatos` va EN ORDEN DE PREFERENCIA: centro de la región primero, después arriba,
// abajo y los costados. Devuelve el primero que no pise nada ya ocupado; si ninguno
// entra, el último marcado `apretado`, que el croquis dibuja igual: un número mal puesto
// se corrige mirando y un número ausente no se nota.
export function ubicar(candidatos, ocupados, { w, h }, margen = 2) {
  const choca = (cx, cy) => ocupados.some(o =>
    cx - w / 2 < o.x + o.w / 2 + margen && o.x - o.w / 2 < cx + w / 2 + margen
    && cy - h / 2 < o.y + o.h / 2 + margen && o.y - o.h / 2 < cy + h / 2 + margen);
  for (const cand of candidatos) {
    if (!choca(cand.x, cand.y)) return { ...cand, w, h, apretado: false };
  }
  const ultimo = candidatos[candidatos.length - 1] ?? { x: 0, y: 0 };
  return { ...ultimo, w, h, apretado: true };
}

/** Posiciones alrededor de un punto, en el orden en que se prueban. */
export const candidatosAlrededor = (x, y, dx, dy) => [
  { x, y }, { x, y: y - dy }, { x, y: y + dy }, { x: x - dx, y }, { x: x + dx, y },
  { x: x - dx, y: y - dy }, { x: x + dx, y: y + dy },
];

// ── COTA ────────────────────────────────────────────────────────────────────────
//
// La versión anterior dibujaba el texto siempre en el medio, con un rectángulo opaco
// detrás y sin preguntar si entraba. En una franja de zona de 1 m contra una planta de
// 11 m eso da un «a = 1.000» montado sobre el número de zona de al lado, que es
// exactamente uno de los defectos medidos.
//
// Acá el texto se mide. Si entra entre las dos marcas va sobre la línea, y la línea se
// interrumpe detrás de él. Si no entra, sale por el extremo con una línea guía. Y con
// `omitirSiNoEntra`, cuando afuera tampoco hay lugar no se dibuja: el croquis avisa «ver
// tabla» y el dato sigue estando, en la tabla de al lado.
export function Cota({ x1, y1, x2, y2, texto, desplaz = 0, color = c.txt2,
  tam = TXT.cota, marca = 5, omitirSiNoEntra = false, onOmitida }) {
  const k = useEscalaTexto();
  const dx = x2 - x1, dy = y2 - y1;
  const n = Math.hypot(dx, dy) || 1;
  const [ux, uy] = [dx / n, dy / n];
  const [ox, oy] = [-uy * desplaz, ux * desplaz];
  const [ax, ay, bx, by] = [x1 + ox, y1 + oy, x2 + ox, y2 + oy];
  const [mx, my] = [(ax + bx) / 2, (ay + by) / 2];

  const w = anchoEnLienzo(texto, tam, k) + 6 * k;
  const entra = w + 2 * marca <= n;
  if (!entra && omitirSiNoEntra) { onOmitida?.(texto); return null; }

  // Afuera: más allá del segundo extremo, corrido medio texto más la marca.
  const fx = bx + ux * (w / 2 + marca * 1.6), fy = by + uy * (w / 2 + marca * 1.6);

  const tick = (px, py) => {
    const [kx, ky] = [(ux + uy) * marca, (uy - ux) * marca];
    return <line x1={px - kx} y1={py - ky} x2={px + kx} y2={py + ky}
      stroke={color} strokeWidth="1" />;
  };

  // La línea se parte en dos cuando el texto la cruza: un trazo que pasa por detrás de un
  // número lo tacha aunque el número tenga halo, y el halo es para lo que el dibujo NO
  // puede prever, no para lo que ya sabe.
  const hueco = w / 2 + 2 * k;
  return (
    <g>
      {entra ? <>
        <line x1={ax} y1={ay} x2={mx - ux * hueco} y2={my - uy * hueco}
          stroke={color} strokeWidth="0.9" />
        <line x1={mx + ux * hueco} y1={my + uy * hueco} x2={bx} y2={by}
          stroke={color} strokeWidth="0.9" />
      </> : <>
        <line x1={ax} y1={ay} x2={bx} y2={by} stroke={color} strokeWidth="0.9" />
        <line x1={bx} y1={by} x2={fx - ux * w / 2} y2={fy - uy * w / 2}
          stroke={color} strokeWidth="0.6" opacity="0.8" />
      </>}
      {desplaz !== 0 && <>
        <line x1={x1} y1={y1} x2={ax + ox * 0.18} y2={ay + oy * 0.18} stroke={color}
          strokeWidth="0.6" opacity="0.7" />
        <line x1={x2} y1={y2} x2={bx + ox * 0.18} y2={by + oy * 0.18} stroke={color}
          strokeWidth="0.6" opacity="0.7" />
      </>}
      {tick(ax, ay)}{tick(bx, by)}
      <Texto x={entra ? mx : fx} y={entra ? my : fy} texto={texto} color={color} tam={tam} />
    </g>
  );
}

/**
 * La cota informativa de los croquis del capítulo 2: puntos en los extremos en vez de
 * marcas a 45°. Existe separada de `Cota` porque no compiten —una acota presiones y la
 * otra se transcribe a un plano— pero comparte el texto, la medición y la interrupción.
 */
export function Dim({ x1, y1, x2, y2, texto, desplaz = 0, color = c.txt2, tam = TXT.cota }) {
  const k = useEscalaTexto();
  const dx = x2 - x1, dy = y2 - y1;
  const n = Math.hypot(dx, dy) || 1;
  const [ux, uy] = [dx / n, dy / n];
  const [ox, oy] = [-uy * desplaz, ux * desplaz];
  const [ax, ay, bx, by] = [x1 + ox, y1 + oy, x2 + ox, y2 + oy];
  const [mx, my] = [(ax + bx) / 2, (ay + by) / 2];
  const w = anchoEnLienzo(texto, tam, k) + 6 * k;
  const entra = w <= n;
  const hueco = w / 2 + 2 * k;
  const fx = bx + ux * (w / 2 + 6 * k), fy = by + uy * (w / 2 + 6 * k);
  return (
    <g>
      {entra ? <>
        <line x1={ax} y1={ay} x2={mx - ux * hueco} y2={my - uy * hueco}
          stroke={color} strokeWidth="1" />
        <line x1={mx + ux * hueco} y1={my + uy * hueco} x2={bx} y2={by}
          stroke={color} strokeWidth="1" />
      </> : (
        <line x1={ax} y1={ay} x2={bx} y2={by} stroke={color} strokeWidth="1" />
      )}
      <line x1={x1} y1={y1} x2={ax} y2={ay} stroke={color} strokeWidth="0.5" opacity="0.6" />
      <line x1={x2} y1={y2} x2={bx} y2={by} stroke={color} strokeWidth="0.5" opacity="0.6" />
      {[[ax, ay], [bx, by]].map(([px, py], i) =>
        <circle key={i} cx={px} cy={py} r="1.8" fill={color} />)}
      <Texto x={entra ? mx : fx} y={entra ? my : fy} texto={texto} color={color} tam={tam} />
    </g>
  );
}

/**
 * Una CADENA de cotas encadenadas sobre la misma recta, apilada en filas.
 *
 * Las cadenas son donde la cota se rompe: tres tramos seguidos dan tres etiquetas en el
 * ancho de una, y la versión anterior las escalonaba alternando el desplazamiento de a
 * una, que sólo alcanza para dos. Acá se asigna fila por fila: cada etiqueta baja a la
 * primera fila donde su intervalo no se solapa con nada ya puesto.
 *
 * `cortes` son las posiciones en el modelo, `al` las lleva al lienzo y `fijo` es la
 * coordenada constante de la recta, ya en el lienzo.
 */
export function CadenaDeCotas({ cortes, eje, fijo, al, textos, desplaz = 18, paso = 17,
  color = c.txt2, tam = TXT.cota }) {
  const k = useEscalaTexto();
  const filas = [];       // filas[i] = intervalos ya ocupados en esa fila
  const piezas = [];
  for (let i = 1; i < cortes.length; i++) {
    const texto = textos[i - 1];
    if (texto == null) continue;
    const [p, q] = [al(cortes[i - 1]), al(cortes[i])];
    const w = anchoEnLienzo(texto, tam, k) + 8 * k;
    // ⚠ SE RESERVA EL LUGAR DONDE LA COTA VA A PONER EL TEXTO, NO EL CENTRO DEL TRAMO.
    // Cuando el texto no entra entre las marcas, `Cota` lo saca AFUERA, más allá del
    // segundo extremo. Reservando el centro, ese texto caía sobre el tramo siguiente y
    // las dos etiquetas se montaban aunque cada una tuviera su fila asignada.
    const entra = w + 10 <= Math.abs(q - p);
    const medio = (p + q) / 2;
    const [a, b] = entra
      ? [medio - w / 2, medio + w / 2]
      : [Math.max(p, q) + 8, Math.max(p, q) + 8 + w];
    let fila = 0;
    while (filas[fila]?.some(([u, v]) => a < v && u < b)) fila++;
    (filas[fila] ??= []).push([a, b]);
    const d = desplaz + fila * paso * Math.sign(desplaz || 1);
    piezas.push(eje === "x"
      ? <Cota key={i} x1={p} y1={fijo} x2={q} y2={fijo} desplaz={d} texto={texto}
          color={color} tam={tam} />
      : <Cota key={i} x1={fijo} y1={p} x2={fijo} y2={q} desplaz={d} texto={texto}
          color={color} tam={tam} />);
  }
  return <g>{piezas}</g>;
}

// ── RÓTULO DE ZONA, EN CÍRCULO ──────────────────────────────────────────────────
// Como en las figuras del reglamento: círculo con el fondo de la tarjeta, borde y número
// en color de texto. Nada de color de relleno, así se lee igual en los dos temas —que es
// justamente lo que fallaba cuando las zonas se pintaban de celeste y amarillo fijos—.
//
// `rotulo` es la marca que consume el control automático: cada región conexa de zona
// lleva `data-zona` con su clave, y su número `data-rotulo` con la misma.
export function Zona({ x, y, texto, r = 11, color = c.txt, tam = TXT.zona, rotulo }) {
  const k = useEscalaTexto();
  const necesario = anchoEnLienzo(texto, tam, k) * 0.62 + 3;
  const radio = Math.max(r, necesario);
  return (
    <g data-rotulo={rotulo}>
      <circle cx={x} cy={y} r={radio} fill={PAPEL} stroke={color} strokeWidth="1.1" />
      <Texto x={x} y={y + 0.5} texto={texto} color={color} tam={tam} peso={600}
        halo={false} />
    </g>
  );
}

// ── FLECHA ──────────────────────────────────────────────────────────────────────
// El largo es proporcional al valor, así que dos flechas comparables se comparan mirando.
export function Flecha({ x1, y1, x2, y2, color = c.txt2, grosor = 2, cabeza = 7 }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = (g) => [x2 - cabeza * Math.cos(a - g), y2 - cabeza * Math.sin(a - g)];
  const [ux, uy] = p(0.4), [vx, vy] = p(-0.4);
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={grosor} />
      <polygon points={`${x2},${y2} ${ux},${uy} ${vx},${vy}`} fill={color} />
    </g>
  );
}

// ── LIENZO ──────────────────────────────────────────────────────────────────────
//
// `viewBox` fijo y ancho fluido: el croquis escala con la columna sin rehacer cuentas.
// Mide su ancho renderizado con un `ResizeObserver` y publica `k` para que el texto NO
// escale con él (regla 1). Mientras no haya medido, `k = 1`: en el servidor y en el
// primer pintado el texto sale a su tamaño nominal, que es el caso conservador.
//
// Publica además, para el control automático y para quien lea el DOM:
//   · `data-escala`      unidades de viewBox por metro
//   · `data-edificio`    a qué edificio pertenece la vista, para exigir escala común
//   · `data-zonificado`  si el dibujo declara zonas, para exigir que estén rotuladas
/**
 * Unidades de `viewBox` por píxel de pantalla, medidas sobre el SVG ya renderizado.
 *
 * ⚠ NO ES `ancho / rect.width`. Con `max-height` puesto —que todos los croquis usan para
 * no crecer sin límite— un SVG ancho queda LIMITADO POR LA ALTURA: su caja mide 794 px de
 * ancho pero el dibujo adentro va a escala 1:1, centrado, con franjas vacías a los
 * costados. Midiendo por el ancho salía un factor de 0,78 y el texto se dibujaba un 22 %
 * más chico de lo pedido; el control automático lo marcó como letra de 8,6 px.
 *
 * `getScreenCTM` da la matriz real —incluye `viewBox` y `preserveAspectRatio`— y es la
 * respuesta exacta. El cociente de cajas queda de respaldo para entornos sin esa API.
 */
function factorDeTexto(el, ancho, alto) {
  try {
    const ctm = el.getScreenCTM?.();
    if (ctm) {
      const esc = Math.hypot(ctm.a, ctm.b);
      if (esc > 0) return 1 / esc;
    }
  } catch { /* sin CTM se usa el respaldo */ }
  const r = el.getBoundingClientRect();
  const esc = Math.min(r.width > 0 ? r.width / ancho : 1, r.height > 0 ? r.height / alto : 1);
  return esc > 0 ? 1 / esc : 1;
}

/**
 * El zoom de un croquis. Vive en el componente que dibuja —no adentro de `Lienzo`— porque
 * el croquis necesita el factor ANTES de armar la vista, y `Lienzo` es su hijo.
 */
export function useZoomCroquis(inicial = 1) {
  const [zoom, setZoom] = useState(inicial);
  return { zoom, setZoom };
}

export function Lienzo({ ancho, alto, children, titulo, escala, edificio, zonificado,
  herramientas = true, unidades = "Cotas en m", zoom = 1, setZoom }) {
  const ref = useRef(null);
  const [k, setK] = useState(1);
  const [grande, setGrande] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const medir = () => setK(factorDeTexto(el, ancho, alto));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ancho, alto, zoom]);

  // ── EL ZOOM AGRANDA EL DIBUJO Y NO EL TEXTO, SIN TOCAR UNA SOLA LÍNEA DEL CROQUIS ──
  //
  // El SVG se renderiza a `zoom` veces el ancho de la columna, con el MISMO `viewBox`.
  // Cada unidad de viewBox pasa a medir más píxeles, así que el dibujo crece; y como
  // `Lienzo` mide el render y publica `k = viewBox/px`, el tamaño de letra en unidades de
  // viewBox se achica en la misma proporción y el texto sigue saliendo a 11 px.
  //
  // Es exactamente para lo que se construyó la regla 1, y por eso el zoom no necesita que
  // ningún croquis sepa que existe: las cotas mantienen su cuerpo mientras el shelter de
  // 2,4 m o el galpón de 30 se agrandan.
  const svg = (
    <svg ref={ref} viewBox={`0 0 ${ancho} ${alto}`} width={`${zoom * 100}%`}
      style={{ display: "block", maxHeight: alto * zoom }}
      role="img" aria-label={titulo}
      data-escala={escala ?? undefined} data-edificio={edificio ?? undefined}
      data-zonificado={zonificado ? "si" : undefined}>
      {titulo ? <title>{titulo}</title> : null}
      <CtxK.Provider value={k}>{children}</CtxK.Provider>
    </svg>
  );

  if (!herramientas) return svg;
  return (
    <div style={{ position: "relative" }}>
      {/* Con zoom el dibujo es más ancho que la tarjeta: se desplaza, no se recorta. */}
      <div style={{ overflowX: zoom > 1 ? "auto" : "visible" }}>{svg}</div>
      <BarraCroquis svgRef={ref} titulo={titulo} unidades={unidades} zoom={zoom}
        setZoom={setZoom} onAmpliar={() => setGrande(true)} />
      {grande && (
        <Ampliado titulo={titulo} onCerrar={() => setGrande(false)} ancho={ancho}
          alto={alto} escala={escala} edificio={edificio} zonificado={zonificado}>
          {children}
        </Ampliado>
      )}
    </div>
  );
}

/**
 * La unidad declarada UNA sola vez —y no repetida en cada cota, que es lo que llenaba de
 * «m» un dibujo que tiene veinte— más los dos botones. Se ocultan al imprimir.
 */
function BarraCroquis({ svgRef, titulo, unidades, onAmpliar, zoom = 1, setZoom }) {
  const descargar = () => {
    const el = svgRef.current;
    if (!el) return;
    // Las variables CSS no viajan dentro del archivo: se resuelven contra el tema activo,
    // así que el SVG descargado se ve como se veía en pantalla y no en negro sobre negro.
    const cs = getComputedStyle(document.documentElement);
    let txt = new XMLSerializer().serializeToString(el.cloneNode(true));
    // Una variable sin valor cae al color de texto del tema, que siempre lo tiene: un
    // literal acá sería el único color fijo del repositorio, y además saldría negro sobre
    // negro si el tema activo fuera el oscuro.
    const respaldo = cs.getPropertyValue("--vw-txt").trim() || "currentColor";
    txt = txt.replace(/var\((--[\w-]+)\)/g, (_, v) => cs.getPropertyValue(v).trim() || respaldo);
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${txt}`],
      { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${String(titulo || "croquis").replace(/[^\w áéíóúñÁÉÍÓÚÑ-]/g, "").trim()}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const boton = {
    fontSize: TAM.base, color: c.txt2, background: c.raised, cursor: "pointer",
    border: `1px solid ${c.border}`, borderRadius: 5, padding: "2px 8px",
  };
  return (
    <div className="vw-noPrint" style={{
      display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end",
      marginTop: 2,
    }}>
      <span style={{ fontSize: TAM.base, color: c.txt2, marginRight: "auto" }}>{unidades}</span>
      {setZoom && (
        <span style={{ display: "inline-flex", gap: 2, alignItems: "center" }}>
          <span style={{ fontSize: TAM.base, color: c.txt2, marginRight: 4 }}>Escala</span>
          {ZOOMS.map(z => (
            <button key={z} type="button" aria-pressed={z === zoom}
              onClick={() => setZoom(z)}
              style={{ ...boton, fontWeight: z === zoom ? 600 : 400,
                background: z === zoom ? c.hover : c.raised,
                color: z === zoom ? c.txt : c.txt2 }}>
              {String(z).replace(".", ",")}×
            </button>
          ))}
        </span>
      )}
      <button type="button" style={boton} onClick={onAmpliar}>Ampliar</button>
      <button type="button" style={boton} onClick={descargar}>Descargar SVG</button>
    </div>
  );
}

/** La vista a pantalla completa. Sin librería: un `div` fijo y la tecla Escape. */
function Ampliado({ titulo, onCerrar, ancho, alto, escala, edificio, zonificado, children }) {
  const ref = useRef(null);
  const [k, setK] = useState(1);
  useEffect(() => {
    const salir = (e) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", salir);
    return () => window.removeEventListener("keydown", salir);
  }, [onCerrar]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const medir = () => setK(factorDeTexto(el, ancho, alto));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ancho, alto]);
  return (
    <div role="dialog" aria-label={`${titulo} — ampliado`}
      style={{ position: "fixed", inset: 0, zIndex: 60, background: c.canvas,
        padding: 24, overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 12 }}>
        <strong style={{ fontSize: 14, color: c.txt }}>{titulo}</strong>
        <button type="button" onClick={onCerrar} style={{
          fontSize: TAM.base, color: c.txt2, background: c.raised, cursor: "pointer",
          border: `1px solid ${c.border}`, borderRadius: 5, padding: "3px 10px" }}>
          Cerrar (Esc)
        </button>
      </div>
      <svg ref={ref} viewBox={`0 0 ${ancho} ${alto}`} width="100%"
        style={{ display: "block" }} role="img" aria-label={`${titulo} — ampliado`}
        data-escala={escala ?? undefined} data-edificio={edificio ?? undefined}
        data-zonificado={zonificado ? "si" : undefined}>
        <CtxK.Provider value={k}>{children}</CtxK.Provider>
      </svg>
    </div>
  );
}

// ── LEYENDA DE LA ESCALA DE PRESIÓN ─────────────────────────────────────────────
// Va SIEMPRE que haya una cara coloreada. Sin leyenda el color es decoración: nadie puede
// saber si un azul intenso son 400 N/m² o 4000.
export function LeyendaPresion({ x, y, ancho, tramos, fmt, color = c.txt2, lienzo,
  lienzoAlto }) {
  const k = useEscalaTexto();
  const izq = `succión ${fmt(tramos[0].desde)}`;
  const der = `presión ${fmt(tramos.at(-1).hasta)}`;
  // ⚠ LOS TRES RÓTULOS SE MIDEN ANTES DE PONERLOS. Los de los extremos van anclados hacia
  // adentro, así que su ancho se come el de la barra: con una barra corta se montaban
  // sobre el «0» del medio y el de la izquierda se salía del lienzo. Si no entran los
  // tres, se dejan los dos extremos, que son los que fijan la escala.
  const anchoIzq = anchoEnLienzo(izq, TXT.min, k);
  const anchoDer = anchoEnLienzo(der, TXT.min, k);
  const anchoCero = anchoEnLienzo("0", TXT.min, k);

  // ⚠ LA BARRA SE ESTIRA HASTA QUE LOS RÓTULOS ENTREN, EN VEZ DE MEDIR LO QUE SE LE PIDIÓ.
  // Los de los extremos van anclados hacia adentro, así que su ancho se come el de la
  // barra: con una barra corta se montaban entre sí y el de la izquierda se salía del
  // lienzo. Se mide lo que hace falta, se estira, y recién si tampoco alcanza se cae el
  // «0» del medio, que es el prescindible. `lienzo` recorta el resultado al dibujo.
  const preciso = anchoIzq + anchoDer + 14 * k;
  const ancho2 = Math.max(ancho, preciso);
  // El margen del recorte cuenta el halo del texto, que sobresale del propio glifo: con
  // 2 unidades la «s» de «succión» seguía saliéndose por un pelo.
  const margen = 8 * k;
  const centro = lienzo
    ? Math.min(Math.max(x + ancho / 2, ancho2 / 2 + margen), lienzo - ancho2 / 2 - margen)
    : x + ancho / 2;
  const x0 = centro - ancho2 / 2;
  const w = ancho2 / tramos.length;
  const entraElCero = anchoIzq + anchoDer + anchoCero + 18 * k <= ancho2;

  // ⚠ LA SEPARACIÓN ENTRE LA BARRA Y EL TEXTO VA EN PÍXELES, COMO EL TEXTO. Era fija en
  // unidades de `viewBox`, así que en una tarjeta angosta —donde `k` crece— la letra
  // subía de tamaño y el renglón se salía del lienzo por abajo. Es el mismo croquis en
  // dos anchos de columna dando dos resultados distintos.
  const sep = Math.max(16, 14 * k);
  const alto2 = 7 * k + 2;
  const yBarra = lienzoAlto ? Math.min(y, lienzoAlto - sep - alto2 - 12) : y;
  return (
    <g>
      {tramos.map((t, i) => (
        <rect key={i} x={x0 + i * w} y={yBarra} width={w - 2} height={12} fill={t.color}
          stroke={color} strokeWidth="0.5" />
      ))}
      <Texto x={x0} y={yBarra + 12 + sep} texto={izq} color={color} tam={TXT.min}
        ancla="start" />
      {entraElCero && (
        <Texto x={centro} y={yBarra + 12 + sep} texto="0" color={color} tam={TXT.min} />
      )}
      <Texto x={x0 + ancho2} y={yBarra + 12 + sep} texto={der} color={color} tam={TXT.min}
        ancla="end" />
    </g>
  );
}
