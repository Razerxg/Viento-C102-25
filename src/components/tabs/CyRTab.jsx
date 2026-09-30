// COMPONENTES Y REVESTIMIENTOS — capítulo 5, Parte 1 (art. 5.3).
//
// ── POR QUÉ NO HAY SELECTOR DE DIRECCIÓN ────────────────────────────────────────
// Los (GC_p) de las figuras del capítulo 5 YA son la envolvente de todas las direcciones:
// por eso cada elemento tiene un valor positivo y uno negativo, y hay que diseñarlo para
// los dos. Un selector de dirección diría que hay un resultado por dirección, y no lo hay.
//
// ── POR QUÉ SE MUESTRAN TODAS LAS ZONAS, SIEMPRE ────────────────────────────────
// Una correa tipo se repite por toda la cubierta. Saber cuál zona la gobierna exige
// haberlas calculado todas, así que el filtro de zona es de la VISTA y no del cálculo: se
// dice explícitamente arriba de la tabla.
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { Encabezado, Card, Campo, Sel, Aviso, Nota, Tabla, Th, Td, TdN, Badge,
  Boton, Stat, Stats, Vacio, Ayuda, Acordeon } from '../ui.jsx';
import { c, t, MONO } from '../tokens.js';
import { U } from '../../lib/unidades.js';
import { ZonasCyR } from '../svg/ZonasCyR.jsx';
import { CurvasCyR } from '../svg/CurvasCyR.jsx';
import { cotasDeZona, LAYOUT } from '../../engine/cyrZonas.js';
import { TIPOS_LISTA, ETIQUETA_TIPO, TIPO_ELEMENTO, AREA_SPRFV } from '../../engine/cyrElementos.js';
import { FIGURAS } from '../../constants/figuras.js';
import { P_MINIMA, curvasUsadas } from '../../engine/cyrPresiones.js';
import { reduccionPared } from '../../engine/cyrFiguras.js';
import { AleroAdosado } from './AleroAdosado.jsx';

// `Sel` toma pares [valor, texto]: no un objeto {id, label}. Pasarle el objeto renderiza
// «[object Object]» en el mejor caso y revienta en React en el peor, que es lo que hizo.
// ⚠ «VOLADIZO» ES UNA UBICACIÓN, NO UNA SUPERFICIE. Adentro sigue siendo un elemento de
// CUBIERTA —usa la figura de la cubierta— pero con `ubicacion: "voladizo"`, que es lo que
// dispara la curva de alero de la Fig. 5.3-2A o, si la figura no la tiene, la composición
// de las dos caras del art. 5.7. En el desplegable van juntos porque para quien carga un
// elemento son tres lugares del edificio, y esa es la pregunta que se está haciendo.
const SUPERFICIES = [["cubierta", "Cubierta"], ["voladizo", "Voladizo de cubierta"],
  ["pared", "Pared"]];

/** Lo que el desplegable muestra para un elemento ya cargado. */
const superficieDe = (el) => (el.ubicacion === "voladizo" ? "voladizo" : el.superficie);

/** Los tipos que piden luz y separación; el resto pide un área. */
const PIDE_LS = new Set([TIPO_ELEMENTO.CHAPA, TIPO_ELEMENTO.CORREA,
  TIPO_ELEMENTO.LARGUERO, TIPO_ELEMENTO.MONTANTE]);

const nuevoId = () => `cyr-${Math.random().toString(36).slice(2, 8)}`;

