// SELECTOR DE DIRECCIÓN DEL VIENTO.
//
// Vive en el shell y no dentro de una pantalla porque es la pregunta «¿cuál de las cuatro
// estoy mirando?», y esa pregunta se hace en todas las pantallas de resultados a la vez.
// Antes era una fila de botones que sólo existía arriba de los croquis: al bajar a la
// tabla de cargas ya no se veía cuál estaba activa, y la tabla no lo decía.
//
// Las cuatro direcciones son las del art. 2.4.1. Los dos sentidos de un mismo eje sólo
// coinciden si el edificio es simétrico en ese eje: con cubierta a un agua o con la
// cumbrera descentrada, no, y por eso son cuatro y no dos.
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { c, t, SP, R, TRANS, TAM } from '../tokens.js';
import { f } from '../../lib/formato.js';

export function SelectorDireccion() {
  const { direcciones, iDir, setIDir, todas } = useProyecto();
  return (
    <div className="vw-noPrint" style={{
      display: "flex", alignItems: "center", gap: SP.sm, flexWrap: "wrap",
      marginBottom: SP.md,
    }}>
      <span style={{ ...t.eyebrow, marginRight: SP.xs }}>Dirección</span>
      <div style={{ display: "flex", gap: 2, padding: 2, background: c.canvas,
        border: `1px solid ${c.border}`, borderRadius: R.md }}>
        {direcciones.map((dir, i) => {
          const on = i === iDir;
          return (
            <button key={dir.id} onClick={() => setIDir(i)}
              aria-pressed={on}
              // El q_h no cambia con la dirección, pero el tratamiento de la cubierta sí:
              // ponerlo en el title es lo que permite elegir sabiendo qué se va a ver.
              title={`${dir.label} — cubierta: ${todas[i].modo}`}
              style={{
                padding: "5px 12px", borderRadius: R.sm + 2, border: "1px solid transparent",
                background: on ? c.raised : "transparent",
                color: on ? c.txt : c.txt3,
                borderColor: on ? c.borderFuerte : "transparent",
                fontSize: TAM.base, fontWeight: on ? 600 : 500, cursor: "pointer",
                transition: `background ${TRANS}, color ${TRANS}`, whiteSpace: "nowrap",
              }}>{dir.id}</button>
          );
        })}
      </div>
      <span style={{ ...t.micro }}>
        {direcciones[iDir].label} · L/B = {f(todas[iDir].L / todas[iDir].B, 2)} ·
        h/L = {f(todas[iDir].hL, 2)}
      </span>
    </div>
  );
}
