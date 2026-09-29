// RESULTANTES EN LA BASE — lo que hay que transcribir al modelo estructural.
//
// Las tres magnitudes son las que se le entregan a quien dimensiona la fundación: el corte
// total, el levantamiento y el vuelco. Los números de arriba son de la dirección
// seleccionada; las curvas son la ENVOLVENTE de las cuatro, porque la pregunta que se hace
// en esta pantalla no es «cuánto da» sino «cuánto cambia si subo el alero un metro».
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { CurvasAltura } from '../svg/CurvasAltura.jsx';
import { Encabezado, Card, Stat, Stats, Aviso, Nota, Tabla, Divisor, Salida,
  Acordeon, Campo, Sel, Th, Td, TdN } from '../ui.jsx';
import { c, SP, t } from '../tokens.js';
import { U, unidades, PERFILES } from '../../lib/unidades.js';
import { f, fmt } from '../../lib/formato.js';
import { CASOS_CARGA, CASO_MINIMO, CONDICIONES_247_2, ARTICULOS_247_DECLARADOS,
  DIAFRAGMAS } from '../../engine/envolvente.js';

// ⚠ EL ART. 2.1.5 ESCRIBE SUS MÍNIMOS EN kN/m², y la pantalla usa N/m² en el resto. Un
// formateador propio para esa tabla, con el ENCABEZADO SALIENDO DEL MISMO OBJETO que el
// número: al migrar a `unidades.js` la columna quedó mostrando «750,00» bajo un
// encabezado que decía «kN/m²», porque el encabezado estaba escrito a mano. Es
// exactamente el error que el módulo existe para hacer imposible.
const Umin = unidades({ ...PERFILES.pantalla, presion: "kN/m²" });

const estiloTexto = { padding: "6px 8px", borderRadius: 6 };

/** Una casilla de declaración, con su texto al lado. Es el patrón de toda la app. */
function Casilla({ marcada, set, children }) {
  return (
    <label style={{ display: "flex", gap: SP.sm + 2, alignItems: "flex-start",
      padding: `${SP.sm}px 0`, cursor: "pointer" }}>
      <input type="checkbox" checked={!!marcada} onChange={e => set(e.target.checked)}
        style={{ width: 16, height: 16, marginTop: 2, accentColor: c.azul, cursor: "pointer" }} />
      <span style={{ ...t.body, lineHeight: 1.6 }}>{children}</span>
    </label>
  );
}

/** Cómo se lee un estado de carga en una celda: caso, dirección y qué lo define. */
const rotulo = (e) => e == null ? "—" :
  `Caso ${e.caso} · ${e.dirs.join("+")} · GC_pi ${e.casoInterno === "conInternaPos" ? "+" : "−"}`
  + ` · nota 3 ${e.casoNota3}${e.eSigno ? ` · e ${e.eSigno > 0 ? "+" : "−"}` : ""}`;

