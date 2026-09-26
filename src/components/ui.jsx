// PRIMITIVAS DE INTERFAZ.
//
// Portadas de la aplicación de bases, con el mismo criterio: una tarjeta = una tarea, un
// botón primario por pantalla, tres niveles de texto y la explicación de cada dato a un
// hover en vez de un párrafo debajo del campo.
//
// La versión anterior de esta app no tenía ninguna de estas piezas: cada bloque armaba su
// propio recuadro, su propio título en versalitas de 11 px y su propio aviso ámbar con
// los colores escritos a mano. Por eso todo pesaba lo mismo en pantalla.
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MONO, s } from './styles.js';
import { c, t, SP, R, TONO, SOMBRA, TRANS, TAM } from './tokens.js';

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMITIVAS DE FORMULARIO
// ═══════════════════════════════════════════════════════════════════════════════

// `ayuda` reemplaza los párrafos explicativos que había debajo de cada campo: el que ya
// sabe qué es el dato no lee nada, y el que no sabe lo tiene a un hover. En una app de
// viento eso importa más que en otras: la mitad de los campos son clasificaciones del
// reglamento —exposición, cerramiento, tipo de cubierta— cuya definición no se adivina.
export function Campo({ label, unit, ayuda, fig, children }) {
  return (
    <div style={s.row}>
      <span style={s.lbl}>{label}{ayuda && <Ayuda>{ayuda}</Ayuda>}{fig && <Figura fig={fig} />}</span>
      <div style={{ flexShrink: 0 }}>{children}</div>
      {unit && <span style={s.unit}>{unit}</span>}
    </div>
  );
}

export function Num({ v, set, w = 104, ph, step = "any", min, max }) {
  return <input className="vw-in" style={{ ...s.inp, width: w }} type="number" step={step}
    min={min} max={max} value={v} placeholder={ph} onChange={e => set(e.target.value)} />;
}

export function Sel({ v, set, opciones, w = 200 }) {
  return (
    <select className="vw-in" style={{ ...s.sel, width: w }} value={v}
      onChange={e => set(e.target.value)}>
      {opciones.map(o => {
        const [val, txt, dis] = Array.isArray(o) ? o : [o, o, false];
        return <option key={val} value={val} disabled={dis}>{txt}</option>;
      })}
    </select>
  );
}

