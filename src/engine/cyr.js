// CAPÍTULO 5 — COMPONENTES Y REVESTIMIENTOS. EVALUACIÓN DE (GC_p).
//
// Por ahora, sólo el evaluador de curvas. El resto del cálculo —selección de figura,
// zonas, p = q_h[(GC_p) − (GC_pi)], mínimo del art. 5.2.2— va llegando por etapas y se
// apoya en esto.
//
// ── UN SOLO EVALUADOR PARA LAS OCHO FIGURAS ────────────────────────────────────
// Las curvas de `constants/cyrCurvas.js` son poligonales en log A con los extremos
// congelados, que es exactamente lo que hace `interpolar`. No se escribe una segunda
// implementación: la regla «fuera de la tabla vale el extremo» ya está resuelta ahí, con
// su motivo escrito, y tener dos copias de esa regla es la forma cómoda de que un día se
// arregle una y la otra no.
import { interpolarPares } from "./interpolacion.js";

/**
 * (GC_p) de una curva para un área efectiva.
 *
 * La interpolación es LINEAL EN log A, no en A: las curvas de la norma son rectas sobre el
 * eje logarítmico del gráfico, y las ecuaciones del comentario son literalmente
 * `a + b·log A`. Interpolar en A daría, en la zona 3 de la Fig. 5.3-2A con A = 5 m²,
 * −3,05 contra los −3,20 + 1,0595·log 5 = −2,46 de la norma: 24 % de diferencia, con la
 * curva pasando igual por los dos extremos, que es lo que hace que el error no se vea.
 *
 * Ese error cae del lado conservador —la cuerda en A queda por debajo de una curva
 * cóncava, y para los positivos por encima—, y eso es justamente lo que lo vuelve difícil
 * de encontrar: no rompe ninguna verificación. Pero rompe la comparación contra la
 * Tabla 5.13-2, que es el control cruzado del capítulo, y sobre todo no es el coeficiente
 * que da el reglamento.
 *
 * @param {[number, number][]} curva  puntos [A (m²), (GC_p)] en área creciente
 * @param {number} A  área efectiva de viento, en m²
 * @returns {{valor: number, interpolado: boolean, puntos: {A: number, gcp: number}[],
 *            fuera: "debajo"|"encima"|null}}
 */
export function gcpDeCurva(curva, A) {
  if (!(A > 0)) {
    // No es una validación defensiva de manual: el área sale de un campo de formulario y
    // `Math.log10(0)` es −Infinity, que no rompe nada y devuelve el primer punto de la
    // curva como si fuera un dato. Un elemento con el área sin cargar tiene que fallar,
    // no recibir el (GC_p) más desfavorable en silencio.
    throw new Error(`gcpDeCurva: el área efectiva tiene que ser positiva; llegó ${A}`);
  }
  const logs = curva.map(([a]) => Math.log10(a));
  const r = interpolarPares(Math.log10(A), curva.map(([a, g], i) => [logs[i], g]));
  return {
    valor: r.valor,
    interpolado: r.interpolado,
    // Los puntos vuelven en área, no en logaritmo: son parte de la justificación del
    // número y se muestran en la traza, donde «entre A = 1 y A = 50 m²» se controla contra
    // el papel y «entre 0 y 1,69897» no.
    //
    // ⚠ EL ÁREA SE RECUPERA POR ÍNDICE, NO CON `Math.pow(10, x)`. El viaje de ida y vuelta
    // por el logaritmo no es exacto en punto flotante: 10^log10(50) da 49,999999999999993,
    // y ese número aparecería en la traza y en la memoria como el área de un punto de
    // tabla. `indexOf` compara contra los mismos floats que se le pasaron, así que
    // devuelve el área tal como está escrita en la transcripción.
    puntos: r.puntos.map(q => ({ A: curva[logs.indexOf(q.x)][0], gcp: q.y })),
    fuera: r.fuera,
  };
}

/** Sólo el número. */
export const gcp = (curva, A) => gcpDeCurva(curva, A).valor;