export function ResultantesTab() {
  const { act, res, resDe, curvas, todas, geoN, d, set, envCasos, setEnv } = useProyecto();
  const { tema } = useUi();

  // Marcar y desmarcar una condición de una lista de ids declarados.
  const alterna = (campo) => (id) => (marcada) => setEnv(campo)(
    marcada ? [...d.env[campo], id] : d.env[campo].filter(x => x !== id));

  // El máximo de cada magnitud DENTRO de cada caso. Es la tabla que contesta la pregunta
  // que uno se hace mirando la figura: ¿cuál de los cuatro casos gobierna qué?
  const filaDe = (n, label) => {
    const es = envCasos.estados.filter(e => e.caso === n);
    const mx = (k) => es.length ? Math.max(...es.map(e => Math.abs(e[k]))) : null;
    return { n, label, corrido: es.length,
      cortante: mx("cortante"), levantamiento: mx("levantamiento"),
      vuelco: mx("vuelco"), MT: mx("MT") };
  };
  // ⚠ EL CASO DEL ART. 2.1.5 VA EN LA MISMA TABLA. El C 2.1.5 dice que se AGREGA a los
  // casos de carga normal: mostrarlo en una tarjeta aparte, como estaba, obligaba a
  // compararlo a mano contra los otros cuatro.
  const porCaso = [...CASOS_CARGA.map(cs => filaDe(cs.n, cs.label)),
    filaDe(CASO_MINIMO, "Caso 2.1.5 — carga mínima, sólo horizontal")];

  return (
    <>
      <Encabezado titulo={`Resultantes en la base — ${act.dir.label}`}
        desc="Integrando las presiones sobre la envolvente. El corte es la suma de las
          componentes horizontales, el levantamiento la de las verticales y el vuelco el
          momento de todas respecto del nivel de fundación." />

      <Card titulo={`Dirección ${act.dir.id}`}>
        <Stats min={160}>
          <Stat label="Corte total" valor={U.n.fuerza(Math.abs(res.cortante), 1)} unidad={U.u.fuerza}
            ayuda="Suma de las componentes horizontales sobre paredes y cubierta. La presión interna se cancela: actúa por igual sobre barlovento y sotavento." />
          <Stat label="Levantamiento" valor={U.n.fuerza(Math.abs(res.levantamiento), 1)} unidad={U.u.fuerza}
            ayuda="Resultante vertical hacia arriba. Acá la presión interna NO se cancela, y es donde gobierna: con GC_pi positivo empuja la cubierta desde adentro." />
          <Stat label="Vuelco" valor={U.n.momento(Math.abs(res.vuelco), 1)} unidad={U.u.momento}
            sub="respecto del centro de la base"
            ayuda="Momento al nivel de fundación: las fuerzas horizontales por su altura, más el levantamiento de cubierta por su brazo EN PLANTA. Positivo = tiende a levantar el borde de barlovento." />
          <Stat label="Altura de alero" valor={f(geoN.hAlero, 2)} unidad="m"
            sub={`altura media h = ${f(geoN.h, 2)} m`} />
        </Stats>

        {/* ── LA RESULTANTE VERTICAL Y SU BRAZO ───────────────────────────────────
            El vuelco no es sólo las fuerzas horizontales. La succión de cubierta tiene
            brazo EN PLANTA, y en un edificio bajo y largo es el término que más pesa: con
            L = 40 m el brazo llega a 20 m, más que la altura del edificio. */}
        {/* ── QUÉ CASO DE LA NOTA 3 GOBIERNA CADA MAGNITUD ────────────────────────
            Los dos casos del faldón a barlovento son ESTADOS DE CARGA distintos. Antes se
            mezclaban —el corte de uno con el levantamiento del otro— y el vuelco que
            salía no correspondía a ninguno de los dos. */}
        <Nota>
          Caso de la nota 3 que gobierna cada magnitud:{" "}
          <b style={{ color: c.txt }}>corte</b> {res.gobernante.cortante} ·{" "}
          <b style={{ color: c.txt }}>levantamiento</b> {res.gobernante.levantamiento} ·{" "}
          <b style={{ color: c.txt }}>vuelco</b> {res.gobernante.vuelco}. Cada uno sale de
          un estado de carga completo, no de un máximo por componente.
        </Nota>

        <Divisor>Resultante vertical de cubierta</Divisor>
        <Salida label="Levantamiento V" v={U.fuerza(res.verticalCubierta.V)}
          ayuda="Envolvente de los dos casos que exige la nota 3 de la Figura 2.4-1 para el faldón a barlovento." />
        <Salida label="Punto de aplicación x_V" unit="m"
          v={res.verticalCubierta.xV == null ? "—" : f(res.verticalCubierta.xV, 2)}
          ayuda="Medido DESDE EL BORDE DE BARLOVENTO. Es el centroide de las componentes verticales, no el centro geométrico de la cubierta: cada zona tiene su propio Cp." />
        <Salida label="Centro de la base" unit="m" v={f(act.L / 2, 2)}
          ayuda="A la misma escala que x_V: si x_V queda a barlovento del centro, el levantamiento SUMA al vuelco." />

        <Tabla minWidth={520}>
          <thead><tr>
            <Th>Momento respecto de</Th>
            {res.casos.map(cs => <Th key={cs.casoNota3} alinear="right">
              Caso {cs.casoNota3}</Th>)}
            <Th alinear="right">Envolvente (kN·m)</Th><Th>Gobierna</Th>
          </tr></thead>
          <tbody>
            {[["Borde de barlovento", "bordeBarlovento"],
              ["Centro de la base", "centro"],
              ["Borde de sotavento", "bordeSotavento"]].map(([nom, k]) => (
              <tr key={k}>
                <Td nowrap>{nom}</Td>
                {res.casos.map(cs => (
                  <TdN key={cs.casoNota3} tono={c.txt3}>{U.n.momento(cs.momentos[k], 1)}</TdN>
                ))}
                <TdN peso={600}>{U.n.momento(res.momentos[k], 1)}</TdN>
                <Td tono={c.txt3} nowrap>{res.gobernante[k] ?? res.gobernante.vuelco}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
        <Nota>
          Dentro de UN caso, el término horizontal es el mismo en las tres filas —el brazo
          de una fuerza horizontal es su altura, cualquiera sea el punto de la base— y lo
          único que cambia es el brazo en planta del levantamiento. La columna de
          envolvente toma el mayor de los dos casos fila por fila, así que sus tres valores
          pueden venir de casos distintos y no guardan esa relación entre sí.
        </Nota>

        {!res.valido && (
          <div style={{ marginTop: SP.md }}>
            <Aviso tono="error" titulo="Estas resultantes NO son válidas">
              {res.motivoInvalido}
            </Aviso>
          </div>
        )}

        {res.gobiernaNota7 && (
          <div style={{ marginTop: SP.md }}>
            <Aviso tono="info" titulo="Gobierna el piso de la nota 7">
              Las componentes horizontales de la cubierta restaban del corte. La nota 7 de
              la Figura 2.4-1 no admite un corte total menor que el de las paredes solas,
              así que el valor informado es ese mínimo.
            </Aviso>
          </div>
        )}
      </Card>

      {/* ── CASOS DE CARGA — FIGURA 2.4-8 ─────────────────────────────────────────
          Hasta acá la pantalla mostraba UNA dirección con UN signo de GC_pi, y recorrer
          el resto era trabajo del proyectista con el selector. Esto barre todo lo que el
          reglamento exige considerar y dice qué combinación gobierna cada magnitud. */}
      <Card titulo="Casos de carga — Figura 2.4-8"
        desc="Envolvente de 4 direcciones × 2 signos de GC_pi × 2 casos de la nota 3 × los
          casos de la figura, con los dos signos de la excentricidad en los torsionales.
          Cada número de abajo sale de UN estado de carga completo, que se identifica
          debajo del valor.">
        <Stats min={170}>
          <Stat label="Corte máximo" valor={U.n.fuerza(Math.abs(envCasos.cortante.valor), 1)}
            unidad={U.u.fuerza} sub={rotulo(envCasos.cortante.estado)}
            ayuda="En los casos simultáneos las dos componentes son ortogonales y se componen por Pitágoras: el corte de la envolvente puede superar al de cualquier dirección sola." />
          <Stat label="Levantamiento máximo"
            valor={U.n.fuerza(Math.abs(envCasos.levantamiento.valor), 1)}
            unidad={U.u.fuerza} sub={rotulo(envCasos.levantamiento.estado)}
            ayuda="En los casos 3 y 4 la cubierta NO va al 75 %: la nota 2 la deja al 100 % de la mayor presión sobre cada área, considerando las dos direcciones." />
          <Stat label="Vuelco máximo" valor={U.n.momento(Math.abs(envCasos.vuelco.valor), 1)}
            unidad={U.u.momento} sub={rotulo(envCasos.vuelco.estado)} />
          <Stat label="Momento torsor máximo"
            valor={envCasos.conTorsion ? U.n.momento(Math.abs(envCasos.torsion.valor), 1) : "exento"}
            unidad={envCasos.conTorsion ? U.u.momento : undefined}
            tono={envCasos.conTorsion ? undefined : "aviso"}
            sub={envCasos.conTorsion ? rotulo(envCasos.torsion.estado)
              : "casos 2 y 4 exceptuados por el art. 2.4.7"}
            ayuda="M_T = f·(P_W + P_L)·B·e integrado en altura, que es f por la fuerza total de las paredes por la excentricidad. En el caso 4 suman los dos ejes." />
        </Stats>

        <Divisor>Qué caso gobierna qué</Divisor>
        <Tabla minWidth={620}>
          <thead><tr>
            <Th>Caso</Th>
            <Th alinear="right">Corte ({U.u.fuerza})</Th>
            <Th alinear="right">Levantamiento ({U.u.fuerza})</Th>
            <Th alinear="right">Vuelco ({U.u.momento})</Th>
            <Th alinear="right">M_T ({U.u.momento})</Th>
          </tr></thead>
          <tbody>
            {porCaso.map(x => {
              // El máximo de cada COLUMNA se marca: es el caso que gobierna esa magnitud.
              const gob = (k) => x[k] != null
                && x[k] === Math.max(...porCaso.filter(y => y[k] != null).map(y => y[k]));
              const celda = (k, fn) => (
                <TdN peso={gob(k) ? 700 : 400} tono={gob(k) ? c.txt : c.txt2}>
                  {x[k] == null ? "no se verifica" : fn(x[k], 1)}
                </TdN>
              );
              return (
                <tr key={x.n}>
                  <Td>{x.label}</Td>
                  {celda("cortante", U.n.fuerza)}
                  {celda("levantamiento", U.n.fuerza)}
                  {celda("vuelco", U.n.momento)}
                  {celda("MT", U.n.momento)}
                </tr>
              );
            })}
          </tbody>
        </Tabla>
        <Nota>
          Cada celda es el máximo en valor absoluto dentro de ese caso, sobre todas las
          direcciones, los dos signos de GC_pi y los dos casos de la nota 3. El{" "}
          <b style={{ color: c.txt }}>caso 2.1.5</b> es de otro artículo y no de la figura:
          se <b style={{ color: c.txt }}>agrega</b> a los cuatro (C 2.1.5), va sólo en
          horizontal sobre la silueta proyectada, y por eso su levantamiento y su M_T son
          cero. Se barrieron{" "}
          <b style={{ color: c.txt }}>{envCasos.estados.length} estados</b> de carga. El
          caso 4 no es «el 3 más chico»: el 56,3 % baja las paredes pero la cubierta queda
          al 75 % del caso 2, y encima aparece la torsión de los dos ejes a la vez.
        </Nota>

        {/* ── EXENCIÓN DEL ART. 2.4.7 ─────────────────────────────────────────── */}
        <Divisor>Exención de los casos torsionales — art. 2.4.7</Divisor>
        <Nota>
          ⚠ Los casos torsionales aplican <b style={{ color: c.txt }}>a edificios de todas
          las alturas</b>. En el CIRSOC 102-2005 estaban limitados a h &gt; 20 m, así que
          omitirlos en un galpón bajo era correcto con la edición anterior y ya no lo es:
          hoy hace falta la exención de este artículo.
        </Nota>
        {CONDICIONES_247_2.map(cd => (
          <Casilla key={cd.id} marcada={d.env.cond247.includes(cd.id)}
            set={alterna("cond247")(cd.id)}>
            {cd.label} <span style={{ color: c.txt3 }}>({cd.ref})</span>
          </Casilla>
        ))}
        {envCasos.exen.desmentidas.map(x => (
          <Aviso key={x.id} tono="error" titulo="La geometría desmiente la condición">
            {x.contra} La altura media de cubierta del modelo es {f(geoN.h, 2)} m.
          </Aviso>
        ))}
        <Nota>
          ⚠ El texto de los art. 2.4.7.3 a 2.4.7.5 <b style={{ color: c.txt }}>no está
          transcripto</b>: son condiciones sobre la distribución de rigideces y la
          regularidad torsional, que dependen del modelo estructural y no de la envolvente
          que esta app calcula. Se registran como declaración, con el artículo y el
          artículo, para que quien revise la memoria sepa contra qué contrastar.
        </Nota>
        {ARTICULOS_247_DECLARADOS.map(a => (
          <Casilla key={a.id} marcada={d.env.arts247.includes(a.id)}
            set={alterna("arts247")(a.id)}>
            {a.label} <span style={{ color: c.txt3 }}>({a.ref})</span>
          </Casilla>
        ))}
        <Aviso tono={envCasos.exen.exento ? "aviso" : "info"}
          titulo={envCasos.exen.exento ? "Casos 2 y 4 NO verificados"
            : "Se verifican los cuatro casos"}>
          {envCasos.exen.exento
            ? "Con la exención declarada sólo se barren los casos 1 y 3. Si la condición "
              + "no se cumpliera, la torsión quedaría sin verificar y no hay nada en el "
              + "resultado que lo delate."
            : "No se declaró ninguna exención, así que se barren los cuatro casos, los "
              + "dos torsionales incluidos. Es lo conservador."}
        </Aviso>

        {/* ── NOTA 4: CÓMO SE APLICA M_T ──────────────────────────────────────── */}
        <Divisor>Diafragma — nota 4</Divisor>
        <Campo label="Comportamiento del diafragma"
          ayuda="No cambia cuánto vale M_T: cambia si se puede aplicar como momento concentrado o hay que repartirlo como bloque de presión sobre las paredes.">
          <Sel v={d.env.diafragma} set={setEnv("diafragma")} w={240}
            opciones={DIAFRAGMAS.map(x => [x.id, x.label])} />
        </Campo>
        <Nota>{DIAFRAGMAS.find(x => x.id === d.env.diafragma)?.nota}</Nota>
        {envCasos.comoBloque && (
          <Aviso tono="aviso" titulo="M_T no se aplica como momento concentrado">
            El valor informado arriba es correcto como magnitud, pero con este diafragma la
            nota 4 pide aplicarlo como bloque de presión distribuida sobre las paredes con
            presión normal. ⚠ Esa distribución <b style={{ color: c.txt }}>no la arma esta
            app</b>: el reparto depende de los planos resistentes, que son del modelo
            estructural.
          </Aviso>
        )}
        <Nota>
          La <b style={{ color: c.txt }}>nota 3</b> permite omitir las paredes laterales en
          los casos 1 y 2 con diafragma rígido continuo. No cambia estas resultantes: las
          paredes laterales son paralelas al viento y su presión no tiene componente en la
          dirección analizada. Importa para el reparto entre planos resistentes, que es
          del modelo estructural.
        </Nota>

        {/* ── EXCENTRICIDAD ───────────────────────────────────────────────────── */}
        <Divisor>Excentricidad</Divisor>
        <Salida label="Estructura" v={envCasos.flexible ? "flexible (n₁ < 1 Hz)" : "rígida"}
          ayuda="Sale del MISMO criterio que el factor de ráfaga —art. 1.2, n₁ < 1 Hz—, no de una casilla aparte." />
        <Salida label="e según X" unit="m" v={f(0.15 * (act.dir.eje === "X" ? act.B : act.L), 2)} />
        <Salida label="e según Y" unit="m" v={f(0.15 * (act.dir.eje === "X" ? act.L : act.B), 2)} />
        {envCasos.flexible && (
          <Aviso tono="error" titulo="La expresión (2.4-5) no está transcripta">
            En estructuras flexibles la Figura 2.4-8 remite a la expresión (2.4-5), que
            combina la excentricidad elástica con la resonante y necesita e_Q, e_R, g_Q,
            g_R y los factores de respuesta de fondo y resonante del art. 1.9.5 —que hoy no
            son datos del modelo—. Mientras tanto se adopta{" "}
            <b style={{ color: c.txt }}>e = ±0,15·B</b>, que es el valor de estructuras
            rígidas. <b style={{ color: c.txt }}>PUEDE QUEDAR DEL LADO INSEGURO</b>: hay que
            calcular la (2.4-5) aparte y contrastar.
          </Aviso>
        )}
      </Card>

      {/* ── CARGA MÍNIMA — ART. 2.1.5 ──────────────────────────────────────────────
          Es un CASO DE CARGA APARTE, no un piso por cara. Antes había un helper que subía
          cada presión a 0,75 kN/m², que no es lo que dice el artículo —habla del sistema,
          y distingue pared de cubierta— y que además no lo llamaba nadie. */}
      <Card titulo="Carga mínima — art. 2.1.5"
        desc="Caso de carga SEPARADO, que se verifica además de los normales. Se aplica
          sobre las áreas proyectadas en un plano vertical normal al viento.">
        <Salida label={res.cargaMinima.abierto ? "0,75 kN/m² × A_f" : "Área de pared proyectada"}
          unit="m²" v={f(res.cargaMinima.areaPared, 1)} />
        {!res.cargaMinima.abierto && (
          <Salida label="Área de cubierta proyectada" unit="m²"
            v={f(res.cargaMinima.areaCubierta, 1)}
            ayuda="Lo que la silueta agrega POR ENCIMA de la pared a barlovento. Con viento paralelo a la cumbrera el borde del hastial ya ES la línea del techo, así que da cero: la partición no se solapa." />
        )}
        <Salida label="Fuerza mínima" v={U.fuerza(res.cargaMinima.fuerza)}
          ayuda={res.cargaMinima.ref} />
        {/* Sin punto de aplicación, un caso de carga no se puede combinar con nada: no da
            momento en la base y no entra en una envolvente de reacciones. */}
        <Salida label="Punto de aplicación" unit="m"
          v={res.cargaMinima.zBar == null ? "—" : f(res.cargaMinima.zBar, 2)}
          ayuda="Baricentro de las áreas proyectadas, pesado por su presión: la de cubierta está más arriba pero paga 0,40 kN/m² contra 0,75." />
        <Salida label="Momento en la base" v={U.momento(res.cargaMinima.momento)} />
        <Salida label="Corte calculado" v={U.fuerza(Math.abs(res.cortante))} />
        <Tabla minWidth={480}>
          <thead><tr>
            <Th>Área proyectada</Th><Th alinear="right">{Umin.u.area}</Th>
            <Th alinear="right">{Umin.u.presion}</Th>
            <Th alinear="right">z̄ ({Umin.u.longitud})</Th>
            <Th alinear="right">Fuerza ({Umin.u.fuerza})</Th>
            <Th alinear="right">Momento ({Umin.u.momento})</Th>
          </tr></thead>
          <tbody>
            {res.cargaMinima.partes.map(x => (
              <tr key={x.id}>
                <Td>{x.label}</Td>
                <TdN>{Umin.n.area(x.area, 1)}</TdN>
                <TdN tono={c.txt3}>{Umin.n.presion(x.presion, 2)}</TdN>
                <TdN tono={c.txt3}>{x.area > 0 ? Umin.n.longitud(x.zBar) : "—"}</TdN>
                <TdN>{Umin.n.fuerza(x.fuerza, 1)}</TdN>
                <TdN>{Umin.n.momento(x.momento, 1)}</TdN>
              </tr>
            ))}
          </tbody>
        </Tabla>
        <Nota>{res.cargaMinima.nota}</Nota>
        <Aviso tono={res.gobiernaMinimo ? "aviso" : "info"}
          titulo={res.gobiernaMinimo ? "Gobierna la carga mínima" : "Gobierna el cálculo"}>
          {res.gobiernaMinimo
            ? "En esta dirección la carga mínima del art. 2.1.5 supera al corte calculado. "
              + "Es el caso que hay que llevar al modelo."
            : "El corte calculado supera a la carga mínima del art. 2.1.5 en esta dirección."}
          {" "}Gobierna en: <b style={{ color: c.txt }}>{
            todas.filter(t => resDe(t).gobiernaMinimo).map(t => t.dir.id).join(" · ") || "ninguna dirección"
          }</b>.
        </Aviso>
      </Card>

      <Card titulo="Sistema estructural de la cubierta"
        desc="La nota 7 de la Figura 2.4-1 pone un piso al corte: no puede ser menor que el
          de las paredes solas. La EXCEPCIÓN está en la propia nota 7 —«excepto para SPRFVs
          en el techo consistentes en entramados resistentes a momento»— y es una
          declaración del proyectista sobre el sistema, no algo deducible de la geometría.">
        <label style={{ display: "flex", gap: SP.sm + 2, alignItems: "flex-start",
          padding: `${SP.sm}px 0`, cursor: "pointer" }}>
          <input type="checkbox" checked={d.porticosCubierta === true}
            onChange={e => set("porticosCubierta")(e.target.checked)}
            style={{ width: 16, height: 16, marginTop: 2, accentColor: c.azul, cursor: "pointer" }} />
          <span style={{ ...t.body, lineHeight: 1.6 }}>
            El SPRFV de la cubierta consiste en <b style={{ color: c.txt }}>entramados
            resistentes a momento</b>, en los términos de la excepción de la nota 7. Con
            eso, las componentes horizontales de cubierta pueden restar del corte y{" "}
            <b style={{ color: c.txt }}>no se aplica el piso</b>.
          </span>
        </label>
        {res.exentoNota7 && (
          <Aviso tono="aviso" titulo="Piso de la nota 7 NO aplicado">
            Queda declarado que el SPRFV de cubierta consiste en entramados resistentes a
            momento, que es la excepción de la propia nota 7. Sin esa condición, el corte
            informado sería el de las paredes solas.
          </Aviso>
        )}

        {/* ── PISO SOLIDARIO ──────────────────────────────────────────────────────
            La presión interna actúa sobre TODA la envolvente interior, piso incluido. Con
            un piso estructural el empuje sobre la cubierta tiene su reacción sobre el
            piso y el par se autoequilibra. Sin él, no hay nada que lo tome. */}
        <Divisor>Piso</Divisor>
        <label style={{ display: "flex", gap: SP.sm + 2, alignItems: "flex-start",
          padding: `${SP.sm}px 0`, cursor: "pointer" }}>
          <input type="checkbox" checked={d.pisoSolidario === true}
            onChange={e => set("pisoSolidario")(e.target.checked)}
            style={{ width: 16, height: 16, marginTop: 2, accentColor: c.azul, cursor: "pointer" }} />
          <span style={{ ...t.body, lineHeight: 1.6 }}>
            El <b style={{ color: c.txt }}>piso es solidario a la estructura</b> —un
            contenedor, un shelter sobre skid, un módulo—. Con eso la presión interna se
            autoequilibra y <b style={{ color: c.txt }}>no entra en el levantamiento global
            ni en el vuelco</b>. La presión neta sobre la cubierta no cambia.
          </span>
        </label>
        {res.pisoSolidario && (
          <Aviso tono="aviso" titulo="Presión interna autoequilibrada">
            V y el vuelco salen sólo de las presiones EXTERNAS. En un contenedor de 40′ HC
            —12,19 × 2,44 × 2,90 m— esto baja el levantamiento global entre 17 % y 30 % si
            está cerrado, y entre 38 % y 57 % si es parcialmente cerrado. ⚠ Las chapas,
            las correas y sus fijaciones siguen viendo externa ± interna: lo que se
            autoequilibra es la resultante global, no la carga local.
          </Aviso>
        )}

        <Acordeon titulo="Qué se declaró y qué cambió">
          <Tabla minWidth={560}>
            <thead><tr>
              <Th>Declaración</Th><Th>Estado</Th><Th>Artículo</Th><Th>Efecto</Th>
            </tr></thead>
            <tbody>
              {res.trazaDeclaraciones.map(x => (
                <tr key={x.id}>
                  <Td>{x.titulo}</Td>
                  <Td tono={x.declarado ? c.txt : c.txt3}>{x.declarado ? "declarada" : "no"}</Td>
                  <Td tono={c.txt3} nowrap>{x.ref}</Td>
                  <Td tono={c.txt3}>{x.efecto}</Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        </Acordeon>
      </Card>

      <Card titulo="Cómo cambian con la altura de alero"
        desc="Envolvente de las cuatro direcciones, recalculando el edificio completo en cada
          punto. La línea vertical marca el alero actual.">
        <CurvasAltura tema={tema} hActual={geoN.hAlero}
          datos={curvas.map(x => ({ ...x, cortante: U.val.fuerza(x.cortante),
            levantamiento: U.val.fuerza(x.levantamiento), vuelco: U.val.momento(x.vuelco) }))}
          fmt={(n) => f(n, n >= 100 ? 0 : 1)} />
        <Nota>
          No son tres rectas: al subir el alero cambian a la vez el área expuesta, la altura
          media —y con ella q_h—, la relación h/L que elige la fila de la tabla de cubierta,
          y el brazo de palanca. El vuelco crece más rápido que el corte por esa última
          razón.
        </Nota>
      </Card>

      <Card titulo="Las cuatro direcciones"
        desc="Para ver cuál gobierna cada magnitud sin ir cambiando el selector.">
        <Tabla minWidth={480}>
          <thead><tr>
            <Th>Magnitud</Th>
            {todas.map(t => <Th key={t.dir.id} alinear="right">{t.dir.id}</Th>)}
          </tr></thead>
          <tbody>
            {[[`Corte (${U.u.fuerza})`, t => Math.abs(U.val.fuerza(resDe(t).cortante))],
              [`Levantamiento (${U.u.fuerza})`, t => Math.abs(U.val.fuerza(resDe(t).levantamiento))],
              [`Vuelco (${U.u.momento})`, t => Math.abs(U.val.momento(resDe(t).vuelco))]].map(([nom, fn]) => {
              // El máximo de la fila se marca: es la dirección que gobierna esa magnitud, y
              // es justamente el dato que se busca en una tabla de cuatro columnas.
              const vals = todas.map(fn);
              const max = Math.max(...vals);
              return (
                <tr key={nom}>
                  <Td>{nom}</Td>
                  {vals.map((v, i) => (
                    <TdN key={i} peso={v === max ? 700 : 400}
                      tono={v === max ? c.txt : c.txt2}
                      fondo={todas[i].dir.id === act.dir.id ? c.azulBg : undefined}>
                      {f(v, 1)}
                    </TdN>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </Tabla>
        <Nota>
          En negrita, la dirección que gobierna cada magnitud; con fondo, la que está
          seleccionada arriba. Los dos sentidos de un mismo eje sólo coinciden si el edificio
          es simétrico en ese eje: con cubierta a un agua o cumbrera descentrada, no.
        </Nota>
      </Card>
    </>
  );
}
