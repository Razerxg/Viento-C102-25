// CROQUIS — ZONAS DE COMPONENTES Y REVESTIMIENTOS.
//
// ── ES UN DIBUJO DE LÍNEA, COMO LAS FIGURAS DEL REGLAMENTO ──────────────────────
// Las Figs. 5.3-1, 5.3-2A a 2G y 5.3-5A/B son croquis de taller: contorno continuo,
// límites de zona en trazos, números de zona en círculo y cotas. Sin un solo color.
//
// La primera versión pintaba cada zona con un color fijo —celeste, ámbar, naranja— y eso
// tenía dos problemas, uno de los cuales era un defecto liso y llano: el número de zona se
// dibujaba en `#ffffff` en tema oscuro, o sea BLANCO SOBRE CELESTE. En tema oscuro las
// zonas quedaban sin rotular. El otro es que un croquis a color no se parece a la figura
// que hay que controlar al lado.
//
// ⚠ ACÁ NO HAY UN SOLO COLOR LITERAL. Todo sale de los tokens del tema, que son variables
// CSS: cambiar de tema no re-renderiza nada y el dibujo se invierte solo. Hay un test que
// recorre este archivo y falla si aparece un `#`.
//
// ── LO QUE CAMBIÓ CON LAS REGLAS COMUNES DE DIBUJO ──────────────────────────────
// Cinco defectos, medidos por el proyectista sobre el proyecto de referencia y por el
// control automático sobre la matriz entera:
//
//   · LAS COTAS VAN EN METROS. Iban en milímetros con punto de miles —«11.000»,
//     «a = 1.000»—, heredado de que un plano se acota así. En una pantalla donde todo lo
//     demás lleva coma decimal eso se lee como once y como uno. La memoria y las tablas
//     siguen en mm, que es donde el número se transcribe a un plano de verdad.
//   · UN RÓTULO POR REGIÓN CONEXA, no uno por zona. Había un solo ② y un solo ③ para
//     varias regiones idénticas, y el ③ montado sobre la cumbrera y el borde.
//   · LOS RÓTULOS SE UBICAN PROBANDO POSICIONES contra lo ya ocupado.
//   · LAS DOS PAREDES, CON SU FORMA REAL Y A ESCALA. Había una sola, rectangular, sin
//     decir cuál era y dibujada a una escala distinta de la planta —11 × 3 m en una
//     proporción de 10:1—, así que el hastial de un dos aguas no aparecía en ningún lado.
//   · PLANTA, ELEVACIÓN Y PAREDES COMPARTEN ESCALA, y el croquis la declara en
//     `data-escala` para que el control automático pueda exigirlo.
import { mkView, altoNecesario, Cota, CadenaDeCotas, Zona, Rotulo, Texto,
  Lienzo, Flecha, ubicar, candidatosAlrededor, anchoEnLienzo, useEscalaTexto, useRotulos,
  useZoomCroquis, TXT } from './kit.jsx';
import { regionesDe, franjasDePared, rotulosDeRegion, LAYOUT } from '../../engine/cyrZonas.js';
import { fachada } from '../../engine/fachadas.js';
import { m, coef, cota, EJE, pared as nombrePared } from './formatoCroquis.js';
import { c } from '../tokens.js';

/** El gris de relleno de cada zona, cuando el sombreado está activo. */
export const TRAMA_ZONA = {
  "1'": "none", "1": c.tramaZ1, "2": c.tramaZ2, "3": c.tramaZ3,
  "2'": c.tramaZ2, "3'": c.tramaZ3,
  "4": c.tramaZ1, "5": c.tramaZ2,
};

/** «1'» se escribe con prima tipográfica, como en la figura. */
const etiqueta = (z) => z.replace("'", "′");

const TRAZOS = "7 5";
const RZ = 11;

