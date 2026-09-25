// CAPÍTULO 4 — CARGAS DE VIENTO SOBRE ACCESORIOS DE EDIFICIOS Y OTRAS ESTRUCTURAS.
//
// Todo lo de este archivo se leyó de la imagen del PDF escaneado del capítulo 4 (36
// páginas, sin capa de texto: verificado con pypdf). Cada tabla declara de qué figura y de
// qué página del reglamento sale. Ver la advertencia del encabezado de `CLAUDE.md`: el
// 102-2025 no está en la memoria del modelo y no se transcribe un coeficiente sin el
// documento a la vista.
//
// ── EL CAPÍTULO 4 NO ES «EL CAPÍTULO 2 CON OTROS COEFICIENTES» ──────────────────
// Es otro camino de cálculo. El capítulo 2 da PRESIONES por superficie a partir de Cp y
// GCpi; el capítulo 4 da una FUERZA a partir de un coeficiente de fuerza Cf y un área
// proyectada. No hay presión interna —una pared libre no tiene interior—, y el resultado
// es un vector con su punto de aplicación, no un mapa de presiones.

// ═══════════════════════════════════════════════════════════════════════════════
// FIGURA 4.4-1 — PAREDES LIBRES LLENAS Y CARTELES LLENOS (pág. 4-121 y 4-122)
// ═══════════════════════════════════════════════════════════════════════════════
//
// F = q_h · G · C_f · A_s          expresión (4.4-1)
//
// q_h se evalúa a la altura h definida en la figura —la del BORDE SUPERIOR del cartel, no
// la del centroide—, que es la diferencia con la expresión (4.5-1) de otras estructuras.

// ── CASO A y CASO B ────────────────────────────────────────────────────────────
//
// ⚠ SE ESCRIBE POR FILAS ALINEADAS, no como objetos anidados: cada columna B/s se lee de
// arriba abajo igual que en la figura, que es como se la controla contra el papel. Es el
// mismo criterio que el catálogo de caños de `soporte-elevado-v4`.
//
// LAS FILAS VAN EN s/h DECRECIENTE, como en la figura. Ordenarlas al revés «porque queda
// más prolijo» obliga a leer la tabla del revés cuando se la compara con el reglamento,
// que es justamente cuando importa no equivocarse.
export const BS_CARTEL = [0.05, 0.1, 0.2, 0.5, 1, 2, 4, 5, 10, 20, 30, 45];
export const SH_CARTEL = [1, 0.9, 0.7, 0.5, 0.3, 0.2, 0.16];

// Filas: s/h = 1 · 0,9 · 0,7 · 0,5 · 0,3 · 0,2 · ≤0,16
// Columnas: B/s = ≤0,05 · 0,1 · 0,2 · 0,5 · 1 · 2 · 4 · 5 · 10 · 20 · 30 · ≥45
export const CF_CARTEL_AB = [
  //  ≤0,05  0,1   0,2   0,5    1     2     4     5    10    20    30   ≥45
  [1.80, 1.70, 1.65, 1.55, 1.45, 1.40, 1.35, 1.35, 1.30, 1.30, 1.30, 1.30], // 1
  [1.85, 1.75, 1.70, 1.60, 1.55, 1.50, 1.45, 1.45, 1.40, 1.40, 1.40, 1.40], // 0,9
  [1.90, 1.85, 1.75, 1.70, 1.65, 1.60, 1.60, 1.55, 1.55, 1.55, 1.55, 1.55], // 0,7
  [1.95, 1.85, 1.80, 1.75, 1.75, 1.70, 1.70, 1.70, 1.70, 1.70, 1.70, 1.75], // 0,5
  [1.95, 1.90, 1.85, 1.80, 1.80, 1.80, 1.80, 1.80, 1.80, 1.85, 1.85, 1.85], // 0,3
  [1.95, 1.90, 1.85, 1.80, 1.80, 1.80, 1.80, 1.80, 1.85, 1.90, 1.90, 1.95], // 0,2
  [1.95, 1.90, 1.85, 1.85, 1.80, 1.80, 1.85, 1.85, 1.85, 1.90, 1.90, 1.95], // ≤0,16
];

