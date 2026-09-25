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
  { id: "loma",    label: "Loma bidimensional (o valle con H negativa)",
    k1: { B: 1.30, C: 1.45, D: 1.55 }, gamma: 3,   muBar: 1.5, muSot: 1.5 },
  { id: "escarpa", label: "Escarpa bidimensional",
    k1: { B: 0.75, C: 0.85, D: 0.95 }, gamma: 2.5, muBar: 1.5, muSot: 4 },
  { id: "colina",  label: "Colina tridimensional axialsimétrica",
    k1: { B: 0.95, C: 1.05, D: 1.15 }, gamma: 4,   muBar: 1.5, muSot: 1.5 },
];

// ⚠ LA TABLA DE K1 DE LA FIGURA CORRESPONDE A EXPOSICIÓN C, aunque la figura no lo diga en
// su encabezado. Se verificó numéricamente: sus siete filas son exactamente
// (K1/(H/Lh))_C × (H/Lh) para las tres formas. La nota 4 —«los multiplicadores deben ser
// usados para cualquier exposición»— se refiere a K2 y K3, que no dependen de la
// exposición; leerla como que K1 tampoco depende daría un error del 20 % en exposición D.
// Por eso el motor calcula K1 desde el cociente y no desde la tabla.
export const K1_TABULADO_ES_EXPOSICION = "C";

// Nota 2 de la figura: por encima de H/Lh = 0,5 el efecto deja de depender de la pendiente.
export const HLH_TOPE = 0.5;
