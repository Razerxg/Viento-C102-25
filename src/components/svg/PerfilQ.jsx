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
  // sólo la separación vertical se colaba el caso feo —«1,37 hasta z = 5», que es largo,
  // debajo de un «1,58» corrido más a la derecha— porque sus `y` distan lo suficiente y sus
  // cajas igual se tocan.
  //
  // ⚠ LA CAJA CRECE HACIA LA IZQUIERDA, porque los rótulos van anclados por su final: se
  // escriben a la izquierda de la punta del diagrama, que es el único lado libre. Con la
  // caja creciendo a la derecha —como cuando el diagrama estaba del otro lado— se reservaba
  // un lugar que el texto no ocupa y se dejaba libre el que sí.
  const caja = (i) => {
    const x = xDe(tramos[i]), y = yDe(tramos[i]);
    return { x1: x - anchoDe(tramos[i]), x2: x, y1: y - alturaTexto / 2, y2: y + alturaTexto / 2 };
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
  // ⚠ EL TEXTO SE ACORTÓ AL PASAR EL DIAGRAMA DE LADO. Decía «1,79 constante hasta
  // z = 4,76» y ahora el rótulo vive en el margen izquierdo, que es angosto: la palabra
  // «constante» la dice el dibujo —un escalón que no escalona— y el «hasta z» es lo que no
  // se puede deducir mirando, así que es lo que se conserva.
  const textoDe = (t) => (t.n > 1 ? `${fq(t.q)} hasta z = ${fm(t.hasta)}` : fq(t.q));
  const anchoDe = (t) => anchoEnLienzo(textoDe(t), TXT.min, k);
  const visibles = new Set(losQueEntran(tramos, yDe, TXT.min * 1.5 * k, anchoDe, xDe));
  return (
    <g>
      {tramos.map((t, i) => (visibles.has(i) ? (
        <Rotulo key={i} x={xDe(t)} y={yDe(t)} ancla="end" color={c.txt} tam={TXT.min}
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

  // ── EL DIBUJO ES UN MURO ESBELTO CON SU DIAGRAMA AL LADO ─────────────────────
  //
  // ⚠ ANTES ERAN DOS BLOQUES DEL MISMO ANCHO Y SE LEÍAN COMO DOS EDIFICIOS. El edificio
  // ocupaba de −0,75 a −0,03 y el diagrama de 0 a 1: dos rectángulos altos, pegados, de
  // ancho parecido y con el mismo aspecto. Y en un edificio bajo —donde todo el perfil cae
  // por debajo de z_mín y q es constante— el «escalonado» es UN escalón, así que el
  // diagrama tampoco se distinguía de una caja. El croquis no mostraba un perfil de
  // presiones: mostraba dos cajas.
  //
  // Ahora es el idioma con el que se dibuja una reacción de suelo: la superficie cargada
  // como un elemento DELGADO, el diagrama como un contorno cerrado con relleno tenue, y
  // FLECHAS escaladas con el valor local apuntando contra la cara. La flecha es lo que
  // convierte un rectángulo en una presión: dice que empuja, y hacia dónde.
  const yTop = 34;
  // ⚠ EL TOPE ES EL DEL PERFIL, NO LA ALTURA MEDIA. El perfil de q(z) se tabula hasta el
  // punto MÁS ALTO del edificio, y `geo.h` es la altura MEDIA de cubierta: en un dos aguas
  // de 35° la cumbrera queda un metro y medio por encima de `1,12·h`, así que los últimos
  // tramos se dibujaban fuera del lienzo —con su rótulo encima del título— y nadie lo veía
  // porque el SVG recorta sin avisar.
  const zTope = Math.max(geo.h, perfil.at(-1)?.hasta ?? geo.h);

  // ── EL EJE HORIZONTAL NO ESTÁ EN METROS, PERO SE MIDE EN METROS ──────────────
  //
  // ⚠ ES LO QUE APLASTABA EL CROQUIS. `mkView` toma UNA escala para los dos ejes —el menor
  // de los dos factores— porque en todos los demás croquis los dos ejes son longitudes. Acá
  // el horizontal es `q` normalizado, y estaba expresado en unidades de 0 a 1: contra una
  // altura de tres metros, el dibujo entero medía dos unidades de ancho por tres de alto y
  // se encogía a una columna angosta en el medio de una lámina de mil píxeles.
  //
  // La salida no es darle a este croquis una escala por eje —eso rompería `data-escala`, que
  // es lo que el control compara entre vistas del mismo edificio— sino EXPRESAR EL LARGO DEL
  // DIAGRAMA EN METROS: el diagrama más largo mide lo que el edificio es alto. Así la
  // proporción del dibujo no depende de la altura, la escala declarada sigue siendo la
  // vertical —que es la única que está en metros de verdad— y la lámina se llena.
  // ⚠ EL LARGO SE ELIGE, NO SALE DE NINGÚN CÁLCULO: el eje horizontal no representa una
  // longitud, así que 0,65 es una proporción de dibujo. Arrancó en 1,0 —el diagrama tan largo
  // como alto el edificio— y a esa proporción el diagrama dominaba la lámina y el muro parecía
  // un detalle al costado. A 0,65 el muro conserva el mismo tamaño en pantalla —la escala no
  // cambia, porque la manda el alto— y el diagrama deja de pesar más que la superficie que
  // carga.
  const LARGO_DIAG = zTope * 0.65;     // el diagrama de q = qMax, en metros
  const ANCHO_MURO = zTope * 0.06;
  const MARGEN_ROTULOS = zTope * 0.70; // a la izquierda: los rótulos de cada tramo
  const MARGEN_COTA = zTope * 0.30;    // a la derecha: la cota de `h`
  // El muro va a la DERECHA y el diagrama crece hacia la izquierda, porque el viento viene
  // de la izquierda y las flechas tienen que apuntar contra la cara.
  const xCara = 0;
  const largo = (q) => (q / qMax) * LARGO_DIAG;
  const xIzq = -LARGO_DIAG - MARGEN_ROTULOS;
  const xDer = ANCHO_MURO + MARGEN_COTA;

  const v0 = mkView({ ancho, alto: alto - yTop, xMin: xIzq, xMax: xDer,
    yMin: 0, yMax: zTope * 1.06, margen: 46, escalaFija: escala });
  const v = { ...v0, y: (u) => v0.y(u) + yTop };

  const yDe = (t) => v.y((t.desde + t.hasta) / 2);
  const xPunta = (q) => v.x(xCara - largo(q));

  // ── EL CONTORNO DEL DIAGRAMA, COMO POLIGONAL CERRADA ─────────────────────────
  // Se recorre el perfil de abajo hacia arriba por la punta de cada escalón y se vuelve por
  // la cara del muro. Es una sola figura: con un rectángulo por tramo, los bordes internos
  // dibujaban líneas donde el valor no cambia y el escalonado parecía tener más peldaños de
  // los que tiene.
  const contorno = [
    `${v.x(xCara)},${v.y(0)}`,
    ...perfil.flatMap(t => [
      `${xPunta(t.q)},${v.y(t.desde)}`,
      `${xPunta(t.q)},${v.y(t.hasta)}`,
    ]),
    `${v.x(xCara)},${v.y(perfil.at(-1)?.hasta ?? zTope)}`,
  ].join(" ");

  // Una flecha por TRAMO tabulado y no por grupo: son las que dan la textura de diagrama de
  // presión. En un perfil de diez tramos iguales, diez flechas del mismo largo dicen
  // «constante» mejor que cualquier rótulo.
  const flechas = perfil.filter(t => t.hasta - t.desde > 1e-9);

  return (
    <Lienzo ancho={ancho} alto={alto} titulo="Perfil de presión dinámica en altura"
      escala={v.esc} edificio="perfil-q" unidades="Cotas en m · presiones en kN/m²"
      zoom={zoom} setZoom={setZoom}>
      {/* terreno */}
      <line x1={v.x(xIzq)} y1={v.y(0)} x2={v.x(xDer)} y2={v.y(0)}
        stroke={c.txt2} strokeWidth="1.5" />
      {[...Array(16)].map((_, i) => {
        const x = v.x(xIzq) + i * (v.x(xDer) - v.x(xIzq)) / 15;
        return <line key={i} x1={x} y1={v.y(0)} x2={x - 6} y2={v.y(0) + 7} stroke={c.txt2}
          strokeWidth="0.7" opacity="0.5" />;
      })}

      {/* EL MURO A BARLOVENTO, delgado. No es el edificio: es la cara que recibe q(z), y
          dibujarla del ancho de un muro es lo que evita que se lea como un segundo cuerpo.
          ⚠ VA HACHURADO. Con relleno liso y del mismo tono suave que el diagrama, a este
          ancho el muro se leía como una línea más del dibujo. El hachurado es lo que dice
          «esto es el sólido y aquello la carga» sin necesidad de rotularlo. */}
      <g>
        <rect x={v.x(xCara)} y={v.y(zTope)} width={v.l(ANCHO_MURO)} height={v.l(zTope)}
          fill={c.hover} stroke={c.txt2} strokeWidth="1.5" />
        {(() => {
          // Las rayas van a 45° y con paso constante en PÍXELES de lienzo, no en metros: un
          // hachurado cuyo paso escale con el edificio se vuelve un borrón en un galpón alto
          // y dos rayas sueltas en un shelter.
          const x0 = v.x(xCara), x1 = v.x(xCara) + v.l(ANCHO_MURO);
          const yBase = v.y(0), yAlto = v.y(zTope);
          const w = x1 - x0, h = yBase - yAlto;
          const paso = 9;
          const n = Math.ceil((w + h) / paso);
          return [...Array(n)].map((_, i) => {
            // Cada raya sube a 45° desde el borde inferior; se recorta al rectángulo.
            const d = i * paso;
            const ax = x0 + Math.max(0, d - h), ay = yBase - Math.min(d, h);
            const bx = x0 + Math.min(d, w), by = yBase - Math.max(0, d - w);
            if (bx <= ax) return null;
            return <line key={i} x1={ax} y1={ay} x2={bx} y2={by} stroke={c.txt2}
              strokeWidth="0.6" opacity="0.55" />;
          });
        })()}
      </g>

      {/* EL DIAGRAMA: contorno cerrado con relleno tenue */}
      <polygon points={contorno} fill={c.azulBg2} stroke={c.azul} strokeWidth="1.3"
        strokeLinejoin="round" />

      {/* LAS FLECHAS, escaladas con el valor local y apuntando contra la cara */}
      {flechas.map((t, i) => (
        <Flecha key={i} x1={xPunta(t.q)} y1={yDe(t)} x2={v.x(xCara) - 2} y2={yDe(t)}
          color={c.azul} grosor={1.2} cabeza={5} />
      ))}

      {/* …y un rótulo por GRUPO de tramos con el mismo valor, si entra. Van a la IZQUIERDA
          de la punta del diagrama, que es el único lado donde no compite con nada: el muro
          está a la derecha y la cota de `h` más a la derecha todavía. */}
      <RotulosDeQ tramos={tramos} yDe={yDe} xDe={(t) => xPunta(t.q) - 8} />

      {/* La cota de la altura, del lado seco del muro. */}
      <Dim x1={v.x(ANCHO_MURO + MARGEN_COTA * 0.5)} y1={v.y(0)}
        x2={v.x(ANCHO_MURO + MARGEN_COTA * 0.5)} y2={v.y(geo.h)}
        simbolo="h" valor={geo.h} desplaz={0} color={c.txt2} />

      {/* ⚠ `q_h` SE MARCA SOBRE EL DIAGRAMA Y NO AL LADO DEL MURO. Estaba anclado al borde
          del diagrama a la altura `h`, o sea justo encima de la cota de `h`, y la línea de
          cota lo tachaba: en el teléfono se leía «q̶_̶h̶ ̶=̶ ̶1̶,̶7̶9̶». Acá va con su propia
          línea de referencia, del lado del diagrama. */}
      <line x1={xPunta(qMax) - 30} y1={v.y(geo.h)} x2={v.x(xCara)} y2={v.y(geo.h)}
        stroke={c.txt} strokeWidth="1" strokeDasharray="5 3" />
      <Rotulo x={xPunta(qMax) - 34} y={v.y(geo.h)} texto={`q_h = ${fq(analisis.qh)}`}
        color={c.txt} ancla="end" tam={TXT.min} peso={600} />

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
    </Lienzo>
  );
}
