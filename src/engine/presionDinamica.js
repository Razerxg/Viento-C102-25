// PRESIÓN DINÁMICA — artículos 1.8, 1.12 y 1.13 del CIRSOC 102-2025.
//
//     q_z = 0,613 · K_z · K_zt · K_d · K_e · V²        (1.13-1)   [N/m², V en m/s]
//
// El 0,613 es ½·ρ con ρ = 1,225 kg/m³, la densidad del aire a 15 °C y 101,325 kPa. No es
// una constante de ajuste: `Ke` es justamente lo que corrige esa densidad con la altitud.
import { TERRENO, KZ_MAX } from '../constants/exposicion.js';
import { ke } from '../constants/altitud.js';
import { kzt } from './topografia.js';

export const RHO_MEDIO = 0.613;

// ── COEFICIENTE DE EXPOSICIÓN Kz ────────────────────────────────────────────────
//
// Se calcula con la expresión de la nota 1 de la Tabla 1.13-1 y NO interpolando la tabla:
// la fórmula es continua, no obliga a elegir entre filas y da el mismo resultado dentro de
// 0,01 (hay test que lo verifica contra las 60 celdas).
//
// Los tres tramos no son un refinamiento: por debajo de 5 m el perfil se CONGELA —si no,
// Kz tendería a cero al nivel del suelo y la presión sobre el zócalo daría casi nada— y
// por encima de la altura gradiente zg deja de crecer, topeado en 2,41.
export function kz(z, exposicion) {
  const t = TERRENO[exposicion];
  if (!t) return null;
  const alt = Number(z);
  if (!Number.isFinite(alt) || alt < 0) return null;
  if (alt > 1000) return null;              // fuera del alcance del reglamento
  if (alt > t.zg) return KZ_MAX;
  const zEf = Math.max(alt, 5);             // tramo congelado por debajo de 5 m
  return KZ_MAX * Math.pow(zEf / t.zg, 2 / t.alfa);
}

// El FACTOR TOPOGRÁFICO Kzt vive en `engine/topografia.js`, no acá.
//
// Se mudó al reescribirlo con los dos métodos del art. 1.8.2, las tres condiciones del
// art. 1.8.1 reportadas una por una y la trazabilidad de la interpolación: son 250 líneas
// con sus propias tablas, y mezclarlas con la presión dinámica hacía que este archivo
// tratara dos temas distintos. `q()` lo recibe ya calculado, como un número.

// ── PRESIÓN DINÁMICA ────────────────────────────────────────────────────────────
//
// `qh` es esta misma expresión evaluada con Kz a la altura media de cubierta: no hay una
// fórmula aparte, es el mismo cálculo con otra z. Por eso hay UNA sola función.
export function q({ z, V, exposicion, kd, Kzt = 1.0, altitud = 0, usarKe = true }) {
  const Kz = kz(z, exposicion);
  if (Kz === null) return null;
  const v = Number(V);
  if (!(v > 0)) return null;
  const Ke = usarKe ? ke(altitud) : 1.0;
  return RHO_MEDIO * Kz * Kzt * Number(kd) * Ke * v * v;
}

// ── K_zt EN FUNCIÓN DE LA ALTURA ────────────────────────────────────────────────
//
// `sitio.topo` son los datos del accidente SIN la altura: forma, H, Lh, x, lado, método.
// Cuando está, K_zt se evalúa a cada z; cuando no, se usa el escalar `sitio.Kzt`, que es
// lo que hacen las estructuras sin topografía declarada y los tests que no la modelan.
//
// ⚠ LA z VA SIN EL PISO DE LOS 5 m QUE APLICA `kz()`. Ese piso es propio del perfil de
// exposición —el reglamento congela K_z por debajo de z_mín— y no tiene nada que ver con
// el decaimiento de K3, que a nivel del terreno vale exactamente 1 y es donde el efecto
// topográfico es MÁXIMO. Pisarlo borraría justo la franja más desfavorable.
export function kztEn(sitio, z) {
  const t = sitio?.topo;
  if (!t?.forma) return Number(sitio?.Kzt ?? 1) || 1;
  return kzt({ ...t, z_m: z }).kzt;
}

/** ¿Varía K_zt con la altura en este sitio, o es una constante? */
export const kztVariable = (sitio) => !!sitio?.topo?.forma;

