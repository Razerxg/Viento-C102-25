// CROQUIS 2 — PLANTA CON ZONAS Y PRESIONES.
//
// Muestra las cuatro caras con su presión y su signo. Es donde se ve de un golpe si un
// signo quedó invertido: barlovento tiene que EMPUJAR hacia el edificio y sotavento y
// laterales TIRAR hacia afuera. Una flecha al revés salta sola.
//
// ── LOS RÓTULOS VAN POR LADO, NO POR FÓRMULA GENERAL ────────────────────────────
// La primera versión ubicaba cada rótulo con una expresión única para las cuatro caras, y
// los tres de la fila central terminaban encimados: «Lateral −85» cortado contra el título
// y contra «−853 N/m²». Con cuatro posiciones fijas —arriba, abajo, izquierda, derecha— y
// el título fuera del dibujo, cada texto tiene su franja y no hay nada que resolver en
// tiempo de render.
import { mkView, Dim, Rotulo, Lienzo, Flecha, LeyendaPresion, TXT } from './kit.jsx';
import { colorPresion, tramosLeyenda } from '../../lib/escalaPresion.js';
import { q as fq, m as fm, coef, EJE } from './formatoCroquis.js';
import { c as tok } from '../tokens.js';

const ESP = 10;          // espesor de la banda coloreada, en px
const SEP = 30;          // separación del rótulo respecto de la banda
/** Margen del dibujo: tiene que contener la cota más lejana, `SEP + 150` más su texto. */
export const MARGEN = 215;

