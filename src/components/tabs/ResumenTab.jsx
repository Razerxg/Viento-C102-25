// RESUMEN — las cuatro direcciones en una sola tabla.
//
// Es la pantalla que se imprime o se copia a la memoria. Va sin ficha de estado al costado
// porque la ficha duplicaría columnas que la propia tabla ya lista.
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { Encabezado, Card, Tabla, Th, Td, TdN, Nota, Stat, Stats, Badge } from '../ui.jsx';
import { c, SP } from '../tokens.js';
import { U } from '../../lib/unidades.js';
import { f, fmt } from '../../lib/formato.js';
import { rotuloConteo } from '../../lib/avisos.js';

const MODO = { faldones: "faldones", unica: "única", franjas: "franjas" };

export function ResumenTab() {
  const { todas, act, iDir, d, V, sitio, geoN, G, rafaga, conteo, resDe, cerramiento } = useProyecto();
  const resumen = rotuloConteo(conteo);

  const filas = [
    ["Presión dinámica en la cubierta q_h (N/m²)", t => f(t.qh, 0)],
    ["Relación en planta L/B", t => f(t.L / t.B, 2)],
    ["Relación de esbeltez h/L", t => f(t.hL, 2)],
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
          <Stat label="Factor de ráfaga" valor={f(G, 3)}
            tono={rafaga.flexible && d.modoG !== "flexible" ? "error" : undefined}
            sub={rafaga.opciones.find(o => o.id === d.modoG)?.label} />
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

      <Card titulo="Qué falta para que esto sea una memoria">
        <Nota>
          Los cuatro casos de carga de la Figura 2.4-8 —presión total, 75 % con torsión,
          75 % en los dos ejes y 56,3 % en los dos ejes con torsión— están declarados en el
          motor con su momento torsor, pero todavía no se aplican a estos resultados. Los
          dos casos torsionales aplican AHORA a edificios de todas las alturas: en el
          102-2005 estaban limitados a h &gt; 20 m, así que omitirlos en un galpón bajo era
          correcto con la edición anterior y ya no lo es.
        </Nota>
      </Card>
    </>
  );
}