// AJUSTE DE SUPERFICIE DEL COMENTARIO C 4.4.1 (pág. 4-102).
//
// Es el harness de verificación de las 84 celdas de arriba, y no una vía alternativa de
// cálculo: el comentario dice que los coeficientes de los casos A y B se generaron con
// esta expresión y después se redondearon a los 0,05 más próximos. Un test lo exige sobre
// las 84 celdas y cierra EXACTO —cero discrepancias—, así que una cifra mal transcripta
// salta sola. Es el mismo mecanismo que la fórmula de K_z contra la Tabla 1.13-1.
//
// El 0,85 del denominador no es decorativo: lleva los coeficientes de fuerza medidos en
// túnel a un formato donde se los puede usar junto al factor de ráfaga del art. 1.9.
export function cfCartelAjuste(BsobreS, SsobreH) {
  const lx = Math.log(BsobreS), y = SsobreH;
  return (1.563 + 0.008542 * lx - 0.06148 * y + 0.009011 * lx * lx
    - 0.2603 * y * y - 0.08393 * y * lx) / 0.85;
}

// ── CASO C ─────────────────────────────────────────────────────────────────────
//
// Direcciones de viento OBLICUAS. La fuerza no es una sola: el cartel se parte en regiones
// medidas desde el borde de barlovento y cada una lleva su propio Cf, muy alto cerca del
// borde (hasta 4,30) y bajo lejos de él.
//
// ⚠ EL NÚMERO DE REGIONES DEPENDE DE B/s, y es el número de entradas de esa columna: con
// B/s = 2 hay dos regiones, con B/s = 3 hay tres, con B/s ≥ 4 hay cuatro, y a partir de
// B/s = 13 hay siete. Las regiones TESELAN el ancho B —no se superponen ni dejan huecos—,
// que es lo que permite verificar la transcripción: la última región de cada columna tiene
// que llegar hasta B. Por eso las celdas vacías de la figura son `null` y no ceros.
//
// Consecuencia para la interpolación de la nota 4: entre B/s = 10 y B/s = 13 las dos
// columnas no tienen las mismas regiones, así que interpolar ahí no significa nada. El
// motor interpola DENTRO de cada bloque y se niega entre los dos, en vez de devolver un
// número inventado.
export const CASO_C_REGIONES = [
  { id: "0-s",    desde: 0,  hasta: 1,   label: "0 a s" },
  { id: "s-2s",   desde: 1,  hasta: 2,   label: "s a 2s" },
  { id: "2s-3s",  desde: 2,  hasta: 3,   label: "2s a 3s" },
  { id: "3s-10s", desde: 3,  hasta: 10,  label: "3s a 10s" },
  { id: "3s-4s",  desde: 3,  hasta: 4,   label: "3s a 4s" },
  { id: "4s-5s",  desde: 4,  hasta: 5,   label: "4s a 5s" },
  { id: "5s-10s", desde: 5,  hasta: 10,  label: "5s a 10s" },
  { id: ">10s",   desde: 10, hasta: Infinity, label: "> 10s" },
];

// Bloque angosto: B/s de 2 a 10, con las regiones 0-s · s-2s · 2s-3s · 3s-10s.
// El asterisco de la figura —los valores de la primera región para B/s ≥ 5— marca los que
// se multiplican por el factor de esquina de retorno; se anota aparte, en `CASO_C_ESQUINA`.
export const BS_CASO_C_A = [2, 3, 4, 5, 6, 7, 8, 9, 10];
export const CF_CASO_C_A = {
  //         B/s=2   3     4     5     6     7     8     9    10
  "0-s":    [2.25, 2.60, 2.90, 3.10, 3.30, 3.40, 3.55, 3.65, 3.75],
  "s-2s":   [1.50, 1.70, 1.90, 2.00, 2.15, 2.25, 2.30, 2.35, 2.45],
  "2s-3s":  [null, 1.15, 1.30, 1.45, 1.55, 1.65, 1.70, 1.75, 1.85],
  "3s-10s": [null, null, 1.10, 1.05, 1.05, 1.05, 1.05, 1.00, 0.95],
};

