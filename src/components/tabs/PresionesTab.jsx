// PRESIONES — el número y de dónde salió, en la misma pantalla.
//
// La traza va ARRIBA de la tabla y no al revés. Un resultado de viento no se puede revisar
// sin saber qué fila de qué tabla se usó: puesto debajo, se lee después de haber aceptado
// el número; puesto arriba, se lee antes.
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { TablaCargas } from './TablaCargas.jsx';
import { Encabezado, Card, Campo, Num, Aviso, Nota, Tabla, Th, Td, TdN, Acordeon,
  Badge } from '../ui.jsx';
import { c, t, MONO } from '../tokens.js';
import { f } from '../../lib/formato.js';
import { ESTADOS } from '../../engine/aplicabilidad.js';

/**
 * Rótulo de la tarjeta.
 *
 * ⚠ «EN EL EXTREMO» TIENE QUE APARECER. Antes el rótulo miraba sólo el tono, y como los
 * extremos son «info» a propósito, una nave con L/B = 5 y h/L = 0,06 —las dos filas
 * leídas en el extremo— se anunciaba como «todo dentro de tabla». Es exactamente lo que
 * esta tarjeta existe para no hacer.
 */
const rotulo = (ap) => {
  const n = ap.extendidas.length, m = ap.extremos.length;
  const plural = (k, sing, pl) => `${k} ${k === 1 ? sing : pl}`;
  if (n > 0) return { tono: "aviso", txt: plural(n, "lectura extendida", "lecturas extendidas") };
  if (m > 0) return { tono: "neutro", txt: plural(m, "lectura en el extremo", "lecturas en el extremo") };
  return { tono: "ok", txt: "todo dentro de tabla" };
};

const MODO_TXT = {
  faldones: "dos faldones — barlovento y sotavento con coeficientes distintos",
  unica: "superficie completa",
  franjas: "por franjas desde el borde de barlovento",
};

export function PresionesTab() {
  const { act, d, set, aplic, todas, iDir } = useProyecto();
  const ap = aplic.porDir[iDir] ?? aplic.porDir[0];

  return (
    <>
      <Encabezado titulo={`Presiones — ${act.dir.label}`}
        desc="p = q·G·C_p − q_i·(GC_pi), expresión (2.4-1). Las dos últimas columnas de la
          tabla son los dos signos de la presión interna, que son casos separados y no un
          más-menos del que se elige el peor." />

      <Aviso tono="info" titulo={`Tratamiento de la cubierta: ${act.modo === "unica"
        ? `superficie completa a ${act.caraUnica}` : MODO_TXT[act.modo]}.`}>
        {act.motivoModo}
      </Aviso>

      <Card titulo="Cómo se llegó a estos números"
        desc="Cada paso con su valor, su referencia al reglamento y de dónde salió.">
        <Tabla minWidth={640}>
          <thead><tr>
            <Th>Paso</Th><Th>Símbolo</Th><Th alinear="right">Valor</Th><Th>De dónde sale</Th>
          </tr></thead>
          <tbody>
            {act.traza.map((p, i) => (
              <tr key={i}>
                <Td nowrap>{p.paso}</Td>
                <td style={{ padding: "7px 10px", borderBottom: `1px solid ${c.border}`,
                  fontFamily: MONO, color: c.txt2, whiteSpace: "nowrap" }}>{p.simbolo}</td>
                {/* Los decimales los declara CADA PASO. Deducirlos de la magnitud imprimía
                    «55,100 m/s» para una velocidad y «0,850» para un factor: una sola regla
                    y ninguna de las dos bien. */}
                <TdN>{p.texto ?? (p.valor === null ? "—"
                  : `${f(p.valor, p.dec ?? 2)}${p.unidad ? " " + p.unidad : ""}`)}</TdN>
                <Td tono={c.txt3}>
                  <b style={{ color: c.txt2 }}>{p.ref}</b> — {p.detalle}
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Card>

      {/* ── APLICABILIDAD ────────────────────────────────────────────────────────
          Un Cp leído en el extremo de una tabla y uno interpolado entre dos filas dan los
          dos un número plausible, y sólo el segundo se puede controlar contra el papel
          reproduciendo la interpolación. La tarjeta dice cuál es cuál, y marca aparte las
          lecturas que la figura no escribe. */}
      <Card titulo="Dónde cayó este edificio en la Figura 2.4-1"
        desc="Cada relación con el rango que la figura tabula y dónde cayó la de este caso.
          «En el extremo» no es un error: las filas de la figura dicen ≤ y ≥, y adoptar el
          extremo es lo que manda. Lo que sí hay que mirar es una lectura extendida."
        acciones={<Badge tono={rotulo(ap).tono} punto={rotulo(ap).tono !== "ok"}>
          {rotulo(ap).txt}</Badge>}>
        <Tabla minWidth={680}>
          <thead><tr>
            <Th>Magnitud</Th><Th alinear="right">Valor</Th><Th>Rango tabulado</Th>
            <Th>Lectura</Th><Th>Qué significa</Th>
          </tr></thead>
          <tbody>
            {ap.items.map(x => (
              <tr key={x.id}>
                <Td nowrap>{x.magnitud}</Td>
                <TdN peso={600}>{x.texto}</TdN>
                <Td tono={c.txt3} nowrap>{x.rango}</Td>
                <Td nowrap tono={x.estado === "dentro" ? c.txt3 : c.txt}
                  peso={x.estado === "dentro" ? 400 : 600}>{x.etiqueta}</Td>
                <Td tono={c.txt3}>{x.detalle}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
        {ap.extendidas.map(x => (
          <Aviso key={x.id} tono="aviso" titulo={`${x.titulo} — lectura extendida`}>
            {x.detalle}
          </Aviso>
        ))}
        <Nota>
          Las cuatro direcciones no comparten estas filas: al girar el viento, L y B se
          intercambian y la cubierta puede ir en faldones en un eje y en franjas en el
          otro.{" "}
          {todas.map((td, i) => `${td.dir.id} ${ESTADOS[aplic.porDir[i].items
            .find(y => y.id === "theta").estado].label}`).join(" · ")}.
        </Nota>
      </Card>

      <Card titulo="Tabla de carga de viento"
        acciones={
          <Campo label="Puntos en altura"
            ayuda="Cuántas alturas se evalúan sobre la pared a barlovento, entre 2 y 26. A las que se pidan se les agregan siempre las alturas de la Tabla 1.13-1 y las cotas de alero, cumbrera y altura media, que son las que se transcriben al modelo.">
            <Num v={d.puntosPerfil} set={set("puntosPerfil")} w={80} min="2" max="26" step="1" />
          </Campo>
        }>
        <TablaCargas analisis={act} />
      </Card>

      <Acordeon titulo="De dónde sale cada coeficiente de presión">
        <Tabla minWidth={560}>
          <thead><tr>
            <Th>Superficie</Th><Th alinear="right">C_p</Th><Th>Referencia</Th>
          </tr></thead>
          <tbody>
            {act.superficies.map(s => (
              <tr key={s.id}>
                <Td>{s.nombre}</Td>
                <TdN>{f(s.cp, 2)}</TdN>
                <Td tono={c.txt3}>{s.cpRef}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
        <Nota>
          Las celdas de cubierta a barlovento de la Figura 2.4-1 traen DOS valores, y la
          nota 3 obliga a considerar los dos: uno es de succión y el otro de presión. Por
          eso aparecen dos filas «caso de succión» y «caso de presión» para la misma
          superficie física. No se elige una: son dos casos de carga.
        </Nota>
      </Acordeon>
    </>
  );
}
