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
// Los dos brazos se pasaron por el validador de paletas. Separación CVD del peor par
// adyacente: ΔE 18,6 (protan) y 18,0 (tritan), contra un piso de 8 y un objetivo de 15.
// Monotonía de luminosidad y unicidad de tono: ambas pasan por brazo.
//
// El extremo claro queda por debajo de 3:1 contra el fondo, que es lo correcto en una
// escala continua —«cerca de cero» DEBE fundirse con la superficie— pero obliga a un
// alivio: **cada cara lleva su valor escrito encima y existe la tabla de superficies**.
// El color nunca es el único portador del dato. Por eso también toda cara va con trazo:
// un relleno casi neutro sin borde perdería el contorno del edificio.
const CLARO = {
  succion:  ["#b7d3f6", "#5598e7", "#1c5cab"],   // débil → fuerte
  neutro:   "#f0efec",
  presion:  ["#f7c9c8", "#e88a89", "#c02f2e"],
  trazo:    "#52514e",
  texto:    "#0b0b0b",
};
// En modo oscuro «cerca de cero» tiene que recederse contra el fondo OSCURO, así que la
// dirección de luminosidad se invierte: el paso débil es el más apagado y el fuerte el más
// brillante. No es dar vuelta la paleta clara automáticamente; son pasos elegidos de la
// misma rampa contra la otra superficie.
const OSCURO = {
  succion:  ["#1c5cab", "#3987e5", "#86b6ef"],
  neutro:   "#383835",
  presion:  ["#8f2e2e", "#d33f3e", "#f09b9a"],
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
  // tres pasos: el corte en tercios mantiene los saltos visibles (ΔL ≥ 0,06 verificado)
  return arm[f < 1 / 3 ? 0 : f < 2 / 3 ? 1 : 2];
}

// Leyenda de la escala: siete tramos, del más succionado al más comprimido. Se dibuja
// SIEMPRE que haya una cara coloreada; sin leyenda, el color es un adorno.
export function tramosLeyenda(maxAbs, tema = "claro") {
  const c = paleta(tema);
  const m = Math.max(Math.abs(Number(maxAbs) || 0), NULO);
  return [
    { color: c.succion[2], desde: -m,       hasta: -2 * m / 3 },
    { color: c.succion[1], desde: -2 * m / 3, hasta: -m / 3 },
    { color: c.succion[0], desde: -m / 3,   hasta: -NULO },
    { color: c.neutro,     desde: -NULO,    hasta: NULO, nulo: true },
    { color: c.presion[0], desde: NULO,     hasta: m / 3 },
    { color: c.presion[1], desde: m / 3,    hasta: 2 * m / 3 },
    { color: c.presion[2], desde: 2 * m / 3, hasta: m },
  ];
}
