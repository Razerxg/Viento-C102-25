// NAVEGACIÓN — las pantallas agrupadas por rol, no todo apilado en una sola columna.
//
// La versión anterior era UNA pantalla con nueve recuadros uno debajo del otro: el mapa,
// los cuatro croquis, las resultantes, la traza, la tabla de cargas, la ráfaga y el
// resumen. Todo junto, sin jerarquía y sin forma de volver a algo sin scrollear. El
// problema no era la cantidad de información —toda hace falta— sino que no había ningún
// orden declarado: nada decía qué se carga primero ni dónde termina el dato y empieza el
// resultado.
//
// El orden de los grupos ES el orden de trabajo: primero se define el sitio y el edificio,
// después se leen las presiones que salen de eso.
export const NAV = [
  { grupo: null, items: ["Guía"] },
  // «Ráfaga» está entre los DATOS y no entre los resultados a propósito: G es una decisión
  // del proyectista —cuál de las tres vías del art. 1.9 se adopta— y esa decisión cambia
  // todas las presiones. Puesto entre los resultados parecería algo que la app informa.
  { grupo: "Definición", items: ["Sitio", "Edificio", "Ráfaga"] },
  { grupo: "Resultados", items: ["Presiones", "Croquis", "Resultantes", "Resumen"] },
  // CAPÍTULO 4 APARTE, Y NO ENTRE LOS RESULTADOS DEL EDIFICIO. No es otra salida del mismo
  // cálculo: es OTRO objeto. El capítulo 2 reparte presiones sobre las superficies de un
  // edificio; el 4 da una fuerza resultante sobre una pared libre, una chimenea o una
  // torre, que no tienen interior ni presión interna. Mezclarlos haría creer que el cartel
  // se calcula «con los datos del edificio», y lo único que comparten es el sitio.
  //
  // La partición en dos pantallas es la del propio reglamento: la Tabla 4.1-1 da los pasos
  // de accesorios y otras estructuras, y la Tabla 4.1-2 los de recipientes cilíndricos.
  { grupo: "Otras estructuras — cap. 4", items: ["Accesorios", "Silos y tanques"] },
];

export const TABS = NAV.flatMap(n => n.items);
export const idxTab = (nombre) => Math.max(0, TABS.indexOf(nombre));

// Pantallas donde el selector de dirección NO va. La guía no calcula nada; el sitio, el
// edificio y la ráfaga son del edificio ENTERO —el viento todavía no eligió dirección— y
// el resumen muestra las cuatro a la vez: en todas, ofrecer «estás mirando la dirección
// X+» sería mentir sobre lo que hay en pantalla.
// Las pantallas del capítulo 4 tampoco lo llevan: el procedimiento direccional del
// capítulo 2 reparte Cp por dirección, pero un coeficiente de fuerza ya contempla la
// dirección más desfavorable dentro del propio C_f y de sus casos A, B y C.
export const SIN_DIRECCION = new Set(["Guía", "Sitio", "Edificio", "Ráfaga", "Resumen",
  "Accesorios", "Silos y tanques"]);

// Pantallas que NO llevan la ficha de estado al costado. Los croquis y el resumen usan
// todo el ancho: en el resumen la ficha duplicaría columnas que la propia tabla ya lista,
// y en los croquis le come lugar al dibujo, que es lo único que hay para ver.
export const SIN_FICHA = new Set(["Guía", "Croquis", "Resumen"]);

// Las pantallas del capítulo 4 SÍ llevan ficha: lo que muestra —V, exposición, K_zt, K_e—
// es justamente lo que comparten con el edificio, y es lo que hay que poder mirar sin
// volver a Sitio mientras se dimensiona un cartel.

// Qué se hace en cada pantalla de definición. Lo lee la Guía, que es lo único que
// responde «¿por dónde empiezo?» sin obligar a abrir las ocho.
export const PASOS = [
  { tab: "Sitio", t: "Definir el sitio",
    d: "Localidad y categoría de riesgo —de ahí sale V—, categoría de exposición del "
      + "terreno, altitud y clasificación de cerramiento." },
  { tab: "Edificio", t: "Definir la geometría",
    d: "Las dos dimensiones en planta, la altura de alero y el tipo de cubierta con su "
      + "ángulo. De acá sale la altura media h, que es la que gobierna q_h." },
  { tab: "Ráfaga", t: "Elegir el factor de ráfaga",
    d: "Las tres vías del art. 1.9: el 0,85 por defecto, el calculado de (1.9-6) y el G_f "
      + "de edificio flexible, obligatorio si n₁ < 1 Hz." },
];