export function PlantaZonas({ analisis, maxAbs, tema = "claro", ancho = 620, alto = 470,
  escala, zoom = 1, setZoom }) {
  const { geo, dir } = analisis;
  // ⚠ LA TINTA SALE DE LOS TOKENS DEL TEMA, NO DE DOS LITERALES ELEGIDOS POR `tema`. Los
  // literales obligaban a pasar el tema a cada croquis y a re-renderizar al cambiarlo; los
  // tokens son variables CSS y se invierten solos. Lo único que sigue dependiendo de
  // `tema` es la ESCALA DE PRESIÓN, que es una escala de datos y vive aparte.
  const ink = tok.txt2;
  const txt = tok.txt;
  const { a, b } = geo;

  const de = (id) => analisis.superficies.find(s => s.id === id);
  const pBar = de("pared_barlovento")?.tramos?.at(-1)?.gobernante ?? 0;
  const pSot = de("pared_sotavento")?.gobernante ?? 0;
  const pLat = de("pared_lateral")?.gobernante ?? 0;

  const ejeX = dir.eje === "X", pos = dir.signo > 0;
  // Qué cara es cuál. `y` crece hacia ARRIBA en el modelo, y `mkView` ya invierte para SVG.
  const cara = {
    abajo:    ejeX ? { p: pLat, rot: "Lateral" } : { p: pos ? pBar : pSot, rot: pos ? "Barlovento" : "Sotavento" },
    arriba:   ejeX ? { p: pLat, rot: "Lateral" } : { p: pos ? pSot : pBar, rot: pos ? "Sotavento" : "Barlovento" },
    izquierda: ejeX ? { p: pos ? pBar : pSot, rot: pos ? "Barlovento" : "Sotavento" } : { p: pLat, rot: "Lateral" },
    derecha:  ejeX ? { p: pos ? pSot : pBar, rot: pos ? "Sotavento" : "Barlovento" } : { p: pLat, rot: "Lateral" },
  };

  // El dibujo ocupa la franja central; arriba queda el título y abajo la leyenda.
  const yTop = 28, yBot = alto - 46;
  // ⚠ EL MARGEN TIENE QUE DAR PARA LA COTA MÁS LEJANA, que es la de B_Y: va a
  // `SEP + 150` del borde para no tapar el rótulo de la cara izquierda. Con 118 el dibujo
  // entraba porque la escala lo dejaba chico; desde que llena su caja, la cota se salía
  // del lienzo 45 unidades.
  const v = mkView({ ancho, alto: yBot - yTop, xMin: 0, xMax: a, yMin: 0, yMax: b,
    margen: MARGEN, escalaFija: escala });
  const desp = (f) => ({ x: v.x(f), y: v.y(f) });
  const Y = (my) => v.y(my) + yTop;

  // Una flecha por cara: entra si comprime, sale si succiona. El sentido lo da el SIGNO de
  // la presión, no la posición de la cara: es justamente lo que hay que poder verificar.
  const flecha = (lado, p) => {
    const dentro = p > 0;
    const L = 22, gap = 8;
    const ejeVert = lado === "arriba" || lado === "abajo";
    const s = lado === "abajo" || lado === "derecha" ? 1 : -1;   // hacia afuera del rect
    const base = ejeVert
      ? { x: v.x(a / 2), y: lado === "abajo" ? Y(0) : Y(b) }
      : { x: lado === "izquierda" ? v.x(0) : v.x(a), y: Y(b / 2) };
    const off = (d) => ejeVert ? { x: base.x, y: base.y + s * d } : { x: base.x + s * d, y: base.y };
    const [p1, p2] = dentro ? [off(gap + L), off(gap)] : [off(gap), off(gap + L)];
    return <Flecha x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} color={ink} grosor={1.8} cabeza={6} />;
  };

  const banda = (lado, p) => {
    const ejeVert = lado === "arriba" || lado === "abajo";
    if (ejeVert) {
      const y = lado === "abajo" ? Y(0) : Y(b) - ESP;
      return <rect x={v.x(0)} y={y} width={v.l(a)} height={ESP}
        fill={colorPresion(p, maxAbs, tema)} stroke={ink} strokeWidth="0.8" />;
    }
    const x = lado === "izquierda" ? v.x(0) - ESP : v.x(a);
    return <rect x={x} y={Y(b)} width={ESP} height={v.l(b)}
      fill={colorPresion(p, maxAbs, tema)} stroke={ink} strokeWidth="0.8" />;
  };

  const rotulo = (lado, c) => {
    const pos2 = {
      abajo:     { x: v.x(a / 2), y: Y(0) + SEP + 24, ancla: "middle" },
      arriba:    { x: v.x(a / 2), y: Y(b) - SEP - 12, ancla: "middle" },
      izquierda: { x: v.x(0) - SEP - 6, y: Y(b / 2), ancla: "end" },
      derecha:   { x: v.x(a) + SEP + 6, y: Y(b / 2), ancla: "start" },
    }[lado];
    return (<>
      <Rotulo {...pos2} texto={c.rot} color={txt} tam={TXT.min} />
      <Rotulo {...pos2} y={pos2.y + 15} texto={fq(c.p)} color={txt} tam={TXT.min}
        peso={600} />
    </>);
  };

  return (
    <Lienzo ancho={ancho} alto={alto} titulo={`Planta — ${dir.label}`} escala={v.esc}
      edificio="cap2" unidades="Cotas en m · presiones en kN/m²" zoom={zoom} setZoom={setZoom}>
      <Rotulo x={ancho / 2} y={14} color={txt} tam={TXT.titulo} peso={600}
        texto={`${dir.label} · L/B = ${coef(analisis.L / analisis.B)}`} />

      <rect x={v.x(0)} y={Y(b)} width={v.l(a)} height={v.l(b)}
        fill={tok.hover} stroke={ink} strokeWidth="1.2" />

      {Object.entries(cara).map(([lado, c]) => (
        <g key={lado}>{banda(lado, c.p)}{flecha(lado, c.p)}{rotulo(lado, c)}</g>
      ))}

      {/* ⚠ EL SIGNO DE `desplaz` ELIGE EL LADO, y no es el mismo para las dos cotas: la
          perpendicular se toma girando la dirección de la línea, así que en la cota
          vertical —que va hacia arriba en pantalla— el positivo cae HACIA ADENTRO del
          rectángulo. Una primera versión usaba el mismo signo en las dos y la cota de `b`
          terminaba dibujada sobre la planta. */}
      {/* ⚠ «B_X» Y «B_Y», NO «a» Y «b». En el capítulo 5 `a` es el ANCHO DE ZONA, que se
          acota en el croquis de al lado: dos magnitudes distintas bajo la misma letra en
          la misma pantalla. La Fig. 2.4-8 del reglamento las llama B_X y B_Y. */}
      <Dim x1={v.x(0)} y1={Y(0)} x2={v.x(a)} y2={Y(0)} simbolo={EJE.X} valor={a}
        desplaz={SEP + 74} color={ink} />
      {/* ⚠ LA COTA DE `b` VA MÁS AFUERA QUE EL RÓTULO DE LA CARA IZQUIERDA. Su etiqueta
          lleva fondo opaco y se dibuja DESPUÉS de los rótulos, así que con la separación
          anterior tapaba la primera letra de «Barlovento» —se leía «arlovento»—. El número
          tiene que salir del ancho que ocupa el rótulo más largo, no de un valor a ojo. */}
      <Dim x1={v.x(0)} y1={Y(0)} x2={v.x(0)} y2={Y(b)} simbolo={EJE.Y} valor={b}
        desplaz={-(SEP + 150)} color={ink} />

      <LeyendaPresion x={ancho / 2 - 90} y={alto - 34} ancho={180}
        tramos={tramosLeyenda(maxAbs, tema)} fmt={fq} color={ink} lienzo={ancho} lienzoAlto={alto} />
    </Lienzo>
  );
}
