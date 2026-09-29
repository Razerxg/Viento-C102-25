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
import { mkView, Dim, CadenaDeCotas, Rotulo, Lienzo, LeyendaPresion, TXT } from './kit.jsx';
import { colorPresion, tramosLeyenda } from '../../lib/escalaPresion.js';
import { tipoDe } from '../../constants/cubiertas.js';
import { q as fq, m as fm, coef } from './formatoCroquis.js';
import { c as tok } from '../tokens.js';

// ── CÓMO SE NOMBRA UNA FRANJA ───────────────────────────────────────────────────
// ⚠ «0.50h» NO ES UN NOMBRE DE FRANJA, es el largo de un tramo escrito con punto decimal.
// El reglamento zonifica la cubierta en «0 a h/2», «h/2 a h», «h a 2h» y «más de 2h»: ése
// es el nombre, y el largo en metros va al lado, que es el número que se lleva al plano.
const enH = (v) => {
  if (Math.abs(v) < 1e-9) return "0";
  if (Math.abs(v - 0.5) < 1e-9) return "h/2";
  if (Math.abs(v - 1) < 1e-9) return "h";
  return `${coef(v, 2)}h`;
};
const nombreFranja = (desde, hasta, tope) =>
  (hasta >= tope - 1e-9 ? `más de ${enH(desde)}` : `${enH(desde)} a ${enH(hasta)}`);

/**
 * Franjas CONSECUTIVAS con el mismo valor, en una sola.
 *
 * Las dos primeras franjas de la Fig. 2.4-1 miden h/2 cada una y en muchos casos llevan el
 * MISMO Cp: el croquis las rotulaba dos veces, con las dos etiquetas escalonadas para que
 * no se encimaran. Dos rótulos idénticos separados a la fuerza no informan nada que no
 * informe uno solo abarcando las dos.
 */
function fundir(franjas) {
  const salida = [];
  for (const f of franjas) {
    const u = salida[salida.length - 1];
    if (u && Math.abs(u.cp - f.cp) < 1e-9 && Math.abs(u.gobernante - f.gobernante) < 0.5
      && Math.abs(u.x1 - f.x0) < 1e-9) { u.x1 = f.x1; u.hasta = f.hasta; continue; }
    salida.push({ ...f });
  }
  return salida;
}

