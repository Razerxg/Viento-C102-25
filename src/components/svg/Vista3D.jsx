// CROQUIS 4 — VISTA 3D DEL EDIFICIO, COLOREADA POR PRESIÓN.
//
// Reemplaza a la isométrica fija. Dos diferencias que importan:
//
//  · LA CUBIERTA ES LA REAL. La versión anterior dibujaba siempre un prisma de tapa plana,
//    así que un galpón a dos aguas de 30° se veía como una caja. Ahora la malla se arma con
//    la geometría verdadera y se pinta por profundidad, de modo que el techo se ve como es
//    desde cualquier ángulo.
//
//  · SE PUEDE GIRAR. Antes había que espejar el modelo para que barlovento no quedara
//    escondido —un truco que ya produjo un bug—. Girando, la cara cargada se busca, y el
//    dibujo deja de depender de que el punto de vista resulte el afortunado.
//
// El color nunca es el único portador: cada cara lleva su valor, hay leyenda, y la tabla
// de superficies da los números exactos.
import { useState, useMemo } from 'react';
import { Lienzo, Rotulo, LeyendaPresion } from './kit.jsx';
import { colorPresion, tramosLeyenda } from '../../lib/escalaPresion.js';
import { mallaEdificio, proyector, carasVisibles } from '../../lib/volumen3d.js';

// Sombreado suave por orientación: da volumen sin falsear el color de la presión, porque
// se aplica como opacidad de una capa gris encima y no alterando el tono.
const sombra = (n, luz = [0.4, -0.5, 0.75]) =>
  Math.max(0, 1 - (n[0] * luz[0] + n[1] * luz[1] + n[2] * luz[2])) * 0.16;