// ── LAS AYUDAS ──────────────────────────────────────────────────────────────────
//
// Cada una dice QUÉ ES y DE DÓNDE SALE, con su artículo. No son glosario: son lo que
// evita el error de uso concreto que ese campo habilita. La del área efectiva, por
// ejemplo, existe porque el (GC_p) se lee con un área y la presión se aplica sobre otra, y
// confundirlas sobredimensiona sin que nada lo avise.
const AYUDA = {
  tipo: "El tipo fija la regla del área efectiva de viento (art. 1.2). Chapa, correa, "
    + "larguero y montante van con A = L · máx(s; L/3); la fijación toma el área "
    + "tributaria de UNA fijación, sin la regla del tercio; una puerta o ventana apoyada "
    + "en tres o más lados toma el área del elemento.",
  volumenInterno: "Art. 5.7: «Cuando la separación de las superficies superior e inferior "
    + "del voladizo no configure un volumen interno, se tomará (GC_pi) = 0». Un voladizo "
    + "de chapa sobre correas, sin cielorraso, no encierra nada. Por defecto se supone que "
    + "SÍ lo encierra, que es lo conservador.",
  superficie: "Decide de qué figura sale el (GC_p): la 5.3-1 para paredes y la figura de "
    + "cubierta que corresponda a la forma y a θ. También decide qué zonas se verifican: "
    + "4 y 5 en pared, 1 a 3 —y las primadas— en cubierta.",
  L: "Luz del elemento entre apoyos. Entra en el área efectiva de viento y, por la regla "
    + "del tercio, también en el ancho efectivo cuando la separación es chica (art. 1.2).",
  s: "Separación entre elementos. El ancho efectivo es el mayor entre s y L/3: una correa "
    + "de 6 m cada 1,50 m no toma 9 m² sino 6 × 2 = 12 m².",
  area: "Área efectiva de viento del elemento, en m². Con ella se LEE el (GC_p); la "
    + "presión resultante se aplica sobre el área tributaria real, que no es la misma "
    + "(comentario C 1.2).",
  zona: "Filtra la vista de la tabla, no el cálculo. Los (GC_p) se evalúan siempre en "
    + "TODAS las zonas de la figura: el mismo elemento tipo se usa en varias zonas de la "
    + "obra, y saber cuál gobierna exige haberlas calculado todas.",
  parapeto: "Nota 5 de la Fig. 5.3-2A: con un parapeto de 1 m o más alrededor de TODO el "
    + "perímetro, los (GC_p) negativos de la zona 3 se igualan a los de la zona 2, y los "
    + "positivos de las zonas 2 y 3 a los de las zonas de pared 4 y 5 de la Fig. 5.3-1. "
    + "No interpola: dispara con 1 m, o no dispara.",
  sombrear: "Sombrea las zonas en grises del tema, de la menos a la más succionada. Las "
    + "figuras del reglamento son dibujos de línea: el sombreado es una ayuda de lectura "
    + "y no forma parte de la figura.",
  figura: "La elige la forma de la cubierta y θ. Un (GC_p) correcto leído de la figura "
    + "equivocada da una presión plausible y un cálculo entero mal, así que la app "
    + "informa siempre el motivo de la selección (art. 5.3.2).",
  h: "Cuál de las dos alturas usa la figura lo dice su propia notación: la Fig. 5.3-2A "
    + "define h como la altura del ALERO; las 5.3-1, 5.3-2B, 2E y 2F usan la altura media "
    + "salvo con θ ≤ 10°, donde también va la del alero; las 5.3-2C, 2D y 2G usan siempre "
    + "la media. Esa altura fija las zonas, entra en la dimensión a y es a la que se "
    + "evalúa q_h.",
  qh: "q_h = 0,613 · K_z(h) · K_zt · K_d · K_e · V², expresión (1.13-1). ⚠ En la Parte 1 "
    + "del capítulo 5 q_h rige TAMBIÉN en las paredes, a diferencia del capítulo 2, donde "
    + "la pared a barlovento se evalúa con q_z variable en altura.",
  kzt: "Se toma el MÁXIMO entre las cuatro direcciones. Los (GC_p) del capítulo 5 ya son "
    + "la envolvente de todas las direcciones, así que quedarse con el K_zt de una sola "
    + "dejaría afuera justo la que agrava. La exposición sigue el mismo criterio: la que "
    + "dé las mayores cargas (art. 1.7.4.4).",
  a: "a = 10 % de la menor dimensión horizontal o 0,4h, la que sea menor, pero no menos "
    + "que el 4 % de la menor dimensión ni que 1 m. Excepción: con θ de 0° a 7° y menor "
    + "dimensión mayor que 90 m, a se limita a 0,8h. La app informa cuál de los cuatro "
    + "gobernó.",
  gcpi: "Coeficiente de presión interna de la Tabla 1.11-1, con el R_i que se haya "
    + "adoptado en Cerramiento ya aplicado. Se usan SIEMPRE los dos signos (nota 3): no "
    + "es un ± del que se elige el peor, son dos casos.",
  kd: "Fila «Edificios — componentes y revestimientos» de la Tabla 1.6-1. Vale 0,85 igual "
    + "que la del SPRFV, pero sale de otra fila del reglamento.",
  minimo: "Art. 5.2.2: la presión de diseño no puede ser menor que 0,80 kN/m² netos "
    + "actuando en CUALQUIER dirección normal a la superficie. Los dos sentidos tienen su "
    + "piso por separado. No es el 0,75 kN/m² del art. 2.1.5, que es del SPRFV y se aplica "
    + "sobre el área proyectada del edificio entero.",
  sprfv: "Art. 5.2.3: los elementos con área TRIBUTARIA mayor que 65 m² se pueden diseñar "
    + "con las disposiciones del SPRFV. Es una opción, no una obligación: verificarlos "
    + "como componente queda del lado seguro.",
  reduccion: "Nota 5 de la Fig. 5.3-1: los (GC_p) de pared se reducen un 10 % cuando "
    + "θ ≤ 10°. Afecta a los dos signos.",
};

