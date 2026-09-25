// CROQUIS 4 — VISTA 3D DEL EDIFICIO, COLOREADA POR PRESIÓN.
//
// La cámara, el arrastre, el zoom y las vistas ortogonales están portados de la app de
// bases (`lib/camara3d.js` y `lib/orbita.js`): las dos aplicaciones se usan una al lado de
// la otra, y una escena que se gira distinto o que no trae las mismas vistas hace que se
// sientan como dos programas ajenos.
//
// Lo que aporta esta app es la MALLA: el edificio con su cubierta real —plana, un agua o
// caballete, con los tímpanos como pentágonos— en vez de un prisma de tapa plana.
//
// Cuatro cosas que la versión anterior no tenía y que vienen del enfoque de bases:
//  · ENCUADRE AUTOMÁTICO: la vista se reajusta al girar, así la pieza no se sale del cuadro.
//  · VISTAS ORTOGONALES EN ÁNGULO EXACTO. Un frente con pitch 8° sigue mostrando un pedazo
//    de la tapa, que es justo lo que una elevación no debe mostrar.
//  · ZOOM con la rueda.
//  · CAPTURA DE PUNTERO con `touchAction: none` y `userSelect: none`: sin eso el dedo hace
//    scroll de la página en vez de girar, y arrastrar con el mouse selecciona los rótulos.
import { useMemo } from 'react';
import { Lienzo, Rotulo, LeyendaPresion } from './kit.jsx';
import { colorPresion, tramosLeyenda } from '../../lib/escalaPresion.js';
import { mallaEdificio, carasVisibles } from '../../lib/volumen3d.js';
import { camara, encuadre } from '../../lib/camara3d.js';
import { useOrbita, VISTAS } from '../../lib/orbita.js';

// Sombreado por orientación: da volumen sin falsear el color de la presión, porque va como
// una capa gris encima y no alterando el tono.
const sombra = (n, luz = [0.35, -0.45, 0.82]) =>
  Math.max(0, 1 - (n[0] * luz[0] + n[1] * luz[1] + n[2] * luz[2])) * 0.15;