export function ZonasCyR({ cyr, geo, sombrear = false, ancho = 980 }) {
  const { zoom, setZoom } = useZoomCroquis();
  if (!cyr?.geoZonas?.layout) return null;
  const { bx, by, a, h, layout, ejeCumbrera } = cyr.geoZonas;
  const piezas = regionesDe(cyr.geoZonas);

  const cumbreraX = ejeCumbrera === "X";
  const unaAguaLayout = layout === LAYOUT.UNA_AGUA_PRIMADA || layout === LAYOUT.UNA_AGUA;
  const unaAgua = cyr.figura === "5.3-5A" || cyr.figura === "5.3-5B";
  const bajaHacia = cyr.geoZonas.pendienteHacia ?? "+Y";
  const ejePendY = bajaHacia.endsWith("Y");
  const alFinal = bajaHacia.startsWith("+");

  // ── LAS CUATRO VISTAS, A LA MISMA ESCALA ────────────────────────────────────
  // ⚠ LA ESCALA ES COMÚN Y SE CALCULA ANTES DE DIBUJAR NADA. Con cada vista eligiendo la
  // suya, la pared de 11 × 3 m salía a diez veces la escala de la planta de 11 × 7,5: dos
  // dibujos del mismo edificio, uno al lado del otro, que no se pueden comparar mirando.
  // ⚠ LA LUZ DE LA ELEVACIÓN ES LA DEL EDIFICIO, NO LA DE LA PLANTA DE CUBIERTA. `bx` y
  // `by` vienen de `geoZonas` y con voladizo YA INCLUYEN los vuelos, porque es la planta
  // que se zonifica (nota 7). La elevación dibuja paredes, y las paredes no tienen vuelo:
  // usarlas con `bx` las dibujaría tan anchas como la cubierta.
  const ejeElev = (layout === LAYOUT.PLANA_H || cumbreraX) ? "Y" : "X";
  const luz = ejeElev === "Y" ? geo.b : geo.a;
  const vueloElevIni = cyr.voladizo?.hay ? cyr.voladizo.porBorde[`-${ejeElev}`] : 0;
  const vueloElevFin = cyr.voladizo?.hay ? cyr.voladizo.porBorde[`+${ejeElev}`] : 0;
  const hTot = Math.max(geo.hCumbre ?? geo.hAlero, geo.hAlero);
  // Las dos paredes DISTINTAS que tiene un edificio rectangular: una por eje.
  const paredes = [
    { ...fachada(geo, "X", 1), eje: "X", signo: 1 },
    { ...fachada(geo, "Y", 1), eje: "Y", signo: 1 },
  ];
  const hPared = Math.max(...paredes.map(p => p.zTope));
  const wPared = Math.max(...paredes.map(p => p.W));

  // ── EL ALTO DEL LIENZO SALE DEL DIBUJO, NO AL REVÉS ─────────────────────────
  // ⚠ ANTES LA LÁMINA MEDÍA 980 × 660 Y EL DIBUJO SE ENCOGÍA PARA ENTRAR. El galpón de
  // 20 × 30 salía a 8,4 px/m cuando el ancho daba para 21,9: dos tercios de la lámina
  // eran aire a los costados y el croquis salía dos veces y media más chico de lo que
  // podía. Acá la escala la fija el ANCHO —que es lo que la columna de verdad limita— y
  // cada fila pide el alto que su dibujo necesita.
  // ── LA ESCALA SALE DEL ANCHO, Y EL REPARTO DE COLUMNAS SALE DEL DIBUJO ──────
  // ⚠ NI EL ALTO NI EL ANCHO DE CADA COLUMNA PUEDEN SER FIJOS. Con la lámina de 980 × 660
  // y la columna de la planta fija en el 56 %, el galpón de 20 × 30 se dibujaba a 8,4
  // px/m cuando el ancho daba para 21,9. Y repartir el ancho a porcentaje fijo desperdicia
  // de nuevo: una planta angosta al lado de una elevación larga deja media columna en
  // blanco mientras la otra achica la escala común de las dos.
  //
  // Acá la escala es la mayor que deja entrar a las tres vistas, y cada columna se lleva
  // el ancho que su dibujo necesita a esa escala.
  // El margen de la elevación da para la cota de `h`, que va 26 px por fuera del edificio
  // más su propio texto.
  const M = { planta: 56, elev: 62, pared: 40 };
  const wPlanta = bx, wElev = luz + vueloElevIni + vueloElevFin;
  const anchoFila = ancho - 26;
  const anchoParedes = ancho - 20 - 4 * M.pared;   // dos paredes, con sus cuatro márgenes
  const sumaParedes = paredes.reduce((t, f) => t + f.W, 0);
  const esc = Math.min(
    // Las dos vistas de arriba comparten la fila: el ancho útil se reparte entre las dos.
    (anchoFila - 2 * M.planta - 2 * M.elev) / Math.max(1e-9, wPlanta + wElev),
    // ⚠ LAS DOS PAREDES TAMPOCO SE REPARTEN A MEDIAS. Una de 11 m al lado de una de 7,5
    // en media lámina cada una dejaba la segunda con un tercio de su columna en blanco y
    // hacía bajar la escala COMÚN de las cuatro vistas: la del galpón caía de 41 a 34.
    anchoParedes / Math.max(1e-9, sumaParedes),
    // Tope de alto: una planta muy alargada pediría una lámina de varias pantallas.
    (Math.round(ancho * 0.95) - 2 * M.planta) / Math.max(1e-9, by),
    // ⚠ Y LA FILA DE PAREDES TIENE SU PROPIO TOPE. En una torre de 3 × 3,5 con h = 10 el
    // ancho deja una escala enorme —la planta es diminuta— y la pared, que mide 10 m de
    // alto, pedía mil cien píxeles para tres metros de frente: la lámina pasaba de los dos
    // mil y el croquis quedaba sin capturar.
    (Math.round(ancho * 0.55) - 2 * M.pared) / Math.max(1e-9, hPared * 1.2),
  );

  const yTop = 24;
  const cajaPlanta = { ancho: Math.round(wPlanta * esc) + 2 * M.planta, margen: M.planta,
    w: wPlanta, h: by };
  const cajaElev = { ancho: anchoFila - cajaPlanta.ancho, margen: M.elev,
    w: wElev, h: hTot * 1.1 };
  // Cada pared se lleva el ancho de SU silueta; la primera arranca en el margen izquierdo
  // y la segunda donde termina la primera.
  const cajasPared = paredes.map(f => ({ ancho: Math.round(f.W * esc) + 2 * M.pared,
    margen: M.pared, w: f.W, h: hPared * 1.2 }));
  const xPared = cajasPared.reduce((xs, caja) => [...xs, xs[xs.length - 1] + caja.ancho],
    [Math.round((ancho - cajasPared.reduce((t, c) => t + c.ancho, 0)) / 2)]);
  const hFila = Math.max(altoNecesario(cajaPlanta, esc), altoNecesario(cajaElev, esc));
  const hFila2 = Math.max(...cajasPared.map(c => altoNecesario(c, esc))) + 18;
  // 58 dejaba el subtítulo de la elevación —«h = altura media de cubierta»— pegado al
  // título de la fila de paredes.
  const yFila2 = yTop + hFila + 78;
  const alto = yFila2 + hFila2 + 20;
  cajaPlanta.alto = hFila; cajaElev.alto = hFila;
  for (const c of cajasPared) c.alto = hFila2;

  const v = mkView({ ...cajaPlanta, xMin: 0, xMax: bx, yMin: 0, yMax: by, escalaFija: esc });
  const X = (u) => v.x(u);
  const Y = (u) => v.y(u) + yTop;

  const xE = cajaPlanta.ancho + 26;   // la elevación arranca donde termina la planta
  const ve = mkView({ ...cajaElev, xMin: -(vueloElevIni), xMax: luz + vueloElevFin,
    yMin: 0, yMax: hTot * 1.1, escalaFija: esc });
  const XE = (u) => ve.x(u) + xE;
  const YE = (u) => ve.y(u) + yTop;

  // ── Los límites de zona: sólo las aristas que separan zonas DISTINTAS ───────
  // Se derivan de las mismas piezas que usa el motor. Dibujar todas las aristas de la
  // grilla marcaría cortes donde no hay cambio de zona, y dibujarlas a mano sería una
  // segunda definición de la zonificación.
  const rects = piezas.filter(p => p.tipo === "rect");
  const zonaEnPunto = (x, y) => {
    let z = null;
    for (const p of rects) {
      if (x >= p.x - 1e-9 && x <= p.x + p.w + 1e-9
        && y >= p.y - 1e-9 && y <= p.y + p.h + 1e-9) z = p.zona;
    }
    return z;
  };
  const limites = [];
  const eps = Math.min(bx, by) * 1e-3;
  for (const p of rects) {
    const medio = [p.x + p.w / 2, p.y + p.h / 2];
    const bordes = [
      [[p.x, p.y], [p.x + p.w, p.y], [medio[0], p.y - eps]],
      [[p.x, p.y + p.h], [p.x + p.w, p.y + p.h], [medio[0], p.y + p.h + eps]],
      [[p.x, p.y], [p.x, p.y + p.h], [p.x - eps, medio[1]]],
      [[p.x + p.w, p.y], [p.x + p.w, p.y + p.h], [p.x + p.w + eps, medio[1]]],
    ];
    for (const [q1, q2, fuera] of bordes) {
      const dentro = fuera[0] > 0 && fuera[0] < bx && fuera[1] > 0 && fuera[1] < by;
      if (dentro && zonaEnPunto(...fuera) !== p.zona) limites.push([q1, q2]);
    }
  }

  // ── Cumbrera, limatesas y franja de cumbrera ────────────────────────────────
  const banda = piezas.find(p => p.tipo === "banda");
  const Lu = cumbreraX ? bx : by, Lv = cumbreraX ? by : bx;
  const aXY = (u, w) => (cumbreraX ? [u, w] : [w, u]);
  const lineasTecho = layout === LAYOUT.CUATRO_AGUAS
    ? banda.segmentos
    : layout === LAYOUT.DOS_AGUAS_CUMBRERA || layout === LAYOUT.DOS_AGUAS_ESQUINAS
      ? [[...aXY(0, Lv / 2), ...aXY(Lu, Lv / 2)]]
      : [];

  const paralelas = [];
  if (layout === LAYOUT.CUATRO_AGUAS) {
    for (const [x1, y1, x2, y2] of banda.segmentos) {
      const d = Math.hypot(x2 - x1, y2 - y1) || 1;
      const [nx, ny] = [-(y2 - y1) / d * a, (x2 - x1) / d * a];
      paralelas.push([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny]]);
      paralelas.push([[x1 - nx, y1 - ny], [x2 - nx, y2 - ny]]);
    }
  }

  const linea = (p, i, extra = {}) => (
    <line key={i} x1={X(p[0][0])} y1={Y(p[0][1])} x2={X(p[1][0])} y2={Y(p[1][1])}
      stroke={c.txt3} strokeWidth="1" strokeDasharray={TRAZOS} {...extra} />
  );

  // ── DE QUÉ LADO BAJA LA PENDIENTE ───────────────────────────────────────────
  // ⚠ EL DIBUJO SIGUE A `pendienteHacia`, NO A UNA CONVENCIÓN FIJA. Rotular «alero alto»
  // siempre arriba parece inofensivo y no lo es: con la pendiente hacia +Y el croquis
  // contradecía al clasificador —la zona 3′, que va contra el alero ALTO, aparecía del
  // lado rotulado «alero bajo»— y el croquis existe justamente para poder controlar eso.
  const borde = (esBajo) => {
    const enElFinal = alFinal === esBajo;
    if (ejePendY) {
      return enElFinal
        // ⚠ POR FUERA DE LA FILA DE COTAS. La cota del ancho de zona va pegada al borde
        // inferior, y con 24 px el rótulo del alero le caía encima.
        ? { x: X(bx / 2), y: Y(by) - 42, rot: 0, hx: X(bx / 2), hy: Y(by) }
        : { x: X(bx / 2), y: Y(0) + 42, rot: 0, hx: X(bx / 2), hy: Y(0) };
    }
    return enElFinal
      ? { x: X(bx) + 42, y: Y(by / 2), rot: 90, hx: X(bx), hy: Y(by / 2) }
      : { x: X(0) - 30, y: Y(by / 2), rot: -90, hx: X(0), hy: Y(by / 2) };
  };
  const aleroBajo = borde(true), aleroAlto = borde(false);

  const conBanda = layout === LAYOUT.DOS_AGUAS_CUMBRERA || layout === LAYOUT.CUATRO_AGUAS;

  const cumbre = geo.hCumbre ?? geo.hAlero;
  const techo = unaAgua
    ? [[0, cumbre], [luz, geo.hAlero]]
    : geo.theta > 0 && cumbre > geo.hAlero
      ? [[0, geo.hAlero], [luz / 2, cumbre], [luz, geo.hAlero]]
      : [[0, geo.hAlero], [luz, geo.hAlero]];

  const vueloEnElevacion = (() => {
    // Se prolonga el faldón en sus dos extremos con la pendiente que YA TIENE, que es lo
    // que hace un voladizo. Un alero adosado es plano y tiene su propio artículo.
    if (vueloElevIni <= 1e-9 && vueloElevFin <= 1e-9) return null;
    const pend = (p, q) => (q[1] - p[1]) / (q[0] - p[0] || 1);
    const segs = [];
    if (vueloElevIni > 1e-9) {
      const m0 = pend(techo[0], techo[1]);
      segs.push([-vueloElevIni, techo[0][1] - m0 * vueloElevIni, techo[0][0], techo[0][1]]);
    }
    if (vueloElevFin > 1e-9) {
      const n = techo.length;
      const m1 = pend(techo[n - 2], techo[n - 1]);
      const fin = techo[n - 1];
      segs.push([fin[0], fin[1], fin[0] + vueloElevFin, fin[1] + m1 * vueloElevFin]);
    }
    return segs;
  })();

  return (
    <Lienzo ancho={ancho} alto={alto} titulo="Zonas de componentes y revestimientos"
      escala={esc} edificio="cyr" zonificado zoom={zoom} setZoom={setZoom}>
      <clipPath id="cyr-planta">
        <rect x={X(0)} y={Y(by)} width={v.l(bx)} height={v.l(by)} />
      </clipPath>

      {/* ── PLANTA ── */}
      {sombrear && (
        <g clipPath="url(#cyr-planta)">
          {piezas.map((p, i) => (p.tipo === "rect"
            ? <rect key={i} x={X(p.x)} y={Y(p.y + p.h)} width={v.l(p.w)} height={v.l(p.h)}
                fill={TRAMA_ZONA[p.zona]} stroke="none" />
            : <g key={i}>{p.segmentos.map((s, j) => (
                <line key={j} x1={X(s[0])} y1={Y(s[1])} x2={X(s[2])} y2={Y(s[3])}
                  stroke={TRAMA_ZONA[p.zona]} strokeWidth={v.l(p.ancho)}
                  strokeLinecap="round" strokeLinejoin="round" />))}</g>))}
        </g>
      )}

      <g clipPath="url(#cyr-planta)">
        {limites.map((l, i) => linea(l, i))}
        {paralelas.map((l, i) => linea(l, `p${i}`))}
        {lineasTecho.map((s, i) => (
          <line key={`t${i}`} x1={X(s[0])} y1={Y(s[1])} x2={X(s[2])} y2={Y(s[3])}
            stroke={c.txt} strokeWidth="1.2" />
        ))}
      </g>
      <rect x={X(0)} y={Y(by)} width={v.l(bx)} height={v.l(by)} fill="none"
        stroke={c.txt} strokeWidth="1.6" />

      {/* ── LA LÍNEA DE PARED, CUANDO HAY VOLADIZO ──────────────────────────────
          El contorno continuo es el de la CUBIERTA y la línea de trazo y punto es dónde
          terminan las paredes. Sin ella el croquis no explica por qué la distancia al
          borde se mide más afuera que la dimensión que define `a` —nota 7 de la
          Fig. 5.3-2A—, que es el punto que más se presta a confusión del voladizo. */}
      {cyr.voladizo?.hay && (() => {
        const pl = cyr.voladizo.pared;
        return <>
          <rect x={X(pl.x)} y={Y(pl.y + pl.largo)} width={v.l(pl.ancho)}
            height={v.l(pl.largo)} fill="none" stroke={c.txt2} strokeWidth="1.1"
            strokeDasharray="9 4 2 4" />
          <Rotulo x={X(pl.x + pl.ancho / 2)} y={Y(pl.y + pl.largo) + 14}
            texto="línea de pared" color={c.txt2} tam={TXT.min} />
        </>;
      })()}

      {unaAgua && (() => {
        const cx = X(bx / 2), cy = Y(by / 2);
        const d = Math.hypot(aleroBajo.hx - cx, aleroBajo.hy - cy) || 1;
        return <>
          <Flecha x1={cx} y1={cy} x2={cx + 34 * (aleroBajo.hx - cx) / d}
            y2={cy + 34 * (aleroBajo.hy - cy) / d} color={c.txt2} grosor={1.4} />
          <Rotulo x={aleroAlto.x} y={aleroAlto.y} rot={aleroAlto.rot} texto="alero alto"
            color={c.txt2} tam={TXT.min} />
          <Rotulo x={aleroBajo.x} y={aleroBajo.y} rot={aleroBajo.rot} texto="alero bajo"
            color={c.txt2} tam={TXT.min} />
        </>;
      })()}

      {/* ⚠ UNA SOLA CAPA DECIDE TODO LO QUE COMPITE POR LUGAR ADENTRO DE LA PLANTA. Los
          números de zona y la cota de la franja de cumbrera se ubicaban por separado, con
          dos ideas distintas de dónde había lugar: la cota buscaba el hueco entre los
          puntos IDEALES de los rótulos, y los rótulos ya se habían corrido de ahí para no
          pisarse entre sí. El resultado era una cota encima de un círculo en el único caso
          donde el hueco era justo. */}
      <RotulosDePlanta geo={cyr.geoZonas} X={X} Y={Y} bx={bx} by={by} a={a}
        cumbreraX={cumbreraX} conBanda={conBanda} esc={esc} yNota={yTop + hFila + 31}
        xNota={X(bx / 2)} />

      <CotasDePlanta geo={cyr.geoZonas} X={X} Y={Y} bx={bx} by={by} a={a} h={h} layout={layout}
        unaAguaLayout={unaAguaLayout} ejePendY={ejePendY} alFinal={alFinal}
        evitarTextos={unaAgua
          ? [{ x: aleroAlto.x, y: aleroAlto.y, texto: "alero alto" },
             { x: aleroBajo.x, y: aleroBajo.y, texto: "alero bajo" }]
          : []} />

      <Rotulo x={X(bx / 2)} y={yTop + hFila + 14} texto="PLANTA" color={c.txt2}
        tam={TXT.titulo} peso={600} />

      {/* ── ELEVACIÓN ── */}
      <polyline points={[[0, 0], [0, techo[0][1]], ...techo.map(p => [p[0], p[1]]),
        [luz, 0], [0, 0]].map(([x, y]) => `${XE(x)},${YE(y)}`).join(" ")}
        fill="none" stroke={c.txt} strokeWidth="1.6" />
      {/* El vuelo, prolongando el faldón con su MISMA pendiente —es lo que distingue un
          voladizo de un alero adosado, que es plano y tiene su propio artículo—. */}
      {vueloEnElevacion && <>
        {vueloEnElevacion.map((seg, i) => (
          <line key={i} x1={XE(seg[0])} y1={YE(seg[1])} x2={XE(seg[2])} y2={YE(seg[3])}
            stroke={c.txt} strokeWidth="1.6" />
        ))}
        {/* El rótulo va en la PUNTA del vuelo y por debajo del faldón: arriba está la
            marca del ángulo θ, que arranca en el mismo alero. */}
        <Rotulo x={XE(vueloEnElevacion[0][0])} y={YE(vueloEnElevacion[0][1]) + 16}
          texto="voladizo" color={c.txt2} tam={TXT.min} />
      </>}
      {geo.theta > 0 && <>
        <line x1={XE(0)} y1={YE(techo[0][1])} x2={XE(luz * 0.34)} y2={YE(techo[0][1])}
          stroke={c.txt3} strokeWidth="0.8" strokeDasharray="4 3" />
        <Rotulo x={XE(luz * 0.20)} y={YE(techo[0][1]) - 16}
          texto={`θ = ${coef(geo.theta, 1)}°`} color={c.txt2} tam={TXT.min} />
      </>}
      <Cota x1={XE(luz)} y1={YE(0)} x2={XE(luz)} y2={YE(cyr.altura.valor)} desplaz={26}
        simbolo="h" valor={cyr.altura.valor} color={c.txt2} />
      <Rotulo x={XE(luz / 2)} y={yTop + hFila + 14} texto="ELEVACIÓN" color={c.txt2}
        tam={TXT.titulo} peso={600} />
      <Rotulo x={XE(luz / 2)} y={yTop + hFila + 32}
        texto={cyr.altura.cual === "alero" ? "h = altura del alero"
          : "h = altura media de cubierta"} color={c.txt3} tam={TXT.min} />

      {/* ── LAS DOS PAREDES, CON SU FORMA REAL Y A LA MISMA ESCALA ── */}
      <Rotulo x={ancho / 2} y={yFila2 - 16} texto="ELEVACIÓN DE PAREDES — Fig. 5.3-1"
        color={c.txt2} tam={TXT.titulo} peso={600} />
      {paredes.map((p, i) => (
        <ParedEnElevacion key={p.eje} f={p} a={a} esc={esc} sombrear={sombrear}
          x0={xPared[i]} y0={yFila2} caja={cajasPared[i]} />
      ))}
    </Lienzo>
  );
}

