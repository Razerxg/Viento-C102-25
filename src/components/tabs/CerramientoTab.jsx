// CERRAMIENTO — la clasificación del art. 1.10, calculada a partir de las aberturas.
//
// ── POR QUÉ ES UNA PANTALLA Y NO UN DESPLEGABLE ─────────────────────────────────
// Entre «cerrado» y «parcialmente cerrado» hay un factor de TRES en la presión interna
// —±0,18 contra ±0,55— y en una cubierta liviana eso decide el levantamiento. Pedirlo como
// un dato de cuatro opciones dejaba al proyectista sin forma de saber si la que eligió era
// la que correspondía, y la sensibilidad es poco intuitiva: UNA puerta que pueda quedar
// abierta vuelve parcialmente cerrado a un galpón, y DOS —una en cada pared opuesta— lo
// devuelven a parcialmente abierto, porque la segunda equilibra la presión.
//
// Va después de Edificio porque las áreas brutas salen de la geometría: el hastial y el
// trapecio de las paredes, y el área INCLINADA de la cubierta.
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { TIPOS_ABERTURA, PAREDES, UMBRAL_DETRITUS } from '../../engine/cerramiento.js';
import { CERRAMIENTOS, PRIORIDAD_ABIERTO, MODOS_RI } from '../../constants/presionInterna.js';
import { Encabezado, Card, Campo, Num, Sel, Salida, Aviso, Nota, Tabla, Acordeon,
  Divisor, Boton, Badge, Th, Td, TdN } from '../ui.jsx';
import { c, SP, t, TONO } from '../tokens.js';
import { f } from '../../lib/formato.js';

const SUPERFICIES = [...PAREDES.map(p => [p.id, p.nombre]), ["cubierta", "Cubierta"]];
const estiloTexto = { padding: "6px 8px", borderRadius: 6 };

/** Un renglón de la lista de aberturas. */
function FilaAbertura({ ab, i, set, quitar, superficies }) {
  const tipo = TIPOS_ABERTURA.find(x => x.id === ab.tipo);
  const campo = (k) => (v) => set(i, k, v);
  return (
    <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, padding: SP.md,
      marginBottom: SP.sm, background: c.raised }}>
      <div style={{ display: "flex", gap: SP.sm, alignItems: "center", marginBottom: SP.sm }}>
        <input className="vw-in" type="text" style={{ ...estiloTexto, flex: 1, minWidth: 120 }}
          value={ab.nombre ?? ""} placeholder="Nombre — p. ej. portón de acceso"
          onChange={e => campo("nombre")(e.target.value)} />
        <Boton variante="secundario" onClick={() => quitar(i)}>Quitar</Boton>
      </div>
      <Campo label="Superficie">
        <Sel v={ab.superficie} set={campo("superficie")} w={180}
          opciones={superficies} />
      </Campo>
      <Campo label="Tipo" ayuda="El criterio de cada tipo viene del reglamento. La app pregunta lo que el reglamento deja al proyectista, en vez de suponerlo.">
        <Sel v={ab.tipo} set={campo("tipo")} w={420}
          opciones={TIPOS_ABERTURA.map(x => [x.id, x.label])} />
      </Campo>
      <Nota>{tipo?.detalle}</Nota>
      <Campo label="Ancho" unit="m"><Num v={ab.ancho} set={campo("ancho")} w={90} /></Campo>
      <Campo label="Alto" unit="m"><Num v={ab.alto} set={campo("alto")} w={90} /></Campo>
      <Campo label="…o área directa" unit="m²"
        ayuda="Si se carga, manda sobre ancho × alto. Sirve para rejillas y conjuntos de rendijas, donde medir el área es más directo que las dimensiones.">
        <Num v={ab.area} set={campo("area")} w={90} />
      </Campo>
      <Campo label="Cantidad"><Num v={ab.cantidad} set={campo("cantidad")} w={70} /></Campo>

      {tipo?.pregunta && (
        <label style={{ display: "flex", gap: SP.sm + 2, alignItems: "flex-start",
          padding: `${SP.sm}px 0`, cursor: "pointer" }}>
          <input type="checkbox"
            checked={!!(ab.tipo === "operable" ? ab.abiertaEnDiseno : ab.protegida)}
            onChange={e => campo(ab.tipo === "operable" ? "abiertaEnDiseno" : "protegida")(e.target.checked)}
            style={{ width: 16, height: 16, marginTop: 2, accentColor: c.azul, cursor: "pointer" }} />
          <span style={{ ...t.body, lineHeight: 1.6 }}>{tipo.pregunta}</span>
        </label>
      )}
      {ab.tipo === "vidriado" && (
        <label style={{ display: "flex", gap: SP.sm + 2, alignItems: "flex-start",
          padding: `${SP.sm}px 0`, cursor: "pointer" }}>
          <input type="checkbox" checked={!!ab.exencionAltura}
            onChange={e => campo("exencionAltura")(e.target.checked)}
            style={{ width: 16, height: 16, marginTop: 2, accentColor: c.azul, cursor: "pointer" }} />
          <span style={{ ...t.body, lineHeight: 1.6 }}>
            Exceptuado por altura: a más de <b style={{ color: c.txt }}>20 m</b> del terreno
            y a más de <b style={{ color: c.txt }}>10 m</b> por encima de cubiertas con
            grava o balasto dentro de un radio de 450 m (art. 1.10.3).
          </span>
        </label>
      )}
    </div>
  );
}

