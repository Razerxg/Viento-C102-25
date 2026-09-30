// ESCALA DE COLOR PARA LA PRESIÓN DE VIENTO.
//
// La presión tiene POLARIDAD, no sólo magnitud: empuja contra la superficie o tira de
// ella, y son cosas opuestas —una comprime el cerramiento, la otra lo arranca—. Eso pide
// una escala DIVERGENTE: dos tonos opuestos con un neutro en el cero, y no una rampa de
// un solo tono, que borraría justamente la distinción que importa.
//
//   azul  → succión  (p < 0, se aleja de la superficie)
//   gris  → cerca de cero
//   rojo  → presión  (p > 0, empuja contra la superficie)
//
// Nunca un arcoíris y nunca un tono en el punto medio: el medio tiene que leerse como
// «nada», y cualquier color saturado ahí inventa una categoría que no existe.
//
// ── VERIFICADO, NO ESTIMADO ──────────────────────────────────────────────────────
// Los cuatro brazos —dos tonos × dos temas— se pasaron por el validador de paletas como
// RAMPA ORDINAL, que es el chequeo que corresponde: un solo tono, luminosidad monótona,
// salto de luminosidad visible entre pasos adyacentes (ΔL ≥ 0,06) y un extremo claro que
// todavía se despega de la superficie. Los cuatro pasan los cuatro chequeos.
//
// ⚠ CORRER EL VALIDADOR CATEGÓRICO SOBRE UNA RAMPA FALLA POR DISEÑO, y no hay que
// «arreglarlo»: ese chequeo exige que dos colores sean distinguibles como IDENTIDADES
// distintas —dos series de un gráfico— y una rampa está construida para lo contrario, para
// que los pasos vecinos se parezcan y el orden se lea como orden.
//
// ── CINCO PASOS POR BRAZO, Y NO TRES ────────────────────────────────────────────
// Con tres, un caso real se pintaba de dos colores. Medido sobre el galpón con voladizo en
// modo C&R: zona 1 −1,79 · zona 4 de pared −1,64 · zona 2 −2,22 caían TODAS en el mismo
// paso, y el voladizo —−3,01 y −3,44— en el mismo entre sí. Todo el edificio, dos tonos.
// Con cinco pasos ese mismo caso usa cuatro, que es lo que hace que el color diga algo.
//
// El límite no es estético: con cinco pasos los saltos son la mitad de grandes, y el brazo
// ROJO queda en la banda de piso del chequeo de daltonismo —ΔE 7,7 (protan) en claro y 6,9
// en oscuro, contra un objetivo de 8—. Bajo protanopía el rojo pierde su canal de tono y
// sólo queda la luminosidad, así que ensanchar más los pasos oscuros implicaría un rojo que
// ya no se lee como rojo. Es legal con CODIFICACIÓN SECUNDARIA, y acá está de sobra: cada
// cara lleva su valor escrito encima, hay leyenda, y existe la tabla de presiones. El azul
// —que es el brazo que se usa casi siempre, porque el viento succiona más de lo que
// empuja— pasa con ΔE 9,4 en los dos temas.
//
// ⚠ EL PASO MÁS DÉBIL YA NO SE FUNDE CON EL FONDO, y ése fue el otro cambio. Antes era
// `#b7d3f6`, a 1,54:1 contra la tarjeta blanca: una succión chica se veía igual que «nada».
// Eso está bien en una escala CONTINUA donde el extremo claro ES el cero, y acá no lo es:
// hay una banda neutra aparte para |p| < NULO. El paso más claro significa «poca presión,
// pero la hay», y tiene que verse. Ahora arranca en `#86b6ef`, 2,11:1, que es el piso que
// el sistema de diseño fija para una rampa ordinal.
//
// El neutro sí se funde con la superficie, que es lo correcto: el medio tiene que leerse
// como «nada». Por eso toda cara va además con trazo, o un relleno casi neutro sin borde
// perdería el contorno del edificio.
const CLARO = {
  // débil → fuerte. Pasos 250 · 350 · 450 · 550 · 650 de la rampa azul del sistema.
  succion:  ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#104281"],
  neutro:   "#f0efec",
  // Rojo generado sobre el mismo tono (H 23) con luminosidad de 0,780 a 0,388.
  presion:  ["#f09e9a", "#e96d6b", "#d53b42", "#ab242e", "#7b1c21"],
  trazo:    "#52514e",
  texto:    "#0b0b0b",
};
// En modo oscuro «cerca de cero» tiene que recederse contra el fondo OSCURO, así que la
// dirección de luminosidad se invierte: el paso débil es el más apagado y el fuerte el más
// brillante. No es dar vuelta la paleta clara automáticamente; son pasos elegidos de la
// misma rampa contra la otra superficie, y validados contra ella.
const OSCURO = {
  // Pasos 600 · 500 · 400 · 300 · 200. El 600 es el más oscuro que todavía se despega de
  // la tarjeta (#15181C) al 2,20:1.
  succion:  ["#184f95", "#256abf", "#3987e5", "#6da7ec", "#9ec5f4"],
  neutro:   "#383835",
  presion:  ["#98252b", "#c03038", "#e2494d", "#f07674", "#f2a39f"],
  trazo:    "#c3c2b7",
  texto:    "#ffffff",
};

