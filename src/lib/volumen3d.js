// EL VOLUMEN DEL EDIFICIO EN 3D, CON SU CUBIERTA REAL.
//
// La versión anterior dibujaba SIEMPRE un prisma de tapa plana: un galpón a dos aguas con
// 30° se veía como una caja. El croquis contradecía el dato de entrada, que es peor que no
// tener croquis.
//
// Acá se arma la malla de caras con la geometría verdadera —plana, un agua o caballete— y
// se la proyecta con un pintor por profundidad, de modo que la cubierta se vea como es
// desde cualquier ángulo y sin tener que elegir a mano qué cara va adelante.

// Vértices y caras del edificio. Ejes del modelo: x, y en planta y z hacia arriba.
export function mallaEdificio({ a, b, hAlero, hCumbre, tipo, cumbrera, pendienteHacia }) {
  const plano = !(hCumbre > hAlero + 1e-9);
  const V = [];
  const p = (x, y, z) => { V.push([x, y, z]); return V.length - 1; };

  // los cuatro pies
  const p0 = p(0, 0, 0), p1 = p(a, 0, 0), p2 = p(a, b, 0), p3 = p(0, b, 0);
  // los cuatro aleros
  const a0 = p(0, 0, hAlero), a1 = p(a, 0, hAlero), a2 = p(a, b, hAlero), a3 = p(0, b, hAlero);

  const caras = [];
  const pared = (i, j, k, l, id) => caras.push({ v: [i, j, k, l], tipo: "pared", id });

  if (plano) {
    pared(p0, p1, a1, a0, "y0"); pared(p1, p2, a2, a1, "xa");
    pared(p2, p3, a3, a2, "yb"); pared(p3, p0, a0, a3, "x0");
    caras.push({ v: [a0, a1, a2, a3], tipo: "cubierta", id: "cub" });
    return { V, caras, plano: true };
  }

  const cumbX = cumbrera === "X";
  if (tipo === "vertiente_unica") {
    // Un agua: el borde ALTO es el opuesto a aquel hacia el que desciende la pendiente.
    // Si no se levanta el borde correcto, el croquis muestra el techo al revés y el
    // usuario no tiene cómo notarlo salvo comparando con el dato del formulario.
    const hacia = pendienteHacia ?? (cumbX ? "+Y" : "+X");
    const sube = { "+Y": "y0", "-Y": "yb", "+X": "x0", "-X": "xa" }[hacia];
    const alto = {};
    for (const [k, idx] of [["y0", [a0, a1]], ["yb", [a3, a2]], ["x0", [a0, a3]], ["xa", [a1, a2]]]) {
      alto[k] = idx;
    }
    // se levantan los dos vértices del borde alto
    const arriba = new Set(alto[sube]);
    const c = [a0, a1, a2, a3].map(i => arriba.has(i)
      ? p(V[i][0], V[i][1], hCumbre) : i);
    pared(p0, p1, c[1], c[0], "y0"); pared(p1, p2, c[2], c[1], "xa");
    pared(p2, p3, c[3], c[2], "yb"); pared(p3, p0, c[0], c[3], "x0");
    caras.push({ v: c, tipo: "cubierta", id: "cub" });
    return { V, caras, plano: false };
  }

  // Dos o cuatro aguas: cumbrera al medio, paralela al eje declarado.
  const c0 = cumbX ? p(0, b / 2, hCumbre) : p(a / 2, 0, hCumbre);
  const c1 = cumbX ? p(a, b / 2, hCumbre) : p(a / 2, b, hCumbre);

  if (cumbX) {
    // cumbrera según X: los tímpanos son las caras x = 0 y x = a
    caras.push({ v: [p0, p1, a1, a0], tipo: "pared", id: "y0" });
    caras.push({ v: [p2, p3, a3, a2], tipo: "pared", id: "yb" });
    caras.push({ v: [p1, p2, a2, c1, a1], tipo: "pared", id: "xa" });   // tímpano, 5 vértices
    caras.push({ v: [p3, p0, a0, c0, a3], tipo: "pared", id: "x0" });
    caras.push({ v: [a0, a1, c1, c0], tipo: "cubierta", id: "cub_y0" });
    caras.push({ v: [a3, c0, c1, a2], tipo: "cubierta", id: "cub_yb" });
  } else {
    caras.push({ v: [p3, p0, a0, a3], tipo: "pared", id: "x0" });
    caras.push({ v: [p1, p2, a2, a1], tipo: "pared", id: "xa" });
    caras.push({ v: [p0, p1, a1, c0, a0], tipo: "pared", id: "y0" });
    caras.push({ v: [p2, p3, a3, c1, a2], tipo: "pared", id: "yb" });
    caras.push({ v: [a0, c0, c1, a3], tipo: "cubierta", id: "cub_x0" });
    caras.push({ v: [a1, a2, c1, c0], tipo: "cubierta", id: "cub_xa" });
  }
  return { V, caras, plano: false };
}

