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
import { FIGURAS } from '../../constants/figuras.js';
import { f, fmt } from '../../lib/formato.js';
import { BORDES } from '../../engine/voladizo.js';

export function EdificioTab() {
  const { d, setGeo, geoN, act, maxAbs } = useProyecto();
  const { tema } = useUi();
  const tipo = tipoDe(d.geo.tipo);

  // Los tres setters del voladizo. `setGeo("voladizo")` reemplaza el objeto entero, así
  // que cada uno reconstruye el sub-objeto conservando lo demás: el modo «por lado» no
  // tiene por qué borrar lo que se había cargado en «simétrico», y al revés.
  const vol = d.geo.voladizo ?? { modo: "simetrico", grupos: {}, porBorde: {} };
  const setVol = (k) => (v) => setGeo("voladizo")({ ...vol, [k]: v });
  const setVolGrupo = (id) => (v) =>
    setGeo("voladizo")({ ...vol, grupos: { ...vol.grupos, [id]: v } });
  const setVolBorde = (b) => (v) =>
    setGeo("voladizo")({ ...vol, porBorde: { ...vol.porBorde, [b]: v } });

  return (
    <>
      <Encabezado titulo="Edificio"
        desc="Las dos dimensiones en planta, la altura de alero y la cubierta. De acá sale la
          altura media h, que es la altura a la que se evalúa q_h y por lo tanto la que
          gobierna todas las superficies salvo la pared a barlovento." />

      <div style={{ display: "grid", gap: SP.md, alignItems: "start",
        gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
        <Card titulo="Geometría">
          <Campo label="Dimensión en planta según X — B_X" unit="m"
            ayuda="Lado de la planta medido sobre el eje X. Cuál de los dos lados es el
              mayor no cambia el resultado: las cuatro direcciones de viento se calculan
              igual. Se llama B_X y no «a» porque en el capítulo 5 `a` es el ancho de zona,
              que es otra cosa y se acota en el mismo croquis.">
            <Num v={d.geo.a} set={setGeo("a")} />
          </Campo>
          <Campo label="Dimensión en planta según Y — B_Y" unit="m">
            <Num v={d.geo.b} set={setGeo("b")} />
          </Campo>
          <Campo label="Altura de alero" unit="m"
            ayuda="Altura del borde inferior de la cubierta sobre el nivel del terreno. Con cubierta plana es la altura del edificio.">
            <Num v={d.geo.hAlero} set={setGeo("hAlero")} />
          </Campo>

          <Divisor>Cubierta</Divisor>

          {/* La figura es LA forma de elegir acá: entre «vertiente única», «dos aguas»
              y «mansarda» no se decide leyendo, se decide mirando la planta y la
              elevación de cada una. */}
          <Campo label="Tipo" ayuda={tipo.ayuda} fig={FIGURAS["2.4-1"]}>
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
          {/* ⚠ EN CUATRO AGUAS LA CUMBRERA NO ES DATO. Con una sola pendiente θ los
              cuatro faldones se cortan de una sola manera: la cumbrera va según el lado
              LARGO y sube sobre media luz del corto. Ofrecer el selector invita a
              declarar una pieza que no existe, igual que ofrecer el ángulo en una
              cubierta plana. Se oculta, y abajo se informa lo que salió. */}
          {d.geo.tipo !== "plana" && d.geo.tipo !== "cuatro_aguas" && (
            <Campo label="Dirección de la cumbrera" fig={FIGURAS["2.4-1"]}
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

          {/* ── VOLADIZO DE CUBIERTA ─────────────────────────────────────────
              Los campos se agrupan como se piensa el vuelo al proyectar —aleros y
              hastiales en dos aguas, perimetral en plana y cuatro aguas, alero alto /
              bajo / laterales en vertiente única—, pero el motor siempre ve los CUATRO
              BORDES por separado: cuál es el voladizo a barlovento depende de la
              dirección de viento, y con un solo número «vuelo» esa pregunta no se puede
              responder. */}
          <Divisor>Voladizo de cubierta</Divisor>
          <Nota>
            La prolongación del faldón más allá de la línea de pared, con la misma
            pendiente. No es un alero adosado a una pared, que es otra tipología —art.
            5.9— con sus propias figuras. El voladizo no cambia h ni el área de las
            paredes; sí agrega área de cubierta al levantamiento y corre la distancia al
            borde de las zonas del capítulo 5.
          </Nota>
          <Campo label="Cómo se declara"
            ayuda="Simétrico: un vuelo por grupo de bordes. Por lado: los cuatro bordes por separado, para una planta donde el vuelo no es igual en todos.">
            <Sel v={vol.modo ?? "simetrico"} set={setVol("modo")} w={200}
              opciones={[["simetrico", "Simétrico"], ["porLado", "Por lado"]]} />
          </Campo>
          {(vol.modo ?? "simetrico") === "simetrico"
            ? geoN.voladizo.grupos.map(g => (
              <Campo key={g.id} label={g.label} unit="m">
                <Num v={vol.grupos?.[g.id] ?? ""} set={setVolGrupo(g.id)} />
              </Campo>
            ))
            : BORDES.map(b => (
              <Campo key={b} label={`Vuelo en el borde ${b.replace("-", "−")}`} unit="m">
                <Num v={vol.porBorde?.[b] ?? ""} set={setVolBorde(b)} />
              </Campo>
            ))}
          {geoN.voladizo.hay && (
            <Salida label="Planta de la cubierta con el vuelo"
              v={`${fmt.m(geoN.a + geoN.voladizo.porBorde["-X"] + geoN.voladizo.porBorde["+X"])} × `
                + `${fmt.m(geoN.b + geoN.voladizo.porBorde["-Y"] + geoN.voladizo.porBorde["+Y"])}`}
              ayuda="Es la planta sobre la que se zonifica el capítulo 5. La dimensión menor que define a sigue siendo la del edificio, sin los vuelos (nota 7 de la Fig. 5.3-2A)." />
          )}

          <Divisor>Lo que sale de esto</Divisor>

          <Salida label="Altura media de cubierta h" v={fmt.m(geoN.h)}
            ayuda={geoN.theta <= 10
              ? "Con θ ≤ 10° el art. 1.2 admite tomar la altura de alero como altura media."
              : "Promedio entre la altura de alero y la de cumbrera."} />
          {geoN.theta > 0 && <Salida label="Altura de cumbrera" v={fmt.m(geoN.hCumbre)} />}
          {d.geo.tipo === "cuatro_aguas" && !geoN.piramide && <>
            <Salida label="Dirección de la cumbrera" v={`Paralela a ${geoN.cumbrera}`}
              ayuda="No es dato: con una sola pendiente θ la cumbrera queda según el lado LARGO y el remonte sube sobre media luz del lado corto." />
            <Salida label="Largo de la cumbrera" v={fmt.m(geoN.longitudCumbrera)}
              ayuda="|a − b|. Los faldones de punta se comen media luz corta en cada extremo. Es lo que permite calcular exacta la silueta y el área en planta de los faldones trapeciales." />
          </>}
          {geoN.piramide && (
            <Salida label="Cubierta piramidal" v="a = b, sin cumbrera"
              ayuda="Los cuatro faldones concurren en un vértice. Las cuatro direcciones se tratan como viento normal a la cumbrera." />
          )}
          {geoN.cumbreraReorientada && (
            <div style={{ marginTop: SP.sm }}>
              <Aviso tono="aviso" titulo="La cumbrera se reorientó al abrir el proyecto">
                Venía declarada paralela a {geoN.cumbreraDeclarada}, que es el lado corto.
                Con una sola pendiente eso describe una pieza que no existe: la cumbrera va
                según el lado largo ({geoN.cumbrera}). El cambio NO es cosmético —da vuelta
                qué dirección se trata en faldones y cuál en franjas, y corrige el remonte—
                así que conviene revisar los resultados.
              </Aviso>
            </div>
          )}
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