// ── UN RÓTULO POR REGIÓN CONEXA, UBICADO PROBANDO POSICIONES ───────────────────
//
// Las figuras del reglamento numeran CADA región: la 5.3-2A lleva un ③ en cada una de las
// cuatro esquinas, no uno solo. Y dos celdas adyacentes de la misma zona son una región
// sola, con un número solo. Las dos cosas las resuelve `rotulosDeRegion`, sobre la
// clasificación punto por punto y no sobre las piezas de dibujo —que en cuatro aguas se
// pintan superpuestas y donde una «pieza» no es una región—.
//
// Acá sólo queda ubicar los círculos sin que se pisen, probando posiciones alrededor del
// punto ideal. El marcador `data-zona` existe para que el control automático pueda exigir
// que toda región tenga su número.
/**
 * Dónde queda cada número de zona de la planta, ya corrido para no pisarse.
 *
 * ── SE CALCULA EN DOS LUGARES A PROPÓSITO ──────────────────────────────────────
 * Lo usan `RotulosDePlanta` —que dibuja los números— y `CotasDePlanta` —que necesita saber
 * qué lugar está tomado para no acotar encima—. Los dos son hijos del `Lienzo` y hermanos
 * entre sí, así que no hay dónde compartir el resultado sin subirlo fuera del contexto que
 * los dos necesitan.
 *
 * ⚠ ES SEGURO PORQUE ES UNA FUNCIÓN PURA DE SUS ENTRADAS: mismas regiones, misma escala,
 * mismo `k`, mismas posiciones. Si algún día esto dependiera del orden de renderizado o de
 * un estado, las dos capas empezarían a ver plantas distintas y el arbitraje dejaría de
 * valer. `ubicar` prueba candidatos en un orden fijo, sin aleatoriedad.
 */
