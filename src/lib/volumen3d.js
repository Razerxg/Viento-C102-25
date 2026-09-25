// EL VOLUMEN DEL EDIFICIO EN 3D, CON SU CUBIERTA REAL.
//
// La versión anterior dibujaba SIEMPRE un prisma de tapa plana: un galpón a dos aguas con
// 30° se veía como una caja. El croquis contradecía el dato de entrada, que es peor que no
// tener croquis.
//
// Acá se arma la malla de caras con la geometría verdadera —plana, un agua o caballete— y
// se la proyecta con un pintor por profundidad, de modo que la cubierta se vea como es
// desde cualquier ángulo y sin tener que elegir a mano qué cara va adelante.

import { caraVisible } from './camara3d.js';

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

  // ⚠ EL SÓLIDO VA CERRADO, CON PISO. Sin la cara de abajo, la vista «desde abajo»
  // muestra el interior del edificio y se ve rota. El piso nunca recibe presión de viento,
  // así que se marca con su propio tipo y se pinta neutro.
  caras.push({ v: [p0, p3, p2, p1], tipo: "piso", id: "z0" });

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

// ── CARAS VISIBLES ──────────────────────────────────────────────────────────────
//
// La cámara vive en `camara3d.js`, portada de la app de bases: mismo arrastre, mismo
// encuadre y mismas vistas ortogonales que allá, para que las dos aplicaciones no se
// sientan como dos programas distintos.

// Normal saliente por el método del área de Newell: funciona con polígonos de cualquier
// número de vértices —los tímpanos tienen cinco— y no supone que sean planos perfectos.
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

// Caras que miran al observador, ordenadas de LEJOS A CERCA: pintar en ese orden resuelve
// la oclusión sin z-buffer. El edificio es convexo, así que ordenar por la profundidad del
// centroide es exacto.
export function carasVisibles(malla, cam) {
  return malla.caras
    .map(c => {
      const pts = c.v.map(i => malla.V[i]);
      const cen = [0, 1, 2].map(k => pts.reduce((s, p) => s + p[k], 0) / pts.length);
      return { ...c, pts, n: normal(pts), cerca: cam.cerca(cen[0], cen[1], cen[2]) };
    })
    .filter(c => caraVisible(cam, c.n))
    .sort((a, b) => a.cerca - b.cerca);
}
