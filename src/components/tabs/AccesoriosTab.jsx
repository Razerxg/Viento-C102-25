// CAPÍTULO 4 — ACCESORIOS DE EDIFICIOS Y OTRAS ESTRUCTURAS (Tabla 4.1-1).
//
// Cinco familias con un mismo esqueleto —elegir el C_f, elegir el área, evaluar q a la
// altura que corresponda— y formularios distintos. El selector de familia gobierna qué
// campos aparecen: mostrarlos todos a la vez haría que la mitad no aplicara nunca, y
// esconderlos detrás de un acordeón obligaría a adivinar cuáles son los de uno.
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { FAMILIAS } from '../../engine/otrasEstructuras.js';
import { CF_CHIMENEA, CF_RETICULADO, CF_TORRE, CF_CARTEL_AB, BS_CARTEL, SH_CARTEL,
  CASO_C_ESQUINA } from '../../constants/cap4.js';
import { KD, NOTA_ALFA } from '../../constants/direccionalidad.js';
import { CroquisAccesorio, PlantaCasoC } from '../svg/CroquisAccesorio.jsx';
import { Encabezado, Card, Campo, Num, Sel, Salida, Aviso, Nota, Tabla, Th, Td, TdN,
  Acordeon, Stat, Stats, Divisor } from '../ui.jsx';
import { c, t, SP, MONO } from '../tokens.js';
import { f, fmt } from '../../lib/formato.js';

// Casilla de verificación con el mismo cuerpo y color que el resto del formulario. El
// `<input type=checkbox>` pelado se ve como de otra aplicación al lado de los selects.
function Check({ label, v, set, ayuda }) {
  return (
    <Campo label={label} ayuda={ayuda}>
      <input type="checkbox" checked={!!v} onChange={e => set(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: c.azul, cursor: "pointer" }} />
    </Campo>
  );
}