function circulosDeZona(geo, X, Y, bx, by, k) {
  const ocupados = [];
  const puestos = [];
  for (const r of rotulosDeRegion(geo)) {
    const texto = etiqueta(r.zona);
    const d = Math.max(RZ, anchoEnLienzo(texto, TXT.zona, k) * 0.62 + 3);
    const px = Math.min(Math.max(X(r.x), X(0) + d), X(bx) - d);
    const py = Math.min(Math.max(Y(by) + d, Y(r.y)), Y(0) - d);
    const sitio = ubicar(candidatosAlrededor(px, py, 2.4 * d, 2.4 * d), ocupados,
      { w: 2 * d, h: 2 * d });
    ocupados.push(sitio);
    puestos.push({ ...r, texto, cx: sitio.x, cy: sitio.y, radio: d });
  }
  return { puestos, ocupados };
}

/** De un sitio de `ubicar` a una caja, que es lo que compara `Cota` con su `evitar`. */
const aCaja = (o) => ({ x1: o.x - o.w / 2, x2: o.x + o.w / 2,
  y1: o.y - o.h / 2, y2: o.y + o.h / 2 });

function RotulosDePlanta({ geo, X, Y, bx, by, a, cumbreraX, conBanda, esc, xNota, yNota }) {
  const rot = useRotulos();
  const k = useEscalaTexto();

  // 1 · los números, uno por región, corridos hasta encontrar lugar
  const { puestos, ocupados } = circulosDeZona(geo, X, Y, bx, by, k);

  // 2 · la cota de la franja de cumbrera, en el hueco que quedó DESPUÉS de correrlos
  //
  // ⚠ SE MIDE CONTRA LAS POSICIONES FINALES. Calcularla contra los puntos ideales daba un
  // hueco que ya no existía: los rótulos se habían corrido justamente para no pisarse.
  const textoBanda = cota("2a", 2 * a, rot);
  const anchoCota = anchoEnLienzo(textoBanda, TXT.cota, k) + 10 * k;
  let banda = null;
  if (conBanda) {
    const [alLargo, medio] = cumbreraX
      ? [(o) => o.x, Y(by / 2)] : [(o) => o.y, X(bx / 2)];
    const cerca = puestos.map((p, i) => ({ ...ocupados[i], p }))
      .filter(o => Math.abs((cumbreraX ? o.y : o.x) - medio) <= 1.6 * a * esc);
    const extremos = cumbreraX ? [X(0), X(bx)] : [Y(by), Y(0)];
    const marcas = [...extremos,
      ...cerca.flatMap(o => [alLargo(o) - o.w / 2, alLargo(o) + o.w / 2])]
      .sort((u, w) => u - w);
    let centro = null, ancho = 0;
    for (let i = 1; i < marcas.length; i++) {
      const d = marcas[i] - marcas[i - 1];
      if (d > ancho) { ancho = d; centro = (marcas[i] + marcas[i - 1]) / 2; }
    }
    banda = ancho >= anchoCota ? centro : null;

    // ⚠ Y DESPUÉS SE VERIFICA CONTRA TODOS LOS CÍRCULOS, NO SÓLO LOS CERCANOS. La búsqueda
    // del hueco sólo mira los rótulos a menos de 1,6a de la cumbrera, que es una optimización
    // razonable para encontrar el hueco más ancho; pero la CAJA del texto es más alta que esa
    // franja y puede tocar un círculo que quedó afuera del filtro. Con las cotas largas nunca
    // se notó —ningún hueco calificaba y la cota caía en «ver tabla»—, y al acortarlas a «2a»
    // un hueco marginal empezó a calificar y la cota salió montada sobre un número.
    if (banda !== null) {
      const altoCota = TXT.cota * 1.45 * k;
      const cx = cumbreraX ? banda : X(bx / 2);
      const cy = cumbreraX ? Y(by / 2) : banda;
      const b = { x1: cx - anchoCota / 2, x2: cx + anchoCota / 2,
        y1: cy - altoCota / 2, y2: cy + altoCota / 2 };
      const choca = ocupados.some(o => {
        const q = aCaja(o);
        return b.x1 < q.x2 && q.x1 < b.x2 && b.y1 < q.y2 && q.y1 < b.y2;
      });
      if (choca) banda = null;
    }
  }

  return (
    <g>
      {puestos.map(p => (
        <g key={p.region} data-zona={p.region}>
          <Zona x={p.cx} y={p.cy} texto={p.texto} r={p.radio} rotulo={p.region}
            color={c.txt} />
        </g>
      ))}
      {/* Y SI EN NINGÚN HUECO ENTRA, NO SE DIBUJA. Una planta de 20 m en 170 px tiene tres
          números sobre la cumbrera y no queda lugar para nada más; forzar la cota la deja
          montada sobre un círculo, que es peor que no tenerla. El valor está completo en
          la tabla de anchos de zona, acá abajo. */}
      {conBanda && (banda !== null
        ? (cumbreraX
          ? <Cota x1={banda} y1={Y(by / 2 - a)} x2={banda} y2={Y(by / 2 + a)}
              texto={textoBanda} color={c.txt2} />
          : <Cota x1={X(bx / 2 - a)} y1={banda} x2={X(bx / 2 + a)} y2={banda}
              texto={textoBanda} color={c.txt2} />)
        : <Texto x={xNota} y={yNota} color={c.txt3} tam={TXT.min}
            texto="2a: ver tabla" />)}
    </g>
  );
}