export function Vista3D({ analisis, maxAbs, fmt, tema = "claro", ancho = 620, alto = 440 }) {
  const { geo, dir, superficies, modo, caraUnica } = analisis;
  const orb = useOrbita("iso");
  const ink = tema === "oscuro" ? "#c3c2b7" : "#52514e";
  const txt = tema === "oscuro" ? "#ffffff" : "#0b0b0b";

  const de = (id) => superficies.find(s => s.id === id);
  const pBar = de("pared_barlovento")?.tramos?.at(-1)?.gobernante ?? 0;
  const pSot = de("pared_sotavento")?.gobernante ?? 0;
  const pLat = de("pared_lateral")?.gobernante ?? 0;
  const cubs = superficies.filter(s => s.tipo === "cubierta" && s.caso !== "positivo");

  const ejeX = dir.eje === "X", pos = dir.signo > 0;
  const barId = ejeX ? (pos ? "x0" : "xa") : (pos ? "y0" : "yb");
  const sotId = ejeX ? (pos ? "xa" : "x0") : (pos ? "yb" : "y0");

  const infoPared = (id) => id === barId ? { p: pBar, rot: "Barlovento" }
    : id === sotId ? { p: pSot, rot: "Sotavento" } : { p: pLat, rot: "Lateral" };

  // El piso no recibe presión de viento: va neutro y sin rótulo de valor, para no sugerir
  // un cero calculado donde no hay cálculo.
  const info = (c) => c.tipo === "piso" ? { p: 0, rot: "Cara inferior", sinValor: true }
    : c.tipo === "cubierta" ? infoCub(c.id) : infoPared(c.id);

  // ⚠ LA MALLA Y EL ANÁLISIS NO COINCIDEN NECESARIAMENTE EN LA CUBIERTA. La malla de un
  // caballete tiene SIEMPRE dos planos de techo, pero el análisis puede tratarlos como dos
  // faldones, como una superficie única (nota 4) o como FRANJAS —que es lo que pasa con el
  // viento paralelo a la cumbrera—. Se mira el MODO, no la cantidad de caras.
  const infoCub = (id) => {
    if (modo === "franjas") {
      const s = cubs.reduce((m, c) => Math.abs(c.gobernante) > Math.abs(m.gobernante) ? c : m, cubs[0]);
      return { p: s?.gobernante ?? 0, rot: "Cubierta · franjas" };
    }
    if (modo === "unica" || cubs.length <= 1) {
      return { p: cubs[0]?.gobernante ?? 0, rot: caraUnica ? `Cubierta · ${caraUnica}` : "Cubierta" };
    }
    const esBar = id.replace("cub_", "") === barId;
    const s = cubs.find(c => c.id.includes(esBar ? "barlovento" : "sotavento")) ?? cubs[0];
    return { p: s.gobernante, rot: esBar ? "Cubierta barlovento" : "Cubierta sotavento" };
  };

  // ── UN PRESET PROPIO DE ESTA APP: MIRAR A BARLOVENTO ────────────────────────
  //
  // Las cinco vistas de `orbita.js` son las mismas que en bases y no se tocan. Pero acá hay
  // una cara que importa más que las otras —la que el viento golpea—, y en la isométrica
  // estándar de 45° puede quedar atrás. No se cambia la vista por defecto: se agrega un
  // botón, porque reorientar sola la cámara según el caso sería peor que empezar de canto.
  //
  // El yaw sale de alinear el vector que apunta al observador con la normal de barlovento,
  // más un cuarto de vuelta para que se vea también una lateral y lea como volumen.
  const GR = Math.PI / 180;
  const yawBarlovento = { x0: -45, xa: 135, y0: 225, yb: 45 }[barId] * GR;
  const verBarlovento = () => { orb.setVista({ yaw: yawBarlovento, pitch: 30 * GR }); orb.setZoom(1); };
  const enBarlovento = Math.abs(orb.vista.yaw - yawBarlovento) < 1e-6
    && Math.abs(orb.vista.pitch - 30 * GR) < 1e-6;

  const cam = camara(orb.vista.yaw, orb.vista.pitch);

  const { caras, enc } = useMemo(() => {
    const m = mallaEdificio({ a: geo.a, b: geo.b, hAlero: geo.hAlero, hCumbre: geo.hCumbre,
      tipo: geo.tipo, cumbrera: geo.cumbrera, pendienteHacia: geo.pendienteHacia });
    const vis = carasVisibles(m, cam).map(c => ({ ...c, proy: c.pts.map(p => cam.proy(...p)) }));
    // El encuadre usa TODOS los vértices y no sólo los visibles: si se encuadrara con los
    // visibles, la pieza saltaría de tamaño cada vez que una cara entra o sale de vista.
    return { caras: vis, enc: encuadre(m.V.map(p => cam.proy(...p)), ancho, alto - 70, 44) };
  }, [geo, cam.yaw, cam.pitch, ancho, alto]);

  const S = enc.esc * orb.zoom;
  // posición en pantalla de un punto ya proyectado, con encuadre y zoom aplicados
  const px = ([u, v]) => [ancho / 2 + (u * enc.esc + enc.dx - ancho / 2) * orb.zoom,
    (alto - 70) / 2 + 18 + (v * enc.esc + enc.dy - (alto - 70) / 2) * orb.zoom];
  const poly = (pts) => pts.map(p => px(p).join(",")).join(" ");

  const boton = (activo) => ({
    fontSize: 11, padding: "3px 8px", borderRadius: 4, cursor: "pointer",
    border: `1px solid ${activo ? "var(--acento)" : "var(--borde)"}`,
    background: activo ? "var(--acento)" : "var(--fondo)",
    color: activo ? "#fff" : "var(--txt)",
  });
  const esVista = (k) => Math.abs(orb.vista.yaw - VISTAS[k].yaw) < 1e-6
    && Math.abs(orb.vista.pitch - VISTAS[k].pitch) < 1e-6;

  return (
    <div>
      <div {...orb.props} style={orb.estilo}>
        <Lienzo ancho={ancho} alto={alto} titulo={`Vista 3D — ${dir.label}`}>
          <Rotulo x={ancho / 2} y={14} texto={`${dir.label} — presión gobernante por cara`}
            color={txt} tam={11} peso={600} />
          {caras.map((c, i) => (
            <g key={`${c.id}-${i}`}>
              <polygon points={poly(c.proy)}
                fill={colorPresion(info(c).p, maxAbs, tema)}
                stroke={ink} strokeWidth="1.2" strokeLinejoin="round" />
              <polygon points={poly(c.proy)} fill="#000" opacity={sombra(c.n)} />
            </g>
          ))}
          {caras.map((c, i) => {
            const inf = info(c);
            const pts = c.proy.map(px);
            const u = pts.reduce((s, p) => s + p[0], 0) / pts.length;
            const v = pts.reduce((s, p) => s + p[1], 0) / pts.length;
            const w = Math.max(...pts.map(p => p[0])) - Math.min(...pts.map(p => p[0]));
            const h = Math.max(...pts.map(p => p[1])) - Math.min(...pts.map(p => p[1]));
            // no se rotula una cara casi de canto: el texto flotaría sobre otra y diría algo falso
            if (Math.min(w, h) < 24) return null;
            return (
              <g key={`t${c.id}-${i}`}>
                <Rotulo x={u} y={inf.sinValor ? v : v - 8} texto={inf.rot} color={txt} tam={10} />
                {!inf.sinValor && (
                  <Rotulo x={u} y={v + 8} texto={fmt.q(inf.p)} color={txt} tam={10} peso={600} />
                )}
              </g>
            );
          })}
          <LeyendaPresion x={ancho / 2 - 110} y={alto - 32} ancho={220}
            tramos={tramosLeyenda(maxAbs, tema)} fmt={fmt.q} color={ink} />
        </Lienzo>
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
        <button style={boton(enBarlovento)} onClick={verBarlovento}>Barlovento</button>
        {Object.entries(VISTAS).map(([k, v]) => (
          <button key={k} style={boton(esVista(k) && !enBarlovento)} onClick={() => orb.irA(k)}>
            {v.lab}
          </button>
        ))}
        <span style={{ fontSize: 11, color: "var(--txt2)", marginLeft: 4 }}>
          arrastrá para girar · rueda para acercar
          {orb.zoom !== 1 && ` · ${orb.zoom.toFixed(2)}×`}
        </span>
      </div>
    </div>
  );
}
