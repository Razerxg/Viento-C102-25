// LA MATRIZ DE GEOMETRÍAS DEL CONTROL DE CROQUIS.
//
// Vive aparte del script porque es la parte que se lee y se discute: son los casos que un
// croquis tiene que soportar sin romperse. Cada uno está por una razón concreta —una
// planta chica donde las franjas se comen todo, una nave donde la esbeltez invierte las
// proporciones, una pendiente que cambia de figura— y esa razón va escrita.
//
// El estado que se inyecta es PARCIAL: `lib/proyecto.js` lo fusiona clave por clave
// contra `constants/inicial.js`, así que sólo hace falta declarar lo que cambia. Es la
// misma ruta que sigue un archivo abierto con «Abrir», no un atajo del control.

/** Las cuatro direcciones del art. 2.4.1, para las pantallas que dependen de una. */
export const DIRECCIONES = ["Wx+", "Wx-", "Wy+", "Wy-"];

/**
 * Las pantallas que dibujan algo, con si su contenido cambia al cambiar de dirección.
 * Recorrer las cuatro direcciones en una pantalla que no depende de ellas cuadriplica el
 * tiempo del control para sacar cuatro capturas idénticas.
 */
/**
 * Los dos modos de rotulación de cotas. Se recorren los dos y no sólo el defecto: al cambiar
 * de modo cambia el LARGO de cada etiqueta, y el largo es lo que decide si una cota entra
 * entre sus marcas o se va afuera. Los dos primeros defectos que encontró el control después
 * del cambio fueron exactamente eso: cotas que con el texto largo se iban afuera y con el
 * corto entraron centradas, encima de un número de zona y de un rótulo de alero.
 */
export const ROTULOS = ["simbolo", "medida"];

/**
 * Los sub-modos de la vista 3D. El de C&R no es una pantalla aparte —es un botón adentro del
 * croquis— así que sin esto la mitad del 3D quedaría sin controlar: las zonas, el voladizo
 * compuesto y el alero adosado se dibujan sólo en ese modo.
 */
export const VARIANTES = {
  Croquis: [
    { id: "sprfv", boton: null, porDireccion: true },
    // ⚠ EL MODO C&R NO DEPENDE DE LA DIRECCIÓN, y por eso se recorre una sola vez. Los
    // (GC_p) del capítulo 5 YA son la envolvente de las cuatro direcciones —por eso cada
    // elemento tiene un valor positivo y uno negativo—: recorrerlas daría cuatro capturas
    // idénticas por geometría y por tema, y una hoja de contacto con cuatro paneles iguales
    // es más difícil de mirar que una con uno.
    { id: "cyr", boton: "C&R — cap. 5", porDireccion: false },
  ],
};

export const PANTALLAS = [
  { nombre: "Edificio", porDireccion: false },
  { nombre: "Cerramiento", porDireccion: false },
  { nombre: "Presiones", porDireccion: true },
  { nombre: "Croquis", porDireccion: true },
  { nombre: "Componentes y revestimientos", porDireccion: false },
];

/** Un elemento de C&R de cubierta y otro de pared, que es lo que dispara ese croquis. */
const ELEMENTOS = [
  { id: "cyr-1", nombre: "Correa de cubierta", tipo: "correa", superficie: "cubierta",
    L: "6", s: "1.5", area: "" },
  { id: "cyr-2", nombre: "Larguero de pared", tipo: "larguero", superficie: "pared",
    L: "4", s: "1.2", area: "" },
];

