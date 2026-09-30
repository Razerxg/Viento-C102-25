// CROQUIS 4 — VISTA 3D DEL EDIFICIO, EN DOS MODOS.
//
// La cámara, el arrastre, el zoom y las vistas ortogonales están portados de la app de
// bases (`lib/camara3d.js` y `lib/orbita.js`): las dos aplicaciones se usan una al lado de
// la otra, y una escena que se gira distinto o que no trae las mismas vistas hace que se
// sientan como dos programas ajenos.
//
// Lo que aporta esta app es la MALLA: el edificio con su cubierta real —plana, un agua o
// caballete, con los tímpanos como pentágonos, con voladizo y con el alero adosado del
// art. 5.9— en vez de un prisma de tapa plana.
//
// ── DOS MODOS, PORQUE SON DOS REPARTOS DISTINTOS SOBRE EL MISMO VOLUMEN ─────────
//
//   · SPRFV (capítulo 2): una presión por CARA, y sobre la cubierta las FRANJAS de la
//     Fig. 2.4-1 cuando la dirección se resuelve así —viento paralelo a la cumbrera, o
//     θ < 10°—. Antes la cubierta se pintaba de un solo color con el valor de la franja más
//     exigida: el croquis decía que toda la cubierta tenía la succión del borde de
//     barlovento, que es cuatro veces la del fondo en una nave larga.
//   · C&R (capítulo 5): las ZONAS. 1'/1/2/3 sobre la cubierta, 4/5 sobre las paredes, el
//     voladizo con su composición del art. 5.7 y el alero adosado con sus figuras 5.9.
//
// ⚠ EL MODO C&R PINTA LA PRESIÓN DE UN ELEMENTO, NO «LA DE LA ZONA». No existe «la presión
// de la zona 3»: el (GC_p) es función del ÁREA EFECTIVA DE VIENTO, y en la zona 3 de la
// Fig. 5.3-2A va de −3,2 a −1,4 entre 1 y 50 m². Así que el croquis colorea con el área de
// UN elemento de la lista, se elige cuál, y el título lo dice. Es lo que hace que el color
// del volumen y el número de la tabla salgan del mismo lugar.
//
// ── LAS FRANJAS Y LAS ZONAS SE RECORTAN, NO SE PINTAN ENCIMA ────────────────────
// `lib/subdividir3d.js` corta cada cara por semiplanos verticales. La alternativa —dibujar
// la cara entera y superponerle rectángulos de planta— no funciona en 3D: un rectángulo
// proyectado no coincide con el pedazo de faldón que tapa, y se corre tanto más cuanto mayor
// es la pendiente. Recortado, cada pedazo ES parte de la cara: comparte vértices, normal y
// sombreado.
//
// Cuatro cosas que vienen del enfoque de bases:
//  · ENCUADRE AUTOMÁTICO: la vista se reajusta al girar, así la pieza no se sale del cuadro.
//  · VISTAS ORTOGONALES EN ÁNGULO EXACTO. Un frente con pitch 8° sigue mostrando un pedazo
//    de la tapa, que es justo lo que una elevación no debe mostrar.
//  · ZOOM con la rueda.
//  · CAPTURA DE PUNTERO con `touchAction: none` y `userSelect: none`: sin eso el dedo hace
//    scroll de la página en vez de girar, y arrastrar con el mouse selecciona los rótulos.
import { useMemo, useState } from 'react';
import { Lienzo, Rotulo, LeyendaPresion, TXT, useEscalaTexto,
  anchoEnLienzo } from './kit.jsx';
import { q as fq, coef, m as fm, nombreFranja } from './formatoCroquis.js';
import { c as tok } from '../tokens.js';
import { SOMBRA } from '../../lib/paletaDatos.js';
import { colorPresion, tramosLeyenda } from '../../lib/escalaPresion.js';
import { mallaEdificio, visiblesDe } from '../../lib/volumen3d.js';
import { porFranjas, porCeldas, unirFilas } from '../../lib/subdividir3d.js';
import { celdasDeZona, franjasDePared } from '../../engine/cyrZonas.js';
import { presionesPorZona } from '../../engine/cyrPresiones.js';
import { DESTINO, CARA } from '../../constants/aleroAdosado.js';
import { camara, encuadre } from '../../lib/camara3d.js';
import { useOrbita, VISTAS } from '../../lib/orbita.js';

// Sombreado por orientación: da volumen sin falsear el color de la presión, porque va como
// una capa gris encima y no alterando el tono.
const sombra = (n, luz = [0.35, -0.45, 0.82]) =>
  Math.max(0, 1 - (n[0] * luz[0] + n[1] * luz[1] + n[2] * luz[2])) * 0.15;

