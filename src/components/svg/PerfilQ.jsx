// CROQUIS 1 — PERFIL DE PRESIÓN DINÁMICA EN ALTURA.
//
// Es el croquis que delata de un vistazo una exposición o una altura mal cargadas: el
// escalonado de q(z) es la firma de la categoría de exposición, y si el edificio no llega
// a los 5 m se ve un solo escalón, que es exactamente lo que dice el reglamento.
//
// La pared a barlovento es la ÚNICA superficie con q variable. Dibujarla escalonada al
// lado del edificio deja ver por qué: el resto del edificio recibe una presión constante.
import { mkView, Dim, Rotulo, Lienzo, Flecha } from './kit.jsx';

export function PerfilQ({ analisis, fmt, tema = "claro", ancho = 620, alto = 380 }) {
  const { perfil, geo } = analisis;
  const qMax = Math.max(...perfil.map(t => t.q), 1);
  const ink = tema === "oscuro" ? "#c3c2b7" : "#52514e";
  const txt = tema === "oscuro" ? "#ffffff" : "#0b0b0b";
  const azul = tema === "oscuro" ? "#3987e5" : "#2a78d6";

  // El ancho del diagrama ocupa media lámina; la otra media es el edificio.
  const anchoDiag = 1.0;                       // en unidades de «q normalizado»
  const v = mkView({ ancho, alto, xMin: -0.9, xMax: anchoDiag + 0.35, yMin: 0, yMax: geo.h * 1.12, margen: 46 });

  return (
    <Lienzo ancho={ancho} alto={alto} titulo="Perfil de presión dinámica en altura">
      {/* terreno */}
      <line x1={v.x(-0.9)} y1={v.y(0)} x2={v.x(anchoDiag + 0.35)} y2={v.y(0)}
        stroke={ink} strokeWidth="1.5" />
      {[...Array(14)].map((_, i) => {
        const x = v.x(-0.9) + i * (v.x(anchoDiag + 0.35) - v.x(-0.9)) / 13;
        return <line key={i} x1={x} y1={v.y(0)} x2={x - 6} y2={v.y(0) + 7} stroke={ink}
          strokeWidth="0.7" opacity="0.5" />;
      })}

      {/* el edificio, de canto */}
      <rect x={v.x(-0.75)} y={v.y(geo.h)} width={v.l(0.72)} height={v.l(geo.h)}
        fill={tema === "oscuro" ? "#2c2c2a" : "#f0efec"} stroke={ink} strokeWidth="1.5" />
      <Dim x1={v.x(-0.79)} y1={v.y(0)} x2={v.x(-0.79)} y2={v.y(geo.h)}
        texto={`h = ${fmt.m(geo.h)}`} desplaz={-20} color={ink} />

      {/* el escalonado de q(z) */}
      {perfil.map((t, i) => {
        const f = t.q / qMax;
        return (
          <g key={i}>
            <rect x={v.x(0)} y={v.y(t.hasta)} width={v.l(f * anchoDiag)}
              height={v.l(t.hasta - t.desde)} fill={azul} opacity="0.22"
              stroke={azul} strokeWidth="1.2" />
            <Rotulo x={v.x(f * anchoDiag) + 6} y={v.y((t.desde + t.hasta) / 2)}
              texto={fmt.q(t.q)} color={txt} ancla="start" tam={10} />
          </g>
        );
      })}

      {/* flechas de viento, del lado de barlovento */}
      {perfil.map((t, i) => {
        const y = v.y((t.desde + t.hasta) / 2);
        return <Flecha key={i} x1={v.x(-0.02) - v.l(t.q / qMax * anchoDiag) - 26} y1={y}
          x2={v.x(-0.02) - v.l(t.q / qMax * anchoDiag) - 6} y2={y} color={azul} grosor={1.5} cabeza={5} />;
      })}

      <Rotulo x={v.x(anchoDiag / 2)} y={v.y(geo.h) - 18} texto={`q(z) — exposición ${analisis.dir.label}`}
        color={txt} tam={11} peso={600} />
      {/* la cota del tope deja ver que el perfil cierra EN h y no en la última altura tabulada */}
      <Rotulo x={v.x(0) - 8} y={v.y(geo.h)} texto={`q_h = ${fmt.q(analisis.qh)}`}
        color={txt} ancla="end" tam={10} />
    </Lienzo>
  );
}