export function AccesoriosTab() {
  const { d, setCap4, accesorio, kdCap4, cap4Kd, sitio, G } = useProyecto();
  const { tema } = useUi();
  const cp = d.cap4;
  const fam = FAMILIAS.find(x => x.id === cp.familia) ?? FAMILIAS[0];
  const r = accesorio;

  const datosCroquis = {
    B: cp.B, s: cp.s, h: cp.h, D: cp.Dchim, Bedif: cp.Bedif, hedif: cp.hedif, Af: cp.Af,
    ...(cp.familia === "chimenea" ? { h: cp.hChim } : {}),
    ...(cp.familia === "torre" ? { h: cp.hTorre, B: cp.BTorre } : {}),
  };

  return (
    <>
      <Encabezado titulo="Accesorios y otras estructuras"
        desc="Capítulo 4, procedimiento direccional. Acá no se reparten presiones sobre las
          superficies de un edificio: se calcula una FUERZA resultante sobre un objeto que
          no tiene interior, así que no hay presión interna que aplicar. El trabajo está en
          elegir bien el coeficiente de fuerza y en saber a qué altura se evalúa q." />

      <Card titulo="Qué se está calculando">
        <Campo label="Tipo de estructura" ayuda={fam.ayuda}>
          <Sel v={cp.familia} set={setCap4("familia")} w={300}
            opciones={FAMILIAS.map(x => [x.id, x.label])} />
        </Campo>
        <Nota>{fam.ayuda} <b style={{ color: c.txt }}>{fam.ref}</b> · expresión {fam.expr}.</Nota>

        {/* ⚠ EL K_d ES POR TIPO DE ESTRUCTURA Y NO ES 0,85 PARA TODAS. Va acá, junto al
            selector de familia, y no escondido en Sitio: es la decisión que más fácil se
            arrastra del edificio sin querer. */}
        <Campo label="Factor de direccionalidad K_d"
          ayuda="La Tabla 1.6-1 da un K_d por tipo de estructura. Una chimenea redonda usa 1,00 y una cuadrada 0,90; adoptar el 0,85 del edificio baja la carga un 15 % sin justificación. Sólo vale con las combinaciones del Apéndice B.">
          <Sel v={cp.kd} set={setCap4("kd")} w={300}
            opciones={[["", `Por defecto de la familia — ${cap4Kd}`],
              ...KD.map(([k, label, kd]) => [k, `${label} · K_d = ${f(kd, 2)}`])]} />
        </Campo>
        <Salida label="K_d adoptado" v={f(kdCap4, 2)} />
        {(cap4Kd === "chim_redonda" || cap4Kd === "chim_octogonal") && (
          <Nota>{NOTA_ALFA}</Nota>
        )}
      </Card>

      <div style={{ display: "grid", gap: SP.md, alignItems: "start",
        gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))" }}>
        <Card titulo="Geometría">
          {(cp.familia === "cartel_lleno" || cp.familia === "cartel_abierto") && <>
            <Campo label="Ancho del cartel B" unit="m"
              ayuda="Dimensión horizontal. Junto con s fija la relación de aspecto B/s, que es la columna de la Figura 4.4-1.">
              <Num v={cp.B} set={setCap4("B")} />
            </Campo>
            <Campo label="Alto del cartel s" unit="m"
              ayuda="Dimensión vertical de la superficie, no la altura total al suelo.">
              <Num v={cp.s} set={setCap4("s")} />
            </Campo>
            <Campo label="Altura del borde superior h" unit="m"
              ayuda="Del suelo al borde SUPERIOR. Con s = h el cartel apoya de forma continua en el suelo; con s < h queda separado, y el coeficiente sube.">
              <Num v={cp.h} set={setCap4("h")} />
            </Campo>
          </>}

          {cp.familia === "cartel_lleno" && <>
            <Divisor>Reducciones admitidas</Divisor>
            <Campo label="Relación de área sólida ε" unit=""
              ayuda="Nota 1: con aberturas de MENOS del 30 % el cartel sigue siendo lleno, pero se admite reducir C_f por el factor 1−(1−ε)^1,5. Vacío = sin aberturas.">
              <Num v={cp.eps} set={setCap4("eps")} step="0.01" ph="sin aberturas" />
            </Campo>
            <Check label="Doble cara con lados cerrados" v={cp.dobleCara} set={setCap4("dobleCara")}
              ayuda="Nota 2: habilita las reducciones por espesor. Requiere declarar el espesor t." />
            {cp.dobleCara && (
              <Campo label="Espesor del cartel t" unit="m"
                ayuda="De él salen R_mín = t/mín(B,s) y R_máx = t/máx(B,s), que condicionan las dos reducciones de la nota 2.">
                <Num v={cp.t} set={setCap4("t")} step="0.01" />
              </Campo>
            )}
            <Campo label="Esquina de retorno L_r" unit="m"
              ayuda="Sólo para el caso C. Una esquina de retorno rompe el flujo que produce el pico de succión en el borde de barlovento y reduce el C_f de la primera región. Vacío = sin esquina.">
              <Num v={cp.Lr} set={setCap4("Lr")} step="0.1" ph="sin esquina" />
            </Campo>
          </>}

          {cp.familia === "cartel_abierto" && <>
            <Campo label="Relación de área sólida ε" unit=""
              ayuda="Área sólida sobre área bruta. Con 30 % o más de aberturas —o sea ε ≤ 0,7— el cartel es abierto y va por la Figura 4.5-2.">
              <Num v={cp.epsAb} set={setCap4("epsAb")} step="0.01" />
            </Campo>
            <Campo label="Tipo de miembro"
              ayuda="Los miembros circulares arrastran bastante menos que los de caras planas, y encima cambian según el régimen D·√q_z.">
              <Sel v={cp.miembro} set={setCap4("miembro")} w={200}
                opciones={[["plano", "De caras planas"], ["circular", "Circulares"]]} />
            </Campo>
            {cp.miembro === "circular" && (
              <Campo label="Diámetro del miembro D" unit="m"
                ayuda="De un miembro redondo típico. Decide, junto con q_z, si el cilindro está en régimen subcrítico o supercrítico.">
                <Num v={cp.Dmiembro} set={setCap4("Dmiembro")} step="0.01" />
              </Campo>
            )}
          </>}

          {cp.familia === "chimenea" && <>
            <Campo label="Altura h" unit="m">
              <Num v={cp.hChim} set={setCap4("hChim")} />
            </Campo>
            <Campo label="Diámetro o menor lado D" unit="m"
              ayuda="Diámetro en las circulares; menor dimensión horizontal en las cuadradas, hexagonales y octogonales.">
              <Num v={cp.Dchim} set={setCap4("Dchim")} />
            </Campo>
            <Campo label="Sección"
              ayuda="Las dos filas circulares no son alternativas de criterio: las separa el valor de D·√q_z, y la app avisa si la elegida contradice al cálculo.">
              <Sel v={cp.filaChimenea} set={setCap4("filaChimenea")} w={250}
                opciones={CF_CHIMENEA.map(x => [x.id,
                  `${x.seccion}${x.detalle ? ` (${x.detalle})` : ""} · ${x.superficie}`])} />
            </Campo>
          </>}

          {cp.familia === "torre" && <>
            <Campo label="Altura del segmento h" unit="m"
              ayuda="El reglamento trabaja por SEGMENTOS de torre: ε y el área se declaran para el tramo en consideración, no para la torre entera.">
              <Num v={cp.hTorre} set={setCap4("hTorre")} />
            </Campo>
            <Campo label="Ancho de la cara B" unit="m">
              <Num v={cp.BTorre} set={setCap4("BTorre")} />
            </Campo>
            <Campo label="Relación de área sólida ε" unit=""
              ayuda="De UNA cara, para el segmento en consideración (nota 1). No es el ε del conjunto de las cuatro caras.">
              <Num v={cp.epsTorre} set={setCap4("epsTorre")} step="0.01" />
            </Campo>
            <Campo label="Sección">
              <Sel v={cp.seccionTorre} set={setCap4("seccionTorre")} w={180}
                opciones={Object.entries(CF_TORRE).map(([k, x]) => [k, x.label])} />
            </Campo>
            <Check label="Miembros redondeados" v={cp.redondos} set={setCap4("redondos")}
              ayuda="Nota 3: se admite multiplicar por 0,51ε² + 0,57, con tope en 1,0." />
            <Check label="Viento según la diagonal" v={cp.diagonal} set={setCap4("diagonal")}
              ayuda="Nota 4: sólo en torres de sección cuadrada. Multiplica por 1 + 0,75ε, con tope en 1,2." />
          </>}

          {cp.familia === "equipo" && <>
            <Campo label="Ancho del edificio B" unit="m"
              ayuda="Del EDIFICIO que soporta al equipo, no del equipo. Los límites de reducción del (GC_r) se miden contra B·h y B·L.">
              <Num v={cp.Bedif} set={setCap4("Bedif")} />
            </Campo>
            <Campo label="Altura media del edificio h" unit="m"
              ayuda="Acá se evalúa q_h, que es la presión dinámica que usan las dos expresiones.">
              <Num v={cp.hedif} set={setCap4("hedif")} />
            </Campo>
            <Campo label="Largo del edificio L" unit="m">
              <Num v={cp.Ledif} set={setCap4("Ledif")} />
            </Campo>
            <Campo label="Área vertical del equipo A_f" unit="m²"
              ayuda="Área proyectada sobre un plano normal a la dirección del viento. Es la que entra en (4.5-2) para la fuerza lateral.">
              <Num v={cp.Af} set={setCap4("Af")} step="0.1" />
            </Campo>
            <Campo label="Área horizontal del equipo A_r" unit="m²"
              ayuda="Área proyectada en planta. Es la que entra en (4.5-3) para el levantamiento.">
              <Num v={cp.Ar} set={setCap4("Ar")} step="0.1" />
            </Campo>
          </>}
        </Card>

        <Card titulo="Resultado">
          {!r || r.F === null
            ? <Nota>Falta completar la geometría, o el coeficiente no está definido para
                estos datos.</Nota>
            : <>
              <Stats min={130}>
                {cp.familia === "equipo" ? <>
                  <Stat label="Fuerza lateral F_h" valor={f(Math.abs(r.F / 1000), 2)} unidad="kN"
                    ayuda="Expresión (4.5-2). Se aplica a una altura sobre el techo igual o mayor que la del centroide del área proyectada." />
                  <Stat label="Levantamiento F_v"
                    valor={f(Math.abs(r.q * r.extra.ver.gcr * r.extra.Ar / 1000), 2)} unidad="kN"
                    ayuda="Expresión (4.5-3). Los dos estudios que cita el comentario midieron fuerzas de levantamiento altas sobre el equipamiento de azotea." />
                </> : <>
                  <Stat label="Fuerza de viento F" valor={f(Math.abs(r.F / 1000), 2)} unidad="kN" />
                  <Stat label="Coeficiente C_f" valor={f(r.cf, 3)} />
                </>}
                <Stat label="Presión dinámica" valor={f(r.q, 0)} unidad="N/m²"
                  sub={`evaluada en z = ${f(r.z, 2)} m`}
                  ayuda={`q se evalúa en el ${r.etiquetaZ}. No es lo mismo en las dos expresiones del capítulo: (4.4-1) usa el borde superior del cartel y (4.5-1) el centroide del área proyectada.`} />
                <Stat label="Área" valor={f(r.area, 2)} unidad="m²" />
              </Stats>

              {cp.familia === "cartel_lleno" && r.extra?.excentricidad > 0 && (
                <div style={{ marginTop: SP.md }}>
                  <Nota>
                    <b style={{ color: c.txt }}>Caso A:</b> la resultante actúa perpendicular
                    a la cara en el centro geométrico.{" "}
                    <b style={{ color: c.txt }}>Caso B:</b> la misma fuerza, desplazada{" "}
                    <b style={{ color: c.txt }}>{f(r.extra.excentricidad, 2)} m</b> hacia el
                    borde de barlovento
                    {r.extra.red?.excentricidadAplica
                      ? ` (e = (0,2 − 0,25·R_máx)·B, con R_máx = ${f(r.extra.red.Rmax, 3)} ≤ 0,4)`
                      : " (e = 0,2·B)"}.
                    {r.extra.apoyado && <> Y como el cartel apoya de forma continua en el
                      suelo, además actúa <b style={{ color: c.txt }}>{f(0.05 * parseFloat(cp.h || 0), 2)} m</b>{" "}
                      por encima del centro geométrico.</>}
                  </Nota>
                </div>
              )}

              {r.avisos.map((a, i) => (
                <div key={i} style={{ marginTop: SP.md }}>
                  <Aviso tono={a.tono}>{a.texto}</Aviso>
                </div>
              ))}
            </>}
        </Card>
      </div>

      <Card titulo="Croquis">
        <CroquisAccesorio analisis={r} datos={datosCroquis} familia={cp.familia}
          fmt={fmt} tema={tema} />
        <Nota>
          La flecha está dibujada a la altura a la que se evaluó q, que es donde el
          reglamento ubica la resultante. Un croquis con la flecha siempre en el centro
          escondería justamente la diferencia entre las dos expresiones del capítulo.
        </Nota>
      </Card>

      {cp.familia === "cartel_lleno" && r?.extra?.casoC?.aplica && (
        <Card titulo="Caso C — direcciones de viento oblicuas"
          desc="La nota 2 lo EXIGE cuando B/s ≥ 2. No es otro coeficiente: es otro reparto,
            con la fuerza concentrada cerca del borde de barlovento.">
          <PlantaCasoC casoC={r.extra.casoC} B={parseFloat(cp.B) || 1} fmt={fmt} tema={tema} />
          <Tabla minWidth={520}>
            <thead><tr>
              <Th>Región</Th><Th alinear="right">Desde (m)</Th><Th alinear="right">Hasta (m)</Th>
              <Th alinear="right">C_f de tabla</Th><Th alinear="right">C_f aplicado</Th>
              <Th alinear="right">F de la región (kN)</Th>
            </tr></thead>
            <tbody>
              {r.extra.casoC.regiones.map(reg => (
                <tr key={reg.id}>
                  <Td>{reg.label}</Td>
                  <TdN>{f(reg.desde, 2)}</TdN>
                  <TdN>{f(reg.hasta, 2)}</TdN>
                  <TdN>{f(reg.cfTabla, 2)}</TdN>
                  <TdN peso={600}>{f(reg.cf, 3)}</TdN>
                  <TdN>{f(r.q * G * reg.cf * reg.ancho * parseFloat(cp.s || 0) / 1000, 2)}</TdN>
                </tr>
              ))}
            </tbody>
          </Tabla>
          <Nota>
            Las fuerzas de cada región actúan perpendiculares a la cara, en el centro
            geométrico de SU región.
            {r.extra.casoC.fNota3 < 1 && <> Se aplicó la reducción de la nota 3,
              (1,8 − s/h) = <b style={{ color: c.txt }}>{f(r.extra.casoC.fNota3, 3)}</b>,
              por tener s/h = {f(r.extra.casoC.sh, 2)} &gt; 0,8.</>}
            {r.extra.casoC.fEsq < 1 && <> La esquina de retorno reduce la primera región por{" "}
              <b style={{ color: c.txt }}>{f(r.extra.casoC.fEsq, 2)}</b>, interpolado en la
              tabla de L_r/s ({CASO_C_ESQUINA.map(([a, b]) => `${f(a, 1)} → ${f(b, 2)}`).join(" · ")}).</>}
          </Nota>
        </Card>
      )}

      <Card titulo="Cómo se llegó a este número"
        desc="Cada paso con su referencia al reglamento, en el orden de la Tabla 4.1-1.">
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
        {cp.familia === "cartel_lleno" && <>
          <Tabla minWidth={760}>
            <thead><tr>
              <Th>s/h</Th>
              {BS_CARTEL.map((b, j) => <Th key={j} alinear="right">
                {j === 0 ? "≤ 0,05" : j === BS_CARTEL.length - 1 ? "≥ 45" : f(b, b < 1 ? 2 : 0)}
              </Th>)}
            </tr></thead>
            <tbody>
              {CF_CARTEL_AB.map((fila, i) => (
                <tr key={i}>
                  <Td peso={600}>{i === SH_CARTEL.length - 1 ? "≤ 0,16" : f(SH_CARTEL[i], SH_CARTEL[i] < 1 ? 1 : 0)}</Td>
                  {fila.map((v, j) => <TdN key={j}>{f(v, 2)}</TdN>)}
                </tr>
              ))}
            </tbody>
          </Tabla>
          <Nota>
            Figura 4.4-1, coeficientes de fuerza de los casos A y B. Las columnas son B/s y
            las filas s/h. El motor interpola bilinealmente y congela los extremos, que es
            lo que dicen los rótulos «≤ 0,05» y «≥ 45» de la propia figura.
            <br /><br />
            <b style={{ color: c.txt }}>Estas 84 celdas están verificadas.</b> El comentario
            C 4.4.1 da el ajuste de superficie con el que la comisión las generó, y dice que
            después las redondeó a los 0,05 más próximos. Un test reconstruye la tabla entera
            desde esa expresión y cierra <b style={{ color: c.txt }}>exacto, sin una sola
            discrepancia</b>: una cifra mal leída del escaneo no podría pasar.
          </Nota>
        </>}
        {cp.familia === "cartel_abierto" && <>
          <Tabla minWidth={480}>
            <thead><tr>
              <Th>ε</Th><Th alinear="right">Caras planas</Th>
              <Th alinear="right">Circulares D·√q_z ≤ 5,3</Th>
              <Th alinear="right">Circulares D·√q_z &gt; 5,3</Th>
            </tr></thead>
            <tbody>
              {CF_RETICULADO.map(b => {
                const on = r?.extra?.banda?.id === b.id;
                return (
                  <tr key={b.id}>
                    <Td peso={on ? 600 : 400} fondo={on ? c.azulBg : undefined}>{b.rango}</Td>
                    <TdN fondo={on ? c.azulBg : undefined}>{f(b.plano, 1)}</TdN>
                    <TdN fondo={on ? c.azulBg : undefined}>{f(b.circSub, 1)}</TdN>
                    <TdN fondo={on ? c.azulBg : undefined}>{f(b.circSuper, 1)}</TdN>
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
          <Nota>
            Figura 4.5-2. <b style={{ color: c.txt }}>Son bandas, no un eje continuo:</b> a
            diferencia de la Figura 4.5-1, que sí autoriza interpolar en su nota 2, ésta no
            lo dice, así que dentro de cada banda el valor es constante. Por encima de
            ε = 0,7 la figura no da coeficientes y el motor se niega en vez de estirar la
            última fila.
          </Nota>
        </>}
        {cp.familia === "chimenea" && <>
          <Tabla minWidth={520}>
            <thead><tr>
              <Th>Sección</Th><Th>Superficie</Th>
              <Th alinear="right">h/D = 1</Th><Th alinear="right">7</Th><Th alinear="right">25</Th>
            </tr></thead>
            <tbody>
              {CF_CHIMENEA.map(x => {
                const on = x.id === cp.filaChimenea;
                return (
                  <tr key={x.id}>
                    <Td peso={on ? 600 : 400} fondo={on ? c.azulBg : undefined}>
                      {x.seccion}{x.detalle ? ` — ${x.detalle}` : ""}</Td>
                    <Td tono={c.txt2} fondo={on ? c.azulBg : undefined}>{x.superficie}</Td>
                    {x.cf.map((v, k) => <TdN key={k} fondo={on ? c.azulBg : undefined}>{f(v, 1)}</TdN>)}
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
          <Nota>
            Figura 4.5-1, con interpolación lineal en h/D autorizada por su nota 2. El
            criterio <b style={{ color: c.txt }}>D·√q_z</b> está en unidades SI —D en metros
            y q_z en N/m²— con el umbral en 5,3: separa el régimen subcrítico del
            supercrítico del cilindro, y entre las dos filas el coeficiente cambia casi al
            doble.
          </Nota>
        </>}
        {cp.familia === "torre" && (
          <Nota>
            Figura 4.5-3. Acá el reglamento <b style={{ color: c.txt }}>no da una tabla sino
            dos polinomios</b>: {CF_TORRE.cuadrada.expr} para sección cuadrada y{" "}
            {CF_TORRE.triangular.expr} para triangular, con ε la relación de área sólida de
            una cara. No hay nada que interpolar ni ninguna celda que pueda estar mal leída.
            <br /><br />
            El comentario aclara que ésta sí cambió respecto del CIRSOC 102-2005 —las
            Figuras 4.5-1 y 4.5-2 no, vienen de ANSI A58.1-1972— y que es consistente con el
            CIRSOC 306-2018 y con ANSI/TIA-222-G-2009.
          </Nota>
        )}
        {cp.familia === "equipo" && (
          <Nota>
            Art. 4.5.1. No hay tabla: el (GC_r) vale{" "}
            <b style={{ color: c.txt }}>1,9</b> lateral y <b style={{ color: c.txt }}>1,5</b>{" "}
            vertical mientras el equipo sea chico frente al edificio, y baja linealmente
            hasta 1,0 cuando su área se acerca a la del edificio entero. La reducción lineal
            existe para que la carga no tenga un escalón: un equipo que cubre media azotea ya
            no es un obstáculo local sino parte del volumen.
            <br /><br />
            <b style={{ color: c.txt }}>Esto no estaba en el CIRSOC 102-2005.</b> Viene de
            ASCE 7-16, y allí además se levantó el límite de 18,3 m de altura de edificio que
            traía el 7-10: ahora aplica a edificios de todas las alturas.
          </Nota>
        )}
      </Acordeon>

      <Acordeon titulo="Condiciones y limitaciones del capítulo 4">
        <div style={{ ...t.body, lineHeight: 1.75 }}>
          <b style={{ color: c.txt }}>Art. 4.1.2 — condiciones.</b> La estructura tiene que
          ser de forma regular y no tener características de respuesta que la hagan objeto de
          cargas transversales, desprendimiento de vórtices, galope o flameo, ni estar en un
          sitio donde la canalización o el golpeteo en la estela de obstrucciones a barlovento
          requieran consideración especial. Nada de eso lo verifica la app.
          <br /><br />
          <b style={{ color: c.txt }}>Art. 4.1.4 — protección.</b> No se permiten reducciones
          en la presión dinámica por la protección aparente que brinden edificios, otras
          estructuras o el terreno. Un cartel detrás de un galpón se calcula como si el
          galpón no estuviera.
          <br /><br />
          <b style={{ color: c.txt }}>Art. 4.1.3 — limitaciones.</b> Lo que no cumple el
          4.1.2, o tiene formas o respuestas inusuales, va a bibliografía reconocida o al
          túnel de viento del Capítulo 6.
        </div>
      </Acordeon>
    </>
  );
}
