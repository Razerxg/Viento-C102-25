// BARRA LATERAL DE NAVEGACIÓN.
//
// Es lo que reemplaza a la columna infinita. El motivo no es estético: con los nueve
// bloques apilados, mirar un croquis y la tabla de cargas del mismo caso obligaba a
// scrollear tres pantallas entre uno y otro, y no había forma de volver a un bloque
// concreto salvo reconocerlo de pasada.
//
// Vertical y no una fila de pestañas: en vertical entran todas con su nombre completo, los
// grupos se leen como grupos, y queda lugar para decir en qué estado está cada pantalla —
// que es lo que hace el punto de color.
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { NAV, TABS } from '../../constants/tabs.js';
import { c, t, SP, R, TRANS, ANCHO_SIDEBAR, TAM, TONO } from '../tokens.js';

// Punto de estado de cada pantalla. Sale del aviso MÁS GRAVE de esa pantalla, así que un
// error no queda tapado por dos informativos que vinieran después.
function Punto({ tono }) {
  if (!tono) {
    return <span aria-hidden style={{ width: 6, height: 6, flexShrink: 0 }} />;
  }
  const col = TONO[tono]?.fg ?? c.txt3;
  return (
    <span aria-hidden style={{
      width: 6, height: 6, borderRadius: R.full, flexShrink: 0,
      // Relleno para lo que exige acción, hueco para lo informativo: a 6 px el color solo
      // no alcanza para distinguir tres niveles, y en oscuro menos.
      background: tono === "info" ? "transparent" : col, border: `1.5px solid ${col}`,
    }} />
  );
}

export function Sidebar() {
  const { tab, irA, avisosPorTab, avisos } = useProyecto();
  const { angosto, nav, setNav, cerrarNavSiCajon } = useUi();

  // Cerrada no se dibuja. En ancho eso es «el usuario la plegó para ganar lugar»; en
  // angosto es el estado normal y la navegación vive en el hamburguesa de la barra.
  if (!nav) return null;

  // ── EN ANGOSTO ES UN CAJÓN SUPERPUESTO, NO UNA COLUMNA ──
  // Empujando el contenido, 232 px de 412 dejan 180 para trabajar: no alcanza para una
  // tabla de siete columnas ni para un croquis. Superpuesta tapa la pantalla mientras se
  // elige y desaparece al elegir, que es lo que hace cualquier app de teléfono.
  const cajon = angosto ? {
    position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 60,
    height: "100dvh", boxShadow: "0 0 40px rgba(0,0,0,.45)",
    width: `min(86vw, ${ANCHO_SIDEBAR + 40}px)`,
  } : {};

  const barra = (
    <nav className="vw-sidebar" aria-label="Secciones" style={{
      width: ANCHO_SIDEBAR, flexShrink: 0, borderRight: `1px solid ${c.border}`,
      background: c.surface, padding: `${SP.md}px ${SP.sm + 2}px`, display: "flex",
      flexDirection: "column", gap: SP.lg, position: "sticky", top: 0, height: "100vh",
      overflowY: "auto", ...cajon,
    }}>
      {angosto && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={t.eyebrow}>Secciones</span>
          <button onClick={() => setNav(false)} aria-label="Cerrar la navegación"
            style={{ width: 30, height: 30, borderRadius: R.md, cursor: "pointer",
              background: c.canvas, border: `1px solid ${c.border}`, color: c.txt2,
              fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}

      {NAV.map((gr, gi) => (
        <div key={gr.grupo ?? "g" + gi}>
          {gr.grupo && <div style={{ ...t.eyebrow, padding: `0 ${SP.sm}px`, marginBottom: SP.sm }}>{gr.grupo}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {gr.items.map(nombre => {
              const i = TABS.indexOf(nombre);
              const activo = tab === i;
              const tono = avisosPorTab[nombre];
              // El detalle va como `title` nativo y no como tooltip propio: la barra tiene
              // `overflow-y:auto` y un popover absoluto quedaría recortado contra su borde.
              const n = avisos.filter(a => a.tab === nombre).length;
              return (
                <button key={nombre} className={activo ? undefined : "vw-nav"}
                  onClick={() => { irA(nombre); cerrarNavSiCajon(); }}
                  aria-current={activo ? "page" : undefined}
                  title={n ? `${n} ${n === 1 ? "aviso" : "avisos"} en esta pantalla` : undefined}
                  style={{
                    display: "flex", alignItems: "center", gap: SP.sm + 2, width: "100%",
                    padding: `7px ${SP.sm}px`, borderRadius: R.md, cursor: "pointer",
                    border: "1px solid transparent", textAlign: "left",
                    // El activo se marca por FONDO, no por color de texto: en azul se
                    // confunde con un enlace.
                    background: activo ? c.hover : "transparent",
                    borderColor: activo ? c.border : "transparent",
                    color: activo ? c.txt : c.txt2,
                    fontSize: TAM.base, fontWeight: activo ? 600 : 450,
                    transition: `background ${TRANS}, color ${TRANS}`,
                  }}>
                  <Punto tono={tono} />
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {nombre}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ ...t.micro, padding: `0 ${SP.sm}px`, lineHeight: 1.6, marginTop: "auto" }}>
        Los puntos marcan las pantallas con avisos. La lista completa está en la Guía.
      </div>
    </nav>
  );

  if (!angosto) return barra;
  // El velo cumple dos funciones: cerrar tocando al costado —el gesto que todos esperan—
  // y dejar claro que el cajón está encima y no al lado.
  return (
    <>
      <div onClick={() => setNav(false)} aria-hidden style={{
        position: "fixed", inset: 0, zIndex: 55, background: "rgba(0,0,0,.45)",
      }} />
      {barra}
    </>
  );
}
