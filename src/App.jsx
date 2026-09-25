// PANTALLA PRINCIPAL. Datos a la izquierda, croquis y resultados a la derecha.
//
// Todo se recalcula en cada edición: el cálculo entero de un edificio son microsegundos,
// así que no hay razón para un botón «calcular». Un botón así introduce además un estado
// intermedio —datos nuevos, resultados viejos— que es exactamente donde alguien lee un
// número que ya no corresponde a lo que tiene en pantalla.
import { useState, useMemo, useEffect } from "react";
import { analizarEdificio, DIRECCIONES } from "./engine/edificio.js";
import { CIUDADES, velocidadDe } from "./constants/velocidades.js";
import { CERRAMIENTOS } from "./constants/presionInterna.js";
import { EXPOSICIONES } from "./constants/exposicion.js";
import { TIPOS_CUBIERTA, DIRECCIONES_PENDIENTE, tipoDe } from "./constants/cubiertas.js";
import { kdDe } from "./constants/direccionalidad.js";
import { PerfilQ } from "./components/svg/PerfilQ.jsx";
import { PlantaZonas } from "./components/svg/PlantaZonas.jsx";
import { ElevacionCubierta } from "./components/svg/ElevacionCubierta.jsx";
import { Vista3D } from "./components/svg/Vista3D.jsx";
import { CurvasAltura } from "./components/svg/CurvasAltura.jsx";
import { MapaVelocidad } from "./components/MapaVelocidad.jsx";
import { resultantes, barridoAlero, envolvente } from "./engine/resultantes.js";
import { analizarDireccion } from "./engine/edificio.js";

// Separador decimal COMA para mostrar y punto para el dato. Es la convención del país y la
// de las otras aplicaciones; mezclarlas es lo que produce un «1.234» que se lee como mil
// doscientos en un lado y como uno coma dos en el otro.
const f = (n, d = 0) => (Number.isFinite(n) ? n.toFixed(d).replace(".", ",") : "—");
const fmt = { q: (n) => `${f(n, 0)} N/m²`, m: (n) => `${f(n, 2)} m` };

const S = {
  app: { fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    color: "var(--txt)", background: "var(--fondo)", minHeight: "100vh" },
  wrap: { maxWidth: 1240, margin: "0 auto", padding: "20px 16px 60px",
    display: "grid", gridTemplateColumns: "minmax(240px, 300px) 1fr", gap: 20, alignItems: "start" },
  card: { background: "var(--sup)", border: "1px solid var(--borde)", borderRadius: 8,
    padding: 16, marginBottom: 16 },
  h2: { fontSize: 13, fontWeight: 700, margin: "0 0 12px", letterSpacing: ".02em",
    textTransform: "uppercase", color: "var(--txt2)" },
  lab: { display: "block", fontSize: 12, color: "var(--txt2)", marginBottom: 3 },
  inp: { width: "100%", padding: "6px 8px", fontSize: 14, borderRadius: 4,
    border: "1px solid var(--borde)", background: "var(--fondo)", color: "var(--txt)",
    boxSizing: "border-box" },
  fila: { marginBottom: 10 },
  th: { textAlign: "left", padding: "6px 8px", fontSize: 11, color: "var(--txt2)",
    borderBottom: "1px solid var(--borde)", textTransform: "uppercase", letterSpacing: ".03em" },
  td: { padding: "6px 8px", fontSize: 13, borderBottom: "1px solid var(--borde)" },
  tdN: { padding: "6px 8px", fontSize: 13, borderBottom: "1px solid var(--borde)",
    textAlign: "right", fontVariantNumeric: "tabular-nums" },
  tab: { padding: "6px 12px", fontSize: 13, border: "1px solid var(--borde)",
    background: "var(--fondo)", color: "var(--txt)", borderRadius: 5, cursor: "pointer" },
  tabOn: { background: "var(--acento)", color: "#fff", borderColor: "var(--acento)" },
};

const Campo = ({ label, children }) => (
  <div style={S.fila}><label style={S.lab}>{label}</label>{children}</div>
);

