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
// ── LAS COTAS VAN EN MILÍMETROS ─────────────────────────────────────────────────
// A propósito, y no en las unidades de la pantalla. Este croquis es lo que se transcribe
// al plano de revestimiento y de correas, y un plano va en mm. Se usa el perfil `memoria`,
// que es el que ya tiene esa decisión tomada; no hay ninguna conversión a mano.
import { mkView, Cota, Zona, Rotulo, Lienzo, Flecha } from './kit.jsx';
import { regionesDe, franjasDePared, puntosDeRotulo, LAYOUT } from '../../engine/cyrZonas.js';
import { unidades, PERFILES } from '../../lib/unidades.js';
import { miles } from '../../lib/formato.js';
import { c } from '../tokens.js';

const Umm = unidades(PERFILES.memoria);
/** Una longitud en mm, con separador de miles: «3.600». */
const mm = (m) => miles(Umm.val.longitud(m), 0);

/** El gris de relleno de cada zona, cuando el sombreado está activo. */
export const TRAMA_ZONA = {
  "1'": "none", "1": c.tramaZ1, "2": c.tramaZ2, "3": c.tramaZ3,
  "2'": c.tramaZ2, "3'": c.tramaZ3,
  "4": c.tramaZ1, "5": c.tramaZ2,
};

/** «1'» se escribe con prima tipográfica, como en la figura. */
const etiqueta = (z) => z.replace("'", "′");

const TRAZOS = "7 5";

/** Radio del círculo del número de zona. Se usa también para recortarlo al contorno. */
const RZ = 11;