// Bloque ancho: B/s = 13 y ≥ 45, con siete regiones.
export const BS_CASO_C_B = [13, 45];
export const CF_CASO_C_B = {
  //         B/s=13  ≥45
  "0-s":    [4.00, 4.30],
  "s-2s":   [2.60, 2.55],
  "2s-3s":  [2.00, 1.95],
  "3s-4s":  [1.50, 1.85],
  "4s-5s":  [1.35, 1.85],
  "5s-10s": [0.90, 1.10],
  ">10s":   [0.55, 0.55],
};

// Factor de reducción por ESQUINA DE RETORNO, aplicable a los valores marcados con
// asterisco en la figura —la región `0 a s`, donde la succión de borde es máxima—.
// Una esquina de retorno rompe el flujo que produce ese pico.
export const CASO_C_ESQUINA = [
  [0.3, 0.9], [1, 0.75], [2, 0.6],   // [L_r/s, factor]; ≥2 mantiene 0,6
];

// ═══════════════════════════════════════════════════════════════════════════════
// FIGURA 4.5-1 — CHIMENEAS, TANQUES Y ESTRUCTURAS SIMILARES (pág. 4-123)
// ═══════════════════════════════════════════════════════════════════════════════
//
// F = q_z · G · C_f · A_f          expresión (4.5-1), con q_z al CENTROIDE de A_f.
//
// ⚠ EL CRITERIO `D·√q_z` ESTÁ EN UNIDADES SI: D en metros y q_z en N/m², con el umbral en
// 5,3. Es el equivalente del `D√qz > 2,5` de las versiones en libras por pie cuadrado, y
// confundir los dos sistemas cambia de fila y con ella el coeficiente casi al doble.
// Físicamente separa el régimen subcrítico del supercrítico del cilindro.
export const HD_CHIMENEA = [1, 7, 25];

export const CF_CHIMENEA = [
  { id: "cuadrada_cara", seccion: "Cuadrada", detalle: "viento normal a la cara",
    superficie: "Todas", cf: [1.3, 1.4, 2.0] },
  { id: "cuadrada_diag", seccion: "Cuadrada", detalle: "viento según la diagonal",
    superficie: "Todas", cf: [1.0, 1.1, 1.5] },
  { id: "hex_oct", seccion: "Hexagonal u octogonal", detalle: null,
    superficie: "Todas", cf: [1.0, 1.2, 1.4] },
  { id: "circ_super_suave", seccion: "Circular", detalle: "D·√q_z > 5,3",
    superficie: "Moderadamente suave", cf: [0.5, 0.6, 0.7] },
  { id: "circ_super_rugosa", seccion: "Circular", detalle: "D·√q_z > 5,3",
    superficie: "Rugosa (D'/D ≅ 0,02)", cf: [0.7, 0.8, 0.9] },
  { id: "circ_super_muy", seccion: "Circular", detalle: "D·√q_z > 5,3",
    superficie: "Muy rugosa (D'/D ≅ 0,08)", cf: [0.8, 1.0, 1.2] },
  { id: "circ_sub", seccion: "Circular", detalle: "D·√q_z ≤ 5,3",
    superficie: "Todas", cf: [0.7, 0.8, 1.2] },
];

