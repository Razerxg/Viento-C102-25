// CROQUIS 3 — ELEVACIÓN CON LAS ZONAS DE CUBIERTA.
//
// Es donde más se equivoca uno leyendo las tablas, y por eso es el croquis que más
// verifica: muestra si la cubierta se está tratando por FALDONES —viento normal a la
// cumbrera con θ ≥ 10°— o por FRANJAS medidas desde el borde de barlovento, que es la
// distinción de la Figura 2.4-1 más fácil de pasar por alto.
import { mkView, Dim, Rotulo, Lienzo } from './kit.jsx';
import { colorPresion, tramosLeyenda } from '../../lib/escalaPresion.js';
import { LeyendaPresion } from './kit.jsx';

export function ElevacionCubierta({ analisis, maxAbs, fmt, tema = "claro", ancho = 620, alto = 400 }) {
  const { geo, L, superficies, normalACumbrera } = analisis;
  const ink = tema === "oscuro" ? "#c3c2b7" : "#52514e";
  const txt = tema === "oscuro" ? "#ffffff" : "#0b0b0b";
  const porFaldones = normalACumbrera && geo.theta >= 10;
  const hCumbre = porFaldones ? geo.hAlero + (L / 2) * Math.tan(geo.theta * Math.PI / 180) : geo.h;
  const v = mkView({ ancho, alto: alto - 46, xMin: -L * 0.16, xMax: L * 1.16,
    yMin: 0, yMax: hCumbre * 1.3, margen: 48 });

  const cub = superficies.filter(s => s.tipo === "cubierta" && s.caso !== "positivo");

  return (
    <Lienzo ancho={ancho} alto={alto} titulo="Elevación con zonas de cubierta">
      <line x1={v.x(-L * 0.16)} y1={v.y(0)} x2={v.x(L * 1.16)} y2={v.y(0)} stroke={ink} strokeWidth="1.5" />

      {/* cuerpo del edificio hasta el alero */}
      <rect x={v.x(0)} y={v.y(geo.hAlero)} width={v.l(L)} height={v.l(geo.hAlero)}
        fill={tema === "oscuro" ? "#232322" : "#fafaf8"} stroke={ink} strokeWidth="1.2" />

      {porFaldones ? (<>
        {/* dos faldones: barlovento a la izquierda, sotavento a la derecha */}
        {[["cub_barlovento_neg", 0, L / 2, "Barlovento"], ["cub_sotavento", L / 2, L, "Sotavento"]]
          .map(([id, x0, x1, rot], i) => {
            const s = superficies.find(o => o.id === id);
            if (!s) return null;
            const yA = i === 0 ? geo.hAlero : hCumbre, yB = i === 0 ? hCumbre : geo.hAlero;
            return (
              <g key={id}>
                <polygon points={`${v.x(x0)},${v.y(yA)} ${v.x(x1)},${v.y(yB)} ${v.x(x1)},${v.y(geo.hAlero)} ${v.x(x0)},${v.y(geo.hAlero)}`}
                  fill={colorPresion(s.gobernante, maxAbs, tema)} stroke={ink} strokeWidth="1.2" />
                <Rotulo x={v.x((x0 + x1) / 2)} y={v.y((yA + yB) / 2) - 12}
                  texto={`${rot} · Cp ${s.cp.toFixed(2)}`} color={txt} tam={10} />
                <Rotulo x={v.x((x0 + x1) / 2)} y={v.y((yA + yB) / 2) + 4}
                  texto={fmt.q(s.gobernante)} color={txt} tam={10} peso={600} />
              </g>
            );
          })}
        <Dim x1={v.x(L / 2)} y1={v.y(geo.hAlero)} x2={v.x(L / 2)} y2={v.y(hCumbre)}
          texto={`θ = ${geo.theta}°`} desplaz={0} color={ink} />
      </>) : (<>
        {/* franjas desde el borde de barlovento, en múltiplos de h */}
        {cub.map((s, i) => {
          const x0 = Math.min((s.zona?.desde ?? 0) * geo.h, L);
          const x1 = Math.min((s.zona?.hasta ?? L / geo.h) * geo.h, L);
          if (x1 <= x0) return null;
          return (
            <g key={s.id}>
              <rect x={v.x(x0)} y={v.y(geo.h) - 11} width={v.l(x1 - x0)} height={11}
                fill={colorPresion(s.gobernante, maxAbs, tema)} stroke={ink} strokeWidth="1" />
              <Rotulo x={v.x((x0 + x1) / 2)} y={v.y(geo.h) - 28}
                texto={`Cp ${s.cp.toFixed(2)}`} color={txt} tam={10} />
              <Rotulo x={v.x((x0 + x1) / 2)} y={v.y(geo.h) - 44}
                texto={fmt.q(s.gobernante)} color={txt} tam={10} peso={600} />
              <Dim x1={v.x(x0)} y1={v.y(0)} x2={v.x(x1)} y2={v.y(0)}
                texto={`${((x1 - x0) / geo.h).toFixed(2)}h`} desplaz={22 + (i % 2) * 18} color={ink} />
            </g>
          );
        })}
      </>)}

      <Dim x1={v.x(0)} y1={v.y(0)} x2={v.x(0)} y2={v.y(geo.hAlero)} texto={`h_alero = ${fmt.m(geo.hAlero)}`}
        desplaz={-26} color={ink} />
      <Rotulo x={ancho / 2} y={20}
        texto={porFaldones ? "Viento NORMAL a la cumbrera — cubierta por faldones"
          : "Viento paralelo a la cumbrera o θ < 10° — cubierta por franjas"}
        color={txt} tam={11} peso={600} />
      <LeyendaPresion x={ancho / 2 - 110} y={alto - 32} ancho={220}
        tramos={tramosLeyenda(maxAbs, tema)} fmt={fmt.q} color={ink} />
    </Lienzo>
  );
}
