// GRÁFICO — LAS CURVAS (GC_p) QUE EL CÁLCULO ESTÁ USANDO.
//
// Es el gráfico de la figura del reglamento, dibujado con los MISMOS puntos de quiebre que
// lee el motor. No hay un juego de datos para la cuenta y otro para el dibujo: las series
// salen de `engine/cyrPresiones.js → curvasUsadas`, que es la que aplica la reducción del
// 10 % en paredes y las sustituciones de la nota 5 de parapeto.
//
// Eso es lo que lo vuelve un control y no una ilustración. Dibujando la curva de la figura
// mientras la tabla usa otra, el gráfico confirmaría cualquier cosa.
//
// ── EL EJE VERTICAL VA INVERTIDO ────────────────────────────────────────────────
// Negativos arriba, positivos abajo, como en TODAS las figuras del capítulo. Es
// contraintuitivo y es correcto: quien compara el gráfico de la app con el escaneo de la
// figura no tiene que dar vuelta la cabeza. La succión, que es lo que gobierna, queda
// arriba.
//
// ⚠ NI UN COLOR LITERAL. Todo sale de los tokens del tema. Hay test.
import { Lienzo, Rotulo, Zona } from './kit.jsx';
import { c } from '../tokens.js';
import { miles } from '../../lib/formato.js';

const AREAS_GRILLA = [0.1, 1, 2, 5, 10, 20, 50, 100];
const TRAZOS = "6 4";
const etiqueta = (z) => z.replace("'", "′");

/** El valor de una poligonal en log A, con los extremos congelados. */
function enA(puntos, A) {
  const x = Math.log10(A);
  const xs = puntos.map(p => Math.log10(p[0]));
  if (x <= xs[0]) return puntos[0][1];
  if (x >= xs[xs.length - 1]) return puntos[puntos.length - 1][1];
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) {
      const t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
      return puntos[i - 1][1] + t * (puntos[i][1] - puntos[i - 1][1]);
    }
  }
  return puntos[puntos.length - 1][1];
}

/**
 * @param {object} p
 * @param {{zona:string,signo:string,puntos:[number,number][],original?:[number,number][],
 *          nota?:string,ref?:string}[]} p.series
 * @param {{nombre:string, A:number}[]} [p.elementos]  verticales con su lectura
 */