// ── LAS COTAS DE ZONA DE LA PLANTA ─────────────────────────────────────────────
// Encadenadas desde el borde y apiladas en filas cuando no entran: es la cadena
// «0,2h / 0,6h / 0,6h» de la cubierta plana, que antes se escalonaba alternando el
// desplazamiento de a una —que alcanza para dos— y se montaba sobre sí misma en la tercera.
function CotasDePlanta({ geo, X, Y, bx, by, a, h, layout, unaAguaLayout, ejePendY, alFinal,
  evitarTextos = [] }) {
  const k = useEscalaTexto();
  // ⚠ LO QUE HAY QUE EVITAR SON LOS NÚMEROS DE ZONA Y LOS RÓTULOS DE ALERO. Las cotas de
  // franja van con un desplazamiento chico y, según de qué borde cuelguen, ese desplazamiento
  // cae ADENTRO de la planta: la del borde lateral de una vertiente única se dibuja 20
  // unidades hacia adentro, que es exactamente donde vive el número de la zona de esquina.
  // Con las cotas largas nunca se vio, porque no entraban entre las marcas y se iban afuera;
  // al acortarlas a «2a» empezaron a entrar centradas y salieron encima del círculo.
  const evitar = [
    ...(geo ? circulosDeZona(geo, X, Y, bx, by, k).ocupados.map(aCaja) : []),
    ...evitarTextos.map(t => {
      const w = anchoEnLienzo(t.texto, TXT.min, k) + 4 * k;
      const alto = TXT.min * 1.45 * k;
      return { x1: t.x - w / 2, x2: t.x + w / 2, y1: t.y - alto / 2, y2: t.y + alto / 2 };
    }),
  ];
  const anchoLat = layout === LAYOUT.UNA_AGUA_PRIMADA ? 2 * a : a;
  const franjaEnCero = (ejeEsPendiente) => {
    if (!ejeEsPendiente) return { ancho: anchoLat, s: anchoLat === a ? "a" : "2a" };
    return alFinal ? { ancho: 2 * a, s: "2a" } : { ancho: a, s: "a" };
  };
  const enX = franjaEnCero(!ejePendY), enY = franjaEnCero(ejePendY);

  const generales = <>
    <Cota x1={X(0)} y1={Y(by)} x2={X(bx)} y2={Y(by)} desplaz={-22}
      simbolo={EJE.X} valor={bx} color={c.txt2} evitar={evitar} />
    <Cota x1={X(bx)} y1={Y(by)} x2={X(bx)} y2={Y(0)} desplaz={-24}
      simbolo={EJE.Y} valor={by} color={c.txt2} evitar={evitar} />
  </>;

  // La cubierta plana es la única que zonifica con múltiplos de `h` y no de `a`, y la
  // única con una CADENA de tres tramos: va con `CadenaDeCotas`, que las apila en filas.
  if (layout === LAYOUT.PLANA_H) {
    const d = [0, 0.2 * h, 0.6 * h, 1.2 * h].filter(x => x <= bx / 2 + 1e-9);
    const nombres = ["0,2h", "0,6h", "0,6h"];
    return (
      <g>
        {generales}
        <CadenaDeCotas cortes={d} eje="x" fijo={Y(0)} al={X} desplaz={20}
          simbolos={d.slice(1).map((x, i) => ({ simbolo: nombres[i], valor: x - d[i] }))} />
      </g>
    );
  }

  return (
    <g>
      {generales}
      {enX.ancho <= bx / 2 + 1e-9 && (
        <Cota x1={X(0)} y1={Y(0)} x2={X(enX.ancho)} y2={Y(0)} desplaz={20}
          simbolo={enX.s} valor={enX.ancho} color={c.txt2} evitar={evitar} />
      )}
      {unaAguaLayout && enY.ancho <= by / 2 + 1e-9 && (
        <Cota x1={X(bx)} y1={Y(0)} x2={X(bx)} y2={Y(enY.ancho)} desplaz={-20}
          simbolo={enY.s} valor={enY.ancho} color={c.txt2} evitar={evitar} />
      )}
    </g>
  );
}

