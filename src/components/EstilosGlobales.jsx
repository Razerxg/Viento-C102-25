// ESTILOS GLOBALES.
//
// La app se estiliza con `style={{}}` inline, que es simple y no necesita build de CSS,
// pero tiene un límite duro: no expresa :hover, :focus-visible ni @keyframes. Todo eso
// vive acá, en una hoja inyectada una sola vez, enganchada por clases `vw-*`.
//
// Es deliberadamente corto. Si una regla se puede escribir inline, va inline; acá sólo
// entra lo que inline es IMPOSIBLE.
import { c, R, TRANS, SOMBRA, MONO, FUENTE, TAM, cssTemas } from './tokens.js';

const CSS = `
/* LOS VALORES DE COLOR, PRIMEROS. Todo lo demás usa var(--vw-*), así que estas dos
   declaraciones son la única diferencia entre el tema claro y el oscuro. Incluyen los
   alias --fondo/--sup/--borde/--acento que siguen usando los croquis SVG. */
${cssTemas()}

*,*::before,*::after{box-sizing:border-box}

/* LA FAMILIA SE FIJA EN EL BODY, no en el div raíz de React: el shell nuevo no declara
   fontFamily en su raíz, y todo el texto que no la pidiera explícitamente se renderizaría
   con el tipo por defecto del navegador. Los SVG no heredan de forma fiable, así que
   además llevan la familia por regla propia. */
body{margin:0;background:${c.canvas};color:${c.txt};font-family:${FUENTE};
  font-size:${TAM.base}px;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
svg text{font-family:${FUENTE}}

/* La barra de scroll por defecto de Chrome sobre fondo oscuro es un tajo blanco. */
*::-webkit-scrollbar{width:10px;height:10px}
*::-webkit-scrollbar-track{background:transparent}
*::-webkit-scrollbar-thumb{background:${c.borderFuerte};border-radius:${R.full}px;border:3px solid ${c.canvas}}
*::-webkit-scrollbar-thumb:hover{background:${c.txt3}}

/* FOCO VISIBLE en todo lo interactivo: en un formulario largo es la diferencia entre
   poder tabular y no poder. Sólo :focus-visible, para no dibujar el anillo al hacer clic. */
:focus-visible{outline:none;box-shadow:${SOMBRA.foco};border-color:${c.azul}!important}

input,select,textarea,button{font-family:inherit}
input[type=number]{-moz-appearance:textfield}
input[type=number]::-webkit-outer-spin-button,
input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}

.vw-in:hover:not(:focus){border-color:${c.txt3}}
.vw-btn:hover{filter:brightness(1.12)}
.vw-btn:active{transform:translateY(1px)}
.vw-btn2:hover{background:${c.hover};border-color:${c.borderFuerte}}
.vw-btnR:hover{background:${c.rojoBg}}
.vw-nav:hover{background:${c.hover};color:${c.txt}}
.vw-card{transition:border-color ${TRANS}}
.vw-clic{cursor:pointer;transition:border-color ${TRANS},background ${TRANS}}
.vw-clic:hover{border-color:${c.borderFuerte};background:${c.hover}}

/* ZEBRA en las tablas largas: la tabla de cargas puede tener veinte filas por altura, y
   sin ella el ojo salta de fila al recorrer una columna. */
.vw-tabla tbody tr:nth-child(even){background:${c.surface}66}
.vw-tabla tbody tr:hover{background:${c.hover}}
/* ENCABEZADO FIJO: la tabla scrollea bajo su propio header, que queda legible. */
.vw-tabla thead th{position:sticky;top:0;z-index:2}

/* Acordeones: la flecha nativa de <details> es distinta en cada navegador. */
.vw-acc>summary{list-style:none;cursor:pointer}
.vw-acc>summary::-webkit-details-marker{display:none}
.vw-acc>summary .vw-flecha{transition:transform ${TRANS}}
.vw-acc[open]>summary .vw-flecha{transform:rotate(90deg)}
.vw-acc[open]>.vw-cuerpo{animation:vwAbrir 160ms cubic-bezier(.2,.6,.35,1)}
@keyframes vwAbrir{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}

@keyframes vwToast{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.vw-toast{animation:vwToast 180ms cubic-bezier(.2,.6,.35,1)}

@keyframes vwEntrar{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.vw-entra{animation:vwEntrar 200ms cubic-bezier(.2,.6,.35,1)}

.vw-mono{font-family:${MONO};font-variant-numeric:tabular-nums}

/* NOTEBOOK 1366: por debajo de eso la ficha lateral se va abajo en vez de apretar el
   contenido, que con un croquis al lado deja los dos ilegibles. */
@media (max-width:1180px){.vw-conPanel{grid-template-columns:1fr!important}}

/* ANGOSTO. La barra lateral NO se oculta por CSS: la controla el estado de la interfaz y
   en angosto se dibuja como un cajón superpuesto que abre el botón hamburguesa. Ocultarla
   por CSS dejaría a la app sin NINGUNA navegación en un teléfono, encerrada en la pantalla
   en la que uno hubiera caído. Lo que sí queda es apretar los márgenes. */
@media (max-width:900px){
  .vw-shell{grid-template-columns:1fr!important}
  .vw-main{padding-left:12px!important;padding-right:12px!important}
}

@media print{.vw-sidebar,.vw-noPrint{display:none!important}.vw-shell{grid-template-columns:1fr!important}}
`;

export function EstilosGlobales() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />;
}
