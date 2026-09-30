// ART. 5.9 — ALERO ADOSADO A UNA PARED. La sección de la pantalla de C&R.
//
// ── POR QUÉ ES UNA SECCIÓN Y NO UNA PANTALLA ────────────────────────────────────
// Comparte todo el sitio y toda la geometría con el resto del capítulo 5 —V, exposición,
// K_zt, K_d, la altura media de cubierta— y no pide un solo parámetro del sitio propio: los
// cinco datos que agrega son del alero. Una pantalla aparte obligaría a volver a mirar de
// dónde salió q_h; acá está tres tarjetas más arriba.
//
// ── POR QUÉ ARRANCA APAGADA ─────────────────────────────────────────────────────
// La mayoría de los proyectos no tiene un alero adosado. Mostrar sus campos, sus avisos y su
// croquis siempre haría que el 90 % de las veces la pantalla informe una tipología que no
// existe en el edificio, y un aviso que no aplica es peor que ninguno.
//
// ── LAS DOS TABLAS SON DOS VERIFICACIONES, NO DOS CAMINOS ───────────────────────
// C 5.9: con dos superficies físicas «se necesita aplicar ambas Figuras» —la A para las
// fijaciones de cada cara, la B para la estructura del alero—. No se muestra la envolvente
// de las dos: son elementos distintos del mismo alero y cada uno lleva su número.
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { Card, Campo, Num, Sel, Aviso, Nota, Tabla, Th, Td, TdN, Badge, Boton,
  Stat, Stats, Ayuda, Divisor } from '../ui.jsx';
import { c, t, MONO } from '../tokens.js';
import { U } from '../../lib/unidades.js';
import { AleroAdosadoSVG } from '../svg/AleroAdosadoSVG.jsx';
import { useZoomCroquis } from '../svg/kit.jsx';
import { PAREDES, ETIQUETA_PARED } from '../../engine/aleroAdosado.js';
import { DESTINO, ETIQUETA_DESTINO, CARA, PENDIENTE_MAXIMA, H_CORTE, H_EXCEPCION,
  FIGURAS_ALERO } from '../../constants/aleroAdosado.js';
import { TIPOS_LISTA, ETIQUETA_TIPO, TIPO_ELEMENTO } from '../../engine/cyrElementos.js';

const PIDE_LS = new Set([TIPO_ELEMENTO.CHAPA, TIPO_ELEMENTO.CORREA,
  TIPO_ELEMENTO.LARGUERO, TIPO_ELEMENTO.MONTANTE]);

const nuevoId = () => `al-${Math.random().toString(36).slice(2, 8)}`;
const f2 = (x) => Number(x).toFixed(2).replace(".", ",");