/**
 * Los números de zona de una pared, ubicados probando posiciones.
 *
 * Dentro de la franja si entra; si no, arriba de la pared con guía, subiendo de fila
 * mientras choque con uno ya puesto. Componente aparte porque mide el texto, y medirlo
 * necesita `k`, que sólo existe dentro de `Lienzo`.
 */
function RotulosDePared({ franjas, f, esc, px, py, alturaEn, y0, techo }) {
  const k = useEscalaTexto();
  const ocupados = [];
  const puestos = [];
  for (const [i, fr] of franjas.entries()) {
    const medio = (fr.desde + fr.hasta) / 2;
    const xm = px(medio);
    const r = Math.max(10, anchoEnLienzo(fr.zona, TXT.zona, k) * 0.62 + 3);
    const dentro = { x: xm, y: py(alturaEn(medio) / 2) };
    const entraDentro = (fr.hasta - fr.desde) * esc > 2 * r + 6;
    // ⚠ HACIA ARRIBA SÓLO HASTA EL NOMBRE DE LA PARED. En una torre —3,5 m de frente y
    // 10 de alto— el tope de la pared queda pegado al borde de la fila, y las tres
    // franjas angostas se apilaban encima del nombre y del título de la sección. Cuando
    // arriba no queda lugar, el número sale al COSTADO, que en una pared alta y angosta
    // es donde hay espacio.
    const arriba = [0, 1, 2]
      .map(n => ({ x: xm, y: py(f.zTope) - 22 - n * (2 * r + 5) }))
      .filter(p => p.y >= techo + r);
    const costados = [
      { x: px(0) - r - 8, y: py(f.zTope * 0.5) },
      { x: px(f.W) + r + 8, y: py(f.zTope * 0.5) },
      { x: px(0) - r - 8, y: py(f.zTope * 0.5) + 2 * r + 5 },
      { x: px(f.W) + r + 8, y: py(f.zTope * 0.5) + 2 * r + 5 },
    ];
    const sitio = ubicar(
      [...(entraDentro ? [dentro] : []), ...arriba, ...costados], ocupados,
      { w: 2 * r, h: 2 * r });
    ocupados.push(sitio);
    puestos.push({ fr, i, xm, r, sitio, fuera: sitio.y !== dentro.y });
  }
  return (
    <g>
      {puestos.map(({ fr, i, xm, r, sitio, fuera }) => (
        <g key={`z${i}`} data-zona={`pared-${f.eje}-${fr.zona}#${i + 1}`}>
          {fuera && (
            <line x1={xm} y1={py(alturaEn((fr.desde + fr.hasta) / 2))} x2={xm}
              y2={sitio.y + r} stroke={c.txt3} strokeWidth="0.6" opacity="0.8" />
          )}
          <Zona x={sitio.x} y={sitio.y} texto={fr.zona} r={r}
            rotulo={`pared-${f.eje}-${fr.zona}#${i + 1}`} color={c.txt} />
        </g>
      ))}
    </g>
  );
}