export function CurvasCyR({ series, elementos = [], titulo, ancho = 620, alto = 420 }) {
  if (!series?.length) return null;

  const vals = series.flatMap(s => [...s.puntos, ...(s.original ?? [])].map(p => p[1]));
  const paso = 0.2;
  const top = Math.floor(Math.min(...vals) / paso) * paso;        // el más negativo
  const bot = Math.ceil(Math.max(...vals) / paso) * paso;         // el más positivo
  const yMin = Math.min(top, -0.2), yMax = Math.max(bot, 0.2);

  const m = { izq: 52, der: 16, arr: 26, aba: 46 };
  const W = ancho - m.izq - m.der, H = alto - m.arr - m.aba;
  // El eje va INVERTIDO: `yMin` —el más negativo— arriba.
  const Y = (g) => m.arr + (g - yMin) / (yMax - yMin) * H;
  const X = (A) => m.izq + (Math.log10(A) - Math.log10(0.1))
    / (Math.log10(100) - Math.log10(0.1)) * W;

  const renglones = [];
  for (let g = yMin; g <= yMax + 1e-9; g += paso) renglones.push(Math.round(g * 10) / 10);

  const poli = (puntos) => {
    // La curva arranca y termina en meseta: se extiende a los bordes del gráfico.
    const pts = [[0.1, puntos[0][1]], ...puntos, [100, puntos[puntos.length - 1][1]]];
    return pts.map(([A, g]) => `${X(Math.min(Math.max(A, 0.1), 100))},${Y(g)}`).join(" ");
  };

  // Las positivas suelen ser la MISMA curva en todas las zonas —la tabla del comentario
  // dice «todas las zonas»—, así que se dibuja una sola y se rotula así. Con parapeto
  // dejan de serlo, y ahí cada una lleva su número.
  const pos = series.filter(s => s.signo === "pos");
  const posUnicas = [...new Map(pos.map(s => [JSON.stringify(s.puntos), s])).values()];
  const posCompartida = posUnicas.length === 1;
  const dibujar = [...series.filter(s => s.signo === "neg"),
    ...(posCompartida ? [posUnicas[0]] : pos)];

  return (
    <Lienzo ancho={ancho} alto={alto} titulo={titulo ?? "Curvas (GC_p) usadas"}>
      {/* grilla */}
      {renglones.map(g => (
        <g key={`h${g}`}>
          <line x1={m.izq} y1={Y(g)} x2={m.izq + W} y2={Y(g)} stroke={c.border}
            strokeWidth={Math.abs(g) < 1e-9 ? 1.1 : 0.6} />
          <text x={m.izq - 6} y={Y(g)} fill={c.txt3} fontSize="9.5" textAnchor="end"
            dominantBaseline="central">{miles(g, 1)}</text>
        </g>
      ))}
      {AREAS_GRILLA.map(A => (
        <g key={`v${A}`}>
          <line x1={X(A)} y1={m.arr} x2={X(A)} y2={m.arr + H} stroke={c.border}
            strokeWidth="0.6" />
          <text x={X(A)} y={m.arr + H + 13} fill={c.txt3} fontSize="9.5"
            textAnchor="middle">{miles(A, A < 1 ? 1 : 0)}</text>
        </g>
      ))}
      <rect x={m.izq} y={m.arr} width={W} height={H} fill="none" stroke={c.txt2}
        strokeWidth="1" />
      <text x={m.izq + W / 2} y={alto - 8} fill={c.txt2} fontSize="10.5"
        textAnchor="middle">Área efectiva de viento, m²</text>
      <text x={13} y={m.arr + H / 2} fill={c.txt2} fontSize="10.5" textAnchor="middle"
        transform={`rotate(-90 13 ${m.arr + H / 2})`}>Coeficiente (GC_p)</text>

      {/* la curva de la figura, cuando una nota la apartó de la usada */}
      {dibujar.filter(s => s.original).map((s, i) => (
        <polyline key={`o${i}`} points={poli(s.original)} fill="none" stroke={c.txt3}
          strokeWidth="1.1" strokeDasharray={TRAZOS} />
      ))}
      {/* la curva usada */}
      {dibujar.map((s, i) => (
        <polyline key={`c${i}`} points={poli(s.puntos)} fill="none" stroke={c.txt}
          strokeWidth="1.5" />
      ))}

      {/* la vertical de cada elemento, con su lectura sobre cada curva */}
      {elementos.map((el, i) => (
        <g key={`e${i}`}>
          <line x1={X(el.A)} y1={m.arr} x2={X(el.A)} y2={m.arr + H} stroke={c.azul}
            strokeWidth="1.1" strokeDasharray="3 3" />
          <Rotulo x={X(el.A)} y={m.arr + 9} texto={`A = ${miles(el.A, 2)} m²`}
            color={c.azul} tam={9.5} />
          {dibujar.map((s, j) => {
            const g = enA(s.puntos, el.A);
            return (
              <g key={j}>
                <circle cx={X(el.A)} cy={Y(g)} r="2.6" fill={c.azul} />
                <Rotulo x={X(el.A) + 30} y={Y(g)} texto={miles(g, 2)} color={c.azul}
                  tam={9.5} />
              </g>
            );
          })}
        </g>
      ))}

      {/* el número de cada zona, sobre su curva, en el extremo izquierdo */}
      {dibujar.map((s, i) => (
        <Zona key={`z${i}`} x={m.izq + 16} y={Y(s.puntos[0][1])}
          texto={s.signo === "pos" && posCompartida ? "+" : etiqueta(s.zona)}
          color={c.txt} r={9} tam={10} />
      ))}
      {posCompartida && (
        <Rotulo x={m.izq + 78} y={Y(posUnicas[0].puntos[0][1])} texto="todas las zonas"
          color={c.txt3} tam={9.5} />
      )}
    </Lienzo>
  );
}
