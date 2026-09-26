// ANEXO I — COEFICIENTES DE FUERZA PARA ESTRUCTURAS O ELEMENTOS ESTRUCTURALES CON SECCIÓN
// TRANSVERSAL UNIFORME. Páginas 247 a 256 del CIRSOC 102-2025.
//
// ⚠⚠ EL SÍMBOLO `Ke` DEL ANEXO NO ES EL `Ke` DEL ARTÍCULO 1.12.
//
// En el cuerpo del reglamento `Ke` es el FACTOR DE ALTITUD, `e^(−0,000119·zg)`. Acá es el
// FACTOR DE CORRECCIÓN POR ESBELTEZ de la Tabla I.6, que vale entre 0,7 y 1,0. Dos cosas
// distintas con el mismo nombre, en el mismo reglamento, y las dos multiplican a la misma
// fuerza. Confundirlas no produce ningún error visible: la fuerza sale un 30 % menor o un
// 12 % mayor y sigue pareciendo razonable. En el código de esta app el de esbeltez se
// llama SIEMPRE `keEsbeltez`, y nunca `Ke` a secas.
//
// Las expresiones del Anexo:
//   F  = G·Cf ·K_e·A_f·q_z     (I.1)
//   Fx = G·Cfx·K_e·A_f·q_z     (I.2)
//   Fy = G·Cfy·K_e·A_f·q_z     (I.3)
// con `A_f = b·ℓ`, `q_z` a la altura del baricentro de `A_f`, y aplicable a esbelteces
// `ℓ/b < 40`.
//
// ── OTRA COSA QUE CONVIENE SABER ANTES DE USARLO ───────────────────────────────
// Las referencias cruzadas del art. I.1 apuntan a los artículos «5.6.3.2» (exposición) y
// «5.8» (factor de ráfaga), que NO corresponden a la numeración del cuerpo del 102-2025
// —donde la exposición es el art. 1.7 y el factor de ráfaga el 1.9—. El Anexo conserva la
// numeración de la edición anterior. La app usa los artículos 1.7 y 1.9, que son los
// vigentes; queda anotado porque quien controle el cálculo contra el papel va a encontrar
// esa discrepancia.

export const ALCANCE_ANEXO = { esbeltezMax: 40, esbeltezTablaMin: 8 };

// ── TABLA I.1 — FORMAS PRISMÁTICAS CON ARISTAS REDONDEADAS (págs. 248 a 250) ────
//
// Entra por `V_z·b`, en m²/s, con dos columnas: `< 4` y `> 10`. Entre medio el reglamento
// admite interpolación lineal. La nota 3 explica por qué el parámetro es `V_z·b`: para aire
// a presión y temperatura constantes el número de Reynolds es proporcional a `V·b`, y lo
// que la tabla está capturando es el paso por el Reynolds crítico del cilindro.
//
// ⚠ LAS RELACIONES SON `b/d`, NO `d/b`. El extractor de texto del PDF da vuelta las
// fracciones apiladas, y leerlas al revés cambia de fila: la elipse achatada (`b/d = 1/2`)
// da 0,7 y la parada (`b/d = 2`) da 1,7, más del doble. Verificado contra la imagen.
export const VB_I1 = [4, 10];   // m²/s

export const TABLA_I1 = [
  //                                                          Vz·b<4  Vz·b>10
  { id: "cil_rugoso",   label: "Cilindro circular, rugoso o con salientes", cf: [1.2, 1.2] },
  { id: "cil_liso",     label: "Cilindro circular, liso",                   cf: [1.2, 0.6] },
  { id: "elipse_b_d_1_2", label: "Elipse achatada, b/d = 1/2",              cf: [0.7, 0.3] },
  { id: "elipse_b_d_2",   label: "Elipse parada, b/d = 2",                  cf: [1.7, 1.5] },
  { id: "cuad_r_1_3",   label: "Cuadrado redondeado, b/d = 1 · r/b = 1/3",  cf: [1.2, 0.6] },
  { id: "cuad_r_1_16",  label: "Cuadrado redondeado, b/d = 1 · r/b = 1/16", cf: [1.3, 0.7] },
  { id: "rect_t_r_1_2", label: "Rectángulo tendido, b/d = 1/2 · r/b = 1/2", cf: [0.4, 0.3] },
  { id: "rect_t_r_1_6", label: "Rectángulo tendido, b/d = 1/2 · r/b = 1/6", cf: [0.7, 0.7] },
  { id: "rect_a_r_1_12", label: "Rectángulo parado, b/d = 2 · r/b = 1/12",  cf: [1.9, 1.9] },
  { id: "rect_a_r_1_4", label: "Rectángulo parado, b/d = 2 · r/b = 1/4",    cf: [1.6, 0.6] },
  { id: "rombo_r_1_3",  label: "Rombo a 45°, r/a = 1/3",                    cf: [1.2, 0.5] },
  { id: "rombo_r_1_12", label: "Rombo a 45°, r/a = 1/12",                   cf: [1.6, 1.6] },
  { id: "rombo_r_1_48", label: "Rombo a 45°, r/a = 1/48",                   cf: [1.6, 1.6] },
  { id: "tri_barl_1_4", label: "Triángulo con vértice a barlovento, r/b = 1/4",  cf: [1.2, 0.5] },
  { id: "tri_barl_1_12", label: "Triángulo con vértice a barlovento, r/b = 1/12", cf: [1.4, 1.4] },
  { id: "tri_barl_1_48", label: "Triángulo con vértice a barlovento, r/b = 1/48", cf: [1.3, 1.3] },
  { id: "tri_sot_1_4",  label: "Triángulo con vértice a sotavento, r/b = 1/4",   cf: [1.3, 0.5] },
  { id: "tri_sot_medio", label: "Triángulo con vértice a sotavento, 1/12 > r/b > 1/48", cf: [2.1, 2.1] },
];

