// CROQUIS DE UN ACCESORIO DEL CAPÍTULO 4.
//
// Dibuja la estructura en elevación con la fuerza aplicada en SU punto de aplicación, que
// es el dato que el número solo no da: la nota 2 de la Figura 4.4-1 desplaza la resultante
// del caso B 0,2·B hacia el borde de barlovento, y la sube 0,05·h cuando el cartel apoya
// en el suelo. Un croquis que dibujara la flecha en el centro estaría ocultando justo eso.
import { mkView, Dim, Rotulo, Lienzo, Flecha } from './kit.jsx';
import { U } from '../../lib/unidades.js';

export function CroquisAccesorio({ analisis, datos, familia, fmt, tema = "claro",
  ancho = 620, alto = 340 }) {
  const ink = tema === "oscuro" ? "#c3c2b7" : "#52514e";
  const txt = tema === "oscuro" ? "#ffffff" : "#0b0b0b";
  const cuerpo = tema === "oscuro" ? "#232322" : "#f0efec";
  if (!analisis) return null;

  const n = (v, d = 0) => { const x = parseFloat(v); return Number.isFinite(x) ? x : d; };

  // Geometría en metros según la familia. `sInf` es la cota del borde inferior del cuerpo
  // sobre el suelo: en una chimenea o una torre es 0, en un cartel puede no serlo.
  let B, alt, sInf, etiqueta;
  if (familia === "cartel_lleno" || familia === "cartel_abierto") {
    B = n(datos.B, 1); const s = n(datos.s, 1); const h = n(datos.h, 1);
    alt = s; sInf = Math.max(0, h - s);
    etiqueta = familia === "cartel_lleno" ? "Cartel lleno o pared libre" : "Cartel abierto";
  } else if (familia === "chimenea") {
    B = n(datos.D, 1); alt = n(datos.h, 1); sInf = 0; etiqueta = "Chimenea o tanque";
  } else if (familia === "torre") {
    B = n(datos.B, 1); alt = n(datos.h, 1); sInf = 0; etiqueta = "Torre reticulada";
  } else {
    // El equipo sobre cubierta se dibuja sobre el edificio que lo soporta: sin el edificio
    // no se entiende de dónde sale el q_h ni contra qué se compara el área.
    B = n(datos.Bedif, 1); alt = n(datos.hedif, 1); sInf = 0; etiqueta = "Equipo sobre cubierta";
  }
  const hTot = sInf + alt;
  if (!(B > 0) || !(hTot > 0)) return null;

  // Margen holgado a la izquierda: ahí van la cota de altura y la flecha del viento.
  const v = mkView({ ancho, alto: alto - 40, xMin: -B * 0.8, xMax: B * 1.6,
    yMin: 0, yMax: hTot * 1.12, margen: 34 });
  const Y = (m) => v.y(m) + 26;
  const X = (m) => v.x(m);

  const equipo = familia === "equipo";
  const alturaFlecha = analisis.z;     // la misma altura a la que se evaluó q
  const largoFlecha = Math.min(90, Math.max(34, v.l(B) * 0.7));

  return (
    <Lienzo ancho={ancho} alto={alto} titulo={`${etiqueta} — fuerza de viento`}>
      <Rotulo x={ancho / 2} y={13} texto={`${etiqueta} · ${analisis.fam.ref}`}
        color={txt} tam={11} peso={600} />

      {/* terreno */}
      <line x1={X(-B * 0.7)} y1={Y(0)} x2={X(B * 1.1)} y2={Y(0)} stroke={ink} strokeWidth="1.5" />
      {Array.from({ length: 22 }, (_, i) => {
        const x = X(-B * 0.7) + i * (X(B * 1.1) - X(-B * 0.7)) / 21;
        return <line key={i} x1={x} y1={Y(0)} x2={x - 6} y2={Y(0) + 6}
          stroke={ink} strokeWidth="0.7" opacity="0.7" />;
      })}

      {/* cuerpo */}
      <rect x={X(0)} y={Y(sInf + alt)} width={v.l(B)} height={v.l(alt)}
        fill={cuerpo} stroke={ink} strokeWidth="1.4" />
      {/* Un reticulado se dibuja reticulado: con ε = 0,25 una caja llena haría creer que el
          C_f se aplica sobre toda la superficie, que es el error que duplica la fuerza. */}
      {(familia === "torre" || familia === "cartel_abierto") && (
        <g stroke={ink} strokeWidth="0.8" opacity="0.75">
          {Array.from({ length: 7 }, (_, i) => {
            const y0 = Y(sInf + alt * (i / 7)), y1 = Y(sInf + alt * ((i + 1) / 7));
            return <g key={i}>
              <line x1={X(0)} y1={y0} x2={X(B)} y2={y1} />
              <line x1={X(B)} y1={y0} x2={X(0)} y2={y1} />
              <line x1={X(0)} y1={y0} x2={X(B)} y2={y0} />
            </g>;
          })}
        </g>
      )}
      {/* El equipo se dibuja ENCIMA del edificio, a escala de su área proyectada. */}
      {equipo && (() => {
        const Af = n(datos.Af, 1);
        const bEq = Math.min(B * 0.5, Math.sqrt(Af * B / Math.max(alt, 0.1)));
        const hEq = Af / Math.max(bEq, 0.01);
        return (
          <rect x={X(B / 2 - bEq / 2)} y={Y(alt + hEq)} width={v.l(bEq)} height={v.l(hEq)}
            fill={cuerpo} stroke={ink} strokeWidth="1.4" />
        );
      })()}

      {/* LA FUERZA, a la altura a la que se evaluó q. */}
      <Flecha x1={X(0) - largoFlecha - v.l(B) * 0.12} y1={Y(alturaFlecha)}
        x2={X(0) - v.l(B) * 0.12} y2={Y(alturaFlecha)} color="#b03a2e" grosor={2.4} cabeza={8} />
      <Rotulo x={X(0) - largoFlecha - v.l(B) * 0.12 - 4} y={Y(alturaFlecha) - 13}
        texto={`F = ${U.fuerza(Math.abs(analisis.F))}`} color={txt} tam={11} peso={600}
        ancla="start" />
      <Rotulo x={X(0) - largoFlecha - v.l(B) * 0.12 - 4} y={Y(alturaFlecha) + 13}
        texto={`z = ${fmt.m(alturaFlecha)}`} color={txt} tam={10} ancla="start" />

      {/* cotas */}
      <Dim x1={X(0)} y1={Y(0)} x2={X(B)} y2={Y(0)} texto={`${fmt.m(B)}`}
        desplaz={38} color={ink} />
      {/* ⚠ LAS COTAS DE ALTURA VAN A LA DERECHA DEL CUERPO. La flecha de la fuerza y su
          rótulo ocupan siempre el lado izquierdo, y con un cuerpo esbelto —una chimenea de
          3 m de diámetro y 20 de alto— una cota a la izquierda cae justo encima del
          «F = … kN». El signo positivo de `desplaz` es el que la manda hacia afuera. */}
      {sInf > 0.001 && (
        <Dim x1={X(B)} y1={Y(0)} x2={X(B)} y2={Y(sInf)} texto={`${fmt.m(sInf)}`}
          desplaz={34} color={ink} />
      )}
      <Dim x1={X(B)} y1={Y(sInf)} x2={X(B)} y2={Y(sInf + alt)}
        texto={`${fmt.m(alt)}`} desplaz={34} color={ink} />
    </Lienzo>
  );
}