// Valor calculado presentado como una fila de formulario, para que un dato derivado se
// lea en la misma columna que el dato que lo produce.
export function Salida({ label, v, unit, ayuda, fig }) {
  return (
    <div style={s.row}>
      <span style={s.lbl}>{label}{ayuda && <Ayuda>{ayuda}</Ayuda>}{fig && <Figura fig={fig} />}</span>
      <span style={{ ...s.out, flexShrink: 0 }}>{v}</span>
      {unit && <span style={s.unit}>{unit}</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AYUDA CONTEXTUAL
// ═══════════════════════════════════════════════════════════════════════════════

// EL PANEL FLOTANTE SE RENDERIZA EN `document.body`, NO JUNTO AL ÍCONO.
//
// Un `position:absolute` dentro del ícono se ve bien en los casos cortos y falla en
// todos los demás: lo recorta cualquier ancestro con `overflow` —y acá media interfaz
// vive dentro de tablas con scroll horizontal—, abre siempre hacia arriba aunque el
// ícono esté contra el techo, y no tiene tope de alto.
//
// Con portal a `body` y `position:fixed` el panel deja de depender de dónde esté el
// ícono en el árbol: se posiciona contra la ventana, se voltea según dónde haya lugar,
// se acota a los bordes y, si aun así no entra, ACOTA SU ALTO y scrollea adentro.
//
// Se abre con hover, con foco de teclado y con CLIC. El clic no es un lujo: en un
// teléfono no hay hover y estas ayudas serían directamente inalcanzables.
const MARGEN = 8;
const ANCHO_MAX = 340;

function Flotante({ children, anchoMax = ANCHO_MAX, contenido }) {
  const refAncla = useRef(null);
  const refPanel = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const [fijo, setFijo] = useState(false);      // abierto por clic: no lo cierra el mouse
  const [pos, setPos] = useState(null);
  const cierre = useRef(null);

  // El cierre por mouse va DIFERIDO. Entre el ícono y el panel hay 8 px de aire, y sin
  // esta demora el panel se cierra justo cuando el usuario va a entrar en él, que es lo
  // que hay que hacer para leer una ayuda larga.
  const cancelarCierre = () => { clearTimeout(cierre.current); cierre.current = null; };
  const cerrarLuego = () => {
    if (fijo) return;
    cancelarCierre();
    cierre.current = setTimeout(() => { setAbierto(false); setFijo(false); }, 140);
  };

  // ── EL PANEL TAPA AL ÍCONO, Y AL CERRARSE EL PUNTERO «ENTRA» OTRA VEZ ──────────
  //
  // Un panel alto —una figura del reglamento mide 560 × 385 px— se clampea contra los
  // bordes de la ventana y termina cubriendo al «?» que lo abrió. Cuando se cierra, el
  // elemento bajo el cursor pasa a ser el ancla, el navegador dispara un `mouseenter`
  // que nadie provocó, y `abrir()` lo vuelve a abrir: en pantalla, Escape no hacía nada.
  //
  // Se arregla bloqueando la reapertura hasta que el puntero SALGA de verdad del ancla.
  // Un cierre deliberado —Escape o clic afuera— levanta la bandera; el `mouseleave` real
  // la baja. Así el hover sigue funcionando y el fantasma no.
  const bloqueado = useRef(false);
  const abrir = () => {
    if (bloqueado.current) return;
    cancelarCierre();
    setAbierto(true);
  };
  const cerrarYa = () => {
    cancelarCierre();
    bloqueado.current = true;
    setAbierto(false);
    setFijo(false);
  };
  const salir = () => { bloqueado.current = false; cerrarLuego(); };
  useEffect(() => cancelarCierre, []);

  useEffect(() => {
    if (!abierto) { setPos(null); return; }
    const ubicar = () => {
      const a = refAncla.current?.getBoundingClientRect();
      const p = refPanel.current?.getBoundingClientRect();
      if (!a) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      const w = Math.min(p?.width || anchoMax, anchoMax, vw - 2 * MARGEN);
      const hDeseado = p?.height || 0;
      // Vertical: se prefiere ARRIBA y se voltea si abajo hay más lugar. El espacio
      // descuenta DOS márgenes —el hueco contra el ícono y el aire contra el borde—;
      // con uno solo el panel queda pegado al borde superior.
      const arriba = a.top - 2 * MARGEN, abajo = vh - a.bottom - 2 * MARGEN;
      const ponerAbajo = hDeseado > arriba && abajo > arriba;
      const disp = Math.max(80, ponerAbajo ? abajo : arriba);
      const h = Math.min(hDeseado || disp, disp);
      const top = Math.max(MARGEN, Math.min(
        ponerAbajo ? a.bottom + MARGEN : a.top - MARGEN - h, vh - h - MARGEN));
      let left = a.left + a.width / 2 - w / 2;
      left = Math.max(MARGEN, Math.min(left, vw - w - MARGEN));
      setPos({ top, left, width: w, maxHeight: disp });
    };
    ubicar();
    // Cualquier movimiento del fondo invalida la posición. `capture` para enterarse
    // también del scroll de los contenedores internos, que no burbujea.
    window.addEventListener("scroll", ubicar, true);
    window.addEventListener("resize", ubicar);
    const esc = (e) => { if (e.key === "Escape") cerrarYa(); };
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("scroll", ubicar, true);
      window.removeEventListener("resize", ubicar);
      window.removeEventListener("keydown", esc);
    };
  }, [abierto, anchoMax]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e) => {
      if (!refAncla.current?.contains(e.target) && !refPanel.current?.contains(e.target)) {
        cerrarYa();
      }
    };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, [abierto]);

  const panel = abierto && typeof document !== "undefined" ? createPortal(
    <div ref={refPanel} role="tooltip" style={{
      position: "fixed", zIndex: 200,
      top: pos ? pos.top : -9999, left: pos ? pos.left : -9999,
      width: pos ? pos.width : undefined, maxWidth: anchoMax,
      maxHeight: pos ? pos.maxHeight : undefined, overflowY: "auto", overscrollBehavior: "contain",
      background: c.overlay, color: c.txt, padding: "9px 11px", borderRadius: R.md,
      fontSize: TAM.base, fontWeight: 400, lineHeight: 1.55, textAlign: "left",
      boxShadow: SOMBRA.pop, whiteSpace: "normal", border: `1px solid ${c.border}`,
      // Barra de scroll VISIBLE: cuando la ayuda no entra, el texto se corta a mitad de
      // renglón, y sin barra a la vista eso se lee como un panel roto.
      scrollbarWidth: "thin", scrollbarColor: `${c.txt3} transparent`,
      opacity: pos ? 1 : 0, transition: `opacity ${TRANS}`,
    }}
      onMouseEnter={cancelarCierre} onMouseLeave={cerrarLuego}
    >{contenido}</div>, document.body) : null;

  return (
    <>
      <span ref={refAncla} tabIndex={0} style={{ display: "inline-flex", cursor: "help" }}
        onMouseEnter={abrir} onMouseLeave={salir}
        onFocus={abrir} onBlur={salir}
        // El clic FIJA, no alterna: en un teléfono el toque dispara antes un mouseenter
        // sintético, así que alternar lo cerraba de inmediato.
        onClick={(e) => { e.stopPropagation(); cancelarCierre(); setAbierto(true); setFijo(true); }}>
        {children}
      </span>
      {panel}
    </>
  );
}

export function Ayuda({ children }) {
  return (
    <span style={{ marginLeft: 6, verticalAlign: "middle", display: "inline-flex" }}>
      <Flotante contenido={children}>
        <span aria-hidden style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 15, height: 15, borderRadius: R.full, border: `1px solid ${c.txt3}`,
          // el signo es un ÍCONO: su tamaño lo fija el círculo que lo contiene, no la
          // escala tipográfica de la interfaz
          color: c.txt3, fontSize: 10, fontWeight: 700, lineHeight: 1,
        }}>?</span>
      </Flotante>
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIGURA DEL REGLAMENTO
// ═══════════════════════════════════════════════════════════════════════════════

// Un «?» que en vez de texto abre UNA FIGURA DEL REGLAMENTO.
//
// ── POR QUÉ NO ALCANZA CON LA AYUDA DE TEXTO ───────────────────────────────────
// Media docena de campos de esta app piden un dato que el reglamento DEFINE CON UN DIBUJO:
// «B, s, h y t» de un cartel, H contra h en un silo, el ángulo θ de un perfil. Describirlos
// con palabras es lo que veníamos haciendo, y funciona hasta el momento en que el usuario
// tiene que decidir si su H es la del cilindro o la del conjunto. Ahí no hay párrafo que
// reemplace a la figura, y lo que pasa —siempre— es que se carga el que parece.
//
// ── POR QUÉ SE DISTINGUE DEL «?» NORMAL ────────────────────────────────────────
// Va en el color de acento y con el marco más marcado. Si los dos íconos se vieran igual,
// nadie abriría el que trae la figura: quien ya leyó tres ayudas de texto deja de abrirlas.
export function Figura({ fig, children }) {
  if (!fig) return null;
  const contenido = (
    <div>
      <div style={{ ...t.bodyF, marginBottom: 2 }}>{fig.titulo}</div>
      <div style={{ ...t.micro, marginBottom: SP.sm }}>{fig.ref}</div>
      {/* FONDO BLANCO FIJO Y NO `c.surface`: son escaneos de tinta negra sobre papel, y en
          tema oscuro sobre fondo oscuro no se leería ni una cota. Es la misma razón por la
          que el mapa de velocidad básica lo lleva. */}
      <img src={`figuras/${fig.archivo}.png`} alt={fig.titulo} loading="lazy"
        style={{ width: "100%", display: "block", background: "#fff",
          border: `1px solid ${c.border}`, borderRadius: R.sm }} />
      {fig.nota && (
        <div style={{ ...t.body, marginTop: SP.sm, lineHeight: 1.6 }}>{fig.nota}</div>
      )}
      {/* La figura completa, para leer una nota al pie o una cota chica. El tooltip la
          muestra reducida a 560 px y eso alcanza para reconocerla, no siempre para leerla. */}
      <a href={`figuras/${fig.archivo}.png`} target="_blank" rel="noreferrer"
        style={{ ...t.micro, color: c.azulL, display: "inline-block", marginTop: SP.sm }}>
        abrir en tamaño completo ↗
      </a>
    </div>
  );
  return (
    <span style={{ marginLeft: 6, verticalAlign: "middle", display: "inline-flex" }}>
      <Flotante contenido={contenido} anchoMax={560}>
        {children ?? (
          // ── EL ÍCONO DE FIGURA VA RELLENO, NO SÓLO DE OTRO COLOR ──────────────
          // Muchos campos llevan los dos: el «?» gris dice QUÉ es el dato y el de figura
          // muestra CÓMO lo define el reglamento. A 15 px, dos círculos huecos que sólo se
          // diferencian por el tono se leen como el mismo ícono repetido, y el segundo no
          // se abre nunca. Relleno se distingue de un vistazo y sigue siendo un «?».
          <span aria-hidden title={`${fig.titulo} — ver la figura del reglamento`} style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 15, height: 15, borderRadius: R.full,
            background: c.azul, border: `1.5px solid ${c.azul}`, color: "#fff",
            fontSize: 10, fontWeight: 700, lineHeight: 1,
          }}>?</span>
        )}
      </Flotante>
    </span>
  );
}

