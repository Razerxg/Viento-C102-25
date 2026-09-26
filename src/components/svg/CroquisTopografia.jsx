// CROQUIS DEL ACCIDENTE TOPOGRÁFICO.
//
// Dibuja la loma, la escarpa o la colina con H, L_h, x y z acotados sobre el perfil real
// que declara el usuario, y el emplazamiento ubicado donde corresponde.
//
// ── POR QUÉ HACE FALTA ─────────────────────────────────────────────────────────
// Los cuatro datos de K_zt se confunden entre sí con una facilidad notable: `L_h` no es la
// base del cerro sino la distancia a barlovento hasta donde el terreno está a MEDIA altura;
// `x` se mide desde la cresta y no desde el pie; `z` es sobre el terreno LOCAL del
// emplazamiento y no sobre el nivel del valle. Un párrafo lo explica; el dibujo con el
// punto marcado lo muestra.
import { Lienzo, Dim, Rotulo } from './kit.jsx';

/**
 * @param {object} p
 * @param {"loma_2D"|"escarpa_2D"|"colina_3D"} p.forma
 * @param {number} p.H_m @param {number} p.Lh_m @param {number} p.x_m @param {number} p.z_m
 * @param {"barlovento"|"sotavento"} p.lado
 */
export function CroquisTopografia({ forma, H_m, Lh_m, x_m, z_m, lado, fmt,
  tema = "claro", ancho = 620, altoMax = 300 }) {
  const ink = tema === "oscuro" ? "#c3c2b7" : "#52514e";
  const txt = tema === "oscuro" ? "#ffffff" : "#0b0b0b";
  const suelo = tema === "oscuro" ? "#232322" : "#ece9e2";
  const ROJO = "#b03a2e";

  const H = Number(H_m) || 0, Lh = Number(Lh_m) || 0;
  const x = Math.abs(Number(x_m) || 0), z = Math.max(0, Number(z_m) || 0);
  if (!(H > 0) || !(Lh > 0)) return null;

  const aBarlovento = lado !== "sotavento";
  const xSig = aBarlovento ? -x : x;

  // ── ENCUADRE, A ESCALA ÚNICA ────────────────────────────────────────────────
  // Las dos escalas son la MISMA a propósito: la pendiente que se ve es H/Lh, que es la
  // condición 2 del art. 1.8.1. Exagerar la vertical para que el cerro «se vea mejor»
  // haría que el dibujo contradijera al número que está al lado.
  // El margen derecho es ancho a propósito: la cota de H vive AFUERA del perfil. Puesta
  // sobre el borde del dibujo se superpone con el rótulo del emplazamiento apenas el
  // sitio queda a sotavento y lejos, que es un caso corriente.
  const mxIzq = 26, mxDer = 92;
  const supY = 44;   // título y rótulo de cresta
  const infY = 94;   // línea de terreno, dos líneas de cota y los rótulos de sector
  const izq = Math.min(-2.2 * Lh, xSig - 0.4 * Lh);
  const der = Math.max(2.2 * Lh, xSig + 0.4 * Lh);
  const spanY = H + z;
  const anchoUtil = ancho - mxIzq - mxDer;
  const esc = Math.min(anchoUtil / (der - izq),
    (altoMax - supY - infY) / (spanY * 1.12));
  const alto = Math.round(spanY * esc + supY + infY);

  const cx = mxIzq + anchoUtil / 2, medio = (izq + der) / 2;
  const y0 = alto - infY;                      // nivel del terreno de barlovento
  const X = (m) => cx + (m - medio) * esc;
  const Y = (m) => y0 - m * esc;

  // ── EL PERFIL ───────────────────────────────────────────────────────────────
  // `L_h` es, por definición, la abscisa a barlovento donde el terreno está a H/2. La
  // curva se construye para que eso se cumpla exactamente: así el croquis no ilustra el
  // concepto, lo respeta, y la cota de L_h cae donde tiene que caer.
  const elev = (u) => forma === "escarpa_2D" && u >= 0
    ? H : H / (1 + Math.pow(Math.abs(u) / Lh, 2));

  const perfil = [];
  const N = 180;
  for (let i = 0; i <= N; i++) {
    const u = izq + (der - izq) * (i / N);
    perfil.push([X(u), Y(elev(u))]);
  }
  const d = `M ${perfil.map(p => p.join(" ")).join(" L ")} `
    + `L ${X(der)} ${y0 + 10} L ${X(izq)} ${y0 + 10} Z`;

  const yTerreno = elev(xSig);
  // El rótulo de z sale hacia el lado contrario a la cresta, salvo que de ese lado ya no
  // quede lugar: a sotavento y lejos el sitio queda contra la cota de H y los dos textos
  // —que llevan fondo opaco— se tapan entre sí.
  const zAlaDerecha = !aBarlovento && X(xSig) + 92 < X(der) + 10;
  const yMedia = H / 2;
  const yCota1 = y0 + 34, yCota2 = y0 + 62;    // las dos líneas de cota, bajo el terreno
  const xH = X(der) + 10;                     // la cota de H, fuera del perfil

  /** Línea de referencia fina, para llevar un punto del dibujo hasta su cota. */
  const Ref = ({ xm, desde, hasta }) => (
    <line x1={X(xm)} y1={desde} x2={X(xm)} y2={hasta} stroke={ink}
      strokeWidth="0.7" strokeDasharray="3 3" opacity="0.65" />
  );

  return (
    <Lienzo ancho={ancho} alto={alto} titulo="Accidente topográfico">
      <Rotulo x={ancho / 2} y={14} color={txt} tam={11} peso={600}
        texto={`${forma === "escarpa_2D" ? "Escarpa bidimensional"
          : forma === "colina_3D" ? "Colina tridimensional" : "Loma bidimensional"}`} />
      <Rotulo x={X(izq)} y={30} color={txt} tam={10} ancla="start" texto="viento →" />

      <path d={d} fill={suelo} stroke={ink} strokeWidth="1.4" />

      {/* Nivel de media altura: es lo que DEFINE L_h. Se dibuja sólo del lado de afuera
          del cerro y termina justo donde corta al talud, que es el punto x = −Lh. */}
      <line x1={X(izq)} y1={Y(yMedia)} x2={X(-Lh)} y2={Y(yMedia)} stroke={ink}
        strokeWidth="0.8" strokeDasharray="4 3" opacity="0.85" />
      <circle cx={X(-Lh)} cy={Y(yMedia)} r="2.6" fill="none" stroke={ink} strokeWidth="1.1" />
      <Rotulo x={X(izq) + 2} y={Y(yMedia) - 7} texto="H/2" color={txt} tam={10} ancla="start" />

      {/* H, sobre el margen derecho. La horizontal punteada la ata a la cresta: sin
          ella la cota parece medir la altura del terreno en el borde del dibujo, que en
          una loma simétrica ya bajó casi hasta el valle. */}
      <line x1={X(0)} y1={Y(H)} x2={xH} y2={Y(H)} stroke={ink}
        strokeWidth="0.7" strokeDasharray="3 3" opacity="0.65" />
      <line x1={X(der)} y1={y0} x2={xH} y2={y0} stroke={ink}
        strokeWidth="0.7" strokeDasharray="3 3" opacity="0.65" />
      <Dim x1={xH} y1={y0} x2={xH} y2={Y(H)}
        texto={`H = ${fmt.m(H)}`} desplaz={14} color={ink} />

      {/* Las cotas horizontales van DEBAJO del terreno, con líneas de referencia: el
          segmento de L_h corre a media altura y ahí queda dentro de la masa del cerro. */}
      <Ref xm={-Lh} desde={Y(yMedia)} hasta={yCota1 + 6} />
      <Ref xm={0} desde={Y(H) - 12} hasta={yCota2 + 6} />
      <Dim x1={X(-Lh)} y1={yCota1} x2={X(0)} y2={yCota1}
        texto={`Lh = ${fmt.m(Lh)}`} desplaz={0} color={ink} />

      {x > 0 && <>
        <Ref xm={xSig} desde={Y(yTerreno)} hasta={yCota2 + 6} />
        <Dim x1={X(0)} y1={yCota2} x2={X(xSig)} y2={yCota2}
          texto={`x = ${fmt.m(x)} · ${lado}`} desplaz={0} color={ink} />
      </>}

      {/* «cresta» y «z» se reparten los dos lados del eje de la cresta. Con el sitio
          cerca de ella los dos rótulos caen a la misma altura, y el que se dibuja segundo
          —llevan fondo opaco— borraría al primero. */}
      <Rotulo x={X(0) + (aBarlovento ? 6 : -6)} y={Y(H) - 8} texto="cresta" color={txt}
        tam={10} ancla={aBarlovento ? "start" : "end"} />

      {/* EL EMPLAZAMIENTO: z se mide sobre el TERRENO LOCAL, no sobre el nivel del valle. */}
      <line x1={X(xSig)} y1={Y(yTerreno)} x2={X(xSig)} y2={Y(yTerreno + z)}
        stroke={ROJO} strokeWidth="2.2" />
      <circle cx={X(xSig)} cy={Y(yTerreno + z)} r="3.4" fill={ROJO} />
      <Rotulo x={X(xSig) + (zAlaDerecha ? 8 : -8)} y={Y(yTerreno + z) - 5}
        texto={`z = ${fmt.m(z)}`} color={ROJO} tam={10} peso={600}
        ancla={zAlaDerecha ? "start" : "end"} />

      <Rotulo x={X(izq) - 6} y={alto - 8} texto="barlovento" color={txt} tam={10} ancla="start" />
      <Rotulo x={X(der) + 6} y={alto - 8} texto="sotavento" color={txt} tam={10} ancla="end" />
    </Lienzo>
  );
}