export function Vista3D({ analisis, maxAbs, fmt, tema = "claro", ancho = 620, alto = 460 }) {
  const { geo, dir, superficies } = analisis;
  const [giro, setGiro] = useState(null);      // null = orientación por defecto
  const [elev, setElev] = useState(0.45);
  const ink = tema === "oscuro" ? "#c3c2b7" : "#52514e";
  const txt = tema === "oscuro" ? "#ffffff" : "#0b0b0b";

  const de = (id) => superficies.find(s => s.id === id);
  const pBar = de("pared_barlovento")?.tramos?.at(-1)?.gobernante ?? 0;
  const pSot = de("pared_sotavento")?.gobernante ?? 0;
  const pLat = de("pared_lateral")?.gobernante ?? 0;
  const cubs = superficies.filter(s => s.tipo === "cubierta" && s.caso !== "positivo");

  // Qué presión y qué nombre le toca a cada cara de la malla, según la dirección del
  // viento. `id` de la cara es el plano en que está: y0, yb, x0, xa.
  const ejeX = dir.eje === "X", pos = dir.signo > 0;
  const barId = ejeX ? (pos ? "x0" : "xa") : (pos ? "y0" : "yb");
  const sotId = ejeX ? (pos ? "xa" : "x0") : (pos ? "yb" : "y0");
  const infoPared = (id) => id === barId ? { p: pBar, rot: "Barlovento" }
    : id === sotId ? { p: pSot, rot: "Sotavento" } : { p: pLat, rot: "Lateral" };
  // La cubierta: con dos faldones, el que mira al viento es barlovento.
  // ⚠ LA MALLA Y EL ANÁLISIS NO TIENEN POR QUÉ COINCIDIR EN LA CUBIERTA.
  //
  // La malla de un caballete tiene SIEMPRE dos planos de techo, porque es su geometría.
  // El análisis, en cambio, puede tratarlos como dos faldones, como una superficie única
  // (nota 4) o como FRANJAS —que es lo que pasa cuando el viento corre paralelo a la
  // cumbrera, y entonces las zonas no siguen los planos del techo sino la distancia al
  // borde de barlovento—.
  //
  // Una primera versión daba por sentado que dos caras de malla significaban dos faldones,
  // y con cumbrera según X y viento según X rotulaba los DOS planos como «sotavento»: dos
  // sotaventos y ningún barlovento, que es visiblemente imposible. Ahora se mira el MODO
  // del análisis, no la cantidad de caras.
  const peorFranja = () => cubs.reduce((m, c) =>
    Math.abs(c.gobernante) > Math.abs(m.gobernante) ? c : m, cubs[0]);

  const infoCub = (id) => {
    if (analisis.modo === "franjas") {
      const s = peorFranja();
      // el color muestra la franja que gobierna; el desglose por franja está en la
      // elevación, que es el croquis que puede mostrarlo sin mentir
      return { p: s?.gobernante ?? 0, rot: "Cubierta · franjas" };
    }
    if (analisis.modo === "unica" || cubs.length <= 1) {
      return { p: cubs[0]?.gobernante ?? 0,
        rot: analisis.caraUnica ? `Cubierta — ${analisis.caraUnica}` : "Cubierta" };
    }
    // faldones: el que cae hacia el borde de barlovento es el de barlovento
    const borde = id.replace("cub_", "");
    const esBar = borde === barId;
    const s = cubs.find(c => c.id.includes(esBar ? "barlovento" : "sotavento")) ?? cubs[0];
    return { p: s.gobernante, rot: esBar ? "Cubierta barlovento" : "Cubierta sotavento" };
  };

  // ── ORIENTACIÓN INICIAL: BARLOVENTO DE FRENTE ───────────────────────────────
  // Se puede girar, pero el ángulo con que se abre no debería ser el azaroso: la cara que
  // el viento golpea es la que primero se quiere ver. El acimut se elige para que la
  // normal de barlovento apunte al observador, más un cuarto de vuelta para que se vea
  // también una cara lateral y el croquis lea como volumen y no como alzado.
  const acimutBarlovento = { "x0": -Math.PI / 2, "xa": Math.PI / 2, "y0": 0, "yb": Math.PI }[barId] + 0.6;

  const acimut = giro ?? acimutBarlovento;

  const { caras, medio } = useMemo(() => {
    const m = mallaEdificio({ a: geo.a, b: geo.b, hAlero: geo.hAlero, hCumbre: geo.hCumbre,
      tipo: geo.tipo, cumbrera: geo.cumbrera, pendienteHacia: geo.pendienteHacia });
    const centro = [geo.a / 2, geo.b / 2, geo.hCumbre / 2];
    const ext = Math.max(geo.a, geo.b, geo.hCumbre);
    const escala = Math.min(ancho - 140, alto - 170) / (ext * 1.45);
    const pr = proyector({ acimut, elevacion: elev, escala, centro });
    return { caras: carasVisibles(m, pr).map(c => ({ ...c, proy: c.pts.map(pr.proy) })), medio: centro };
  }, [geo, acimut, elev, ancho, alto]);

  const cx = ancho / 2, cy = (alto - 70) / 2 + 20;
  const P = (pts) => pts.map(([u, v]) => `${cx + u},${cy + v}`).join(" ");

  // Arrastrar para girar. El gesto es el que todo el mundo espera en un 3D, y evita tener
  // que adivinar de antemano cuál es el ángulo útil.
  const arrastre = (e) => {
    const x0 = e.clientX, y0 = e.clientY, a0 = acimut, e0 = elev;
    const mover = (ev) => {
      setGiro(a0 + (ev.clientX - x0) * 0.012);
      setElev(Math.max(-0.2, Math.min(1.45, e0 + (ev.clientY - y0) * 0.008)));
    };
    const soltar = () => { window.removeEventListener("mousemove", mover); window.removeEventListener("mouseup", soltar); };
    window.addEventListener("mousemove", mover); window.addEventListener("mouseup", soltar);
  };

  return (
    <div>
      <div style={{ cursor: "grab" }} onMouseDown={arrastre}>
        <Lienzo ancho={ancho} alto={alto} titulo={`Vista 3D — ${dir.label}`}>
          <Rotulo x={ancho / 2} y={14} texto={`${dir.label} — presión gobernante por cara`}
            color={txt} tam={11} peso={600} />
          {caras.map((c, i) => {
            const info = c.tipo === "cubierta" ? infoCub(c.id) : infoPared(c.id);
            return (
              <g key={`${c.id}-${i}`}>
                <polygon points={P(c.proy)} fill={colorPresion(info.p, maxAbs, tema)}
                  stroke={ink} strokeWidth="1.2" strokeLinejoin="round" />
                <polygon points={P(c.proy)} fill="#000" opacity={sombra(c.n)} />
              </g>
            );
          })}
          {caras.map((c, i) => {
            const info = c.tipo === "cubierta" ? infoCub(c.id) : infoPared(c.id);
            const u = c.proy.reduce((s, p) => s + p[0], 0) / c.proy.length;
            const v = c.proy.reduce((s, p) => s + p[1], 0) / c.proy.length;
            // se rotula sólo si la cara tiene tamaño en pantalla: en un canto, el texto
            // flotaría sobre otra cara y diría algo falso
            const anchoPx = Math.max(...c.proy.map(p => p[0])) - Math.min(...c.proy.map(p => p[0]));
            const altoPx = Math.max(...c.proy.map(p => p[1])) - Math.min(...c.proy.map(p => p[1]));
            if (Math.min(anchoPx, altoPx) < 26) return null;
            return (
              <g key={`t${c.id}-${i}`}>
                <Rotulo x={cx + u} y={cy + v - 8} texto={info.rot} color={txt} tam={10} />
                <Rotulo x={cx + u} y={cy + v + 8} texto={fmt.q(info.p)} color={txt} tam={10} peso={600} />
              </g>
            );
          })}
          <LeyendaPresion x={ancho / 2 - 110} y={alto - 32} ancho={220}
            tramos={tramosLeyenda(maxAbs, tema)} fmt={fmt.q} color={ink} />
        </Lienzo>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 11,
        color: "var(--txt2)", marginTop: 6, flexWrap: "wrap" }}>
        <span>Arrastrá para girar · abre mirando barlovento</span>
        <input type="range" min="0" max="6.28" step="0.01" value={((acimut % 6.283) + 6.283) % 6.283}
          onChange={e => setGiro(+e.target.value)} style={{ flex: "1 1 120px" }}
          aria-label="Giro horizontal" />
        <input type="range" min="-0.2" max="1.45" step="0.01" value={elev}
          onChange={e => setElev(+e.target.value)} style={{ flex: "1 1 90px" }}
          aria-label="Elevación" />
        <button onClick={() => { setGiro(null); setElev(0.45); }}
          style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4,
            border: "1px solid var(--borde)", background: "var(--fondo)", color: "var(--txt)" }}>
          Reiniciar
        </button>
      </div>
    </div>
  );
}
