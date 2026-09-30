// CROQUIS DEL ALERO ADOSADO A UNA PARED — art. 5.9.
//
// ── QUÉ TIENE QUE EXPLICAR EL DIBUJO ────────────────────────────────────────────
// Tres alturas que se llaman parecido y no son lo mismo, y que son la única fuente de error
// real de este artículo:
//
//   · `h`   = altura media de cubierta del EDIFICIO. Es la que elige la figura (5.9-1 o
//             5.9-2) y con la que se evalúa `q_h`.
//   · `h_e` = altura media del alero de la CUBIERTA del edificio.
//   · `h_c` = altura media del ALERO ADOSADO.
//
// Un alero a 3 m colgado de un edificio de 25 se verifica con `q_h` de los 25 m. Escrito es
// contraintuitivo; dibujado con las tres cotas en el mismo alzado, se ve de una.
//
// ── LA ELEVACIÓN, NO LA PLANTA ──────────────────────────────────────────────────
// Las figuras 5.9 no zonifican la planta: no hay zonas 1, 2 y 3 que ubicar, y por lo tanto
// no hay nada que una planta explique que el alzado no diga mejor. La planta aparece sólo
// como una silueta chica al costado, para ubicar SOBRE QUÉ PARED está el alero —que es un
// dato del formulario y el único que la elevación no puede mostrar—.
//
// ── LAS DOS CARAS SE DIBUJAN COMO DOS LÍNEAS, O UNA ─────────────────────────────
// El alero de dos superficies físicas se dibuja con su canto: son las dos caras cuyas
// fijaciones verifica la Fig. 5.9-1A. Con una sola superficie va una línea sola, y ese
// dibujo es la razón de que la figura A no aplique.
import { mkView, Dim, Rotulo, Texto, Lienzo, Flecha, TXT } from './kit.jsx';
import { m, mU, coef } from './formatoCroquis.js';
import { c } from '../tokens.js';

/** El vuelo del alero, con el sentido en que sale de la pared que lo sostiene. */
const sentidoDe = (pared) => (pared.startsWith("+") ? +1 : -1);

/**
 * @param {object} p
 * @param {{h: number, hAlero: number, a: number, b: number}} p.geo  geometría normalizada
 * @param {{pared: string, ancho: number, vuelo: number, hc: number, he: number,
 *          dosSuperficies: boolean, pendiente: number}} p.alero
 */
