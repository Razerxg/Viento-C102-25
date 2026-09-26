// RESUMEN — las cuatro direcciones en una sola tabla.
//
// Es la pantalla que se imprime o se copia a la memoria. Va sin ficha de estado al costado
// porque la ficha duplicaría columnas que la propia tabla ya lista.
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { Encabezado, Card, Tabla, Th, Td, TdN, Nota, Aviso, Stat, Stats, Badge } from '../ui.jsx';
import { c, SP } from '../tokens.js';
import { U } from '../../lib/unidades.js';
import { f, fmt } from '../../lib/formato.js';
import { rotuloConteo } from '../../lib/avisos.js';

const MODO = { faldones: "faldones", unica: "única", franjas: "franjas" };

/** Cómo se lee un estado de carga en una celda: caso, dirección y qué lo define. */
const rotulo = (e) => e == null ? "—" :
  `Caso ${e.caso} · ${e.dirs.join("+")} · GC_pi ${e.casoInterno === "conInternaPos" ? "+" : "−"}`
  + ` · nota 3 ${e.casoNota3}${e.eSigno ? ` · e ${e.eSigno > 0 ? "+" : "−"}` : ""}`;

export function ResumenTab() {
  const { todas, act, iDir, d, V, sitio, geoN, G, rafaga, conteo, resDe, cerramiento,
    envCasos, gDe, direcciones } = useProyecto();
  const resumen = rotuloConteo(conteo);

  const filas = [
    ["Presión dinámica en la cubierta q_h (N/m²)", t => f(t.qh, 0)],
    ["Relación en planta L/B", t => f(t.L / t.B, 2)],
    ["Relación de esbeltez h/L", t => f(t.hL, 2)],
    // ⚠ G ES POR DIRECCIÓN. B es la dimensión normal al viento y L la paralela, así que
    // se intercambian al girar 90°: con el calculado o el de flexible adoptados, las
    // cuatro columnas no coinciden. Sin esta fila, la ficha de arriba mostraría UN factor
    // de ráfaga y la tabla presiones que no salen de él.
    ["Factor de efecto de ráfaga G", t => f(gDe(t.dir), 3)],
    ["Tratamiento de la cubierta",
      t => t.modo === "unica" ? `única · ${t.caraUnica}` : MODO[t.modo]],
    ["C_p pared a sotavento",
      t => f(t.superficies.find(s => s.id === "pared_sotavento").cp, 2)],
    ["p en la pared a barlovento en z = h (N/m²)",
      t => f(t.superficies.find(s => s.id === "pared_barlovento").tramos.at(-1).gobernante, 0)],
    ["p en la pared a sotavento (N/m²)",
      t => f(t.superficies.find(s => s.id === "pared_sotavento").gobernante, 0)],
    [`Corte total en la base (${U.u.fuerza})`, t => U.n.fuerza(Math.abs(resDe(t).cortante), 1)],
    [`Levantamiento total (${U.u.fuerza})`, t => U.n.fuerza(Math.abs(resDe(t).levantamiento), 1)],
    [`Vuelco (${U.u.momento})`, t => U.n.momento(Math.abs(resDe(t).vuelco), 1)],
  ];

  return (
    <>
      <Encabezado titulo="Resumen del caso"
        desc="Las cuatro direcciones del art. 2.4.1 en una tabla. La columna resaltada es la
          que está seleccionada en el resto de la aplicación."
        acciones={<Badge tono={resumen.tono} punto>{resumen.txt}</Badge>} />

      <Card titulo="Datos de partida">
        <Stats min={150}>
          <Stat label="Localidad" valor={d.ciudad} sub={`categoría de riesgo ${d.riesgo}`} />
          <Stat label="Velocidad básica" valor={f(V, 1)} unidad="m/s"
            sub="ráfaga de 3 s a 10 m" />
          <Stat label="Exposición" valor={sitio.exposicion}
            sub={`K_zt(h) = ${f(sitio.Kzt, 3)} · K_d = ${f(sitio.kd, 2)}`} />
          <Stat label="Planta" valor={`${f(geoN.a, 1)} × ${f(geoN.b, 1)}`} unidad="m"
            sub={`alero ${f(geoN.hAlero, 2)} m · h = ${f(geoN.h, 2)} m`} />
          <Stat label="Cubierta"
            valor={geoN.theta > 0 ? `${f(geoN.theta, 1)}°` : "plana"}
            sub={geoN.theta > 0 ? `cumbrera según ${geoN.cumbrera}` : "θ = 0"} />
          {/* El G de la dirección ACTIVA: con el calculado adoptado las cuatro no
              coinciden, y el rango dice cuánto se mueve sin salir a buscarlo. */}
          <Stat label="Factor de ráfaga" valor={f(G, 3)}
            tono={rafaga.flexible && d.modoG !== "flexible" ? "error" : undefined}
            sub={(() => {
              const gs = direcciones.map(dir => gDe(dir));
              const lo = Math.min(...gs), hi = Math.max(...gs);
              const modo = rafaga.opciones.find(o => o.id === d.modoG)?.label;
              return hi - lo < 5e-4 ? modo
                : `${modo} · ${act.dir.id}; las cuatro van de ${f(lo, 3)} a ${f(hi, 3)}`;
            })()} />
          <Stat label="Presión interna" valor={`±${f(Math.abs(act.GCpi), 2)}`}
            sub={cerramiento.replace("_", " ")} />
          <Stat label="Altitud" valor={f(sitio.altitud, 0)} unidad="m"
            sub={`K_e = ${f(Math.exp(-0.000119 * sitio.altitud), 4)}`} />
        </Stats>
      </Card>

      <Card titulo="Resultados por dirección">
        <Tabla minWidth={620}>
          <thead><tr>
            <Th>Magnitud</Th>
            {todas.map(t => <Th key={t.dir.id} alinear="right">{t.dir.id}</Th>)}
          </tr></thead>
          <tbody>
            {filas.map(([nom, fn]) => (
              <tr key={nom}>
                <Td>{nom}</Td>
                {todas.map((t, i) => (
                  <TdN key={t.dir.id} peso={i === iDir ? 700 : 400}
                    fondo={i === iDir ? c.azulBg : undefined}>{fn(t)}</TdN>
                ))}
              </tr>
            ))}
          </tbody>
        </Tabla>
        <Nota>
          Los dos sentidos de un mismo eje sólo coinciden si el edificio es simétrico en ese
          eje: con cubierta a un agua o con la cumbrera descentrada, no, y por eso son cuatro
          direcciones y no dos. Las presiones informadas son las gobernantes de cada
          superficie; el detalle con los dos casos de presión interna está en Presiones.
        </Nota>
      </Card>

      {/* ── CASOS CRÍTICOS ────────────────────────────────────────────────────────
          La tabla de arriba es por dirección, que es cómo se calcula. Esto es por
          MAGNITUD, que es cómo se diseña: de todo lo que el reglamento exige considerar,
          cuál es el número que hay que llevar al modelo y de qué combinación sale. */}
      <Card titulo="Casos críticos — envolvente de la Figura 2.4-8"
        desc="Lo que hay que transcribir al modelo estructural. Cada fila sale de UN estado
          de carga completo, identificado en la última columna."
        acciones={<Badge tono={envCasos.exen.exento ? "aviso" : "ok"}>
          {envCasos.estados.length} estados barridos</Badge>}>
        <Tabla minWidth={640}>
          <thead><tr>
            <Th>Magnitud</Th><Th alinear="right">Valor</Th><Th>Unidad</Th>
            <Th>Combinación que gobierna</Th>
          </tr></thead>
          <tbody>
            {[["Corte total", envCasos.cortante, U.n.fuerza, U.u.fuerza],
              ["Levantamiento", envCasos.levantamiento, U.n.fuerza, U.u.fuerza],
              ["Vuelco", envCasos.vuelco, U.n.momento, U.u.momento],
              ["Momento torsor M_T", envCasos.torsion, U.n.momento, U.u.momento],
            ].map(([nom, g, fn, un]) => (
              <tr key={nom}>
                <Td>{nom}</Td>
                <TdN peso={600}>{fn(Math.abs(g.valor), 1)}</TdN>
                <Td tono={c.txt3}>{un}</Td>
                <Td tono={c.txt3}>{rotulo(g.estado)}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
        {/* El caso torsional es el que se olvida: no aparece en ninguna tabla por
            dirección, porque no ES una dirección. Por eso va en esta lista y no aparte. */}
        {!envCasos.conTorsion && (
          <Aviso tono="aviso" titulo="Los casos torsionales no se verificaron">
            Se declaró la exención del art. 2.4.7, así que sólo se barrieron los casos 1 y
            3. El M_T informado es el de los casos corridos —cero— y no significa que el
            edificio no torsione: significa que no se verificó.
          </Aviso>
        )}
        {envCasos.comoBloque && (
          <Aviso tono="aviso" titulo="M_T va como bloque de presión distribuida">
            Con diafragma flexible o sin diafragma, la nota 4 no admite aplicar M_T como
            momento concentrado. El valor de la tabla es correcto como magnitud; la
            distribución sobre las paredes la arma el modelo estructural.
          </Aviso>
        )}
        {envCasos.flexible && (
          <Aviso tono="error" titulo="Excentricidad aproximada en estructura flexible">
            La expresión (2.4-5) no está transcripta y se adoptó e = ±0,15·B, que es el
            valor de estructuras rígidas. El M_T de esta tabla PUEDE QUEDAR DEL LADO
            INSEGURO.
          </Aviso>
        )}
        <Nota>
          En los casos 3 y 4 la cubierta no va al 75 %: la nota 2 de la figura la deja al
          100 % de la mayor presión sobre CADA ÁREA, considerando las dos direcciones
          principales. Por eso el levantamiento de la envolvente puede superar al de
          cualquier dirección sola.
        </Nota>
      </Card>

    </>
  );
}
