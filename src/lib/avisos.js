// AVISOS DEL MODELO — lo que el usuario tiene que saber antes de usar estos números.
//
// ── POR QUÉ EXISTE ─────────────────────────────────────────────────────────────
// La app entrega presiones. Una presión de viento es un número plausible SIEMPRE: si la
// exposición está mal elegida, si el edificio es flexible y se usó G = 0,85, o si la
// cubierta está en una loma y K_zt vale 1,0, el resultado no se rompe —sale un poco más
// chico y nadie se entera—. Ese es el modo de falla real de una herramienta de viento, y
// no lo detecta ningún test: el cálculo está bien, la hipótesis no.
//
// Hasta ahora las advertencias estaban desparramadas: el recuadro de K_zt vivía en la
// columna de datos, el del G calculado al final de la tabla de ráfaga y el de la nota 7
// dentro de un párrafo. Había que recorrer la pantalla entera para juntarlas. Acá se
// arman en un solo lugar, cada una con la PANTALLA donde se resuelve, y de eso salen a
// la vez el punto de color de la barra lateral y el contador de la barra superior.
//
// Es una función pura sobre el análisis ya hecho: no calcula nada, sólo interpreta.

// Los tres niveles significan cosas distintas y no son intercambiables:
//   error → el motor NO cubre lo que se le pidió, o la hipótesis elegida contradice al
//           reglamento. El número que muestra la pantalla no sirve como está.
//   aviso → el número sirve, pero descansa en una hipótesis que hay que confirmar.
//   info  → una decisión que el reglamento tomó y conviene saber que se tomó.
const ORDEN = { error: 0, aviso: 1, info: 2 };