/** La ficha de la figura del reglamento que corresponde mirar para esta cubierta. */
const figDeCubierta = (cyr) => FIGURAS[cyr?.figura] ?? null;

/**
 * El número de zona en un círculo, como en las figuras del reglamento.
 *
 * Antes era un cuadradito de color más el número. El color venía de una paleta fija y
 * clara, así que en tema oscuro el número quedaba blanco sobre celeste: ilegible. El
 * círculo no necesita color para significar nada —el número ya lo dice— y se lee igual en
 * los dos temas.
 */
function Zona({ z }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 20, height: 20, borderRadius: "50%", border: `1.2px solid ${c.txt}`,
      color: c.txt, fontFamily: MONO, fontSize: 11.5, fontWeight: 600, lineHeight: 1 }}>
      {z.replace("'", "\u2032")}
    </span>
  );
}

// ── LA LISTA DE ELEMENTOS NO USA `Campo` ────────────────────────────────────────
// `Campo` es una fila de formulario —rótulo, control y unidad en línea— pensada para una
// columna de datos, y acá cada elemento es un RENGLÓN con seis controles. Metido en una
// grilla, el rótulo y el control se superponen: la pantalla mostraba «Correa de
// cubiertaTipo» y «Separación s / Quitar» encimados. Un renglón de lista lleva sus
// rótulos una sola vez, arriba, como cualquier tabla.
const COLS = "minmax(140px, 1.6fr) minmax(140px, 1.3fr) 104px 82px 82px 34px";

const Entrada = ({ v, set, ancho = "100%" }) => (
  <input value={v ?? ""} onChange={(e) => set(e.target.value)} className="vw-in"
    style={{ width: ancho, padding: "6px 8px", border: `1px solid ${c.borde}`,
      borderRadius: 4, background: c.sup, color: c.tinta, fontSize: 13 }} />
);

function EncabezadoLista() {
  const est = { fontSize: 11, color: c.tenue, textTransform: "uppercase", letterSpacing: .4,
    display: "inline-flex", alignItems: "center", gap: 4 };
  const H = ({ children, ayuda }) => (
    <span style={est}>{children}{ayuda ? <Ayuda>{ayuda}</Ayuda> : null}</span>
  );
  return (
    <div style={{ display: "grid", gridTemplateColumns: COLS, gap: t.sm, padding: "0 4px 4px" }}>
      <H>Nombre</H>
      <H ayuda={AYUDA.tipo}>Tipo</H>
      <H ayuda={AYUDA.superficie}>Superficie</H>
      <H ayuda={AYUDA.L + " " + AYUDA.area}>L / Área</H>
      <H ayuda={AYUDA.s}>s</H>
      <H />
    </div>
  );
}

