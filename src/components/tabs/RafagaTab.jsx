// FACTOR DE EFECTO DE RÁFAGA — art. 1.9.
//
// Es una pantalla de DATOS y no de resultados, aunque lo que muestra sea una tabla de
// valores calculados: cuál de las tres vías del reglamento se adopta es una decisión del
// proyectista, y esa decisión multiplica todas las presiones de todas las direcciones.
// Puesta entre los resultados parecería algo que la app informa.
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { FRECUENCIA_APROX, naDe, dimensionesDe } from '../../engine/factorRafaga.js';
import { Encabezado, Card, Campo, Num, Sel, Aviso, Nota, Tabla, Th, Td, TdN,
  Acordeon } from '../ui.jsx';
import { c, t, SP, R, TONO, TRANS } from '../tokens.js';
import { f } from '../../lib/formato.js';

// Tarjeta de opción. Radio y no un select: las tres opciones tienen que verse A LA VEZ
// con sus tres valores, porque la decisión es justamente comparar 0,85 contra lo que dan
// las expresiones. En un select se ve una sola y hay que abrirlo para comparar.
function Opcion({ o, activo, onClick, rige }) {
  return (
    <label style={{
      flex: "1 1 220px", padding: SP.md, borderRadius: R.md, cursor: "pointer",
      border: `1px solid ${activo ? c.azul : c.border}`,
      background: activo ? c.azulBg : c.surface,
      transition: `border-color ${TRANS}, background ${TRANS}`,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: SP.sm }}>
        <input type="radio" name="modoG" checked={activo} onChange={onClick} />
        <span style={{ ...t.numG }}>{f(o.G, 3)}</span>
        {rige && <span style={{ ...t.micro, color: TONO.ok.fg, fontWeight: 600 }}>rige</span>}
      </div>
      <div style={{ ...t.bodyF, marginTop: SP.xs }}>{o.label}</div>
      <div style={{ ...t.micro, marginTop: SP.xs, lineHeight: 1.55 }}>{o.nota}</div>
    </label>
  );
}

