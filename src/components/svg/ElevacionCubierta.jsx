// CROQUIS 3 — ELEVACIÓN CON LAS ZONAS DE CUBIERTA.
//
// Dibuja la SILUETA REAL de la cubierta, sea cual sea el tipo y el ángulo. La primera
// versión dibujaba un techo plano siempre que el tratamiento fuera «por franjas», de modo
// que con θ = 5° la cubierta aparecía horizontal: el usuario inclinaba el techo en el
// formulario y el croquis le mostraba otra cosa. Un dibujo que contradice el dato de
// entrada es peor que no tener dibujo.
//
// Y dice ARRIBA de todo qué tipo de cubierta es y por qué se trata como se trata, porque
// eso es justamente lo que no se puede deducir mirando los números.
import { mkView, Dim, Rotulo, Lienzo, LeyendaPresion } from './kit.jsx';
import { colorPresion, tramosLeyenda } from '../../lib/escalaPresion.js';
import { tipoDe } from '../../constants/cubiertas.js';

export function ElevacionCubierta({ analisis, maxAbs, fmt, tema = "claro", ancho = 620, alto = 470 }) {
  const { geo, L, superficies, modo, caraUnica } = analisis;
  const ink = tema === "oscuro" ? "#c3c2b7" : "#52514e";
  const txt = tema === "oscuro" ? "#ffffff" : "#0b0b0b";
  const cuerpo = tema === "oscuro" ? "#232322" : "#f4f3f0";
  const t = tipoDe(geo.tipo);

  // ── SILUETA DE LA CUBIERTA ──────────────────────────────────────────────────────
  // Puntos [x, z] del borde superior, de barlovento a sotavento. El corte se toma en la
  // dirección del viento, que es la que mide L.
  const sube = geo.theta > 0 && geo.cumbrera !== analisis.dir.eje === false;
  const hC = geo.hCumbre;
  const linea =
    geo.theta <= 0 || !analisis.normalACumbrera
      // viento paralelo a la cumbrera: se ve el alero corrido, sin remonte aparente
      ? [[0, geo.hAlero], [L, geo.hAlero]]
      : geo.tipo === "vertiente_unica"
        ? (caraUnica === "barlovento" ? [[0, geo.hAlero], [L, hC]] : [[0, hC], [L, geo.hAlero]])
        : [[0, geo.hAlero], [L / 2, hC], [L, geo.hAlero]];
  const zTope = Math.max(...linea.map(p => p[1]));

  const yTop = 46, yBot = alto - 46;
  const v = mkView({ ancho, alto: yBot - yTop, xMin: -L * 0.1, xMax: L * 1.1,
    yMin: 0, yMax: zTope * 1.18, margen: 58 });
  const Y = (z) => v.y(z) + yTop;
  // altura de la silueta en una abscisa, interpolando entre los vértices
  const zEn = (x) => {
    for (let i = 1; i < linea.length; i++) {
      const [x0, z0] = linea[i - 1], [x1, z1] = linea[i];
      if (x <= x1) return z0 + (z1 - z0) * (x - x0) / (x1 - x0 || 1);
    }
    return linea.at(-1)[1];
  };

  const cub = superficies.filter(s => s.tipo === "cubierta" && s.caso !== "positivo");

  // Banda coloreada siguiendo la pendiente, entre dos abscisas.
  const banda = (x0, x1, p, key) => (
    <polygon key={key} fill={colorPresion(p, maxAbs, tema)} stroke={ink} strokeWidth="1"
      points={`${v.x(x0)},${Y(zEn(x0))} ${v.x(x1)},${Y(zEn(x1))} `
        + `${v.x(x1)},${Y(zEn(x1)) + 11} ${v.x(x0)},${Y(zEn(x0)) + 11}`} />
  );

  // Rótulos ESCALONADOS en dos alturas. Las dos primeras franjas miden h/2 cada una y en
  // un edificio largo quedan angostas: con los rótulos a la misma altura se encabalgaban
  // («-921 N -921 N/m²»). Alternar la altura los separa sin achicar la letra.
  const rotulo = (x0, x1, s, i) => {
    const xm = (x0 + x1) / 2;
    const alto2 = i % 2 === 0 ? 0 : 30;
    const estrecha = v.l(x1 - x0) < 64;
    return (
      <g key={`r${i}`}>
        {estrecha && (
          <line x1={v.x(xm)} y1={Y(zEn(xm)) - 6} x2={v.x(xm)} y2={Y(zEn(xm)) - 22 - alto2}
            stroke={ink} strokeWidth="0.6" opacity="0.6" />
        )}
        <Rotulo x={v.x(xm)} y={Y(zEn(xm)) - 30 - alto2} texto={fmt.q(s.gobernante)}
          color={txt} tam={10} peso={600} />
        <Rotulo x={v.x(xm)} y={Y(zEn(xm)) - 16 - alto2} texto={`Cp ${s.cp.toFixed(2)}`}
          color={txt} tam={10} />
      </g>
    );
  };

  return (
    <Lienzo ancho={ancho} alto={alto} titulo="Elevación con zonas de cubierta">
      <Rotulo x={ancho / 2} y={14} texto={`${t.label} · θ = ${geo.theta}°`}
        color={txt} tam={11} peso={700} />
      <Rotulo x={ancho / 2} y={30} color={txt} tam={10}
        texto={modo === "faldones" ? "Viento normal a la cumbrera — dos faldones"
          : modo === "unica" ? `Nota 4 — superficie completa a ${caraUnica}`
          : "Zonificada en franjas desde el borde de barlovento"} />

      <line x1={v.x(-L * 0.1)} y1={Y(0)} x2={v.x(L * 1.1)} y2={Y(0)} stroke={ink} strokeWidth="1.5" />

      {/* cuerpo del edificio, bajo la silueta */}
      <polygon fill={cuerpo} stroke={ink} strokeWidth="1.2"
        points={[[0, 0], ...linea, [L, 0]].map(([x, z]) => `${v.x(x)},${Y(z)}`).join(" ")} />

      {modo === "faldones" ? (
        [["cub_barlovento_neg", 0, L / 2], ["cub_sotavento", L / 2, L]].map(([id, x0, x1], i) => {
          const s = superficies.find(o => o.id === id);
          return s ? <g key={id}>{banda(x0, x1, s.gobernante, id)}{rotulo(x0, x1, s, i)}</g> : null;
        })
      ) : modo === "unica" ? (
        (() => { const s = cub[0]; return s ? <g>{banda(0, L, s.gobernante, "u")}{rotulo(0, L, s, 0)}</g> : null; })()
      ) : (
        cub.map((s, i) => {
          const x0 = Math.min((s.zona?.desde ?? 0) * geo.h, L);
          const x1 = Math.min((s.zona?.hasta ?? L / geo.h) * geo.h, L);
          if (x1 <= x0) return null;
          return (<g key={s.id}>
            {banda(x0, x1, s.gobernante, s.id)}
            {rotulo(x0, x1, s, i)}
            <Dim x1={v.x(x0)} y1={Y(0)} x2={v.x(x1)} y2={Y(0)}
              texto={`${((x1 - x0) / geo.h).toFixed(2)}h`} desplaz={20 + (i % 2) * 20} color={ink} />
          </g>);
        })
      )}

      {/* las cotas que faltaban: el alero, el punto más alto y la luz */}
      <Dim x1={v.x(0)} y1={Y(0)} x2={v.x(0)} y2={Y(geo.hAlero)}
        texto={`alero ${fmt.m(geo.hAlero)}`} desplaz={-24} color={ink} />
      {zTope > geo.hAlero + 1e-9 && (
        <Dim x1={v.x(L * 1.06)} y1={Y(0)} x2={v.x(L * 1.06)} y2={Y(zTope)}
          texto={`cumbrera ${fmt.m(zTope)}`} desplaz={26} color={ink} />
      )}
      <Dim x1={v.x(0)} y1={Y(0)} x2={v.x(L)} y2={Y(0)} texto={`L = ${fmt.m(L)}`}
        desplaz={modo === "franjas" ? 66 : 24} color={ink} />
      <Rotulo x={v.x(L / 2)} y={Y(0) + (modo === "franjas" ? 88 : 46)} color={txt} tam={10}
        texto={`altura media h = ${fmt.m(geo.h)} · h/L = ${analisis.hL.toFixed(2)}`} />

      <LeyendaPresion x={ancho / 2 - 110} y={alto - 32} ancho={220}
        tramos={tramosLeyenda(maxAbs, tema)} fmt={fmt.q} color={ink} />
    </Lienzo>
  );
}
