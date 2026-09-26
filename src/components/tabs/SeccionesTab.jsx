// ANEXO I — SECCIONES DE FORMA UNIFORME.
//
// Es lo que falta cuando lo que hay que calcular no es un edificio ni una de las familias
// del capítulo 4, sino un ELEMENTO: un venteo, un montante, un tirante, una tubería. El
// Anexo cubre justamente eso —secciones transversales uniformes con ℓ/b < 40— y trae seis
// tablas propias.
//
// ⚠ CADA TABLA SE ELIGE MIRANDO UN DIBUJO. «Elipse b/d = 1/2» o «Sección Z con x = 0,1·b»
// no se identifican por su nombre: por eso cada familia cuelga su figura del reglamento, y
// por eso la pantalla no intenta describir las formas con palabras.
import { useProyecto } from '../../context/ProyectoContext.jsx';
import {
  TABLA_I1, TABLA_I2, TABLA_I4, TABLA_I5, TABLA_I6, TABLA_I3A, TABLA_I3B,
  VB_I1, VB_I5, ALCANCE_ANEXO,
} from '../../constants/anexo1.js';
import { FAMILIAS_ANEXO } from '../../engine/anexo1.js';
import { KD, NOTA_ALFA } from '../../constants/direccionalidad.js';
import { FIGURAS } from '../../constants/figuras.js';
import { Encabezado, Card, Campo, Num, Sel, Salida, Aviso, Nota, Tabla, Th, Td, TdN,
  Acordeon, Stat, Stats, Divisor, Figura } from '../ui.jsx';
import { c, t, SP, MONO } from '../tokens.js';
import { f, fmt } from '../../lib/formato.js';

