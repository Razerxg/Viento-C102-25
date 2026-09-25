// FICHA DEL CASO — visible en todas las pantallas de cálculo.
//
// Resuelve un problema concreto: para saber con qué velocidad se estaba calculando había
// que volver a Sitio, y para saber cuánto daba q_h había que bajar hasta la traza. En un
// trabajo que consiste en cambiar un dato y ver qué pasa, eso es ir y volver todo el
// tiempo.
//
// No calcula nada: lee `sitio`, `geoN`, `act` y `res` tal como salen del motor.
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { c, t, SP, R, ANCHO_PANEL, TAM } from '../tokens.js';
import { Badge, Tip } from '../ui.jsx';
import { f, fmt } from '../../lib/formato.js';
import { rotuloConteo } from '../../lib/avisos.js';

function Dato({ k, v, tip, tono }) {
  const fila = (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between",
      gap: SP.sm, padding: "5px 0" }}>
      <span style={{ ...t.micro, flexShrink: 0 }}>{k}</span>
      <span style={{ ...t.num, color: tono ?? c.txt, textAlign: "right",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
    </div>
  );
  return tip ? <Tip texto={tip} bloque>{fila}</Tip> : fila;
}

function Bloque({ titulo, children }) {
  return (
    <div>
      <div style={{ ...t.eyebrow, marginBottom: 2 }}>{titulo}</div>
      <div>{children}</div>
    </div>
  );
}

const MODO = { faldones: "dos faldones", unica: "superficie única", franjas: "franjas" };

export function FichaEstado() {
  const { sitio, geoN, act, res, rafaga, G, d, conteo, irA, V } = useProyecto();

  const estado = rotuloConteo(conteo);

  return (
    <aside className="vw-noPrint" style={{
      width: ANCHO_PANEL, flexShrink: 0, position: "sticky", top: SP.lg + 34,
      alignSelf: "start", display: "flex", flexDirection: "column", gap: SP.md,
      background: c.raised, border: `1px solid ${c.border}`, borderRadius: R.lg,
      padding: SP.md,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: SP.sm }}>
        <span style={t.eyebrow}>Estado</span>
        <button onClick={() => irA("Guía")} title="Ver los avisos en la Guía"
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          <Badge tono={estado.tono} punto>{estado.txt}</Badge>
        </button>
      </div>

      <Bloque titulo="Sitio">
        <Dato k="Localidad" v={d.ciudad} />
        <Dato k="V" v={`${f(V, 1)} m/s`}
          tip="Velocidad básica: ráfaga de 3 s a 10 m sobre el terreno, en exposición C, para la categoría de riesgo elegida." />
        <Dato k="Exposición" v={sitio.exposicion}
          tip="Categoría de rugosidad del terreno de barlovento, art. 1.7. Es lo que fija α y z_g, y con ellos todo el perfil de K_z." />
        <Dato k="Cerramiento" v={`GC_pi = ±${f(Math.abs(act.GCpi), 2)}`}
          tip="Coeficiente de presión interna de la Tabla 1.11-1. Se aplica en sus dos signos como casos separados." />
      </Bloque>

      <Bloque titulo="Edificio">
        <Dato k="Planta" v={`${f(geoN.a, 1)} × ${f(geoN.b, 1)} m`} />
        <Dato k="Alero" v={fmt.m(geoN.hAlero)} />
        <Dato k="Altura media h" v={fmt.m(geoN.h)}
          tip={geoN.theta <= 10
            ? "Con θ ≤ 10° el art. 1.2 admite tomar la altura de alero como altura media."
            : "Promedio entre el alero y la cumbrera. Es la altura a la que se evalúa q_h, que gobierna todas las superficies salvo la pared a barlovento."} />
        {geoN.theta > 0 && <Dato k="θ · cumbrera" v={`${f(geoN.theta, 1)}° · ${geoN.cumbrera}`} />}
      </Bloque>

      <Bloque titulo={`Dirección ${act.dir.id}`}>
        <Dato k="q_h" v={fmt.q(act.qh)}
          tip="Presión dinámica a la altura media de cubierta, expresión (1.13-1)." />
        <Dato k="G" v={f(G, 3)} tono={rafaga.flexible && d.modoG !== "flexible" ? c.rojo : undefined}
          tip="Factor de efecto de ráfaga adoptado. Con n₁ < 1 Hz el art. 1.9.2 exige G_f." />
        <Dato k="Cubierta" v={MODO[act.modo] ?? act.modo}
          tip={act.motivoModo} />
        <Dato k="Corte" v={fmt.kN(Math.abs(res.cortante / 1000))} />
        <Dato k="Levantamiento" v={fmt.kN(Math.abs(res.levantamiento / 1000))} />
        <Dato k="Vuelco" v={fmt.kNm(Math.abs(res.vuelco / 1000))} />
      </Bloque>
    </aside>
  );
}
