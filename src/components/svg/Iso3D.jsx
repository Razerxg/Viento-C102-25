// CROQUIS 4 — ISOMÉTRICA DEL EDIFICIO, COLOREADA POR PRESIÓN.
//
// Es el mejor para detectar un signo invertido de un golpe de vista: en un edificio bien
// resuelto la cara de barlovento es la única cálida y todo el resto es frío. Si aparecen
// dos caras rojas enfrentadas, algo está al revés.
//
// El color NUNCA es el único portador: cada cara lleva su valor escrito, hay leyenda, y la
// tabla de superficies da los números exactos. Es el alivio que exige el contraste bajo
// del extremo neutro de la escala.
import { Rotulo, Lienzo, LeyendaPresion } from './kit.jsx';
import { colorPresion, tramosLeyenda } from '../../lib/escalaPresion.js';
import { carasIso } from '../../lib/carasIso.js';

// Proyección isométrica clásica: x a 30° a la derecha, y a 30° a la izquierda, z arriba.
// Se elige ésta y no una perspectiva porque las longitudes paralelas se conservan y las
// caras se pueden comparar entre sí; con perspectiva, la cara del fondo se vería menor y
// el croquis sugeriría una diferencia que no existe.
const ISO = (x, y, z, e) => {
  const c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6);
  return [(x - y) * c * e, ((x + y) * s - z) * e];
};

export function Iso3D({ analisis, maxAbs, fmt, tema = "claro", ancho = 620, alto = 420 }) {
  const { geo, dir, superficies } = analisis;
  const ink = tema === "oscuro" ? "#c3c2b7" : "#52514e";
  const txt = tema === "oscuro" ? "#ffffff" : "#0b0b0b";
  const { a, b, h } = geo;

  const de = (id) => superficies.find(s => s.id === id);
  const pBar = de("pared_barlovento")?.tramos?.at(-1)?.gobernante ?? 0;
  const pSot = de("pared_sotavento")?.gobernante ?? 0;
  const pLat = de("pared_lateral")?.gobernante ?? 0;
  const pCub = superficies.find(s => s.tipo === "cubierta" && s.caso !== "positivo")?.gobernante ?? 0;

  // ⚠ LA VISTA SE ORIENTA PARA QUE BARLOVENTO SIEMPRE SE VEA.
  //
  // En esta proyección las caras visibles son x = a, y = b y la cubierta; las otras dos
  // quedan atrás. Pero cuál es barlovento depende de la dirección: con viento según +Y es
  // la cara y = 0, que en una vista fija quedaría OCULTA detrás de la lateral, con su
  // rótulo flotando sobre el techo. Un croquis que esconde justo la cara que el viento
  // golpea no sirve para nada.
  //
  // Se espeja el MODELO —no la cámara— en el eje del viento cuando el sentido es positivo,
  // de modo que la cara cargada cae siempre del lado visible. Es el equivalente a girar la
  // maqueta para mirarla de frente, y por eso los rótulos siguen diciendo la verdad.
  const ejeX = dir.eje === "X", pos = dir.signo > 0;
  const mirX = pos && ejeX, mirY = pos && !ejeX;
  const mx = (x) => (mirX ? a - x : x);
  const my = (y) => (mirY ? b - y : y);

  const esc = Math.min((ancho - 150) / ((a + b) * Math.cos(Math.PI / 6)),
    (alto - 160) / ((a + b) * Math.sin(Math.PI / 6) + h));
  const pts = [[0,0,0],[a,0,0],[a,b,0],[0,b,0],[0,0,h],[a,0,h],[a,b,h],[0,b,h]]
    .map(([x, y, z]) => ISO(mx(x), my(y), z, esc));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const ox = ancho / 2 - (Math.min(...xs) + Math.max(...xs)) / 2;
  const oy = (alto - 56) / 2 - (Math.min(...ys) + Math.max(...ys)) / 2 + 14;
  const P = (i) => `${pts[i][0] + ox},${pts[i][1] + oy}`;
  const C = (i) => [pts[i][0] + ox, pts[i][1] + oy];
  const cen = (is) => {
    const cs = is.map(C);
    return [cs.reduce((s, c) => s + c[0], 0) / cs.length, cs.reduce((s, c) => s + c[1], 0) / cs.length];
  };

  // La selección de caras vive en `lib/carasIso.js`, con su test: acá estuvo un bug real
  // —espejar las coordenadas y dejar los índices en la posición original— y conviene que
  // quede fijado con una afirmación y no con una inspección visual.
  const { carXa, carYb, cubierta, oculto, vecinos } = carasIso({ ejeX, pos });

  const caras = [
    { idx: carXa, p: ejeX ? pBar : pLat, rot: ejeX ? "Barlovento" : "Lateral" },
    { idx: carYb, p: ejeX ? pLat : pBar, rot: ejeX ? "Lateral" : "Barlovento" },
    { idx: cubierta, p: pCub, rot: "Cubierta" },
  ];
  // Sotavento es por definición la cara opuesta a la que mira el viento, así que queda
  // atrás siempre: su valor se informa aparte en vez de fingir que se ve.
  const oculta = { rot: "Sotavento (cara posterior)", p: pSot };

  return (
    <Lienzo ancho={ancho} alto={alto} titulo={`Isométrica — ${dir.label}`}>
      {caras.map((c, i) => (
        <polygon key={i} points={c.idx.map(P).join(" ")}
          fill={colorPresion(c.p, maxAbs, tema)} stroke={ink} strokeWidth="1.3"
          strokeLinejoin="round" />
      ))}
      {caras.map((c, i) => {
        const [cx, cy] = cen(c.idx);
        return (
          <g key={`r${i}`}>
            <Rotulo x={cx} y={cy - 8} texto={c.rot} color={txt} tam={10} />
            <Rotulo x={cx} y={cy + 8} texto={fmt.q(c.p)} color={txt} tam={10} peso={600} />
          </g>
        );
      })}
      {/* aristas ocultas, punteadas: dan el volumen sin tapar nada */}
      {vecinos.map((j, k) => (
        <line key={k} x1={C(oculto)[0]} y1={C(oculto)[1]} x2={C(j)[0]} y2={C(j)[1]}
          stroke={ink} strokeWidth="0.8" strokeDasharray="4 3" opacity="0.55" />
      ))}
      <Rotulo x={ancho / 2} y={16} texto={`${dir.label} — presión gobernante por cara`}
        color={txt} tam={11} peso={600} />
      <Rotulo x={ancho / 2} y={alto - 52} texto={`${oculta.rot}: ${fmt.q(oculta.p)}`}
        color={txt} tam={10} />
      <LeyendaPresion x={ancho / 2 - 110} y={alto - 32} ancho={220}
        tramos={tramosLeyenda(maxAbs, tema)} fmt={fmt.q} color={ink} />
    </Lienzo>
  );
}
