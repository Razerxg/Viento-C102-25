// TOKENS DE DISEÑO — fuente única de medidas, colores y tipografía.
//
// Es el mismo sistema que usa la aplicación de bases, portado a propósito: las dos son
// herramientas de cálculo del mismo autor, se abren una al lado de la otra y los números
// de una terminan en la memoria de la otra. Que cada una tenga su propia escala
// tipográfica y su propio azul las hace parecer de proveedores distintos.
//
// Lo que resuelve, concretamente: antes cada componente elegía su tamaño de letra y su
// padding a ojo —había nueve tamaños entre 10 y 20 px— y por eso todo pesaba visualmente
// lo mismo. Mirando la pantalla no se podía distinguir un título de un dato ni de una
// nota al pie. Estos tokens existen para que esa decisión se tome UNA vez.
//
// Nada de acá toca el motor de cálculo. Es presentación.

// ── ESPACIADO ────────────────────────────────────────────────────────────────────
// Grilla de 8 px. Los medios pasos (4 px) existen sólo para separar cosas que pertenecen
// al mismo objeto —un valor y su unidad—; el resto va en múltiplos enteros, que es lo que
// hace que la página se lea alineada aunque nadie la mida.
export const sp = (n) => n * 8;
export const SP = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

// ── COLOR ────────────────────────────────────────────────────────────────────────
// Superficies por ELEVACIÓN, no por nombre de lugar: `canvas` es el fondo de la
// aplicación, `surface` lo que se apoya encima (barras), `raised` las tarjetas y
// `overlay` lo que flota. Ordenadas de más oscuro a más claro, así la jerarquía de
// profundidad se lee sola.
//
// LOS COLORES SON VARIABLES CSS, NO LITERALES: `c.canvas` no vale "#0A0B0D" sino
// "var(--vw-canvas)". El valor concreto lo pone el atributo `data-tema` del elemento
// raíz, y por eso cambiar de tema es cambiar UN atributo: no re-renderiza nada.
//
// CONSECUENCIA A TENER PRESENTE: **no se puede concatenar opacidad**. `c.verde + "40"`
// producía `#6E9B7940`, pero `var(--vw-verde)40` no es nada. Por eso cada tinte tiene su
// propio token (`verdeBg`, `ambarBd`…), que además centraliza la decisión.
//
// ⚠ LOS CROQUIS NO USAN ESTOS TOKENS PARA LA PRESIÓN. La escala azul-gris-rojo vive en
// `lib/escalaPresion.js` con sus hexadecimales propios, validada para daltonismo. Es a
// propósito: es una escala de DATOS, y tiene que seguir significando lo mismo aunque
// mañana cambie el gris de las tarjetas.

const OSCURO = {
  canvas: "#0A0B0D",
  surface: "#0F1114",
  raised: "#15181C",
  overlay: "#1B1F24",
  hover: "#1E2228",

  border: "#23272E",
  borderFuerte: "#31363F",

  // Tres niveles de texto y NO más. Si algo necesita un cuarto nivel, casi siempre lo
  // que necesita en realidad es no estar ahí.
  txt: "#EAECEF",
  txt2: "#9BA3AE",
  // ⚠ 4,5:1 CONTRA EL FONDO DE TARJETA, NO MENOS. El valor anterior —#6B7280 en oscuro,
  // #767E8A en claro— daba 3,68:1 y 4,10:1: por debajo del mínimo de la WCAG para texto
  // normal, y es el color de las notas al pie, de los rótulos de eje de los gráficos y de
  // las cotas de los croquis, o sea de todo lo que ya se lee con esfuerzo. Lo destapó el
  // control automático de croquis, que mide el contraste renderizado en los dos temas.
  txt3: "#7B838F",

  // SEMÁNTICA — DESATURADA a propósito. Los saturados de una paleta de producto web
  // (#3B82F6, #22C55E) vibran sobre fondo oscuro y tiran de la vista antes que el número
  // que acompañan. El color es SEÑAL, no decoración: si un elemento no comunica un
  // estado, va en gris.
  azul: "#5E85AD",      // acción principal, foco, selección
  azulL: "#7FA3C4",
  verde: "#6E9B79",     // dato consolidado, sin objeciones
  ambar: "#AE8F55",     // hay que mirarlo: no invalida el cálculo pero condiciona su uso
  rojo: "#B96B63",      // dato fuera de rango o hipótesis que el motor no cubre
  violeta: "#8A82A8",   // derivado, sin connotación de bien/mal

  azulBg: "#5E85AD14", azulBd: "#5E85AD40", azulBg2: "#5E85AD22",
  verdeBg: "#6E9B7914", verdeBd: "#6E9B7940",
  ambarBg: "#AE8F5514", ambarBd: "#AE8F5540",
  rojoBg: "#B96B6314", rojoBd: "#B96B6340",

  sombraCard: "0 1px 2px rgba(0,0,0,.35)",
  sombraPop: "0 8px 24px rgba(0,0,0,.5)",

  // ── SOMBREADO DE ZONAS DE COMPONENTES Y REVESTIMIENTOS ────────────────────
  // Grises, no colores: las figuras del capítulo 5 son dibujos de línea y el croquis de
  // la app los imita. La progresión va de menos a MÁS CONTRASTE contra el fondo según la
  // severidad de la zona, y por eso en oscuro son blancos con alfa y en claro negros:
  // dado vuelta, la zona 3 —la más succionada— sería la que menos se ve.
  //
  // La zona 1' no tiene token: va SIN relleno. Es la menos exigida y dejarla en blanco es
  // lo que hace que el resto se lea como una escala.
  // El papel de los escaneos del reglamento. Es BLANCO EN LOS DOS TEMAS a propósito: son
  // dibujos de tinta negra, y sobre fondo oscuro no se leería ni una cota. Está acá para
  // que no quede un `#fff` suelto en un componente.
  papel: "#FFFFFF",

  tramaZ1: "#FFFFFF12",
  tramaZ2: "#FFFFFF24",
  tramaZ3: "#FFFFFF3D",
};

