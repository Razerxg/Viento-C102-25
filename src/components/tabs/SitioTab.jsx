// SITIO — todo lo que no depende de la forma del edificio.
//
// Van juntos porque son los datos que se sacan de la ubicación y del entorno: la
// velocidad básica, la rugosidad del terreno, la altitud y la clasificación de
// cerramiento. Antes estaban en una columna de 300 px junto al edificio, con los selects
// apretados a ancho completo y el mapa metido entre dos campos.
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { CIUDADES, factorV } from '../../constants/velocidades.js';
import { ORIGENES_V, FUNDAMENTOS_V } from '../../engine/velocidad.js';
import { EXPOSICIONES, TERRENO } from '../../constants/exposicion.js';
import { MapaVelocidad } from '../MapaVelocidad.jsx';
import { CroquisTopografia } from '../svg/CroquisTopografia.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { FORMAS_TOPO, CONDICIONES_KZT } from '../../constants/topografia.js';
import { DIRECCIONES } from '../../engine/edificio.js';
import { Encabezado, Card, Campo, Num, Sel, Salida, Aviso, Nota, Tabla, Acordeon,
  Divisor, Boton, Th, Td, TdN } from '../ui.jsx';
import { c, SP, t, TONO } from '../tokens.js';
import { FIGURAS } from '../../constants/figuras.js';
import { f, fmt } from '../../lib/formato.js';
import { num } from '../../lib/parseo.js';
import { kz } from '../../engine/presionDinamica.js';

const EXPLICA_EXPOSICION = {
  B: "Áreas urbanas y suburbanas, zonas boscosas o con obstrucciones cercanas del tamaño "
    + "de viviendas unifamiliares o mayores. Tiene que mantenerse en el sector de "
    + "barlovento por 800 m o 20 veces la altura del edificio, lo que sea mayor.",
  C: "Terreno abierto con obstrucciones dispersas de altura menor a 9 m. Incluye campo "
    + "abierto y pradera. Es la exposición en la que está definida la velocidad básica.",
  D: "Superficies planas y sin obstrucciones: barros salinos, lagos y áreas costeras. "
    + "Aplica también tierra adentro cuando el sector de barlovento es agua o llanura lisa.",
};

// El campo de documento es texto libre, no un número: usa el mismo estilo de input que
// el resto para que no se vea como un elemento ajeno.
const estiloTexto = { padding: "6px 8px", borderRadius: 6 };

