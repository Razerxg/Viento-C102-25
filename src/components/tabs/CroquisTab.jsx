// CROQUIS — los cuatro dibujos, cada uno en su tarjeta y con su explicación.
//
// Antes estaban en una grilla de dos columnas con un título en versalitas de 11 px y nada
// más. Un croquis sin leyenda es decoración: nadie puede saber si un azul intenso son 400
// N/m² o 4.000, ni qué significa que una cara esté roja. La leyenda de escala la dibuja
// cada croquis; lo que faltaba es decir QUÉ MUESTRA cada uno y para qué sirve.
//
// Esta pantalla no lleva ficha de estado al costado: el ancho completo es lo único que
// hace legible un croquis, y la ficha se lo come.
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { PerfilQ } from '../svg/PerfilQ.jsx';
import { PlantaZonas } from '../svg/PlantaZonas.jsx';
import { ElevacionCubierta } from '../svg/ElevacionCubierta.jsx';
import { Vista3D } from '../svg/Vista3D.jsx';
import { escalaComun } from '../svg/kit.jsx';
import { Encabezado, Card, Nota } from '../ui.jsx';
import { SP } from '../tokens.js';

export function CroquisTab() {
  const { act, maxAbs } = useProyecto();
  const { tema } = useUi();

  // ── PLANTA Y ELEVACIÓN COMPARTEN ESCALA ─────────────────────────────────────
  // ⚠ SE CALCULA ACÁ Y NO DENTRO DE CADA UNA. Cada croquis elegía la escala que mejor le
  // entraba en su propio lienzo, así que la elevación de un galpón salía más grande que
  // su propia planta: dos dibujos del mismo caso, uno al lado del otro, que no se pueden
  // comparar mirando. El control automático lo exige dentro del 1 % y por eso las dos
  // declaran `data-escala` con el mismo grupo.
  //
  // ⚠ EL PERFIL DE q(z) QUEDA AFUERA, Y NO ES UNA EXCEPCIÓN DE CONVENIENCIA. Su eje
  // horizontal es `q` normalizado, no una longitud: no es una VISTA del edificio sino un
  // diagrama. Metido en el grupo, la escala común la termina fijando la planta —150 m de
  // largo contra 10 m de altura en la nave plana de la matriz— y el perfil entero queda
  // aplastado en diez píxeles, con sus dos rótulos encimados. Un croquis ilegible no es
  // más comparable por estar a la misma escala que el de al lado.
  //
  // La vista 3D también queda afuera: es una proyección en perspectiva y no tiene una
  // escala métrica única —el fondo se dibuja más chico que el frente, que es el punto—.
  const { geo, L } = act;
  const zTope = Math.max(geo.hCumbre ?? geo.hAlero, geo.hAlero);
  const escala = escalaComun([
    { ancho: 620, alto: 470 - 74, w: geo.a, h: geo.b, margen: 118 },        // planta
    { ancho: 620, alto: 470 - 92, w: L * 1.2, h: zTope * 1.18, margen: 58 }, // elevación
  ]);
  const props = { analisis: act, maxAbs, tema, ancho: 620, escala };

  // La escala de color es la MISMA en los cuatro y está normalizada sobre todas las
  // direcciones, no sobre la que se está mirando: si cada croquis usara su propio máximo,
  // dos croquis lado a lado dirían cosas distintas con el mismo color.
  const croquis = [
    ["Perfil de q(z) en altura", <PerfilQ key="a" {...props} escala={undefined} />,
      "Cómo crece la presión dinámica con la altura sobre la pared a barlovento. Es la única "
      + "superficie donde q varía: todas las demás usan q_h, constante. El escalonado son "
      + "los tramos con los que se integra."],
    ["Planta con zonas y presiones", <PlantaZonas key="b" {...props} />,
      "Las cuatro paredes vistas desde arriba, coloreadas por la presión que les toca, y la "
      + "zonificación de la cubierta cuando se resuelve por franjas."],
    ["Elevación con zonas de cubierta", <ElevacionCubierta key="c" {...props} />,
      "Corte por el plano del viento. Muestra el reparto entre faldón a barlovento y faldón "
      + "a sotavento, o las franjas, según cómo trate la cubierta esta dirección."],
    ["Vista 3D coloreada por presión", <Vista3D key="d" {...props} escala={undefined} />,
      "El volumen completo. Se arrastra para girar. Sirve para confirmar que la cubierta "
      + "está orientada como uno cree: un error de cumbrera se ve acá y en ningún otro lado."],
  ];

  return (
    <>
      <Encabezado titulo={`Croquis — ${act.dir.label}`}
        desc="Azul es succión, rojo es presión, y la escala es común a los cuatro dibujos y a
          las cuatro direcciones. Los valores son la presión gobernante de cada superficie,
          con el caso de presión interna que resulta más desfavorable para esa superficie." />

      <div style={{ display: "grid", gap: SP.md,
        gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
        {croquis.map(([titulo, el, desc]) => (
          <Card key={titulo} titulo={titulo}>
            {el}
            <Nota>{desc}</Nota>
          </Card>
        ))}
      </div>
    </>
  );
}
