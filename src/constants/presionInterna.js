// COEFICIENTES DE PRESIÓN INTERNA (GCpi) — Tabla 1.11-1 del CIRSOC 102-2025.
//
// La clasificación de cerramiento es lo que más cambia el resultado y lo que más fácil se
// carga mal: entre «cerrado» (±0,18) y «parcialmente cerrado» (±0,55) hay un factor de
// tres en la presión interna, y en una cubierta liviana eso decide el levantamiento.
//
// ⚠ SIEMPRE SON DOS CASOS, NO UNO. La nota 3 es explícita: hay que considerar el GCpi
// POSITIVO aplicado a todas las superficies internas, y el NEGATIVO aplicado a todas. No
// es elegir el peor de los dos y seguir: uno gobierna el levantamiento de la cubierta y el
// otro la compresión de las paredes, y son combinaciones distintas.
export const CERRAMIENTOS = [
  { id: "abierto", label: "Abierto",
    criterio: "A₀ ≥ 0,8·A_g en cada pared", presion: "Despreciable", gcpi: 0.00 },
  { id: "parc_abierto", label: "Parcialmente abierto",
    criterio: "No cumple las condiciones de cerrado, parcialmente cerrado ni abierto",
    presion: "Moderada", gcpi: 0.18 },
  { id: "parc_cerrado", label: "Parcialmente cerrado",
    criterio: "A₀ > 1,10·A_oi · A₀ > 0,4 m² ó 0,01·A_g (el menor) · A_oi/A_gi ≤ 0,20",
    presion: "Elevada", gcpi: 0.55 },
  { id: "cerrado", label: "Cerrado",
    criterio: "A₀ ≤ 0,01·A_g ó 0,4 m², el que sea menor",
    presion: "Moderada", gcpi: 0.18 },
];

// Art. 1.10.5: si un edificio cumple a la vez «abierto» y «parcialmente cerrado», se
// clasifica ABIERTO. La regla existe porque las dos definiciones no son excluyentes, y sin
// ella dos proyectistas sacarían GCpi de 0,00 y de 0,55 para el mismo edificio.
export const PRIORIDAD_ABIERTO = "Un edificio que cumple simultáneamente «abierto» y "
  + "«parcialmente cerrado» se clasifica como ABIERTO (art. 1.10.5).";

// Factor de reducción por gran volumen interior, expresión (1.11-1). SÓLO para
// parcialmente cerrados: un volumen grande no alcanza a presurizarse al ritmo de la ráfaga.
// `Ri = 1,0` siempre es admisible, y es el lado seguro.
export function ri(volumenInterno, areaAberturas) {
  const Vi = Number(volumenInterno) || 0, Aog = Number(areaAberturas) || 0;
  if (Vi <= 0 || Aog <= 0) return 1.0;
  const r = 0.5 * (1 + 1 / Math.sqrt(1 + Vi / (6950 * Aog)));
  return Math.min(1.0, r);
}

export const gcpiDe = (id) => CERRAMIENTOS.find(c => c.id === id)?.gcpi ?? null;
