// FORMA REAL DE CADA FACHADA, SEGÚN LA DIRECCIÓN DEL VIENTO.
//
// ── QUÉ ESTABA MAL ──────────────────────────────────────────────────────────────
// Las paredes se integraban como RECTÁNGULOS de ancho B y altura de alero, en todas las
// direcciones y con cualquier cubierta. Eso deja afuera:
//
//   · el HASTIAL —el triángulo del frontón— cuando el viento sopla PARALELO a la cumbrera;
//   · las paredes TRAPECIALES de una cubierta a un agua;
//   · la pared ALTA de esa misma cubierta, que no mide el alero sino alero + remonte.
//
// En un galpón de 20 × 30 con θ = 25° el hastial es un 13 % del área de esa pared, y está
// arriba de todo: donde q_z es mayor y donde el brazo de vuelco es más largo.
//
// ── LAS TRES FORMAS SON LA MISMA ────────────────────────────────────────────────
// Rectángulo, hastial (pentágono) y trapecio se describen todas con tres números: ancho
// `W`, cota `z1` hasta donde la pared es de ancho completo, y cota `z2` donde el ancho se
// hace cero. El rectángulo es el caso `z2 = z1`.
//
//   ancho(z) = W                          para z ≤ z1
//   ancho(z) = W·(z2 − z)/(z2 − z1)       para z1 < z ≤ z2
//
// Tener una sola forma permite integrar q_z·ancho(z) y z·ancho(z) en forma CERRADA, sin
// discretizar la pared: el área y el momento salen exactos y no «exactos a diez cifras».

/**
 * @typedef {object} Fachada
 * @property {"rectangulo"|"hastial"|"trapecio"} forma
 * @property {number} W     ancho de la pared, en metros
 * @property {number} z1    cota hasta la que el ancho es W
 * @property {number} z2    cota donde el ancho se anula (= z1 si es rectángulo)
 * @property {number} area  área exacta
 * @property {number} zTope cota del punto más alto de la pared
 * @property {string} motivo
 */

/** El eje que NO es éste. */
const otroEje = (e) => (e === "X" ? "Y" : "X");

/**
 * La fachada cuyo NORMAL EXTERIOR apunta según `signo` sobre `eje`.
 *
 * Con viento según +X, la pared a barlovento es la que mira a −X: el normal exterior de
 * la pared que el viento golpea primero apunta CONTRA el viento.
 *
 * @param {any} geo  geometría ya normalizada
 * @param {"X"|"Y"} eje    eje del normal exterior de la pared
 * @param {1|-1} signo     sentido del normal exterior
 * @returns {Fachada}
 */
export function fachada(geo, eje, signo) {
  const { a, b, hAlero, tipo, cumbrera, pendienteHacia } = geo;
  // El ancho de una pared es la dimensión del edificio sobre el OTRO eje.
  const W = eje === "X" ? b : a;
  const rect = (motivo) => ({ forma: /** @type {const} */ ("rectangulo"),
    W, z1: hAlero, z2: hAlero, area: W * hAlero, zTope: hAlero, motivo });

  if (tipo === "plana") return rect("Cubierta plana: la pared cierra en el alero.");

  // A cuatro aguas NO hay hastial: los cuatro faldones arrancan en la línea de alero y
  // las cuatro paredes son rectángulos. Es la diferencia con dos aguas que más se pasa
  // por alto, porque el remonte y la altura media son los mismos.
  if (tipo === "cuatro_aguas") {
    return rect("Cubierta a cuatro aguas: los cuatro faldones arrancan en el alero, así "
      + "que ninguna pared tiene frontón.");
  }

  // El remonte sale de `hCumbre`, que `normalizarGeo` ya calculó: tomarlo de ahí y no
  // recalcularlo evita que la pared y el techo puedan discrepar, y de paso rompe la
  // importación circular entre los dos módulos.
  const r = geo.hCumbre - hAlero;

  if (tipo === "vertiente_unica") {
    const ejePend = pendienteHacia.slice(1);
    const signoPend = pendienteHacia[0] === "+" ? 1 : -1;
    if (eje === ejePend) {
      // Las dos paredes normales a la pendiente: una alta y una baja, las dos rectángulos.
      // La pendiente DESCIENDE hacia `pendienteHacia`, así que la pared de ese lado es la
      // baja y la de enfrente es la alta.
      const baja = signo === signoPend;
      const z = baja ? hAlero : hAlero + r;
      return { forma: "rectangulo", W, z1: z, z2: z, area: W * z, zTope: z,
        motivo: `Vertiente única: la pendiente desciende hacia ${pendienteHacia}, así que `
          + `ésta es la pared ${baja ? "BAJA, que cierra en el alero" : "ALTA, que sube "
          + "hasta alero + remonte"}.` };
    }
    // Las paredes paralelas a la pendiente son TRAPECIOS: suben del alero al alero + remonte.
    return { forma: "trapecio", W, z1: hAlero, z2: hAlero + r,
      area: W * hAlero + W * r / 2, zTope: hAlero + r,
      motivo: "Vertiente única: pared paralela a la pendiente, trapecial entre el alero y "
        + "la cota alta." };
  }

  // Dos aguas. El hastial está en las paredes cuyo NORMAL va según el eje de la cumbrera:
  // con cumbrera según X, el frontón se ve en las paredes de x = 0 y x = a.
  if (eje === cumbrera) {
    return { forma: "hastial", W, z1: hAlero, z2: hAlero + r,
      area: W * hAlero + W * r / 2, zTope: hAlero + r,
      motivo: `Dos aguas con cumbrera según ${cumbrera}: esta pared es el HASTIAL, un `
        + "pentágono. El frontón queda por encima del alero y hay que integrarlo." };
  }
  return rect(`Dos aguas con cumbrera según ${cumbrera}: esta pared corre bajo el alero y `
    + "es un rectángulo.");
}

