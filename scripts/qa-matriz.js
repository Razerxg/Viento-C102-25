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

/** El estado completo que se escribe en `localStorage` para un caso de la matriz. */
export const estadoDe = (caso) => ({ ...caso.datos, elementosCyR: ELEMENTOS });