// Cada ayuda evita el error de uso concreto que su campo habilita, no define la variable.
const AYUDA = {
  pared: "Sobre qué pared del edificio está colgado el alero. No cambia ningún coeficiente "
    + "—las figuras 5.9 no dependen de la orientación, ya son envolvente de todas las "
    + "direcciones— pero es el dato que hace falta para llevar el resultado a un plano y "
    + "es lo que el croquis usa para orientar la elevación.",
  hc: "h_c, la altura media del ALERO ADOSADO sobre el terreno. Sólo entra en la relación "
    + "h_c/h_e, que elige la banda de las figuras netas (5.9-1B / 5.9-2B). NO es la altura "
    + "con la que se evalúa q_h.",
  he: "h_e, la altura media del alero de la CUBIERTA del edificio. Vacío = se toma la "
    + "altura de alero del modelo. Se carga a mano cuando la pared que sostiene el alero no "
    + "llega al alero que gobierna —un edificio escalonado, una vertiente única—.",
  h: "⚠ La figura y q_h los elige la altura media de cubierta del EDIFICIO, h, no la del "
    + "alero: «q_h presión dinámica del artículo 1.13 evaluada a la altura media de "
    + "cubierta, h». Un alero a 3 m colgado de un edificio de 25 m se carga con la presión "
    + "dinámica de los 25 m, y con las figuras de h > 20 m.",
  pendiente: `Pendiente del alero, en tanto por uno. El art. 5.9 se aplica a aleros planos `
    + `con pendiente ≤ ${PENDIENTE_MAXIMA * 100} % (C 5.9): los datos de túnel de viento `
    + "detrás del artículo se limitan a ese caso. Por encima, el cálculo sale igual pero "
    + "queda fuera del alcance declarado y se avisa.",
  dosSuperficies: "Dos superficies físicas —cara superior y cara inferior, con un cielorraso "
    + "o un entablonado abajo— piden LAS DOS figuras: la A para las fijaciones de cada cara "
    + "y la B para la estructura. Con una sola superficie, C 5.9 deja sólo la B: no hay dos "
    + "caras cuyas fijaciones verificar por separado.",
  interpolarH: `Excepciones 1 y 2 del art. 5.9. Con ${H_CORTE} m < h ≤ ${H_EXCEPCION} m, `
    + `«como alternativa al uso de (GC_p) de la Figura 5.9-2A/B», el coeficiente puede `
    + `interpolarse linealmente entre el valor de la figura de ${H_CORTE} m y el de la de `
    + `${H_EXCEPCION} m. Da coeficientes MENORES que la figura de h > 20 m sola, así que el `
    + "defecto es no usarla.",
  vuelo: "El vuelo del alero, medido desde la pared. No entra en ningún coeficiente —el área "
    + "que lee las curvas es la efectiva de viento de cada elemento, art. 1.2— pero define "
    + "la superficie del alero y el croquis.",
  destino: "Las figuras «A» dan los coeficientes SOBRE CADA SUPERFICIE, para dimensionar las "
    + "fijaciones de la cara superior y de la inferior; las «B» dan el coeficiente NETO, "
    + "para la estructura del alero: vigas, columnas y la fijación al edificio.",
  sinGcpi: "La expresión (5.9-1) es p = q_h (GC_p) y su lista de símbolos tiene tres "
    + "entradas: NO lleva (GC_pi). Un alero adosado no encierra un recinto, así que no hay "
    + "presión interna que sumarle. La 5.3-1 —la de la envolvente del edificio— sí la lleva.",
};

const Entrada = ({ v, set, ancho = "100%" }) => (
  <input value={v ?? ""} onChange={(e) => set(e.target.value)} className="vw-in"
    style={{ width: ancho, padding: "6px 8px", border: `1px solid ${c.borde}`,
      borderRadius: 4, background: c.sup, color: c.tinta, fontSize: 13 }} />
);

const COLS = "minmax(150px, 1.8fr) minmax(150px, 1.4fr) 88px 88px 34px";

function Check({ label, v, set, ayuda }) {
  return (
    <label style={{ display: "flex", gap: t.xs, alignItems: "center", fontSize: 13,
      color: c.txt2 }}>
      <input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: c.azul, cursor: "pointer" }} />
      {label}{ayuda ? <Ayuda>{ayuda}</Ayuda> : null}
    </label>
  );
}

/** Una fila de coeficiente y presión, en los dos sentidos. */
function FilaPresion({ etiqueta, r, coef }) {
  return (
    <tr>
      <Td>{etiqueta}</Td>
      <TdN>{f2(r.gcpPos)}</TdN>
      <TdN>{f2(r.gcpNeg)}</TdN>
      <TdN>{U.n.presion(r.pPos)}</TdN>
      <TdN>{U.n.presion(r.pNeg)}</TdN>
      <Td>{r.gobiernaMinimo.pos || r.gobiernaMinimo.neg
        ? `mínimo del art. 5.2.2 en ${r.gobiernaMinimo.pos && r.gobiernaMinimo.neg
          ? "los dos sentidos" : r.gobiernaMinimo.pos ? "el sentido positivo" : "el negativo"}`
        : coef}</Td>
    </tr>
  );
}

