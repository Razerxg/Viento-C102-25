// ESTILOS DERIVADOS DE LOS TOKENS.
//
// Mantiene las claves que ya usaban los bloques existentes (`S.card`, `S.inp`, `S.th`,
// `S.td`, `S.tdN`…) porque `TablaCargas` y `BloqueRafaga` las reciben por prop. Cambiar
// los NOMBRES habría obligado a reescribir los dos archivos en el mismo commit en que se
// cambia todo lo demás, sin poder aislar qué rompió qué. Lo que cambia son los VALORES,
// ahora derivados de `tokens.js`: el rediseño se propaga solo.
import { c, t, SP, R, SOMBRA, TRANS, MONO, SANS, TAM, FUENTE } from './tokens.js';

const s = {
  // ── tarjetas ──
  card: { background: c.raised, border: `1px solid ${c.border}`, borderRadius: R.lg,
    padding: SP.lg - 4, marginBottom: SP.md, minWidth: 0, maxWidth: "100%",
    boxShadow: SOMBRA.card },
  // El título de tarjeta ya NO lleva línea divisoria: con una tarjeta de borde propio,
  // la línea era un segundo borde a 10 px del primero y hacía ruido.
  cardT: { ...t.h2, marginBottom: SP.md, display: "flex", alignItems: "center", gap: SP.sm },
  subT: { ...t.eyebrow, margin: `${SP.md}px 0 ${SP.sm}px` },

  // ── filas de formulario ──
  row: { display: "flex", alignItems: "center", marginBottom: SP.sm + 2, gap: SP.sm },
  lbl: { ...t.body, color: c.txt2, flex: "1 1 170px", maxWidth: 260, textAlign: "left" },
  inp: { background: c.surface, border: `1px solid ${c.borderFuerte}`, color: c.txt,
    borderRadius: R.sm + 2, padding: "6px 10px", fontSize: TAM.base, width: 104,
    fontFamily: MONO, fontVariantNumeric: "tabular-nums",
    transition: `border-color ${TRANS}, box-shadow ${TRANS}` },
  sel: { background: c.surface, border: `1px solid ${c.borderFuerte}`, color: c.txt,
    borderRadius: R.sm + 2, padding: "6px 8px", fontSize: TAM.base, fontFamily: SANS,
    transition: `border-color ${TRANS}` },
  unit: { ...t.micro, minWidth: 44, whiteSpace: "nowrap", flexShrink: 0 },
  out: { ...t.num, color: c.azulL },

  // ── tablas ──
  table: { width: "100%", borderCollapse: "collapse", fontSize: TAM.base },
  // El encabezado NO va en versalitas espaciadas. Con un solo cuerpo de 13 px, las
  // mayúsculas más el letter-spacing ensanchaban cada columna lo suficiente como para
  // empujar la última fuera de la tarjeta —que es lo que le pasaba a la tabla de cargas,
  // con siete columnas—. Se distingue por peso y color: lo mismo, sin costar ancho.
  th: { padding: "8px 10px", textAlign: "left", fontSize: TAM.base, fontWeight: 600,
    color: c.txt3, borderBottom: `1px solid ${c.border}`, background: c.surface,
    whiteSpace: "nowrap" },
  td: { padding: "7px 10px", borderBottom: `1px solid ${c.border}`, textAlign: "left",
    fontSize: TAM.base, color: c.txt },
  tdN: { padding: "7px 10px", borderBottom: `1px solid ${c.border}`, textAlign: "right",
    fontFamily: MONO, fontVariantNumeric: "tabular-nums", fontSize: TAM.base, color: c.txt },
  tdL: { padding: "7px 10px", borderBottom: `1px solid ${c.border}`, textAlign: "left",
    fontSize: TAM.base, color: c.txt },

  // ── botones ──
  // Jerarquía explícita: `btn` es EL primario (uno por pantalla), `btnG` el secundario.
  btn: { background: c.azul, color: "#fff", border: "1px solid transparent", borderRadius: R.sm + 2,
    padding: "7px 14px", cursor: "pointer", fontSize: TAM.base, fontWeight: 550, fontFamily: SANS,
    transition: `background ${TRANS}, box-shadow ${TRANS}` },
  btnG: { background: c.overlay, color: c.txt, border: `1px solid ${c.border}`, borderRadius: R.sm + 2,
    padding: "6px 12px", cursor: "pointer", fontSize: TAM.base, fontWeight: 500, fontFamily: SANS,
    transition: `background ${TRANS}, border-color ${TRANS}` },
  btnR: { background: "transparent", color: c.rojo, border: "none", cursor: "pointer",
    fontSize: TAM.base, padding: "4px 8px", borderRadius: R.sm, transition: `background ${TRANS}` },

  note: { ...t.body, color: c.txt3, marginTop: SP.sm + 2, lineHeight: 1.7 },
  badge: { display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px",
    borderRadius: R.full, fontSize: TAM.base, fontWeight: 600, fontFamily: SANS,
    letterSpacing: "0.02em", whiteSpace: "nowrap" },
};

export { MONO, s, c, t, SP, R, SOMBRA, TRANS, SANS, TAM, FUENTE };