/** Ancho de la fachada a la cota `z`. Cero por encima del punto más alto. */
export function anchoEn(f, z) {
  if (z < 0 || z > f.z2) return 0;
  if (z <= f.z1) return f.W;
  return f.W * (f.z2 - z) / (f.z2 - f.z1);
}

/**
 * Área de la fachada por DEBAJO de la cota `z`, en forma cerrada.
 * Es lo que permite integrar q_z tramo a tramo sin discretizar la pared.
 */
export function areaHasta(f, z) {
  if (!(z > 0)) return 0;
  if (z >= f.z2) return f.area;
  if (z <= f.z1) return f.W * z;
  const d = f.z2 - f.z1;
  return f.W * f.z1 + f.W * (d * d - (f.z2 - z) * (f.z2 - z)) / (2 * d);
}

/**
 * Momento estático ∫₀^z z'·ancho(z') dz'. Con él, el brazo de una franja sale exacto en
 * vez de aproximado por su punto medio, que es lo que se hacía con paredes rectangulares
 * —y ahí daba igual, porque en un rectángulo coinciden—.
 */
export function momentoHasta(f, z) {
  if (!(z > 0)) return 0;
  const zz = Math.min(z, f.z2);
  const base = f.W * Math.min(zz, f.z1) ** 2 / 2;
  if (zz <= f.z1) return base;
  const d = f.z2 - f.z1;
  const k = f.W / d;
  const prim = (u) => f.z2 * u * u / 2 - u * u * u / 3;
  return base + k * (prim(zz) - prim(f.z1));
}

/** Las tres fachadas que ve una dirección de viento. */
export function fachadasDe(geo, dir) {
  const o = otroEje(dir.eje);
  return {
    // El normal exterior de la pared a barlovento apunta CONTRA el viento.
    barlovento: fachada(geo, dir.eje, /** @type {1|-1} */ (-dir.signo)),
    sotavento: fachada(geo, dir.eje, /** @type {1|-1} */ (dir.signo)),
    // Las dos laterales son iguales por simetría salvo en vertiente única, donde igual lo
    // son entre sí: las dos son el mismo trapecio.
    lateral: fachada(geo, /** @type {"X"|"Y"} */ (o), 1),
    lateral2: fachada(geo, /** @type {"X"|"Y"} */ (o), -1),
  };
}

