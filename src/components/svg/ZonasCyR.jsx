// CROQUIS — ZONAS DE COMPONENTES Y REVESTIMIENTOS.
//
// Planta de cubierta y elevación de las dos paredes distintas, con sus zonas acotadas.
//
// ── EL DIBUJO NO CALCULA ────────────────────────────────────────────────────────
// Cada región sale de `engine/cyrZonas.js → regionesDe`, que es la MISMA regla que usa el
// motor para decir en qué zona cae un elemento, escrita como figuras en vez de como
// clasificador. Hay un test que las cruza punto por punto. Si acá se dibujara «lo que se
// entiende» de la figura, el croquis no podría desmentir al motor nunca —y fue justamente
// al dibujar las paredes que apareció que el motor las trataba como puntos de la planta—.
//
// ── POR QUÉ LAS PAREDES VAN EN ELEVACIÓN Y NO EN PLANTA ─────────────────────────
// Porque es lo que son. Las zonas 4 y 5 viven sobre una superficie vertical y la franja
// que las separa se mide a lo largo de la pared, no desde el borde de la planta.
import { mkView, Dim, Rotulo, Lienzo } from './kit.jsx';
import { regionesDe, franjasDePared, LAYOUT } from '../../engine/cyrZonas.js';

// Un color por zona, del interior a la esquina. La progresión es deliberada: la zona más
// succionada es la más saturada, así que el croquis se lee sin mirar la leyenda.
export const COLOR_ZONA = {
  "1'": "#dbeafe", "1": "#bfdbfe", "2": "#fbbf24", "3": "#f97316",
  "4": "#bfdbfe", "5": "#fbbf24",
};

const TRAZO = "#52514e";