export function SeccionesTab() {
  const { d, setAnexo, anexo: r, kdAnexo } = useProyecto();
  const a = d.anexo;
  const fam = FAMILIAS_ANEXO.find(x => x.id === a.familia) ?? FAMILIAS_ANEXO[0];
  const fig = FIGURAS[fam.fig];

  return (
    <>
      <Encabezado titulo="Secciones de forma uniforme"
        desc="Anexo I. Para estructuras o elementos con sección transversal uniforme y
          esbeltez ℓ/b < 40: cilindros, prismas, perfiles, cables y tuberías. La fuerza sale
          de F = G·C_f·K_e·A_f·q_z, con A_f = b·ℓ y q_z evaluada a la altura del baricentro." />

      {/* ⚠ ES LA ADVERTENCIA MÁS IMPORTANTE DE ESTA PANTALLA. El reglamento usa el mismo
          símbolo para dos factores distintos que multiplican la misma fuerza, y confundirlos
          no produce ningún error visible. */}
      <Aviso tono="aviso" titulo="El K_e del Anexo I NO es el K_e del artículo 1.12">
        En el cuerpo del reglamento <b>K_e</b> es el <b>factor de altitud</b>,
        e^(−0,000119·z_g), y entra en la presión dinámica. Acá es el{" "}
        <b>factor de corrección por esbeltez</b> de la Tabla I.6, que vale entre 0,7 y 1,0 y
        multiplica a la fuerza. Los dos afectan al mismo resultado: tomar uno por el otro
        deja una fuerza hasta un 30 % menor, y sigue pareciendo razonable.
      </Aviso>

      <Card titulo="Qué se está calculando">
        <Campo label="Tipo de sección" ayuda={fam.ayuda} fig={fig}>
          <Sel v={a.familia} set={setAnexo("familia")} w={320}
            opciones={FAMILIAS_ANEXO.map(x => [x.id, x.label])} />
        </Campo>
        <Nota>{fam.ayuda} <b style={{ color: c.txt }}>{fam.tabla}</b>.</Nota>

        <Campo label="Factor de direccionalidad K_d"
          ayuda="La Tabla 1.6-1 da un K_d por tipo de estructura. El Anexo I no lo menciona —arrastra la numeración de la edición anterior— pero K_d entra igual por la expresión (1.13-1) de la presión dinámica.">
          <Sel v={a.kd} set={setAnexo("kd")} w={320}
            opciones={KD.map(([k, label, kd]) => [k, `${label} · K_d = ${f(kd, 2)}`])} />
        </Campo>
        <Salida label="K_d adoptado" v={f(kdAnexo, 2)} />
        {(a.kd === "chim_redonda" || a.kd === "chim_octogonal") && <Nota>{NOTA_ALFA}</Nota>}
      </Card>

      <div style={{ display: "grid", gap: SP.md, alignItems: "start",
        gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))" }}>
        <Card titulo="Geometría">
          <Campo label="Dimensión transversal b" unit="m" fig={fig}
            ayuda="La que define cada tabla en su dibujo. ⚠ La nota de la Tabla I.4 advierte que en los perfiles b NO siempre es normal a la dirección del flujo: es la que marca la figura.">
            <Num v={a.b} set={setAnexo("b")} step="0.01" />
          </Campo>
          <Campo label="Longitud del elemento ℓ" unit="m"
            ayuda="El largo del tramo con sección uniforme. Junto con b da la esbeltez, que es de donde sale la corrección de la Tabla I.6.">
            <Num v={a.L} set={setAnexo("L")} step="0.1" />
          </Campo>
          <Campo label="Altura del baricentro z" unit="m"
            ayuda="El art. I.1 pide evaluar q_z a la altura del BARICENTRO del área A_f, no en el extremo. En un elemento vertical apoyado en el suelo es la mitad de su largo.">
            <Num v={a.z} set={setAnexo("z")} step="0.1" />
          </Campo>

          <Divisor>La fila de la tabla</Divisor>

          {a.familia === "redondeada" && (
            <Campo label="Forma" fig={FIGURAS["I.1a"]}
              ayuda="Las relaciones son b/d, con b la dimensión normal al viento y d la paralela. Una elipse achatada arrastra menos de la mitad que la misma parada.">
              <Sel v={a.filaI1} set={setAnexo("filaI1")} w={250}
                opciones={TABLA_I1.map(x => [x.id, x.label])} />
            </Campo>
          )}
          {a.familia === "aristaviva" && (
            <Campo label="Forma" fig={FIGURAS["I.2"]}
              ayuda="La orientación es media tabla: el mismo cuadrado da 2,2 de cara al viento y 1,5 de arista.">
              <Sel v={a.filaI2} set={setAnexo("filaI2")} w={250}
                opciones={TABLA_I2.map(x => [x.id, x.label])} />
            </Campo>
          )}
          {a.familia === "rectangular" && <>
            <Campo label="Dimensión paralela al viento d" unit="m" fig={FIGURAS["I.3A"]}
              ayuda="Con b da la relación d/b, que es la que entra en las Tablas I.3A y I.3B.">
              <Num v={a.d} set={setAnexo("d")} step="0.01" />
            </Campo>
            <Campo label="Inclinación respecto del viento θ" unit="°"
              ayuda="Art. I.4: con d/b > 1 y θ ≤ 15°, C_fx se mayora por [1 + (d/b)·tg θ]. Con d/b ≤ 1 no se requiere.">
              <Num v={a.theta} set={setAnexo("theta")} step="1" />
            </Campo>
          </>}
          {a.familia === "perfil" && <>
            <Campo label="Perfil" fig={FIGURAS["I.4a"]}
              ayuda="Cada dibujo trae su relación d/b, que es lo que identifica la fila. Sin la figura no hay forma de saber cuál es cuál.">
              <Sel v={a.perfil} set={setAnexo("perfil")} w={250}
                opciones={TABLA_I4.map(x => [x.id, x.label])} />
            </Campo>
            <Campo label="Ángulo de incidencia θ" unit="°"
              ayuda="Se mide SIEMPRE en sentido antihorario (art. I.5). El Anexo sólo da los ángulos tabulados y no autoriza interpolar entre ellos.">
              <Sel v={String(a.thetaPerfil)} set={setAnexo("thetaPerfil")} w={120}
                opciones={(TABLA_I4.find(x => x.id === a.perfil)?.thetas ?? [0])
                  .map(x => [String(x), `${x}°`])} />
            </Campo>
          </>}
          {a.familia === "cable" && (
            <Campo label="Tipo" fig={FIGURAS["I.4b"]}
              ayuda="El umbral de régimen acá es V_z·b = 0,6 m²/s, y la tabla no tiene tramo de interpolación: o es un régimen o es el otro.">
              <Sel v={a.filaI5} set={setAnexo("filaI5")} w={250}
                opciones={TABLA_I5.map(x => [x.id, `${x.grupo} — ${x.label}`])} />
            </Campo>
          )}
        </Card>

        <Card titulo="Resultado">
          {!r ? <Nota>Falta completar la geometría.</Nota> : <>
            <Stats min={140}>
              <Stat label="Fuerza F" valor={f(Math.abs(r.F / 1000), 3)} unidad="kN"
                ayuda="Expresión (I.1): F = G·C_f·K_e·A_f·q_z." />
              {r.Fy !== null && (
                <Stat label="Fuerza transversal F_y" valor={f(Math.abs(r.Fy / 1000), 3)} unidad="kN"
                  ayuda="Expresión (I.3). En la Tabla I.3B los valores son ±: los dos signos son casos de carga, no un rango del que se elige el peor." />
              )}
              <Stat label="Coeficiente C_f" valor={f(r.cf, 3)}
                sub={r.cfy !== null && r.cfy !== undefined ? `C_fy = ${f(r.cfy, 3)}` : undefined} />
              <Stat label="Corrección por esbeltez" valor={f(r.ke.ke, 3)}
                sub={`ℓ/b = ${f(r.esbeltez, 2)}`}
                ayuda="Tabla I.6. Al reducirse la esbeltez el aire encuentra camino alrededor de los extremos, y eso baja la fuerza promedio." />
              <Stat label="Presión dinámica" valor={f(r.q, 0)} unidad="N/m²"
                sub={`en z = ${f(r.z, 2)} m`} />
              <Stat label="Área proyectada" valor={f(r.area, 3)} unidad="m²"
                sub={`b · ℓ = ${f(r.b, 2)} × ${f(r.L, 2)}`} />
              {fam.porVzb && (
                <Stat label="V_z·b" valor={f(r.vzb, 2)} unidad="m²/s"
                  sub={r.extra?.zona ? `régimen ${r.extra.zona}` : undefined}
                  ayuda="El parámetro con el que se entra a la tabla. Es un número de Reynolds disfrazado: para aire a presión y temperatura constantes, Re es proporcional a V·b." />
              )}
            </Stats>
            {r.avisos.map((x, i) => (
              <div key={i} style={{ marginTop: SP.md }}><Aviso tono={x.tono}>{x.texto}</Aviso></div>
            ))}
          </>}
        </Card>
      </div>

      {a.familia === "perfil" && r?.extra?.filas && (
        <Card titulo="Todos los ángulos de este perfil" fig={FIGURAS["I.4a"]}
          desc="El Anexo no autoriza interpolar entre ángulos, así que lo que hay que
            dimensionar es el peor de los tabulados, no el que uno eligió.">
          <Tabla minWidth={420}>
            <thead><tr>
              <Th alinear="right">θ</Th><Th alinear="right">C_fx</Th><Th alinear="right">C_fy</Th>
              <Th alinear="right">F (kN)</Th><Th alinear="right">F_y (kN)</Th>
            </tr></thead>
            <tbody>
              {r.extra.filas.map((fila, i) => {
                const on = i === r.extra.idx;
                const fz = (cf) => Math.abs(cf * r.q * r.ke.ke * r.area * 0.85 / 1000);
                return (
                  <tr key={fila.theta}>
                    <TdN peso={on ? 700 : 400} fondo={on ? c.azulBg : undefined}>{fila.theta}°</TdN>
                    <TdN fondo={on ? c.azulBg : undefined}>
                      {fila.ambX ? "±" : ""}{f(fila.cfx, 2)}</TdN>
                    <TdN fondo={on ? c.azulBg : undefined}>
                      {fila.ambY ? "±" : ""}{f(fila.cfy, 2)}</TdN>
                    <TdN fondo={on ? c.azulBg : undefined}>{f(fz(fila.cfx), 3)}</TdN>
                    <TdN fondo={on ? c.azulBg : undefined}>{f(fz(fila.cfy), 3)}</TdN>
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
          <Nota>
            El signo de C_f es el de los ejes dibujados en la figura: un valor negativo
            significa que la componente va en sentido contrario al del eje, no que sea una
            succión. Las celdas con <b style={{ color: c.txt }}>±</b> son las que la figura
            escribe así: el signo es indeterminado y hay que verificar con los dos.
            <br /><br />
            Máximos de este perfil: |C_fx| = <b style={{ color: c.txt }}>{f(r.extra.maxCfx, 2)}</b>{" "}
            y |C_fy| = <b style={{ color: c.txt }}>{f(r.extra.maxCfy, 2)}</b>.
          </Nota>
        </Card>
      )}

      <Card titulo="Cómo se llegó a este número">
        <Tabla minWidth={640}>
          <thead><tr>
            <Th>Paso</Th><Th>Símbolo</Th><Th alinear="right">Valor</Th><Th>De dónde sale</Th>
          </tr></thead>
          <tbody>
            {(r?.traza ?? []).map((p, i) => (
              <tr key={i}>
                <Td nowrap>{p.paso}</Td>
                <td style={{ padding: "7px 10px", borderBottom: `1px solid ${c.border}`,
                  fontFamily: MONO, color: c.txt2, whiteSpace: "nowrap" }}>{p.simbolo}</td>
                <TdN>{p.texto ?? (p.valor === null || p.valor === undefined ? "—"
                  : `${f(p.valor, p.dec ?? 2)}${p.unidad ? " " + p.unidad : ""}`)}</TdN>
                <Td tono={c.txt3}><b style={{ color: c.txt2 }}>{p.ref}</b> — {p.detalle}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Card>

      <Acordeon titulo="La tabla de la que salió el coeficiente">
        {a.familia === "redondeada" && <>
          <Tabla minWidth={520}>
            <thead><tr>
              <Th>Forma de la sección <Figura fig={FIGURAS["I.1a"]} /></Th>
              <Th alinear="right">V_z·b &lt; {VB_I1[0]} m²/s</Th>
              <Th alinear="right">V_z·b &gt; {VB_I1[1]} m²/s</Th>
            </tr></thead>
            <tbody>
              {TABLA_I1.map(x => {
                const on = x.id === a.filaI1;
                return (
                  <tr key={x.id}>
                    <Td peso={on ? 600 : 400} fondo={on ? c.azulBg : undefined}>{x.label}</Td>
                    <TdN fondo={on ? c.azulBg : undefined}>{f(x.cf[0], 1)}</TdN>
                    <TdN fondo={on ? c.azulBg : undefined}>{f(x.cf[1], 1)}</TdN>
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
          <Nota>
            Tabla I.1. Entre {VB_I1[0]} y {VB_I1[1]} m²/s se interpola linealmente. Las
            relaciones son <b style={{ color: c.txt }}>b/d</b>, con b normal al viento y d
            paralela: una elipse achatada arrastra menos de la mitad que la misma parada, y
            leerlas al revés intercambia las dos filas sin que el resultado lo delate.
          </Nota>
        </>}
        {a.familia === "aristaviva" && <>
          <Tabla minWidth={420}>
            <thead><tr>
              <Th>Forma de la sección <Figura fig={FIGURAS["I.2"]} /></Th>
              <Th alinear="right">C_f</Th>
            </tr></thead>
            <tbody>
              {TABLA_I2.map(x => {
                const on = x.id === a.filaI2;
                return (
                  <tr key={x.id}>
                    <Td peso={on ? 600 : 400} fondo={on ? c.azulBg : undefined}>{x.label}</Td>
                    <TdN fondo={on ? c.azulBg : undefined}>{f(x.cf, 2)}</TdN>
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
          <Nota>
            Tabla I.2. Un solo valor: el art. I.3 aclara que las secciones de aristas vivas
            son <b style={{ color: c.txt }}>independientes del número de Reynolds</b>, porque
            el punto de desprendimiento lo fija la arista y no la capa límite.
          </Nota>
        </>}
        {a.familia === "rectangular" && <>
          <div style={{ display: "grid", gap: SP.md,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <Tabla minWidth={200}>
              <thead><tr><Th>d/b <Figura fig={FIGURAS["I.3A"]} /></Th>
                <Th alinear="right">C_fx</Th></tr></thead>
              <tbody>{TABLA_I3A.map(([db, cf], i) => (
                <tr key={db}><Td>{i === TABLA_I3A.length - 1 ? "≥ " : ""}{f(db, db < 1 ? 2 : 0)}</Td>
                  <TdN peso={cf === 3.0 ? 700 : 400}>{f(cf, 1)}</TdN></tr>
              ))}</tbody>
            </Tabla>
            <Tabla minWidth={200}>
              <thead><tr><Th>d/b <Figura fig={FIGURAS["I.3B"]} /></Th>
                <Th alinear="right">C_fy</Th></tr></thead>
              <tbody>{TABLA_I3B.map(([db, cf], i) => (
                <tr key={db}><Td>{i === TABLA_I3B.length - 1 ? "≥ " : ""}{f(db, db % 1 ? 1 : 0)}</Td>
                  <TdN>± {f(cf, 1)}</TdN></tr>
              ))}</tbody>
            </Tabla>
          </div>
          <Nota>
            <b style={{ color: c.txt }}>El máximo de C_fx no está en el cuadrado</b> sino
            alrededor de d/b = 0,65, donde llega a 3,0 —un 36 % más que el 2,2 de la sección
            cuadrada—. La nota 1 lo atribuye a Nakaguchi y asoc. (1968).
            <br /><br />
            C_fy baja y vuelve a subir: es la firma de la excitación transversal. Sus valores
            son máximos para θ &lt; 20°, y la nota 3 es explícita en que para direcciones más
            oblicuas hace falta información más detallada o el consejo de especialistas.
          </Nota>
        </>}
        {a.familia === "cable" && <>
          <Tabla minWidth={460}>
            <thead><tr>
              <Th>Tipo</Th><Th>Superficie</Th>
              <Th alinear="right">V_z·b &lt; {f(VB_I5, 1)}</Th>
              <Th alinear="right">V_z·b ≥ {f(VB_I5, 1)}</Th>
            </tr></thead>
            <tbody>
              {TABLA_I5.map(x => {
                const on = x.id === a.filaI5;
                return (
                  <tr key={x.id}>
                    <Td tono={c.txt2} fondo={on ? c.azulBg : undefined}>{x.grupo}</Td>
                    <Td peso={on ? 600 : 400} fondo={on ? c.azulBg : undefined}>{x.label}</Td>
                    <TdN fondo={on ? c.azulBg : undefined}>{f(x.bajo, 2)}</TdN>
                    <TdN fondo={on ? c.azulBg : undefined}>{f(x.alto, 2)}</TdN>
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
          <Nota>
            Tabla I.5. El umbral acá es <b style={{ color: c.txt }}>0,6 m²/s</b> y no el 4 y
            10 de la Tabla I.1, y <b style={{ color: c.txt }}>no hay tramo de
            interpolación</b>: la tabla da dos regímenes y nada en el medio.
          </Nota>
        </>}
        {a.familia === "perfil" && (
          <Nota>
            Tabla I.4, nueve secciones con su θ medido en sentido antihorario. La tabla
            completa de este perfil está más arriba, con la fila activa resaltada.
            <br /><br />
            La nota de la tabla advierte que <b style={{ color: c.txt }}>la dimensión b no
            siempre es normal a la dirección del flujo</b>: A_f = b·ℓ se arma con la b que
            marca el dibujo de cada perfil, no con la proyección sobre el plano normal al
            viento. Los datos vienen de las normas suizas SIA Nr.160 de 1956.
          </Nota>
        )}
      </Acordeon>

      <Acordeon titulo="Corrección por esbeltez — Tabla I.6">
        <Tabla minWidth={280}>
          <thead><tr><Th>ℓ/b</Th><Th alinear="right">K_e</Th></tr></thead>
          <tbody>{TABLA_I6.map(([e, k], i) => {
            const on = r && ((i === 0 && r.esbeltez <= e)
              || (i === TABLA_I6.length - 1 && r.esbeltez >= e));
            return (
              <tr key={e}>
                <Td peso={on ? 600 : 400} fondo={on ? c.azulBg : undefined}>
                  {i === TABLA_I6.length - 1 ? `${e} o más` : e}</Td>
                <TdN fondo={on ? c.azulBg : undefined}>{f(k, 1)}</TdN>
              </tr>
            );
          })}</tbody>
        </Tabla>
        <Nota>
          «Cuando la esbeltez se reduce se facilita el flujo de aire alrededor de sus
          extremos. Este trayecto adicional reduce la magnitud de la fuerza promedio
          actuante.» Por debajo de ℓ/b = 8 la tabla no da valores:{" "}
          <b style={{ color: c.txt }}>la app adopta el 0,7 de su primera fila y lo declara</b>,
          en vez de extrapolar —la tendencia es decreciente, así que estirarla daría una
          fuerza menor, que es el lado inseguro justo donde el reglamento se calló—.
          <br /><br />
          El art. I.1 acota el Anexo a ℓ/b &lt; {ALCANCE_ANEXO.esbeltezMax}.
        </Nota>
      </Acordeon>
    </>
  );
}
