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
  Boton, Stat, Stats, Vacio } from '../ui.jsx';
import { c, t, MONO } from '../tokens.js';
import { U } from '../../lib/unidades.js';
import { ZonasCyR, COLOR_ZONA } from '../svg/ZonasCyR.jsx';
import { TIPOS_LISTA, ETIQUETA_TIPO, TIPO_ELEMENTO } from '../../engine/cyrElementos.js';
import { P_MINIMA } from '../../engine/cyrPresiones.js';

// `Sel` toma pares [valor, texto]: no un objeto {id, label}. Pasarle el objeto renderiza
// «[object Object]» en el mejor caso y revienta en React en el peor, que es lo que hizo.
const SUPERFICIES = [["cubierta", "Cubierta"], ["pared", "Pared"]];

/** Los tipos que piden luz y separación; el resto pide un área. */
const PIDE_LS = new Set([TIPO_ELEMENTO.CHAPA, TIPO_ELEMENTO.CORREA,
  TIPO_ELEMENTO.LARGUERO, TIPO_ELEMENTO.MONTANTE]);

const nuevoId = () => `cyr-${Math.random().toString(36).slice(2, 8)}`;

function Zona({ z }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: COLOR_ZONA[z],
        border: `1px solid ${c.borde}` }} />
      <span style={{ fontFamily: MONO }}>{z}</span>
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
  const est = { fontSize: 11, color: c.tenue, textTransform: "uppercase", letterSpacing: .4 };
  return (
    <div style={{ display: "grid", gridTemplateColumns: COLS, gap: t.sm, padding: "0 4px 4px" }}>
      <span style={est}>Nombre</span><span style={est}>Tipo</span>
      <span style={est}>Superficie</span><span style={est}>L / Área</span>
      <span style={est}>s</span><span style={est} />
    </div>
  );
}

function FilaElemento({ el, res, set, quitar }) {
  const pideLS = PIDE_LS.has(el.tipo);
  return (
    <div style={{ padding: "6px 4px", borderTop: `1px solid ${c.borde}` }}>
      <div style={{ display: "grid", gridTemplateColumns: COLS, gap: t.sm, alignItems: "center" }}>
        <Entrada v={el.nombre} set={set("nombre")} />
        <Sel v={el.tipo} set={set("tipo")} w="100%"
          opciones={TIPOS_LISTA.map(id => [id, ETIQUETA_TIPO[id]])} />
        <Sel v={el.superficie} set={set("superficie")} w="100%" opciones={SUPERFICIES} />
        {pideLS
          ? <><Entrada v={el.L} set={set("L")} /><Entrada v={el.s} set={set("s")} /></>
          : <><Entrada v={el.area} set={set("area")} /><span style={{ fontSize: 12,
              color: c.tenue }}>m²</span></>}
        {/* Una «×» y no la palabra: la columna es angosta y «Quitar» se cortaba contra el
            borde de la tarjeta. El título lo dice para quien use lector de pantalla. */}
        <Boton variante="fantasma" onClick={quitar} title="Quitar este elemento">×</Boton>
      </div>
      <div style={{ fontSize: 12, color: c.tenue, fontFamily: MONO, paddingTop: 4 }}>
        {res?.area?.cuenta ?? "—"}
      </div>
    </div>
  );
}

export function CyRTab() {
  const { cyr, geoN, d, setCyR, elementosCyR, setElementosCyR, cerr, kdCyR } = useProyecto();

  const setEl = (i) => (k) => (v) => setElementosCyR(xs =>
    xs.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
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
          <Stat label="Figura de cubierta" valor={cyr.figura ?? "—"} sub={cyr.fuente.porque} />
          <Stat label="Altura de referencia" valor={U.n.longitud(cyr.altura.valor)}
            unidad={U.u.longitud} sub={cyr.altura.porque} />
          <Stat label="q_h" valor={U.n.presion(cyr.qh ?? 0)} unidad={U.u.presion}
            sub={`K_zt = ${cyr.Kzt.toFixed(3).replace(".", ",")} — máximo entre direcciones`} />
          <Stat label="Dimensión a" valor={U.n.longitud(cyr.a.a)} unidad={U.u.longitud}
            sub={`gobierna ${cyr.a.gobierna}`} />
          <Stat label="(GC_pi)" valor={`±${Math.abs(cerr.gcpi).toFixed(3).replace(".", ",")}`}
            sub={cerr.label} />
          <Stat label="K_d" valor={kdCyR.toFixed(2).replace(".", ",")}
            sub="fila «Edificios — componentes y revestimientos»" />
        </Stats>
        <Nota>
          El mínimo del art. 5.2.2 es de {U.presion(P_MINIMA)} netos actuando en cualquier
          dirección normal a la superficie. No es el 0,75 kN/m² del art. 2.1.5, que es del
          SPRFV y se aplica sobre el área proyectada del edificio entero.
        </Nota>
      </Card>

      <Card titulo="Zonas" desc="Salen de la misma regla que usa el cálculo, no de un dibujo aparte."
        acciones={
          <label style={{ display: "flex", gap: t.sm, alignItems: "center", fontSize: 13 }}>
            <input type="checkbox" checked={!!d.cyr.parapeto}
              onChange={(e) => setCyR("parapeto")(e.target.checked)} />
            Parapeto de 1 m o más en todo el perímetro
          </label>}>
        {cyr.geoZonas.layout
          ? <ZonasCyR cyr={cyr} geo={geoN} U={U} />
          : <Vacio titulo="Sin figura aplicable"
              desc="La geometría declarada no corresponde a ninguna figura implementada." />}
        <Nota>
          Convención: <b>p positiva empuja hacia la superficie</b> y p negativa se aleja de
          ella (nota 3 de las figuras). El croquis informa: el cálculo se hace igual para
          todas las zonas de la figura.
        </Nota>
      </Card>

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
                    set={setEl(i)} quitar={quitar(i)} />
                ))}
              </div>
            </div>}
      </Card>

      {cyr.elementos.map((r, i) => (
        <Card key={r.elemento.id ?? i}
          titulo={r.elemento.nombre || `Elemento ${i + 1}`}
          desc={r.sinFigura ? "Sin figura aplicable: no se calculan presiones."
            : `${r.superficie === "pared" ? "Pared" : "Cubierta"} · A = ${U.area(r.area.A)}`
              + ` · área tributaria ${U.area(r.area.tributaria)}`}
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

      <Card titulo="Vista" desc="Filtra la tabla; no cambia ningún número.">
        <Campo label="Mostrar sólo la zona">
          <Sel v={filtro} set={setCyR("zonaVista")}
            opciones={zonasVista.map(z => [z, z === "todas" ? "Todas las zonas" : `Zona ${z}`])} />
        </Campo>
      </Card>
    </>
  );
}
