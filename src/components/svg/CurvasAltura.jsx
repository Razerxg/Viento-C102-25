// RESULTANTES EN LA BASE EN FUNCIÓN DE LA ALTURA DE ALERO.
//
// ── POR QUÉ SON TRES PANELES Y NO UNO CON DOS EJES ──────────────────────────────
// El corte y el levantamiento están en kN y el vuelco en kN·m. Meterlos en un mismo
// gráfico con dos escalas verticales es el error más común de todos: la posición relativa
// de dos curvas con ejes distintos NO significa nada, y sin embargo se lee como si
// significara —«acá el vuelco supera al corte»—, que es una afirmación sin contenido.
// Tres paneles chicos compartiendo el eje horizontal dicen lo mismo sin mentir.
//
// Cada panel tiene UNA sola serie, así que no lleva leyenda: el título la nombra.
//
// ── LO QUE EL GRÁFICO TIENE QUE DEJAR VER ───────────────────────────────────────
// Que las tres NO crecen igual. El corte crece más que proporcionalmente con la altura
// porque q_z también crece; el vuelco se dispara todavía más rápido porque además crece
// el brazo; y el levantamiento casi no se mueve, porque la cubierta no cambia de tamaño.
// Esa diferencia de pendientes es la que permite elegir una altura.
import { Lienzo, Rotulo, Texto, TXT } from './kit.jsx';
import { c as tok } from '../tokens.js';
import { corto } from '../../lib/formato.js';
import { CATEGORICA } from '../../lib/paletaDatos.js';

const nice = (v) => {               // tope de eje redondo, para que la grilla se lea
  if (!(v > 0)) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / e * 2) / 2 * e;
};

function Panel({ datos, campo, titulo, unidad, color, ink, txt, fmt, hActual,
  x, y, ancho, alto }) {
  const vals = datos.map(d => Math.abs(d[campo]));
  const yMax = nice(Math.max(...vals));
  const xMin = datos[0].hAlero, xMax = datos.at(-1).hAlero;
  const px = (h) => x + (h - xMin) / (xMax - xMin || 1) * ancho;
  const py = (v) => y + alto - Math.abs(v) / yMax * alto;

  const d = datos.map((p, i) => `${i ? "L" : "M"}${px(p.hAlero)},${py(p[campo])}`).join(" ");
  // punto de la altura que está cargada en el formulario: ata el gráfico al dato de
  // entrada, y es la etiqueta directa que hace innecesario un tooltip para lo que importa
  const act = datos.reduce((m, p) =>
    Math.abs(p.hAlero - hActual) < Math.abs(m.hAlero - hActual) ? p : m, datos[0]);

  return (
    <g>
      <Rotulo x={x} y={y - 16} texto={`${titulo} · ${unidad}`} color={txt} tam={11}
        peso={600} ancla="start" />
      {/* grilla recesiva: tres líneas, no una reja */}
      {[0, 0.5, 1].map(f => (
        <g key={f}>
          <line x1={x} y1={y + alto * (1 - f)} x2={x + ancho} y2={y + alto * (1 - f)}
            stroke={ink} strokeWidth="0.5" opacity={f === 0 ? 0.55 : 0.18} />
          <Texto x={x - 7} y={y + alto * (1 - f)} texto={f === 0 ? "0" : fmt(yMax * f)}
            color={ink} tam={TXT.min} ancla="end" />
        </g>
      ))}
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {/* guía en la altura actual, con su valor escrito */}
      <line x1={px(act.hAlero)} y1={y} x2={px(act.hAlero)} y2={y + alto}
        stroke={ink} strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
      <circle cx={px(act.hAlero)} cy={py(act[campo])} r="4.5" fill={color}
        stroke="var(--sup)" strokeWidth="2" />
      <Rotulo x={px(act.hAlero) + (act.hAlero > (xMin + xMax) / 2 ? -8 : 8)}
        y={py(act[campo]) - 12} texto={fmt(Math.abs(act[campo]))} color={txt} tam={10}
        peso={600} ancla={act.hAlero > (xMin + xMax) / 2 ? "end" : "start"} />
    </g>
  );
}

export function CurvasAltura({ datos, hActual, fmt, tema = "claro", ancho = 620, alto = 560 }) {
  const ink = tok.txt2;
  const txt = tok.txt;
  const col = CATEGORICA[tema] ?? CATEGORICA.claro;
  const mIzq = 56, mDer = 22, mSup = 34, sep = 52;
  const hPanel = (alto - mSup - sep * 2 - 40) / 3;
  const anchoP = ancho - mIzq - mDer;
  const xMin = datos[0].hAlero, xMax = datos.at(-1).hAlero;

  const paneles = [
    ["cortante", "Corte total en la base", "kN", 0],
    ["levantamiento", "Levantamiento total", "kN", 1],
    ["vuelco", "Momento de vuelco", "kN·m", 2],
  ];

  return (
    <Lienzo ancho={ancho} alto={alto} titulo="Resultantes en función de la altura de alero">
      {paneles.map(([campo, titulo, unidad, i]) => (
        <Panel key={campo} datos={datos} campo={campo} titulo={titulo} unidad={unidad}
          color={col[i]} ink={ink} txt={txt} fmt={fmt} hActual={hActual}
          x={mIzq} y={mSup + i * (hPanel + sep)} ancho={anchoP} alto={hPanel} />
      ))}
      {/* un solo eje horizontal, compartido: es lo que hace comparables los tres paneles */}
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const h = xMin + (xMax - xMin) * f;
        return <Texto key={f} x={mIzq + anchoP * f} y={alto - 24} texto={corto(h, 0)}
          color={ink} tam={TXT.min} />;
      })}
      <Texto x={mIzq + anchoP / 2} y={alto - 8} color={txt} tam={TXT.min}
        texto="altura de alero (m) — envolvente de las cuatro direcciones" />
    </Lienzo>
  );
}
