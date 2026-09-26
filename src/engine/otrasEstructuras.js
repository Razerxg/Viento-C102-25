// CAPÍTULO 4 — MOTOR. Cálculo puro, sin React.
//
// ── LA DIFERENCIA DE FONDO CON EL CAPÍTULO 2 ───────────────────────────────────
// El capítulo 2 reparte PRESIONES sobre las superficies de un edificio y la presión
// interna entra en cada una. Acá se calcula una FUERZA RESULTANTE sobre un objeto que no
// tiene interior —una pared libre, una torre, un cartel—, así que no hay GC_pi que
// aplicar: la expresión es F = q · G · C_f · A, y el trabajo está en elegir bien el C_f y
// en saber a qué altura se evalúa q.
//
// ⚠ A QUÉ ALTURA SE EVALÚA q NO ES LO MISMO EN LAS DOS EXPRESIONES:
//   · (4.4-1), carteles y paredes libres → q_h, con h el borde SUPERIOR del cartel.
//   · (4.5-1), otras estructuras        → q_z, con z el CENTROIDE del área proyectada.
// Usar el centroide en un cartel, o el tope en una chimenea, cambia el resultado en el
// mismo sentido en el que nadie lo revisa: hacia abajo, y poco.

import { q as qDinamica, kz, kztEn } from './presionDinamica.js';
import {
  BS_CARTEL, SH_CARTEL, CF_CARTEL_AB, cfCartelAjuste,
  BS_CASO_C_A, CF_CASO_C_A, BS_CASO_C_B, CF_CASO_C_B, CASO_C_REGIONES, CASO_C_ESQUINA,
  HD_CHIMENEA, CF_CHIMENEA, CF_RETICULADO, CF_TORRE,
  FACTOR_TORRE_REDONDOS, FACTOR_TORRE_DIAGONAL, GCR,
  CF_SILO_AISLADO, CP_TECHO_SILO, B_ZONA1_SILO, ZONAS_SILO_INCLINADO,
  CP_FONDO_SILO, FONDO_SILO_LIMITE, SILO_AGRUPADO, CF_SILO_GRUPO,
  CP_TECHO_SILO_GRUPO, ZONAS_SILO_GRUPO_PLANO, SILO_ALCANCE,
} from '../constants/cap4.js';

const num = (v, d = 0) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : d;
};
const fc = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d).replace(".", ",") : "—");

