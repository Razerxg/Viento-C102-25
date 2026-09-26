// SITIO — todo lo que no depende de la forma del edificio.
//
// Van juntos porque son los datos que se sacan de la ubicación y del entorno: la
// velocidad básica, la rugosidad del terreno, la altitud y la clasificación de
// cerramiento. Antes estaban en una columna de 300 px junto al edificio, con los selects
// apretados a ancho completo y el mapa metido entre dos campos.
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { CIUDADES } from '../../constants/velocidades.js';
import { CERRAMIENTOS, PRIORIDAD_ABIERTO } from '../../constants/presionInterna.js';
import { EXPOSICIONES, TERRENO } from '../../constants/exposicion.js';
import { MapaVelocidad } from '../MapaVelocidad.jsx';
import { Encabezado, Card, Campo, Num, Sel, Salida, Aviso, Nota, Tabla, Acordeon,
  Th, Td, TdN } from '../ui.jsx';
import { c, SP } from '../tokens.js';
import { FIGURAS } from '../../constants/figuras.js';
import { f, fmt } from '../../lib/formato.js';
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

export function SitioTab() {
  const { d, set, V, sitio, geoN, act } = useProyecto();
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
        <Campo label="Localidad"
          ayuda="Las 29 ciudades de la tabla de la Figura 1.5-1D. Para un sitio que no esté en la lista, hay que leer el valor de las isolíneas del mapa.">
          <Sel v={d.ciudad} set={set("ciudad")} opciones={CIUDADES.map(([n]) => n)} w={240} />
        </Campo>
        <Campo label="Categoría de riesgo"
          ayuda="Tabla 1.14-1. I son construcciones de bajo riesgo para la vida humana; II es el caso general; III y IV son las de gran ocupación y las esenciales, y comparten el mapa de 1.700 años.">
          <Sel v={d.riesgo} set={set("riesgo")} opciones={["I", "II", "III", "IV"]} w={100} />
        </Campo>
        <Salida label="Velocidad básica" v={f(V, 1)} unit="m/s"
          ayuda="Ráfaga de 3 segundos a 10 m sobre el terreno, en exposición C, asociada al período de retorno de la categoría de riesgo." />

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
        <Aviso titulo="K_zt = 1,0 — se supone terreno llano" fig={FIGURAS["1.8-1"]}>
          El art. 1.8 puede llevar K_zt hasta 1,9 —casi el doble de presión— cuando el
          edificio está en la mitad superior de una loma, cerca de la cresta de una escarpa
          o sobre una colina aislada. El motor sabe calcularlo, pero la interfaz todavía no
          pide los datos de la Figura 1.8-1, así que queda fijo en 1,0.
        </Aviso>
      </Card>

      <Card titulo="Clasificación de cerramiento"
        desc="Art. 1.10 y Tabla 1.11-1. Entre «cerrado» y «parcialmente cerrado» hay un
          factor de tres en la presión interna, y en una cubierta liviana eso decide el
          levantamiento.">
        <Campo label="Clasificación"
          ayuda="Se decide por el área de aberturas de cada pared comparada con el área bruta y con las aberturas del resto de la envolvente.">
          <Sel v={d.cerramiento} set={set("cerramiento")} w={240}
            opciones={CERRAMIENTOS.map(x => [x.id, x.label])} />
        </Campo>
        <Salida label="Coeficiente de presión interna GC_pi"
          v={`±${f(Math.abs(act.GCpi), 2)}`} />

        <Acordeon titulo="Las cuatro clasificaciones y su criterio">
          <Tabla minWidth={520}>
            <thead><tr>
              <Th>Clasificación</Th><Th>Criterio</Th><Th>Presión interna</Th>
              <Th alinear="right">GC_pi</Th>
            </tr></thead>
            <tbody>
              {CERRAMIENTOS.map(x => {
                // La fila elegida se resalta por FONDO. Es la única forma de ver, sin leer
                // los cuatro criterios, cuál de ellos es el que está gobernando el cálculo.
                const on = x.id === d.cerramiento;
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
            <b style={{ color: c.txt }}>{PRIORIDAD_ABIERTO}</b> La categoría «parcialmente
            abierto» es nueva respecto del 102-2005: existe para no dejar sin clasificar a
            los edificios que no cumplen ninguna de las otras tres.
          </Nota>
        </Acordeon>

        <Nota>
          <b style={{ color: c.txt }}>Siempre son dos casos, no uno.</b> La nota 3 de la
          Tabla 1.11-1 exige considerar el GC_pi positivo aplicado a todas las superficies
          internas y el negativo aplicado a todas. No es elegir el peor y seguir: uno
          gobierna el levantamiento de la cubierta y el otro la compresión de las paredes,
          en combinaciones distintas. Por eso la tabla de presiones tiene dos columnas.
        </Nota>
      </Card>
    </>
  );
}
