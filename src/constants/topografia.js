// FACTOR TOPOGRÁFICO Kzt — Figura 1.8-1 del CIRSOC 102-2025.
//
// Kzt = (1 + K1·K2·K3)²   —expresión (1.8-1)—, con K1, K2 y K3 ≥ 0.
//
// La app trabaja por defecto con Kzt = 1,0, PERO TIENE QUE AVISAR CUÁNDO NO CORRESPONDE.
// Un edificio en la mitad superior de una loma con H/Lh = 0,5 en exposición C llega a
// Kzt = 1,89: casi el doble de presión. Asumir 1,0 ahí no es conservador, es equivocado.
//
// Art. 1.8.1 — las TRES condiciones tienen que cumplirse a la vez para que Kzt > 1:
//   1. la estructura está en la mitad superior de la loma o colina, o cerca de la cresta
//      de una escarpa;
//   2. H/Lh ≥ 0,2;
//   3. H ≥ 5 m en exposición C y D, ó H ≥ 20 m en exposición B.
// Si alguna no se cumple, Kzt = 1,0.
export const CONDICIONES_KZT = {
  hLhMin: 0.2,
  hMin: { B: 20, C: 5, D: 5 },
};

// [forma, K1/(H/Lh) por exposición, γ, μ barlovento, μ sotavento]
// El cociente K1/(H/Lh) SÍ depende de la exposición; γ y μ no.
export const FORMAS_TOPO = [
  { id: "loma_2D",    label: "Loma bidimensional",
    k1: { B: 1.30, C: 1.45, D: 1.55 }, gamma: 3,   muBar: 1.5, muSot: 1.5 },
  { id: "escarpa_2D", label: "Escarpa bidimensional",
    k1: { B: 0.75, C: 0.85, D: 0.95 }, gamma: 2.5, muBar: 1.5, muSot: 4 },
  { id: "colina_3D",  label: "Colina tridimensional axialsimétrica",
    k1: { B: 0.95, C: 1.05, D: 1.15 }, gamma: 4,   muBar: 1.5, muSot: 1.5 },
];

// ⚠ DOS COSAS CIERTAS A LA VEZ SOBRE LA TABLA DE K1, Y CONVIENE NO CONFUNDIRLAS.
//
// NUMÉRICAMENTE, sus siete filas son exactamente (K1/(H/Lh))_C × (H/Lh): está construida
// con los cocientes de exposición C.
//
// NORMATIVAMENTE, la nota 4 dice que los multiplicadores valen para CUALQUIER exposición,
// y el art. 1.8.2 permite usar expresiones o tablas indistintamente. Usar la tabla en
// exposición D es entonces una vía que el reglamento habilita, no un error del usuario.
//
// Lo que corresponde es AVISAR: en exposición D la tabla queda por debajo del K1 de las
// expresiones —entre 6,5 % y 10,5 % según la forma— y ese desvío va en contra de la
// seguridad. El motor ofrece los dos métodos, usa expresiones por defecto y avisa cuando
// se pide tabla en exposición D.
export const TABLA_K1_CONSTRUIDA_CON_EXPOSICION = "C";

// Nota 2 de la figura: por encima de H/Lh = 0,5 el efecto deja de depender de la pendiente.
export const HLH_TOPE = 0.5;