// Interpolación lineal en una grilla ORDENADA, con extremos CONGELADOS y no extrapolados.
// Congelar no es una comodidad: las filas extremas de estas tablas son «≤ 0,05» y «≥ 45»,
// o sea que el propio reglamento dice que más allá vale el mismo número. Extrapolar la
// pendiente daría un coeficiente que la norma no da.
export function interpGrilla(x, xs, ys) {
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  for (let i = 0; i < xs.length - 1; i++) {
    if (x <= xs[i + 1]) {
      const t = (x - xs[i]) / (xs[i + 1] - xs[i]);
      return ys[i] + t * (ys[i + 1] - ys[i]);
    }
  }
  return ys[ys.length - 1];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4.4 — PAREDES LIBRES LLENAS Y CARTELES LLENOS
// ═══════════════════════════════════════════════════════════════════════════════

// C_f de los casos A y B: interpolación BILINEAL sobre la Figura 4.4-1.
//
// Las filas de la tabla van en s/h DECRECIENTE, así que hay que invertirlas antes de
// interpolar: `interpGrilla` exige abscisas crecientes y con la tabla tal cual se lee del
// papel devolvería el valor del otro extremo. Es el tipo de error que produce un número
// perfectamente plausible.
export function cfCartelLleno({ B, s, h }) {
  const b = num(B), sv = num(s), hv = num(h);
  if (!(b > 0) || !(sv > 0) || !(hv > 0)) return null;
  const Bs = b / sv, sh = Math.min(1, sv / hv);

  const shAsc = [...SH_CARTEL].reverse();
  const filasAsc = [...CF_CARTEL_AB].reverse();
  // primero se interpola en B/s dentro de cada fila, después entre filas en s/h
  const porFila = filasAsc.map(fila => interpGrilla(Bs, BS_CARTEL, fila));
  return { cf: interpGrilla(sh, shAsc, porFila), Bs, sh };
}

// CASO C — el cartel partido en regiones desde el borde de barlovento.
//
// Devuelve las regiones que EXISTEN para ese B/s, cada una con su tramo en metros y su
// C_f. La nota 3 aplica el factor (1,8 − s/h) cuando s/h > 0,8, y la esquina de retorno
// reduce sólo la primera región, que es la que lleva el asterisco en la figura.
export function cfCartelCasoC({ B, s, h, Lr = null }) {
  const b = num(B), sv = num(s), hv = num(h);
  if (!(b > 0) || !(sv > 0) || !(hv > 0)) return null;
  const Bs = b / sv, sh = Math.min(1, sv / hv);
  if (Bs < 2) {
    return { aplica: false, Bs, sh, motivo:
      `B/s = ${fc(Bs)} < 2: la nota 2 exige considerar el caso C sólo a partir de `
      + "B/s = 2, y el comentario aclara que no había datos de distribución espacial de "
      + "presiones para relaciones de aspecto menores." };
  }

  // ⚠ NO SE INTERPOLA ENTRE B/s = 10 Y B/s = 13. Las dos columnas no tienen las mismas
  // regiones —cuatro contra siete— y mezclarlas no significa nada: el número de regiones
  // ES un dato de la columna, no un detalle de presentación.
  let bs, tabla, regiones;
  if (Bs <= 10) {
    bs = BS_CASO_C_A; tabla = CF_CASO_C_A;
    regiones = ["0-s", "s-2s", "2s-3s", "3s-10s"];
  } else if (Bs >= 13) {
    bs = BS_CASO_C_B; tabla = CF_CASO_C_B;
    regiones = ["0-s", "s-2s", "2s-3s", "3s-4s", "4s-5s", "5s-10s", ">10s"];
  } else {
    return { aplica: false, Bs, sh, motivo:
      `B/s = ${fc(Bs)} cae entre las columnas 10 y 13 de la Figura 4.4-1, que tienen `
      + "distinto número de regiones —cuatro y siete—. Interpolar entre ellas no está "
      + "definido: hay que adoptar una de las dos columnas a criterio del proyectista." };
  }

  // Nota 3: reducción para s/h > 0,8, aplicable junto con las de la nota 2.
  const fNota3 = sh > 0.8 ? 1.8 - sh : 1.0;
  // Factor de esquina de retorno, sólo sobre la primera región.
  const fEsq = Lr != null && num(Lr) > 0
    ? interpGrilla(num(Lr) / sv, CASO_C_ESQUINA.map(e => e[0]), CASO_C_ESQUINA.map(e => e[1]))
    : 1.0;

  const salida = [];
  for (const id of regiones) {
    const fila = tabla[id];
    if (!fila) continue;
    // Una celda `null` es una región que NO EXISTE para ese B/s, no un cero: el ancho del
    // cartel se acaba antes. Saltearla es lo correcto; tomarla como 0 metería una región
    // descargada en el medio del reparto.
    const valores = fila.map(v => v);
    if (valores.some(v => v === null)) {
      // la interpolación no puede cruzar una celda vacía: se restringe al subtramo válido
      const idx = valores.map((v, i) => (v === null ? -1 : i)).filter(i => i >= 0);
      if (!idx.length) continue;
      const bsOk = idx.map(i => bs[i]), vOk = idx.map(i => valores[i]);
      if (Bs < bsOk[0]) continue;              // esa región no existe para este B/s
      salida.push({ id, cf: interpGrilla(Bs, bsOk, vOk) });
    } else {
      salida.push({ id, cf: interpGrilla(Bs, bs, valores) });
    }
  }

  const info = (id) => CASO_C_REGIONES.find(r => r.id === id);
  const regionesM = salida.map((r, i) => {
    const meta = info(r.id);
    const desde = meta.desde * sv;
    const hasta = Math.min(meta.hasta === Infinity ? b : meta.hasta * sv, b);
    const cfBase = r.cf * fNota3;
    const cf = i === 0 ? cfBase * fEsq : cfBase;
    return { ...r, label: meta.label, desde, hasta, ancho: Math.max(0, hasta - desde),
      cfTabla: r.cf, cf };
  }).filter(r => r.ancho > 1e-9);

  return { aplica: true, Bs, sh, fNota3, fEsq, regiones: regionesM };
}

// Nota 1 — porosidad. Un cartel con aberturas de menos del 30 % sigue siendo «lleno», pero
// se permite reducir su C_f. El exponente 1,5 no es lineal a propósito: tapar la mitad del
// área no reduce el arrastre a la mitad, porque el flujo se reacomoda alrededor.
export const factorPorosidad = (eps) => {
  const e = num(eps, 1);
  if (!(e > 0) || e >= 1) return 1;
  return 1 - Math.pow(1 - e, 1.5);
};

// Nota 2 — reducciones de carteles de doble cara con todos los lados cerrados.
// R_min = t/min(B,s) y R_max = t/max(B,s), con t el espesor del cartel.
export function reduccionesEspesor({ B, s, t }) {
  const b = num(B), sv = num(s), tv = num(t);
  if (!(b > 0) || !(sv > 0) || !(tv > 0)) return null;
  const Rmin = tv / Math.min(b, sv), Rmax = tv / Math.max(b, sv);
  return {
    Rmin, Rmax,
    // e = (0,2 − 0,25·R_max)·B en lugar de 0,2·B, admitido si R_max ≤ 0,4
    excentricidad: Rmax <= 0.4 ? (0.2 - 0.25 * Rmax) : 0.2,
    excentricidadAplica: Rmax <= 0.4,
    // C_f × (1 − 0,133·R_min), admitido si R_min ≤ 0,75
    factorCf: Rmin <= 0.75 ? 1 - 0.133 * Rmin : 1,
    factorAplica: Rmin <= 0.75,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4.5 — OTRAS ESTRUCTURAS
// ═══════════════════════════════════════════════════════════════════════════════

// El criterio de régimen del cilindro. `D·√q_z` con D en m y q_z en N/m²: es el número que
// decide entre la fila subcrítica y la supercrítica de las Figuras 4.5-1 y 4.5-2, y las
// dos filas difieren casi al doble.
export const regimenCilindro = (D, qz) => num(D) * Math.sqrt(Math.max(0, num(qz)));
export const esSupercritico = (D, qz) => regimenCilindro(D, qz) > 5.3;

// C_f de chimeneas, tanques y estructuras similares — Figura 4.5-1.
export function cfChimenea({ filaId, h, D }) {
  const fila = CF_CHIMENEA.find(f => f.id === filaId);
  if (!fila) return null;
  const hv = num(h), dv = num(D);
  if (!(hv > 0) || !(dv > 0)) return null;
  const hD = hv / dv;
  return { cf: interpGrilla(hD, HD_CHIMENEA, fila.cf), hD, fila };
}

// C_f de carteles abiertos y estructuras reticuladas — Figura 4.5-2.
//
// ⚠ ε NO ES UN EJE CONTINUO ACÁ. La figura da tres BANDAS («< 0,1», «0,1 a 0,29»,
// «0,3 a 0,7») y no dice que se interpole entre ellas, a diferencia de la Figura 4.5-1 que
// sí lo autoriza en su nota 2. Se devuelve la banda que corresponde, y fuera de 0,7 se
// devuelve `null` con el motivo en vez de estirar la última.
export function cfReticulado({ eps, miembro = "plano", D = null, qz = null }) {
  const e = num(eps, -1);
  if (!(e > 0)) return null;
  if (e > 0.7) {
    return { cf: null, motivo:
      `ε = ${fc(e)} > 0,7: la Figura 4.5-2 no da coeficientes por encima de 0,7. Con esa `
      + "relación de área sólida la estructura se acerca a una superficie llena y "
      + "corresponde revisar si no entra por la Figura 4.4-1." };
  }
  const banda = CF_RETICULADO.find(b => e >= b.eMin && e <= b.eMax)
    // El hueco entre 0,29 y 0,3 es de redondeo de la propia figura, no una zona sin valor.
    ?? CF_RETICULADO.find(b => e < b.eMin);
  if (!banda) return null;
  if (miembro === "plano") return { cf: banda.plano, banda, regimen: null };
  const sup = esSupercritico(D, qz);
  return { cf: sup ? banda.circSuper : banda.circSub, banda,
    regimen: { supercritico: sup, valor: regimenCilindro(D, qz) } };
}

// C_f de torres reticuladas — Figura 4.5-3. Acá no hay tabla: son dos polinomios.
export function cfTorre({ seccion = "cuadrada", eps, redondos = false, diagonal = false }) {
  const e = num(eps, -1);
  if (!(e > 0)) return null;
  const def = CF_TORRE[seccion];
  if (!def) return null;
  const base = def.f(e);
  const fRed = redondos ? FACTOR_TORRE_REDONDOS(e) : 1;
  // El factor de diagonal es SÓLO para torres de sección cuadrada: la nota 4 lo dice
  // explícitamente, y una torre triangular no tiene una diagonal en ese sentido.
  const fDia = diagonal && seccion === "cuadrada" ? FACTOR_TORRE_DIAGONAL(e) : 1;
  return { cf: base * fRed * fDia, base, fRed, fDia, def,
    diagonalIgnorada: diagonal && seccion !== "cuadrada" };
}

// (GC_r) de equipos sobre cubierta — art. 4.5.1, expresiones (4.5-2) y (4.5-3).
export function gcrEquipo({ tipo = "lateral", area, B, dim }) {
  const g = GCR[tipo];
  if (!g) return null;
  const A = num(area), b = num(B), d = num(dim);
  if (!(A > 0) || !(b > 0) || !(d > 0)) return null;
  const bajo = g.limiteBajo(b, d), alto = g.limiteAlto(b, d);
  if (A <= bajo) return { gcr: g.max, A, bajo, alto, reducido: false };
  if (A >= alto) return { gcr: g.min, A, bajo, alto, reducido: true, tope: true };
  const t = (A - bajo) / (alto - bajo);
  return { gcr: g.max + t * (g.min - g.max), A, bajo, alto, reducido: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SILOS, TANQUES Y RECIPIENTES CILÍNDRICOS — art. 4.5.2
// ═══════════════════════════════════════════════════════════════════════════════

// ¿Aislado, agrupado o intermedio? La separación se mide de CENTRO A CENTRO en diámetros.
export function regimenSilo(separacionD) {
  const s = num(separacionD, Infinity);
  if (s >= SILO_ALCANCE.dMax) return { modo: "aislado", motivo: "Sin agrupamiento declarado." };
  if (s > SILO_AGRUPADO.aisladosDesde) {
    return { modo: "aislado", motivo:
      `Separación de ${fc(s)} D > 2 D: el art. 4.5.2 los trata como estructuras aisladas.` };
  }
  if (s < SILO_AGRUPADO.juntosHasta) {
    return { modo: "agrupado", motivo:
      `Separación de ${fc(s)} D < 1,25 D: se tratan como agrupados (art. 4.5.2.4). El `
      + "comentario mide un arrastre 65 % mayor sobre el cilindro del medio de una fila de tres." };
  }
  return { modo: "intermedio", t: (s - SILO_AGRUPADO.juntosHasta)
      / (SILO_AGRUPADO.aisladosDesde - SILO_AGRUPADO.juntosHasta),
    motivo: `Separación de ${fc(s)} D, entre 1,25 D y 2 D: el reglamento manda interpolar `
      + "linealmente entre los valores de agrupado y los de aislado." };
}

// Ancho de la Zona 1 del techo. Con θ < 10° depende de H/D; con 10° < θ < 30° es fijo.
export function zonasTechoSilo({ D, h, H, theta, agrupado = false }) {
  const d = num(D), hv = num(h), Hv = num(H), th = num(theta);
  if (!(d > 0) || !(hv > 0) || !(Hv > 0)) return null;
  const hd = Hv / d;
  if (th >= 10) {
    return { b: ZONAS_SILO_INCLINADO.zona1 * d, inclinado: true, hd,
      expr: "0,6·D", zona2: ZONAS_SILO_INCLINADO.zona2 * d };
  }
  if (agrupado) {
    return { b: ZONAS_SILO_GRUPO_PLANO.zona1 * d, inclinado: false, hd, agrupado: true,
      expr: "0,5·D", zona2: ZONAS_SILO_GRUPO_PLANO.zona2 * d };
  }
  const bs = B_ZONA1_SILO.map(x => x.b(d, hv));
  const b = interpGrilla(hd, B_ZONA1_SILO.map(x => x.hd), bs);
  return { b, inclinado: false, hd, zona2: Math.max(0, d - b),
    expr: B_ZONA1_SILO.map(x => `H/D ${x.hd} → ${x.expr}`).join(" · ") };
}

// C_p del techo. Aislado: −0,8 / −0,5 fijos. Agrupado: depende de θ y de H/D.
export function cpTechoSilo({ theta, hd, agrupado = false }) {
  if (!agrupado) return { ...CP_TECHO_SILO, ref: "Figura 4.5-5" };
  const th = num(theta), r = num(hd);
  if (th >= 10) {
    const f = CP_TECHO_SILO_GRUPO.find(x => x.inclinado);
    return { zona1: f.zona1, zona2: f.zona2, ref: "Figura 4.5-6", rango: f.rango };
  }
  const bajo = CP_TECHO_SILO_GRUPO[0], alto = CP_TECHO_SILO_GRUPO[1];
  if (r <= bajo.hdMax) return { zona1: bajo.zona1, zona2: bajo.zona2, ref: "Figura 4.5-6", rango: bajo.rango };
  if (r >= alto.hdMin) return { zona1: alto.zona1, zona2: alto.zona2, ref: "Figura 4.5-6", rango: alto.rango };
  const t = (r - bajo.hdMax) / (alto.hdMin - bajo.hdMax);
  return {
    zona1: bajo.zona1 + t * (alto.zona1 - bajo.zona1),
    zona2: bajo.zona2 + t * (alto.zona2 - bajo.zona2),
    ref: "Figura 4.5-6", rango: `interpolado entre H/D = 0,5 y H/D = 1,0`,
  };
}

// C_f de arrastre de las paredes.
export function cfParedSilo({ hd, modo }) {
  if (modo === "aislado") return { cf: CF_SILO_AISLADO, ref: "Art. 4.5.2.1", usarCon: "q_z" };
  const grupo = interpGrilla(num(hd), CF_SILO_GRUPO.map(x => x.hd), CF_SILO_GRUPO.map(x => x.cf));
  if (modo === "agrupado") return { cf: grupo, ref: "Figura 4.5-6", usarCon: "q_h" };
  return { cf: grupo, ref: "Figura 4.5-6", usarCon: "q_h", interpolar: true };
}

// C_p del fondo de un silo separado del suelo — art. 4.5.2.3.
export function cpFondoSilo({ C, h }) {
  const c = num(C, -1), hv = num(h);
  if (!(hv > 0) || c < 0) return null;
  const rel = c / hv;
  if (rel >= FONDO_SILO_LIMITE) return { cp: CP_FONDO_SILO, rel, reducido: false };
  // Interpolación lineal hacia Cp = 0 según C/h: un fondo casi apoyado deja de estar
  // expuesto al viento y no tiene sentido cargarlo igual que uno bien separado.
  const t = rel / FONDO_SILO_LIMITE;
  return { cp: CP_FONDO_SILO.map(v => v * t), rel, reducido: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LA FUERZA
// ═══════════════════════════════════════════════════════════════════════════════

// F = q · G · C_f · A. Se separa en su propia función porque es lo único que comparten
// todas las familias del capítulo, y porque tenerla en un solo lugar impide que una
// pantalla multiplique por G y otra se lo olvide.
export const fuerza = ({ q, G, cf, area }) =>
  num(q) * num(G) * num(cf) * num(area);

// Presión dinámica a una altura, con el K_d que corresponda a ESTA estructura.
// El K_d del capítulo 4 no es 0,85: una chimenea redonda usa 1,00 y una torre de sección
// no habitual 0,95, y adoptar el del edificio baja la carga un 15 % sin justificación.
// ⚠ K_zt TAMBIÉN se evalúa a ESTA z, no a la altura media de cubierta del edificio. Un
// venteo de 18 m y un cartel de 3 m sobre la misma loma NO tienen el mismo factor
// topográfico: K3 decae con la altura y el cartel, más bajo, recibe MÁS.
export const qEn = (z, sitio, kd) => qDinamica({
  z, V: sitio.V, exposicion: sitio.exposicion, kd,
  Kzt: kztEn(sitio, z), altitud: sitio.altitud ?? 0, usarKe: sitio.usarKe !== false,
});

// Traza común: los pasos que toda estructura del capítulo 4 comparte, en el orden de la
// Tabla 4.1-1. Cada familia le agrega los suyos.
export function trazaBase({ sitio, kd, z, G, etiquetaZ }) {
  const Kz = kz(z, sitio.exposicion);
  const qz = qEn(z, sitio, kd);
  return [
    { paso: "Velocidad básica", simbolo: "V", valor: sitio.V, dec: 1, unidad: "m/s",
      ref: "Art. 1.5 · Figuras 1.5-1 A-D",
      detalle: "Ráfaga de 3 s a 10 m sobre el terreno, en exposición C." },
    { paso: "Factor de direccionalidad", simbolo: "K_d", valor: kd, dec: 2, unidad: "",
      ref: "Tabla 1.6-1",
      detalle: "La Tabla 1.6-1 da un K_d por TIPO DE ESTRUCTURA. Para el capítulo 4 no "
        + "es 0,85: depende de la sección y de si es cartel, chimenea o torre." },
    { paso: "Coeficiente de exposición", simbolo: "K_z", valor: Kz, dec: 3, unidad: "",
      ref: "Art. 1.13.1 · Tabla 1.13-1",
      detalle: `Exposición ${sitio.exposicion}, z = ${fc(z)} m (${etiquetaZ}).` },
    // Decía «Terreno llano» SIEMPRE, incluso con una loma declarada: el texto estaba
    // escrito para la época en que K_zt era 1,0 fijo y nadie lo revisó al agregar el
    // art. 1.8. Ahora el detalle dice a qué altura se evaluó, que es el dato que se
    // revisa.
    { paso: "Factor topográfico", simbolo: "K_zt", valor: kztEn(sitio, z), dec: 3, unidad: "",
      ref: "Art. 1.8", detalle: (kztEn(sitio, z) === 1
        ? "Terreno llano. "
        : `Evaluado a z = ${fc(z)} m sobre el terreno local (${etiquetaZ}). `)
        + "El art. 4.1.4 no admite reducciones por la protección aparente de edificios u "
        + "otras estructuras vecinas." },
    { paso: "Factor de altitud", simbolo: "K_e", dec: 4, unidad: "",
      valor: sitio.usarKe === false ? 1 : Math.exp(-0.000119 * (sitio.altitud || 0)),
      ref: "Art. 1.12", detalle: `K_e = e^(−0,000119·z_g) con z_g = ${sitio.altitud || 0} m.` },
    { paso: "Presión dinámica", simbolo: "q", valor: qz, dec: 0, unidad: "N/m²",
      ref: "Expresión (1.13-1)",
      detalle: `q = 0,613·K_z·K_zt·K_d·K_e·V², evaluada en z = ${fc(z)} m.` },
    { paso: "Factor de efecto de ráfaga", simbolo: "G", valor: G, dec: 3, unidad: "",
      ref: "Art. 1.9", detalle: "El mismo que se adoptó para el edificio; en el capítulo 4 "
        + "entra como factor separado del C_f, salvo en (GC_r), que es un producto." },
  ];
}

export { SILO_ALCANCE };

// ═══════════════════════════════════════════════════════════════════════════════
// ORQUESTACIÓN — de los datos del formulario al resultado con su traza
// ═══════════════════════════════════════════════════════════════════════════════
//
// Vive acá y no en la pantalla porque es donde se decide a qué altura se evalúa q y qué
// área multiplica a C_f, que son las dos cosas que distinguen a una familia de otra y las
// dos que no se pueden verificar mirando un formulario.

// Las cinco familias de la Tabla 4.1-1, con el K_d que les corresponde por defecto en la
// Tabla 1.6-1. El K_d queda editable: la propia tabla distingue por SECCIÓN —una chimenea
// redonda usa 1,00 y una cuadrada 0,90— y esa elección es del proyectista.
export const FAMILIAS = [
  { id: "cartel_lleno", label: "Pared libre llena o cartel lleno", ref: "Art. 4.4 · Figura 4.4-1",
    kd: "cartel_lleno", expr: "(4.4-1)", altura: "borde superior del cartel",
    ayuda: "Superficie llena, o con aberturas de menos del 30 % del área bruta (nota 1 de "
      + "la Figura 4.4-1). q se evalúa a la altura h del borde superior." },
  { id: "cartel_abierto", label: "Cartel abierto o entramado plano", ref: "Art. 4.5 · Figura 4.5-2",
    kd: "cartel_abierto", expr: "(4.5-1)", altura: "centroide del área sólida",
    ayuda: "Aberturas del 30 % o más del área bruta. El C_f se aplica sobre el área SÓLIDA "
      + "proyectada, no sobre la envolvente." },
  { id: "chimenea", label: "Chimenea, tanque o estructura similar", ref: "Art. 4.5 · Figura 4.5-1",
    kd: "chim_redonda", expr: "(4.5-1)", altura: "centroide del área proyectada",
    ayuda: "Cuerpo prismático o cilíndrico apoyado en el suelo. El coeficiente depende de "
      + "la esbeltez h/D y, en los circulares, del régimen D·√q_z." },
  { id: "torre", label: "Torre reticulada", ref: "Art. 4.5 · Figura 4.5-3",
    kd: "torre_tri_cua", expr: "(4.5-1)", altura: "centroide del segmento",
    ayuda: "El C_f sale de un polinomio en ε y se aplica sobre el área sólida de UNA CARA "
      + "proyectada en el plano de esa cara, para el segmento en consideración." },
  { id: "equipo", label: "Equipo o estructura sobre cubierta", ref: "Art. 4.5.1",
    kd: "edificio_sprfv", expr: "(4.5-2) y (4.5-3)", altura: "altura media de cubierta",
    ayuda: "No estaba en el CIRSOC 102-2005. Usa un producto (GC_r) que NO se puede "
      + "separar en G por C_r, y q_h del edificio que lo soporta." },
];

export const familiaDe = (id) => FAMILIAS.find(f => f.id === id) ?? FAMILIAS[0];

// Analiza un accesorio de la Tabla 4.1-1. Devuelve siempre la misma forma
// —`{ familia, z, q, cf, area, F, traza, avisos }`— para que la pantalla no tenga que
// ramificar por familia al dibujar el resultado.
export function analizarAccesorio({ familia, datos, sitio, kd, G }) {
  const fam = familiaDe(familia);
  const d = datos ?? {};
  const avisos = [];
  let z = 0, area = 0, cf = null, extra = {}, etiquetaZ = fam.altura, pasos = [];

  if (familia === "cartel_lleno") {
    const B = num(d.B), s = num(d.s), h = num(d.h);
    // ⚠ q SE EVALÚA EN h, EL BORDE SUPERIOR, no en el centroide: la Figura 4.4-1 define h
    // así en su vista en elevación, y es lo que diferencia a (4.4-1) de (4.5-1).
    z = h; area = B * s;
    const r = cfCartelLleno({ B, s, h });
    if (!r) return null;
    const porosidad = d.eps ? factorPorosidad(d.eps) : 1;
    const red = reduccionesEspesor({ B, s, t: d.t });
    const fEsp = d.dobleCara && red?.factorAplica ? red.factorCf : 1;
    cf = r.cf * porosidad * fEsp;
    extra = { ...r, porosidad, red, fEsp,
      casoC: cfCartelCasoC({ B, s, h, Lr: d.Lr || null }),
      // Nota 2: la fuerza del caso B actúa desplazada del centro geométrico hacia el borde
      // de barlovento. Con el cartel apoyado en el suelo, además, sube 0,05·h.
      excentricidad: (d.dobleCara && red?.excentricidadAplica ? red.excentricidad : 0.2) * B,
      apoyado: s / h >= 0.999,
    };
    pasos = [
      { paso: "Relación de aspecto", simbolo: "B/s", valor: r.Bs, dec: 2, unidad: "",
        ref: "Figura 4.4-1", detalle: `B = ${fc(B)} m · s = ${fc(s)} m.` },
      { paso: "Relación de espacio libre", simbolo: "s/h", valor: r.sh, dec: 3, unidad: "",
        ref: "Figura 4.4-1", detalle: r.sh >= 0.999
          ? "s/h = 1: el cartel apoya de forma continua en el suelo."
          : `El cartel está separado del suelo: su borde inferior queda a ${fc(h - s)} m.` },
      { paso: "Coeficiente de fuerza, casos A y B", simbolo: "C_f", valor: r.cf, dec: 3,
        unidad: "", ref: "Figura 4.4-1",
        detalle: "Interpolado bilinealmente en la tabla. El comentario C 4.4.1 da el ajuste "
          + "de superficie con el que se generaron esas celdas, y el motor lo verifica." },
    ];
    if (porosidad < 1) {
      pasos.push({ paso: "Reducción por porosidad", simbolo: "1−(1−ε)^1,5", valor: porosidad,
        dec: 3, unidad: "", ref: "Figura 4.4-1, nota 1",
        detalle: `ε = ${fc(num(d.eps), 2)}. Con aberturas de menos del 30 % el cartel sigue `
          + "siendo lleno, pero se admite reducir el coeficiente." });
    }
    if (fEsp < 1) {
      pasos.push({ paso: "Reducción por espesor", simbolo: "1−0,133·R_mín", valor: fEsp,
        dec: 3, unidad: "", ref: "Figura 4.4-1, nota 2",
        detalle: `R_mín = ${fc(red.Rmin, 3)} ≤ 0,75. Cartel de doble cara con todos los `
          + "lados cerrados." });
    }
    if (extra.casoC?.aplica) {
      avisos.push({ tono: "aviso", texto:
        `Con B/s = ${fc(r.Bs)} ≥ 2 la nota 2 EXIGE verificar también el caso C, que reparte `
        + `la fuerza en ${extra.casoC.regiones.length} regiones y llega a C_f = `
        + `${fc(extra.casoC.regiones[0].cf, 2)} cerca del borde de barlovento.` });
    } else if (extra.casoC && !extra.casoC.aplica && r.Bs >= 2) {
      avisos.push({ tono: "error", texto: extra.casoC.motivo });
    }

  } else if (familia === "cartel_abierto") {
    const h = num(d.h), s = num(d.s), B = num(d.B), eps = num(d.eps);
    // El centroide del área sólida de un cartel rectangular es su centro geométrico.
    z = h - s / 2; area = B * s * eps;
    const r = cfReticulado({ eps, miembro: d.miembro ?? "plano",
      D: d.Dmiembro, qz: qEn(z, sitio, kd) });
    if (!r) return null;
    cf = r.cf; extra = r;
    if (r.cf === null) avisos.push({ tono: "error", texto: r.motivo });
    pasos = [
      { paso: "Relación de área sólida", simbolo: "ε", valor: eps, dec: 3, unidad: "",
        ref: "Figura 4.5-2", detalle: "Área sólida sobre área bruta. Con ε ≥ 0,7 la figura "
          + "deja de dar valores." },
      { paso: "Coeficiente de fuerza", simbolo: "C_f", valor: r.cf, dec: 2, unidad: "",
        ref: "Figura 4.5-2", detalle: r.banda
          ? `Banda ${r.banda.rango}${r.regimen ? `, miembros circulares en régimen `
            + `${r.regimen.supercritico ? "supercrítico" : "subcrítico"} `
            + `(D·√q_z = ${fc(r.regimen.valor)})` : ", miembros de caras planas"}.`
          : "—" },
      { paso: "Área sólida proyectada", simbolo: "A_f", valor: area, dec: 2, unidad: "m²",
        ref: "Figura 4.5-2, nota 3",
        detalle: `${fc(B)} × ${fc(s)} × ε = ${fc(area)} m². El C_f va sobre el área SÓLIDA, `
          + "no sobre la envolvente: es el error que duplica la fuerza." },
    ];

  } else if (familia === "chimenea") {
    const h = num(d.h), D = num(d.D);
    // (4.5-1) evalúa q_z al centroide del área proyectada. En un cuerpo prismático de
    // sección constante apoyado en el suelo eso es h/2.
    z = h / 2; area = D * h;
    const r = cfChimenea({ filaId: d.filaChimenea ?? "circ_super_suave", h, D });
    if (!r) return null;
    cf = r.cf; extra = { ...r, regimen: regimenCilindro(D, qEn(z, sitio, kd)) };
    const esCircular = (d.filaChimenea ?? "").startsWith("circ");
    if (esCircular) {
      const sup = esSupercritico(D, qEn(z, sitio, kd));
      const declaraSuper = (d.filaChimenea ?? "").includes("super");
      if (sup !== declaraSuper) {
        avisos.push({ tono: "error", texto:
          `D·√q_z = ${fc(extra.regimen, 1)} ${sup ? ">" : "≤"} 5,3, o sea régimen `
          + `${sup ? "SUPERCRÍTICO" : "SUBCRÍTICO"}, pero la fila elegida es la del otro `
          + "régimen. Entre las dos filas el coeficiente cambia casi al doble." });
      }
    }
    pasos = [
      { paso: "Esbeltez", simbolo: "h/D", valor: r.hD, dec: 2, unidad: "", ref: "Figura 4.5-1",
        detalle: `h = ${fc(h)} m · D = ${fc(D)} m. Interpolable entre 1, 7 y 25 (nota 2).` },
      { paso: "Régimen del cilindro", simbolo: "D·√q_z", valor: extra.regimen, dec: 1,
        unidad: "", ref: "Figura 4.5-1",
        detalle: "Con D en m y q_z en N/m², el umbral es 5,3. Por debajo el cilindro está en "
          + "régimen subcrítico y arrastra más." },
      { paso: "Coeficiente de fuerza", simbolo: "C_f", valor: r.cf, dec: 3, unidad: "",
        ref: "Figura 4.5-1", detalle: `${r.fila.seccion}`
          + `${r.fila.detalle ? ` — ${r.fila.detalle}` : ""} · ${r.fila.superficie}.` },
    ];

  } else if (familia === "torre") {
    const h = num(d.h), B = num(d.B), eps = num(d.eps);
    z = h / 2; area = B * h * eps;
    const r = cfTorre({ seccion: d.seccionTorre ?? "cuadrada", eps,
      redondos: !!d.redondos, diagonal: !!d.diagonal });
    if (!r) return null;
    cf = r.cf; extra = r;
    if (r.diagonalIgnorada) {
      avisos.push({ tono: "aviso", texto:
        "La nota 4 da el factor de diagonal SÓLO para torres de sección cuadrada. En una "
        + "triangular no se aplicó." });
    }
    pasos = [
      { paso: "Relación de área sólida", simbolo: "ε", valor: eps, dec: 3, unidad: "",
        ref: "Figura 4.5-3", detalle: "De UNA CARA de la torre, para el segmento en "
          + "consideración (nota 1). No es el ε del conjunto de las cuatro caras." },
      { paso: "Coeficiente base", simbolo: "C_f", valor: r.base, dec: 3, unidad: "",
        ref: "Figura 4.5-3", detalle: `${r.def.label}: C_f = ${r.def.expr}. Es un polinomio, `
          + "no una tabla: no hay nada que interpolar." },
    ];
    if (r.fRed !== 1) pasos.push({ paso: "Miembros redondeados", simbolo: "0,51ε²+0,57",
      valor: r.fRed, dec: 3, unidad: "", ref: "Figura 4.5-3, nota 3",
      detalle: "Reduce, con tope en 1,0." });
    if (r.fDia !== 1) pasos.push({ paso: "Viento según la diagonal", simbolo: "1+0,75ε",
      valor: r.fDia, dec: 3, unidad: "", ref: "Figura 4.5-3, nota 4",
      detalle: "Mayora, con tope en 1,2. La diagonal expone las cuatro caras a la vez." });
    avisos.push({ tono: "info", texto:
      "La nota 5 pide calcular aparte las fuerzas sobre accesorios de la torre —escaleras, "
      + "conductos, luces— con sus propios coeficientes, y la nota 6 remite al CIRSOC 104 "
      + "por el incremento de carga debido a la adherencia de hielo." });

  } else if (familia === "equipo") {
    const B = num(d.Bedif), hEd = num(d.hedif), L = num(d.Ledif);
    // Las dos expresiones usan q_h del EDIFICIO que soporta al equipo, no la altura del
    // equipo: el art. 4.5.1 es explícito.
    z = hEd;
    const lat = gcrEquipo({ tipo: "lateral", area: num(d.Af), B, dim: hEd });
    const ver = gcrEquipo({ tipo: "vertical", area: num(d.Ar), B, dim: L });
    if (!lat || !ver) return null;
    area = num(d.Af); cf = lat.gcr;
    extra = { lat, ver, Ar: num(d.Ar), esGCr: true };
    pasos = [
      { paso: "Coeficiente lateral", simbolo: "(GC_r)", valor: lat.gcr, dec: 3, unidad: "",
        ref: "(4.5-2)", detalle: lat.reducido
          ? `A_f = ${fc(lat.A)} m² está entre 0,1·B·h = ${fc(lat.bajo)} m² y B·h = `
            + `${fc(lat.alto)} m²: se reduce linealmente de 1,9 a 1,0.`
          : `A_f = ${fc(lat.A)} m² < 0,1·B·h = ${fc(lat.bajo)} m²: vale el máximo, 1,9.` },
      { paso: "Coeficiente vertical", simbolo: "(GC_r)", valor: ver.gcr, dec: 3, unidad: "",
        ref: "(4.5-3)", detalle: ver.reducido
          ? `A_r = ${fc(ver.A)} m² está entre 0,1·B·L = ${fc(ver.bajo)} m² y B·L = `
            + `${fc(ver.alto)} m².`
          : `A_r = ${fc(ver.A)} m² < 0,1·B·L = ${fc(ver.bajo)} m²: vale el máximo, 1,5.` },
    ];
    avisos.push({ tono: "info", texto:
      "El (GC_r) es un PRODUCTO tabulado: el art. 1.9.7 no permite separarlo en G por C_r, "
      + "así que las expresiones (4.5-2) y (4.5-3) no llevan G aparte." });
  }

  const q = qEn(z, sitio, kd);
  if (q === null || cf === null) {
    return { fam, z, area, cf, q, F: null, traza: [], avisos, extra,
      error: "No se pudo evaluar la presión dinámica o el coeficiente de fuerza." };
  }
  // El equipo sobre cubierta NO lleva G: su coeficiente ya es un producto (GC_r).
  const gEf = familia === "equipo" ? 1 : G;
  const F = fuerza({ q, G: gEf, cf, area });

  const traza = [
    ...trazaBase({ sitio, kd, z, G, etiquetaZ }),
    ...pasos,
    { paso: "Área", simbolo: familia === "equipo" ? "A_f" : (familia === "cartel_lleno" ? "A_s" : "A_f"),
      valor: area, dec: 2, unidad: "m²", ref: fam.ref,
      detalle: familia === "cartel_lleno"
        ? "Área total de la pared libre o del cartel."
        : "Área proyectada normal al viento." },
    { paso: "Fuerza de viento de diseño", simbolo: "F", valor: F, dec: 0, unidad: "N",
      ref: `Expresión ${fam.expr}`,
      detalle: familia === "equipo"
        ? "F_h = q_h·(GC_r)·A_f. El (GC_r) ya contiene el factor de ráfaga."
        : `F = q·G·C_f·A = ${fc(q, 0)} × ${fc(gEf, 3)} × ${fc(cf, 3)} × ${fc(area)}.` },
  ];

  return { fam, z, area, cf, q, F, G: gEf, traza, avisos, extra, etiquetaZ };
}

// Analiza un silo, tanque o recipiente cilíndrico vertical cerrado — Tabla 4.1-2.
//
// A diferencia de los accesorios, acá el resultado NO es una sola fuerza: son el arrastre
// global de las paredes más un mapa de presiones sobre el techo y, si está elevado, sobre
// el fondo. Devolverlo como un número solo perdería justamente lo que hay que dimensionar.
export function analizarSilo({ datos, sitio, kd, G, gcpi = 0 }) {
  const d = datos ?? {};
  const D = num(d.D), H = num(d.H), theta = num(d.theta), sep = num(d.separacion, Infinity);
  if (!(D > 0) || !(H > 0)) return null;

  // Altura media de cubierta: el cilindro más la mitad del remonte del techo cónico.
  const remonte = theta > 0 ? (D / 2) * Math.tan(theta * Math.PI / 180) : 0;
  const h = H + remonte / 2;
  const hd = H / D;

  const avisos = [];
  // Alcance de la Figura 4.5-4. Fuera de él, el artículo no aplica y no hay valor que dar.
  if (h > SILO_ALCANCE.hMax) avisos.push({ tono: "error", texto:
    `h = ${fc(h)} m > ${SILO_ALCANCE.hMax} m: fuera del alcance del art. 4.5.2.` });
  if (D > SILO_ALCANCE.dMax) avisos.push({ tono: "error", texto:
    `D = ${fc(D)} m > ${SILO_ALCANCE.dMax} m: fuera del alcance del art. 4.5.2.` });
  if (hd < SILO_ALCANCE.hdMin || hd > SILO_ALCANCE.hdMax) avisos.push({ tono: "error", texto:
    `H/D = ${fc(hd)} fuera de 0,25 a 4: el art. 4.5.2 no cubre esa proporción.` });
  if (theta >= 30) avisos.push({ tono: "error", texto:
    `θ = ${fc(theta, 1)}° ≥ 30°: la Figura 4.5-5 llega hasta 30°. Por encima corresponde `
    + "revisar el tratamiento de domos de la Figura 2.4-2, que no está implementada." });

  const reg = regimenSilo(sep);
  const paredCf = cfParedSilo({ hd, modo: reg.modo });
  // El aislado usa q_z al centroide del cilindro; el agrupado, q_h.
  const zPared = reg.modo === "aislado" ? H / 2 : h;
  const qPared = qEn(zPared, sitio, kd);
  const qh = qEn(h, sitio, kd);

  const zonas = zonasTechoSilo({ D, h, H, theta, agrupado: reg.modo === "agrupado" });
  const cpTecho = cpTechoSilo({ theta, hd, agrupado: reg.modo === "agrupado" });

  // El arrastre global sobre la proyección D·H.
  const areaPared = D * H;
  const Fpared = fuerza({ q: qPared, G, cf: paredCf.cf, area: areaPared });

  // Presiones netas del techo, expresión (4.5-4): p = q_h·(G·C_p − (GC_pi)).
  // ⚠ LLEVA LOS DOS SIGNOS DE LA PRESIÓN INTERNA, como cualquier estructura techada.
  const presionTecho = (cp) => ({
    cp,
    conInternaPos: qh * (G * cp - Math.abs(gcpi)),
    conInternaNeg: qh * (G * cp + Math.abs(gcpi)),
  });

  const fondo = d.elevado ? cpFondoSilo({ C: num(d.C), h }) : null;

  return {
    D, H, h, hd, theta, remonte, reg, paredCf, qPared, qh, zPared,
    areaPared, Fpared, zonas, cpTecho, avisos, gcpi,
    techo: [
      { zona: "Zona 1", ancho: zonas?.b, ...presionTecho(cpTecho.zona1) },
      { zona: "Zona 2", ancho: zonas?.zona2, ...presionTecho(cpTecho.zona2) },
    ],
    fondo: fondo ? fondo.cp.map((cp, i) => ({
      caso: i === 0 ? "Caso de presión" : "Caso de succión", ...presionTecho(cp),
    })) : null,
    fondoInfo: fondo,
    traza: [
      ...trazaBase({ sitio, kd, z: zPared, G,
        etiquetaZ: reg.modo === "aislado" ? "centroide del cilindro" : "altura media de cubierta" }),
      { paso: "Esbeltez", simbolo: "H/D", valor: hd, dec: 2, unidad: "", ref: "Art. 4.5.2",
        detalle: `H = ${fc(H)} m · D = ${fc(D)} m. Alcance: 0,25 ≤ H/D ≤ 4.` },
      { paso: "Altura media de cubierta", simbolo: "h", valor: h, dec: 2, unidad: "m",
        ref: "Figura 4.5-4", detalle: theta > 0
          ? `Cilindro de ${fc(H)} m más la mitad del remonte cónico de ${fc(remonte)} m.`
          : "Techo plano: coincide con la altura del cilindro." },
      { paso: "Agrupamiento", simbolo: "", valor: null, texto: reg.modo, unidad: "",
        ref: "Art. 4.5.2", detalle: reg.motivo },
      { paso: "Arrastre de las paredes", simbolo: "C_f", valor: paredCf.cf, dec: 3, unidad: "",
        ref: paredCf.ref, detalle: `Sobre la proyección D·H = ${fc(areaPared)} m², para usar `
          + `con ${paredCf.usarCon}.` },
      { paso: "Fuerza de arrastre global", simbolo: "F", valor: Fpared, dec: 0, unidad: "N",
        ref: "Expresión (4.5-1)", detalle: `F = q·G·C_f·A_f.` },
    ],
  };
}
