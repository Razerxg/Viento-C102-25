// CAPÍTULO 4, ART. 4.5.2 — SILOS, TANQUES Y RECIPIENTES CILÍNDRICOS VERTICALES CERRADOS.
//
// El reglamento le da a esto su PROPIA tabla de pasos, la 4.1-2, distinta de la 4.1-1 de
// los demás accesorios, y por eso es su propia pantalla. La diferencia de fondo: un silo
// SÍ está techado, así que vuelve a aparecer la presión interna —que en una pared libre o
// una torre no existe—, y el resultado no es una fuerza sino un arrastre global MÁS un
// mapa de presiones sobre el techo y, si está elevado, sobre el fondo.
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { CERRAMIENTOS } from '../../constants/presionInterna.js';
import { KD, NOTA_ALFA } from '../../constants/direccionalidad.js';
import { CF_SILO_GRUPO, CP_TECHO_SILO, CF_SILO_AISLADO, SILO_ALCANCE } from '../../constants/cap4.js';
import { Encabezado, Card, Campo, Num, Sel, Salida, Aviso, Nota, Tabla, Th, Td, TdN,
  Acordeon, Stat, Stats, Divisor } from '../ui.jsx';
import { c, t, SP, MONO } from '../tokens.js';
import { FIGURAS } from '../../constants/figuras.js';
import { f, fmt } from '../../lib/formato.js';

function Check({ label, v, set, ayuda }) {
  return (
    <Campo label={label} ayuda={ayuda}>
      <input type="checkbox" checked={!!v} onChange={e => set(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: c.azul, cursor: "pointer" }} />
    </Campo>
  );
}

const MODO = {
  aislado: "aislado", agrupado: "agrupado", intermedio: "intermedio — se interpola",
};