export function CerramientoTab() {
  const { d, set, setSub, setD, cerr, geoN } = useProyecto();
  const calculado = d.cerrModo === "calculado";

  const setAb = (i, k, v) => setD(x => ({
    ...x, aberturas: x.aberturas.map((a, j) => (j === i ? { ...a, [k]: v } : a)) }));
  const agregar = () => setD(x => ({ ...x, aberturas: [...x.aberturas, {
    nombre: "", superficie: "X+", tipo: "operable", ancho: "", alto: "", area: "",
    cantidad: "1", abiertaEnDiseno: true }] }));
  const quitar = (i) => setD(x => ({ ...x, aberturas: x.aberturas.filter((_, j) => j !== i) }));

  const det = cerr.detritus;

  return (
    <>
      <Encabezado titulo="Cerramiento"
        desc="Arts. 1.2, 1.10 y 1.11. De acá sale GC_pi, que entre «cerrado» y
          «parcialmente cerrado» cambia por un factor de tres. Las áreas brutas salen de la
          geometría del edificio; las aberturas, de esta pantalla." />

      <Card titulo="Cómo se determina">
        <Campo label="Modo"
          ayuda="Los proyectos nuevos arrancan en «calculado». Los guardados antes de que esta pantalla existiera quedan en «declarado», para no pisar en silencio la clasificación que su autor eligió a mano.">
          <Sel v={d.cerrModo} set={set("cerrModo")} w={300}
            opciones={[["calculado", "Calculado a partir de aberturas"],
              ["declarado", "Declarado por el proyectista"]]} />
        </Campo>

        {!calculado && <>
          <Campo label="Clasificación declarada">
            <Sel v={d.cerramiento} set={set("cerramiento")} w={240}
              opciones={CERRAMIENTOS.map(x => [x.id, x.label])} />
          </Campo>
          <Campo label="Fundamento"
            ayuda="Obligatorio en modo declarado: una clasificación que cambia la presión interna por un factor de tres no puede quedar sin justificar.">
            <input className="vw-in" type="text" style={{ ...estiloTexto, width: 340 }}
              value={d.cerrFundamento} placeholder="p. ej. relevamiento de obra, doc. XX rev. A"
              onChange={e => set("cerrFundamento")(e.target.value)} />
          </Campo>
          {!String(d.cerrFundamento ?? "").trim() && (
            <Aviso tono="error" titulo="Falta el fundamento">
              En modo declarado hay que decir en qué se funda la clasificación.
            </Aviso>
          )}
        </>}

        <Divisor>Resultado</Divisor>
        <Salida label="Clasificación" v={cerr.label} />
        <Salida label="Coeficiente de presión interna GC_pi"
          v={`±${f(Math.abs(cerr.gcpi), 2)}`} />
        <Nota>{cerr.motivo}</Nota>
        {/* En modo declarado también se muestra qué habría dado el cálculo: es el dato
            que permite decidir si la declaración se sostiene. */}
        {!calculado && d.aberturas.length > 0 && (
          <Nota>
            Con las aberturas cargadas, el cálculo daría{" "}
            <b style={{ color: c.txt }}>
              {CERRAMIENTOS.find(x => x.id === cerr.calculada)?.label}</b>.{" "}
            {cerr.motivoCalculado}
          </Nota>
        )}

        {cerr.discrepa && (
          <Aviso tono="aviso" titulo="Los dos modos no coinciden">
            Las aberturas cargadas dan <b style={{ color: c.txt }}>
            {CERRAMIENTOS.find(x => x.id === cerr.calculada)?.label}</b> y la
            clasificación declarada dice <b style={{ color: c.txt }}>
            {CERRAMIENTOS.find(x => x.id === cerr.declarada)?.label}</b>. Son dos lecturas
            del mismo edificio: una de las dos está mal, y conviene resolverlo antes de
            seguir.
          </Aviso>
        )}

        {cerr.efectiva === "abierto" && (
          <Aviso tono="error" titulo="Edificio abierto — los resultados NO son válidos">
            El capítulo 2 resuelve los edificios abiertos con los coeficientes C_N de las
            Figuras 2.4-4 a 2.4-7, que todavía no están implementados.
          </Aviso>
        )}
      </Card>

      {/* ── REGIÓN CON DETRITUS ────────────────────────────────────────────────── */}
      <Card titulo="Región con detritus arrastrados por el viento"
        desc="Art. 1.10.3.1. Decide si los vidriados y los portones de enrollar se
          consideran ABIERTOS, y con eso puede dar vuelta la clasificación entera.">
        <label style={{ display: "flex", gap: SP.sm + 2, alignItems: "flex-start",
          padding: `${SP.sm}px 0`, cursor: "pointer" }}>
          <input type="checkbox" checked={!!d.cerr.esSalud}
            onChange={e => setSub("cerr")("esSalud")(e.target.checked)}
            style={{ width: 16, height: 16, marginTop: 2, accentColor: c.azul, cursor: "pointer" }} />
          <span style={{ ...t.body, lineHeight: 1.6 }}>
            Es una <b style={{ color: c.txt }}>instalación de salud</b>. ⚠ Cambia el mapa
            con el que se evalúa: categoría II y categoría III que NO sea salud van por la
            Figura 1.5-1A; las instalaciones de salud de categoría III y la categoría IV,
            por la 1.5-1B.
          </span>
        </label>
        <Campo label="Distancia a la línea costera" unit="m"
          ayuda={`Segunda vía de la condición: V ≥ ${UMBRAL_DETRITUS.Vcosta} m/s a menos de ${UMBRAL_DETRITUS.distanciaCosta} m de la costa. Vacío = tierra adentro.`}>
          <Num v={d.cerr.distanciaCosta} set={setSub("cerr")("distanciaCosta")} />
        </Campo>
        {det.porDeclaracion && (
          <label style={{ display: "flex", gap: SP.sm + 2, alignItems: "flex-start",
            padding: `${SP.sm}px 0`, cursor: "pointer" }}>
            <input type="checkbox" checked={!!d.cerr.detritusDeclarada}
              onChange={e => setSub("cerr")("detritusDeclarada")(e.target.checked)}
              style={{ width: 16, height: 16, marginTop: 2, accentColor: c.azul, cursor: "pointer" }} />
            <span style={{ ...t.body, lineHeight: 1.6 }}>
              Declaro que el sitio <b style={{ color: c.txt }}>está en región con
              detritus</b>, leído del mapa de la figura que corresponde.
            </span>
          </label>
        )}
        <Salida label={`V de la Figura 1.5-1${det.figura}`} unit="m/s"
          v={det.V == null ? "— (sitio fuera de la tabla)" : f(det.V, 1)} />
        <Salida label="¿Región con detritus?"
          v={det.esRegion ? "Sí" : "No"} />
        <Nota>{det.motivo}</Nota>
      </Card>

      {/* ── ABERTURAS ──────────────────────────────────────────────────────────── */}
      <Card titulo="Aberturas"
        desc="Por superficie: las cuatro paredes y la cubierta. La cubierta es UNA sola
          superficie —nunca se supone a barlovento— así que los lucernarios y la
          ventilación de cumbrera van todos juntos."
        acciones={<Boton variante="primario" onClick={agregar}>Agregar abertura</Boton>}>
        {d.aberturas.length === 0 && (
          <Nota>
            Sin aberturas cargadas, el edificio da CERRADO. Conviene cargar al menos las
            puertas y portones que puedan quedar abiertos durante el viento de diseño: es
            lo que más cambia el resultado.
          </Nota>
        )}
        {d.aberturas.map((ab, i) => (
          <FilaAbertura key={i} ab={ab} i={i} set={setAb} quitar={quitar}
            superficies={SUPERFICIES} />
        ))}

        {cerr.evaluadas.length > 0 && (
          <Acordeon titulo="Cuál cuenta como abertura, y por qué">
            <Tabla minWidth={620}>
              <thead><tr>
                <Th>Abertura</Th><Th>Superficie</Th><Th alinear="right">Área (m²)</Th>
                <Th>¿Cuenta?</Th><Th>Motivo</Th><Th>Artículo</Th>
              </tr></thead>
              <tbody>
                {cerr.evaluadas.map((a, i) => (
                  <tr key={i}>
                    <Td>{a.nombre || "—"}</Td>
                    <Td tono={c.txt3} nowrap>{a.superficie}</Td>
                    <TdN>{f(a.area, 2)}</TdN>
                    <Td tono={a.cuenta ? TONO.error.fg : c.txt3}>{a.cuenta ? "Sí" : "No"}</Td>
                    <Td tono={c.txt3}>{a.motivo}</Td>
                    <Td tono={c.txt3} nowrap>{a.ref}</Td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </Acordeon>
        )}
      </Card>

      {/* ── LA VERIFICACIÓN, PARED POR PARED ───────────────────────────────────── */}
      <Card titulo="Verificación pared por pared"
        desc="Art. 1.10.2: cada pared se supone A BARLOVENTO, una por vez, y se compara
          contra el resto de la envolvente, cubierta incluida.">
        <Tabla minWidth={760}>
          <thead><tr>
            <Th>Pared</Th><Th>Forma</Th>
            <Th alinear="right">A_g</Th><Th alinear="right">A_o</Th>
            <Th alinear="right">A_oi</Th><Th alinear="right">A_gi</Th>
            {["Cerrado", "Abierto", "P. cerrado (1)", "P. cerrado (2)"].map(x =>
              <Th key={x}>{x}</Th>)}
          </tr></thead>
          <tbody>
            {cerr.filas.map(fila => {
              const gob = fila.id === cerr.gobierna;
              const fondo = gob ? c.azulBg : undefined;
              return (
                <tr key={fila.id}>
                  <Td peso={gob ? 600 : 400} fondo={fondo} nowrap>{fila.nombre}</Td>
                  <Td tono={c.txt3} fondo={fondo}>{fila.forma}</Td>
                  <TdN fondo={fondo}>{f(fila.Ag, 1)}</TdN>
                  <TdN fondo={fondo}>{f(fila.Ao, 2)}</TdN>
                  <TdN fondo={fondo}>{f(fila.Aoi, 2)}</TdN>
                  <TdN fondo={fondo}>{f(fila.Agi, 1)}</TdN>
                  {fila.condiciones.map(cd => (
                    <Td key={cd.id} fondo={fondo} tono={c.txt3}>
                      <span style={{ color: cd.cumple ? TONO.ok.fg : c.txt3,
                        fontWeight: cd.cumple ? 600 : 400 }}>
                        {cd.cumple ? "✓" : "✗"}
                      </span>{" "}
                      {f(cd.izq, 2)} {cd.id === "abierto" ? "≥" : cd.id === "cerrado" ? "≤" : ">"} {f(cd.der, 2)}
                      {cd.id === "pc2" && ` · A_oi/A_gi = ${f(cd.rel, 3)}`}
                    </Td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </Tabla>
        <Nota>
          Las cuatro condiciones son las del art. 1.2: cerrado <b>A_o ≤ mín(0,01·A_g ;
          0,4 m²)</b> · abierto <b>A_o ≥ 0,8·A_g</b> · parcialmente cerrado <b>A_o &gt;
          1,10·A_oi</b> y <b>A_o &gt; mín(0,4 m² ; 0,01·A_g)</b> con <b>A_oi/A_gi ≤ 0,20</b>.
          Áreas en m². {cerr.gobierna && <>La fila resaltada es la que gobierna.</>}
        </Nota>

        <Divisor>Envolvente</Divisor>
        <Salida label="Área bruta total A_g" unit="m²" v={f(cerr.AgTotal, 1)} />
        <Salida label="Área total de aberturas A_og" unit="m²" v={f(cerr.AogTotal, 2)}
          ayuda="Cubierta incluida. Es el área que entra en la expresión (1.11-1) de R_i." />
        <Salida label="Área de cubierta" unit="m²"
          v={f(cerr.superficies.find(s => s.id === "cubierta")?.Ag ?? 0, 1)}
          ayuda="Es el área INCLINADA, no la proyectada: con una sola pendiente θ vale a·b/cosθ, porque las proyecciones de los faldones cubren la planta exactamente." />
      </Card>

      {/* ── R_i ────────────────────────────────────────────────────────────────── */}
      {cerr.efectiva === "parc_cerrado" && (
        <Card titulo="Reducción por gran volumen interior — R_i"
          desc="Expresión (1.11-1). Sólo aplica a parcialmente cerrados: un volumen grande
            no alcanza a presurizarse al ritmo de la ráfaga.">
          <Campo label="Volumen interno V_i" unit="m³"
            ayuda="Vacío = el volumen geométrico exacto del edificio. Editable porque el artículo habla del volumen NO DIVIDIDO.">
            <Num v={d.cerr.Vi} set={setSub("cerr")("Vi")} ph={f(cerr.ViAuto, 0)} w={130} />
          </Campo>
          <Aviso tono="info" titulo="V_i es el volumen NO DIVIDIDO">
            Con cielorraso hermético o tabiques estancos, se toma sólo el volumen del
            recinto que tiene la abertura dominante. Achicarlo es lo conservador: un V_i
            menor da un R_i mayor, o sea más presión interna.
          </Aviso>
          <Salida label="Volumen geométrico del edificio" unit="m³" v={f(cerr.ViAuto, 0)}
            ayuda="Exacto, no planta × altura media: en cuatro aguas el atajo sobreestima el volumen, y un V_i mayor da un R_i menor, o sea del lado inseguro." />
          <Salida label="R_i de la expresión (1.11-1)" v={f(cerr.Ri ?? 1, 4)}
            ayuda="Lo que da la expresión. Si abajo se adopta 1,0, este número queda como referencia y NO entra al cálculo." />
          <Nota>
            R_i = 0,5·(1 + 1/√(1 + V_i/(6950·A_og))). Vale 1,0 cuando el volumen es chico
            frente a las aberturas, y baja hasta 0,5 en el límite.
          </Nota>

          {/* ── QUÉ R_i SE APLICA ─────────────────────────────────────────────────
              ⚠ DURANTE UN TIEMPO SE MOSTRABA Y NO SE APLICABA: la pantalla informaba
              R_i = 0,9327 y las presiones se calculaban con ±0,55 en vez de ±0,513. Las
              dos cosas son defendibles por separado —adoptar 1,0 es admisible— pero
              juntas la pantalla se contradecía a sí misma. */}
          <Divisor>Cuál se aplica</Divisor>
          <Campo label="R_i adoptado"
            ayuda="El art. 1.11.1 admite adoptar 1,0 en cualquier caso. Adoptar la expresión reduce la presión interna y es una decisión del proyectista.">
            <Sel v={cerr.modoRi} set={setSub("cerr")("modoRi")} w={300}
              opciones={MODOS_RI.map(x => [x.id, x.label])} />
          </Campo>
          <Nota>{MODOS_RI.find(x => x.id === cerr.modoRi)?.nota}</Nota>
          <Salida label="R_i aplicado" v={f(cerr.RiAplicado, 4)} />
          <Salida label="GC_pi de tabla" v={`±${f(Math.abs(cerr.gcpiTabla), 2)}`}
            ayuda="Tabla 1.11-1, sin reducir." />
          <Salida label="GC_pi aplicado" v={`±${f(Math.abs(cerr.gcpi), 4)}`}
            ayuda="Es el que entra en p = q·G·C_p − q_i·(GC_pi) en todas las pantallas, en las resultantes, en la envolvente y en lo que se exporta." />
          {cerr.modoRi === "uno" && cerr.Ri != null && cerr.Ri < 1 && (
            <Aviso tono="info" titulo="R_i calculado pero NO aplicado">
              La expresión (1.11-1) da <b style={{ color: c.txt }}>{f(cerr.Ri, 4)}</b> y se
              está adoptando <b style={{ color: c.txt }}>1,0</b>, que es lo conservador y lo
              que el art. 1.11.1 admite. La presión interna queda un{" "}
              {f((1 / cerr.Ri - 1) * 100, 1)} % por encima de la que daría la expresión.
            </Aviso>
          )}
          {cerr.modoRi === "expresion" && cerr.Ri != null && (
            <Aviso tono="aviso" titulo="Se está reduciendo la presión interna">
              GC_pi baja de ±{f(Math.abs(cerr.gcpiTabla), 2)} a{" "}
              ±{f(Math.abs(cerr.gcpi), 4)} por la expresión (1.11-1). La reducción depende
              de <b style={{ color: c.txt }}>V_i</b>, que es un dato declarado: conviene que
              el volumen cargado sea el del recinto que tiene la abertura dominante y no el
              del edificio entero.
            </Aviso>
          )}
        </Card>
      )}

      {/* ── LA EXPLICACIÓN ─────────────────────────────────────────────────────── */}
      <Card titulo="Cómo se clasifica">
        <Acordeon titulo="Qué es una abertura — art. 1.2 y C 1.10" abierto>
          {/* ⚠ EL TEXTO ANTERIOR DECÍA «lo que define a una abertura es que deje pasar el
              aire» Y ESO ES LA MITAD DE LA DEFINICIÓN. La otra mitad —«que se consideran
              abiertos durante el viento de diseño»— es justamente la que decide si un
              portón cerrado cuenta o no, que es la pregunta que esta pantalla tiene que
              resolver. Va el texto literal del artículo. */}
          <Nota>
            Art. 1.2: <b style={{ color: c.txt }}>«vanos u orificios en la envolvente del
            edificio que permiten el flujo de aire a través de dicha envolvente y que se
            consideran “abiertos” durante el viento de diseño»</b>.
          </Nota>
          <Nota>
            El C 1.10 enumera: <b style={{ color: c.txt }}>puertas, ventanas operables,
            tomas de aire, rendijas alrededor de puertas, rendijas deliberadas en el
            revestimiento y persianas operables</b>. No hay un tamaño mínimo.
          </Nota>
          <Aviso tono="info" titulo="Lo que hay que decidir, y no es el tamaño">
            Una puerta o un portón <b style={{ color: c.txt }}>diseñados para la presión
            del Capítulo 5 y que se mantienen cerrados durante el viento de diseño NO son
            abertura</b> (art. 1.10.2.1). Las dos condiciones van juntas: un portón que
            resiste pero que queda abierto por operación sí lo es, y uno que se cierra pero
            no está verificado, también. Esa decisión es de proyecto y de uso, no de
            geometría, y por eso cada abertura de la lista de arriba la pregunta.
          </Aviso>
        </Acordeon>

        <Acordeon titulo="El procedimiento: cada pared supuesta a barlovento — art. 1.10.2">
          <Nota>
            No se clasifica el edificio de una vez: se toma <b style={{ color: c.txt }}>una
            pared por vez</b>, se la supone a barlovento, y se comparan sus aberturas
            (A_o) contra las del resto de la envolvente (A_oi), cubierta incluida. El
            edificio queda clasificado por la pared más desfavorable. Por eso la tabla de
            arriba tiene cuatro filas y no una.
          </Nota>
        </Acordeon>

        <Acordeon titulo="Las cuatro definiciones y la prioridad del art. 1.10.5">
          <Tabla minWidth={520}>
            <thead><tr>
              <Th>Clasificación</Th><Th>Criterio</Th><Th>Presión interna</Th>
              <Th alinear="right">GC_pi</Th>
            </tr></thead>
            <tbody>
              {CERRAMIENTOS.map(x => {
                const on = x.id === cerr.efectiva;
                return (
                  <tr key={x.id}>
                    <Td peso={on ? 600 : 400} fondo={on ? c.azulBg : undefined}>{x.label}</Td>
                    <Td tono={c.txt2} fondo={on ? c.azulBg : undefined}>{x.criterio}</Td>
                    <Td tono={c.txt2} fondo={on ? c.azulBg : undefined}>{x.presion}</Td>
                    <TdN peso={on ? 600 : 400} fondo={on ? c.azulBg : undefined}>±{f(x.gcpi, 2)}</TdN>
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
          <Nota>
            <b style={{ color: c.txt }}>{PRIORIDAD_ABIERTO}</b> Las dos definiciones no son
            excluyentes, y sin la regla dos proyectistas sacarían GC_pi de 0,00 y de 0,55
            para el mismo edificio. El C 1.2 da como ejemplo de{" "}
            <b style={{ color: c.txt }}>parcialmente abierto</b> un estacionamiento
            abierto, que va con ±0,18.
          </Nota>
        </Acordeon>

        <Acordeon titulo="Región con detritus, vidriados y portones">
          <Nota>
            <b style={{ color: c.txt }}>Art. 1.10.3.1.</b> Es región con detritus donde
            V ≥ {UMBRAL_DETRITUS.V} m/s, o donde V ≥ {UMBRAL_DETRITUS.Vcosta} m/s a menos
            de {UMBRAL_DETRITUS.distanciaCosta} m de la línea costera.
            <br /><br />
            <b style={{ color: c.txt }}>Art. 1.10.3 — vidriados.</b> En región con detritus
            y categorías II a IV, los vidriados se consideran ABIERTOS salvo que estén
            protegidos según el art. 1.10.3.2. Excepción: los que están a más de 20 m del
            terreno y a más de 10 m por encima de cubiertas con grava o balasto dentro de
            un radio de 450 m.
            <br /><br />
            <b style={{ color: c.txt }}>Art. 1.10.4 — portones.</b> Los de enrollar y los
            seccionales exigen ensayo de impacto de proyectiles y diseño según el Capítulo
            5. En categorías I y II se puede omitir esa verificación, y entonces el portón
            se considera abierto.
          </Nota>
        </Acordeon>

        <Acordeon titulo="Galpones y hangares con grandes portones — C 1.11">
          <Nota>
            El comentario recomienda considerarlos <b style={{ color: c.txt }}>parcialmente
            cerrados</b> aun con los portones cerrados, por las fugas de aire alrededor de
            ellos. Es una recomendación del comentario, no una regla del articulado, así
            que la app no la aplica sola: queda a criterio del proyectista cargar esas
            fugas como abertura permanente.
          </Nota>
        </Acordeon>

        <Acordeon titulo="La sensibilidad: una puerta cambia el resultado" abierto>
          <Nota>
            En un galpón, <b style={{ color: c.txt }}>una sola puerta</b> que pueda quedar
            abierta durante el viento de diseño lo vuelve{" "}
            <Badge tono="error">parcialmente cerrado</Badge> con GC_pi = ±0,55.{" "}
            <b style={{ color: c.txt }}>Dos puertas</b>, una en cada pared opuesta, lo
            devuelven a <Badge tono="neutro">parcialmente abierto</Badge> con ±0,18: la
            segunda equilibra la presión, y ninguna pared llega a cumplir A_o &gt; 1,10·A_oi.
            <br /><br />
            Es un factor de tres en la presión interna, y es la decisión de proyecto que
            más pesa de toda la app. Por eso esta pantalla muestra la cuenta y no sólo el
            resultado.
          </Nota>
        </Acordeon>
      </Card>
    </>
  );
}
