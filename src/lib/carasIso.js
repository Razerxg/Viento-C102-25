// QUÉ CARAS SE VEN EN LA ISOMÉTRICA, Y DE QUÉ VÉRTICES SALEN.
//
// Vive fuera del componente porque acá estuvo un bug real y conviene que quede fijado con
// test en vez de con una inspección visual.
//
// EL CUBO. Vértices 0-7, en el orden [x, y, z] con x ∈ {0,a}, y ∈ {0,b}, z ∈ {0,h}:
//   0=(0,0,0) 1=(a,0,0) 2=(a,b,0) 3=(0,b,0) 4=(0,0,h) 5=(a,0,h) 6=(a,b,h) 7=(0,b,h)
//
// LA VISTA. Con la proyección isométrica que usa el croquis, las caras que miran al
// observador son siempre las que quedan en x = a, en y = b y en z = h.
//
// EL ESPEJADO. Cuál cara es barlovento depende de la dirección del viento, y para +X o +Y
// sería la de x = 0 o y = 0, que quedan ATRÁS. Se espeja el modelo en el eje del viento
// para que la cara cargada caiga del lado visible —equivale a girar la maqueta—, y
// entonces los vértices que terminan en x = a o en y = b YA NO SON LOS MISMOS.
//
// Ese fue el error: espejar las coordenadas pero dejar los índices apuntando a la posición
// original. La cara de barlovento salía como un triángulo degenerado contra el borde,
// tapada por la lateral. El croquis se veía «casi bien», que es la peor forma de estar mal.
export function carasIso({ ejeX, pos }) {
  const mirX = pos && ejeX, mirY = pos && !ejeX;
  return {
    mirX, mirY,
    // pared que queda en x = a tras el espejado
    carXa: mirX ? [0, 3, 7, 4] : [1, 2, 6, 5],
    // pared que queda en y = b tras el espejado
    carYb: mirY ? [1, 0, 4, 5] : [2, 3, 7, 6],
    cubierta: [4, 5, 6, 7],
    // vértice que cae en el origen espejado: es el escondido, y de él salen las tres
    // aristas punteadas que dan el volumen sin tapar ninguna cara
    oculto: mirX ? 1 : mirY ? 3 : 0,
    vecinos: mirX ? [0, 2, 5] : mirY ? [2, 0, 7] : [1, 3, 4],
  };
}