// TEMA CLARO. No es el oscuro con los grises dados vuelta:
//  · Las superficies van al revés en ORDEN. En oscuro la tarjeta es MÁS CLARA que el
//    fondo; en claro tiene que ser MÁS BLANCA que un fondo levemente gris. Un blanco
//    puro de fondo con tarjetas blancas borra la jerarquía.
//  · Los colores semánticos se OSCURECEN: los tonos que funcionan sobre negro quedan
//    lavados sobre blanco y no contrastan lo suficiente para leerse en texto chico.
const CLARO = {
  canvas: "#F2F3F5",
  surface: "#FFFFFF",
  raised: "#FFFFFF",
  overlay: "#FFFFFF",
  hover: "#EDEFF2",

  border: "#DCE0E6",
  borderFuerte: "#C2C8D0",

  txt: "#1A1D21",
  txt2: "#4E5560",
  txt3: "#666D77",   // 5,23:1 sobre blanco y 4,71:1 sobre el fondo de la app; ver el comentario del tema oscuro

  azul: "#2F5F8C",
  azulL: "#3C7AB0",
  verde: "#3F7A50",
  ambar: "#8A6714",
  rojo: "#A4382E",
  violeta: "#5F5688",

  azulBg: "#2F5F8C14", azulBd: "#2F5F8C4D", azulBg2: "#2F5F8C1F",
  verdeBg: "#3F7A5014", verdeBd: "#3F7A504D",
  ambarBg: "#8A671414", ambarBd: "#8A67144D",
  rojoBg: "#A4382E14", rojoBd: "#A4382E4D",

  // En claro la sombra tiene que ser MUCHO más suave: la misma opacidad que sobre negro
  // se ve como una mancha sucia alrededor de cada tarjeta.
  sombraCard: "0 1px 2px rgba(16,24,40,.06)",
  sombraPop: "0 8px 24px rgba(16,24,40,.14)",

  papel: "#FFFFFF",

  tramaZ1: "#1A1D2114",
  tramaZ2: "#1A1D2126",
  tramaZ3: "#1A1D2140",
};

export const TEMAS = { oscuro: OSCURO, claro: CLARO };
export const TEMA_DEF = "claro";

// `c.<clave>` → `var(--vw-<clave>)`. Se deriva de las claves del tema oscuro, así que
// agregar un color es agregarlo a LOS DOS mapas: si falta en uno, la variable queda sin
// valor y se nota enseguida en pantalla. Hay test.
export const c = Object.fromEntries(
  Object.keys(OSCURO).map(k => [k, `var(--vw-${k})`]));

// ALIAS DE COMPATIBILIDAD CON LOS CROQUIS.
//
// Los cinco SVG y el mapa de velocidad se escribieron contra `var(--sup)`, `var(--txt2)`
// y compañía, de `tema.css`. Reescribirlos todos de una sola vez para cambiar un nombre
// de variable es exactamente el tipo de cambio que rompe un croquis sin que ningún test
// lo note. Los alias dejan que la migración sea gradual y no cuestan nada: son cinco
// declaraciones CSS que apuntan a los tokens nuevos.
const ALIAS = {
  fondo: "canvas", sup: "raised", borde: "border",
  txt: "txt", txt2: "txt2", acento: "azul",
  avisoBg: "ambarBg", avisoBd: "ambarBd",
};