export function SitioTab() {
  const { d, set, setTopo, setSub, V, vel, sitio, geoN, act, topo, topoBase,
    cerr, irA } = useProyecto();
  const { tema } = useUi();
  const t_ = d.topo;
  const terr = TERRENO[d.exposicion];

  return (
    <>
      <Encabezado titulo="Sitio"
        desc="La velocidad básica sale de la localidad y de la categoría de riesgo; la
          rugosidad del terreno y la altitud corrigen la presión dinámica; el cerramiento
          fija la presión interna." />

      <Card titulo="Velocidad básica del viento"
        desc="Art. 1.5. El 102-2025 eliminó el factor de importancia y lo reemplazó por tres
          mapas, uno por período de retorno, así que la categoría de riesgo cambia V
          directamente en vez de multiplicarla después.">
        {/* ── QUÉ ROL CUMPLE LA LOCALIDAD, SEGÚN EL ORIGEN DE V ───────────────
            ⚠ ANTES ERA SIEMPRE «Localidad» Y SIEMPRE SE USABA. Interpolando entre
            isotacas, el sitio está fuera de la tabla POR DEFINICIÓN, y si en el
            desplegable había quedado «Neuquén» la comparación contra el mapa y la región
            con detritus salían de Neuquén. Ahora el campo cambia de nombre y de efecto
            junto con el origen, en vez de quedar ahí pareciendo un dato inocuo. */}
        {d.origenV === "interpolado" ? (
          <Aviso tono="info" titulo="Sin localidad: el sitio está fuera de la tabla">
            Interpolando entre isotacas, la <b style={{ color: c.txt }}>V interpolada ES la
            lectura del mapa</b>: no hay ninguna ciudad contra la cual contrastarla. Para la
            región con detritus, la V del sitio se lleva a la Figura 1.5-1A por la
            proporción entre mapas de la C 1.5-6.1.
          </Aviso>
        ) : (
          <Campo label={d.origenV === "manual" ? "Ciudad de referencia (mapa)" : "Localidad"}
            ayuda={d.origenV === "manual"
              ? "Sólo para contrastar la V adoptada contra el mapa y para evaluar la región con detritus. Con «sin referencia» no se compara contra ninguna ciudad y la región con detritus pasa a ser una declaración."
              : "Las 29 ciudades de la tabla de la Figura 1.5-1D. Si el sitio no está, se elige «fuera de la tabla» y V sale de una de las otras tres vías."}>
            <Sel v={d.ciudad} set={set("ciudad")} w={260}
              opciones={[["", d.origenV === "manual" ? "— Sin referencia —"
                : "— Sitio fuera de la tabla —"], ...CIUDADES.map(([n]) => [n, n])]} />
          </Campo>
        )}
        <Campo label="Categoría de riesgo"
          ayuda="Tabla 1.14-1. I son construcciones de bajo riesgo para la vida humana; II es el caso general; III y IV son las de gran ocupación y las esenciales, y comparten el mapa de 1.700 años.">
          <Sel v={d.riesgo} set={set("riesgo")} opciones={["I", "II", "III", "IV"]} w={100} />
        </Campo>
        {/* ⚠ ES LA DECISIÓN QUE ELIGE EL MAPA. La Tabla 1.14-1 clasifica por uso,
            ocupación y materiales peligrosos, y de ahí sale qué figura de velocidad se
            lee: entre categoría II y IV hay un período de retorno distinto y una V
            distinta para el mismo sitio. Un desplegable de cuatro opciones sin fundamento
            es la decisión más pesada del cálculo tomada sin registro. */}
        <Campo label="Fundamento de la categoría"
          ayuda="Uso y ocupación de la construcción, y si hay materiales peligrosos. Va a la memoria: es lo que permite revisar por qué se leyó ese mapa y no otro.">
          <input className="vw-in" type="text" style={{ padding: "6px 8px", borderRadius: 6, width: 360 }}
            value={d.riesgoFundamento ?? ""}
            placeholder="p. ej. depósito sin ocupación permanente, sin materiales peligrosos"
            onChange={e => set("riesgoFundamento")(e.target.value)} />
        </Campo>
        {!String(d.riesgoFundamento ?? "").trim() && (
          <Aviso tono="aviso" titulo="Falta el fundamento de la categoría de riesgo">
            La Tabla 1.14-1 clasifica por uso, ocupación y materiales peligrosos, y de esa
            clasificación sale <b style={{ color: c.txt }}>qué mapa de velocidad se lee</b>.
            Entre categoría II y IV hay un período de retorno distinto y una V distinta
            para el mismo sitio.
          </Aviso>
        )}

        {/* ── DE DÓNDE SALE V ──────────────────────────────────────────────────
            V es el dato de entrada de todo el cálculo —la presión va con V²— y antes la
            única vía era la tabla. Quien tenía una especificación del comitente, un sitio
            fuera de la tabla o un estudio regional no tenía dónde ponerlo, así que lo
            forzaba eligiendo la ciudad «más parecida». */}
        <Campo label="Origen de V" ayuda="Art. 1.5. Las cuatro vías que el reglamento admite. En todas se muestra la V de referencia del mapa para la categoría elegida, y la diferencia.">
          <Sel v={d.origenV} set={set("origenV")} w={340}
            opciones={ORIGENES_V.map(o => [o.id, o.label])} />
        </Campo>
        <Nota>{ORIGENES_V.find(o => o.id === d.origenV)?.detalle}</Nota>

        {d.origenV === "interpolado" && <>
          <Divisor>Isotacas adyacentes</Divisor>
          <Nota>
            Nota 2 de las Figuras 1.5-1 A-C. Sólo importa la PROPORCIÓN entre las dos
            distancias, así que pueden ir en kilómetros o en milímetros medidos sobre el
            mapa impreso.
          </Nota>
          <Campo label="Isotaca 1 — velocidad V₁" unit="m/s">
            <Num v={d.vInterp.V1} set={setSub("vInterp")("V1")} />
          </Campo>
          <Campo label="Distancia del sitio a la isotaca 1 — d₁">
            <Num v={d.vInterp.d1} set={setSub("vInterp")("d1")} />
          </Campo>
          <Campo label="Isotaca 2 — velocidad V₂" unit="m/s">
            <Num v={d.vInterp.V2} set={setSub("vInterp")("V2")} />
          </Campo>
          <Campo label="Distancia del sitio a la isotaca 2 — d₂">
            <Num v={d.vInterp.d2} set={setSub("vInterp")("d2")} />
          </Campo>
        </>}

        {d.origenV === "manual" && <>
          <Divisor>Valor adoptado</Divisor>
          <Campo label="Velocidad adoptada V" unit="m/s">
            <Num v={d.vManual.V} set={setSub("vManual")("V")} />
          </Campo>
          <Campo label="Fundamento"
            ayuda="Obligatorio. Es lo que decide si adoptar una V menor que la del mapa está permitido: sólo el art. 1.5.3 lo habilita.">
            <Sel v={d.vManual.fundamento} set={setSub("vManual")("fundamento")} w={420}
              opciones={[["", "— Elegir —"], ...FUNDAMENTOS_V.map(x => [x.id, x.label])]} />
          </Campo>
          {d.vManual.fundamento && (
            <Nota>{FUNDAMENTOS_V.find(x => x.id === d.vManual.fundamento)?.detalle}</Nota>
          )}
          {FUNDAMENTOS_V.find(x => x.id === d.vManual.fundamento)?.pideDocumento && (
            <Campo label="Documento y revisión"
              ayuda="Una V es trazable sólo si se sabe de qué documento salió y en qué revisión.">
              <input className="vw-in" type="text" style={{ width: 300, ...estiloTexto }}
                value={d.vManual.documento}
                placeholder="p. ej. ESP-CIV-001 rev. B"
                onChange={e => setSub("vManual")("documento")(e.target.value)} />
            </Campo>
          )}
        </>}

        {d.origenV === "v50" && <>
          <Divisor>Conversión desde el CIRSOC 102-2005</Divisor>
          <Nota>
            Expresión (C 1.5-6.1): <b style={{ color: c.txt }}>V = V₅₀·√(1,5·I)</b>, con
            I = 0,87 · 1,00 · 1,15 para categorías I · II · III-IV. Es la misma expresión
            con la que se construyó la Figura 1.5-1D, así que convertir el V₅₀ de una
            ciudad tabulada devuelve exactamente su fila.
          </Nota>
          <Campo label="V₅₀ de la especificación" unit="m/s"
            ayuda="Velocidad del CIRSOC 102-2005, para 50 años de recurrencia. NO es la V del 2025.">
            <Num v={d.vConv.V50} set={setSub("vConv")("V50")} />
          </Campo>
          <Salida label="Factor √(1,5·I)" v={f(factorV(d.riesgo), 4)} />
        </>}

        <Divisor>Velocidad adoptada</Divisor>
        <Salida label="Velocidad básica V" v={f(V, 1)} unit="m/s"
          ayuda="Ráfaga de 3 segundos a 10 m sobre el terreno, en exposición C, asociada al período de retorno de la categoría de riesgo." />
        <Salida label="V de referencia del mapa" unit="m/s"
          v={vel.referencia == null ? "— (sitio fuera de la tabla)" : f(vel.referencia, 1)}
          ayuda="Figura 1.5-1D para la categoría elegida. Es contra esto que se compara la V adoptada: el art. 1.5.1 permite adoptar una mayor siempre, y una menor sólo por el art. 1.5.3." />
        {vel.dif != null && Math.abs(vel.dif) > 1e-6 && (
          <Salida label="Diferencia contra el mapa"
            v={`${vel.dif > 0 ? "+" : ""}${f(vel.dif, 1)} %`} />
        )}
        {vel.cuenta && <Nota>{vel.cuenta} = <b style={{ color: c.txt }}>{f(V, 2)} m/s</b></Nota>}

        {vel.avisos.map((a, i) => (
          <div key={i} style={{ marginTop: SP.sm }}>
            <Aviso tono={a.tono} titulo={a.ref}>
              {a.texto}
              {a.lista && (
                <ul style={{ margin: `${SP.sm}px 0 0`, paddingLeft: 18 }}>
                  {a.lista.map((x, k) => <li key={k} style={{ marginBottom: 4 }}>{x}</li>)}
                </ul>
              )}
            </Aviso>
          </div>
        ))}

        <div style={{ marginTop: SP.md }}>
          <MapaVelocidad riesgo={d.riesgo} ciudad={d.ciudad} V={V} fmt={`${f(V, 1)} m/s`} />
        </div>
      </Card>

      <Card titulo="Terreno"
        desc="Art. 1.7. La categoría A del 102-2005 ya no existe: el comité concluyó que los
          centros urbanos densos tienen una variabilidad demasiado grande para
          caracterizarlos con una categoría, y remite al túnel de viento.">
        {/* La ayuda dice qué ES el campo; la nota de abajo, qué significa la categoría
            ELEGIDA. Poner el mismo texto en los dos lados —que es como estaba— hace que el
            que abre el tooltip sienta que perdió el tiempo, y deja de abrirlos. */}
        <Campo label="Categoría de exposición"
          ayuda="Rugosidad del terreno en el sector de barlovento. Es lo que fija α y z_g, y con ellos todo el perfil de K_z: entre B y D, a 10 m de altura, hay un 68 % de diferencia en la presión dinámica.">
          <Sel v={d.exposicion} set={set("exposicion")} opciones={EXPOSICIONES} w={100} />
        </Campo>
        <Nota>{EXPLICA_EXPOSICION[d.exposicion]}</Nota>

        <Tabla>
          <thead><tr>
            <Th>Parámetro</Th><Th>Símbolo</Th><Th alinear="right">Valor</Th><Th>De dónde sale</Th>
          </tr></thead>
          <tbody>
            {[["Exponente del perfil de ráfaga", "α", f(terr.alfa, 1), "Tabla 1.9-1"],
              ["Altura gradiente", "z_g", `${f(terr.zg, 0)} m`, "Tabla 1.9-1"],
              ["Factor de intensidad de turbulencia", "c", f(terr.c, 2), "Tabla 1.9-1"],
              ["Escala de longitud integral", "ℓ", `${f(terr.l, 0)} m`, "Tabla 1.9-1"],
              ["Altura mínima", "z_mín", `${f(terr.zmin, 1)} m`, "Tabla 1.9-1"],
              ["Coef. de exposición a la altura media",
                "K_h", f(kz(geoN.h, d.exposicion), 3), "Art. 1.13.1"]].map(([nom, sim, v, r]) => (
              <tr key={sim}>
                <Td>{nom}</Td><Td tono={c.txt2}>{sim}</Td><TdN>{v}</TdN><Td tono={c.txt3}>{r}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
        <Nota>
          K_z se evalúa con la expresión de la nota 1 de la Tabla 1.13-1,
          K_z = 2,41·(z/z_g)^(2/α), congelada por debajo de 5 m y topeada en 2,41 por
          encima de z_g. La tabla se guarda igual, como control: si una celda estuviera mal
          transcripta, la fórmula no la reproduce y un test lo detecta.
        </Nota>
      </Card>

      <Card titulo="Altitud y factor topográfico">
        <Campo label="Altitud sobre el nivel del mar" unit="m"
          ayuda="Art. 1.12. Corrige la densidad del aire: K_e = e^(−0,000119·z_g). A 1.000 m sobre el nivel del mar la presión baja un 11 %.">
          <Num v={d.altitud} set={set("altitud")} />
        </Campo>
        <Salida label="Factor de altitud K_e"
          v={f(sitio.usarKe ? Math.exp(-0.000119 * sitio.altitud) : 1, 4)}
          ayuda="La Tabla 1.12-1 y la expresión de su nota 2 difieren hasta 0,007. El reglamento admite las dos; acá se usa la expresión." />
        <Salida label="Presión dinámica en la cubierta q_h" v={fmt.q(act.qh)}
          ayuda="q = 0,613·K_z·K_zt·K_d·K_e·V², expresión (1.13-1), evaluada en z = h. El 0,613 es ½·ρ con ρ = 1,225 kg/m³." />

        {/* La decisión de si el terreno es llano se toma FUERA de la app, con el sitio a
            la vista. Para eso hace falta ver qué llama «loma» y «escarpa» el reglamento y
            con qué tres condiciones, que es justo lo que trae la figura. */}
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          FACTOR TOPOGRÁFICO — art. 1.8
          Era 1,0 fijo. Es el multiplicador que más puede cambiar el resultado de toda
          la app: llega a 3,15, más del triple de presión.
          ══════════════════════════════════════════════════════════════════════ */}
      <Card titulo="Factor topográfico K_zt" fig={FIGURAS["1.8-1"]}
        desc="Art. 1.8. Aceleración del viento sobre lomas, escarpas y colinas aisladas. Cuando
          da 1,0 el motivo queda escrito: no es lo mismo que suponer terreno llano.">
        <Campo label="Accidente topográfico"
          ayuda="Loma y escarpa bidimensionales o colina tridimensional axialsimétrica. Cada forma tiene su propio K1/(H/Lh), su γ y su μ.">
          <Sel v={t_.forma} set={setTopo("forma")} w={280}
            opciones={[["", "Sin accidente — terreno llano"],
              ...FORMAS_TOPO.map(x => [x.id, x.label])]} />
        </Campo>

        {t_.forma && <>
          <Campo label="Altura del accidente H" unit="m" fig={FIGURAS["1.8-1"]}
            ayuda="Diferencia de elevación entre la cresta y el terreno a barlovento. Condición 3 del art. 1.8.1: H ≥ 5 m en exposición C y D, ó H ≥ 20 m en B.">
            <Num v={t_.H_m} set={setTopo("H_m")} step="0.5" />
          </Campo>
          <Campo label="Distancia a media altura L_h" unit="m" fig={FIGURAS["1.8-1"]}
            ayuda="⚠ NO es la base del cerro. Es la distancia A BARLOVENTO desde la cresta hasta donde la elevación del terreno es igual a la MITAD de H. Condición 2: H/Lh ≥ 0,20.">
            <Num v={t_.Lh_m} set={setTopo("Lh_m")} step="1" />
          </Campo>
          <Campo label="Distancia desde la cresta x" unit="m"
            ayuda="Medida DESDE LA CRESTA, no desde el pie. Su valor absoluto entra en K2; de qué lado está se declara aparte, porque cambia μ.">
            <Num v={t_.x_m} set={setTopo("x_m")} step="1" />
          </Campo>
          <Campo label="Lado de la cresta"
            ayuda="Cambia μ sólo en la escarpa: a sotavento μ = 4 y a barlovento μ = 1,5, porque la estela de aceleración se extiende hacia atrás. En loma y colina es 1,5 de los dos lados.">
            <Sel v={t_.lado} set={setTopo("lado")} w={180}
              opciones={[["barlovento", "A barlovento"], ["sotavento", "A sotavento"]]} />
          </Campo>

          <Divisor>Condición cualitativa</Divisor>
          {/* Es la condición 1 del art. 1.8.1 y NO hay expresión que la decida: la confirma
              el proyectista mirando el emplazamiento. Sin ella, K_zt = 1,0. */}
          <label style={{ display: "flex", gap: SP.sm + 2, alignItems: "flex-start",
            padding: `${SP.sm}px 0`, cursor: "pointer" }}>
            <input type="checkbox" checked={!!t_.cond1}
              onChange={e => setTopo("cond1")(e.target.checked)}
              style={{ width: 16, height: 16, marginTop: 2, accentColor: c.azul, cursor: "pointer" }} />
            <span style={{ ...t.body, lineHeight: 1.6 }}>
              Confirmo que la estructura se localiza <b style={{ color: c.txt }}>en la mitad
              superior de la loma o colina, o cerca de la cresta de la escarpa</b>{" "}
              (art. 1.8.1, condición 1). Es cualitativa: no hay expresión que la decida.
            </span>
          </label>

          <Divisor>Método de cálculo</Divisor>
          <Campo label="Método" ayuda="El art. 1.8.2 permite expresiones o tablas indistintamente. Por defecto expresiones; la memoria indica cuál se usó.">
            <Sel v={t_.metodo} set={setTopo("metodo")} w={220}
              opciones={[["expresiones", "Expresiones (1.8-1)"],
                ["tabla", "Tablas de la Figura 1.8-1"]]} />
          </Campo>

          <Divisor>Direcciones en que se aplica</Divisor>
          <label style={{ display: "flex", gap: SP.sm + 2, alignItems: "flex-start",
            padding: `${SP.sm}px 0`, cursor: "pointer" }}>
            <input type="checkbox" checked={!!t_.todasLasDirecciones}
              onChange={e => setTopo("todasLasDirecciones")(e.target.checked)}
              style={{ width: 16, height: 16, marginTop: 2, accentColor: c.azul, cursor: "pointer" }} />
            <span style={{ ...t.body, lineHeight: 1.6 }}>
              Aplicar K_zt a <b style={{ color: c.txt }}>todas las direcciones</b>. Los
              multiplicadores suponen viento en la dirección de máxima pendiente (nota 3),
              así que usarlos en las cuatro es <b style={{ color: c.txt }}>conservador</b>.
            </span>
          </label>
          {!t_.todasLasDirecciones && (
            <Campo label="Direcciones con efecto"
              ayuda="Las demás quedan con K_zt = 1,0. Corresponde declarar aquellas en que el viento sopla en la dirección de máxima pendiente del accidente.">
              <div style={{ display: "flex", gap: 2, padding: 2, background: c.canvas,
                border: `1px solid ${c.border}`, borderRadius: 8 }}>
                {DIRECCIONES.map(dir => {
                  const on = (t_.direcciones ?? []).includes(dir.id);
                  return (
                    <button key={dir.id} type="button" aria-pressed={on}
                      onClick={() => setTopo("direcciones")(on
                        ? t_.direcciones.filter(x => x !== dir.id)
                        : [...(t_.direcciones ?? []), dir.id])}
                      style={{ padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                        border: `1px solid ${on ? c.borderFuerte : "transparent"}`,
                        background: on ? c.raised : "transparent",
                        color: on ? c.txt : c.txt3, fontWeight: on ? 600 : 500,
                        fontSize: 13 }}>{dir.id}</button>
                  );
                })}
              </div>
            </Campo>
          )}
        </>}

        <Divisor>Resultado</Divisor>
        {/* K_zt NO es un número: K3 decae con la altura, así que el factor es máximo al
            ras del suelo. Mostrar uno solo —como hacía la versión con campo «z de
            evaluación»— hace creer que el edificio entero recibe ese valor. */}
        <Salida label="K_zt al nivel del terreno" v={f(topoBase.kzt, 4)}
          ayuda="z = 0. Es el MÁXIMO de todo el perfil: K3 = e^(−γ·z/Lh) vale 1 en el terreno y baja con la altura." />
        <Salida label="K_zt en la cubierta — K_zt(h)" v={f(topo.kzt, 4)}
          ayuda="Evaluado a la altura media de cubierta. Es el que multiplica a q_h, o sea a sotavento, laterales y cubierta." />
        {topo.aplica && <>
          <Salida label="K1 — forma del accidente" v={f(topo.K1, 4)}
            ayuda="No depende de la altura: es el mismo en todo el perfil." />
          <Salida label="K2 — distancia a la cresta" v={f(topo.K2, 4)}
            ayuda="Tampoco depende de la altura." />
          <Salida label="K3 en la cubierta" v={f(topo.K3, 4)}
            ayuda="Es el único de los tres que varía con z, y el que hace que K_zt no sea un número sino un perfil." />
        </>}
        {topo.aplica && (
          <Nota>
            La pared a barlovento se resuelve <b style={{ color: c.txt }}>tramo a
            tramo</b>: en cada uno se evalúa K_z·K_zt en las dos cotas y se adopta la
            mayor. No alcanza con el extremo superior —que es lo que gobierna sin
            topografía, porque K_z crece con z— ya que por debajo de z_mín K_z queda
            congelado mientras K_zt sigue creciendo hacia abajo. Qué extremo gobierna cada
            tramo está en la tabla de cargas.
          </Nota>
        )}

        {!topo.aplica && <Aviso tono="aviso" titulo="K_zt = 1,0">{topo.motivo}</Aviso>}

        {/* Las tres condiciones, cada una con su estado. Con una sola, el usuario corrige
            esa y se encuentra con la siguiente. */}
        {t_.forma && (
          <div style={{ marginTop: SP.md }}>
            {topo.condiciones.map(cond => (
              <div key={cond.id} style={{ display: "flex", gap: SP.sm + 2, padding: "5px 0",
                alignItems: "flex-start" }}>
                <span aria-hidden style={{ width: 7, height: 7, borderRadius: 999, marginTop: 6,
                  flexShrink: 0, background: cond.cumple ? TONO.ok.fg : TONO.error.fg }} />
                <span style={{ ...t.body, flex: 1 }}>
                  <b style={{ color: c.txt2 }}>{cond.ref}</b> — {cond.texto}
                  {cond.valor != null && <span style={{ color: c.txt3 }}>
                    {" "}(actual: {f(cond.valor, cond.id === "pendiente" ? 3 : 1)})</span>}
                </span>
              </div>
            ))}
          </div>
        )}

        {topo.aplica && topo.avisos.filter(a => a.tono !== "info").map((a, i) => (
          <div key={i} style={{ marginTop: SP.sm }}>
            <Aviso tono={a.tono} titulo={a.ref}>{a.texto}</Aviso>
          </div>
        ))}

        {t_.forma && num(t_.H_m) > 0 && num(t_.Lh_m) > 0 && (
          <div style={{ marginTop: SP.md }}>
            <CroquisTopografia forma={t_.forma} H_m={t_.H_m} Lh_m={t_.Lh_m}
              x_m={t_.x_m} z_m={geoN.h} etiquetaZ="h" lado={t_.lado}
              fmt={fmt} tema={tema} />
          </div>
        )}

        {topo.aplica && (
          <Acordeon titulo="Cómo se obtuvo cada multiplicador">
            <Tabla minWidth={520}>
              <thead><tr>
                <Th>Multiplicador</Th><Th alinear="right">Valor</Th>
                <Th>Cómo salió</Th><Th>Puntos de tabla usados</Th>
              </tr></thead>
              <tbody>
                {["K1", "K2", "K3"].map(k => {
                  const tr = topo.trazas[k];
                  return (
                    <tr key={k}>
                      <Td nowrap>{k}</Td>
                      <TdN>{f(tr.valor, 4)}</TdN>
                      <Td tono={c.txt3}>{tr.nota ?? (tr.interpolado
                        ? "interpolado linealmente en la tabla (nota 1)" : "punto de tabla")}</Td>
                      <Td tono={c.txt3} nowrap>{tr.puntos.length
                        ? tr.puntos.map(pt => `(${f(pt.x, 2)} ; ${f(pt.y, 2)})`).join(" — ")
                        : "—"}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabla>
            <Nota>
              Método: <b style={{ color: c.txt }}>{topo.metodo === "tabla"
                ? "tablas de la Figura 1.8-1" : "expresiones (1.8-1)"}</b> ·
              μ = {f(topo.mu, 1)} · H/Lh = {f(topo.HLh, 3)}
              {topo.empinado && <> (se adopta {f(topo.HLh_ef, 2)} y L_h pasa a{" "}
                {f(topo.Lh_ef_m, 2)} m, nota 2)</>}.
              <br /><br />
              {topo.avisos.filter(a => a.tono === "info").map((a, i) => (
                <span key={i}><b style={{ color: c.txt2 }}>{a.ref}</b> — {a.texto}<br /><br /></span>
              ))}
            </Nota>
          </Acordeon>
        )}
      </Card>

      {/* ── CERRAMIENTO: SÓLO EL RESUMEN ────────────────────────────────────────
          La clasificación dejó de ser un desplegable y pasó a calcularse a partir de las
          aberturas, que dependen de la geometría del edificio. Por eso vive en su propia
          pantalla, después de Edificio, y acá queda lo que hace falta ver sin salir de
          Sitio: qué clasificación gobierna y con qué GC_pi. */}
      <Card titulo="Clasificación de cerramiento"
        desc="Art. 1.10 y Tabla 1.11-1. Entre «cerrado» y «parcialmente cerrado» hay un
          factor de tres en la presión interna, y en una cubierta liviana eso decide el
          levantamiento."
        acciones={<Boton onClick={() => irA("Cerramiento")}>Abrir Cerramiento →</Boton>}>
        <Salida label="Clasificación" v={cerr.label}
          ayuda={cerr.modo === "calculado"
            ? "Calculada a partir de las aberturas declaradas, con el procedimiento del art. 1.10.2."
            : "Declarada por el proyectista. El modo se cambia en la pantalla Cerramiento."} />
        <Salida label="Modo"
          v={cerr.modo === "calculado" ? "Calculado a partir de aberturas" : "Declarado"} />
        <Salida label="Coeficiente de presión interna GC_pi"
          v={`±${f(Math.abs(act.GCpi), cerr.RiAplicado === 1 ? 2 : 4)}`}
          ayuda={cerr.RiAplicado === 1
            ? "De la Tabla 1.11-1, con R_i = 1,0 (art. 1.11.1)."
            : `De la Tabla 1.11-1 (±${f(Math.abs(cerr.gcpiTabla), 2)}), reducido por R_i = ${f(cerr.RiAplicado, 4)} de la expresión (1.11-1).`} />
        {cerr.Ri != null && (
          <Salida label="Factor de reducción R_i"
            v={`${f(cerr.RiAplicado, 4)}${cerr.modoRi === "uno"
              ? ` — la expresión daría ${f(cerr.Ri, 4)}, no aplicado` : " — expresión (1.11-1)"}`}
            ayuda="Sólo aplica a parcialmente cerrados. Cuál se adopta se elige en la pantalla Cerramiento." />
        )}
        <Nota>{cerr.motivo}</Nota>
      </Card>

    </>
  );
}
