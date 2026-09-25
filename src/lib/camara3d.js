// PROYECCIÓN AXONOMÉTRICA CON CÁMARA ORIENTABLE.
//
// Es la misma máquina que usa la app de bases, y está portada a propósito: las dos
// aplicaciones son del mismo autor y se usan una al lado de la otra, así que una escena
// 3D que se gira distinto, que encuadra distinto o que no tiene las mismas vistas
// ortogonales hace que se sientan como dos programas ajenos. Si un día cambia la
// sensibilidad del arrastre, tiene que cambiar igual en las dos.
//
// Dos ángulos:
//   · `yaw`   — giro alrededor del eje VERTICAL Z (rotar la pieza en planta)
//   · `pitch` — elevación del observador sobre el plano del terreno
//
//   sx = x·cos(yaw) − y·sin(yaw)
//   sy = (x·sin(yaw) + y·cos(yaw))·sin(pitch) − z·cos(pitch)      (+sy es HACIA ABAJO)
//
// Lo que hace que esto se pueda girar es la tercera coordenada, la que se pierde al
// proyectar: se conserva como `cerca`, y es lo que permite ordenar las caras por
// profundidad y descartar las que miran para el otro lado.
//
// ⚠ LOS DOS TÉRMINOS DE `sy` COMPARTEN EL SIGNO DE PANTALLA. Una versión anterior de esta
// app negaba sólo el de z: subir en altura dibujaba arriba pero alejarse en planta
// dibujaba ABAJO, el plano horizontal quedaba espejado respecto del vertical y el edificio
// salía plegado sobre sí mismo. Acá `sy` sale de una sola expresión y no puede desalinearse.
export function camara(yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  // vector que apunta HACIA EL OBSERVADOR, en coordenadas del mundo
  const vista = [sy * cp, cy * cp, sp];
  return {
    yaw, pitch, vista,
    proy: (x, y, z) => [x * cy - y * sy, (x * sy + y * cy) * sp - z * cp],
    // mayor = MÁS CERCA. Se pinta de menor a mayor: lo lejano primero.
    cerca: (x, y, z) => x * vista[0] + y * vista[1] + z * vista[2],
  };
}

// ¿La cara de normal `n` mira al observador? Sin esto, al girar por detrás se ven las
// caras del fondo pintadas encima de las de adelante.
export const caraVisible = (cam, n) =>
  n[0] * cam.vista[0] + n[1] * cam.vista[1] + n[2] * cam.vista[2] > 1e-9;

// Encaja una nube de puntos YA PROYECTADOS en el lienzo. Es lo que evita que la pieza se
// salga del cuadro a mitad de una rotación: la vista se reencuadra sola.
export function encuadre(puntos, ancho, alto, margen = 40) {
  if (!puntos.length) return { esc: 1, dx: ancho / 2, dy: alto / 2 };
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of puntos) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const w = Math.max(x1 - x0, 1e-6), h = Math.max(y1 - y0, 1e-6);
  const esc = Math.min((ancho - 2 * margen) / w, (alto - 2 * margen) / h);
  return { esc, dx: ancho / 2 - esc * (x0 + x1) / 2, dy: alto / 2 - esc * (y0 + y1) / 2 };
}