export function App() {
  const [ciudad, setCiudad] = useState("Buenos Aires");
  const [riesgo, setRiesgo] = useState("II");
  const [exposicion, setExposicion] = useState("B");
  const [altitud, setAltitud] = useState("0");
  const [cerramiento, setCerramiento] = useState("cerrado");
  const [geo, setGeo] = useState({ a: "20", b: "30", hAlero: "6", theta: "0",
    cumbrera: "X", tipo: "plana", pendienteHacia: "+Y" });
  const [iDir, setIDir] = useState(0);
  const [tema, setTema] = useState("claro");

  // El atributo va en la RAÍZ del documento, no en un div de la app: las variables tienen
  // que alcanzar también al <body>, que queda fuera del árbol de React. Puesto en un div
  // interior, el fondo de la página seguiría siendo el del tema claro.
  useEffect(() => { document.documentElement.setAttribute("data-tema", tema); }, [tema]);

  const V = velocidadDe(ciudad, riesgo) ?? 0;
  const sitio = { V, exposicion, kd: kdDe("edificio_sprfv"), Kzt: 1.0,
    altitud: parseFloat(altitud) || 0, usarKe: true };

  const todas = useMemo(
    () => analizarEdificio({ geo, sitio, cerramiento, G: 0.85 }),
    [geo, V, exposicion, altitud, cerramiento]);
  const act = todas[iDir];

  // El máximo se toma sobre TODO el edificio y todas las direcciones: si se normalizara por
  // dirección, cada croquis usaría su propia escala y dos croquis lado a lado dirían cosas
  // distintas con el mismo color.
  const maxAbs = useMemo(() => Math.max(...todas.flatMap(t =>
    t.superficies.flatMap(s => s.tramos
      ? s.tramos.map(x => Math.abs(x.gobernante))
      : [Math.abs(s.gobernante ?? 0)]))), [todas]);

  // Envolvente de las cuatro direcciones sobre el rango de alturas. Se recalcula sólo
  // cuando cambia algo que la afecta: son ~120 análisis completos y no hace falta rehacerlos
  // al girar el 3D.
  const curvas = useMemo(() => envolvente(DIRECCIONES.map(d => barridoAlero({
    analizar: analizarDireccion, entrada: { geo, sitio, cerramiento, G: 0.85 },
    direccion: d, desde: 3, hasta: 30, pasos: 27,
  }))), [geo.a, geo.b, geo.theta, geo.tipo, geo.cumbrera, geo.pendienteHacia,
    V, exposicion, altitud, cerramiento]);
  const res = useMemo(() => resultantes(act), [act]);

  const up = (k) => (e) => setGeo(g => ({ ...g, [k]: e.target.value }));
  const croquis = { ancho: 620, fmt, tema, maxAbs, analisis: act };

  return (
    <div style={S.app}>
      <header style={{ borderBottom: "1px solid var(--borde)", padding: "14px 16px",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
        flexWrap: "wrap", background: "var(--sup)" }}>
        <div>
          <b style={{ fontSize: 15 }}>Acción del viento sobre las construcciones</b>
          <div style={{ fontSize: 12, color: "var(--txt2)" }}>
            CIRSOC 102-2025 · procedimiento direccional · SPRFV
          </div>
        </div>
        <button style={S.tab} onClick={() => setTema(t => t === "claro" ? "oscuro" : "claro")}>
          {tema === "claro" ? "Modo oscuro" : "Modo claro"}
        </button>
      </header>

      <div style={S.wrap}>
        <aside>
          <div style={S.card}>
            <h2 style={S.h2}>Sitio</h2>
            <Campo label="Localidad">
              <select style={S.inp} value={ciudad} onChange={e => setCiudad(e.target.value)}>
                {CIUDADES.map(([n]) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Campo>
            <Campo label="Categoría de riesgo (Tabla 1.14-1)">
              <select style={S.inp} value={riesgo} onChange={e => setRiesgo(e.target.value)}>
                {["I", "II", "III", "IV"].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Campo>
            <div style={{ fontSize: 12, color: "var(--txt2)", marginBottom: 8 }}>
              V = <b style={{ color: "var(--txt)" }}>{f(V, 1)} m/s</b> · ráfaga de 3 s a 10 m,
              exposición C
            </div>
            <div style={{ marginBottom: 12 }}>
              <MapaVelocidad riesgo={riesgo} ciudad={ciudad} V={V} fmt={`${f(V, 1)} m/s`} />
            </div>
            <Campo label="Categoría de exposición (art. 1.7)">
              <select style={S.inp} value={exposicion} onChange={e => setExposicion(e.target.value)}>
                {EXPOSICIONES.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </Campo>
            <Campo label="Altitud sobre el nivel del mar (m)">
              <input style={S.inp} type="number" value={altitud} onChange={e => setAltitud(e.target.value)} />
            </Campo>
            <Campo label="Clasificación de cerramiento (art. 1.10)">
              <select style={S.inp} value={cerramiento} onChange={e => setCerramiento(e.target.value)}>
                {CERRAMIENTOS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Campo>
          </div>

          <div style={S.card}>
            <h2 style={S.h2}>Edificio</h2>
            <Campo label="Dimensión según X, a (m)">
              <input style={S.inp} type="number" value={geo.a} onChange={up("a")} /></Campo>
            <Campo label="Dimensión según Y, b (m)">
              <input style={S.inp} type="number" value={geo.b} onChange={up("b")} /></Campo>
            <Campo label="Altura de alero (m)">
              <input style={S.inp} type="number" value={geo.hAlero} onChange={up("hAlero")} /></Campo>
            <Campo label="Tipo de cubierta (Figura 2.4-1)">
              <select style={S.inp} value={geo.tipo} onChange={up("tipo")}>
                {TIPOS_CUBIERTA.map(t => (
                  <option key={t.id} value={t.id} disabled={t.noImplementada}>
                    {t.label}{t.noImplementada ? " — no implementada" : ""}
                  </option>
                ))}
              </select>
            </Campo>
            <div style={{ fontSize: 11, color: "var(--txt2)", marginBottom: 10, lineHeight: 1.5 }}>
              {tipoDe(geo.tipo).ayuda}
            </div>
            {geo.tipo !== "plana" && (
              <Campo label="Ángulo de cubierta θ (°)">
                <input style={S.inp} type="number" value={geo.theta} onChange={up("theta")} /></Campo>
            )}
            {geo.tipo !== "plana" && (
              <Campo label="Dirección de la cumbrera">
                <select style={S.inp} value={geo.cumbrera} onChange={up("cumbrera")}>
                  <option value="X">Según X</option><option value="Y">Según Y</option>
                </select>
              </Campo>
            )}
            {geo.tipo === "vertiente_unica" && (
              <Campo label="Hacia dónde desciende la pendiente">
                <select style={S.inp} value={geo.pendienteHacia} onChange={up("pendienteHacia")}>
                  {DIRECCIONES_PENDIENTE.map(d =>
                    <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </Campo>
            )}
            <div style={{ fontSize: 12, color: "var(--txt2)", lineHeight: 1.6 }}>
              Altura media <b style={{ color: "var(--txt)" }}>{fmt.m(act.geo.h)}</b>
              {act.geo.theta <= 10 ? " — igual al alero, por θ ≤ 10° (art. 1.2)"
                : ` · cumbrera a ${fmt.m(act.geo.hCumbre)}`}
            </div>
          </div>

          <div style={{ ...S.card, background: "var(--avisoBg)", borderColor: "var(--avisoBd)" }}>
            <b style={{ fontSize: 12 }}>K_zt = 1,0 — terreno llano.</b>
            <div style={{ fontSize: 12, color: "var(--txt2)", marginTop: 6, lineHeight: 1.5 }}>
              Si el edificio está en la mitad superior de una loma o cerca de la cresta de una
              escarpa, <b>no corresponde</b>: el art. 1.8 puede llevar K_zt hasta 1,9, casi el
              doble de presión.
            </div>
          </div>
        </aside>

        <main>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {DIRECCIONES.map((d, i) => (
              <button key={d.id} onClick={() => setIDir(i)}
                style={{ ...S.tab, ...(i === iDir ? S.tabOn : {}) }}>{d.id} · {d.label}</button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 16 }}>
            {[["Perfil de q(z) en altura", <PerfilQ key="a" {...croquis} />],
              ["Planta con zonas y presiones", <PlantaZonas key="b" {...croquis} />],
              ["Elevación con zonas de cubierta", <ElevacionCubierta key="c" {...croquis} />],
              ["Vista 3D coloreada por presión", <Vista3D key="d" {...croquis} />]].map(([t, el]) => (
              <div key={t} style={S.card}>
                <h2 style={S.h2}>{t}</h2>
                {el}
              </div>
            ))}
          </div>

          <div style={S.card}>
            <h2 style={S.h2}>Resultantes en la base según la altura de alero</h2>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 14 }}>
              {[["Corte total", res.cortante / 1000, "kN"],
                ["Levantamiento", res.levantamiento / 1000, "kN"],
                ["Vuelco", res.vuelco / 1000, "kN·m"]].map(([t, v, u]) => (
                <div key={t}>
                  <div style={{ fontSize: 11, color: "var(--txt2)" }}>{t} · {act.dir.id}</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{f(Math.abs(v), 1)}
                    <span style={{ fontSize: 12, fontWeight: 400, color: "var(--txt2)" }}> {u}</span></div>
                </div>
              ))}
            </div>
            <CurvasAltura datos={curvas.map(c => ({ ...c, cortante: c.cortante / 1000,
              levantamiento: c.levantamiento / 1000, vuelco: c.vuelco / 1000 }))}
              hActual={act.geo.hAlero} fmt={(n) => f(n, n >= 100 ? 0 : 1)} tema={tema} />
            <div style={{ fontSize: 12, color: "var(--txt2)", marginTop: 10, lineHeight: 1.6 }}>
              Las curvas son la <b>envolvente de las cuatro direcciones</b>; los tres números
              de arriba son los de la dirección seleccionada. La presión interna se cancela en
              el corte —actúa por igual sobre barlovento y sotavento— pero no en el
              levantamiento, que es donde gobierna.
              {res.gobiernaNota7 && <> En esta dirección gobierna el <b>piso de la nota 7</b>:
                las componentes horizontales de la cubierta restaban.</>}
            </div>
          </div>

          <div style={S.card}>
            <h2 style={S.h2}>Cómo se llegó a estos números — {act.dir.label}</h2>
            <div style={{ padding: "10px 12px", background: "var(--avisoBg)",
              border: "1px solid var(--avisoBd)", borderRadius: 6, marginBottom: 14,
              fontSize: 13, lineHeight: 1.6 }}>
              <b>Tratamiento de la cubierta: {act.modo === "faldones" ? "dos faldones"
                : act.modo === "unica" ? `superficie completa a ${act.caraUnica}` : "por franjas"}.</b>
              <div style={{ color: "var(--txt2)", marginTop: 4 }}>{act.motivoModo}</div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Paso", "Símbolo", "Valor", "De dónde sale"].map(h =>
                  <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {act.traza.map((t, i) => (
                    <tr key={i}>
                      <td style={S.td}>{t.paso}</td>
                      <td style={{ ...S.td, fontFamily: "ui-monospace, monospace" }}>{t.simbolo}</td>
                      {/* Los decimales los declara cada paso: deducirlos de la magnitud
                          imprimía «55,100 m/s» para una velocidad y «0,850» para un factor,
                          con la misma regla y ninguna de las dos bien. */}
                      <td style={S.tdN}>{t.texto ?? (t.valor === null ? "—"
                        : `${f(t.valor, t.dec ?? 2)}${t.unidad ? " " + t.unidad : ""}`)}</td>
                      <td style={{ ...S.td, fontSize: 12, color: "var(--txt2)" }}>
                        <b style={{ color: "var(--txt)" }}>{t.ref}</b> — {t.detalle}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={S.card}>
            <h2 style={S.h2}>Superficies — {act.dir.label}</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  {["Superficie", "Cp", "q (N/m²)", "p con GCpi + ", "p con GCpi − ",
                    "Fila de la figura"].map(h => <th key={h} style={S.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {act.superficies.map(s => {
                    const t = s.tramos?.at(-1);
                    return (
                      <tr key={s.id}>
                        <td style={S.td}>{s.nombre}{s.relacion ? ` · ${s.relacion}` : ""}</td>
                        <td style={S.tdN}>{f(s.cp, 2)}</td>
                        <td style={S.tdN}>{f(s.q ?? t?.q, 0)}{s.usar === "qz" ? " (en h)" : ""}</td>
                        <td style={S.tdN}>{f(s.conInternaPos ?? t?.conInternaPos, 0)}</td>
                        <td style={S.tdN}>{f(s.conInternaNeg ?? t?.conInternaNeg, 0)}</td>
                        <td style={{ ...S.td, fontSize: 11, color: "var(--txt2)", minWidth: 200 }}>
                          {s.cpRef}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 12, color: "var(--txt2)", marginTop: 10, lineHeight: 1.6 }}>
              Las dos últimas columnas son los <b>dos casos de presión interna</b> que exige la
              nota 3 de la Tabla 1.11-1. No es elegir el peor: uno gobierna el levantamiento de
              la cubierta y el otro la compresión de las paredes, en combinaciones distintas.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