export function avisosDe({ geoN, sitio, cerramiento, rafaga, modoG, n1, analisis, resultantes,
  accesorio, silo, anexo, topo, vel, cerr }) {
  const av = [];
  const push = (o) => av.push(o);

  // ── VELOCIDAD BÁSICA ─────────────────────────────────────────────────────────
  // Los avisos de V los arma `engine/velocidad.js`, que es donde están las reglas de los
  // arts. 1.5.1 a 1.5.3. Acá sólo se reenvían a la lista global, para que un error de
  // velocidad —que invalida TODO el cálculo— no quede escondido en una tarjeta.
  for (const a of vel?.avisos ?? []) {
    if (a.tono === "info") continue;
    push({ id: `vel-${a.ref}-${a.texto.slice(0, 20)}`, tono: a.tono, tab: "Sitio",
      titulo: `Velocidad básica — ${a.ref}`, detalle: a.texto });
  }

  // ── SITIO ────────────────────────────────────────────────────────────────────
  // K_zt es el multiplicador que más puede cambiar el resultado: llega a 3,15. Ahora que
  // hay formulario, el aviso ya no es «la app lo fija en 1,0» sino el MOTIVO concreto por
  // el que dio 1,0 —o los avisos que trae el cálculo cuando sí aplica—.
  if (topo && !topo.aplica) {
    push({ id: "kzt", tono: "aviso", tab: "Sitio",
      titulo: "K_zt = 1,0 — sin efecto topográfico",
      detalle: `${topo.motivo} Si el edificio está en la mitad superior de una loma, en la `
        + "cresta de una escarpa o sobre una colina aislada, el art. 1.8 puede llevar K_zt "
        + "hasta 3,15: más del triple de presión." });
  }
  for (const a of topo?.aplica ? topo.avisos.filter(x => x.tono !== "info") : []) {
    push({ id: `topo-${a.texto.slice(0, 24)}`, tono: a.tono, tab: "Sitio",
      titulo: `Topografía — ${a.ref}`, detalle: a.texto });
  }
  // Exposición B es la que más baja las presiones y la que más se elige por inercia. No
  // es un error —es la categoría más común— pero conviene que quede dicho contra qué se
  // la eligió, porque el art. 1.7 pide 800 m o 20 veces la altura de rugosidad aguas
  // arriba, y un campo abierto a doscientos metros ya la invalida.
  if (sitio.exposicion === "B") {
    push({ id: "expB", tono: "info", tab: "Sitio",
      titulo: "Exposición B — la que da las presiones más bajas",
      detalle: "Requiere rugosidad tipo B en todo el sector de barlovento, por 800 m o 20 "
        + "veces la altura del edificio, lo que sea mayor (art. 1.7.3). Un claro, un río o "
        + "un campo abierto dentro de esa distancia obliga a pasar a C." });
  }

  // ── EDIFICIO ─────────────────────────────────────────────────────────────────
  if (geoN.tipo === "mansarda") {
    push({ id: "mansarda", tono: "error", tab: "Edificio",
      titulo: "Cubierta en mansarda — no implementada",
      detalle: "La nota 6 de la Figura 2.4-1 manda tratar la superficie horizontal superior "
        + "y la inclinada a sotavento como superficies a sotavento, y hace falta declarar la "
        + "altura de la horizontal. El motor todavía no lo hace: los números de las demás "
        + "pantallas corresponden a otra cubierta." });
  }
  // Por encima de la altura gradiente K_z se congela en 2,41. No es un error del motor
  // —la norma lo dice— pero sí es el punto donde el perfil deja de crecer, y verlo
  // explicado evita la sospecha de que la app dejó de sumar.
  const zg = { B: 1000, C: 750, D: 590 }[sitio.exposicion];
  if (geoN.h > 150) {
    push({ id: "fueraTabla", tono: "info", tab: "Edificio",
      titulo: `h = ${geoN.h.toFixed(1).replace(".", ",")} m — fuera de la Tabla 1.13-1`,
      detalle: `La tabla llega a 150 m. K_z se sigue evaluando con la expresión de la nota 1, `
        + `que es de donde sale la tabla, y se congela en 2,41 por encima de z_g = ${zg} m.` });
  }

  // ── PRESIÓN INTERNA ──────────────────────────────────────────────────────────
  // Los avisos de cerramiento apuntan a su PROPIA pantalla: la clasificación dejó de ser
  // un desplegable en Sitio y pasó a calcularse a partir de las aberturas.
  if (cerramiento === "parc_cerrado") {
    push({ id: "parcCerrado", tono: "aviso", tab: "Cerramiento",
      titulo: "Parcialmente cerrado — GC_pi = ±0,55",
      detalle: "Es tres veces la presión interna de un edificio cerrado, y es lo que más "
        + "cambia el levantamiento de la cubierta. "
        + (cerr?.modo === "calculado" && cerr?.gobierna
          ? `Sale de suponer a barlovento la ${cerr.filas.find(x => x.id === cerr.gobierna)
            ?.nombre ?? cerr.gobierna}: ahí se cumplen las dos condiciones del art. 1.2.`
          : "Está DECLARADA, no calculada: conviene cargar las aberturas y verificar las "
            + "condiciones del art. 1.10.") });
  }

  // Las dos lecturas del mismo edificio no pueden discrepar en silencio: una está mal.
  if (cerr?.discrepa) {
    push({ id: "cerrDiscrepa", tono: "aviso", tab: "Cerramiento",
      titulo: "La clasificación declarada no coincide con la calculada",
      detalle: `Las aberturas cargadas dan «${cerr.calculada}» y la clasificación declarada `
        + "dice otra cosa. Son dos lecturas del mismo edificio, y conviene resolverlo "
        + "antes de seguir: entre una y otra puede haber un factor de tres en GC_pi." });
  }

  // En modo declarado, el fundamento es obligatorio.
  if (cerr?.modo === "declarado" && !String(cerr?.fundamento ?? "").trim()) {
    push({ id: "cerrSinFundamento", tono: "error", tab: "Cerramiento",
      titulo: "Cerramiento declarado sin fundamento",
      detalle: "La clasificación está declarada a mano y no dice en qué se funda. Entre "
        + "«cerrado» y «parcialmente cerrado» hay un factor de tres en la presión "
        + "interna: no puede quedar sin justificar." });
  }
  // ⚠ ESTO ERA UN AVISO «info» Y NO LO ES. Un edificio abierto no se resuelve con los Cp
  // de la Figura 2.4-1 sino con los C_N de las Figuras 2.4-4 a 2.4-7, que no están
  // implementados. Los números que la app muestra en ese caso son los de OTRO edificio
  // —uno cerrado— y presentarlos como una nota al pie hacía que se pudieran usar.
  if (cerramiento === "abierto") {
    push({ id: "abierto", tono: "error", tab: "Cerramiento",
      titulo: "Edificio abierto — los resultados NO son válidos",
      detalle: "El capítulo 2 resuelve los edificios abiertos con los coeficientes C_N de "
        + "las Figuras 2.4-4 a 2.4-7, que todavía no están implementados. Lo que se muestra "
        + "sale de aplicar los Cp de la Figura 2.4-1, que son de edificios cerrados: no "
        + "corresponde llevarlo al modelo. La presión interna sí es correcta: GC_pi = 0." });
  }

  // Cuatro aguas con viento paralelo a la cumbrera: la Figura 2.4-1 dibuja ese caso para
  // dos aguas. Se mantiene la zonificación en franjas, que es la extensión razonable, y
  // queda dicho que es una extensión.
  if (analisis?.limatesaParalelo) {
    push({ id: "limatesa-paralelo", tono: "info", tab: "Presiones",
      titulo: "Cuatro aguas con viento paralelo a la cumbrera",
      detalle: "La columna de «viento paralelo a la cumbrera» de la Figura 2.4-1 está "
        + "dibujada para dos aguas. Acá la cara de barlovento es un faldón inclinado y no "
        + "un frontón, así que la zonificación en franjas es una extensión razonable y no "
        + "una transcripción. Se adopta igual, por falta de un tratamiento específico." });
  }

  // ── FACTOR DE RÁFAGA ─────────────────────────────────────────────────────────
  // Esto SÍ es un error: n₁ < 1 Hz vuelve obligatorio a G_f, y usar 0,85 no es
  // conservador porque el 0,85 no contiene la respuesta resonante.
  if (rafaga?.flexible && modoG !== "flexible") {
    push({ id: "flexible", tono: "error", tab: "Ráfaga",
      titulo: "Edificio flexible calculado con un G que no corresponde",
      detalle: "Con n₁ < 1 Hz el art. 1.9.2 exige G_f de la expresión (1.9-10). El 0,85 y el "
        + "calculado de (1.9-6) valen para edificio rígido y no incluyen la respuesta "
        + "resonante, así que acá quedan del lado inseguro." });
  }
  if (!(Number(n1) > 0)) {
    push({ id: "sinN1", tono: "info", tab: "Ráfaga",
      titulo: "Frecuencia natural sin declarar — se supone rígido",
      detalle: "El art. 1.9.1 admite suponer el edificio rígido y adoptar G = 0,85, pero la "
        + "suposición hay que poder sostenerla: un galpón alto y liviano puede estar por "
        + "debajo de 1 Hz. El art. 1.9.3 da tres expresiones aproximadas para estimarla." });
  }
  // El hallazgo que motivó todo el bloque de ráfaga: en terreno liso el calculado SUPERA
  // al 0,85, así que la costumbre de adoptar el valor por defecto "porque es conservador"
  // es falsa fuera de exposición B.
  if (rafaga?.calculadoSupera && modoG === "defecto") {
    push({ id: "gSupera", tono: "aviso", tab: "Ráfaga",
      titulo: "El G calculado supera al 0,85 adoptado",
      detalle: `En exposición ${sitio.exposicion} la turbulencia es baja y (1.9-6) da `
        + `G = ${rafaga.rig.G.toFixed(3).replace(".", ",")}, por encima del valor por defecto. `
        + "Adoptar 0,85 es admisible (art. 1.9.4) pero acá NO es lo conservador." });
  }

  // ── RESULTANTES ──────────────────────────────────────────────────────────────
  if (resultantes?.gobiernaNota7) {
    push({ id: "nota7", tono: "info", tab: "Resultantes",
      titulo: "Gobierna el piso de la nota 7",
      detalle: "Las componentes horizontales de la cubierta restaban del corte, y la nota 7 "
        + "de la Figura 2.4-1 no admite un corte total menor que el de las paredes solas. El "
        + "valor informado es ese mínimo." });
  }
  if (analisis?.modo === "franjas" && geoN.theta >= 10) {
    push({ id: "franjasParalelo", tono: "info", tab: "Presiones",
      titulo: "Cubierta zonificada en franjas pese a tener pendiente",
      detalle: "En esta dirección el viento es paralelo a la cumbrera, y para viento paralelo "
        + "la Figura 2.4-1 zonifica en franjas cualquiera sea θ." });
  }

  // ── CAPÍTULO 4 ───────────────────────────────────────────────────────────────
  //
  // Los avisos del capítulo 4 los produce el propio motor, porque dependen del cálculo:
  // si la fila de régimen del cilindro contradice al D·√q_z, o si un cartel con B/s ≥ 2
  // no se verificó con el caso C. Acá sólo se los reubica en la pantalla que los resuelve,
  // para que salgan por el mismo canal que los del edificio: un aviso que vive únicamente
  // dentro de su tarjeta no enciende el punto de la barra lateral y se pierde al cambiar
  // de pantalla.
  for (const a of accesorio?.avisos ?? []) {
    push({ id: `acc-${a.texto.slice(0, 24)}`, tono: a.tono, tab: "Accesorios",
      titulo: accesorio.fam?.label ?? "Accesorio", detalle: a.texto });
  }
  for (const a of silo?.avisos ?? []) {
    push({ id: `silo-${a.texto.slice(0, 24)}`, tono: a.tono, tab: "Silos y tanques",
      titulo: "Silo, tanque o recipiente cilíndrico", detalle: a.texto });
  }

  for (const a of anexo?.avisos ?? []) {
    push({ id: `anx-${a.texto.slice(0, 24)}`, tono: a.tono, tab: "Secciones uniformes",
      titulo: anexo.fam?.label ?? "Sección uniforme", detalle: a.texto });
  }

  return av.sort((x, y) => ORDEN[x.tono] - ORDEN[y.tono]);
}