export function RafagaTab() {
  const { d, set, rafaga, rafagaTodas, gDe, geoN, G, act, direcciones } = useProyecto();
  const { rig, flex, opciones, motivo, calculadoSupera, rige } = rafaga;

  const fila = (sim, desc, val, ref) => (
    <tr key={sim + desc}>
      <Td nowrap>{sim}</Td>
      <Td tono={c.txt2}>{desc}</Td>
      <TdN>{val}</TdN>
      <Td tono={c.txt3} nowrap>{ref}</Td>
    </tr>
  );

  return (
    <>
      <Encabezado titulo={`Factor de efecto de ráfaga — ${act.dir.label}`}
        desc="Art. 1.9. El reglamento ofrece tres vías y no dice cuál usar salvo en un caso:
          con n₁ menor que 1 Hz el edificio es flexible y G_f es obligatorio. Las otras dos
          son elección del proyectista. Los números son los de la dirección seleccionada:
          B y L se intercambian al girar el viento, así que G también cambia." />

      <Aviso tono={rafaga.flexible && d.modoG !== "flexible" ? "error" : "info"}
        titulo={`Rige: ${opciones.find(o => o.id === rige)?.label ?? "—"}`}>
        {motivo}
      </Aviso>

      <Card titulo="Qué valor se adopta"
        desc="El elegido multiplica todas las presiones externas de todas las direcciones.">
        <div style={{ display: "flex", gap: SP.md, flexWrap: "wrap" }}>
          {opciones.map(o => (
            <Opcion key={o.id} o={o} activo={d.modoG === o.id} rige={rige === o.id}
              onClick={() => set("modoG")(o.id)} />
          ))}
        </div>
        <Nota>
          Adoptado: <b style={{ color: c.txt }}>G = {f(G, 3)}</b>.{" "}
          <b style={{ color: c.txt }}>Art. 1.9.7.</b> Donde el reglamento da los productos
          (GC_p), (GC_pi) o (GC_pf) en tablas y figuras, el factor de ráfaga{" "}
          <b style={{ color: c.txt }}>no se puede separar</b> ni reemplazar por éste: ya
          está incluido en el producto.
        </Nota>
      </Card>

      {/* ── G POR DIRECCIÓN ──────────────────────────────────────────────────────
          ⚠ NO ES UNO SOLO PARA EL EDIFICIO. En (1.9-8) B es la dimensión NORMAL al viento
          y en (1.9-15) L la PARALELA, y las dos se intercambian al girar 90°. La app
          llamaba a esto una vez con B = max(a,b) y aplicaba ese G a las cuatro
          direcciones; como Q baja cuando B crece, ésa es justo la elección que da el G más
          chico. En una nave de 20 × 100 m eran 8 puntos porcentuales de menos. */}
      <Card titulo="El factor cambia con la dirección"
        desc="B es la dimensión normal al viento y L la paralela: al girar el viento 90° se
          intercambian, y con ellas Q y el factor resonante. Sólo el valor por defecto de
          0,85 es el mismo en las cuatro.">
        <Tabla minWidth={560}>
          <thead><tr>
            <Th>Dirección</Th>
            <Th alinear="right">B (m)</Th><Th alinear="right">L (m)</Th>
            <Th alinear="right">Por defecto</Th>
            <Th alinear="right">Calculado (1.9-6)</Th>
            <Th alinear="right">Flexible (1.9-10)</Th>
            <Th alinear="right">Adoptado</Th>
          </tr></thead>
          <tbody>
            {direcciones.map(dir => {
              const r = rafagaTodas[dir.id];
              const dim = dimensionesDe(geoN, dir);
              const cual = (id) => r.opciones.find(o => o.id === id)?.G;
              const activa = dir.id === act.dir.id;
              return (
                <tr key={dir.id}>
                  <Td nowrap peso={activa ? 700 : 400}
                    fondo={activa ? c.azulBg : undefined}>{dir.id}</Td>
                  <TdN tono={c.txt3}>{f(dim.B, 1)}</TdN>
                  <TdN tono={c.txt3}>{f(dim.L, 1)}</TdN>
                  <TdN tono={c.txt3}>{f(cual("defecto"), 3)}</TdN>
                  <TdN tono={c.txt3}>{f(cual("calculado"), 3)}</TdN>
                  <TdN tono={c.txt3}>{cual("flexible") == null ? "—" : f(cual("flexible"), 3)}</TdN>
                  <TdN peso={700} fondo={activa ? c.azulBg : undefined}>{f(gDe(dir), 3)}</TdN>
                </tr>
              );
            })}
          </tbody>
        </Tabla>
        <Nota>
          En negrita y con fondo, la dirección seleccionada en el resto de la aplicación.
          El <b style={{ color: c.txt }}>valor por defecto de 0,85 no depende de la
          geometría</b>, así que con esa opción las cuatro filas coinciden y la tabla no
          aporta nada: la diferencia aparece recién al adoptar el calculado o el de
          edificio flexible.
        </Nota>
      </Card>

      <Card titulo="Datos dinámicos del edificio"
        desc="Sólo intervienen en el G calculado y en el de edificio flexible. Sin frecuencia
          declarada, el edificio se supone rígido.">
        <Campo label="Frecuencia natural n₁" unit="Hz"
          ayuda="Frecuencia fundamental de la estructura. Por debajo de 1 Hz el art. 1.2 la clasifica como edificio flexible y obliga a usar G_f.">
          <Num v={d.n1} set={set("n1")} step="0.01" ph="sin declarar" w={120} />
        </Campo>
        <Campo label="Estimar n₁ con"
          ayuda="Las expresiones del art. 1.9.3 son LÍMITES INFERIORES aproximados, no la frecuencia real. Valen para edificios de menos de 90 m y de menos de cuatro veces su longitud efectiva.">
          <Sel v={d.tipoFrec} w={280}
            opciones={[["", "— no estimar —"], ...FRECUENCIA_APROX.map(x => [x.id, `${x.label} ${x.ref}`])]}
            set={(v) => {
              set("tipoFrec")(v);
              // Estimar ESCRIBE en el campo de n₁ en vez de calcular por su cuenta: así
              // queda a la vista qué número entró, y se puede corregir a mano sin tener
              // que volver a poner el selector en «no estimar».
              const est = naDe(v, geoN.h);
              if (est) set("n1")(est.toFixed(2));
            }} />
        </Campo>
        <Campo label="Amortiguamiento β"
          ayuda="El comentario sugiere 1 % en acero y 2 % en hormigón a nivel de servicio, y entre 2,5 y 3 % cerca del estado último.">
          <Num v={d.beta} set={set("beta")} step="0.005" w={100} />
        </Campo>
      </Card>

      <Card titulo="Intermedios del cálculo"
        desc="Los mismos que lista la Tabla C 1.9-1 del comentario. Están acá porque un
          factor de ráfaga no se puede revisar mirando sólo su resultado.">
        <Tabla minWidth={560}>
          <thead><tr>
            <Th>Símbolo</Th><Th>Concepto</Th><Th alinear="right">Valor</Th><Th>Expresión</Th>
          </tr></thead>
          <tbody>
            {fila("z̄", "Altura equivalente, 0,6·h pero no menor que z_mín", `${f(rig.zb, 2)} m`, "Art. 1.9.4")}
            {fila("c", "Factor de intensidad de turbulencia", f(rig.c, 2), "Tabla 1.9-1")}
            {fila("I_z̄", "Intensidad de la turbulencia a z̄", f(rig.Iz, 4), "(1.9-7)")}
            {fila("ℓ", "Factor de escala de longitud integral", `${f(rig.l, 0)} m`, "Tabla 1.9-1")}
            {fila("ε̄", "Exponente de la escala de longitud", f(rig.epsM, 4), "Tabla 1.9-1")}
            {fila("L_z̄", "Escala de longitud integral de la turbulencia", `${f(rig.Lz, 1)} m`, "(1.9-9)")}
            {fila("Q²", "Cuadrado del factor de respuesta base", f(rig.Q2, 4), "(1.9-8)")}
            {fila("g_Q = g_v", "Factores de pico", f(rig.gQ, 1), "Art. 1.9.4")}
            {fila("G", "Factor de ráfaga calculado, edificio rígido", f(rig.G, 4), "(1.9-6)")}
            {flex?.Gf != null && <>
              {fila("ᾱ", "Exponente del perfil de velocidad media", f(flex.alfaM, 4), "Tabla 1.9-1")}
              {fila("b̄", "Factor del perfil de velocidad media", f(flex.bM, 2), "Tabla 1.9-1")}
              {fila("V̄_z̄", "Velocidad media horaria a z̄", `${f(flex.Vz, 2)} m/s`, "(1.9-16)")}
              {fila("N₁", "Frecuencia reducida", f(flex.N1, 4), "(1.9-14)")}
              {fila("R_n", "Factor de respuesta para n", f(flex.Rn, 4), "(1.9-13)")}
              {fila("R_h · R_B · R_L", "Factores de respuesta por altura, ancho y largo",
                `${f(flex.Rh, 3)} · ${f(flex.RB, 3)} · ${f(flex.RL, 3)}`, "(1.9-15a)")}
              {fila("R²", "Cuadrado de la respuesta resonante", f(flex.R2, 4), "(1.9-12)")}
              {fila("g_R", "Factor de pico de la respuesta resonante", f(flex.gR, 4), "(1.9-11)")}
              {fila("G_f", "Factor de ráfaga de edificio flexible", f(flex.Gf, 4), "(1.9-10)")}
            </>}
          </tbody>
        </Tabla>
      </Card>

      {calculadoSupera && (
        <Acordeon titulo="Por qué acá el G calculado supera al 0,85" tono="aviso">
          <div style={{ ...t.body, lineHeight: 1.75 }}>
            No es un error de la app ni una excepción rara. Se ve en la propia expresión
            (1.9-6): como Q &lt; 1, el cociente (1 + 1,7·g_Q·I_z̄·Q)/(1 + 1,7·g_v·I_z̄)
            crece hacia 1 cuando la turbulencia baja, y en el límite G tiende a 0,925. Los
            terrenos lisos tienen poca turbulencia, así que en exposición C y D el calculado
            queda por encima del 0,85, y en B por debajo.
            <br /><br />
            <b style={{ color: c.txt }}>La consecuencia práctica:</b> en exposición C o D
            adoptar 0,85 no es más conservador, es menos. El art. 1.9.4 permite las dos
            vías igual —no hay nada que corregir—, pero suponer que el 0,85 siempre protege
            es falso fuera de exposición B.
          </div>
        </Acordeon>
      )}
    </>
  );
}