export function AleroAdosado() {
  const { d, alero, geoN, setAlero, elementosAlero, setElementosAlero } = useProyecto();
  const cfg = d.aleroAdosado ?? {};
  const { zoom, setZoom } = useZoomCroquis(1);

  const setEl = (i) => (k) => (v) => setElementosAlero(xs =>
    xs.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const quitar = (i) => () => setElementosAlero(xs => xs.filter((_, j) => j !== i));
  const agregar = () => setElementosAlero(xs => [...xs, {
    id: nuevoId(), nombre: `Elemento ${xs.length + 1}`, tipo: TIPO_ELEMENTO.CORREA,
    L: "2.5", s: "1", area: "" }]);

  // La interpolación de las excepciones sólo tiene sentido ofrecerla donde aplica. Un
  // control que no hace nada invita a creer que sí hizo algo.
  const puedeInterpolar = geoN.h > H_CORTE && geoN.h <= H_EXCEPCION;

  return (
    <>
      <Divisor>Alero adosado a pared — art. 5.9</Divisor>

      <Card titulo="¿Hay un alero adosado?"
        desc="Otra tipología, no una zona del edificio. Un alero adosado es una estructura
          plana colgada de una pared, con su propia expresión —p = q_h (GC_p), sin presión
          interna— y sus propias figuras. Un VOLADIZO de cubierta, que es la cubierta que
          sigue de largo con la misma pendiente, no va acá: va como ubicación «voladizo» en
          la lista de elementos de arriba.">
        <Check label="El edificio tiene un alero adosado a una pared"
          v={cfg.hay} set={setAlero("hay")} />
      </Card>

      {!cfg.hay ? null : (
        <>
          {alero.avisos.map((a, i) => (
            <Aviso key={i} titulo={a.ref}
              tono={a.nivel === "error" ? "error" : a.nivel === "info" ? "info" : "aviso"}>
              {a.texto}</Aviso>
          ))}

          <Card titulo="El alero" desc="Cinco datos. Sólo dos de ellos entran en un
            coeficiente: h_c y h_e, por su relación.">
            <Campo label="Pared que lo sostiene" ayuda={AYUDA.pared}>
              <Sel v={cfg.pared} set={setAlero("pared")} w={170}
                opciones={PAREDES.map(p => [p, ETIQUETA_PARED[p]])} />
            </Campo>
            <Campo label="Ancho del alero sobre la pared" unit={U.u.longitud}
              ayuda="El frente del alero, medido sobre la pared. Define su superficie.">
              <Num v={cfg.ancho} set={setAlero("ancho")} />
            </Campo>
            <Campo label="Vuelo" unit={U.u.longitud} ayuda={AYUDA.vuelo}>
              <Num v={cfg.vuelo} set={setAlero("vuelo")} />
            </Campo>
            <Campo label="h_c — altura media del alero" unit={U.u.longitud} ayuda={AYUDA.hc}>
              <Num v={cfg.hc} set={setAlero("hc")} />
            </Campo>
            <Campo label="h_e — altura del alero de la cubierta" unit={U.u.longitud}
              ayuda={AYUDA.he}>
              <Num v={cfg.he} set={setAlero("he")} ph={`auto: ${f2(geoN.hAlero)}`} />
            </Campo>
            <Campo label="Pendiente del alero" unit="—" ayuda={AYUDA.pendiente}>
              <Num v={cfg.pendiente} set={setAlero("pendiente")} />
            </Campo>
            <div style={{ display: "flex", flexDirection: "column", gap: t.sm,
              paddingTop: t.sm }}>
              <Check label="Tiene dos superficies físicas (cara superior y cara inferior)"
                v={cfg.dosSuperficies !== false}
                set={(x) => setAlero("dosSuperficies")(x)} ayuda={AYUDA.dosSuperficies} />
              <Check
                label={`Interpolar linealmente entre ${H_CORTE} y ${H_EXCEPCION} m `
                  + `(excepciones 1 y 2)${puedeInterpolar ? "" : " — no aplica con esta h"}`}
                v={cfg.interpolarH === true} set={setAlero("interpolarH")}
                ayuda={AYUDA.interpolarH} />
            </div>
          </Card>

          <Card titulo="De dónde sale cada parámetro"
            desc="q_h y la figura los elige la altura media de cubierta del EDIFICIO. Es lo
              que más fácil se confunde con la altura del alero.">
            <Stats>
              <Stat label="h del edificio" valor={U.n.longitud(alero.h)}
                unidad={U.u.longitud} ayuda={AYUDA.h}
                sub={`${alero.h > H_CORTE ? "> " : "≤ "}${H_CORTE} m → figuras 5.9-${alero.h > H_CORTE ? "2" : "1"}`} />
              <Stat label="q_h" valor={U.n.presion(alero.qh ?? 0)} unidad={U.u.presion}
                sub={`K_zt = ${alero.Kzt.toFixed(3).replace(".", ",")} — máximo entre direcciones`} />
              <Stat label="h_c / h_e"
                valor={alero.relacion == null ? "—" : alero.relacion.toFixed(3).replace(".", ",")}
                sub={`h_c = ${f2(alero.hc)} m · h_e = ${f2(alero.he)} m`} ayuda={AYUDA.hc} />
              <Stat label="Superficie del alero" valor={U.n.area(alero.areaAlero)}
                unidad={U.u.area} sub={`${f2(alero.ancho)} × ${f2(alero.vuelo)} m`} />
              <Stat label="Figura de superficies"
                valor={alero.figuras[DESTINO.SUPERFICIES] ?? "no aplica"}
                sub={alero.dosSuperficies ? "fijaciones de cada cara"
                  : "una sola superficie: C 5.9 deja sólo la neta"} ayuda={AYUDA.destino} />
              <Stat label="Figura de presión neta"
                valor={alero.figuras[DESTINO.ESTRUCTURA]}
                sub="estructura del alero" ayuda={AYUDA.destino} />
            </Stats>
            <Campo label="Presión interna" ayuda={AYUDA.sinGcpi}>
              <span style={{ fontFamily: MONO, color: c.txt2 }}>
                (GC_pi) no interviene — expresión (5.9-1)</span>
            </Campo>
          </Card>

          <Card titulo="Croquis" desc="Las tres alturas en el mismo alzado: h del edificio,
            h_e del alero de la cubierta y h_c del alero adosado.">
            <AleroAdosadoSVG geo={geoN} zoom={zoom} setZoom={setZoom}
              alero={{ pared: alero.pared, ancho: alero.ancho, vuelo: alero.vuelo,
                hc: alero.hc, he: alero.he, pendiente: alero.pendiente,
                dosSuperficies: alero.dosSuperficies }} />
          </Card>

          <Card titulo="Elementos del alero"
            desc="El área efectiva de viento es la del art. 1.2, la misma regla del resto del
              capítulo: A = L · máx(s; L/3)."
            acciones={<Boton onClick={agregar}>Agregar elemento</Boton>}>
            <div style={{ display: "grid", gridTemplateColumns: COLS, gap: t.sm,
              padding: "0 4px 4px" }}>
              {["Nombre", "Tipo", "L / Área", "s", ""].map((h2, i) => (
                <span key={i} style={{ fontSize: 11, color: c.tenue,
                  textTransform: "uppercase", letterSpacing: .4 }}>{h2}</span>
              ))}
            </div>
            {(elementosAlero ?? []).map((el, i) => {
              const pideLS = PIDE_LS.has(el.tipo);
              return (
                <div key={el.id ?? i}
                  style={{ padding: "6px 4px", borderTop: `1px solid ${c.borde}` }}>
                  <div style={{ display: "grid", gridTemplateColumns: COLS, gap: t.sm,
                    alignItems: "center" }}>
                    <Entrada v={el.nombre} set={setEl(i)("nombre")} />
                    <Sel v={el.tipo} set={setEl(i)("tipo")} w="100%"
                      opciones={TIPOS_LISTA.map(id => [id, ETIQUETA_TIPO[id]])} />
                    {pideLS
                      ? <><Entrada v={el.L} set={setEl(i)("L")} />
                          <Entrada v={el.s} set={setEl(i)("s")} /></>
                      : <><Entrada v={el.area} set={setEl(i)("area")} />
                          <span style={{ fontSize: 12, color: c.tenue }}>m²</span></>}
                    <Boton variante="fantasma" onClick={quitar(i)}
                      title="Quitar este elemento">×</Boton>
                  </div>
                  <span style={{ fontSize: 12, color: c.tenue, fontFamily: MONO }}>
                    {alero.elementos[i]?.area?.cuenta ?? "—"}
                  </span>
                </div>
              );
            })}
            {(elementosAlero ?? []).length === 0
              ? <Nota>Sin elementos no hay presiones que mostrar: el (GC_p) se lee con el
                  área efectiva de cada uno.</Nota>
              : null}
          </Card>

          {alero.elementos.map((r, i) => (
            <Card key={r.elemento.id ?? i}
              titulo={r.elemento.nombre || `Elemento ${i + 1}`}
              desc={`A = ${U.area(r.area.A)} · área tributaria ${U.area(r.area.tributaria)}`}
              acciones={r.unaSuperficie
                ? <Badge tono="neutro">una sola superficie</Badge>
                : <Badge tono="neutro">dos superficies</Badge>}>
              {r.destinos.map((dst) => (
                <div key={dst.destino} style={{ marginBottom: t.md }}>
                  <div style={{ ...t.micro, marginBottom: 4 }}>
                    {ETIQUETA_DESTINO[dst.destino]} · Fig.{" "}
                    {dst.figuras.join(" interpolada con ")}
                    {dst.bandas.length
                      ? ` · banda ${dst.bandas.map(b => b.rango).join(" / ")}`
                      : ` · ${FIGURAS_ALERO[dst.figuras[0]].tabla}, envolvente de todo h_c/h_e`}
                  </div>
                  <Tabla minWidth={540}>
                    <thead><tr>
                      <Th>{dst.destino === DESTINO.SUPERFICIES ? "Superficie" : "Coeficiente"}</Th>
                      <Th alinear="right">
                        {FIGURAS_ALERO[dst.figuras[0]].coeficiente}+</Th>
                      <Th alinear="right">
                        {FIGURAS_ALERO[dst.figuras[0]].coeficiente}−</Th>
                      <Th alinear="right">p+ [{U.u.presion}]</Th>
                      <Th alinear="right">p− [{U.u.presion}]</Th>
                      <Th>Observación</Th>
                    </tr></thead>
                    <tbody>
                      {dst.destino === DESTINO.SUPERFICIES ? (
                        <>
                          <FilaPresion etiqueta="Cara superior" r={dst.caras[CARA.SUPERIOR]}
                            coef="el positivo es común a las dos caras" />
                          <FilaPresion etiqueta="Cara inferior" r={dst.caras[CARA.INFERIOR]}
                            coef="convención de la nota 4: el negativo se aleja de la superficie" />
                        </>
                      ) : (
                        <FilaPresion etiqueta="Presión neta" r={dst.neto}
                          coef="negativo hacia arriba, positivo hacia abajo (nota 3)" />
                      )}
                    </tbody>
                  </Tabla>
                </div>
              ))}
              {r.avisos.map((a, j) => (
                <Aviso key={j} titulo={a.ref}
                  tono={a.nivel === "error" ? "error" : a.nivel === "info" ? "info" : "aviso"}>
                  {a.texto}</Aviso>
              ))}
            </Card>
          ))}
        </>
      )}
    </>
  );
}