// Tooltip sobre cualquier contenido. `bloque` hace falta cuando lo envuelto es de nivel
// bloque: el contenedor es `inline-flex` para ceñirse al texto, y sin esto una fila
// completa se colapsa al ancho de su contenido.
export function Tip({ texto, children, bloque = false }) {
  if (!texto) return children;
  return (
    <span style={bloque ? { display: "flex", width: "100%" } : { display: "inline-flex" }}>
      <Flotante contenido={texto}>
        {bloque ? <span style={{ width: "100%", minWidth: 0 }}>{children}</span> : children}
      </Flotante>
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENEDORES
// ═══════════════════════════════════════════════════════════════════════════════

// TARJETA: el título arriba, la descripción debajo del título y las acciones a la
// derecha. Ese orden es fijo para que el ojo no tenga que buscarlas en cada tarjeta.
export function Card({ titulo, desc, acciones, tono, fig, pad = SP.lg - 4, children, style }) {
  const T = tono ? TONO[tono] : null;
  return (
    <section className="vw-card" style={{
      background: c.raised, border: `1px solid ${T ? T.bd : c.border}`, borderRadius: R.lg,
      padding: pad, marginBottom: SP.md, minWidth: 0, maxWidth: "100%",
      boxShadow: SOMBRA.card, ...style,
    }}>
      {(titulo || acciones) && (
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          gap: SP.md, marginBottom: desc ? SP.xs : SP.md }}>
          <div style={{ minWidth: 0 }}>
            {titulo && <h3 style={{ ...t.h2, margin: 0 }}>{titulo}{fig && <Figura fig={fig} />}</h3>}
            {desc && <p style={{ ...t.body, margin: `${SP.xs}px 0 0` }}>{desc}</p>}
          </div>
          {acciones && <div style={{ display: "flex", gap: SP.sm, flexShrink: 0 }}>{acciones}</div>}
        </header>
      )}
      {desc && <div style={{ height: SP.md - SP.xs }} />}
      {children}
    </section>
  );
}

