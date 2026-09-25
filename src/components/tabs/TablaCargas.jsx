// TABLA DE CARGA DE VIENTO POR SUPERFICIE.
//
// Es la tabla que una planilla de cálculo de viento entrega y que una memoria transcribe:
// para cada superficie, la altura, el coeficiente de exposición, la presión dinámica, el
// coeficiente de presión y la presión neta en SUS DOS casos de presión interna.
//
// ── POR QUÉ LA PARED A BARLOVENTO LLEVA UNA FILA POR ALTURA ─────────────────────
// Porque es la única superficie donde `q` varía, y un solo número no la describe. Las
// tres cotas con nombre —alero, cumbrera y altura media— van SEÑALADAS: son las que se
// transcriben al modelo de barras, y buscarlas interpolando entre dos filas es
// exactamente lo que produce errores de transcripción.
import { CERRAMIENTOS } from '../../constants/presionInterna.js';

const f = (n, d = 0) => (Number.isFinite(n) ? n.toFixed(d).replace(".", ",") : "—");

export function TablaCargas({ analisis, S, fmt }) {
  const { superficies, dir, GCpi, geo } = analisis;
  const bar = superficies.find(s => s.id === "pared_barlovento");
  const resto = superficies.filter(s => s.id !== "pared_barlovento");

  const th = (t, i) => <th key={i} style={{ ...S.th, whiteSpace: "nowrap" }}>{t}</th>;
  const fila = (k, celdas, marca) => (
    <tr key={k} style={marca ? { background: "var(--avisoBg)" } : undefined}>
      {celdas.map((c, i) => (
        <td key={i} style={i === 0 ? { ...S.td, whiteSpace: "nowrap" } : S.tdN}>{c}</td>
      ))}
    </tr>
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 660 }}>
        <thead>
          <tr>{["Superficie", "z (m)", "Kz", "qz (N/m²)", "Cp",
            "p con +GCpi", "p con −GCpi"].map(th)}</tr>
        </thead>
        <tbody>
          {/* pared a barlovento: una fila por altura */}
          {bar.tramos.map((t, i) => fila(`b${i}`, [
            i === 0 ? "Pared a barlovento" : (t.marca ? `Para z = ${t.marca}` : ""),
            f(t.z, 2), f(t.kz, 3), f(t.q, 0), f(bar.cp, 2),
            f(t.conInternaPos, 0), f(t.conInternaNeg, 0),
          ], !!t.marca && i > 0))}

          {/* el resto: q constante, así que z y Kz no aplican */}
          {resto.map(s => fila(s.id, [
            s.nombre, s.tipo === "pared" ? "Todas" : "—", "—", f(s.q, 0), f(s.cp, 2),
            f(s.conInternaPos, 0), f(s.conInternaNeg, 0),
          ]))}
        </tbody>
      </table>

      <div style={{ fontSize: 12, color: "var(--txt2)", marginTop: 12, lineHeight: 1.7 }}>
        <b style={{ color: "var(--txt)" }}>Notas.</b>{" "}
        <b>1.</b> Los signos + y − significan presiones actuando hacia la superficie y
        alejándose de ella, respectivamente (art. 1.4.1).{" "}
        <b>2.</b> Las dos últimas columnas son los <b>dos casos de presión interna</b> que
        exige la nota 3 de la Tabla 1.11-1, con{" "}
        <b style={{ color: "var(--txt)" }}>GCpi = ±{f(Math.abs(GCpi), 2)}</b> (
        {CERRAMIENTOS.find(c => c.gcpi === Math.abs(GCpi))?.label.toLowerCase() ?? "—"}).
        No es elegir el peor: uno gobierna el levantamiento de la cubierta y el otro la
        compresión de las paredes, en combinaciones distintas.{" "}
        <b>3.</b> Sólo la pared a barlovento usa <b>q_z</b>, evaluada a cada altura; el
        resto usa <b>q_h</b>, constante, evaluada a la altura media de cubierta.{" "}
        <b>4.</b> La carga mínima del art. 2.1.5 es 0,75 kN/m² sobre la proyección de pared
        y 0,40 kN/m² sobre la de cubierta, aplicadas simultáneamente, y se verifica aparte.{" "}
        {analisis.modo === "franjas" && <><b>5.</b> Las franjas de cubierta se miden desde
        el borde de barlovento, en múltiplos de la altura media h = {f(geo.h, 2)} m.</>}
      </div>
    </div>
  );
}