function FilaElemento({ el, res, set, setVarios, quitar }) {
  const pideLS = PIDE_LS.has(el.tipo);
  const esVoladizo = el.ubicacion === "voladizo";
  // Cambiar de superficie toca DOS campos a la vez: uno solo dejaría un elemento de pared
  // con `ubicacion: "voladizo"` colgada, que es una combinación que no existe.
  const setSuperficie = (v) => setVarios(v === "voladizo"
    ? { superficie: "cubierta", ubicacion: "voladizo" }
    : { superficie: v, ubicacion: undefined });
  return (
    <div style={{ padding: "6px 4px", borderTop: `1px solid ${c.borde}` }}>
      <div style={{ display: "grid", gridTemplateColumns: COLS, gap: t.sm, alignItems: "center" }}>
        <Entrada v={el.nombre} set={set("nombre")} />
        <Sel v={el.tipo} set={set("tipo")} w="100%"
          opciones={TIPOS_LISTA.map(id => [id, ETIQUETA_TIPO[id]])} />
        <Sel v={superficieDe(el)} set={setSuperficie} w="100%" opciones={SUPERFICIES} />
        {pideLS
          ? <><Entrada v={el.L} set={set("L")} /><Entrada v={el.s} set={set("s")} /></>
          : <><Entrada v={el.area} set={set("area")} /><span style={{ fontSize: 12,
              color: c.tenue }}>m²</span></>}
        {/* Una «×» y no la palabra: la columna es angosta y «Quitar» se cortaba contra el
            borde de la tarjeta. El título lo dice para quien use lector de pantalla. */}
        <Boton variante="fantasma" onClick={quitar} title="Quitar este elemento">×</Boton>
      </div>
      <div style={{ display: "flex", gap: t.md, alignItems: "center", paddingTop: 4,
        flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: c.tenue, fontFamily: MONO }}>
          {res?.area?.cuenta ?? "—"}
        </span>
        {esVoladizo && (
          <label style={{ display: "flex", gap: t.xs, alignItems: "center", fontSize: 12,
            color: c.tenue }}>
            <input type="checkbox" checked={el.volumenInterno === false}
              onChange={(e) => set("volumenInterno")(e.target.checked ? false : undefined)} />
            Sin volumen interno entre sus caras → (GC_pi) = 0
            <Ayuda>{AYUDA.volumenInterno}</Ayuda>
          </label>
        )}
      </div>
    </div>
  );
}