/** Los dos repartos que se pueden mirar sobre el mismo volumen. */
export const MODOS_3D = /** @type {const} */ (["sprfv", "cyr"]);
const ETIQUETA_MODO = { sprfv: "SPRFV — cap. 2", cyr: "C&R — cap. 5" };

/** Un número muy grande, para extender el primer y el último corte más allá del dibujo. */
const LEJOS = 1e6;

/**
 * Los rótulos de las piezas.
 *
 * ⚠ COMPONENTE APARTE PORQUE MIDE EL TEXTO, Y MEDIRLO EXIGE `k`, QUE SÓLO EXISTE DENTRO
 * DE `Lienzo`. Es la misma razón por la que el perfil de q(z) elige sus rótulos en un
 * hijo: quien renderiza el `Lienzo` está fuera de su contexto y leería el factor por
 * defecto, que es el caso en el que la cuenta de qué entra da de más.
 */
function RotulosDeCara({ piezas, px, color }) {
  const k = useEscalaTexto();
  const alto1 = TXT.min * 1.45 * k;          // alto de un renglón, en unidades de viewBox

  // ── UN RÓTULO POR VALOR, Y NO UNO POR PIEZA ─────────────────────────────────
  // ⚠ DOS PIEZAS QUE DICEN LO MISMO SE ROTULAN UNA VEZ. Con el viento paralelo a la cumbrera
  // los dos faldones se tratan como franjas y los dos dicen lo mismo, porque el análisis no
  // los distingue; en el modo C&R, la zona 3 aparece en las cuatro esquinas. Rotuladas todas,
  // en un edificio escorzado el nombre de una cae sobre el valor de otra —lo encontró el
  // control con el edificio de 24 m— y, aun sin encimarse, cuatro veces el mismo número no es
  // más información que una.
  //
  // Se rotula la de mayor área PROYECTADA, que es la que tiene lugar para el texto.
  const caja = (c) => {
    const q = c.proy.map(px);
    const x = q.map(u => u[0]), y = q.map(u => u[1]);
    return { x1: Math.min(...x), x2: Math.max(...x), y1: Math.min(...y), y2: Math.max(...y),
      cx: (Math.min(...x) + Math.max(...x)) / 2, cy: (Math.min(...y) + Math.max(...y)) / 2 };
  };
  const cajas = new Map(piezas.map(c => [c, caja(c)]));
  const area = (c) => {
    const b = cajas.get(c);
    return (b.x2 - b.x1) * (b.y2 - b.y1);
  };

  const elegida = new Map();
  for (const c of piezas) {
    const kk = `${c.rot}|${c.sinValor ? "" : fq(c.p)}`;
    const previa = elegida.get(kk);
    if (!previa || area(c) > area(previa)) elegida.set(kk, c);
  }

  // ── LOS RÓTULOS SE MIRAN ENTRE SÍ ───────────────────────────────────────────
  // ⚠ NO ALCANZA CON QUE CADA RÓTULO ENTRE EN SU CARA. Eso era todo lo que se comprobaba, y
  // con la cubierta partida en franjas el control contó doscientos solapes: el valor de una
  // tira caía sobre el nombre de la de al lado, porque cada una decidía sola y las dos cajas
  // se tocaban aunque ninguna se saliera de su pieza.
  //
  // Se resuelve como en el perfil de q(z): se reparten las etiquetas de la pieza MÁS GRANDE a
  // la más chica, cada una reserva su caja, y la que no encuentra lugar se queda sin rótulo en
  // vez de encimarse. No se achica la letra —el mínimo de 11 px es innegociable— ni se
  // inventan líneas guía: los valores completos están en la tabla de presiones.
  //
  // Cada pieza prueba tres variantes, de la más informativa a la menos: nombre y valor en dos
  // renglones, sólo el valor —que es el dato—, sólo el nombre. Es lo mismo que hacía la
  // versión anterior con su propia cara, ahora contra todas.
  const choca = (a, b) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
  const ocupadas = [];
  const puestos = [];

  const ordenadas = [...elegida.values()].sort((a, b) => area(b) - area(a));
  for (const c of ordenadas) {
    const b = cajas.get(c);
    const w = b.x2 - b.x1, h = b.y2 - b.y1;
    // una cara casi de canto no se rotula: el texto flotaría sobre otra y diría algo falso
    if (Math.min(w, h) < 24) continue;

    const nombre = c.rot;
    const valor = c.sinValor ? null : fq(c.p);
    const wN = anchoEnLienzo(nombre, TXT.min, k), wV = valor
      ? anchoEnLienzo(valor, TXT.min, k) : 0;
    const centrada = (ancho, altoTotal) => ({
      x1: b.cx - ancho / 2, x2: b.cx + ancho / 2,
      y1: b.cy - altoTotal / 2, y2: b.cy + altoTotal / 2,
    });

    const variantes = [];
    if (valor && wN <= w && wV <= w && h >= 44) {
      variantes.push({ nombre, valor, caja: centrada(Math.max(wN, wV), 2.1 * alto1) });
    }
    if (valor && wV <= w) variantes.push({ valor, caja: centrada(wV, alto1) });
    if (wN <= w) variantes.push({ nombre, caja: centrada(wN, alto1) });

    const v = variantes.find(x => !ocupadas.some(o => choca(x.caja, o)));
    if (!v) continue;
    ocupadas.push(v.caja);
    puestos.push({ c, b, ...v });
  }

  return (
    <g>
      {puestos.map(({ c, b, nombre, valor }, i) => {
        const dos = nombre != null && valor != null;
        return (
          <g key={`t${c.id}-${i}`}>
            {nombre != null && (
              <Rotulo x={b.cx} y={dos ? b.cy - alto1 / 2 : b.cy} texto={nombre} color={color}
                tam={TXT.min} />
            )}
            {valor != null && (
              <Rotulo x={b.cx} y={dos ? b.cy + alto1 / 2 : b.cy} texto={valor} color={color}
                tam={TXT.min} peso={600} />
            )}
          </g>
        );
      })}
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EL REPARTO DEL CAPÍTULO 2: UNA PRESIÓN POR CARA, Y FRANJAS EN LA CUBIERTA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Las franjas de la Fig. 2.4-1 llevadas a coordenadas del modelo.
 *
 * ⚠ LOS CORTES SE MIDEN DESDE EL BORDE DE BARLOVENTO, y cuál es ese borde depende del signo
 * de la dirección: con viento según +X el borde está en x = 0 y las franjas crecen hacia +x;
 * con −X está en x = a y crecen hacia −x. Equivocarlo espeja el reparto y pone la succión
 * máxima en el borde de sotavento, que es donde justamente no va.
 *
 * ⚠ LA PRIMERA Y LA ÚLTIMA SE EXTIENDEN MÁS ALLÁ DEL EDIFICIO. El motor tabula las franjas
 * sobre la dimensión del EDIFICIO —`L / h`—, y con voladizo la cubierta es más larga que eso:
 * sin extender los cortes extremos, el vuelo quedaría sin pintar, en blanco, como si no
 * recibiera carga.
 */
function franjasDelModelo(analisis) {
  const { geo, dir, superficies } = analisis;
  const L = dir.eje === "X" ? geo.a : geo.b;
  const cubs = superficies.filter(s => s.tipo === "cubierta" && s.zona && s.caso !== "positivo");
  if (!cubs.length) return null;
  const tope = L / geo.h;

  // Primero en múltiplos de h y ORDENADAS POR EL EJE DEL MODELO, que con viento negativo es
  // el orden inverso al de la tabla.
  const crudas = cubs.map((s) => {
    const z0 = s.zona.desde, z1 = Math.min(s.zona.hasta, tope);
    const d0 = Math.min(z0 * geo.h, L), d1 = Math.min(z1 * geo.h, L);
    const [u0, u1] = dir.signo > 0 ? [d0, d1] : [L - d1, L - d0];
    return { desde: Math.min(u0, u1), hasta: Math.max(u0, u1), z0, z1, s };
  }).filter(t => t.hasta - t.desde > 1e-9).sort((p, q) => p.desde - q.desde);
  if (!crudas.length) return null;

  // ⚠ LAS FRANJAS CONSECUTIVAS QUE SE ESCRIBEN IGUAL VAN EN UNA SOLA. Las dos primeras miden
  // h/2 cada una y en muchos casos llevan el MISMO Cp: el 3D dibujaba dos tiras del mismo
  // color, con la línea de corte entre ellas —que hacía creer que ahí cambia algo— y con dos
  // rótulos idénticos que el control encontró encimados («−1,43» y «−1,43»). Se funde por el
  // TEXTO y no por el valor, por el mismo motivo que en el perfil de q(z): dos valores que
  // difieren en el cuarto dígito se escriben iguales, y lo que el croquis muestra es el texto.
  const tramos = [];
  for (const t of crudas) {
    const u = tramos[tramos.length - 1];
    if (u && fq(u.s.gobernante) === fq(t.s.gobernante)) {
      u.hasta = t.hasta;
      // El nombre abarca desde la primera hasta la última: «0 a h» y no «0 a h/2» dos veces.
      if (dir.signo > 0) u.z1 = t.z1; else u.z0 = t.z0;
      continue;
    }
    tramos.push({ ...t });
  }

  // ⚠ LA PRIMERA Y LA ÚLTIMA SE EXTIENDEN MÁS ALLÁ DEL EDIFICIO. El motor tabula las franjas
  // sobre la dimensión del EDIFICIO —`L / h`—, y con voladizo la cubierta es más larga: sin
  // extender los cortes extremos el vuelo quedaría en blanco, como si no recibiera carga.
  tramos[0].desde = -LEJOS;
  tramos[tramos.length - 1].hasta = LEJOS;
  for (const t of tramos) t.rot = nombreFranja(t.z0, t.z1, tope);
  return { eje: dir.eje === "X" ? 0 : 1, tramos };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EL REPARTO DEL CAPÍTULO 5: LAS ZONAS
// ═══════════════════════════════════════════════════════════════════════════════

/** Sobre qué eje corre una pared de la malla, y de qué largo es. */
const EJE_DE_PARED = {
  x0: { eje: 1, largoDe: (g) => g.b }, xa: { eje: 1, largoDe: (g) => g.b },
  y0: { eje: 0, largoDe: (g) => g.a }, yb: { eje: 0, largoDe: (g) => g.a },
};

/**
 * Las celdas de zona de cubierta en coordenadas del MODELO.
 *
 * ⚠ HAY UN CORRIMIENTO Y NO ES OPCIONAL. `celdasDeZona` trabaja sobre la planta de la
 * CUBIERTA con su origen en una esquina —de 0 a `bx`—, y la malla tiene el origen en la
 * esquina del EDIFICIO, así que con voladizo la cubierta empieza en `−vuelo`. Sin restar el
 * vuelo, las zonas quedan corridas justo el ancho del vuelo y la zona 3 de esquina se dibuja
 * adentro del recinto.
 */
function celdasDelModelo(cyr) {
  if (!cyr?.geoZonas?.layout) return null;
  const v = cyr.voladizo?.porBorde ?? { "-X": 0, "-Y": 0 };
  const dx = -(v["-X"] ?? 0), dy = -(v["-Y"] ?? 0);
  const celdas = unirFilas(
    celdasDeZona(cyr.geoZonas).map(c => ({ ...c, dato: c.zona })),
    (p, q) => p === q);
  return celdas.map(c => ({
    x0: c.x0 + dx, x1: c.x1 + dx, y0: c.y0 + dy, y1: c.y1 + dy, dato: c.dato,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════

export function Vista3D({ analisis, cyr, alero, maxAbs, tema = "claro", ancho = 620,
  alto = 440, zoom = 1, setZoom }) {
  const { geo, dir, superficies, modo, caraUnica } = analisis;
  const orb = useOrbita("iso");
  const [vista, setVista] = useState("sprfv");
  const [iEl, setIEl] = useState(0);
  const [sentido, setSentido] = useState("neg");
  // Tinta por tokens del tema: son variables CSS y se invierten solas. Lo único que
  // sigue dependiendo de `tema` es la escala de presión, que es una escala de datos.
  const ink = tok.txt2;
  const txt = tok.txt;

  // El modo C&R sólo se ofrece si hay de dónde sacar los números. Un botón que no hace nada
  // es peor que no tener el botón.
  const elementos = (cyr?.elementos ?? []).filter(e => !e.sinFigura);
  const hayCyR = !!cyr?.geoZonas?.layout && elementos.length > 0;
  const enCyR = vista === "cyr" && hayCyR;
  const el = elementos[Math.min(iEl, elementos.length - 1)];

  // ── EL CAPÍTULO 2, POR CARA ──────────────────────────────────────────────────
  const de = (id) => superficies.find(s => s.id === id);
  const pBar = de("pared_barlovento")?.tramos?.at(-1)?.gobernante ?? 0;
  const pSot = de("pared_sotavento")?.gobernante ?? 0;
  const pLat = de("pared_lateral")?.gobernante ?? 0;
  const cubs = superficies.filter(s => s.tipo === "cubierta" && s.caso !== "positivo");

  const ejeX = dir.eje === "X", pos = dir.signo > 0;
  const barId = ejeX ? (pos ? "x0" : "xa") : (pos ? "y0" : "yb");
  const sotId = ejeX ? (pos ? "xa" : "x0") : (pos ? "yb" : "y0");

  const infoPared = (id) => (id === barId ? { p: pBar, rot: "Barlovento" }
    : id === sotId ? { p: pSot, rot: "Sotavento" } : { p: pLat, rot: "Lateral" });

  // ⚠ LA MALLA Y EL ANÁLISIS NO COINCIDEN NECESARIAMENTE EN LA CUBIERTA. La malla de un
  // caballete tiene SIEMPRE dos planos de techo, pero el análisis puede tratarlos como dos
  // faldones, como una superficie única (nota 4) o como FRANJAS —que es lo que pasa con el
  // viento paralelo a la cumbrera—. Se mira el MODO, no la cantidad de caras.
  const infoCub = (id) => {
    if (modo === "unica" || cubs.length <= 1) {
      return { p: cubs[0]?.gobernante ?? 0, rot: caraUnica ? `Cubierta · ${caraUnica}` : "Cubierta" };
    }
    const esBar = id.replace("cub_", "") === barId;
    const s = cubs.find(c => c.id.includes(esBar ? "barlovento" : "sotavento")) ?? cubs[0];
    return { p: s.gobernante, rot: esBar ? "Cubierta barlovento" : "Cubierta sotavento" };
  };

  // ── LA CARA INFERIOR DEL VUELO, ART. 2.4.4 ──────────────────────────────────
  //
  // ⚠ SÓLO LA DEL BORDE A BARLOVENTO LLEVA EL C_p = +0,8. Es la definición que fijó el
  // proyectista y es lo que el motor calcula: los otros tres vuelos aportan área de cubierta
  // al levantamiento, pero no la presión positiva de abajo —el viento entra por debajo del
  // vuelo que enfrenta, no por los que están a sotavento—. Pintando las cuatro con el mismo
  // valor, el croquis mostraría una presión que tres de ellas no reciben.
  //
  // ⚠ Y EL BORDE A BARLOVENTO ES EL QUE MIRA CONTRA EL VIENTO: con viento según +X, la cara
  // que el viento golpea primero es la que mira a −X. Es la misma convención de `fachadas.js`
  // y de `vueloABarlovento`.
  const infSup = de("voladizo_inferior");
  const bordeBarlovento = `${dir.signo > 0 ? "-" : "+"}${dir.eje}`;
  const infoVoladizo = (c) => {
    if (c.tipo !== "voladizo_inferior") return { p: 0, rot: "voladizo", sinValor: true };
    if (c.borde !== bordeBarlovento || !infSup) {
      return { p: 0, rot: "Cara inferior del vuelo", sinValor: true };
    }
    return { p: infSup.gobernante, rot: "Cara inferior a barlovento" };
  };

  // ── EL CAPÍTULO 5, POR ZONA ──────────────────────────────────────────────────
  // El área con la que se leen los (GC_p) es la del elemento elegido, y por eso el título
  // la dice: cambiando de elemento cambian TODOS los colores del volumen.
  const porZona = useMemo(() => (enCyR && el
    ? presionesPorZona(cyr.ctx, { A: el.area.A, volumenInterno: el.elemento.volumenInterno })
    : null), [enCyR, el, cyr]);
  const pz = (grupo, zona) => {
    const z = porZona?.[grupo]?.[zona];
    if (!z) return { p: 0, sinValor: true };
    return { p: sentido === "neg" ? z.pNeg : z.pPos };
  };

  // ── LA ESCALA DE COLOR SE RENORMALIZA EN EL MODO C&R ─────────────────────────
  //
  // ⚠ NO SIRVE EL `maxAbs` DEL CAPÍTULO 2. Ese máximo es el de las presiones del SPRFV sobre
  // las caras del edificio, y los (GC_p) del capítulo 5 son PICOS LOCALES sobre áreas chicas:
  // dan del orden del doble o el triple. Con la escala del capítulo 2 todo el volumen cae por
  // encima del extremo, `colorPresion` satura en el paso más oscuro y el croquis sale de un
  // solo color: el color deja de informar y la leyenda dice un rango que ninguna cara tiene.
  //
  // Se toma el máximo de lo que ESTE croquis está pintando —las tres ubicaciones más las
  // caras del alero—, que es lo que hace que los tonos separen la zona 1 de la zona 3.
  const maxCyR = useMemo(() => {
    if (!porZona) return maxAbs;
    const vals = [];
    for (const grupo of Object.values(porZona)) {
      for (const z of Object.values(grupo)) vals.push(Math.abs(z.pPos), Math.abs(z.pNeg));
    }
    for (const dst of alero?.elementos?.[0]?.destinos ?? []) {
      for (const r of dst.caras ? Object.values(dst.caras) : [dst.neto]) {
        vals.push(Math.abs(r.pPos), Math.abs(r.pNeg));
      }
    }
    return vals.length ? Math.max(...vals) : maxAbs;
  }, [porZona, alero, maxAbs]);
  const escalaColor = enCyR ? maxCyR : maxAbs;

  // ── UN PRESET PROPIO DE ESTA APP: MIRAR A BARLOVENTO ────────────────────────
  //
  // Las cinco vistas de `orbita.js` son las mismas que en bases y no se tocan. Pero acá hay
  // una cara que importa más que las otras —la que el viento golpea—, y en la isométrica
  // estándar de 45° puede quedar atrás. No se cambia la vista por defecto: se agrega un
  // botón, porque reorientar sola la cámara según el caso sería peor que empezar de canto.
  //
  // El yaw sale de alinear el vector que apunta al observador con la normal de barlovento,
  // más un cuarto de vuelta para que se vea también una lateral y lea como volumen.
  const GR = Math.PI / 180;
  const yawBarlovento = { x0: -45, xa: 135, y0: 225, yb: 45 }[barId] * GR;
  const verBarlovento = () => { orb.setVista({ yaw: yawBarlovento, pitch: 30 * GR }); orb.setZoom(1); };
  const enBarlovento = Math.abs(orb.vista.yaw - yawBarlovento) < 1e-6
    && Math.abs(orb.vista.pitch - 30 * GR) < 1e-6;

  const cam = camara(orb.vista.yaw, orb.vista.pitch);

  const { piezas, enc } = useMemo(() => {
    const m = mallaEdificio({ a: geo.a, b: geo.b, hAlero: geo.hAlero, hCumbre: geo.hCumbre,
      tipo: geo.tipo, cumbrera: geo.cumbrera, pendienteHacia: geo.pendienteHacia,
      voladizo: geo.voladizo, aleroAdosado: alero && alero.pared ? {
        hay: true, pared: alero.pared, ancho: alero.ancho, vuelo: alero.vuelo, hc: alero.hc,
      } : null });

    const conPts = m.caras.map(c => ({ ...c, pts: c.v.map(i => m.V[i]) }));
    const franjas = !enCyR ? franjasDelModelo(analisis) : null;
    const celdas = enCyR ? celdasDelModelo(cyr) : null;
    const aZona = cyr?.a?.a ?? 0;

    /** @type {any[]} */
    const trozos = [];
    for (const cara of conPts) {
      // ── PISO ──
      if (cara.tipo === "piso") {
        trozos.push({ ...cara, rot: "Cara inferior", p: 0, sinValor: true });
        continue;
      }

      // ── PAREDES ──
      if (cara.tipo === "pared") {
        if (!enCyR) { trozos.push({ ...cara, ...infoPared(cara.id) }); continue; }
        const { eje, largoDe } = EJE_DE_PARED[cara.id] ?? EJE_DE_PARED.y0;
        const largo = largoDe(geo);
        const tramos = franjasDePared(largo, aZona).map(f => ({
          desde: f.desde, hasta: f.hasta, dato: f.zona }));
        // La zona 5 nace en una esquina del edificio y no de la cubierta, así que los cortes
        // van sobre el largo de la PARED y no hace falta corrimiento ninguno.
        tramos[0].desde = -LEJOS;
        tramos[tramos.length - 1].hasta = LEJOS;
        for (const t of porFranjas(cara.pts, /** @type {0|1} */ (eje), tramos, 1e-4)) {
          trozos.push({ ...cara, pts: t.pts, id: `${cara.id}_z${t.dato}`,
            rot: `Zona ${t.dato}`, ...pz("pared", t.dato) });
        }
        continue;
      }

      // ── CUBIERTA, Y LA CARA SUPERIOR DEL VUELO QUE LA PROLONGA ──
      //
      // ⚠ EN EL CAPÍTULO 2 LA CARA SUPERIOR DEL VUELO RECIBE LO MISMO QUE EL FALDÓN. Es la
      // misma chapa: la Fig. 2.4-1 no distingue, y el art. 2.4.4 sólo agrega la cara
      // INFERIOR a barlovento. Por eso acá van juntas y recién en el modo C&R se separan,
      // que es donde el art. 5.7 les da coeficientes distintos.
      if (cara.tipo === "cubierta"
        || (cara.tipo === "voladizo_superior" && !enCyR)) {
        if (enCyR && celdas) {
          for (const t of porCeldas(cara.pts, celdas, 1e-4)) {
            trozos.push({ ...cara, pts: t.pts, id: `${cara.id}_z${t.dato}`,
              rot: `Zona ${t.dato}`, ...pz("cubierta", t.dato) });
          }
        } else if (franjas) {
          for (const t of porFranjas(cara.pts, /** @type {0|1} */ (franjas.eje),
            franjas.tramos.map(x => ({ desde: x.desde, hasta: x.hasta, dato: x })), 1e-4)) {
            trozos.push({ ...cara, pts: t.pts, id: `${cara.id}_${t.dato.s.id}`,
              rot: t.dato.rot, p: t.dato.s.gobernante });
          }
        } else {
          trozos.push({ ...cara, ...infoCub(cara.id) });
        }
        continue;
      }

      // ── VOLADIZO ──
      if (/^voladizo/.test(cara.tipo)) {
        // El canto es vertical: en planta no tiene área, así que no se zonifica. Se dibuja
        // sin valor porque es el espesor de DIBUJO, no una superficie del reglamento.
        if (cara.tipo === "voladizo_canto") {
          trozos.push({ ...cara, rot: "voladizo", p: 0, sinValor: true });
          continue;
        }
        if (enCyR && celdas) {
          // Art. 5.7: el elemento de voladizo lleva el (GC_p) COMPUESTO de las dos caras, y
          // su zona es la de la cubierta que lo prolonga. Las dos caras del vuelo se pintan
          // con ese valor: el coeficiente es del ELEMENTO, no de una cara.
          const cual = cara.tipo === "voladizo_inferior" ? "Voladizo abajo" : "Voladizo";
          for (const t of porCeldas(cara.pts, celdas, 1e-4)) {
            trozos.push({ ...cara, pts: t.pts, id: `${cara.id}_z${t.dato}`,
              rot: `${cual} · zona ${t.dato}`, ...pz("voladizo", t.dato) });
          }
        } else {
          trozos.push({ ...cara, ...infoVoladizo(cara) });
        }
        continue;
      }

      // ── ALERO ADOSADO ──
      if (cara.tipo === "alero" || cara.tipo === "alero_inferior") {
        trozos.push({ ...cara, ...infoAlero(cara, alero, enCyR, sentido) });
        continue;
      }

      trozos.push({ ...cara, rot: cara.id, p: 0, sinValor: true });
    }

    const vis = visiblesDe(trozos, cam).map(c => ({ ...c, proy: c.pts.map(q => cam.proy(...q)) }));
    // El encuadre usa TODOS los vértices y no sólo los visibles: si se encuadrara con los
    // visibles, la pieza saltaría de tamaño cada vez que una cara entra o sale de vista.
    return { piezas: vis, enc: encuadre(m.V.map(q => cam.proy(...q)), ancho, alto - 70, 44) };
  }, [geo, alero, cyr, analisis, enCyR, sentido, porZona, cam.yaw, cam.pitch, ancho, alto]);

  // posición en pantalla de un punto ya proyectado, con encuadre y zoom aplicados
  const px = ([u, v]) => [ancho / 2 + (u * enc.esc + enc.dx - ancho / 2) * orb.zoom,
    (alto - 70) / 2 + 18 + (v * enc.esc + enc.dy - (alto - 70) / 2) * orb.zoom];
  const poly = (pts) => pts.map(q => px(q).join(",")).join(" ");

  // Mismo cuerpo que el resto de la interfaz: son controles, no anotaciones del dibujo,
  // y a 11 px quedaban como un widget de otra aplicación pegado debajo del croquis.
  const boton = (activo) => ({
    fontSize: 13, fontWeight: activo ? 600 : 500, padding: "4px 10px", borderRadius: 6,
    cursor: "pointer",
    border: `1px solid ${activo ? "var(--acento)" : "var(--borde)"}`,
    background: activo ? "var(--acento)" : "var(--fondo)",
    color: activo ? tok.canvas : tok.txt,
  });
  const esVista = (k) => Math.abs(orb.vista.yaw - VISTAS[k].yaw) < 1e-6
    && Math.abs(orb.vista.pitch - VISTAS[k].pitch) < 1e-6;

  // ⚠ EL ALERO ADOSADO SE PINTA CON SU PROPIO ELEMENTO, NO CON EL DEL EDIFICIO. Tiene su lista
  // aparte —sus figuras no zonifican y no comparten ni área ni destino con las del capítulo
  // 5.3—, así que el área que el título declara no es la que colorea el alero. Sin decirlo, el
  // croquis estaría atribuyendo a un elemento un número que sale de otro.
  const elAlero = enCyR ? alero?.elementos?.[0] : null;
  const subtitulo = enCyR
    ? `Zonas del cap. 5 · ${el.elemento.nombre ?? "elemento"} · A = ${fm(el.area.A)} m² · `
      + `${sentido === "neg" ? "succión (p−)" : "presión (p+)"}`
      + (elAlero ? ` · alero adosado con «${elAlero.elemento.nombre ?? "su elemento"}»` : "")
    : `${dir.label} — ${modo === "franjas" ? "franjas de la Fig. 2.4-1 sobre la cubierta"
      : "presión gobernante por cara"}`;

  return (
    <div>
      <div {...orb.props} style={orb.estilo}>
        <Lienzo ancho={ancho} alto={alto}
          titulo={`Vista 3D — ${enCyR ? "componentes y revestimientos" : dir.label}`}
          zoom={zoom} setZoom={setZoom}>
          <Rotulo x={ancho / 2} y={14} texto={subtitulo} color={txt} tam={TXT.titulo}
            peso={600} />
          {piezas.map((cara, i) => (
            <g key={`${cara.id}-${i}`}>
              <polygon points={poly(cara.proy)}
                fill={colorPresion(cara.sinValor ? null : cara.p, escalaColor, tema)}
                stroke={ink} strokeWidth="1.2" strokeLinejoin="round" />
              <polygon points={poly(cara.proy)} fill={SOMBRA} opacity={sombra(cara.n)} />
            </g>
          ))}
          <RotulosDeCara piezas={piezas} px={px} color={txt} />
          {/* La leyenda usa la MISMA escala con la que se pintó: con la del capítulo 2 diría
              un rango que ninguna cara de este croquis tiene. */}
          <LeyendaPresion x={ancho / 2 - 90} y={alto - 34} ancho={180}
            tramos={tramosLeyenda(escalaColor, tema)} fmt={fq} color={ink} lienzo={ancho}
            lienzoAlto={alto} />
        </Lienzo>
      </div>

      {/* ── QUÉ SE ESTÁ MIRANDO ── */}
      {hayCyR && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center",
          marginTop: 6 }}>
          {MODOS_3D.map(k => (
            <button key={k} style={boton(k === (enCyR ? "cyr" : "sprfv"))}
              onClick={() => setVista(k)}>{ETIQUETA_MODO[k]}</button>
          ))}
          {enCyR && <>
            <select className="vw-in" value={Math.min(iEl, elementos.length - 1)}
              onChange={(e) => setIEl(Number(e.target.value))}
              style={{ fontSize: 13, padding: "4px 6px", borderRadius: 6,
                border: "1px solid var(--borde)", background: "var(--fondo)", color: tok.txt }}>
              {elementos.map((x, j) => (
                <option key={j} value={j}>
                  {x.elemento.nombre ?? `Elemento ${j + 1}`} — A = {fm(x.area.A)} m²
                </option>
              ))}
            </select>
            <button style={boton(sentido === "neg")} onClick={() => setSentido("neg")}>p−</button>
            <button style={boton(sentido === "pos")} onClick={() => setSentido("pos")}>p+</button>
          </>}
        </div>
      )}

      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
        <button style={boton(enBarlovento)} onClick={verBarlovento}>Barlovento</button>
        {Object.entries(VISTAS).map(([k, v]) => (
          <button key={k} style={boton(esVista(k) && !enBarlovento)} onClick={() => orb.irA(k)}>
            {v.lab}
          </button>
        ))}
        <span style={{ fontSize: 13, color: "var(--txt2)", marginLeft: 4 }}>
          arrastrá para girar · rueda para acercar
          {orb.zoom !== 1 && ` · ${coef(orb.zoom)}×`}
        </span>
      </div>
    </div>
  );
}

/**
 * Qué se rotula y con qué presión se pinta una cara del alero adosado.
 *
 * ⚠ EL ALERO ADOSADO NO TIENE ZONAS: el art. 5.9 no zonifica su planta —sus figuras dan un
 * coeficiente por superficie o uno neto, función sólo del área efectiva—. Por eso sus caras
 * se pintan enteras, y en el modo C&R con el valor de la figura que corresponde a cada una:
 * la 5.9-1A/2A da la cara superior y la inferior por separado, que es lo que se dibuja.
 *
 * En el modo SPRFV no lleva número: un alero adosado no es una superficie del edificio en el
 * capítulo 2 —no cierra recinto ni aporta al reparto de la Fig. 2.4-1— y pintarle la presión
 * de la pared de la que cuelga sería informar un número que no es el suyo.
 */
function infoAlero(cara, alero, enCyR, sentido) {
  const esInferior = cara.tipo === "alero_inferior";
  const nombre = esInferior ? "Alero adosado · cara inferior" : "Alero adosado";
  if (!enCyR || !alero?.elementos?.length) {
    return { p: 0, rot: nombre, sinValor: true };
  }
  const dst = alero.elementos[0].destinos;
  const sup = dst.find(d => d.destino === DESTINO.SUPERFICIES);
  const neto = dst.find(d => d.destino === DESTINO.ESTRUCTURA);
  const r = sup ? sup.caras[esInferior ? CARA.INFERIOR : CARA.SUPERIOR] : neto?.neto;
  if (!r) return { p: 0, rot: nombre, sinValor: true };
  return { p: sentido === "neg" ? r.pNeg : r.pPos,
    rot: sup ? nombre : `${nombre} (neta)` };
}