export function ZonasCyR({ cyr, geo, sombrear = false, ancho = 660, alto = 560 }) {
  if (!cyr?.geoZonas?.layout) return null;
  const { bx, by, a, h, layout, ejeCumbrera } = cyr.geoZonas;
  const piezas = regionesDe(cyr.geoZonas);

  // ── PLANTA, a la izquierda; ELEVACIÓN, a la derecha y más chica ─────────────
  const anchoP = Math.round(ancho * 0.60);
  // La franja de arriba lleva planta y elevación; la de abajo, la pared. El hueco
  // entre las dos es el de los rótulos «PLANTA» / «ELEVACIÓN» y el título de la pared.
  const yTop = 22, hFila = alto - 200;
  const v = mkView({ ancho: anchoP, alto: hFila, xMin: 0, xMax: bx, yMin: 0, yMax: by,
    margen: 50 });
  const X = (m) => v.x(m);
  const Y = (m) => v.y(m) + yTop;

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
  const cumbreraX = ejeCumbrera === "X";
  const Lu = cumbreraX ? bx : by, Lv = cumbreraX ? by : bx;
  const aXY = (u, w) => (cumbreraX ? [u, w] : [w, u]);
  const lineasTecho = layout === LAYOUT.CUATRO_AGUAS
    ? banda.segmentos
    : layout === LAYOUT.DOS_AGUAS_CUMBRERA || layout === LAYOUT.DOS_AGUAS_ESQUINAS
      ? [[...aXY(0, Lv / 2), ...aXY(Lu, Lv / 2)]]
      : [];

  // En cuatro aguas la franja de zona 2 sigue la cumbrera y las limatesas: su límite son
  // dos paralelas a distancia `a` de cada tramo. Es lo que dibuja la Fig. 5.3-2E.
  const paralelas = [];
  if (layout === LAYOUT.CUATRO_AGUAS) {
    for (const [x1, y1, x2, y2] of banda.segmentos) {
      const d = Math.hypot(x2 - x1, y2 - y1) || 1;
      const [nx, ny] = [-(y2 - y1) / d * a, (x2 - x1) / d * a];
      paralelas.push([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny]]);
      paralelas.push([[x1 - nx, y1 - ny], [x2 - nx, y2 - ny]]);
    }
  }

  const unaAguaLayout = layout === LAYOUT.UNA_AGUA_PRIMADA || layout === LAYOUT.UNA_AGUA;
  const bajaHacia = cyr.geoZonas.pendienteHacia ?? "+Y";
  const ejePendY = bajaHacia.endsWith("Y");   // la pendiente corre sobre Y
  const alFinal = bajaHacia.startsWith("+");  // el alero BAJO está en el extremo del eje

  // ── Un rótulo por zona, en el punto más «adentro» que tiene esa zona ───────
  // No en el centro de su rectángulo más grande: en cuatro aguas la zona 1 se dibuja como
  // un rectángulo que cubre toda la planta, y su centro es justo donde pasa la cumbrera.
  // El ② quedaba encima del ① y el croquis mostraba una zona menos.
  const centros = puntosDeRotulo(cyr.geoZonas);
  const rotulos = cyr.zonasCubierta
    .filter(z => centros[z]).map(z => ({ z, ...centros[z] }));

  // ── Cotas de zona, encadenadas desde el borde ───────────────────────────────
  // En vertiente única el ancho de la franja NO es el mismo en los dos ejes ni en las dos
  // figuras —lateral 2a en la 5.3-5A y `a` en la 5.3-5B, alero bajo `a` en las dos—, y es
  // justo lo que se transcribe al plano de correas: se acota cada una con su valor.
  const anchoLat = layout === LAYOUT.UNA_AGUA_PRIMADA ? 2 * a : a;
  // La franja que toca el borde x = 0 (para la cota sobre X) y la que toca y = 0 (sobre Y).
  // Con la pendiente sobre Y, x = 0 es un borde LATERAL; con la pendiente sobre X, es un
  // alero, y cuál de los dos lo dice `alFinal`. Cada caso tiene su ancho y su símbolo.
  const franjaEnCero = (ejeEsPendiente) => {
    if (!ejeEsPendiente) return { ancho: anchoLat, s: anchoLat === a ? "a" : "2a" };
    // El alero BAJO está en el extremo del eje si `alFinal`; entonces en 0 está el ALTO.
    return alFinal ? { ancho: 2 * a, s: "2a" } : { ancho: a, s: "a" };
  };
  const enX = franjaEnCero(!ejePendY), enY = franjaEnCero(ejePendY);
  const cotasX = layout === LAYOUT.PLANA_H
    ? [{ s: "0,2h", d: 0, ha: 0.2 * h }, { s: "0,6h", d: 0, ha: 0.6 * h },
       { s: "0,6h", d: 0.6 * h, ha: 1.2 * h }]
    : unaAguaLayout ? [{ s: enX.s, d: 0, ha: enX.ancho }]
      : [{ s: "a", d: 0, ha: a }];
  const cotaY = layout === LAYOUT.PLANA_H ? { s: "0,2h", d: 0, ha: 0.2 * h }
    : unaAguaLayout ? { s: enY.s, d: 0, ha: enY.ancho }
      : null;
  const conBanda = layout === LAYOUT.DOS_AGUAS_CUMBRERA || layout === LAYOUT.CUATRO_AGUAS;

  // ── ELEVACIÓN ───────────────────────────────────────────────────────────────
  const xE = anchoP + 18, anchoE = ancho - xE - 14;
  const luz = layout === LAYOUT.PLANA_H || cumbreraX ? by : bx;   // la luz que se ve de frente
  const hTot = Math.max(geo.hCumbre ?? geo.hAlero, geo.hAlero);
  const ve = mkView({ ancho: anchoE, alto: hFila, xMin: 0, xMax: luz, yMin: 0,
    yMax: hTot * 1.12, margen: 34 });
  const XE = (m) => ve.x(m) + xE;
  const YE = (m) => ve.y(m) + yTop;
  const unaAgua = cyr.figura === "5.3-5A" || cyr.figura === "5.3-5B";

  // ── DE QUÉ LADO BAJA LA PENDIENTE ───────────────────────────────────────────
  // ⚠ EL DIBUJO SIGUE A `pendienteHacia`, NO A UNA CONVENCIÓN FIJA. Rotular «alero alto»
  // siempre arriba parece inofensivo y no lo es: con la pendiente hacia +Y el croquis
  // contradecía al clasificador —la zona 3′, que va contra el alero ALTO, aparecía del
  // lado rotulado «alero bajo»— y el croquis existe justamente para poder controlar eso.
  // El borde al que LLEGA la pendiente es el bajo; el opuesto, el alto.
  // Cada borde, en coordenadas de pantalla, con hacia dónde se rota su rótulo para que
  // corra paralelo al borde —como las notas de las figuras del reglamento—.
  const borde = (esBajo) => {
    const enElFinal = alFinal === esBajo;
    if (ejePendY) {
      return enElFinal
        ? { x: X(bx / 2), y: Y(by) - 44, rot: 0, hx: X(bx / 2), hy: Y(by) }
        : { x: X(bx / 2), y: Y(0) + 20, rot: 0, hx: X(bx / 2), hy: Y(0) };
    }
    return enElFinal
      ? { x: X(bx) + 42, y: Y(by / 2), rot: 90, hx: X(bx), hy: Y(by / 2) }
      : { x: X(0) - 26, y: Y(by / 2), rot: -90, hx: X(0), hy: Y(by / 2) };
  };
  const aleroBajo = borde(true), aleroAlto = borde(false);
  const rotuloAlero = (b, texto) => (
    <g transform={`rotate(${b.rot} ${b.x} ${b.y})`}>
      <Rotulo x={b.x} y={b.y} texto={texto} color={c.txt2} tam={10.5} />
    </g>
  );
  const cumbre = geo.hCumbre ?? geo.hAlero;
  const techo = unaAgua
    ? [[0, cumbre], [luz, geo.hAlero]]
    : geo.theta > 0 && cumbre > geo.hAlero
      ? [[0, geo.hAlero], [luz / 2, cumbre], [luz, geo.hAlero]]
      : [[0, geo.hAlero], [luz, geo.hAlero]];

  // ── ELEVACIÓN DE PARED, abajo ───────────────────────────────────────────────
  const largoPared = Math.max(bx, by);
  const franjas = franjasDePared(largoPared, a);
  const yP = alto - 100, hP = 54, mP = 58;
  const xP = (m) => mP + m * (ancho - 2 * mP) / largoPared;
  const lP = (m) => m * (ancho - 2 * mP) / largoPared;

  const linea = (p, i, extra = {}) => (
    <line key={i} x1={X(p[0][0])} y1={Y(p[0][1])} x2={X(p[1][0])} y2={Y(p[1][1])}
      stroke={c.txt3} strokeWidth="1" strokeDasharray={TRAZOS} {...extra} />
  );

  return (
    <Lienzo ancho={ancho} alto={alto} titulo="Zonas de componentes y revestimientos">
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

      {/* Vertiente única: de qué lado baja la pendiente, que es lo que decide las zonas */}
      {unaAgua && (() => {
        // La flecha sale del centro y apunta al alero BAJO: es la dirección en que
        // desciende el agua, y de un vistazo dice cuál de los dos bordes es cuál.
        const cx = X(bx / 2), cy = Y(by / 2);
        const d = Math.hypot(aleroBajo.hx - cx, aleroBajo.hy - cy) || 1;
        return <>
          <Flecha x1={cx} y1={cy} x2={cx + 34 * (aleroBajo.hx - cx) / d}
            y2={cy + 34 * (aleroBajo.hy - cy) / d} color={c.txt2} grosor={1.4} />
          {rotuloAlero(aleroAlto, "alero alto")}
          {rotuloAlero(aleroBajo, "alero bajo")}
        </>;
      })()}

      {/* El círculo se recorta al contorno: en una franja de ancho `a` el número es más
          ancho que la franja, y sin esto quedaba mordido por la línea de la planta. */}
      {rotulos.map(r => (
        <Zona key={r.z} texto={etiqueta(r.z)} color={c.txt}
          x={Math.min(Math.max(X(r.x), X(0) + RZ), X(bx) - RZ)}
          y={Math.min(Math.max(Y(by) + RZ, Y(r.y)), Y(0) - RZ)} r={RZ} />
      ))}

      <Cota x1={X(0)} y1={Y(by)} x2={X(bx)} y2={Y(by)} desplaz={-20} texto={mm(bx)}
        color={c.txt2} />
      <Cota x1={X(bx)} y1={Y(by)} x2={X(bx)} y2={Y(0)} desplaz={-22} texto={mm(by)}
        color={c.txt2} />
      {/* Las de cubierta plana van ADENTRO porque son tres encadenadas y abajo no entran:
          el rótulo «PLANTA» está a 60 px del borde. Las demás son una sola y van afuera,
          donde no se montan sobre el número de zona de la esquina. */}
      {cotasX.map((k, i) => (k.ha <= bx / 2 + 1e-9 ? (
        <Cota key={`cx${i}`} x1={X(k.d)} y1={Y(0)} x2={X(k.ha)} y2={Y(0)}
          desplaz={layout === LAYOUT.PLANA_H ? -(18 + i * 17) : 18}
          texto={`${k.s} = ${mm(k.ha - k.d)}`} color={c.txt2} />
      ) : null))}
      {/* En vertiente única esta cota se va al borde DERECHO: la de X ya ocupa la esquina
          inferior izquierda y las dos etiquetas se tapaban entre sí y con el número de
          zona de la esquina. */}
      {cotaY && cotaY.ha <= by / 2 + 1e-9 && (
        <Cota x1={unaAguaLayout ? X(bx) : X(0)} y1={Y(cotaY.d)}
          x2={unaAguaLayout ? X(bx) : X(0)} y2={Y(cotaY.ha)}
          desplaz={unaAguaLayout ? -18 : 18}
          texto={`${cotaY.s} = ${mm(cotaY.ha - cotaY.d)}`} color={c.txt2} />
      )}
      {/* La cota de la franja de cumbrera no va ni en el medio ni contra una punta: en el
          medio se monta sobre el rótulo de la zona 2, y contra la punta, sobre el de la
          zona 3 —que en dos aguas vive justo ahí, en el extremo de la cumbrera—. */}
      {conBanda && (cumbreraX
        ? <Cota x1={X(bx * 0.30)} y1={Y(by / 2 - a)} x2={X(bx * 0.30)} y2={Y(by / 2 + a)}
            texto={`2a = ${mm(2 * a)}`} color={c.txt2} />
        : <Cota x1={X(bx / 2 - a)} y1={Y(by * 0.30)} x2={X(bx / 2 + a)} y2={Y(by * 0.30)}
            texto={`2a = ${mm(2 * a)}`} color={c.txt2} />)}
      <Rotulo x={X(bx / 2)} y={yTop + hFila + 10} texto="PLANTA" color={c.txt2} tam={11}
        peso={600} />

      {/* ── ELEVACIÓN ── */}
      <polyline points={[[0, 0], [0, techo[0][1]], ...techo.map(p => [p[0], p[1]]),
        [luz, 0], [0, 0]].map(([x, y]) => `${XE(x)},${YE(y)}`).join(" ")}
        fill="none" stroke={c.txt} strokeWidth="1.6" />
      {/* θ: una marca sobre la línea de alero y el ángulo rotulado */}
      {geo.theta > 0 && <>
        <line x1={XE(0)} y1={YE(techo[0][1])} x2={XE(luz * 0.34)} y2={YE(techo[0][1])}
          stroke={c.txt3} strokeWidth="0.8" strokeDasharray="4 3" />
        <Rotulo x={XE(luz * 0.21)} y={YE(techo[0][1]) - 13}
          texto={`θ = ${miles(geo.theta, geo.theta % 1 === 0 ? 0 : 1)}°`}
          color={c.txt2} tam={10.5} />
      </>}
      {/* La cota de h va POR FUERA del edificio: con desplazamiento hacia adentro, el
          texto caía encima de la pared y del faldón. */}
      <Cota x1={XE(luz)} y1={YE(0)} x2={XE(luz)} y2={YE(cyr.altura.valor)} desplaz={22}
        texto={`h = ${mm(cyr.altura.valor)}`} color={c.txt2} />
      <Rotulo x={XE(luz / 2)} y={yTop + hFila + 10} texto="ELEVACIÓN" color={c.txt2}
        tam={11} peso={600} />
      <Rotulo x={XE(luz / 2)} y={yTop + hFila + 26}
        texto={cyr.altura.cual === "alero" ? "h = altura del alero"
          : "h = altura media de cubierta"} color={c.txt3} tam={10} />

      {/* ── PARED EN ELEVACIÓN ── */}
      <Rotulo x={ancho / 2} y={yP - 14} texto="ELEVACIÓN DE PARED — Fig. 5.3-1"
        color={c.txt2} tam={11} peso={600} />
      {sombrear && franjas.map((f, i) => (
        <rect key={`s${i}`} x={xP(f.desde)} y={yP} width={lP(f.hasta - f.desde)} height={hP}
          fill={TRAMA_ZONA[f.zona]} stroke="none" />
      ))}
      {franjas.slice(1).map((f, i) => (
        <line key={`d${i}`} x1={xP(f.desde)} y1={yP} x2={xP(f.desde)} y2={yP + hP}
          stroke={c.txt3} strokeWidth="1" strokeDasharray={TRAZOS} />
      ))}
      <rect x={xP(0)} y={yP} width={lP(largoPared)} height={hP} fill="none" stroke={c.txt}
        strokeWidth="1.6" />
      {franjas.map((f, i) => (lP(f.hasta - f.desde) > 26
        ? <Zona key={`z${i}`} x={xP((f.desde + f.hasta) / 2)} y={yP + hP / 2}
            texto={f.zona} color={c.txt} r={10} />
        : null))}
      <Cota x1={xP(0)} y1={yP + hP} x2={xP(Math.min(a, largoPared))} y2={yP + hP}
        desplaz={-16} texto={`a = ${mm(a)}`} color={c.txt2} />
    </Lienzo>
  );
}