// ── TABLA I.2 — PRISMAS CON ARISTAS VIVAS (pág. 252) ───────────────────────────
//
// Un solo coeficiente: la nota del art. I.3 dice que las secciones de aristas vivas son
// INDEPENDIENTES del número de Reynolds. Tiene sentido físico: el punto de desprendimiento
// lo fija la arista y no la capa límite, así que no hay transición crítica que capturar.
//
// La ORIENTACIÓN es media tabla: el mismo cuadrado da 2,2 de cara y 1,5 de arista.
export const TABLA_I2 = [
  { id: "cuad_cara",     label: "Cuadrado con cara frente al viento",               cf: 2.2 },
  { id: "cuad_arista",   label: "Cuadrado con arista frente al viento",             cf: 1.5 },
  { id: "tri_eq_arista", label: "Triángulo equilátero con arista frente al viento", cf: 1.2 },
  { id: "tri_eq_cara",   label: "Triángulo equilátero con cara frente al viento",   cf: 2.0 },
  { id: "tri_rect",      label: "Triángulo rectángulo",                             cf: 1.55 },
  { id: "octogono",      label: "Octógono",                                         cf: 1.4 },
  { id: "dodecagono",    label: "Dodecágono",                                       cf: 1.3 },
];

// ── TABLAS I.3A y I.3B — PRISMAS DE SECCIÓN RECTANGULAR (págs. 253 y 254) ──────
//
// ⚠ EL MÁXIMO DE `Cfx` NO ESTÁ EN EL CUADRADO. Está alrededor de `d/b = 0,65`, donde llega
// a 3,0 —un 36 % más que el 2,2 del cuadrado—. La nota 1 lo atribuye a Nakaguchi y asoc.
// (1968). Un motor que interpolara suponiendo que la curva es monótona se saltearía el
// pico, que es justamente la condición de diseño.
export const TABLA_I3A = [
  [0.10, 2.2], [0.65, 3.0], [1, 2.2], [2, 1.6], [4, 1.3], [10, 1.1],
];

// `Cfy` es la fuerza TRANSVERSAL al viento y sus valores son ±: no hay un signo correcto,
// son dos casos de carga. Además la curva baja y vuelve a subir —0,6 en `d/b = 2,5` y 1,0
// en `d/b ≥ 20`—, que es la firma de la excitación transversal.
//
// La nota 2 acota su validez: son máximos para ángulos `θ < 20°`. La nota 3 es explícita en
// que para direcciones más oblicuas hace falta información más detallada o el consejo de
// especialistas, así que la app lo dice en vez de dar un número.
export const TABLA_I3B = [
  [0.5, 1.2], [1.5, 0.8], [2.5, 0.6], [4, 0.8], [20, 1.0],
];
export const I3B_THETA_MAX = 20;

// Art. I.4: con `d/b > 1` y el prisma inclinado un ángulo `θ ≤ 15°` respecto del viento,
// `Cfx` se MAYORA por `[1 + (d/b)·tg θ]`. Con `d/b ≤ 1` no se requiere.
export const factorInclinacion = (db, thetaGrados) =>
  db > 1 ? 1 + db * Math.tan((Number(thetaGrados) || 0) * Math.PI / 180) : 1;

