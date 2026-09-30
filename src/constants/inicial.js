// ESTADO INICIAL DEL PROYECTO — un caso completo, no campos vacíos.
//
// ── POR QUÉ VIVE ACÁ Y NO EN EL CONTEXTO ───────────────────────────────────────
// Es la referencia contra la que se fusiona TODO archivo que se abre: un proyecto
// guardado antes de que existiera un campo tiene que seguir abriendo, con el valor por
// defecto del campo nuevo. Esa fusión la hace `lib/proyecto.js`, que es código puro y
// está dentro del typecheck; importarla desde un `.jsx` metería un componente de React en
// la cadena de un módulo que no dibuja nada.
//
// Abrir en blanco, además, obliga a inventar un edificio antes de poder ver qué hace la
// app, y el que llega por primera vez no sabe qué inventar. Con un caso cargado, la
// primera pantalla ya muestra presiones y el usuario cambia lo que le interesa.

// ⚠ NO HAY CAMPOS DE FUNDAMENTO. La app registra las DECLARACIONES técnicas —qué modo de
// cerramiento, qué condiciones del 2.4.7, si el piso es solidario— porque cambian el
// cálculo, pero no pide justificarlas por escrito. El fundamento lo agrega el proyectista
// a la memoria, a mano. Había cinco campos de texto libre —categoría de riesgo, V
// adoptada y su documento, cerramiento declarado, exención del 2.4.7— y dos de ellos
// producían avisos de nivel ERROR por estar vacíos.
export const INICIAL = {
  proyecto: "Edificio sin nombre",
  ciudad: "Buenos Aires",
  riesgo: "II",
  // ── ORIGEN DE V, art. 1.5 ───────────────────────────────────────────────────
  // Por defecto la tabla de ciudades, que es lo que la app hacía antes. Los proyectos
  // guardados NO traen este campo, así que la fusión contra `INICIAL` los deja en
  // «tabla», que es exactamente lo que estaban usando.
  origenV: "tabla",
  vInterp: { V1: "", V2: "", d1: "", d2: "" },
  vManual: { V: "" },
  vConv: { V50: "" },
  exposicion: "B",
  altitud: "0",
  usarKe: true,
  // ── CERRAMIENTO ─────────────────────────────────────────────────────────────
  // `cerramiento` es la clasificación DECLARADA. Sigue existiendo porque es lo que traen
  // los proyectos guardados, y porque el modo «declarado» la usa tal cual.
  cerramiento: "cerrado",
  // ⚠ LOS PROYECTOS GUARDADOS MIGRAN A «declarado». Un proyecto viejo no tiene aberturas
  // cargadas, así que calcularlo daría «cerrado» y pisaría en silencio la clasificación
  // que el proyectista había elegido a mano. Los proyectos NUEVOS arrancan en «calculado».
  cerrModo: "calculado",
  aberturas: [],
  cerr: {
    esSalud: false, distanciaCosta: "", detritusDeclarada: false,
    // ⚠ POR DEFECTO R_i = 1,0, que es lo conservador y lo que la app hacía de hecho
    // cuando calculaba la expresión y no la aplicaba. Adoptar la (1.11-1) es una decisión
    // del proyectista y queda declarada.
    modoRi: "uno",
    // Vacío = automático: se precarga con el volumen geométrico exacto.
    Vi: "",
  },
  // ── TOPOGRAFÍA, art. 1.8 ────────────────────────────────────────────────────
  // Por defecto SIN accidente declarado, que es terreno llano y K_zt = 1,0. No es lo
  // mismo que «se supone 1,0»: acá el 1,0 sale de que el usuario no declaró ninguna loma,
  // y la app lo dice con ese motivo.
  topo: {
    forma: "", exposicionLocal: "", H_m: "", Lh_m: "", x_m: "0",
    lado: "barlovento", cond1: false, metodo: "expresiones",
    // Opción CONSERVADORA por defecto: los multiplicadores de la Fig. 1.8-1 suponen
    // viento en la dirección de máxima pendiente (nota 3), así que aplicarlos en las
    // cuatro es mayorar. Desactivarla exige declarar en qué direcciones aplica.
    todasLasDirecciones: true, direcciones: ["Wx+"],
  },
  geo: { a: "20", b: "30", hAlero: "6", theta: "0", cumbrera: "X",
    tipo: "plana", pendienteHacia: "+Y",
    // ── VOLADIZO DE CUBIERTA ────────────────────────────────────────────────
    // Sin vuelo por defecto, que es el caso más común y el que traen todos los proyectos
    // guardados antes de que esto existiera. `grupos` lleva un número por grupo de bordes
    // —cómo se piensa el vuelo al proyectar— y `porBorde` los cuatro por separado, para
    // cuando el edificio no es simétrico. El modo dice cuál de los dos manda.
    voladizo: { modo: "simetrico", grupos: {}, porBorde: {} } },
  n1: "",
  beta: "0.02",
  modoG: "defecto",
  tipoFrec: "",
  puntosPerfil: "10",
  // Excepción de la propia nota 7 de la Figura 2.4-1: «excepto para SPRFVs en el techo
  // consistentes en entramados resistentes a momento». Por defecto NO, o sea con piso.
  porticosCubierta: false,
  // El piso es parte de la estructura —contenedor, shelter sobre skid, módulo— y la
  // presión interna se autoequilibra. Desactivado por defecto: lo conservador.
  pisoSolidario: false,

  // ── CASOS DE CARGA DE LA FIGURA 2.4-8 ───────────────────────────────────────
  // Por defecto NO se declara ninguna exención del art. 2.4.7: se verifican los cuatro
  // casos, los dos torsionales incluidos. Es lo conservador y es lo que el reglamento
  // pide salvo que se demuestre lo contrario. El diafragma arranca en rígido, que es lo
  // que hace aplicable el momento torsor tal cual sale de la figura.
  env: { cond247: [], arts247: [], diafragma: "rigido" },

  // ── CAPÍTULO 4 ──────────────────────────────────────────────────────────────
  // Un caso cargado por defecto, igual que el edificio: abrir en blanco obliga a inventar
  // un cartel antes de poder ver qué hace la pantalla.
  cap4: {
    familia: "cartel_lleno",
    kd: "",              // "" = el que la Tabla 1.6-1 da para esta familia
    // pared libre / cartel lleno
    B: "6", s: "2", h: "5", eps: "", t: "", Lr: "", dobleCara: false,
    // cartel abierto / entramado
    epsAb: "0.25", miembro: "plano", Dmiembro: "0.05",
    // chimenea / tanque
    hChim: "20", Dchim: "3", filaChimenea: "circ_super_suave",
    // torre reticulada
    hTorre: "30", BTorre: "2", epsTorre: "0.25", seccionTorre: "cuadrada",
    redondos: false, diagonal: false,
    // equipo sobre cubierta
    Bedif: "30", hedif: "12", Ledif: "40", Af: "6", Ar: "9",
  },
  // ⚠ EL SILO LLEVA SU PROPIO K_d. Antes tomaba el de la pantalla de Accesorios, así que
  // elegir «cartel lleno» allá dejaba el tanque calculado con K_d = 0,85 en vez de 1,00:
  // un 15 % menos de presión sobre otra estructura, sin que nada lo dijera. Por defecto va
  // la fila de chimeneas y tanques redondos, que es lo que un silo cilíndrico es.
  silo: { D: "10", H: "18", theta: "25", separacion: "5", elevado: false, C: "",
    kd: "chim_redonda" },
  // ── COMPONENTES Y REVESTIMIENTOS, CAPÍTULO 5 ───────────────────────────────
  // `parapeto` es una casilla y no una altura: la nota 5 de la Fig. 5.3-2A no interpola,
  // dispara con 1 m o más alrededor de TODO el perímetro. Pedir la altura haría creer que
  // un parapeto de 0,60 m produce media sustitución.
  cyr: { parapeto: false, sombrear: false, zonaVista: "todas" },
  // Los elementos van en un arreglo de primer nivel, como las aberturas: son una lista que
  // el usuario edita fila por fila, no un puñado de campos de un formulario.
  //
  // La lista arranca con dos ejemplos cargados y no vacía. Una pantalla de C&R sin
  // elementos no muestra NADA —ni zonas, ni presiones, ni el croquis—, y el usuario tiene
  // que adivinar que lo primero es agregar una fila. Con una correa y un larguero típicos
  // se ve de entrada qué hace la pantalla, y borrarlos es un clic.
  elementosCyR: [
    { id: "cyr-1", nombre: "Correa de cubierta", tipo: "correa", superficie: "cubierta",
      L: "6", s: "1.5", area: "" },
    { id: "cyr-2", nombre: "Larguero de pared", tipo: "larguero", superficie: "pared",
      L: "4", s: "1.2", area: "" },
  ],
  // ANEXO I — secciones de forma uniforme. Lleva su propio K_d por el mismo motivo que el
  // silo: un caño redondo va por la fila de chimeneas redondas, no por el 0,85 del edificio.
  anexo: { familia: "redondeada", kd: "chim_redonda",
    b: "0.5", L: "12", z: "6", d: "0.5", theta: "0",
    filaI1: "cil_liso", filaI2: "cuad_cara", filaI5: "tub_lisa",
    perfil: "angulo", thetaPerfil: "0" },
};