export function CyRTab() {
  const { cyr, geoN, d, setCyR, elementosCyR, setElementosCyR, cerr, kdCyR } = useProyecto();

  const setEl = (i) => (k) => (v) => setElementosCyR(xs =>
    xs.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  /** Varios campos de un elemento a la vez, para los cambios que tocan dos. */
  const setVarios = (i) => (campos) => setElementosCyR(xs =>
    xs.map((x, j) => (j === i ? { ...x, ...campos } : x)));
  const quitar = (i) => () => setElementosCyR(xs => xs.filter((_, j) => j !== i));
  const agregar = () => setElementosCyR(xs => [...xs, {
    id: nuevoId(), nombre: `Elemento ${xs.length + 1}`, tipo: TIPO_ELEMENTO.CORREA,
    superficie: "cubierta", L: "5", s: "1.5", area: "" }]);

  const zonasVista = ["todas", ...cyr.zonasCubierta, ...cyr.zonasPared];
  const filtro = d.cyr.zonaVista ?? "todas";
  const visible = (z) => filtro === "todas" || z === filtro;

  return (
    <>
      <Encabezado titulo="Componentes y revestimientos"
        desc="p = q_h · [(GC_p) − (GC_pi)], expresión (5.3-1). Parte 1 del capítulo 5, para
          h ≤ 20 m. El (GC_p) ya incluye el factor de ráfaga y no se separa (art. 5.2.4),
          y los coeficientes son envolvente de todas las direcciones: por eso cada
          elemento se verifica con un valor positivo y uno negativo." />

      {cyr.avisos.map((a, i) => (
        <Aviso key={i} tono={a.nivel === "error" ? "error" : a.nivel === "info" ? "info" : "aviso"}
          titulo={a.ref}>{a.texto}</Aviso>
      ))}

      <Card titulo="De dónde sale cada parámetro"
        desc="Ninguno se carga acá: vienen de Sitio, Edificio y Cerramiento.">
        <Stats>
          <Stat label="Figura de cubierta" valor={cyr.figura ?? "—"} sub={cyr.fuente.porque}
            ayuda={AYUDA.figura} />
          <Stat label="Altura de referencia" valor={U.n.longitud(cyr.altura.valor)}
            unidad={U.u.longitud} sub={cyr.altura.porque} ayuda={AYUDA.h} />
          <Stat label="q_h" valor={U.n.presion(cyr.qh ?? 0)} unidad={U.u.presion}
            sub={`K_zt = ${cyr.Kzt.toFixed(3).replace(".", ",")} — máximo entre direcciones`}
            ayuda={`${AYUDA.qh} ${AYUDA.kzt}`} />
          <Stat label="Dimensión a" valor={U.n.longitud(cyr.a.a)} unidad={U.u.longitud}
            sub={`gobierna ${cyr.a.gobierna}`} ayuda={AYUDA.a} />
          <Stat label="(GC_pi)" valor={`±${Math.abs(cerr.gcpi).toFixed(3).replace(".", ",")}`}
            sub={cerr.label} ayuda={AYUDA.gcpi} />
          <Stat label="K_d" valor={kdCyR.toFixed(2).replace(".", ",")}
            sub="fila «Edificios — componentes y revestimientos»" ayuda={AYUDA.kd} />
        </Stats>
        <Campo label="Presión neta mínima de diseño" unit={U.u.presion} ayuda={AYUDA.minimo}>
          <span style={{ fontFamily: MONO }}>{U.n.presion(P_MINIMA)}</span>
        </Campo>
        {cyr.figura && reduccionPared(geoN.theta).aplica ? (
          <Campo label="Reducción de los (GC_p) de pared" ayuda={AYUDA.reduccion}>
            <span style={{ fontFamily: MONO }}>× 0,90 (θ ≤ 10°)</span>
          </Campo>
        ) : null}
      </Card>

      <Card titulo="Zonas" fig={figDeCubierta(cyr)}
        desc="Salen de la misma regla que usa el cálculo, no de un dibujo aparte."
        acciones={
          <div style={{ display: "flex", gap: t.md, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: t.sm, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" checked={!!d.cyr.sombrear}
                onChange={(e) => setCyR("sombrear")(e.target.checked)} />
              Sombrear zonas<Ayuda>{AYUDA.sombrear}</Ayuda>
            </label>
            <label style={{ display: "flex", gap: t.sm, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" checked={!!d.cyr.parapeto}
                onChange={(e) => setCyR("parapeto")(e.target.checked)} />
              Parapeto de 1 m o más en todo el perímetro<Ayuda>{AYUDA.parapeto}</Ayuda>
            </label>
          </div>}>
        {cyr.geoZonas.layout
          ? <ZonasCyR cyr={cyr} geo={geoN} sombrear={!!d.cyr.sombrear} />
          : <Vacio titulo="Sin figura aplicable"
              desc="La geometría declarada no corresponde a ninguna figura implementada." />}
        {/* ── LOS ANCHOS, COMO TABLA ────────────────────────────────────────
            En el dibujo entran las cotas que caben; acá entran TODAS, incluidas las que en
            esta planta quedan fuera de escala. Es lo que se transcribe al plano de
            revestimiento y de correas, así que tiene que poder copiarse renglón a renglón
            en vez de leerse de un croquis. */}
        <Tabla minWidth={480}>
          <thead><tr>
            <Th>Zona</Th><Th>Qué mide</Th><Th>Expresión</Th>
            <Th alinear="right">Medida</Th>
          </tr></thead>
          <tbody>
            {[["cubierta", cotasDeZona(cyr.geoZonas)],
              ["pared", cotasDeZona({ ...cyr.geoZonas, layout: LAYOUT.PARED })]]
              .flatMap(([sup, filas]) => filas.map((k, i) => (
                <tr key={`${sup}-${i}`}>
                  <Td><Zona z={k.zona} /></Td>
                  <Td>{sup === "pared" ? "Pared — " : ""}{k.que}</Td>
                  <Td><span style={{ fontFamily: MONO }}>{k.simbolo}</span></Td>
                  <TdN>{k.valor2 != null
                    ? `${U.n.longitud(k.valor)} × ${U.n.longitud(k.valor2)} ${U.u.longitud}`
                    : k.hasta != null ? `${U.n.longitud(k.desde)} a ${U.longitud(k.hasta)}`
                      : k.desde != null ? `más de ${U.longitud(k.desde)}`
                        : k.valor != null ? U.longitud(k.valor) : "—"}</TdN>
                </tr>
              )))}
          </tbody>
        </Tabla>
        <Nota>
          Convención: <b>p positiva empuja hacia la superficie</b> y p negativa se aleja de
          ella (nota 3 de las figuras). El croquis informa: el cálculo se hace igual para
          todas las zonas de la figura.
        </Nota>
      </Card>

      {/* ── LAS CURVAS QUE SE ESTÁN USANDO ────────────────────────────────────
          Card propia y no un adorno del croquis: el croquis dice DÓNDE está cada zona y
          esto dice CUÁNTO vale, que es la otra mitad del capítulo. Las series salen del
          motor, así que lo que se dibuja es la curva que entró en la cuenta —con la
          reducción del 10 % y las sustituciones de parapeto ya aplicadas— y no la de la
          figura. */}
      {cyr.figura ? (
        <Card titulo="Curvas (GC_p) usadas" fig={figDeCubierta(cyr)}
          desc="Los mismos puntos de quiebre que lee el motor, no un juego de datos aparte.
            El eje vertical va invertido —succión arriba— como en las figuras del capítulo.">
          {[["cubierta", `Cubierta — Fig. ${cyr.figura}`],
            ["pared", "Paredes — Fig. 5.3-1"]].map(([sup, tit]) => {
            const series = curvasUsadas(cyr.ctx, sup);
            const els = cyr.elementos
              .filter(e => !e.sinFigura && e.superficie === sup)
              .map(e => ({ nombre: e.elemento.nombre, A: e.area.A }));
            const notas = [...new Map(series.filter(x => x.nota)
              .map(x => [x.nota, x])).values()];
            return (
              <div key={sup} style={{ marginBottom: t.lg }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: c.txt,
                  marginBottom: t.xs }}>{tit}</div>
                <CurvasCyR series={series} elementos={els} titulo={tit} />
                {notas.length ? (
                  <Nota>
                    En trazos, la curva de la figura; en trazo lleno, la que usa el
                    cálculo. {notas.map(n => `${n.ref}: ${n.nota}`).join(" · ")}.
                  </Nota>
                ) : null}
              </div>
            );
          })}
          {/* La figura completa, INLINE y no en tooltip: acá el trabajo es comparar dos
              gráficos, y para eso hay que tener los dos a la vista al mismo tiempo. */}
          {figDeCubierta(cyr) ? (
            <Acordeon titulo={`Figura del reglamento — ${figDeCubierta(cyr).titulo}`}
              resumen="Para comparar el gráfico de arriba contra el escaneo.">
              <img src={`figuras/${figDeCubierta(cyr).archivo}.png`} loading="lazy"
                alt={figDeCubierta(cyr).titulo}
                style={{ width: "100%", display: "block", background: c.papel,
                  border: `1px solid ${c.border}`, borderRadius: 6 }} />
              <Nota>{figDeCubierta(cyr).nota}</Nota>
            </Acordeon>
          ) : null}
        </Card>
      ) : null}

      <Card titulo="Elementos"
        desc="El (GC_p) se lee con el área efectiva de viento; la presión se aplica sobre el
          área tributaria real (C 1.2). La app muestra las dos."
        acciones={<Boton onClick={agregar}>Agregar elemento</Boton>}>
        {elementosCyR.length === 0
          ? <Vacio titulo="No hay elementos cargados"
              desc="Agregá la correa, el larguero o la chapa que querés verificar."
              accion={<Boton onClick={agregar}>Agregar elemento</Boton>} />
          : <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 620 }}>
                <EncabezadoLista />
                {elementosCyR.map((el, i) => (
                  <FilaElemento key={el.id ?? i} el={el} res={cyr.elementos[i]}
                    set={setEl(i)} setVarios={setVarios(i)} quitar={quitar(i)} />
                ))}
              </div>
            </div>}
      </Card>

      {cyr.elementos.map((r, i) => (
        <Card key={r.elemento.id ?? i}
          titulo={r.elemento.nombre || `Elemento ${i + 1}`}
          desc={r.sinFigura ? "Sin figura aplicable: no se calculan presiones."
            : `${r.superficie === "pared" ? "Pared" : "Cubierta"} · A = ${U.area(r.area.A)}`
              + ` · área tributaria ${U.area(r.area.tributaria)}`
              + (r.area.tributaria > AREA_SPRFV ? " · supera los 65 m² del art. 5.2.3" : "")}
          acciones={r.sinFigura ? <Badge tono="error">sin figura</Badge> : (
            <div style={{ display: "flex", gap: t.sm }}>
              <Badge tono="neutro">gobierna +: <Zona z={r.gobierna.pos} /></Badge>
              <Badge tono="neutro">gobierna −: <Zona z={r.gobierna.neg} /></Badge>
              {r.minimoGobiernaAlgo ? <Badge tono="aviso">mínimo art. 5.2.2</Badge> : null}
            </div>)}>
          {r.sinFigura ? null : (
            <>
              {filtro !== "todas" ? (
                <Nota>Filtro de vista: sólo la zona {filtro}. El cálculo se hizo igual para
                  todas las zonas de la figura, y la zona gobernante de arriba las compara
                  a todas.</Nota>
              ) : null}
              <Tabla minWidth={560}>
                <thead><tr>
                  <Th>Zona</Th>
                  <Th alinear="right">(GC_p)+</Th><Th alinear="right">(GC_p)−</Th>
                  <Th alinear="right">p+ [{U.u.presion}]</Th>
                  <Th alinear="right">p− [{U.u.presion}]</Th>
                  <Th>Observación</Th>
                </tr></thead>
                <tbody>
                  {r.zonas.filter(z => visible(z.zona)).map((z) => {
                    const gob = z.zona === r.gobierna.pos || z.zona === r.gobierna.neg;
                    return (
                      <tr key={z.zona}>
                        <Td peso={gob ? 700 : 400}><Zona z={z.zona} /></Td>
                        <TdN>{z.gcpPos.toFixed(2).replace(".", ",")}</TdN>
                        <TdN>{z.gcpNeg.toFixed(2).replace(".", ",")}</TdN>
                        <TdN peso={z.zona === r.gobierna.pos ? 700 : 400}>
                          {U.n.presion(z.pPos)}</TdN>
                        <TdN peso={z.zona === r.gobierna.neg ? 700 : 400}>
                          {U.n.presion(z.pNeg)}</TdN>
                        <Td>{z.gobiernaMinimo.pos || z.gobiernaMinimo.neg
                          ? `mínimo del art. 5.2.2 en ${z.gobiernaMinimo.pos
                            && z.gobiernaMinimo.neg ? "los dos sentidos"
                            : z.gobiernaMinimo.pos ? "el sentido positivo" : "el negativo"}`
                          : ""}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Tabla>
            </>
          )}
          {r.avisos.map((a, j) => (
            <Aviso key={j} tono={a.nivel === "error" ? "error" : "info"} titulo={a.ref}>
              {a.texto}</Aviso>
          ))}
        </Card>
      ))}

      {/* El alero adosado va al FINAL y detrás de su propia casilla: es otra tipología del
          mismo capítulo, con su propia expresión y sin presión interna. Arriba, entre los
          elementos de la envolvente, invitaría a leer sus coeficientes como si salieran de
          las figuras 5.3. */}
      <AleroAdosado />

      <Card titulo="Vista" desc="Filtra la tabla; no cambia ningún número.">
        <Campo label="Mostrar sólo la zona" ayuda={AYUDA.zona}>
          <Sel v={filtro} set={setCyR("zonaVista")}
            opciones={zonasVista.map(z => [z, z === "todas" ? "Todas las zonas" : `Zona ${z}`])} />
        </Campo>
      </Card>
    </>
  );
}