/**
 * El extremo de un tramo de altura que GOBIERNA la presión dinámica.
 *
 * ── POR QUÉ NO ALCANZA CON EL EXTREMO SUPERIOR ──────────────────────────────────
 * Sin topografía, K_z crece con z y el techo del tramo es siempre el peor: por eso el
 * perfil se evaluaba en `hasta` y listo. Con K_zt(z) eso deja de ser cierto:
 *
 *   · K3 = e^(−γ·z/Lh) DECRECE con la altura, así que K_zt es máximo al ras del suelo.
 *   · K_z está CONGELADO por debajo de 5 m.
 *
 * En el tramo de base, entonces, K_z no crece nada y K_zt sí baja: el máximo del producto
 * está en el PISO del tramo. Evaluar arriba subestimaría la presión justo donde el efecto
 * topográfico es mayor, que es lo contrario de lo que uno quiere de una simplificación.
 *
 * Se evalúan los dos extremos y se adopta el mayor producto K_z·K_zt. Es conservador por
 * construcción —el máximo de una función continua sobre un intervalo nunca es menor que
 * el máximo de sus extremos si la función es monótona por tramos, y acá cada factor lo
 * es— y deja dicho cuál gobierna, que es lo que se revisa a mano.
 *
 * @param {{desde:number, hasta:number, sitio:any}} p
 */
export function gobernanteTramo({ desde, hasta, sitio }) {
  const en = (z) => {
    const Kz = kz(z, sitio.exposicion);
    const Kzt = kztEn(sitio, z);
    return { z, kz: Kz, kzt: Kzt, producto: Kz === null ? null : Kz * Kzt,
      q: q({ ...sitio, z, Kzt }) };
  };
  const inf = en(desde), sup = en(hasta);
  // El empate se resuelve a favor del SUPERIOR a propósito: sin topografía los dos
  // extremos de un tramo por debajo de 5 m dan exactamente lo mismo, y quedarse con el
  // de arriba deja el perfil idéntico, número por número, al que había antes de que K_zt
  // dependiera de z.
  const gana = (inf.producto ?? -Infinity) > (sup.producto ?? -Infinity) ? inf : sup;
  const iguales = inf.producto !== null && sup.producto !== null
    && Math.abs(inf.producto - sup.producto) < 1e-12;
  return {
    ...gana,
    gobierna: iguales ? "coinciden" : (gana === inf ? "inferior" : "superior"),
    extremos: { inferior: inf, superior: sup },
  };
}

/**
 * Las alturas en que K_z·K_zt tiene un máximo INTERIOR dentro de un intervalo.
 *
 * ── POR QUÉ HACE FALTA ─────────────────────────────────────────────────────────
 * Resolver cada tramo con el mayor de sus dos extremos es correcto mientras el producto
 * sea monótono adentro. Con topografía NO lo es: K_z crece y K_zt decrece, y el producto
 * sube hasta un máximo y después baja. Si ese máximo cae en el medio de un tramo, los dos
 * extremos quedan por debajo y la presión sale CHICA, que es el error que no se puede
 * cometer. Medido sobre 2.700 combinaciones de forma, H, Lh, x, exposición y altura, el
 * hueco llegaba a 0,82 % —por encima del 0,5 % con el que se validan los casos—.
 *
 * La solución no es cambiar la regla del tramo sino la DISCRETIZACIÓN: se agrega un corte
 * en cada máximo, y ahí el máximo pasa a ser un extremo. Es la misma decisión por la que
 * el perfil ya se corta en las alturas tabuladas y en el alero.
 *
 * ⚠ SE DEVUELVEN TODOS LOS MÁXIMOS LOCALES, NO EL GLOBAL. El producto es BIMODAL: tiene
 * una joroba cerca del terreno —donde K_zt es grande— y vuelve a crecer arriba, donde
 * K_zt ya se extinguió y manda K_z. En un edificio alto el máximo global está en el tope,
 * que es un extremo del perfil, y quedarse con él se saltea justo la joroba de abajo, que
 * es la que este cambio existe para capturar.
 *
 * Se buscan con barrido y refinamiento por sección áurea, y no resolviendo la derivada:
 * la condición de estacionariedad es trascendente, y con el método de tabla el producto
 * ni siquiera es derivable —K3 es lineal por trozos—.
 */
export function alturasCriticasKzt(sitio, zDesde, zHasta) {
  if (!kztVariable(sitio) || !(zHasta > zDesde)) return [];
  const prod = (z) => {
    const Kz = kz(z, sitio.exposicion);
    return Kz === null ? -Infinity : Kz * kztEn(sitio, z);
  };
  // Barrido fino: el costo es una evaluación de K_zt por punto, una vez por perfil.
  const N = 400;
  const z = [], v = [];
  for (let i = 0; i <= N; i++) {
    const zi = zDesde + (zHasta - zDesde) * i / N;
    z.push(zi); v.push(prod(zi));
  }

  const phi = (Math.sqrt(5) - 1) / 2;
  const afinar = (a, b) => {
    for (let i = 0; i < 60 && b - a > 1e-7; i++) {
      const c = b - (b - a) * phi, d = a + (b - a) * phi;
      if (prod(c) > prod(d)) b = d; else a = c;
    }
    return (a + b) / 2;
  };

  const picos = [];
  for (let i = 1; i < N; i++) {
    if (v[i] > v[i - 1] && v[i] >= v[i + 1]) picos.push(afinar(z[i - 1], z[i + 1]));
  }
  return picos;
}
