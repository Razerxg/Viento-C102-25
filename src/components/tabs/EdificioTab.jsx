// EDIFICIO — la geometría, y el croquis que la confirma.
//
// El croquis va AL LADO de los campos y no en otra pantalla. El motivo es concreto: los
// campos son «a», «b», «cumbrera según X» y «desciende hacia +Y», y no hay forma de
// saber si uno entendió bien qué es cada uno sin ver el resultado. Con el dibujo al lado,
// un error de orientación se ve al escribirlo; en otra pantalla, se ve tres pasos después
// o no se ve.
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { TIPOS_CUBIERTA, DIRECCIONES_PENDIENTE, tipoDe } from '../../constants/cubiertas.js';
import { Vista3D } from '../svg/Vista3D.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { Encabezado, Card, Campo, Num, Sel, Salida, Nota, Aviso, Divisor } from '../ui.jsx';
import { c, t, SP } from '../tokens.js';
import { f, fmt } from '../../lib/formato.js';

export function EdificioTab() {
  const { d, setGeo, geoN, act, maxAbs } = useProyecto();
  const { tema } = useUi();
  const tipo = tipoDe(d.geo.tipo);

  return (
    <>
      <Encabezado titulo="Edificio"
        desc="Las dos dimensiones en planta, la altura de alero y la cubierta. De acá sale la
          altura media h, que es la altura a la que se evalúa q_h y por lo tanto la que
          gobierna todas las superficies salvo la pared a barlovento." />

      <div style={{ display: "grid", gap: SP.md, alignItems: "start",
        gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
        <Card titulo="Geometría">
          <Campo label="Dimensión según X" unit="m"
            ayuda="Lado de la planta medido sobre el eje X. Cuál de los dos lados es «a» no cambia el resultado: las cuatro direcciones de viento se calculan igual.">
            <Num v={d.geo.a} set={setGeo("a")} />
          </Campo>
          <Campo label="Dimensión según Y" unit="m">
            <Num v={d.geo.b} set={setGeo("b")} />
          </Campo>
          <Campo label="Altura de alero" unit="m"
            ayuda="Altura del borde inferior de la cubierta sobre el nivel del terreno. Con cubierta plana es la altura del edificio.">
            <Num v={d.geo.hAlero} set={setGeo("hAlero")} />
          </Campo>

          <Divisor>Cubierta</Divisor>

          <Campo label="Tipo" ayuda={tipo.ayuda}>
            <Sel v={d.geo.tipo} set={setGeo("tipo")} w={240}
              opciones={TIPOS_CUBIERTA.map(x =>
                [x.id, x.noImplementada ? `${x.label} — no implementada` : x.label, !!x.noImplementada])} />
          </Campo>
          <Nota>{tipo.ayuda}</Nota>

          {/* El ángulo NO se muestra con cubierta plana. No es para ahorrar espacio: si el
              tipo dice plana y el campo permite escribir 25°, uno de los dos miente, y el
              motor hace ganar al tipo. Ocultando el campo, la contradicción no existe. */}
          {d.geo.tipo !== "plana" && (
            <Campo label="Ángulo θ" unit="°"
              ayuda="Pendiente de los faldones. Por debajo de 10° la Figura 2.4-1 zonifica la cubierta en franjas cualquiera sea la dirección del viento; a partir de 10° la parte en faldón a barlovento y faldón a sotavento.">
              <Num v={d.geo.theta} set={setGeo("theta")} />
            </Campo>
          )}
          {d.geo.tipo !== "plana" && (
            <Campo label="Dirección de la cumbrera"
              ayuda="El eje al que es PARALELA la línea de cumbrera. El viento normal a la cumbrera parte la cubierta en dos faldones; el viento paralelo la zonifica en franjas.">
              <Sel v={d.geo.cumbrera} set={setGeo("cumbrera")} w={160}
                opciones={[["X", "Paralela a X"], ["Y", "Paralela a Y"]]} />
            </Campo>
          )}
          {d.geo.tipo === "vertiente_unica" && (
            <Campo label="Hacia dónde desciende"
              ayuda="Con vertiente única la nota 4 hace que TODA la superficie sea barlovento o sotavento. Cuál de las dos depende de hacia dónde cae la pendiente respecto del viento, así que este dato cambia el coeficiente de toda la cubierta.">
              <Sel v={d.geo.pendienteHacia} set={setGeo("pendienteHacia")} w={200}
                opciones={DIRECCIONES_PENDIENTE.map(x => [x.id, x.label])} />
            </Campo>
          )}

          <Divisor>Lo que sale de esto</Divisor>

          <Salida label="Altura media de cubierta h" v={fmt.m(geoN.h)}
            ayuda={geoN.theta <= 10
              ? "Con θ ≤ 10° el art. 1.2 admite tomar la altura de alero como altura media."
              : "Promedio entre la altura de alero y la de cumbrera."} />
          {geoN.theta > 0 && <Salida label="Altura de cumbrera" v={fmt.m(geoN.hCumbre)} />}
          <Salida label="Presión dinámica q_h" v={fmt.q(act.qh)}
            ayuda="Evaluada en z = h. La usan todas las superficies salvo la pared a barlovento, que usa q_z a cada altura." />
          <Salida label="Relación h/L en esta dirección" v={f(act.hL, 2)}
            ayuda="L es la dimensión paralela al viento. Es la fila con la que se entra en la tabla de coeficientes de cubierta de la Figura 2.4-1." />

          {tipo.noImplementada && (
            <Aviso tono="error" titulo="Esta cubierta no está implementada">
              Las demás pantallas siguen mostrando números, pero corresponden a otra
              cubierta. No hay que usarlos.
            </Aviso>
          )}
        </Card>

        <Card titulo="Cómo lo entiende el motor"
          desc="Coloreado por presión en la dirección seleccionada. Se arrastra para girar.">
          <Vista3D analisis={act} maxAbs={maxAbs} fmt={fmt} tema={tema} ancho={620} />
          <Nota>
            <b style={{ color: c.txt }}>Tratamiento en {act.dir.id}: {act.modo === "faldones"
              ? "dos faldones" : act.modo === "unica"
                ? `superficie completa a ${act.caraUnica}` : "franjas"}.</b>{" "}
            {act.motivoModo}
          </Nota>
        </Card>
      </div>
    </>
  );
}
