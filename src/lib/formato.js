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
