// FACTOR DE EFECTO DE RÁFAGA — el bloque completo, como en una planilla de cálculo.
//
// La app usaba G = 0,85 y punto. Es válido —es el valor del art. 1.9.1— pero esconde dos
// cosas que el reglamento ofrece: el G CALCULADO de (1.9-6), que tiene en cuenta el tamaño
// del edificio y la turbulencia del terreno, y el Gf de (1.9-10) para edificio flexible,
// que es OBLIGATORIO cuando n₁ < 1 Hz y que ahí puede superar al 0,85 en más del 25 %.
//
// Se muestran los tres con todos sus intermedios, y se dice cuál rige. Elegir es del
// proyectista; no enterarse de que existen, no.
import { FRECUENCIA_APROX, naDe } from '../../engine/factorRafaga.js';

const f = (n, d = 3) => (Number.isFinite(n) ? n.toFixed(d).replace(".", ",") : "—");

export function BloqueRafaga({ rafaga, S, geo, sitio, n1, setN1, beta, setBeta,
  modoG, setModoG, tipoFrec, setTipoFrec }) {
  const { rig, flex, flexible, opciones, motivo, calculadoSupera } = rafaga;
  const fila = (sim, desc, val, ref) => (
    <tr key={sim + desc}>
      <td style={{ ...S.td, fontFamily: "ui-monospace, monospace", whiteSpace: "nowrap" }}>{sim}</td>
      <td style={{ ...S.td, fontSize: 12, color: "var(--txt2)" }}>{desc}</td>
      <td style={S.tdN}>{val}</td>
      <td style={{ ...S.td, fontSize: 11, color: "var(--txt2)", whiteSpace: "nowrap" }}>{ref}</td>
    </tr>
  );

  return (<>
    <div style={{ padding: "10px 12px", background: "var(--avisoBg)",
      border: "1px solid var(--avisoBd)", borderRadius: 6, marginBottom: 14,
      fontSize: 13, lineHeight: 1.6 }}>
      <b>Rige {opciones.find(o => o.id === rafaga.rige)?.label ?? "—"}.</b>
      <div style={{ color: "var(--txt2)", marginTop: 4 }}>{motivo}</div>
    </div>

    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
      {opciones.map(o => (
        <label key={o.id} style={{ flex: "1 1 190px", padding: 10, borderRadius: 6,
          cursor: "pointer", border: `1px solid ${modoG === o.id ? "var(--acento)" : "var(--borde)"}`,
          background: modoG === o.id ? "var(--avisoBg)" : "var(--sup)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <input type="radio" name="modoG" checked={modoG === o.id}
              onChange={() => setModoG(o.id)} />
            <b style={{ fontSize: 18 }}>{f(o.G, 3)}</b>
          </div>
          <div style={{ fontSize: 12, marginTop: 2 }}>{o.label}</div>
          <div style={{ fontSize: 11, color: "var(--txt2)", marginTop: 4, lineHeight: 1.45 }}>
            {o.nota}
          </div>
        </label>
      ))}
    </div>

    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14,
      alignItems: "flex-end" }}>
      <label style={{ display: "grid", gap: 2 }}>
        <span style={{ fontSize: 12, color: "var(--txt2)" }}>Frecuencia natural n₁ (Hz)</span>
        <input style={{ ...S.inp, width: 120 }} type="number" step="0.01" value={n1}
          onChange={e => setN1(e.target.value)} placeholder="sin declarar" />
      </label>
      <label style={{ display: "grid", gap: 2 }}>
        <span style={{ fontSize: 12, color: "var(--txt2)" }}>Estimar n₁ con (art. 1.9.3)</span>
        <select style={{ ...S.inp, width: 250 }} value={tipoFrec}
          onChange={e => {
            setTipoFrec(e.target.value);
            const v = naDe(e.target.value, geo.h);
            if (v) setN1(v.toFixed(2));
          }}>
          <option value="">— no estimar —</option>
          {FRECUENCIA_APROX.map(x => (
            <option key={x.id} value={x.id}>{x.label} {x.ref}</option>
          ))}
        </select>
      </label>
      <label style={{ display: "grid", gap: 2 }}>
        <span style={{ fontSize: 12, color: "var(--txt2)" }}>Amortiguamiento β</span>
        <input style={{ ...S.inp, width: 100 }} type="number" step="0.005" value={beta}
          onChange={e => setBeta(e.target.value)} />
      </label>
    </div>
    <div style={{ fontSize: 11, color: "var(--txt2)", marginBottom: 16, lineHeight: 1.6 }}>
      Las expresiones del art. 1.9.3 son <b>límites inferiores aproximados</b>, no la
      frecuencia real: valen para edificios de menos de 90 m y de menos de cuatro veces su
      longitud efectiva. Para β, el comentario sugiere 1 % en acero y 2 % en hormigón a
      nivel de servicio, y entre 2,5 y 3 % cerca del estado último.
    </div>

    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Símbolo", "Concepto", "Valor", "Expresión"].map((h, i) =>
          <th key={i} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {fila("z̄", "Altura equivalente, 0,6·h pero no menor que z_min", `${f(rig.zb, 2)} m`, "Art. 1.9.4")}
          {fila("c", "Factor de intensidad de turbulencia", f(rig.c, 2), "Tabla 1.9-1")}
          {fila("I_z̄", "Intensidad de la turbulencia a z̄", f(rig.Iz, 4), "(1.9-7)")}
          {fila("ℓ", "Factor de escala de longitud integral", `${f(rig.l, 0)} m`, "Tabla 1.9-1")}
          {fila("ε̄", "Exponente de la escala de longitud", f(rig.epsM, 4), "Tabla 1.9-1")}
          {fila("L_z̄", "Escala de longitud integral de la turbulencia", `${f(rig.Lz, 1)} m`, "(1.9-9)")}
          {fila("Q²", "Cuadrado del factor de respuesta base", f(rig.Q2, 4), "(1.9-8)")}
          {fila("g_Q = g_v", "Factores de pico", f(rig.gQ, 1), "Art. 1.9.4")}
          {fila("G", "Factor de ráfaga calculado, edificio rígido", f(rig.G, 4), "(1.9-6)")}
          {flex?.Gf != null && <>
            {fila("ᾱ", "Exponente del perfil de velocidad media", f(flex.alfaM, 4), "Tabla 1.9-1")}
            {fila("b̄", "Factor del perfil de velocidad media", f(flex.bM, 2), "Tabla 1.9-1")}
            {fila("V̄_z̄", "Velocidad media horaria a z̄", `${f(flex.Vz, 2)} m/s`, "(1.9-16)")}
            {fila("N₁", "Frecuencia reducida", f(flex.N1, 4), "(1.9-14)")}
            {fila("R_n", "Factor de respuesta para n", f(flex.Rn, 4), "(1.9-13)")}
            {fila("R_h · R_B · R_L", "Factores de respuesta por altura, ancho y largo",
              `${f(flex.Rh, 3)} · ${f(flex.RB, 3)} · ${f(flex.RL, 3)}`, "(1.9-15a)")}
            {fila("R²", "Cuadrado de la respuesta resonante", f(flex.R2, 4), "(1.9-12)")}
            {fila("g_R", "Factor de pico de la respuesta resonante", f(flex.gR, 4), "(1.9-11)")}
            {fila("G_f", "Factor de ráfaga de edificio flexible", f(flex.Gf, 4), "(1.9-10)")}
          </>}
        </tbody>
      </table>
    </div>

    <div style={{ fontSize: 12, color: "var(--txt2)", marginTop: 12, lineHeight: 1.7 }}>
      <b style={{ color: "var(--txt)" }}>Art. 1.9.7.</b> Donde el reglamento da los
      productos (GC_p), (GC_pi) o (GC_pf) en tablas y figuras, el factor de ráfaga{" "}
      <b>no se puede separar</b> ni reemplazar por éste: ya está incluido.
      {calculadoSupera && <>
        {" "}<b style={{ color: "var(--txt)" }}>⚠ Acá el calculado SUPERA al 0,85.</b> No es
        un error: en terreno liso la turbulencia es baja, el cociente de (1.9-6) tiende a 1
        y G tiende a 0,925. La consecuencia es que en exposición C y D adoptar 0,85 no es
        más conservador sino menos —el art. 1.9.4 lo permite igual—.
      </>}
    </div>
  </>);
}