// ── PROYECCIÓN ──────────────────────────────────────────────────────────────────
//
// Orbital: dos ángulos, acimut y elevación. Se proyecta en ORTOGRÁFICA y no en
// perspectiva a propósito: con perspectiva la cara del fondo se ve más chica y el croquis
// sugiere una diferencia de tamaño que no existe. Acá las longitudes paralelas se
// conservan y dos caras se pueden comparar mirando.
export function proyector({ acimut, elevacion, escala, centro }) {
  const ca = Math.cos(acimut), sa = Math.sin(acimut);
  const ce = Math.cos(elevacion), se = Math.sin(elevacion);
  // dirección de la cámara, para ordenar por profundidad y decidir visibilidad
  const cam = [ce * sa, -ce * ca, se];
  // ⚠ LOS DOS TÉRMINOS DE `v` LLEVAN EL MISMO SIGNO DE PANTALLA.
  //
  // `v` es la coordenada de SVG, que crece hacia ABAJO, mientras que el vector «arriba» de
  // la cámara y el eje z del modelo crecen hacia arriba. Hay que negar la proyección
  // entera, no sólo la parte de z. Una primera versión negaba únicamente el término de z:
  // subir en altura dibujaba arriba, pero alejarse en planta dibujaba ABAJO. El plano
  // horizontal quedaba espejado respecto del vertical y el edificio salía plegado sobre sí
  // mismo, con las caras cruzándose. Se veía roto, pero no era obvio por qué.
  const proy = ([x, y, z]) => {
    const dx = x - centro[0], dy = y - centro[1], dz = z - centro[2];
    const u = dx * ca + dy * sa;                        // eje «derecha» de la cámara
    const arriba = (-dx * sa + dy * ca) * se + dz * ce; // eje «arriba» de la cámara
    return [u * escala, -arriba * escala];              // SVG crece hacia abajo
  };
  const prof = ([x, y, z]) => x * cam[0] + y * cam[1] + z * cam[2];
  return { proy, prof, cam };
}

// Normal saliente de una cara, por el método del área de Newell: funciona con polígonos de
// cualquier número de vértices —los tímpanos tienen cinco— y no supone que sean planos
// perfectos.
export function normal(pts) {
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0, z0] = pts[i], [x1, y1, z1] = pts[(i + 1) % pts.length];
    nx += (y0 - y1) * (z0 + z1);
    ny += (z0 - z1) * (x0 + x1);
    nz += (x0 - x1) * (y0 + y1);
  }
  const n = Math.hypot(nx, ny, nz) || 1;
  return [nx / n, ny / n, nz / n];
}

// Caras visibles, ordenadas de atrás hacia adelante. Pintar en ese orden resuelve la
// oclusión sin z-buffer: el edificio es convexo, así que el orden por profundidad del
// centroide es exacto.
export function carasVisibles(malla, pr) {
  const centro = (c) => {
    const ps = c.v.map(i => malla.V[i]);
    return [0, 1, 2].map(k => ps.reduce((s, p) => s + p[k], 0) / ps.length);
  };
  return malla.caras
    .map(c => ({ ...c, pts: c.v.map(i => malla.V[i]) }))
    .map(c => ({ ...c, n: normal(c.pts), z: pr.prof(centro(c)) }))
    .filter(c => c.n[0] * pr.cam[0] + c.n[1] * pr.cam[1] + c.n[2] * pr.cam[2] > 1e-9)
    .sort((p, q) => p.z - q.z);
}
