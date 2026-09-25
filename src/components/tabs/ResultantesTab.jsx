// RESULTANTES EN LA BASE — lo que hay que transcribir al modelo estructural.
//
// Las tres magnitudes son las que se le entregan a quien dimensiona la fundación: el corte
// total, el levantamiento y el vuelco. Los números de arriba son de la dirección
// seleccionada; las curvas son la ENVOLVENTE de las cuatro, porque la pregunta que se hace
// en esta pantalla no es «cuánto da» sino «cuánto cambia si subo el alero un metro».
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { CurvasAltura } from '../svg/CurvasAltura.jsx';
import { Encabezado, Card, Stat, Stats, Aviso, Nota, Tabla, Th, Td, TdN } from '../ui.jsx';
import { c, SP } from '../tokens.js';
import { f, fmt } from '../../lib/formato.js';
import { resultantes } from '../../engine/resultantes.js';

export function ResultantesTab() {
  const { act, res, curvas, todas, geoN } = useProyecto();
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
            ayuda="Momento respecto del nivel de fundación. Cada tramo de pared aporta con el brazo de su punto medio, no con el de su borde superior." />
          <Stat label="Altura de alero" valor={f(geoN.hAlero, 2)} unidad="m"
            sub={`altura media h = ${f(geoN.h, 2)} m`} />
        </Stats>

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
            {[["Corte (kN)", t => Math.abs(resultantes(t).cortante / 1000)],
              ["Levantamiento (kN)", t => Math.abs(resultantes(t).levantamiento / 1000)],
              ["Vuelco (kN·m)", t => Math.abs(resultantes(t).vuelco / 1000)]].map(([nom, fn]) => {
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