export const paleta = (tema) => (tema === "oscuro" ? OSCURO : CLARO);

// Umbral por debajo del cual la presión se considera nula. 50 N/m² es medio centésimo de
// la carga mínima del art. 2.1.5: por debajo de eso, pintar un color es sugerir una
// diferencia que no existe.
export const NULO = 50;

// Color de una presión, escalada contra la máxima del caso. Se normaliza con el MÁXIMO
// ABSOLUTO de todo el edificio y no con el de cada cara: si cada superficie se escalara
// contra sí misma, todas saldrían del color más intenso y el croquis no diría nada sobre
// cuál manda.
export function colorPresion(p, maxAbs, tema = "claro") {
  const c = paleta(tema);
  const v = Number(p) || 0;
  if (Math.abs(v) < NULO) return c.neutro;
  const m = Math.max(Math.abs(Number(maxAbs) || 0), NULO);
  const f = Math.min(1, Math.abs(v) / m);
  const arm = v < 0 ? c.succion : c.presion;
  // ⚠ LOS CORTES SALEN DEL LARGO DEL BRAZO, NO DE UN NÚMERO ESCRITO A MANO. Estaban fijos en
  // tercios; al pasar de tres pasos a cinco habría que haber tocado dos lugares —acá y la
  // leyenda— y el que se olvidara dejaría la leyenda prometiendo un color que la escala no
  // asigna. Hay test que cruza los dos.
  return arm[Math.min(arm.length - 1, Math.floor(f * arm.length))];
}

// Leyenda de la escala, del más succionado al más comprimido: un tramo por paso de cada
// brazo más el neutro. Se dibuja SIEMPRE que haya una cara coloreada; sin leyenda, el color
// es un adorno.
export function tramosLeyenda(maxAbs, tema = "claro") {
  const c = paleta(tema);
  const m = Math.max(Math.abs(Number(maxAbs) || 0), NULO);
  const n = c.succion.length;
  // Los mismos cortes que `colorPresion`, derivados del mismo largo.
  const borde = (i) => (m * i) / n;
  const succion = c.succion.map((color, i) => ({
    color, desde: -borde(i + 1), hasta: -borde(i),
  })).reverse();
  const presion = c.presion.map((color, i) => ({
    color, desde: borde(i), hasta: borde(i + 1),
  }));
  // El tramo neutro se come el pedacito de cada brazo que cae por debajo del umbral: sin
  // esto la leyenda tendría un hueco entre −NULO y el primer corte.
  succion[succion.length - 1].hasta = -NULO;
  presion[0].desde = NULO;
  return [...succion, { color: c.neutro, desde: -NULO, hasta: NULO, nulo: true }, ...presion];
}