/** @type {{id: string, nombre: string, porque: string, datos: object}[]} */
export const MATRIZ = [
  {
    id: "shelter",
    nombre: "Shelter 2,4 × 3,0 · h = 2,6 · plana",
    porque: "La planta más chica que se carga de verdad. Con a = 0,24 m las franjas de "
      + "zona miden centímetros y las cotas no entran entre sus líneas de referencia.",
    datos: { proyecto: "Shelter", exposicion: "C",
      geo: { a: "2.4", b: "3.0", hAlero: "2.6", theta: "0", tipo: "plana", cumbrera: "X" } },
  },
  {
    id: "shelter-voladizo",
    nombre: "El mismo shelter, con voladizo perimetral de 0,6 m",
    porque: "El voladizo dibuja DOS contornos —el de la cubierta y la línea de pared— y "
      + "corre la distancia al borde hacia afuera sin agrandar `a`. En la planta más chica "
      + "de la matriz el vuelo es un cuarto de la luz: si el croquis va a confundir los dos "
      + "contornos, los confunde acá.",
    datos: { proyecto: "Shelter con voladizo", exposicion: "C",
      geo: { a: "2.4", b: "3.0", hAlero: "2.6", theta: "0", tipo: "plana", cumbrera: "X",
        voladizo: { modo: "simetrico", grupos: { perimetral: "0.6" } } } },
  },
  {
    id: "galpon-voladizo",
    nombre: "Galpón 20 × 30 · dos aguas 15° · vuelo 1 m en aleros y 0,5 en hastiales",
    porque: "El caso corriente de un tinglado, y el único de la matriz donde el vuelo NO "
      + "es igual en los cuatro bordes: la elevación tiene que prolongar el faldón con su "
      + "misma pendiente, y sólo sobre el eje que se está mirando.",
    datos: { proyecto: "Galpón con voladizo", exposicion: "C",
      geo: { a: "20", b: "30", hAlero: "6", theta: "15", tipo: "dos_aguas", cumbrera: "X",
        voladizo: { modo: "simetrico", grupos: { aleros: "1", hastiales: "0.5" } } } },
  },
  {
    id: "referencia",
    nombre: "Proyecto de referencia 7,5 × 11 · h = 3 · dos aguas 9°",
    porque: "El caso con el que el proyectista midió los defectos: Neuquén categoría III, "
      + "exposición C, cumbrera según Y. Es la vara de todo este control.",
    datos: { proyecto: "Referencia", ciudad: "Neuquén", riesgo: "III", exposicion: "C",
      geo: { a: "7.5", b: "11", hAlero: "3", theta: "9", tipo: "dos_aguas", cumbrera: "Y" } },
  },
  {
    id: "galpon-15",
    nombre: "Galpón 20 × 30 · h = 6 · dos aguas 15°",
    porque: "El caso corriente, y la Fig. 5.3-2B: dos aguas entre 7° y 20°.",
    datos: { proyecto: "Galpón 15°", exposicion: "C",
      geo: { a: "20", b: "30", hAlero: "6", theta: "15", tipo: "dos_aguas", cumbrera: "X" } },
  },
  {
    id: "galpon-25",
    nombre: "Galpón 20 × 30 · h = 6 · dos aguas 25°",
    porque: "Fig. 5.3-2C, y en el capítulo 2 el faldón a barlovento ya empuja.",
    datos: { proyecto: "Galpón 25°", exposicion: "C",
      geo: { a: "20", b: "30", hAlero: "6", theta: "25", tipo: "dos_aguas", cumbrera: "X" } },
  },
  {
    id: "dos-aguas-35",
    nombre: "Dos aguas 35° · 20 × 30 · h = 6",
    porque: "Fig. 5.3-2D: la zonificación pasa a las cuatro esquinas y desaparece la "
      + "franja de cumbrera. Es la que se dibuja distinto de todas las demás.",
    datos: { proyecto: "Dos aguas 35°", exposicion: "C",
      geo: { a: "20", b: "30", hAlero: "6", theta: "35", tipo: "dos_aguas", cumbrera: "X" } },
  },
  {
    id: "cuatro-aguas",
    nombre: "Cuatro aguas 20 × 30 · h = 6 · 20°",
    porque: "Limatesas en diagonal: es el único croquis donde las regiones no son "
      + "rectángulos y donde dos rótulos cayeron en el mismo punto.",
    datos: { proyecto: "Cuatro aguas", exposicion: "C",
      geo: { a: "20", b: "30", hAlero: "6", theta: "20", tipo: "cuatro_aguas", cumbrera: "X" } },
  },
  {
    id: "una-agua-5-x",
    nombre: "Vertiente única 10 × 20 · 5° · pendiente +X",
    porque: "Fig. 5.3-5A, con la pendiente sobre X: los rótulos de alero corren "
      + "paralelos a un borde vertical, que es el caso que no se había visto renderizado.",
    datos: { proyecto: "Vertiente única 5°", exposicion: "C",
      geo: { a: "10", b: "20", hAlero: "4", theta: "5", tipo: "vertiente_unica",
        cumbrera: "Y", pendienteHacia: "+X" } },
  },
  {
    id: "una-agua-15-y",
    nombre: "Vertiente única 10 × 20 · 15° · pendiente −Y",
    porque: "Fig. 5.3-5B, con la pendiente sobre −Y: el croquis tiene que salir espejado "
      + "respecto del caso anterior y no por convención fija.",
    datos: { proyecto: "Vertiente única 15°", exposicion: "C",
      geo: { a: "10", b: "20", hAlero: "4", theta: "15", tipo: "vertiente_unica",
        cumbrera: "Y", pendienteHacia: "-Y" } },
  },
  {
    id: "alero-adosado",
    nombre: "Galpón 12 × 24 · h = 5 · con alero adosado a la pared +X",
    porque: "Art. 5.9. El croquis del alero adosado dibuja TRES alturas en un mismo alzado "
      + "—h del edificio, h_e del alero de la cubierta y h_c del alero adosado— y las tres "
      + "cotas arrancan del terreno: es el único croquis de la app donde tres cotas "
      + "verticales compiten por el mismo lugar.",
    datos: { proyecto: "Galpón con alero adosado", exposicion: "C",
      geo: { a: "12", b: "24", hAlero: "5", theta: "10", tipo: "dos_aguas", cumbrera: "X" },
      aleroAdosado: { hay: true, pared: "+X", ancho: "8", vuelo: "3", hc: "3.2", he: "",
        pendiente: "0.01", dosSuperficies: true, interpolarH: false } },
  },
  {
    id: "alero-adosado-alto",
    nombre: "Edificio de 24 m con un alero adosado bajo, a 3,5 m",
    porque: "La trampa del art. 5.9 dibujada: el alero está a 3,5 m y se verifica con las "
      + "figuras de h > 20 m y con q_h de los 24 m. Además h_c/h_e = 0,15 cae en el rango "
      + "que la Tabla C 5.9-4 escribe y la C 5.9-2 no: dos bandas distintas para el mismo "
      + "alero. Y con h entre 20 y 30 se ofrece la interpolación de las excepciones.",
    datos: { proyecto: "Edificio alto con alero", exposicion: "C",
      geo: { a: "18", b: "28", hAlero: "24", theta: "5", tipo: "dos_aguas", cumbrera: "Y" },
      aleroAdosado: { hay: true, pared: "-Y", ancho: "10", vuelo: "2.5", hc: "3.5", he: "",
        pendiente: "0.015", dosSuperficies: false, interpolarH: true } },
  },
  {
    id: "nave-plana",
    nombre: "Nave plana 100 × 150 · h = 10",
    porque: "La excepción a ≤ 0,8h de la notación: con h = 10 la dimensión de borde queda "
      + "gobernada por el 4 % y las franjas son finísimas contra una planta enorme.",
    datos: { proyecto: "Nave plana", exposicion: "C",
      geo: { a: "100", b: "150", hAlero: "10", theta: "0", tipo: "plana", cumbrera: "X" } },
  },
  {
    id: "torre",
    nombre: "Torre angosta 3 × 3,5 · h = 10",
    porque: "Mayor dimensión < 0,4h: TODA la cubierta es zona 3, el escenario del "
      + "comentario C 5.1 que la Fig. C 5-1 no dibuja. Una sola zona, y la elevación es "
      + "más alta que ancha, que es lo contrario de todos los demás casos.",
    datos: { proyecto: "Torre", exposicion: "C",
      geo: { a: "3", b: "3.5", hAlero: "10", theta: "0", tipo: "plana", cumbrera: "X" } },
  },
];

/** Un elemento del alero adosado, sin el cual sus tablas de presiones no aparecen. */
const ELEMENTOS_ALERO = [
  { id: "al-1", nombre: "Viga del alero", tipo: "correa", L: "2.5", s: "1.2", area: "" },
];

/** El estado completo que se escribe en `localStorage` para un caso de la matriz. */
export const estadoDe = (caso) => ({ ...caso.datos, elementosCyR: ELEMENTOS,
  elementosAlero: ELEMENTOS_ALERO });