// PLANTA DEL CASO C — las regiones desde el borde de barlovento, con su C_f.
//
// Es la única forma de ver de un golpe que el caso C no es «otro coeficiente» sino OTRO
// REPARTO: el borde toma más del doble que el resto del cartel, y la resultante deja de
// estar en el centro.
export function PlantaCasoC({ casoC, B, fmt, tema = "claro", ancho = 620, alto = 230 }) {
  const ink = tema === "oscuro" ? "#c3c2b7" : "#52514e";
  const txt = tema === "oscuro" ? "#ffffff" : "#0b0b0b";
  if (!casoC?.aplica) return null;

  const v = mkView({ ancho, alto: alto - 96, xMin: 0, xMax: B, yMin: 0, yMax: Math.max(B / 6, 1), margen: 46 });
  const Y = (m) => v.y(m) + 62;
  const maxCf = Math.max(...casoC.regiones.map(r => r.cf));

  return (
    <Lienzo ancho={ancho} alto={alto} titulo="Caso C — regiones desde el borde de barlovento">
      <Rotulo x={ancho / 2} y={13} color={txt} tam={11} peso={600}
        texto={`Caso C · B/s = ${fmt.m(casoC.Bs).replace(" m", "")} · ${casoC.regiones.length} regiones`} />
      {casoC.regiones.map((r, i) => {
        const x = v.x(r.desde), w = v.l(r.ancho);
        // La intensidad del relleno es proporcional al C_f: el gradiente de borde a centro
        // es el mensaje del caso C, y con todas las cajas iguales no se ve.
        const t = r.cf / maxCf;
        const cf = r.cf.toFixed(2).replace(".", ",");
        // ⚠ LAS REGIONES DE BORDE SON ESTRECHAS Y SUS RÓTULOS NO ENTRAN. Con B/s = 10 las
        // tres primeras miden un décimo del ancho cada una, y escribir el nombre adentro
        // produce tres textos encimados que no se leen ni dicen a qué caja pertenecen.
        // El criterio: el nombre sólo si la caja lo aguanta; el C_f, que es el dato, va
        // siempre, y si tampoco entra sale arriba con una línea de guía. El detalle
        // completo está en la tabla de abajo.
        const anchoTexto = (txto, tam) => txto.length * tam * 0.58 + 8;
        const entraNombre = w > anchoTexto(r.label, 10) + 4;
        const entraCf = w > anchoTexto(cf, 11) + 4;
        const yCaja = Math.max(B / 6, 1);
        return (
          <g key={r.id}>
            <rect x={x} y={Y(yCaja)} width={w} height={v.l(yCaja)}
              fill={`rgba(176,58,46,${0.12 + 0.55 * t})`} stroke={ink} strokeWidth="1" />
            {entraNombre && (
              <Rotulo x={x + w / 2} y={Y(yCaja * 0.66)} texto={r.label} color={txt} tam={10} />
            )}
            {entraCf ? (
              <Rotulo x={x + w / 2} y={Y(yCaja * (entraNombre ? 0.3 : 0.5))}
                texto={cf} color={txt} tam={11} peso={600} />
            ) : (
              <g>
                <line x1={x + w / 2} y1={Y(yCaja)} x2={x + w / 2} y2={Y(yCaja) - 10 - (i % 2) * 13}
                  stroke={ink} strokeWidth="0.7" />
                <Rotulo x={x + w / 2} y={Y(yCaja) - 17 - (i % 2) * 13}
                  texto={cf} color={txt} tam={10} peso={600} />
              </g>
            )}
          </g>
        );
      })}
      <Flecha x1={v.x(0) - 30} y1={Y(Math.max(B / 6, 1) * 0.5)}
        x2={v.x(0) - 6} y2={Y(Math.max(B / 6, 1) * 0.5)} color={ink} grosor={2} cabeza={7} />
      <Rotulo x={v.x(0) - 34} y={Y(Math.max(B / 6, 1) * 0.5) - 14} texto="viento oblicuo"
        color={txt} tam={10} ancla="end" />
      <Dim x1={v.x(0)} y1={Y(0)} x2={v.x(B)} y2={Y(0)} texto={`B = ${fmt.m(B)}`}
        desplaz={22} color={ink} />
    </Lienzo>
  );
}