// Bloque CSS con los dos juegos de valores. El claro va en `:root` —esta app abre en
// claro, que es como se imprime una memoria— y el oscuro se activa con `data-tema`.
export const cssTemas = () => {
  const vars = (m) => Object.entries(m).map(([k, v]) => `--vw-${k}:${v}`).join(";");
  const alias = Object.entries(ALIAS).map(([viejo, nuevo]) => `--${viejo}:var(--vw-${nuevo})`).join(";");
  return `:root{${vars(CLARO)};${alias};color-scheme:light}\n`
    + `:root[data-tema="oscuro"]{${vars(OSCURO)};color-scheme:dark}`;
};

// Un tono = color de texto + fondo + borde coherentes entre sí. Centralizarlo evita que
// cada lugar invente su propio ámbar. Los fondos son muy tenues: un aviso tiene que
// distinguirse de un dato, no gritar.
export const TONO = {
  ok:    { fg: c.verde,  bg: c.verdeBg, bd: c.verdeBd },
  aviso: { fg: c.ambar,  bg: c.ambarBg, bd: c.ambarBd },
  error: { fg: c.rojo,   bg: c.rojoBg,  bd: c.rojoBd },
  info:  { fg: c.azulL,  bg: c.azulBg,  bd: c.azulBd },
  neutro:{ fg: c.txt2,   bg: c.overlay, bd: c.border },
};

// ── TIPOGRAFÍA ───────────────────────────────────────────────────────────────────
//
// UNA SOLA FAMILIA en toda la aplicación, la del SISTEMA. Antes convivían la sans del
// navegador y una monoespaciada para las fórmulas de la traza, y se notaba: dos formas
// de dibujar la misma cifra en la misma tarjeta hacen que la pantalla parezca ensamblada
// con pedazos de aplicaciones distintas.
//
// No se descarga nada: no hay petición de red ni parpadeo al cargar, y la fuente existe
// también cuando un croquis se rasteriza o se exporta.
export const FUENTE = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', "
  + "'Segoe UI Variable Text', 'Segoe UI', Roboto, 'Open Sans', 'Helvetica Neue', Arial, sans-serif";

// `MONO` apunta a la MISMA familia. Lo que daba la alineación de columnas no era la
// fuente monoespaciada sino `font-variant-numeric: tabular-nums`, que se conserva en
// `t.num`: es lo único que hacía falta.
export const SANS = FUENTE;
export const MONO = FUENTE;

// TRES TAMAÑOS. Nada más. El salto grande es lo que crea la jerarquía: 18 → 15 → 13 se
// distingue de un vistazo; 13 → 12 → 11 no se distingue nunca, y era lo que había —los
// encabezados de tabla estaban en 11 px con versalitas, ilegibles y ocupando más ancho
// que el dato que rotulaban—.
//
// Lo que antes se resolvía achicando la letra ahora se resuelve con PESO y COLOR sobre
// el mismo cuerpo de 13.
export const TAM = { grande: 18, medio: 15, base: 13 };

export const t = {
  h1:    { fontSize: TAM.grande, fontWeight: 650, letterSpacing: "-0.02em", lineHeight: 1.25, color: c.txt },
  h2:    { fontSize: TAM.medio, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.35, color: c.txt },
  body:  { fontSize: TAM.base, fontWeight: 400, lineHeight: 1.6, color: c.txt2 },
  bodyF: { fontSize: TAM.base, fontWeight: 500, lineHeight: 1.6, color: c.txt },
  // Los números llevan cifras de ANCHO FIJO: en una columna de presiones, que el 1 mida
  // menos que el 8 desalinea la coma y la columna deja de poder recorrerse con la vista.
  num:   { fontSize: TAM.base, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: c.txt },
  numG:  { fontSize: TAM.grande, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", color: c.txt },
  micro: { fontSize: TAM.base, fontWeight: 400, color: c.txt3 },
  eyebrow: { fontSize: TAM.base, fontWeight: 600, color: c.txt3, textTransform: "uppercase", letterSpacing: "0.06em" },
};

// ── FORMA Y PROFUNDIDAD ──────────────────────────────────────────────────────────
export const R = { sm: 4, md: 8, lg: 12, full: 999 };
export const SOMBRA = {
  card: c.sombraCard,
  pop: `${c.sombraPop}, 0 0 0 1px ${c.border}`,
  foco: `0 0 0 3px ${c.azulBd}`,
};

// Una sola duración y una sola curva para todo: microinteracciones que tardan distinto
// se sienten como partes de aplicaciones distintas.
export const TRANS = "140ms cubic-bezier(.2,.6,.35,1)";

// Ancho máximo del contenido. Optimizado para NOTEBOOK de 1366 px, que es donde se usa
// esto: con la barra lateral y los márgenes quedan ~1080 px de contenido útil.
export const ANCHO_CONTENIDO = 1120;
export const ANCHO_SIDEBAR = 232;
export const ANCHO_PANEL = 260;