// ENCABEZADO DE PANTALLA: título grande + una línea que dice para qué sirve la pantalla.
// Es el ancla de la jerarquía; sin él todas las tarjetas pesan igual, que es exactamente
// lo que pasaba cuando la app era una sola columna de recuadros.
export function Encabezado({ titulo, desc, acciones }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between",
      gap: SP.md, marginBottom: SP.lg, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ ...t.h1, margin: 0 }}>{titulo}</h1>
        {desc && <p style={{ ...t.body, margin: `${SP.sm}px 0 0`, maxWidth: 680 }}>{desc}</p>}
      </div>
      {acciones && <div style={{ display: "flex", gap: SP.sm, flexShrink: 0 }}>{acciones}</div>}
    </div>
  );
}

// ACORDEÓN — el mecanismo con el que se esconde todo lo que no se mira a diario: las
// tablas de intermedios, las notas largas del reglamento, la traza completa.
// `<details>` nativo: funciona sin JS, es accesible y conserva su estado al re-render.
export function Acordeon({ titulo, resumen, abierto = false, tono, children }) {
  const T = tono ? TONO[tono] : null;
  return (
    <details className="vw-acc" open={abierto} style={{
      background: c.raised, border: `1px solid ${T ? T.bd : c.border}`, borderRadius: R.lg,
      marginBottom: SP.sm + 2, overflow: "hidden",
    }}>
      <summary style={{ display: "flex", alignItems: "center", gap: SP.sm + 2,
        padding: `${SP.sm + 2}px ${SP.md}px` }}>
        {/* ícono, no texto: a 13 px la flecha compite con el título del acordeón */}
        <span className="vw-flecha" aria-hidden style={{ color: c.txt3, fontSize: 9, lineHeight: 1 }}>▶</span>
        <span style={{ ...t.bodyF, flex: 1 }}>{titulo}</span>
        {resumen && <span style={{ ...t.micro, fontFamily: MONO }}>{resumen}</span>}
      </summary>
      <div className="vw-cuerpo" style={{ padding: `${SP.md}px ${SP.md}px ${SP.md}px`,
        borderTop: `1px solid ${c.border}` }}>
        {children}
      </div>
    </details>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ÁTOMOS
// ═══════════════════════════════════════════════════════════════════════════════

export function Badge({ tono = "neutro", children, punto = false, tip }) {
  const T = TONO[tono] ?? TONO.neutro;
  const el = (
    <span style={{ ...s.badge, background: T.bg, color: T.fg, border: `1px solid ${T.bd}` }}>
      {punto && <span style={{ width: 5, height: 5, borderRadius: R.full, background: T.fg }} />}
      {children}
    </span>
  );
  return tip ? <Tip texto={tip}>{el}</Tip> : el;
}

// BOTONES con jerarquía explícita. Un `primario` por pantalla; el resto, secundarios.
export function Boton({ variante = "secundario", onClick, children, disabled, title, style }) {
  const base = variante === "primario" ? s.btn : variante === "peligro" ? s.btnR : s.btnG;
  const cls = variante === "primario" ? "vw-btn" : variante === "peligro" ? "vw-btnR" : "vw-btn2";
  const fantasma = variante === "fantasma"
    ? { background: "transparent", border: "1px solid transparent", color: c.txt2 } : null;
  return (
    <button className={cls} onClick={onClick} disabled={disabled} title={title}
      style={{ ...base, ...fantasma, ...(disabled ? { opacity: .45, cursor: "not-allowed" } : null), ...style }}>
      {children}
    </button>
  );
}

// DATO DESTACADO. El valor va grande; el rótulo, chico y arriba. Al revés —rótulo grande,
// valor chico— es como estaba y obligaba a buscar el número.
export function Stat({ label, valor, unidad, tono, ayuda, sub }) {
  const T = tono ? TONO[tono] : null;
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...t.micro, marginBottom: 3, display: "flex", alignItems: "center" }}>
        {label}{ayuda && <Ayuda>{ayuda}</Ayuda>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5, minWidth: 0 }}>
        <span style={{ ...t.numG, color: T ? T.fg : c.txt, overflow: "hidden", textOverflow: "ellipsis" }}>{valor}</span>
        {unidad && <span style={{ ...t.micro, color: c.txt3 }}>{unidad}</span>}
      </div>
      {sub && <div style={{ ...t.micro, marginTop: 3, color: c.txt3 }}>{sub}</div>}
    </div>
  );
}

