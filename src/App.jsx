// PANTALLA PROVISORIA.
//
// El esqueleto existe para que el repositorio compile, despliegue y corra su suite desde
// el primer día: así, cuando llegue el motor, lo único que se discute es el cálculo y no
// la infraestructura. Esta pantalla se reemplaza entera por las pestañas.
//
// Dice EN QUÉ ESTADO está la app y qué falta, a propósito. Un esqueleto que muestra una
// pantalla vacía o un «Hello world» desplegado en una URL de ingeniería es peor que no
// tener nada: quien la abre no sabe si está rota, si está incompleta o si el resultado
// que no ve es un cero.
const ALCANCE = [
  ["Norma", "CIRSOC 102-2025"],
  ["Procedimiento", "Direccional"],
  ["Sistema", "SRFV — sistema principal resistente a la fuerza del viento"],
  ["Tipología", "Edificios: cerrado, parcialmente cerrado, parcialmente abierto y abierto"],
  ["Salida", "Presiones por zona y por superficie"],
];

export function App() {
  return (
    <main style={{
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      maxWidth: 720, margin: "0 auto", padding: 32, lineHeight: 1.6, color: "#1a1d21",
    }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Acción del viento sobre las construcciones</h1>
      <p style={{ margin: "0 0 28px", color: "#6b7280" }}>CIRSOC 102-2025 · método direccional · SRFV</p>

      <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 28 }}>
        <tbody>
          {ALCANCE.map(([k, v]) => (
            <tr key={k}>
              <td style={{ padding: "8px 12px 8px 0", borderBottom: "1px solid #e5e7eb",
                color: "#6b7280", whiteSpace: "nowrap", verticalAlign: "top" }}>{k}</td>
              <td style={{ padding: "8px 0", borderBottom: "1px solid #e5e7eb" }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ padding: 16, background: "#fef6e7", borderLeft: "3px solid #d99a2b",
        borderRadius: 4 }}>
        <b>Esqueleto — el motor de cálculo está pendiente.</b> Ningún coeficiente de la
        norma se transcribe sin el documento a la vista: un valor inventado daría una
        presión plausible y un cálculo equivocado que ningún control detecta.
      </div>
    </main>
  );
}
