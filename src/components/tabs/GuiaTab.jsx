// GUÍA — la pantalla que responde «¿por dónde empiezo?» y «¿qué tengo que mirar?».
//
// No es una pantalla de relleno. Concentra las dos cosas que antes no estaban en ningún
// lado: el orden de trabajo —la app no obliga a seguirlo, pero el que llega por primera
// vez no tiene forma de saber cuál es— y la LISTA COMPLETA DE AVISOS, que hasta ahora
// estaba repartida en recuadros ámbar dentro de cinco bloques distintos.
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { PASOS } from '../../constants/tabs.js';
import { rotuloConteo } from '../../lib/avisos.js';
import { c, t, SP, R, TONO } from '../tokens.js';
import { Encabezado, Card, Boton, Badge, Nota, Acordeon } from '../ui.jsx';

function Paso({ n, paso, irA }) {
  return (
    <button className="vw-clic" onClick={() => irA(paso.tab)} style={{
      display: "flex", gap: SP.md, width: "100%", textAlign: "left", alignItems: "flex-start",
      background: "transparent", border: `1px solid ${c.border}`, borderRadius: R.md,
      padding: SP.md, marginBottom: SP.sm, color: c.txt,
    }}>
      <span style={{ ...t.num, color: c.txt3, flexShrink: 0, width: 16 }}>{n}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ ...t.bodyF, display: "block" }}>{paso.t}</span>
        <span style={{ ...t.body, display: "block", marginTop: 2 }}>{paso.d}</span>
      </span>
      <span style={{ ...t.micro, color: c.azulL, flexShrink: 0, alignSelf: "center" }}>{paso.tab} →</span>
    </button>
  );
}

function Aviso({ a, irA }) {
  const T = TONO[a.tono] ?? TONO.neutro;
  return (
    <div style={{ display: "flex", gap: SP.sm + 2, padding: `${SP.sm + 2}px 0`,
      borderBottom: `1px solid ${c.border}`, alignItems: "flex-start" }}>
      <span aria-hidden style={{ width: 7, height: 7, borderRadius: R.full, marginTop: 5,
        flexShrink: 0, background: a.tono === "info" ? "transparent" : T.fg,
        border: `1.5px solid ${T.fg}` }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ ...t.bodyF }}>{a.titulo}</div>
        <div style={{ ...t.body, marginTop: 2, lineHeight: 1.65 }}>{a.detalle}</div>
      </div>
      <Boton variante="fantasma" onClick={() => irA(a.tab)} style={{ flexShrink: 0 }}>
        {a.tab} →
      </Boton>
    </div>
  );
}

export function GuiaTab() {
  const { irA, avisos, conteo } = useProyecto();
  const resumen = rotuloConteo(conteo);

  return (
    <>
      <Encabezado titulo="Acción del viento sobre las construcciones"
        desc="CIRSOC 102-2025, procedimiento direccional del Capítulo 2 Parte 1, para el
          sistema principal resistente a la fuerza del viento. Todo se recalcula en cada
          edición: no hay botón de calcular porque un botón así crea un estado intermedio
          —datos nuevos, resultados viejos— que es donde alguien lee un número que ya no
          corresponde a lo que tiene en pantalla." />

      <Card titulo="Orden de trabajo"
        desc="La app no obliga a seguirlo: todo está siempre calculado. Es el orden en que
          cada dato condiciona al siguiente.">
        {PASOS.map((p, i) => <Paso key={p.tab} n={i + 1} paso={p} irA={irA} />)}
      </Card>

      <Card titulo="Avisos del modelo"
        desc="Una presión de viento es un número plausible siempre. Si la exposición está
          mal elegida o el edificio es flexible y se usó G = 0,85, el resultado no se rompe:
          sale más chico. Esta lista es lo que queda sin confirmar."
        acciones={<>
          <Badge tono={resumen.tono} punto>{resumen.txt}</Badge>
          {conteo.info > 0 && <Badge tono="info">
            {conteo.info} {conteo.info === 1 ? "informativo" : "informativos"}</Badge>}
        </>}>
        {avisos.length === 0
          ? <Nota>Ninguna hipótesis quedó sin confirmar.</Nota>
          : avisos.map(a => <Aviso key={a.id} a={a} irA={irA} />)}
      </Card>

      <Acordeon titulo="Qué calcula y qué no">
        <div style={{ ...t.body, lineHeight: 1.75 }}>
          <b style={{ color: c.txt }}>Calcula.</b> Presiones externas por superficie y por
          zona con el procedimiento direccional (Figura 2.4-1), en las cuatro direcciones,
          con los dos casos de presión interna que exige la nota 3 de la Tabla 1.11-1. El
          perfil de q_z en altura sobre la pared a barlovento. El factor de ráfaga por las
          tres vías del art. 1.9. Las resultantes en la base —corte, levantamiento y
          vuelco— con el piso de la nota 7.
          <br /><br />
          <b style={{ color: c.txt }}>Del Capítulo 4</b> —accesorios y otras estructuras—
          calcula paredes libres llenas y carteles llenos con sus casos A, B y C; carteles
          abiertos y entramados planos; chimeneas, tanques y estructuras similares; torres
          reticuladas; equipos sobre cubierta; y silos, tanques y recipientes cilíndricos
          verticales, aislados y agrupados, con las presiones de su techo y de su fondo.
          <br /><br />
          <b style={{ color: c.txt }}>Del Anexo I</b> calcula secciones de forma uniforme con
          esbeltez ℓ/b menor que 40: formas redondeadas, prismas de aristas vivas, prismas
          rectangulares con sus dos componentes, perfiles estructurales, cables y tuberías,
          con la corrección por esbeltez de la Tabla I.6.
          <br /><br />
          <b style={{ color: c.txt }}>No calcula.</b> El factor topográfico K_zt, que queda
          fijo en 1,0. Los coeficientes de componentes y revestimientos del Capítulo 5. Las
          cubiertas abovedadas y en mansarda. El tratamiento por C_N de edificios abiertos de
          las Figuras 2.4-4 y siguientes. Los cuatro casos de carga de la Figura 2.4-8, que
          están declarados pero todavía no se aplican al resultado. Y los paneles solares de
          los artículos 4.5.3 a 4.5.5, cuyos coeficientes son once gráficos de curvas que
          habría que digitalizar de un escaneo: un coeficiente leído a ojo de un gráfico da
          una presión plausible y un cálculo equivocado.
        </div>
      </Acordeon>

      <Acordeon titulo="Convenciones">
        <div style={{ ...t.body, lineHeight: 1.75 }}>
          <b style={{ color: c.txt }}>Ejes.</b> X e Y son los dos ejes de la planta; las
          direcciones del viento se nombran X+, X−, Y+, Y−. Z es la vertical.
          <br /><br />
          <b style={{ color: c.txt }}>Signos.</b> Presión positiva actúa HACIA la superficie
          y negativa se aleja de ella (art. 1.4.1). Una succión es siempre negativa, la
          tome una pared o una cubierta.
          <br /><br />
          <b style={{ color: c.txt }}>Unidades.</b> Las presiones se informan en N/m² porque
          es la unidad en que el reglamento da las expresiones. Las resultantes van en kN y
          kN·m, que es como se transcriben a un modelo de barras.
          <br /><br />
          <b style={{ color: c.txt }}>Coma decimal</b> en pantalla, punto en el dato.
        </div>
      </Acordeon>
    </>
  );
}
