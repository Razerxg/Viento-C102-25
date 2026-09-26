// TABLA DE CARGA DE VIENTO POR SUPERFICIE.
//
// Es la tabla que una planilla de cálculo de viento entrega y que una memoria transcribe:
// para cada superficie, la altura, el coeficiente de exposición, la presión dinámica, el
// coeficiente de presión y la presión neta en SUS DOS casos de presión interna.
//
// ── POR QUÉ LA PARED A BARLOVENTO LLEVA UNA FILA POR ALTURA ─────────────────────
// Porque es la única superficie donde `q` varía, y un solo número no la describe. Las
// cotas con nombre —alero, cumbrera y altura media— van SEÑALADAS: son las que se
// transcriben al modelo de barras, y buscarlas interpolando entre dos filas es
// exactamente lo que produce errores de transcripción.
import { nombreCerramiento } from '../../constants/presionInterna.js';
import { Tabla, Th, Td, TdN, Nota } from '../ui.jsx';
import { c } from '../tokens.js';
import { f } from '../../lib/formato.js';

export function TablaCargas({ analisis }) {
  const { superficies, GCpi, geo } = analisis;
  const bar = superficies.find(s => s.id === "pared_barlovento");
  const resto = superficies.filter(s => s.id !== "pared_barlovento");

  // ── QUÉ EXTREMO DEL TRAMO GOBIERNA ────────────────────────────────────────────
  // Cada tramo se resuelve con el mayor producto K_z·K_zt de sus dos cotas. Cuando gana
  // el PISO del tramo —que es lo que pasa cerca del suelo, donde K_z está congelado y
  // K_zt sigue creciendo hacia abajo— el K_zt de la fila no es el de la cota que la
  // rotula, y callarlo dejaría un número que no se puede reproducir a mano.
  const kztCelda = (t) => {
    const v = f(t.kzt ?? 1, 3);
    return t.gobierna === "inferior" ? `${v} (z = ${f(t.zGobernante, 2)})` : v;
  };
  // q_h lleva el K_zt de la altura media de cubierta.
  const kztH = analisis.perfil?.at(-1)?.extremos?.superior?.kzt ?? 1;

  const hayInferior = bar.tramos.some(t => t.gobierna === "inferior");

  // La fila con cota nombrada se resalta por FONDO y no por peso: son tres o cuatro entre
  // veinte, y en negrita sobre una columna de números en negrita no se distinguirían.
  const fila = (k, celdas, marca) => (
    <tr key={k}>
      {celdas.map((v, i) => i === 0
        ? <Td key={i} nowrap peso={marca ? 600 : undefined} fondo={marca ? c.azulBg : undefined}>{v}</Td>
        : <TdN key={i} fondo={marca ? c.azulBg : undefined}>{v}</TdN>)}
    </tr>
  );

  return (
    <>
      <Tabla minWidth={760}>
        <thead><tr>
          <Th>Superficie</Th>
          <Th alinear="right">z (m)</Th>
          <Th alinear="right">K_z</Th>
          <Th alinear="right">K_zt</Th>
          <Th alinear="right">q_z (N/m²)</Th>
          <Th alinear="right">C_p</Th>
          <Th alinear="right">p con +GC_pi</Th>
          <Th alinear="right">p con −GC_pi</Th>
        </tr></thead>
        <tbody>
          {/* pared a barlovento: una fila por altura */}
          {bar.tramos.map((t, i) => fila(`b${i}`, [
            i === 0 ? "Pared a barlovento" : (t.marca ? `para z = ${t.marca}` : ""),
            f(t.z, 2), f(t.kz, 3), kztCelda(t), f(t.q, 0), f(bar.cp, 2),
            f(t.conInternaPos, 0), f(t.conInternaNeg, 0),
          ], !!t.marca && i > 0))}

          {/* el resto: q constante, así que z y K_z no aplican */}
          {resto.map(s => fila(s.id, [
            s.nombre, s.tipo === "pared" ? "todas" : "—", "—", f(kztH, 3), f(s.q, 0), f(s.cp, 2),
            f(s.conInternaPos, 0), f(s.conInternaNeg, 0),
          ]))}
        </tbody>
      </Tabla>

      <Nota>
        <b style={{ color: c.txt }}>Notas.</b>{" "}
        <b>1.</b> Los signos + y − significan presiones actuando hacia la superficie y
        alejándose de ella, respectivamente (art. 1.4.1).{" "}
        <b>2.</b> Las dos últimas columnas son los <b>dos casos de presión interna</b> que
        exige la nota 3 de la Tabla 1.11-1, con{" "}
        <b style={{ color: c.txt }}>GC_pi = ±{f(Math.abs(GCpi), 2)}</b> ({nombreCerramiento(analisis.cerramiento)}).
        No es elegir el peor: uno gobierna el levantamiento de la cubierta y el otro la
        compresión de las paredes, en combinaciones distintas.{" "}
        <b>3.</b> Sólo la pared a barlovento usa <b>q_z</b>, evaluada a cada altura; el
        resto usa <b>q_h</b>, constante, evaluada a la altura media de cubierta.{" "}
        <b>4.</b> La carga mínima del art. 2.1.5 es 0,75 kN/m² sobre la proyección de pared
        y 0,40 kN/m² sobre la de cubierta, aplicadas simultáneamente, y se verifica aparte.{" "}
        {analisis.modo === "franjas" && <><b>5.</b> Las franjas de cubierta se miden desde
        el borde de barlovento, en múltiplos de la altura media h = {f(geo.h, 2)} m.{" "}</>}
        {hayInferior && <><b>{analisis.modo === "franjas" ? 6 : 5}.</b> Cada tramo de la
        pared a barlovento se calcula con el mayor producto <b>K_z·K_zt</b> de sus dos
        cotas. En las filas donde el K_zt lleva una cota entre paréntesis, el que gobierna
        es el <b>piso</b> del tramo y no su techo: por debajo de z_mín el perfil de K_z
        está congelado, mientras que K_zt sigue creciendo hacia el terreno.</>}
      </Nota>
    </>
  );
}