export function AleroAdosadoSVG({ geo, alero, ancho = 700, alto = 420, escala,
  zoom = 1, setZoom }) {
  const { h, hAlero } = geo;
  const { vuelo, hc, he, dosSuperficies } = alero;
  const ejeAlero = alero.pared.endsWith("X") ? "X" : "Y";
  // El frente del edificio que se ve en la elevación es la dimensión NORMAL a la pared del
  // alero: si el alero sale de una pared ±X, se está mirando el edificio de costado y el
  // frente es `b`.
  const frente = ejeAlero === "X" ? geo.b : geo.a;
  const s = sentidoDe(alero.pared);

  // El dibujo va de la pared hacia afuera, con el edificio a un lado. `x = 0` es la línea
  // de la pared que sostiene el alero; el edificio ocupa el lado contrario al vuelo.
  const xEdif = s > 0 ? -frente : 0;
  const xVuelo = s > 0 ? vuelo : -vuelo;
  const zTope = Math.max(h, hAlero, he, hc) * 1.18;

  const yTop = 34;
  const v0 = mkView({ ancho, alto: alto - yTop,
    xMin: Math.min(xEdif, xVuelo) - frente * 0.06,
    xMax: Math.max(xEdif + frente, xVuelo) + frente * 0.06,
    yMin: 0, yMax: zTope, margen: 96, escalaFija: escala });
  const v = { ...v0, y: (u) => v0.y(u) + yTop };

  const X = (u) => v.x(u), Y = (u) => v.y(u);
  // El canto del alero: el espesor no es un dato del artículo —no entra en ningún
  // coeficiente—, así que se dibuja con una altura fija en unidades de viewBox y no a
  // escala. Dibujarlo a escala con un espesor inventado sería ponerle un número al croquis
  // que el cálculo no usa.
  const canto = 9;

  return (
    <Lienzo ancho={ancho} alto={alto} titulo="Alero adosado a pared — art. 5.9"
      escala={v.esc} edificio="alero-adosado"
      unidades="Cotas en m" zoom={zoom} setZoom={setZoom}>

      {/* terreno */}
      <line x1={X(Math.min(xEdif, xVuelo) - frente * 0.06)} y1={Y(0)}
        x2={X(Math.max(xEdif + frente, xVuelo) + frente * 0.06)} y2={Y(0)}
        stroke={c.txt2} strokeWidth="1.5" />

      {/* EL EDIFICIO. Hasta la altura del alero de cubierta, `h_e`, que es la cota que la
          figura nombra; la altura media `h` se acota aparte porque es la que elige la
          figura y puede no coincidir con ninguna arista del dibujo. */}
      <rect x={X(Math.min(xEdif, xEdif + frente))} y={Y(hAlero)}
        width={v.l(frente)} height={v.l(hAlero)}
        fill={c.hover} stroke={c.txt2} strokeWidth="1.5" />

      {/* La altura media de cubierta, en trazos: no es una arista del edificio y dibujarla
          con línea llena la haría pasar por una. */}
      <line x1={X(xEdif)} y1={Y(h)} x2={X(xEdif + frente)} y2={Y(h)}
        stroke={c.azul} strokeWidth="1.2" strokeDasharray="7 4" />

      {/* EL ALERO. Dos líneas si tiene dos superficies físicas, una si no. */}
      {dosSuperficies ? (
        <g>
          <line x1={X(0)} y1={Y(hc)} x2={X(xVuelo)} y2={Y(hc)}
            stroke={c.txt} strokeWidth="2" />
          <line x1={X(0)} y1={Y(hc) + canto} x2={X(xVuelo)} y2={Y(hc) + canto}
            stroke={c.txt} strokeWidth="2" />
          <line x1={X(xVuelo)} y1={Y(hc)} x2={X(xVuelo)} y2={Y(hc) + canto}
            stroke={c.txt} strokeWidth="1.4" />
        </g>
      ) : (
        <line x1={X(0)} y1={Y(hc)} x2={X(xVuelo)} y2={Y(hc)}
          stroke={c.txt} strokeWidth="2.4" />
      )}

      {/* Las dos caras rotuladas: son los dos elementos que verifica la Fig. 5.9-1A, y con
          una sola superficie ese par no existe. */}
      {dosSuperficies ? (
        <>
          <Texto x={X(xVuelo / 2)} y={Y(hc) - 11} texto="cara superior" color={c.txt2}
            tam={TXT.min} />
          <Texto x={X(xVuelo / 2)} y={Y(hc) + canto + 12} texto="cara inferior"
            color={c.txt2} tam={TXT.min} />
        </>
      ) : (
        <Texto x={X(xVuelo / 2)} y={Y(hc) - 12} texto="una sola superficie"
          color={c.txt2} tam={TXT.min} />
      )}

      {/* LAS TRES ALTURAS, cada una desde el terreno, apartadas entre sí para que las
          cotas no se monten. `h` va del lado del edificio porque es SU altura; `h_c`, del
          lado del vuelo, porque es la del alero. */}
      <Dim x1={X(xEdif + frente * (s > 0 ? 0.12 : 0.88))} y1={Y(0)}
        x2={X(xEdif + frente * (s > 0 ? 0.12 : 0.88))} y2={Y(h)}
        texto={`h = ${m(h)}`} desplaz={s > 0 ? -22 : 22} color={c.azul} />
      <Dim x1={X(xEdif + frente * (s > 0 ? 0.62 : 0.38))} y1={Y(0)}
        x2={X(xEdif + frente * (s > 0 ? 0.62 : 0.38))} y2={Y(hAlero)}
        texto={`h_e = ${m(he)}`} desplaz={s > 0 ? 22 : -22} color={c.txt2} />
      <Dim x1={X(xVuelo)} y1={Y(0)} x2={X(xVuelo)} y2={Y(hc)}
        texto={`h_c = ${m(hc)}`} desplaz={s > 0 ? 26 : -26} color={c.txt} />

      {/* EL VUELO, acotado sobre el alero. */}
      <Dim x1={X(0)} y1={Y(hc) + canto + 34} x2={X(xVuelo)} y2={Y(hc) + canto + 34}
        texto={`vuelo = ${m(vuelo)}`} color={c.txt} />

      {/* ⚠ h_e ES LA COTA DE LA FIGURA Y h_Alero LA DEL MODELO, y cuando el proyectista
          carga h_e a mano pueden no coincidir. Si difieren se dice, en vez de dibujar una
          cota que no es la que el cálculo usó. */}
      {Math.abs(he - hAlero) > 0.005 ? (
        <>
          <line x1={X(xEdif)} y1={Y(he)} x2={X(xEdif + frente)} y2={Y(he)}
            stroke={c.txt} strokeWidth="1" strokeDasharray="4 3" opacity="0.8" />
          <Texto x={X(xEdif + frente / 2)} y={Y(he) - 10} color={c.txt2} tam={TXT.min}
            texto={`h_e cargada a mano: ${mU(he)} (alero del modelo: ${mU(hAlero)})`} />
        </>
      ) : null}

      {/* LA RELACIÓN h_c/h_e, que es lo que elige la banda de las figuras netas. Va escrita
          en el dibujo y no sólo en la tabla: es el número que decide entre curvas que
          difieren un 55 %.
          ⚠ VA ARRIBA, COMO RENGLÓN DE LÁMINA, Y NO COLGADA DEL ALERO. Puesta a 30 unidades
          sobre el alero caía sobre la cota de `h_c`: esa cota se rotula en su punto medio,
          o sea a media altura del alero, y con un alero bajo sobre un edificio alto —los
          3,5 m del caso de control sobre 24 m— las dos quedan a menos de un renglón. Acá no
          compite con nada: el título va centrado y este renglón al costado del vuelo. */}
      <Texto x={s > 0 ? ancho - 10 : 10} y={32} color={c.txt} tam={TXT.min} peso={600}
        ancla={s > 0 ? "end" : "start"}
        texto={he > 0 ? `h_c/h_e = ${coef(hc / he, 3)}` : "h_c/h_e = —"} />

      {/* El viento contra la pared, que es lo que entra por debajo del alero. Dos flechas y
          no una: una sola parece el viento «del croquis» y no la acción sobre ESTA pared. */}
      {[0.35, 0.72].map((f, i) => (
        <Flecha key={i} x1={X(xVuelo + xVuelo * 0.55)} y1={Y(zTope * f)}
          x2={X(xVuelo * 0.12)} y2={Y(zTope * f)} color={c.azul} grosor={1.5} cabeza={5} />
      ))}

      <Rotulo x={ancho / 2} y={15} color={c.txt} tam={TXT.titulo} peso={600}
        texto={`Alero adosado a la ${alero.pared.replace("-", "−")} · `
          + `q_h se evalúa a h = ${mU(h)}`} />
    </Lienzo>
  );
}
