// CROQUIS 1 — PERFIL DE PRESIÓN DINÁMICA EN ALTURA.
//
// Es el croquis que delata de un vistazo una exposición o una altura mal cargadas: el
// escalonado de q(z) es la firma de la categoría de exposición, y si el edificio no llega
// a los 5 m se ve un solo escalón, que es exactamente lo que dice el reglamento.
//
// La pared a barlovento es la ÚNICA superficie con q variable. Dibujarla escalonada al
// lado del edificio deja ver por qué: el resto del edificio recibe una presión constante.
//
// ── LOS TRAMOS CON EL MISMO q SE AGRUPAN EN UNO ─────────────────────────────────
// ⚠ Por debajo de z_mín el reglamento fija q constante, así que en un edificio bajo TODOS
// los tramos valen lo mismo. El croquis rotulaba cada uno: diez renglones idénticos que
// decían «1793 N/m²», con los dos últimos encimados contra la línea del terreno. Diez
// veces el mismo número no es más información que una, y ocupa diez veces el lugar. Ahora
// los tramos consecutivos de igual q llevan UN rótulo, que además dice hasta dónde llega.
import { mkView, Dim, Rotulo, Lienzo, Flecha, TXT, useEscalaTexto,
  anchoEnLienzo } from './kit.jsx';
import { q as fq, m as fm } from './formatoCroquis.js';
import { c } from '../tokens.js';

/**
 * Tramos consecutivos que se ESCRIBEN igual, en uno solo.
 *
 * ⚠ SE AGRUPA POR EL TEXTO, NO POR EL VALOR. Dos tramos que difieren en el cuarto dígito
 * se rotulan los dos «1,58 kN/m²»: como números son distintos y como rótulos son el mismo,
 * y lo que el croquis muestra es el rótulo. Comparando valores quedaban dos etiquetas
 * idénticas, encimadas, con la diferencia escondida en un decimal que no se imprime.
 */
function agrupar(perfil) {
  const salida = [];
  for (const t of perfil) {
    const u = salida[salida.length - 1];
    if (u && fq(u.q) === fq(t.q)) { u.hasta = t.hasta; u.n++; continue; }
    salida.push({ ...t, n: 1 });
  }
  return salida;
}

/**
 * Los rótulos que ENTRAN, de abajo hacia arriba.
 *
 * Con h = 6 m y diez tramos, el perfil tiene diez valores distintos separados por menos
 * de lo que mide una línea de texto: el control automático contó 492 solapes, casi todos
 * acá. No se achica la letra —el mínimo es 11 px y es innegociable— ni se inventa un
 * escalonado: se rotulan los que caben, empezando por los extremos, que son los que fijan
 * el perfil. Los demás valores están en la tabla de presiones, completos.
 */
function losQueEntran(tramos, yDe, alturaTexto, anchoDe, xDe) {
  if (tramos.length <= 2) return tramos.map((_, i) => i);
  // Cada rótulo reserva su caja: alto de un renglón y el ancho que mide su texto. Mirando
  // sólo la separación vertical se colaba el caso feo —«1,37 constante hasta z = 5», que
  // es largo, debajo de un «1,58» corrido más a la derecha— porque sus `y` distan lo
  // suficiente y sus cajas igual se tocan.
  const caja = (i) => {
    const x = xDe(tramos[i]), y = yDe(tramos[i]);
    return { x1: x, x2: x + anchoDe(tramos[i]), y1: y - alturaTexto / 2, y2: y + alturaTexto / 2 };
  };
  const choca = (a, b) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
  const puestos = [0, tramos.length - 1];
  const cajas = [caja(0), caja(tramos.length - 1)];
  for (let i = 1; i < tramos.length - 1; i++) {
    const c = caja(i);
    if (cajas.some(o => choca(c, o))) continue;
    puestos.push(i);
    cajas.push(c);
  }
  return puestos.sort((a, b) => a - b);
}

/**
 * Los rótulos del escalonado.
 *
 * ⚠ ES UN COMPONENTE APARTE PORQUE `useEscalaTexto` SÓLO VALE DENTRO DE `Lienzo`. El
 * `Lienzo` es el que mide el dibujo renderizado y publica `k`; quien lo renderiza está
 * FUERA de su contexto y leería el valor por defecto, 1, que es justamente el caso en el
 * que el cálculo de cuántos rótulos entran daría de más.
 */
function RotulosDeQ({ tramos, yDe, xDe }) {
  const k = useEscalaTexto();
  const textoDe = (t) => (t.n > 1 ? `${fq(t.q)} constante hasta z = ${fm(t.hasta)}` : fq(t.q));
  const anchoDe = (t) => anchoEnLienzo(textoDe(t), TXT.min, k);
  const visibles = new Set(losQueEntran(tramos, yDe, TXT.min * 1.5 * k, anchoDe, xDe));
  return (
    <g>
      {tramos.map((t, i) => (visibles.has(i) ? (
        <Rotulo key={i} x={xDe(t)} y={yDe(t)} ancla="start" color={c.txt} tam={TXT.min}
          texto={textoDe(t)} />
      ) : null))}
    </g>
  );
}

