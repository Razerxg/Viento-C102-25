// FORMATO DE NÚMEROS — un solo lugar.
//
// COMA DECIMAL para mostrar, punto para el dato. Es la convención del país y la de las
// otras aplicaciones del autor; mezclarlas es lo que produce un «1.234» que se lee como
// mil doscientos en una pantalla y como uno coma dos en la de al lado.
//
// Estaba definido tres veces —en App, en TablaCargas y en BloqueRafaga— con tres
// cantidades de decimales por defecto distintas. Ese es exactamente el tipo de
// duplicación que no rompe nada y hace que la misma magnitud se vea distinta según dónde
// se la mire.
export const f = (n, d = 0) => (Number.isFinite(n) ? n.toFixed(d).replace(".", ",") : "—");

export const fmt = {
  q: (n) => `${f(n, 0)} N/m²`,
  m: (n) => `${f(n, 2)} m`,
  kN: (n) => `${f(n, 1)} kN`,
  kNm: (n) => `${f(n, 1)} kN·m`,
  // Los coeficientes van con tres decimales: K_z y G se comparan contra una tabla que
  // los da con dos o tres, y redondear a dos hace que dos valores distintos se vean
  // iguales justo cuando se está controlando la transcripción.
  coef: (n) => f(n, 3),
};

// Hora corta, para el indicador de guardado.
export const hora = (fecha) => fecha
  ? fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
  : null;

/**
 * Número con separador de miles, para los croquis y la memoria.
 *
 * ⚠ NO ES `toLocaleString`. El separador del navegador depende del idioma del SISTEMA, no
 * del documento: la misma memoria abierta en una máquina en inglés saldría con «1,224.45».
 * Un documento de cálculo no puede cambiar de notación según quién lo abra.
 *
 * Vivía sólo en `lib/memoria.js`. Se mudó acá cuando los croquis pasaron a acotar en
 * milímetros: «3600» sin punto de miles no se lee de un vistazo en un plano, y una segunda
 * implementación al lado de la de la memoria es cómo se llega a que el croquis diga 3.600
 * y la tabla 3600.
 */
export function miles(n, dec = 2) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const [ent, frac] = Math.abs(Number(n)).toFixed(dec).split(".");
  const conMiles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${Number(n) < 0 ? "−" : ""}${conMiles}${frac ? `,${frac}` : ""}`;
}
