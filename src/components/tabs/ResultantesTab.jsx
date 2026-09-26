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
  Th, Td, TdN } from '../ui.jsx';
import { c, SP, t } from '../tokens.js';
import { f, fmt } from '../../lib/formato.js';

export function ResultantesTab() {
  const { act, res, resDe, curvas, todas, geoN, d, set } = useProyecto();
  const { tema } = useUi();

  return (
    <>
      <Encabezado titulo={`Resultantes en la base — ${act.dir.label}`}
        desc="Integrando las presiones sobre la envolvente. El corte es la suma de las
          componentes horizontales, el levantamiento la de las verticales y el vuelco el
          momento de todas respecto del nivel de fundación." />

      <Card titulo={`Dirección ${act.dir.id}`}>
        <Stats min={160}>
          <Stat label="Corte total" valor={f(Math.abs(res.cortante / 1000), 1)} unidad="kN"
            ayuda="Suma de las componentes horizontales sobre paredes y cubierta. La presión interna se cancela: actúa por igual sobre barlovento y sotavento." />
          <Stat label="Levantamiento" valor={f(Math.abs(res.levantamiento / 1000), 1)} unidad="kN"
            ayuda="Resultante vertical hacia arriba. Acá la presión interna NO se cancela, y es donde gobierna: con GC_pi positivo empuja la cubierta desde adentro." />
          <Stat label="Vuelco" valor={f(Math.abs(res.vuelco / 1000), 1)} unidad="kN·m"
            sub="respecto del centro de la base"
            ayuda="Momento al nivel de fundación: las fuerzas horizontales por su altura, más el levantamiento de cubierta por su brazo EN PLANTA. Positivo = tiende a levantar el borde de barlovento." />
          <Stat label="Altura de alero" valor={f(geoN.hAlero, 2)} unidad="m"
            sub={`altura media h = ${f(geoN.h, 2)} m`} />
        </Stats>

        {/* ── LA RESULTANTE VERTICAL Y SU BRAZO ───────────────────────────────────
            El vuelco no es sólo las fuerzas horizontales. La succión de cubierta tiene
            brazo EN PLANTA, y en un edificio bajo y largo es el término que más pesa: con
            L = 40 m el brazo llega a 20 m, más que la altura del edificio. */}
        <Divisor>Resultante vertical de cubierta</Divisor>
        <Salida label="Levantamiento V" v={fmt.kN(res.verticalCubierta.V / 1000)}
          ayuda="Envolvente de los dos casos que exige la nota 3 de la Figura 2.4-1 para el faldón a barlovento." />
        <Salida label="Punto de aplicación x_V" unit="m"
          v={res.verticalCubierta.xV == null ? "—" : f(res.verticalCubierta.xV, 2)}
          ayuda="Medido DESDE EL BORDE DE BARLOVENTO. Es el centroide de las componentes verticales, no el centro geométrico de la cubierta: cada zona tiene su propio Cp." />
        <Salida label="Centro de la base" unit="m" v={f(act.L / 2, 2)}
          ayuda="A la misma escala que x_V: si x_V queda a barlovento del centro, el levantamiento SUMA al vuelco." />

        <Tabla minWidth={520}>
          <thead><tr>
            <Th>Momento respecto de</Th><Th alinear="right">Horizontales</Th>
            <Th alinear="right">Vertical</Th><Th alinear="right">Total (kN·m)</Th>
          </tr></thead>
          <tbody>
            {[["Borde de barlovento", "bordeBarlovento", 0],
              ["Centro de la base", "centro", act.L / 2],
              ["Borde de sotavento", "bordeSotavento", act.L]].map(([nom, k, xRef]) => (
              <tr key={k}>
                <Td nowrap>{nom}</Td>
                <TdN tono={c.txt3}>{f(res.momentos.horizontal / 1000, 1)}</TdN>
                <TdN tono={c.txt3}>{f((res.momentos[k] - res.momentos.horizontal) / 1000, 1)}</TdN>
                <TdN peso={600}>{f(res.momentos[k] / 1000, 1)}</TdN>
              </tr>
            ))}
          </tbody>
        </Tabla>
        <Nota>
          El término horizontal es el mismo en las tres filas: el brazo de una fuerza
          horizontal es su altura, cualquiera sea el punto de la base respecto del que se
          tome el momento. Lo único que cambia es el brazo en planta del levantamiento.
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
        <Salida label="Fuerza mínima" v={fmt.kN(res.cargaMinima.fuerza / 1000)}
          ayuda={res.cargaMinima.ref} />
        <Salida label="Corte calculado" v={fmt.kN(Math.abs(res.cortante) / 1000)} />
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
          de las paredes solas. El C 2.1.5 exime de ese piso a un caso, y es una
          declaración del proyectista sobre el sistema, no algo deducible de la geometría.">
        <label style={{ display: "flex", gap: SP.sm + 2, alignItems: "flex-start",
          padding: `${SP.sm}px 0`, cursor: "pointer" }}>
          <input type="checkbox" checked={d.porticosCubierta === true}
            onChange={e => set("porticosCubierta")(e.target.checked)}
            style={{ width: 16, height: 16, marginTop: 2, accentColor: c.azul, cursor: "pointer" }} />
          <span style={{ ...t.body, lineHeight: 1.6 }}>
            El SPRFV de la cubierta son <b style={{ color: c.txt }}>pórticos resistentes a
            momento</b>. Con eso, las componentes horizontales de cubierta pueden restar
            del corte y <b style={{ color: c.txt }}>no se aplica el piso de la nota 7</b>.
          </span>
        </label>
        {res.exentoNota7 && (
          <Aviso tono="aviso" titulo="Piso de la nota 7 NO aplicado">
            Queda declarado que el sistema de cubierta son pórticos resistentes a momento.
            Sin esa condición, el corte informado sería el de las paredes solas.
          </Aviso>
        )}
      </Card>

      <Card titulo="Cómo cambian con la altura de alero"
        desc="Envolvente de las cuatro direcciones, recalculando el edificio completo en cada
          punto. La línea vertical marca el alero actual.">
        <CurvasAltura tema={tema} hActual={geoN.hAlero}
          datos={curvas.map(x => ({ ...x, cortante: x.cortante / 1000,
            levantamiento: x.levantamiento / 1000, vuelco: x.vuelco / 1000 }))}
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
            {[["Corte (kN)", t => Math.abs(resDe(t).cortante / 1000)],
              ["Levantamiento (kN)", t => Math.abs(resDe(t).levantamiento / 1000)],
              ["Vuelco (kN·m)", t => Math.abs(resDe(t).vuelco / 1000)]].map(([nom, fn]) => {
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
