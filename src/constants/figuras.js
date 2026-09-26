// FIGURAS DEL REGLAMENTO — el registro de las que se pueden consultar desde la interfaz.
//
// ── POR QUÉ ALGUNAS SÍ Y OTRAS NO ───────────────────────────────────────────────
//
// Una figura del reglamento entra acá cuando DECIDE ALGO QUE EL TEXTO NO PUEDE DECIR:
//
//   · Define un símbolo. «Declare B, s, h y t» no significa nada hasta ver la Figura 4.4-1;
//     lo mismo con H contra h en un silo, o con C.
//   · La elección es de FORMA. Entre «vertiente única», «dos aguas» y «mansarda» no se
//     elige leyendo: se elige mirando. Ídem la sección de una chimenea o un perfil.
//   · La decisión se toma FUERA de la app. Si el edificio está o no en la mitad superior de
//     una loma es algo que el proyectista resuelve con el terreno a la vista, y para eso
//     necesita ver qué llama «loma» el reglamento y con qué condiciones.
//
// Y NO entra cuando sería ruido:
//
//   · La app ya imprime esa misma tabla —K_z, los C_p de pared, los criterios de
//     cerramiento—. Un escaneo de lo mismo no agrega nada y ocupa una pantalla.
//   · La app dibuja algo MEJOR: los croquis de zonas, el perfil de q(z) y la vista 3D son
//     del caso concreto, con sus números; la figura genérica del reglamento sería un paso
//     atrás.
//   · El dato es un número sin forma: altitud, n₁, β, cantidad de puntos de cálculo.
//   · Ya hay un visor dedicado y mejor, como el de los mapas de velocidad básica.
//
// Los archivos son recortes de los PDF del reglamento, a 200 dpi y reducidos a 980 px de
// ancho. Se guardan en `public/figuras/` y NO se importan como módulos: son imágenes
// grandes que sólo se descargan si alguien abre el tooltip.
export const FIGURAS = {
  "2.4-1": {
    archivo: "fig-2-4-1-cubiertas",
    titulo: "Figura 2.4-1 — tipologías de cubierta",
    ref: "Capítulo 2, pág. 2-86",
    nota: "Las tres tipologías con su planta y su elevación, y la simbología de B, L, h, z "
      + "y θ. La nota 4 es la que hace que una cubierta de vertiente única NO se parta en "
      + "dos faldones, y la nota 6 la que manda tratar la superficie horizontal de una "
      + "mansarda como sotavento.",
  },
  "1.8-1": {
    archivo: "fig-1-8-1-topografia",
    titulo: "Figura 1.8-1 — factor topográfico K_zt",
    ref: "Capítulo 1, art. 1.8, pág. 1-37",
    nota: "Las tres condiciones de aplicación, los dibujos de escarpa y de loma o colina, y "
      + "la tabla de multiplicadores K₁, K₂ y K₃. Es la figura con la que se decide si el "
      + "terreno es llano de verdad: K_zt puede llegar a 1,9, casi el doble de presión.",
  },
  "4.4-1": {
    archivo: "fig-4-4-1-cartel",
    titulo: "Figura 4.4-1 — paredes libres llenas y carteles llenos",
    ref: "Capítulo 4, pág. 4-121",
    nota: "Define B, s, h, t y L_r, y muestra las tres plantas de los casos A, B y C. La "
      + "vista en sección es la que aclara que h se mide al BORDE SUPERIOR del cartel, que "
      + "es la altura a la que se evalúa q en la expresión (4.4-1).",
  },
  "4.4-1c": {
    archivo: "fig-4-4-1-casoC",
    titulo: "Figura 4.4-1 (cont.) — caso C y notas",
    ref: "Capítulo 4, pág. 4-122",
    nota: "La tabla del caso C con sus regiones, el factor de reducción por esquina de "
      + "retorno, y las cuatro notas: porosidad, excentricidad de 0,2·B, reducciones por "
      + "espesor y el factor (1,8 − s/h).",
  },
  "4.5-1": {
    archivo: "fig-4-5-1-chimeneas",
    titulo: "Figura 4.5-1 — chimeneas, tanques y estructuras similares",
    ref: "Capítulo 4, pág. 4-123",
    nota: "Las siete filas con su notación. D es el diámetro en las circulares y la MENOR "
      + "dimensión horizontal en las poligonales; D' es la profundidad de nervaduras y "
      + "ribetes, que es lo que separa «rugosa» de «muy rugosa».",
  },
  "4.5-2": {
    archivo: "fig-4-5-2-reticulados",
    titulo: "Figura 4.5-2 — carteles abiertos y estructuras reticuladas",
    ref: "Capítulo 4, pág. 4-124",
    nota: "La nota 1 fija la frontera con la Figura 4.4-1: con aberturas del 30 % o más el "
      + "cartel es abierto. La nota 3 es la que importa al cargar el dato: el área "
      + "consistente con estos coeficientes es la SÓLIDA proyectada, no la envolvente.",
  },
  "4.5-3": {
    archivo: "fig-4-5-3-torres",
    titulo: "Figura 4.5-3 — torres reticuladas",
    ref: "Capítulo 4, pág. 4-125",
    nota: "Los dos polinomios y las seis notas. La nota 1 aclara que ε y el área son de UNA "
      + "cara y del segmento en consideración; la 5 pide calcular aparte escaleras y "
      + "conductos; la 6 remite al CIRSOC 104 por la adherencia de hielo.",
  },
  "4.5-4": {
    archivo: "fig-4-5-4-silo",
    titulo: "Figura 4.5-4 — nomenclatura de silos y tanques",
    ref: "Capítulo 4, pág. 4-126",
    nota: "Es la figura que distingue H de h: H es la altura del CILINDRO SÓLIDO y h la "
      + "altura media de la cubierta. También define C —el espaciamiento entre el suelo y "
      + "el fondo— y Z, la altura al centroide del área proyectada.",
  },
  "4.5-5": {
    archivo: "fig-4-5-5-techo-silo",
    titulo: "Figura 4.5-5 — techos de silos aislados",
    ref: "Capítulo 4, pág. 4-127",
    nota: "Las dos zonas en planta y en elevación, para θ < 10° y para 10° < θ < 30°, con "
      + "la tabla del ancho b en función de H/D.",
  },
  "4.5-6": {
    archivo: "fig-4-5-6-silo-grupo",
    titulo: "Figura 4.5-6 — silos y tanques agrupados",
    ref: "Capítulo 4, pág. 4-128",
    nota: "Para espaciamientos de centro a centro menores que 1,25 D. Cambian las zonas "
      + "—con θ < 10° se parten por la mitad— y aparecen C_f y C_p propios del grupo.",
  },

  // ── ANEXO I ────────────────────────────────────────────────────────────────────
  // Acá la figura no ilustra la tabla: LA FORMA ES LA TABLA. Ninguna de estas filas se
  // puede identificar por un nombre —«elipse d/b = 1/2 con r/b = 1/12»— sin ver el dibujo.
  "I.1a": { archivo: "anexo-I1-a", titulo: "Tabla I.1 — formas prismáticas redondeadas",
    ref: "Anexo I, pág. 248", nota: "Primera parte: cilindros lisos y rugosos, elipses y "
      + "cuadrados con aristas redondeadas." },
  "I.1b": { archivo: "anexo-I1-b", titulo: "Tabla I.1 (cont.) — formas redondeadas",
    ref: "Anexo I, pág. 249", nota: "Rectángulos con aristas redondeadas y la sección en "
      + "rombo a 45°." },
  "I.1c": { archivo: "anexo-I1-c", titulo: "Tabla I.1 (cont.) — formas redondeadas y notas",
    ref: "Anexo I, pág. 250", nota: "Últimas filas y las tres notas, incluida la del número "
      + "de Reynolds: para aire a presión y temperatura constantes, Re es proporcional a V·b, "
      + "que es por qué la tabla entra por V_z·b." },
  "I.2": { archivo: "anexo-I2", titulo: "Tabla I.2 — prismas con aristas vivas",
    ref: "Anexo I, pág. 252", nota: "Siete secciones poligonales. La orientación importa: "
      + "un cuadrado de cara al viento da 2,2 y el mismo cuadrado de arista da 1,5." },
  "I.3A": { archivo: "anexo-I3A", titulo: "Tabla I.3A — C_fx de prismas rectangulares",
    ref: "Anexo I, pág. 253", nota: "El máximo NO está en el cuadrado sino alrededor de "
      + "d/b = 0,65, donde C_fx llega a 3,0." },
  "I.3B": { archivo: "anexo-I3B", titulo: "Tabla I.3B — C_fy de prismas rectangulares",
    ref: "Anexo I, pág. 254", nota: "Valores máximos de C_fy para ángulos menores que 20°. "
      + "La nota 3 es explícita: para direcciones oblicuas mayores hace falta información "
      + "más detallada o el consejo de especialistas." },
  "I.4a": { archivo: "anexo-I4-a", titulo: "Tabla I.4 — perfiles estructurales",
    ref: "Anexo I, pág. 255", nota: "Nueve secciones con su θ medido en sentido "
      + "ANTIHORARIO. Cada dibujo trae su relación d/b, que es lo que identifica la fila." },
  "I.4b": { archivo: "anexo-I4-b", titulo: "Tablas I.4 (cont.), I.5 y I.6",
    ref: "Anexo I, pág. 256", nota: "La nota de la Tabla I.4 advierte que la dimensión b no "
      + "siempre es normal a la dirección del flujo. Siguen los coeficientes de cables, "
      + "tirantes y tuberías, y el factor de corrección por esbeltez." },
};

export const figuraDe = (id) => FIGURAS[id] ?? null;
