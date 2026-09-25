// PRIMITIVAS COMPARTIDAS DE LOS CROQUIS.
//
// Todo croquis de esta app se arma con estas piezas. Tenerlas en un solo lugar no es para
// ahorrar líneas: es para que las cotas, las flechas y los rótulos se vean IGUAL en los
// cuatro dibujos. Cuando cada croquis define su propia cota, terminan con tres tamaños de
// letra y dos grosores de línea, y el conjunto se lee como tres documentos distintos.

// ── VISTA: DEL MODELO A LA PANTALLA ─────────────────────────────────────────────
//
// ⚠ INVIERTE EL EJE Y. En el modelo +y es HACIA ARRIBA —es una altura— y en SVG +y va
// hacia abajo. Si no se resuelve acá, cada croquis lo resuelve por su cuenta y alguno
// queda dado vuelta. Rotular los ejes teniendo esto presente.
export function mkView({ ancho, alto, xMin, xMax, yMin, yMax, margen = 40 }) {
  const w = Math.max(1e-9, xMax - xMin), h = Math.max(1e-9, yMax - yMin);
  const esc = Math.min((ancho - 2 * margen) / w, (alto - 2 * margen) / h);
  const dx = (ancho - w * esc) / 2 - xMin * esc;
  const dy = (alto - h * esc) / 2 + yMax * esc;
  return { esc, x: (mx) => mx * esc + dx, y: (my) => dy - my * esc, l: (m) => m * esc };
}

// ── COTA ────────────────────────────────────────────────────────────────────────
// La etiqueta lleva FONDO OPACO a propósito: por detrás pasan líneas de eje y contornos
// del edificio, y sin el fondo el número queda ilegible justo donde hace falta.
export function Dim({ x1, y1, x2, y2, texto, desplaz = 0, color = "#52514e", tam = 11 }) {
  const dx = x2 - x1, dy = y2 - y1;
  const n = Math.hypot(dx, dy) || 1;
  const ox = -dy / n * desplaz, oy = dx / n * desplaz;
  const [ax, ay, bx, by] = [x1 + ox, y1 + oy, x2 + ox, y2 + oy];
  const [mx, my] = [(ax + bx) / 2, (ay + by) / 2];
  const ancho = String(texto).length * tam * 0.58 + 8;
  return (
    <g>
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke={color} strokeWidth="1" />
      <line x1={x1} y1={y1} x2={ax} y2={ay} stroke={color} strokeWidth="0.5" opacity="0.6" />
      <line x1={x2} y1={y2} x2={bx} y2={by} stroke={color} strokeWidth="0.5" opacity="0.6" />
      {[[ax, ay], [bx, by]].map(([px, py], i) => <circle key={i} cx={px} cy={py} r="1.8" fill={color} />)}
      <rect x={mx - ancho / 2} y={my - tam * 0.72} width={ancho} height={tam * 1.35}
        fill="var(--sup)" rx="2" />
      <text x={mx} y={my} fill={color} fontSize={tam} textAnchor="middle"
        dominantBaseline="central">{texto}</text>
    </g>
  );
}

// ── FLECHA ──────────────────────────────────────────────────────────────────────
// El largo es proporcional al valor, así que dos flechas comparables se comparan mirando.
export function Flecha({ x1, y1, x2, y2, color = "#52514e", grosor = 2, cabeza = 7 }) {
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

// Rótulo con fondo opaco, para todo lo que cae encima de un dibujo.
export function Rotulo({ x, y, texto, color = "#0b0b0b", tam = 11, peso = 400, ancla = "middle" }) {
  const w = String(texto).length * tam * 0.58 + 8;
  const ox = ancla === "start" ? 0 : ancla === "end" ? -w : -w / 2;
  return (
    <g>
      <rect x={x + ox} y={y - tam * 0.72} width={w} height={tam * 1.35} fill="var(--sup)"
        opacity="0.93" rx="2" />
      <text x={x} y={y} fill={color} fontSize={tam} fontWeight={peso} textAnchor={ancla}
        dominantBaseline="central">{texto}</text>
    </g>
  );
}

// `viewBox` fijo y ancho fluido: el croquis escala con la columna sin rehacer cuentas.
export function Lienzo({ ancho, alto, children, titulo }) {
  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} width="100%"
      style={{ display: "block", maxHeight: alto }} role="img" aria-label={titulo}>
      {titulo ? <title>{titulo}</title> : null}
      {children}
    </svg>
  );
}

// ── LEYENDA DE LA ESCALA DE PRESIÓN ─────────────────────────────────────────────
// Va SIEMPRE que haya una cara coloreada. Sin leyenda el color es decoración: nadie puede
// saber si un azul intenso son 400 N/m² o 4000.
export function LeyendaPresion({ x, y, ancho, tramos, fmt, color = "#52514e" }) {
  const w = ancho / tramos.length;
  return (
    <g>
      {tramos.map((t, i) => (
        <rect key={i} x={x + i * w} y={y} width={w - 2} height={12} fill={t.color}
          stroke={color} strokeWidth="0.5" />
      ))}
      <text x={x} y={y + 25} fontSize="10" fill={color} textAnchor="start">
        succión {fmt(tramos[0].desde)}
      </text>
      <text x={x + ancho / 2} y={y + 25} fontSize="10" fill={color} textAnchor="middle">0</text>
      <text x={x + ancho} y={y + 25} fontSize="10" fill={color} textAnchor="end">
        presión {fmt(tramos.at(-1).hasta)}
      </text>
    </g>
  );
}