export function SilosTab() {
  const { d, setSilo, silo: r, kdSilo, G } = useProyecto();
  const s = d.silo;
  if (!r) return null;

  return (
    <>
      <Encabezado titulo="Silos, tanques y recipientes cilíndricos"
        desc="Art. 4.5.2, con su propia tabla de pasos —la 4.1-2— y su propio alcance:
          h ≤ 40 m, D ≤ 40 m y 0,25 ≤ H/D ≤ 4. A diferencia de una pared libre o una torre,
          un silo está techado, así que la presión interna vuelve a entrar en el cálculo del
          techo y del fondo." />

      <div style={{ display: "grid", gap: SP.md, alignItems: "start",
        gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))" }}>
        {/* La Figura 4.5-4 es la que distingue H de h y define C. Sin ella, «altura del
            cilindro» y «altura media» se cargan intercambiadas con toda naturalidad. */}
        <Card titulo="Geometría" fig={FIGURAS["4.5-4"]}>
          <Campo label="Diámetro D" unit="m">
            <Num v={s.D} set={setSilo("D")} />
          </Campo>
          <Campo label="Altura del cilindro H" unit="m"
            ayuda="De la parte SÓLIDA del cilindro, sin el techo. Con D fija la esbeltez H/D, que es lo que gobierna el ancho de la Zona 1 y el arrastre del grupo.">
            <Num v={s.H} set={setSilo("H")} />
          </Campo>
          <Campo label="Ángulo del techo θ" unit="°"
            ayuda="Por debajo de 10° el techo se zonifica según H/D; entre 10° y 30° las zonas son fijas en 0,6D y 0,4D. Por encima de 30° la Figura 4.5-5 deja de aplicar.">
            <Num v={s.theta} set={setSilo("theta")} step="1" />
          </Campo>

          <Divisor>Direccionalidad</Divisor>
          {/* ⚠ SU PROPIO K_d, INDEPENDIENTE DEL DE ACCESORIOS. Un silo cilíndrico va por la
              fila de chimeneas y tanques redondos, K_d = 1,00, no por el 0,85 del edificio
              ni por el del cartel que se haya estado mirando en la otra pantalla. */}
          <Campo label="Factor de direccionalidad K_d"
            ayuda="La Tabla 1.6-1 da un K_d por tipo de estructura. Un recipiente cilíndrico vertical va por la fila de chimeneas y tanques redondos: K_d = 1,00, no el 0,85 del edificio. Sólo vale con las combinaciones del Apéndice B.">
            <Sel v={s.kd} set={setSilo("kd")} w={300}
              opciones={KD.map(([k, label, kd]) => [k, `${label} · K_d = ${f(kd, 2)}`])} />
          </Campo>
          <Salida label="K_d adoptado" v={f(kdSilo, 2)} />
          {(s.kd === "chim_redonda" || s.kd === "chim_octogonal") && <Nota>{NOTA_ALFA}</Nota>}

          <Divisor>Agrupamiento</Divisor>
          <Campo label="Separación entre centros" unit="D"
            ayuda="En diámetros. Menos de 1,25 D son agrupados; más de 2 D son aislados; entre medio el reglamento manda interpolar. Un valor grande equivale a un silo solo.">
            <Num v={s.separacion} set={setSilo("separacion")} step="0.05" />
          </Campo>
          <Salida label="Régimen" v={MODO[r.reg.modo] ?? r.reg.modo} />

          <Divisor>Elevación</Divisor>
          <Check label="Separado del suelo" v={s.elevado} set={setSilo("elevado")}
            ayuda="Art. 4.5.2.3: cuando el silo está elevado sobre columnas, la cara externa del fondo queda expuesta al viento y hay que verificarla con Cp = 0,8 y −0,6." />
          {s.elevado && (
            <Campo label="Espaciamiento al suelo C" unit="m"
              ayuda="Del suelo al fondo del cilindro. Con C ≤ h/3 el Cp se interpola linealmente hacia cero: un fondo casi apoyado deja de estar expuesto. El art. 4.5.2.1 además exige C ≤ H.">
              <Num v={s.C} set={setSilo("C")} step="0.1" />
            </Campo>
          )}
        </Card>

        <Card titulo="Arrastre global de las paredes">
          <Stats min={130}>
            <Stat label="Fuerza F" valor={f(Math.abs(r.Fpared / 1000), 2)} unidad="kN"
              ayuda="F = q·G·C_f·A_f sobre la proyección D·H, expresión (4.5-1)." />
            <Stat label="Coeficiente C_f" valor={f(r.paredCf.cf, 3)}
              sub={`para usar con ${r.paredCf.usarCon}`}
              ayuda={r.reg.modo === "aislado"
                ? "Art. 4.5.2.1: se admite C_f = 0,63 sobre la proyección D·H cuando H/D está entre 0,25 y 4. Sale de Standards Australia y queda cerca del valor de superficie lisa de la Figura 4.5-1."
                : "Figura 4.5-6. El comentario mide un arrastre 65 % mayor sobre el cilindro del medio de una fila de tres separados 1,25 D."} />
            <Stat label="Presión dinámica" valor={f(r.qPared, 0)} unidad="N/m²"
              sub={`en z = ${f(r.zPared, 2)} m`} />
            <Stat label="Área proyectada" valor={f(r.areaPared, 2)} unidad="m²"
              sub={`D · H = ${f(r.D, 1)} × ${f(r.H, 1)}`} />
          </Stats>
          <Nota>{r.reg.motivo}</Nota>

          {/* ⚠ EL AISLADO Y EL AGRUPADO NO EVALÚAN q A LA MISMA ALTURA, y eso no se ve en
              el número: el aislado usa q_z al centroide del cilindro y el agrupado q_h. */}
          <Nota>
            El silo {r.reg.modo === "aislado" ? "aislado usa q_z evaluada al centroide del "
              + "cilindro" : "agrupado usa q_h, evaluada a la altura media de cubierta"}. No
            es un detalle de presentación: cambia la altura a la que se entra en la Tabla
            1.13-1 y con ella el coeficiente de exposición.
          </Nota>
          {r.avisos.map((a, i) => (
            <div key={i} style={{ marginTop: SP.sm }}><Aviso tono={a.tono}>{a.texto}</Aviso></div>
          ))}
        </Card>
      </div>

      <Card titulo="Presiones sobre el techo"
        fig={r.reg.modo === "agrupado" ? FIGURAS["4.5-6"] : FIGURAS["4.5-5"]}
        desc="Expresión (4.5-4): p = q_h·(G·C_p − (GC_pi)). Los ensayos en túnel sólo
          observaron succiones en estos techos, así que los dos coeficientes son negativos.">
        <Tabla minWidth={560}>
          <thead><tr>
            <Th>Zona</Th><Th alinear="right">Ancho (m)</Th><Th alinear="right">C_p</Th>
            <Th alinear="right">p con +GC_pi (N/m²)</Th><Th alinear="right">p con −GC_pi (N/m²)</Th>
          </tr></thead>
          <tbody>
            {r.techo.map(z => (
              <tr key={z.zona}>
                <Td>{z.zona}</Td>
                <TdN>{f(z.ancho, 2)}</TdN>
                <TdN>{f(z.cp, 2)}</TdN>
                <TdN>{f(z.conInternaPos, 0)}</TdN>
                <TdN>{f(z.conInternaNeg, 0)}</TdN>
              </tr>
            ))}
          </tbody>
        </Tabla>
        <Nota>
          Zonas de la {r.reg.modo === "agrupado" ? "Figura 4.5-6" : "Figura 4.5-5"}:{" "}
          {r.zonas?.inclinado
            ? "con 10° < θ < 30° la Zona 1 es fija en 0,6·D y la Zona 2 en 0,4·D."
            : r.reg.modo === "agrupado"
              ? "con θ < 10° el techo del grupo se parte por la mitad, 0,5·D y 0,5·D."
              : `con θ < 10° el ancho de la Zona 1 depende de H/D (${r.zonas?.expr}), interpolable linealmente.`}
          {" "}Las dos últimas columnas son los <b style={{ color: c.txt }}>dos casos de
          presión interna</b> que exige la nota 3 de la Tabla 1.11-1, con GC_pi = ±{f(Math.abs(r.gcpi), 2)}{" "}
          ({CERRAMIENTOS.find(x => x.id === d.cerramiento)?.label.toLowerCase() ?? "—"}), que
          se toma de la clasificación declarada en Sitio.
        </Nota>
      </Card>

      {r.fondo && (
        <Card titulo="Presiones sobre el fondo"
          desc="Art. 4.5.2.3. Cuando el silo está elevado, la cara externa del fondo queda
            expuesta y se verifica con la misma q_h del techo.">
          <Tabla minWidth={520}>
            <thead><tr>
              <Th>Caso</Th><Th alinear="right">C_p</Th>
              <Th alinear="right">p con +GC_pi (N/m²)</Th><Th alinear="right">p con −GC_pi (N/m²)</Th>
            </tr></thead>
            <tbody>
              {r.fondo.map(x => (
                <tr key={x.caso}>
                  <Td>{x.caso}</Td><TdN>{f(x.cp, 3)}</TdN>
                  <TdN>{f(x.conInternaPos, 0)}</TdN><TdN>{f(x.conInternaNeg, 0)}</TdN>
                </tr>
              ))}
            </tbody>
          </Tabla>
          <Nota>
            Los C_p de partida son <b style={{ color: c.txt }}>0,8 y −0,6</b>, y son{" "}
            <b style={{ color: c.txt }}>dos casos, no un rango</b>: uno empuja el fondo hacia
            arriba y el otro lo succiona hacia abajo, y hay que verificar con los dos.
            {r.fondoInfo?.reducido && <> Acá C/h = {f(r.fondoInfo.rel, 3)} &lt; 1/3, así que
              se interpolaron linealmente hacia cero según C/h: un fondo casi apoyado deja de
              estar expuesto al viento.</>}
          </Nota>
        </Card>
      )}

      <Card titulo="Cómo se llegó a estos números">
        <Tabla minWidth={640}>
          <thead><tr>
            <Th>Paso</Th><Th>Símbolo</Th><Th alinear="right">Valor</Th><Th>De dónde sale</Th>
          </tr></thead>
          <tbody>
            {r.traza.map((p, i) => (
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

      <Acordeon titulo="Los coeficientes de las Figuras 4.5-5 y 4.5-6">
        <Tabla minWidth={460}>
          <thead><tr>
            <Th>Caso</Th><Th alinear="right">C_f de paredes</Th>
            <Th alinear="right">C_p Zona 1</Th><Th alinear="right">C_p Zona 2</Th>
          </tr></thead>
          <tbody>
            <tr>
              <Td>Aislado (separación &gt; 2 D)</Td>
              <TdN>{f(CF_SILO_AISLADO, 2)}</TdN>
              <TdN>{f(CP_TECHO_SILO.zona1, 1)}</TdN>
              <TdN>{f(CP_TECHO_SILO.zona2, 1)}</TdN>
            </tr>
            {CF_SILO_GRUPO.map(x => (
              <tr key={x.hd}>
                <Td>Agrupado, H/D {x.nota ?? `= ${x.hd}`}</Td>
                <TdN>{f(x.cf, 1)}</TdN>
                <Td tono={c.txt3} nowrap>ver abajo</Td><Td tono={c.txt3} nowrap>ver abajo</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
        <Nota>
          <b style={{ color: c.txt }}>C_p del techo del grupo (Figura 4.5-6):</b> con θ &lt; 10°
          y H/D ≤ 0,5 vale −0,9 y −0,5; con H/D ≥ 1,0 vale −1,3 y −0,7, interpolando entre
          medio; con 10° &lt; θ &lt; 30° y H/D ≤ 4 vale −1,0 y −0,6.
          <br /><br />
          Alcance del art. 4.5.2: h ≤ {SILO_ALCANCE.hMax} m, D ≤ {SILO_ALCANCE.dMax} m y{" "}
          {f(SILO_ALCANCE.hdMin, 2)} ≤ H/D ≤ {f(SILO_ALCANCE.hdMax, 0)}. Fuera de ahí la app
          lo dice en vez de estirar los coeficientes.
        </Nota>
      </Acordeon>

      <Acordeon titulo="Paneles solares — por qué no están">
        <div style={{ ...t.body, lineHeight: 1.75 }}>
          Los artículos <b style={{ color: c.txt }}>4.5.3, 4.5.4 y 4.5.5</b> —paneles solares
          en techos y montados en el terreno— <b style={{ color: c.txt }}>no están
          implementados</b>, y no por falta de tiempo.
          <br /><br />
          Sus coeficientes no están tabulados: las Figuras 4.5-7, 4.5-10 y 4.5-11 son{" "}
          <b style={{ color: c.txt }}>once gráficos de curvas</b> sobre ejes logarítmicos, y
          el reglamento sólo rotula unos pocos valores de arranque y de cola. Sacar un valor
          intermedio exige digitalizar la curva de un escaneo, y un coeficiente leído a ojo
          de un gráfico da una presión plausible y un cálculo equivocado que ningún control
          de ingeniería detecta. El art. 4.5.4 además necesita el (GC_p) de componentes y
          revestimientos del Capítulo 5, que tampoco está en el repositorio.
          <br /><br />
          Lo que sí está en el motor, porque el reglamento lo da como expresión cerrada, son
          los factores de ajuste de la expresión (4.5-6): γ_p = mín(1,2 ; 0,9 + h_pt/h),
          γ_c = máx(0,6 + 0,06·L_p ; 0,8), γ_E = 1,5 en paneles expuestos y 1,0 en el resto,
          el área normalizada A_n, la frecuencia reducida N_s de (4.5-12), y γ_a de la Figura
          4.5-8 —que es la única curva de la serie transcribible exacto, porque sus dos
          quiebres caen sobre líneas de grilla, en A = 1 m² y A = 10 m²—.
        </div>
      </Acordeon>
    </>
  );
}