// ── TABLA I.4 — PERFILES ESTRUCTURALES (págs. 255 y 256) ───────────────────────
//
// ⚠ EL ÁNGULO θ SE MIDE EN SENTIDO ANTIHORARIO, lo dice el art. I.5. Y la nota de la tabla
// advierte que «la dimensión `b` utilizada en la definición de los coeficientes NO siempre
// es normal a la dirección del flujo»: `A_f = b·ℓ` se arma con la `b` que marca el dibujo
// de cada perfil, no con la proyección sobre el plano normal al viento.
//
// Las primeras seis secciones traen cinco ángulos (0 a 180°); las tres doble T, sólo tres
// (0, 45 y 90°), porque son simétricas respecto del eje y.
export const THETA_I4 = [0, 45, 90, 135, 180];
export const THETA_I4_CORTO = [0, 45, 90];

export const TABLA_I4 = [
  // Los signos son los de la figura: un Cf negativo significa que la componente va en el
  // sentido contrario al del eje dibujado, no que sea una succión.
  { id: "angulo", label: "Ángulo (L), d = 0,5·b", thetas: THETA_I4,
    cfx: [ 1.9,  1.8,  2.0, -1.8, -2.0],
    cfy: [0.95,  0.8,  1.7, -0.1,  0.1] },
  { id: "angulo45", label: "Ángulo (L) a 45°, d = b", thetas: THETA_I4,
    cfx: [ 1.8,  2.1, -1.9, -2.0, -1.4],
    cfy: [ 1.8,  1.8, -1.0,  0.3, -1.4] },
  { id: "cruz", label: "Sección en cruz, x = 0,1·b · d = b", thetas: THETA_I4,
    cfx: [1.75, 0.85,  0.1, -0.75, -1.75],
    cfy: [ 0.1, 0.85, 1.75,  0.75,  -0.1] },
  { id: "zeta", label: "Sección Z, x = 0,1·b · d = 0,45·b", thetas: THETA_I4,
    cfx: [ 1.6,  1.5, -0.95, -0.5, -1.5],
    cfy: [   0, -0.1,   0.7, 1.05,    0] },
  { id: "te", label: "Sección T, d = 1,1·b", thetas: THETA_I4,
    cfx: [ 2.0,  1.2, -1.6, -1.1, -1.7],
    cfy: [   0,  0.9, 2.15,  2.4,  2.1],
    // La figura escribe «±2,1» en esta celda: el signo es indeterminado y hay que verificar
    // con los dos. Anotarlo acá y no como un número negativo aparte es lo que impide que se
    // pierda al leer la tabla.
    ambiguos: [["180", "y"]] },
  { id: "canal", label: "Canal (U), d = 0,43·b", thetas: THETA_I4,
    cfx: [2.05, 1.85,    0, -1.6, -1.8],
    cfy: [   0,  0.6,  0.6,  0.4,    0] },
  { id: "doble_t_048", label: "Doble T, d = 0,48·b", thetas: THETA_I4_CORTO,
    cfx: [2.05, 1.95, 0.5],
    cfy: [   0,  0.6, 0.9],
    ambiguos: [["90", "x"]] },
  { id: "doble_t_1", label: "Doble T, d = b", thetas: THETA_I4_CORTO,
    cfx: [ 1.6,  1.5,   0],
    cfy: [   0,  1.5, 1.9] },
  { id: "doble_t_16", label: "Doble T, d = 1,6·b", thetas: THETA_I4_CORTO,
    cfx: [ 1.4,  1.2,   0],
    cfy: [   0,  1.6, 2.2] },
];

// ── TABLA I.5 — CABLES, TIRANTES Y TUBERÍAS DE ESBELTEZ INFINITA (pág. 256) ────
//
// Acá el umbral de `V_z·b` es **0,6 m²/s**, no el 4 y 10 de la Tabla I.1, y NO hay tramo de
// interpolación: la tabla da `< 0,6` y `≥ 0,6` y nada en el medio.
export const VB_I5 = 0.6;

export const TABLA_I5 = [
  { id: "cable_fino",   grupo: "Cables", label: "Trenzados finos",        bajo: 1.20, alto: 0.90 },
  { id: "cable_grueso", grupo: "Cables", label: "Trenzados gruesos",      bajo: 1.30, alto: 1.10 },
  { id: "tub_lisa",     grupo: "Tirantes y tuberías", label: "Lisa",      bajo: 1.20, alto: 0.50 },
  { id: "tub_rugosa",   grupo: "Tirantes y tuberías", label: "Moderadamente rugosa",
    bajo: 1.20, alto: 0.70 },
];

// ── TABLA I.6 — CORRECCIÓN POR ESBELTEZ (pág. 256) ─────────────────────────────
//
// «Cuando la esbeltez se reduce se facilita el flujo de aire alrededor de sus extremos.
// Este trayecto adicional reduce la magnitud de la fuerza promedio actuante.» Por eso el
// factor es ≤ 1 y crece con `ℓ/b`.
export const TABLA_I6 = [[8, 0.7], [14, 0.8], [30, 0.9], [40, 1.0]];