export function ZonasCyR({ cyr, geo, U, ancho = 620, alto = 600, tema = "claro" }) {
  const ink = tema === "oscuro" ? "#c3c2b7" : TRAZO;
  const txt = tema === "oscuro" ? "#ffffff" : "#0b0b0b";
  if (!cyr?.geoZonas?.layout) return null;

  const { bx, by, a } = cyr.geoZonas;
  const piezas = regionesDe(cyr.geoZonas);

  // La planta ocupa la franja de arriba y la elevación la de abajo. El hueco entre las dos
  // no es decorativo: abajo de la planta van hasta TRES cotas encadenadas —0,2h, 0,6h y el
  // anillo de 0,6h a 1,2h—, y con el hueco de antes la última se metía encima del título
  // de la elevación.
  const yPlanta = 24, hPlanta = alto - 200;
  const v = mkView({ ancho, alto: hPlanta, xMin: 0, xMax: bx, yMin: 0, yMax: by, margen: 46 });
  const X = (m) => v.x(m);
  const Y = (m) => v.y(m) + yPlanta;
  // `mkView` invierte el eje Y —en el modelo +y va hacia arriba—, así que un rectángulo
  // del modelo se dibuja desde su borde SUPERIOR, que es `y + h`.
  const rect = (p, i) => (
    <rect key={`r${i}`} x={X(p.x)} y={Y(p.y + p.h)} width={v.l(p.w)} height={v.l(p.h)}
      fill={COLOR_ZONA[p.zona]} stroke="none" />
  );
  const banda = (p, i) => (
    <g key={`b${i}`}>
      {p.segmentos.map((s, j) => (
        <line key={j} x1={X(s[0])} y1={Y(s[1])} x2={X(s[2])} y2={Y(s[3])}
          stroke={COLOR_ZONA[p.zona]} strokeWidth={v.l(p.ancho)}
          strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </g>
  );

  const L = (m) => U.longitud(m, 2);   // longitud con su unidad, del perfil activo
  const zonasVisibles = cyr.zonasCubierta;

  // Las cotas horizontales van encadenadas desde el borde izquierdo; la vertical mide el
  // ancho del brazo corto de la L de esquina, que es la única medida que no se lee sobre
  // el eje x. En las figuras que zonifican con `a` las dos direcciones miden lo mismo, así
  // que ahí no hace falta la segunda.
  const lay = cyr.geoZonas.layout;
  const h = cyr.geoZonas.h;
  const cotasX = lay === LAYOUT.PLANA_H
    ? [{ simbolo: "0,2h", desde: 0, hasta: 0.2 * h },
       { simbolo: "0,6h", desde: 0, hasta: 0.6 * h },
       { simbolo: "0,6h", desde: 0.6 * h, hasta: 1.2 * h }]
    : [{ simbolo: "a", desde: 0, hasta: a }];
  // En la Fig. 5.3-2A la cota vertical mide el ANCHO del brazo horizontal de la L de
  // esquina: junto con el 0,6h horizontal completa el «0,2h × 0,6h» de la zona 3. Poner
  // ahí otra vez 0,6h duplicaría una medida y dejaría el brazo sin acotar.
  const cotaY = lay === LAYOUT.PLANA_H ? { simbolo: "0,2h", desde: 0, hasta: 0.2 * h } : null;

  // La franja de cumbrera —y la de cumbrera y limatesas en cuatro aguas— mide 2a de ancho
  // total, a cada lado del eje. Es la medida que no se puede leer desde un borde, así que
  // se acota sobre el propio eje.
  const cumbreraEnX = cyr.geoZonas.ejeCumbrera === "X";
  const cotaBanda = (lay === LAYOUT.DOS_AGUAS_CUMBRERA || lay === LAYOUT.CUATRO_AGUAS)
    ? { eje: cumbreraEnX ? "y" : "x", simbolo: "2a",
        medio: (cumbreraEnX ? by : bx) / 2, semi: a }
    : null;
  const pared = { largo: Math.max(bx, by), alto: geo.hAlero };
  const franjas = franjasDePared(pared.largo, a);

  // ── LA ELEVACIÓN NO USA `mkView` ───────────────────────────────────────────
  // `mkView` encaja una caja del modelo en una de pantalla con un margen, y acá la caja de
  // pantalla mide 54 px de alto contra un margen de 62: la escala salía NEGATIVA y el
  // navegador rechazaba cada `<rect>` con «attribute width: a negative value is not
  // valid». La franja de pared no necesita encajar dos dimensiones —su altura es un
  // rectángulo de alto fijo—, así que el mapeo es directo sobre el largo.
  const yElev = alto - 92, hElev = 54, mElev = 62;
  const ve = {
    x: (m) => mElev + m * (ancho - 2 * mElev) / pared.largo,
    l: (m) => m * (ancho - 2 * mElev) / pared.largo,
  };

  return (
    <Lienzo ancho={ancho} alto={alto} titulo="Zonas de componentes y revestimientos">
      <clipPath id="cyr-planta">
        <rect x={X(0)} y={Y(by)} width={v.l(bx)} height={v.l(by)} />
      </clipPath>

      <Rotulo x={ancho / 2} y={12} texto={`Planta de cubierta — Fig. ${cyr.figura}`}
        color={txt} tam={12} peso={600} />

      <g clipPath="url(#cyr-planta)">
        {piezas.map((p, i) => (p.tipo === "rect" ? rect(p, i) : banda(p, i)))}
      </g>
      <rect x={X(0)} y={Y(by)} width={v.l(bx)} height={v.l(by)} fill="none"
        stroke={ink} strokeWidth="1.5" />

      <Dim x1={X(0)} y1={Y(by) - 16} x2={X(bx)} y2={Y(by) - 16} texto={L(bx)} color={ink} />
      <Dim x1={X(bx) + 16} y1={Y(by)} x2={X(bx) + 16} y2={Y(0)} texto={L(by)} color={ink} />

      {/* ── LOS ANCHOS DE CADA ZONA ──────────────────────────────────────────
          No alcanza con las dimensiones generales: lo que se pasa a los planos de
          revestimiento y de correas es dónde empieza y dónde termina cada zona. Las cotas
          se dibujan encadenadas desde el borde inferior izquierdo, y se omiten las que no
          entran en la planta —en un edificio chico la franja de 0,6h puede ser más ancha
          que media planta, y acotarla igual dibujaría una cota fuera del edificio—. */}
      {cotasX.map((cota, i) => (
        cota.hasta <= bx / 2 + 1e-9 ? (
          <Dim key={`cx${i}`} x1={X(cota.desde)} y1={Y(0) + 18 + i * 17}
            x2={X(cota.hasta)} y2={Y(0) + 18 + i * 17}
            texto={`${cota.simbolo} = ${L(cota.hasta - cota.desde)}`} color={ink} />
        ) : null
      ))}
      {cotaY && cotaY.hasta <= by / 2 + 1e-9
        ? <Dim x1={X(0) - 20} y1={Y(cotaY.desde)} x2={X(0) - 20} y2={Y(cotaY.hasta)}
            texto={`${cotaY.simbolo} = ${L(cotaY.hasta - cotaY.desde)}`} color={ink} />
        : null}
      {cotaBanda ? (cotaBanda.eje === "y"
        ? <Dim x1={X(bx * 0.26)} y1={Y(cotaBanda.medio - cotaBanda.semi)}
            x2={X(bx * 0.26)} y2={Y(cotaBanda.medio + cotaBanda.semi)}
            texto={`${cotaBanda.simbolo} = ${L(2 * cotaBanda.semi)}`} color={ink} />
        : <Dim x1={X(cotaBanda.medio - cotaBanda.semi)} y1={Y(by * 0.26)}
            x2={X(cotaBanda.medio + cotaBanda.semi)} y2={Y(by * 0.26)}
            texto={`${cotaBanda.simbolo} = ${L(2 * cotaBanda.semi)}`} color={ink} />)
        : null}

      {/* ── LOS RÓTULOS VAN ÚLTIMOS ──────────────────────────────────────────
          Se dibujaban antes que las cotas, y la etiqueta de «2a» —que cae justo sobre el
          centro de la franja de cumbrera, que es donde va el rótulo de la zona 2— la
          tapaba: el croquis de dos aguas mostraba las zonas 1 y 3 y ninguna 2. Las dos
          etiquetas llevan fondo opaco, así que la que se dibuja última gana. */}
      {/* Un rótulo por zona presente, sobre un punto que de verdad pertenece a ella. */}
      {zonasVisibles.map((z) => {
        const p = piezas.filter(q => q.tipo === "rect" && q.zona === z)
          .sort((q, r) => r.w * r.h - q.w * q.h)[0];
        if (!p) return null;
        return <Rotulo key={z} x={X(p.x + p.w / 2)} y={Y(p.y + p.h / 2)} texto={z}
          color={txt} tam={12} peso={700} />;
      })}


      {/* ── ELEVACIÓN DE LA PARED ── */}
      <Rotulo x={ancho / 2} y={yElev - 12} texto="Elevación de pared — Fig. 5.3-1"
        color={txt} tam={11} peso={600} />
      {franjas.map((f, i) => (
        <rect key={i} x={ve.x(f.desde)} y={yElev} width={ve.l(f.hasta - f.desde)}
          height={hElev} fill={COLOR_ZONA[f.zona]} stroke={ink} strokeWidth="0.5" />
      ))}
      {franjas.map((f, i) => (
        ve.l(f.hasta - f.desde) > 16
          ? <Rotulo key={`t${i}`} x={ve.x((f.desde + f.hasta) / 2)} y={yElev + hElev / 2}
              texto={f.zona} color={txt} tam={12} peso={700} />
          : null
      ))}
      <Dim x1={ve.x(0)} y1={yElev + hElev + 16} x2={ve.x(Math.min(a, pared.largo))}
        y2={yElev + hElev + 16} texto={`a = ${L(a)}`} color={ink} />

    </Lienzo>
  );
}
