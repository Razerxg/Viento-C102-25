// PANEL DE TRAZABILIDAD — el árbol consolidado, paso por paso.
//
// ⚠ NO ARMA SU PROPIO RECORRIDO. Lee `lib/consolidar.js`, que es el mismo árbol que van a
// renderizar la memoria en Markdown y el Word. Si el panel construyera su lista aparte, la
// primera vez que se agregue un paso a uno de los tres, los otros dos quedan atrás sin que
// nada falle: dos salidas de la misma corrida diciendo cosas distintas.
//
// Cada paso muestra lo que hace falta para rehacer la cuenta con el reglamento al lado:
// título, artículo, fórmula en línea propia, el bloque «donde:» con TODOS los símbolos, el
// valor con su unidad y los puntos de tabla si hubo interpolación. Un «donde:» con seis
// símbolos y tres explicados es una fórmula que hay que ir a buscar a otro lado, que es
// justamente lo que la traza existe para evitar.
import { valorDe, puntosDe } from '../lib/traza.js';
import { Card, Nota, Acordeon, Tabla, Th, Td, Badge } from './ui.jsx';
import { c, SP, t, MONO, R, TONO } from './tokens.js';

/**
 * Un valor del bloque «donde:».
 *
 * ⚠ SE PODAN LOS CEROS DE LA DERECHA. Con tres decimales fijos, una velocidad de 55,1 m/s
 * se imprime «55,100», que sugiere una precisión de milímetro por segundo que el dato no
 * tiene. Se escriben los decimales que el número realmente usa, hasta cuatro.
 */
const numero = (v) => typeof v !== "number" ? v
  : v.toFixed(4).replace(/\.?0+$/, "").replace(".", ",") || "0";

/** La fórmula va en línea propia y en monoespaciada: es una expresión, no prosa. */
function Formula({ children }) {
  return (
    <div style={{ fontFamily: MONO, ...t.body, color: c.txt, background: c.raised,
      border: `1px solid ${c.border}`, borderRadius: R.sm, padding: `${SP.sm}px ${SP.md}px`,
      margin: `${SP.sm}px 0`, overflowX: "auto", whiteSpace: "pre" }}>{children}</div>
  );
}

/** El bloque «donde:», con un renglón por símbolo. */
function Donde({ simbolos }) {
  if (!simbolos?.length) return null;
  return (
    <div style={{ margin: `${SP.sm}px 0 ${SP.sm}px ${SP.md}px` }}>
      <div style={{ ...t.micro, color: c.txt2, marginBottom: 2 }}>donde:</div>
      {simbolos.map((x, i) => (
        <div key={i} style={{ ...t.micro, lineHeight: 1.75, display: "flex",
          gap: SP.sm, alignItems: "baseline" }}>
          <span style={{ fontFamily: MONO, color: c.txt, minWidth: 68, flexShrink: 0 }}>
            {x.sim}
          </span>
          <span style={{ color: c.txt3 }}>
            {x.desc}
            {x.valor != null && <> = <b style={{ color: c.txt2 }}>
              {numero(x.valor)}{x.unidad ? ` ${x.unidad}` : ""}</b></>}
            {x.ref && <span style={{ color: c.txt3 }}> · {x.ref}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function Paso({ p }) {
  const puntos = puntosDe(p);
  return (
    <div style={{ padding: `${SP.md}px 0`, borderBottom: `1px solid ${c.border}` }}>
      <div style={{ display: "flex", gap: SP.sm, alignItems: "baseline", flexWrap: "wrap" }}>
        <span style={{ ...t.bodyF, color: c.txt }}>{p.titulo}</span>
        {/* EL ARTÍCULO VA EN EL TÍTULO DEL PASO, no al pie: es lo primero que busca quien
            está revisando con el reglamento abierto. */}
        {p.art && <span style={{ ...t.micro, color: c.txt3 }}>{p.art}</span>}
        <span style={{ flex: 1 }} />
        <span style={{ ...t.numG, color: p.tono === "error" ? TONO.error.fg
          : p.tono === "aviso" ? TONO.aviso.fg : c.txt }}>{valorDe(p)}</span>
      </div>
      {p.formula && <Formula>{p.formula}</Formula>}
      <Donde simbolos={p.donde} />
      {puntos && <div style={{ ...t.micro, color: c.txt3, marginLeft: SP.md }}>{puntos}</div>}
      {p.nota && <div style={{ ...t.micro, color: c.txt3, lineHeight: 1.65,
        marginTop: SP.xs }}>{p.nota}</div>}
    </div>
  );
}

export function PanelTraza({ traza, trazaMotor }) {
  const conAviso = traza.flatMap(b => b.pasos).filter(p => p.tono !== "info").length;
  return (
    <>
      {traza.map(b => (
        <Card key={b.id} titulo={b.titulo} desc={b.desc}
          acciones={b.art ? <Badge tono="neutro">{b.art}</Badge> : undefined}>
          {b.pasos.map(p => <Paso key={p.id} p={p} />)}
        </Card>
      ))}

      <Card titulo="Traza del motor"
        desc="Los pasos tal como los emite el cálculo, sin reordenar. Sirve para contrastar
          el árbol de arriba contra lo que el motor realmente hizo: si los dos discrepan, es
          que la consolidación está reordenando algo que el motor ya no calcula así.">
        <Acordeon titulo={`${trazaMotor.pasos.length} pasos del cálculo de esta dirección`}>
          <Tabla minWidth={620}>
            <thead><tr>
              <Th>Paso</Th><Th>Símbolo</Th><Th alinear="right">Valor</Th><Th>De dónde sale</Th>
            </tr></thead>
            <tbody>
              {trazaMotor.pasos.map(p => (
                <tr key={p.id}>
                  <Td nowrap>{p.titulo}</Td>
                  <td style={{ padding: "7px 10px", borderBottom: `1px solid ${c.border}`,
                    fontFamily: MONO, color: c.txt2, whiteSpace: "nowrap" }}>
                    {p.donde[0]?.sim ?? ""}
                  </td>
                  <Td nowrap>{valorDe(p)}</Td>
                  <Td tono={c.txt3}>
                    <b style={{ color: c.txt2 }}>{p.art}</b>{p.nota ? ` — ${p.nota}` : ""}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        </Acordeon>
        {conAviso > 0 && (
          <Nota>
            {conAviso === 1 ? "Un paso está" : `${conAviso} pasos están`} marcados con aviso
            o error: son los que descansan en una hipótesis que hay que confirmar, o los que
            el reglamento no deja elegir. Están resaltados arriba.
          </Nota>
        )}
      </Card>
    </>
  );
}