// ── SILUETA: LO QUE EL VIENTO «VE» DE FRENTE ────────────────────────────────────
//
// El art. 2.1.5 pide las áreas PROYECTADAS SOBRE UN PLANO VERTICAL NORMAL AL VIENTO, una
// de pared y otra de cubierta, con presiones distintas —0,75 y 0,40 kN/m²—. La partición
// tiene que ser exacta: si las dos se solapan, el mismo pedazo de silueta paga dos veces.
//
// Criterio: la parte de PARED es el área de la propia pared a barlovento —que por ser
// normal al viento se proyecta sobre sí misma, hastial incluido— y la de CUBIERTA es lo
// que la silueta agrega POR ENCIMA de esa pared. Con viento paralelo a la cumbrera el
// borde superior del hastial ES la línea del techo, así que la cubierta no agrega nada y
// su parte da cero; con viento normal, la cubierta agrega la franja entre el alero y la
// cumbrera.
//
// Cada parte viaja con su BARICENTRO, porque la carga mínima es un caso de carga y un
// caso de carga sin punto de aplicación no da momento en la base.
//
// ⚠ EN CUATRO AGUAS CON VIENTO NORMAL A LA CUMBRERA SE ADOPTA B·r, QUE ES COTA SUPERIOR.
// La cumbrera de un limatesa no recorre todo el largo: los faldones de punta recortan la
// silueta. Calcular el recorte exacto exige la longitud de cumbrera, que hoy no es un
// dato del modelo. Queda del lado seguro y dicho.

/** Un área con su baricentro en altura. `zBar` es `null` cuando el área es nula. */
const trozo = (area, zBar) => ({ area, zBar: area > 1e-12 ? zBar : null });

/** Resta de dos trozos, con el baricentro compuesto. */
function restar(mayor, menor) {
  const area = mayor.area - menor.area;
  if (!(area > 1e-9)) return trozo(0, null);
  return trozo(area, (mayor.area * mayor.zBar - menor.area * menor.zBar) / area);
}

export function siluetaProyectada(geo, dir) {
  const bar = fachada(geo, dir.eje, /** @type {1|-1} */ (-dir.signo));
  const B = bar.W;
  const r = geo.hCumbre - geo.hAlero;
  const zBarPared = bar.area > 0 ? momentoHasta(bar, bar.z2) / bar.area : 0;

  if (!(r > 0)) {
    return { pared: bar.area, zBarPared, cubierta: 0, zBarCubierta: null, B,
      nota: "Cubierta plana: la silueta es la pared." };
  }

  // Cuánto ocupa la SILUETA COMPLETA por encima de la línea de alero. Son dos formas: una
  // franja rectangular de altura r —cuando la cumbrera recorre todo el ancho— o un
  // triángulo con vértice arriba, cuyo baricentro está a un tercio y no a la mitad.
  const franja = trozo(B * r, geo.hAlero + r / 2);
  const triangulo = trozo(B * r / 2, geo.hAlero + r / 3);

  let silueta, nota;
  const paralelaACumbrera = dir.eje === geo.cumbrera;
  if (geo.tipo === "vertiente_unica") {
    const ejePend = geo.pendienteHacia.slice(1);
    const segunPendiente = dir.eje === ejePend;
    silueta = segunPendiente ? franja : triangulo;
    nota = segunPendiente
      ? "Vertiente única con el viento según la pendiente: la silueta sube hasta la cota alta en todo el ancho."
      : "Vertiente única con el viento transversal a la pendiente: la silueta sobre el alero es el triángulo del talud.";
  } else if (paralelaACumbrera) {
    silueta = triangulo;
    nota = "Viento paralelo a la cumbrera: la silueta sobre el alero es el frontón triangular.";
  } else {
    silueta = franja;
    nota = geo.tipo === "cuatro_aguas"
      ? "Cuatro aguas con viento normal a la cumbrera: se adopta B·r, cota superior, porque los faldones de punta recortan la silueta y la longitud de cumbrera no es dato."
      : "Viento normal a la cumbrera: la cumbrera recorre todo el ancho y la silueta sube B·r sobre el alero.";
  }

  // La PARED ya cubre parte de esa franja —el hastial, el trapecio, la pared alta—. La
  // cubierta sólo paga lo que sobra, y con el baricentro de lo que sobra.
  const paredSobreAlero = bar.forma === "rectangulo"
    ? trozo(Math.max(0, bar.area - B * geo.hAlero), geo.hAlero + r / 2)   // pared alta
    : trozo(bar.area - B * geo.hAlero, geo.hAlero + r / 3);               // hastial o trapecio
  const cub = restar(silueta, paredSobreAlero);

  return { pared: bar.area, zBarPared, cubierta: cub.area, zBarCubierta: cub.zBar, B, nota };
}