export function PerfilQ({ analisis, ancho = 620, alto = 380, escala,
  zoom = 1, setZoom }) {
  const { perfil, geo } = analisis;
  const qMax = Math.max(...perfil.map(t => t.q), 1);
  const tramos = agrupar(perfil);

  // El ancho del diagrama ocupa media lámina; la otra media es el edificio. El eje
  // horizontal es `q` NORMALIZADO, no una longitud: la escala que se declara —y que el
  // control compara contra las otras vistas— es la vertical, que sí está en metros.
  // ⚠ EL DIBUJO ARRANCA DEBAJO DEL TÍTULO, no en el borde del lienzo. Con el título
  // dentro del área de dibujo, el rótulo del tramo superior le quedaba encima en cuanto
  // el edificio llenaba la lámina —y el edificio la llena siempre, porque este croquis ya
  // no comparte escala con la planta—.
  const yTop = 34;
  const anchoDiag = 1.0;
  // ⚠ EL TOPE ES EL DEL PERFIL, NO LA ALTURA MEDIA. El perfil de q(z) se tabula hasta el
  // punto MÁS ALTO del edificio, y `geo.h` es la altura MEDIA de cubierta: en un dos aguas
  // de 35° la cumbrera queda un metro y medio por encima de `1,12·h`, así que los últimos
  // tramos se dibujaban fuera del lienzo —con su rótulo encima del título— y nadie lo veía
  // porque el SVG recorta sin avisar.
  const zTope = Math.max(geo.h, perfil.at(-1)?.hasta ?? geo.h);
  const v0 = mkView({ ancho, alto: alto - yTop, xMin: -0.9, xMax: anchoDiag + 0.35,
    yMin: 0, yMax: zTope * 1.08, margen: 46, escalaFija: escala });
  const v = { ...v0, y: (u) => v0.y(u) + yTop };

  const yDe = (t) => v.y((t.desde + t.hasta) / 2);

  return (
    <Lienzo ancho={ancho} alto={alto} titulo="Perfil de presión dinámica en altura"
      escala={v.esc} edificio="perfil-q" unidades="Cotas en m · presiones en kN/m²"
      zoom={zoom} setZoom={setZoom}>
      {/* terreno */}
      <line x1={v.x(-0.9)} y1={v.y(0)} x2={v.x(anchoDiag + 0.35)} y2={v.y(0)}
        stroke={c.txt2} strokeWidth="1.5" />
      {[...Array(14)].map((_, i) => {
        const x = v.x(-0.9) + i * (v.x(anchoDiag + 0.35) - v.x(-0.9)) / 13;
        return <line key={i} x1={x} y1={v.y(0)} x2={x - 6} y2={v.y(0) + 7} stroke={c.txt2}
          strokeWidth="0.7" opacity="0.5" />;
      })}

      {/* el edificio, de canto */}
      <rect x={v.x(-0.75)} y={v.y(geo.h)} width={v.l(0.72)} height={v.l(geo.h)}
        fill={c.hover} stroke={c.txt2} strokeWidth="1.5" />
      <Dim x1={v.x(-0.79)} y1={v.y(0)} x2={v.x(-0.79)} y2={v.y(geo.h)}
        texto={`h = ${fm(geo.h)}`} desplaz={-20} color={c.txt2} />

      {/* el escalonado de q(z): un rectángulo por tramo del reglamento… */}
      {perfil.map((t, i) => (
        <rect key={i} x={v.x(0)} y={v.y(t.hasta)} width={v.l(t.q / qMax * anchoDiag)}
          height={v.l(t.hasta - t.desde)} fill={c.azulBg2} stroke={c.azul}
          strokeWidth="1.2" />
      ))}
      {/* …y un rótulo por GRUPO de tramos con el mismo valor, si entra. */}
      <RotulosDeQ tramos={tramos} yDe={yDe}
        xDe={(t) => v.x(t.q / qMax * anchoDiag) + 8} />

      {/* flechas de viento, del lado de barlovento: una por grupo, no una por tramo */}
      {tramos.map((t, i) => {
        const y = yDe(t);
        return <Flecha key={i} x1={v.x(-0.02) - v.l(t.q / qMax * anchoDiag) - 26} y1={y}
          x2={v.x(-0.02) - v.l(t.q / qMax * anchoDiag) - 6} y2={y} color={c.azul}
          grosor={1.5} cabeza={5} />;
      })}

      {/* ⚠ ACÁ IBA `dir.label` DONDE DEBÍA IR LA EXPOSICIÓN: el rótulo decía «q(z) —
          exposición Viento según +X». Este croquis existe justamente para delatar una
          exposición mal cargada —el escalonado es su firma— y era el único dato que no
          mostraba. */}
      {/* ⚠ EL TÍTULO VA ARRIBA DEL LIENZO, NO ARRIBA DEL EDIFICIO. Colgado del tope del
          dibujo se movía con la altura del edificio, y en un galpón alto el rótulo del
          tramo superior le quedaba encima. Los otros croquis ya lo ponen en el margen. */}
      <Rotulo x={ancho / 2} y={15}
        texto={`q(z) — exposición ${analisis.sitio?.exposicion ?? "—"} · ${analisis.dir.label}`}
        color={c.txt} tam={TXT.titulo} peso={600} />
      {/* la cota del tope deja ver que el perfil cierra EN h y no en la última altura tabulada */}
      <Rotulo x={v.x(0) - 10} y={v.y(geo.h)} texto={`q_h = ${fq(analisis.qh)}`}
        color={c.txt} ancla="end" tam={TXT.min} />
    </Lienzo>
  );
}