// ═══════════════════════════════════════════════════════════════════════════════
// FIGURA 4.5-2 — CARTELES ABIERTOS Y ESTRUCTURAS RETICULADAS (pág. 4-124)
// ═══════════════════════════════════════════════════════════════════════════════
//
// La nota 1 fija la frontera con la Figura 4.4-1: con aberturas de MENOS del 30 % del área
// bruta el cartel es «lleno» y va por 4.4-1; con 30 % o más es «abierto» y va por acá. No
// es un matiz: el Cf de un cartel lleno ronda 1,8 sobre el área total y el de uno abierto
// ronda 1,6 pero sobre el área SÓLIDA, que es menos de la mitad.
export const CF_RETICULADO = [
  { id: "e_bajo",  rango: "ε < 0,1",     eMin: 0,    eMax: 0.1,  plano: 2.0, circSub: 1.2, circSuper: 0.8 },
  { id: "e_medio", rango: "0,1 a 0,29",  eMin: 0.1,  eMax: 0.29, plano: 1.8, circSub: 1.3, circSuper: 0.9 },
  { id: "e_alto",  rango: "0,3 a 0,7",   eMin: 0.3,  eMax: 0.7,  plano: 1.6, circSub: 1.5, circSuper: 1.1 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// FIGURA 4.5-3 — TORRES RETICULADAS (pág. 4-125)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Acá el reglamento NO da una tabla sino dos polinomios cerrados, así que no hay nada que
// interpolar ni ninguna celda que pueda estar mal leída: o el polinomio está bien escrito
// o da cualquier cosa desde el primer valor.
//
// El comentario aclara que ésta sí cambió respecto del CIRSOC 102-2005 —las Figuras 4.5-1
// y 4.5-2 no—, y que es consistente con el CIRSOC 306-2018.
export const CF_TORRE = {
  cuadrada:  { label: "Cuadrada", f: (e) => 4.0 * e * e - 5.9 * e + 4.0, expr: "4,0ε² − 5,9ε + 4,0" },
  triangular:{ label: "Triangular", f: (e) => 3.4 * e * e - 4.7 * e + 3.4, expr: "3,4ε² − 4,7ε + 3,4" },
};

// Nota 3: miembros REDONDEADOS en lugar de angulares. Es un factor ≤ 1, así que baja la
// fuerza; el tope en 1,0 evita que una torre muy llena salga penalizada por ser redonda.
export const FACTOR_TORRE_REDONDOS = (e) => Math.min(1.0, 0.51 * e * e + 0.57);

// Nota 4: viento SEGÚN LA DIAGONAL de una torre cuadrada. Acá el factor es ≥ 1: la
// diagonal expone las cuatro caras a la vez.
export const FACTOR_TORRE_DIAGONAL = (e) => Math.min(1.2, 1 + 0.75 * e);

// ═══════════════════════════════════════════════════════════════════════════════
// ART. 4.5.1 — ESTRUCTURAS Y EQUIPAMIENTOS SOBRE CUBIERTAS (pág. 4-105)
// ═══════════════════════════════════════════════════════════════════════════════
//
// F_h = q_h · (GC_r) · A_f      (4.5-2)      F_v = q_h · (GC_r) · A_r      (4.5-3)
//
// ⚠ ESTO NO ESTABA EN EL CIRSOC 102-2005. Es de las incorporaciones de ASCE 7-16, y además
// allí se levantó el límite de 18,3 m de altura de edificio que traía el 7-10: ahora
// aplica a edificios de TODAS las alturas.
//
// El (GC_r) no se separa en G por C_r: es un producto tabulado, y el art. 1.9.7 prohíbe
// separarlo. Por eso las dos expresiones no llevan G aparte.
//
// La reducción lineal existe para que la carga no tenga un escalón: un equipo cuyo A_f se
// acerca al del edificio entero no puede llevar el mismo coeficiente de amplificación que
// una unidad chica aislada, porque ya no es un obstáculo local sino parte del volumen.
export const GCR = {
  lateral: { max: 1.9, min: 1.0, ref: "(4.5-2)",
    // A_f menor que 0,1·B·h → 1,9; de 0,1·B·h a B·h baja linealmente hasta 1,0
    limiteBajo: (B, h) => 0.1 * B * h, limiteAlto: (B, h) => B * h },
  vertical: { max: 1.5, min: 1.0, ref: "(4.5-3)",
    limiteBajo: (B, L) => 0.1 * B * L, limiteAlto: (B, L) => B * L },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ART. 4.5.2 — SILOS, TANQUES Y RECIPIENTES CILÍNDRICOS VERTICALES CERRADOS
// ═══════════════════════════════════════════════════════════════════════════════
//
// Alcance de la Figura 4.5-4: h ≤ 40 m, D ≤ 40 m y 0,25 ≤ H/D ≤ 4.

export const SILO_ALCANCE = { hMax: 40, dMax: 40, hdMin: 0.25, hdMax: 4 };

// 4.5.2.1 — El arrastre global de un cilindro AISLADO, sobre la proyección D·H.
// Sale de Standards Australia (2011) y el comentario hace notar que queda cerca del valor
// de superficie lisa de la Figura 4.5-1, o sea que las dos vías no se contradicen.
export const CF_SILO_AISLADO = 0.63;

// 4.5.2.2 — Techos, Figura 4.5-5 (pág. 4-127). Sólo hay SUCCIONES: el comentario dice que
// en los ensayos no se observó presión positiva en ningún techo de estos.
export const CP_TECHO_SILO = { zona1: -0.8, zona2: -0.5 };

// Ancho de la Zona 1 para techos de θ < 10°, en función de H/D. Interpolación lineal
// permitida. Para 10° < θ < 30° las zonas son fijas: 0,6D y 0,4D.
export const B_ZONA1_SILO = [
  { hd: 0.25, b: (D, h) => 0.2 * D,            expr: "0,2·D" },
  { hd: 0.5,  b: (D, h) => 0.5 * D,            expr: "0,5·D" },
  { hd: 1.0,  b: (D, h) => 0.1 * h + 0.6 * D,  expr: "0,1·h + 0,6·D" },
];
export const ZONAS_SILO_INCLINADO = { zona1: 0.6, zona2: 0.4 };  // fracciones de D

// 4.5.2.3 — Fondo de un silo SEPARADO DEL SUELO. Los dos valores son casos, no un rango:
// hay que verificar con los dos. Con C ≤ h/3 se interpola linealmente hacia Cp = 0 según
// C/h, porque un fondo casi apoyado deja de estar expuesto.
export const CP_FONDO_SILO = [0.8, -0.6];
export const FONDO_SILO_LIMITE = 1 / 3;   // C/h por debajo del cual se interpola a cero

// 4.5.2.4 — AGRUPADOS, Figura 4.5-6 (pág. 4-128): tres o más con separación de centro a
// centro menor que 1,25 D. El comentario mide un arrastre 65 % mayor que el del cilindro
// aislado sobre el silo del medio de una fila de tres. Con separación mayor que 2 D se los
// trata como aislados, y entre 1,25 D y 2 D se interpola.
export const SILO_AGRUPADO = { juntosHasta: 1.25, aisladosDesde: 2 };

// C_f en paredes proyectadas, para usar con q_h (no con q_z).
export const CF_SILO_GRUPO = [
  { hd: 1, cf: 1.3, nota: "H/D < 1" }, { hd: 2, cf: 1.1 }, { hd: 4, cf: 1.0 },
];

// C_p del techo del grupo, para usar con q_h.
export const CP_TECHO_SILO_GRUPO = [
  { inclinado: false, hdMax: 0.5, zona1: -0.9, zona2: -0.5, rango: "θ < 10°, H/D ≤ 0,5" },
  { inclinado: false, hdMin: 1.0, zona1: -1.3, zona2: -0.7, rango: "θ < 10°, H/D ≥ 1,0" },
  { inclinado: true,  hdMax: 4.0, zona1: -1.0, zona2: -0.6, rango: "10° < θ < 30°, H/D ≤ 4,0" },
];
// Zonas del grupo: con θ < 10° se parten por la mitad (0,5D y 0,5D), no como el aislado.
export const ZONAS_SILO_GRUPO_PLANO = { zona1: 0.5, zona2: 0.5 };

// ═══════════════════════════════════════════════════════════════════════════════
// ART. 4.5.3 a 4.5.5 — PANELES SOLARES
// ═══════════════════════════════════════════════════════════════════════════════
//
// ⛔ NO IMPLEMENTADOS, Y NO POR FALTA DE TIEMPO.
//
// Los coeficientes de estos tres artículos NO ESTÁN TABULADOS: las Figuras 4.5-7, 4.5-10 y
// 4.5-11 son ONCE GRÁFICOS DE CURVAS sobre ejes logarítmicos, y el reglamento sólo rotula
// unos pocos valores de arranque y de cola. Sacar un valor intermedio exige digitalizar la
// curva de un escaneo, y un coeficiente leído a ojo de un gráfico es exactamente lo que el
// encabezado de CLAUDE.md prohíbe: da una presión plausible y un cálculo equivocado que
// ningún control detecta.
//
// El art. 4.5.4 además necesita el (GC_p) de componentes y revestimientos del Capítulo 5,
// que no está en el repositorio.
//
// Lo que SÍ se puede dar sin inventar nada son los factores de ajuste, que el reglamento
// escribe como expresiones cerradas. Están acá para que el día que se digitalicen las
// curvas no haya que volver sobre el documento, y porque permiten al menos evaluar los
// multiplicadores de la expresión (4.5-6).
//
//   (GC_rn) = γ_p · γ_c · γ_E · (GC_rn)_nom        (4.5-6)
export const SOLAR = {
  // γ_p — factor de altura de parapeto. Los parapetos EMPEORAN las cargas sobre paneles:
  // levantan los vórtices por encima del techo y los juntan hacia el centro.
  gammaP: (hpt, h) => Math.min(1.2, 0.9 + hpt / h),
  // γ_c — factor por longitud de cuerda del panel.
  gammaC: (Lp) => Math.max(0.6 + 0.06 * Lp, 0.8),
  // γ_E — mayoración de borde: 1,5 en paneles expuestos, 1,0 en el resto.
  gammaEExpuesto: 1.5, gammaENormal: 1.0,
  // Límites de aplicabilidad del art. 4.5.3 (Figura 4.5-7).
  limites: { LpMax: 2.10, omegaMax: 35, h1Max: 0.65, h2Max: 1.25, thetaMax: 7 },
  // A_n, área de viento normalizada — nota 3 de la Figura 4.5-7. Es la abscisa de las
  // curvas: sin ella no se puede ni entrar al gráfico.
  areaNormalizada: (A, h, WL, WS) => {
    const Lb = Math.min(0.4 * Math.sqrt(h * WL), h, WS);
    return A * (1000 / Math.pow(Math.max(Lb, 4.5), 2));
  },
  // γ_a — Figura 4.5-8, art. 4.5.4. ES LA ÚNICA FIGURA DE CURVA DE ESTA SERIE QUE SE PUEDE
  // TRANSCRIBIR EXACTO: es una poligonal de tres tramos con los quiebres justo sobre las
  // líneas de grilla, en A = 1 m² y A = 10 m², entre 0,8 y 0,4. No hay nada que estimar.
  gammaA: (A) => {
    if (!(A > 0)) return 0.8;
    if (A <= 1) return 0.8;
    if (A >= 10) return 0.4;
    return 0.8 - 0.4 * (Math.log10(A) / 1);   // log10(10) − log10(1) = 1
  },
  // N_s, frecuencia reducida de paneles montados en el terreno — expresión (4.5-12).
  frecuenciaReducida: (n, Lc, V) => (V > 0 ? (n * Lc) / V : 0),
};