export function ElevacionCubierta({ analisis, maxAbs, tema = "claro", ancho = 620,
  alto = 470, escala }) {
  const { geo, L, superficies, modo, caraUnica } = analisis;
  // La tinta sale de los tokens del tema; lo único que depende de `tema` es la escala de
  // presión, que es una escala de DATOS y vive en `lib/escalaPresion.js`.
  const ink = tok.txt2;
  const txt = tok.txt;
  const cuerpo = tok.hover;
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
    yMin: 0, yMax: zTope * 1.18, margen: 58, escalaFija: escala });
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

  // Rótulos ESCALONADOS en TRES alturas. Las dos primeras franjas miden h/2 cada una y en
  // un edificio largo quedan angostas: con los rótulos a la misma altura se encabalgaban
  // («-921 N -921 N/m²»). Alternar la altura los separa sin achicar la letra, pero con dos
  // filas sólo alcanza para dos franjas seguidas: en la vertiente única de 5° la tercera
  // volvía a la primera fila y se montaba sobre la primera.
  // ── LOS RÓTULOS DE FRANJA CUELGAN DE UNA LÍNEA COMÚN, NO DEL TECHO ──────────────
  // ⚠ Medidos desde la silueta, dos rótulos de filas distintas se cruzan en cuanto el
  // techo tiene pendiente: en la vertiente única de 5° el rótulo de una franja alta en la
  // fila 0 quedaba a la misma altura que el de una franja baja en la fila 1. Colgados
  // todos del punto MÁS ALTO del techo, las filas son filas de verdad y no se tocan
  // nunca; la línea guía baja hasta la franja que cada uno rotula.
  const yBase = Y(zTope);
  const rotulo = (x0, x1, s, i) => {
    const xm = (x0 + x1) / 2;
    const alto2 = (i % 3) * 32;
    return (
      <g key={`r${i}`}>
        <line x1={v.x(xm)} y1={Y(zEn(xm)) - 4} x2={v.x(xm)} y2={yBase - 14 - alto2}
          stroke={ink} strokeWidth="0.6" opacity="0.6" />
        <Rotulo x={v.x(xm)} y={yBase - 39 - alto2} texto={fq(s.gobernante)}
          color={txt} tam={TXT.min} peso={600} />
        <Rotulo x={v.x(xm)} y={yBase - 24 - alto2} texto={`Cp ${coef(s.cp)}`}
          color={txt} tam={TXT.min} />
      </g>
    );
  };

  return (
    <Lienzo ancho={ancho} alto={alto} titulo="Elevación con zonas de cubierta"
      escala={v.esc} edificio="cap2" unidades="Cotas en m · presiones en kN/m²">
      <Rotulo x={ancho / 2} y={14} texto={`${t.label} · θ = ${coef(geo.theta, 1)}°`}
        color={txt} tam={TXT.titulo} peso={700} />
      <Rotulo x={ancho / 2} y={31} color={txt} tam={TXT.min}
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
      ) : (() => {
        const franjas = fundir(cub.map(s => ({
          id: s.id, cp: s.cp, gobernante: s.gobernante,
          desde: s.zona?.desde ?? 0, hasta: s.zona?.hasta ?? L / geo.h,
          x0: Math.min((s.zona?.desde ?? 0) * geo.h, L),
          x1: Math.min((s.zona?.hasta ?? L / geo.h) * geo.h, L),
        })).filter(f => f.x1 > f.x0));
        const tope = L / geo.h;
        return <>
          {franjas.map((f, i) => (<g key={f.id}>
            {banda(f.x0, f.x1, f.gobernante, f.id)}
            {rotulo(f.x0, f.x1, f, i)}
          </g>))}
          {/* La cadena de cotas se apila en filas: tres tramos seguidos dan tres
              etiquetas en el ancho de una, y alternar el desplazamiento de a una sólo
              alcanza para dos. */}
          <CadenaDeCotas eje="x" fijo={Y(0)} al={v.x} desplaz={22}
            cortes={[franjas[0]?.x0 ?? 0, ...franjas.map(f => f.x1)]}
            textos={franjas.map(f =>
              `${nombreFranja(f.desde, f.hasta, tope)} = ${fm(f.x1 - f.x0)}`)}
            color={ink} />
        </>;
      })()}

      {/* las cotas que faltaban: el alero, el punto más alto y la luz */}
      {/* ⚠ MÁS AFUERA QUE EL RÓTULO DE LA PRIMERA FRANJA. En una nave larga la primera
          franja mide h/2 contra 100 m de luz: su rótulo cae pegado al borde izquierdo y
          con 24 px la cota del alero quedaba debajo. */}
      <Dim x1={v.x(0)} y1={Y(0)} x2={v.x(0)} y2={Y(geo.hAlero)}
        texto={`alero ${fm(geo.hAlero)}`} desplaz={-44} color={ink} />
      {zTope > geo.hAlero + 1e-9 && (
        // La cota de cumbrera se va más afuera que el rótulo de presión del faldón de
        // sotavento: en cuatro aguas ese rótulo llega hasta el borde derecho del dibujo.
        <Dim x1={v.x(L * 1.06)} y1={Y(0)} x2={v.x(L * 1.06)} y2={Y(zTope)}
          texto={`cumbrera ${fm(zTope)}`} desplaz={46} color={ink} />
      )}
      <Dim x1={v.x(0)} y1={Y(0)} x2={v.x(L)} y2={Y(0)} texto={`L = ${fm(L)}`}
        desplaz={modo === "franjas" ? 78 : 24} color={ink} />
      {/* ⚠ SE RECORTA AL LIENZO. El pie colgaba a 100 px de la base del edificio para
          dejar lugar a la cadena de cotas, y en una torre —donde el edificio es más alto
          que ancho y la base queda abajo de todo— se salía del dibujo. */}
      <Rotulo x={v.x(L / 2)}
        y={Math.min(Y(0) + (modo === "franjas" ? 100 : 46), alto - 52)} color={txt}
        tam={TXT.min}
        texto={`altura media h = ${fm(geo.h)} · h/L = ${coef(analisis.hL)}`} />

      <LeyendaPresion x={ancho / 2 - 90} y={alto - 34} ancho={180}
        tramos={tramosLeyenda(maxAbs, tema)} fmt={fq} color={ink} lienzo={ancho} lienzoAlto={alto} />
    </Lienzo>
  );
}