// Fila de datos destacados. Se separa de `Stat` porque el ancho mínimo es la decisión
// que evita que tres números queden apretados en una columna de 200 px.
export function Stats({ children, min = 140 }) {
  return (
    <div style={{ display: "grid", gap: SP.md,
      gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))` }}>{children}</div>
  );
}

// Separador con rótulo, para partir una tarjeta larga sin abrir otra tarjeta.
export function Divisor({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: SP.sm + 2, margin: `${SP.lg}px 0 ${SP.md}px` }}>
      {children && <span style={t.eyebrow}>{children}</span>}
      <span style={{ flex: 1, height: 1, background: c.border }} />
    </div>
  );
}

// AVISO — el recuadro de color que antes cada bloque se dibujaba solo, con los colores
// escritos a mano y un ámbar distinto en cada lugar. Acá el tono sale de `TONO`, así que
// un aviso, una advertencia y un error se distinguen entre sí y son iguales en toda la
// aplicación.
export function Aviso({ tono = "aviso", titulo, fig, children }) {
  const T = TONO[tono] ?? TONO.aviso;
  return (
    <div style={{ background: T.bg, border: `1px solid ${T.bd}`, borderLeft: `3px solid ${T.fg}`,
      borderRadius: R.md, padding: `${SP.sm + 2}px ${SP.md}px`, marginBottom: SP.md }}>
      {titulo && <div style={{ ...t.bodyF, marginBottom: children ? 3 : 0 }}>{titulo}{fig && <Figura fig={fig} />}</div>}
      {children && <div style={{ ...t.body, lineHeight: 1.65 }}>{children}</div>}
    </div>
  );
}

// Nota al pie de una tabla o un croquis. Un solo lugar para el cuerpo y el interlineado:
// las notas del reglamento son largas y a interlineado 1,4 no se leen.
export function Nota({ children }) {
  return <div style={{ ...t.body, color: c.txt3, marginTop: SP.md, lineHeight: 1.75 }}>{children}</div>;
}

// CELDAS DE TABLA. Existen como componentes y no como objetos de estilo porque cada
// pantalla escribía `style={{ padding: "7px 10px", borderBottom: ... }}` a mano, y así es
// como una tabla termina con 7 px de padding y la de al lado con 6. `Th` alinea a la
// izquierda salvo que se le diga, y `TdN` es la celda numérica: alineada a la derecha y
// con cifras de ancho fijo, que es lo que permite recorrer una columna con la vista.
export function Th({ children, alinear = "left", ancho }) {
  return <th style={{ ...s.th, textAlign: alinear, width: ancho }}>{children}</th>;
}
export function Td({ children, tono, peso, fondo, nowrap = false }) {
  return <td style={{ ...s.td, color: tono, fontWeight: peso, background: fondo,
    whiteSpace: nowrap ? "nowrap" : undefined }}>{children}</td>;
}
export function TdN({ children, tono, peso, fondo, nowrap = true }) {
  // Los números NO se parten por defecto. «55,1 m/s» cortado entre la cifra y la unidad se
  // lee como dos datos, y en una columna angosta pasaba en la mitad de las filas.
  return <td style={{ ...s.tdN, color: tono, fontWeight: peso, background: fondo,
    whiteSpace: nowrap ? "nowrap" : undefined }}>{children}</td>;
}

// Envoltorio de tabla. El scroll horizontal va SIEMPRE: la tabla de cargas tiene siete
// columnas y en un notebook con la barra lateral abierta no entra, y sin esto lo que
// pasa es que la última columna queda cortada contra el borde de la tarjeta.
export function Tabla({ minWidth = 0, children }) {
  return (
    <div style={{ overflowX: "auto", margin: `0 -${SP.sm}px`, padding: `0 ${SP.sm}px` }}>
      <table className="vw-tabla" style={{ ...s.table, minWidth }}>{children}</table>
    </div>
  );
}

// Estado vacío: dice qué falta y cómo llenarlo, en vez de dejar un hueco.
export function Vacio({ titulo, desc, accion }) {
  return (
    <div style={{ textAlign: "center", padding: `${SP.xl}px ${SP.md}px`, color: c.txt3 }}>
      <div style={{ ...t.bodyF, color: c.txt2, marginBottom: SP.xs }}>{titulo}</div>
      {desc && <div style={{ ...t.body, maxWidth: 420, margin: "0 auto" }}>{desc}</div>}
      {accion && <div style={{ marginTop: SP.md }}>{accion}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOASTS
// ═══════════════════════════════════════════════════════════════════════════════
// Confirmación efímera de que algo pasó. Reemplaza al silencio del autoguardado, que es
// lo peor de los dos mundos: el usuario no tiene forma de saber si su trabajo está a salvo.

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ProveedorToast({ children }) {
  const [items, setItems] = useState([]);
  const seq = useRef(0);
  const toast = useCallback((texto, tono = "info", ms = 2600) => {
    const id = ++seq.current;
    setItems(v => [...v, { id, texto, tono }]);
    setTimeout(() => setItems(v => v.filter(x => x.id !== id)), ms);
  }, []);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="vw-noPrint" style={{ position: "fixed", right: SP.lg, bottom: SP.lg, zIndex: 90,
        display: "flex", flexDirection: "column", gap: SP.sm, alignItems: "flex-end", pointerEvents: "none" }}>
        {items.map(it => {
          const T = TONO[it.tono] ?? TONO.info;
          return (
            <div key={it.id} className="vw-toast" style={{
              background: c.overlay, border: `1px solid ${T.bd}`, borderLeft: `3px solid ${T.fg}`,
              borderRadius: R.md, padding: `${SP.sm + 2}px ${SP.md}px`, boxShadow: SOMBRA.pop,
              ...t.body, color: c.txt, maxWidth: 340,
            }}>{it.texto}</div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