// Resumen por pantalla: qué punto de color le toca a cada entrada de la barra lateral.
// Devuelve el tono MÁS GRAVE de la pantalla, no el último ni el primero: un error en una
// pantalla que además tiene dos informativos tiene que verse como error.
export function porTab(avisos) {
  const m = {};
  for (const a of avisos) {
    if (!m[a.tab] || ORDEN[a.tono] < ORDEN[m[a.tab]]) m[a.tab] = a.tono;
  }
  return m;
}

export const contar = (avisos) => ({
  error: avisos.filter(a => a.tono === "error").length,
  aviso: avisos.filter(a => a.tono === "aviso").length,
  info: avisos.filter(a => a.tono === "info").length,
});

// RÓTULO DEL CONTADOR. Existe como función y no escrito en cada lugar porque estaba en
// cuatro —barra superior, ficha, guía y resumen—, y en los cuatro decía «1 avisos».
// Concordar el plural en cuatro archivos a mano es concordarlo mal en alguno.
export function rotuloConteo(n) {
  if (n.error > 0) return { tono: "error", txt: `${n.error} a revisar` };
  if (n.aviso > 0) return { tono: "aviso", txt: `${n.aviso} ${n.aviso === 1 ? "aviso" : "avisos"}` };
  return { tono: "ok", txt: "sin observaciones" };
}