// ── UNA PARED, CON SU FORMA REAL ───────────────────────────────────────────────
//
// ⚠ LA PARED NO ES SIEMPRE UN RECTÁNGULO, Y ANTES SE DIBUJABA COMO SI LO FUERA. El
// hastial de un dos aguas es un pentágono y la pared paralela a la pendiente de una
// vertiente única es un trapecio: son las dos paredes donde el revestimiento se corta en
// diagonal, o sea justo donde el croquis hace falta. La silueta sale de `fachadas.js`,
// que es el mismo módulo con el que el capítulo 2 integra el área.
//
// Y va A LA MISMA ESCALA que la planta. Antes se estiraba al ancho del lienzo: 11 × 3 m
// dibujados en una proporción de 10:1, que no es un croquis sino un esquema.
function ParedEnElevacion({ f, a, esc, sombrear, x0, y0, caja }) {
  const franjas = franjasDePared(f.W, a);
  const px = (u) => x0 + caja.margen + u * esc;
  const py = (u) => y0 + caja.alto - caja.margen - u * esc;

  const silueta = f.forma === "hastial"
    ? [[0, 0], [0, f.z1], [f.W / 2, f.z2], [f.W, f.z1], [f.W, 0]]
    : f.forma === "trapecio"
      ? [[0, 0], [0, f.z1], [f.W, f.z2], [f.W, 0]]
      : [[0, 0], [0, f.z1], [f.W, f.z1], [f.W, 0]];
  const alturaEn = (u) => {
    if (f.forma === "rectangulo") return f.z1;
    if (f.forma === "trapecio") return f.z1 + (f.z2 - f.z1) * (u / f.W);
    return u <= f.W / 2 ? f.z1 + (f.z2 - f.z1) * (2 * u / f.W)
      : f.z2 - (f.z2 - f.z1) * (2 * u / f.W - 1);
  };

  return (
    <g>
      {sombrear && franjas.map((fr, i) => (
        <rect key={`s${i}`} x={px(fr.desde)} y={py(f.zTope)}
          width={(fr.hasta - fr.desde) * esc} height={f.zTope * esc}
          fill={TRAMA_ZONA[fr.zona]} stroke="none" />
      ))}
      <polygon points={silueta.map(([u, z]) => `${px(u)},${py(z)}`).join(" ")}
        fill="none" stroke={c.txt} strokeWidth="1.6" />
      {franjas.slice(1).map((fr, i) => (
        <line key={`d${i}`} x1={px(fr.desde)} y1={py(0)} x2={px(fr.desde)}
          y2={py(alturaEn(fr.desde))} stroke={c.txt3} strokeWidth="1"
          strokeDasharray={TRAZOS} />
      ))}
      {/* ⚠ TODA FRANJA LLEVA SU NÚMERO, ANCHA O ANGOSTA. Antes se omitía el de las que
          medían menos de 24 px, y en un galpón de 30 m dibujado chico eso dejaba las dos
          zonas 5 —las esquinas, que son las más exigidas— sin rotular. La que no entra
          adentro sale ARRIBA de la pared con línea guía, y si arriba tampoco hay lugar
          —una torre de 3,5 m de frente tiene las tres franjas angostas— sube una fila
          más. Es lo que hace un plano. */}
      <RotulosDePared franjas={franjas} f={f} esc={esc} px={px} py={py}
        alturaEn={alturaEn} y0={y0} techo={y0 + 26} />
      {/* ⚠ LAS DOS COTAS VAN DEBAJO DE LA PARED, NO ADENTRO. Con el desplazamiento hacia
          arriba el texto caía dentro del paño, encima del número de zona: «11» montado
          sobre el ④. El signo del desplazamiento es relativo a la dirección de la línea,
          y en una cota de izquierda a derecha el positivo es hacia abajo. */}
      <Cota x1={px(0)} y1={py(0)} x2={px(Math.min(a, f.W))} y2={py(0)} desplaz={18}
        simbolo="a" valor={a} color={c.txt2} />
      <Cota x1={px(0)} y1={py(0)} x2={px(f.W)} y2={py(0)} desplaz={38}
        simbolo={f.eje === "X" ? EJE.Y : EJE.X} valor={f.W} color={c.txt2} />
      {/* El nombre va ARRIBA de la pared: abajo están las dos cotas encadenadas —el
          ancho de la zona 5 y el ancho total— y el rótulo se montaba sobre la segunda. */}
      {/* El nombre va en el tope de la fila, por encima de los números de zona: ellos se
          apilan hacia arriba según cuántos no entren adentro de su franja. */}
      <Texto x={px(f.W / 2)} y={y0 + 10} texto={nombrePared(f.eje, f.signo)}
        color={c.txt2} tam={TXT.min} peso={600} />
    </g>
  );
}
