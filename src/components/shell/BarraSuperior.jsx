// BARRA SUPERIOR PERSISTENTE.
//
// Lo que tiene que estar a la vista SIEMPRE, esté el usuario en la pantalla que esté: qué
// caso es, con qué reglamento se calcula, si hay algo que mirar y si el trabajo está
// guardado. En la versión anterior no había nada de esto —el encabezado decía el nombre
// del reglamento y tenía un botón de tema— porque tampoco había proyecto que nombrar ni
// guardado del que informar.
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { c, t, SP, R, TRANS, MONO } from '../tokens.js';
import { Badge, Boton, Tip, useToast } from '../ui.jsx';
import { hora } from '../../lib/formato.js';
import { rotuloConteo } from '../../lib/avisos.js';
import { ETIQUETA_ROTULOS, AYUDA_ROTULOS } from '../svg/formatoCroquis.js';

// HAMBURGUESA — abre y cierra la navegación.
//
// En pantalla angosta la barra lateral no se dibuja, y sin este botón la app quedaría sin
// NINGUNA navegación: encerrada en la pantalla en la que uno hubiera caído. En ancho sirve
// para plegar la barra y ganar 232 px, que es lo que se agradece con un croquis grande.
//
// Va PRIMERO, antes de la marca: es la posición donde se lo busca en cualquier app.
function Hamburguesa() {
  const { nav, alternarNav, angosto } = useUi();
  const rot = nav ? "Ocultar las secciones" : "Ver las secciones";
  const btn = (
    <button onClick={alternarNav} aria-label={rot} aria-expanded={nav} className="vw-nav"
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 32, height: 32, borderRadius: R.md, cursor: "pointer", flexShrink: 0,
        background: nav ? c.hover : c.canvas, border: `1px solid ${c.border}`,
        color: c.txt2, transition: `background ${TRANS}`,
      }}>
      {/* Tres líneas dibujadas, no el carácter «☰»: la tipografía del sistema lo renderiza
          con pesos distintos en cada plataforma y en algunas ni existe. */}
      <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden>
        {[1, 6, 11].map(y => <rect key={y} x="0" y={y - 1} width="16" height="2" rx="1" fill="currentColor" />)}
      </svg>
    </button>
  );
  // EN TÁCTIL NO HAY HOVER: el tooltip no informa y sólo puede quedarse pegado encima del
  // cajón que el mismo botón acaba de abrir. El ícono es universal y lleva su aria-label.
  return angosto ? btn : <Tip texto={rot}>{btn}</Tip>;
}

// Conmutador de TEMA. Un solo botón que muestra a qué se va a cambiar, no en cuál se
// está: es la convención de todas las apps con tema y evita tener que leer para saber qué
// hace. Sol y luna, no un botón que dice «Modo oscuro» —que es lo que había— porque a ese
// rótulo hay que leerlo entero para saber si describe el estado o la acción.
function Tema() {
  const { oscuro, alternarTema } = useUi();
  return (
    <Tip texto={oscuro ? "Cambiar al tema claro" : "Cambiar al tema oscuro"}>
      <button onClick={alternarTema} aria-label={oscuro ? "Tema claro" : "Tema oscuro"}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 30, height: 30, borderRadius: R.md, cursor: "pointer",
          background: c.canvas, border: `1px solid ${c.border}`, color: c.txt2,
          fontSize: 14, lineHeight: 1, transition: `background ${TRANS}, color ${TRANS}`,
        }}>{oscuro ? "☀" : "☾"}</button>
    </Tip>
  );
}

// Conmutador de ROTULACIÓN DE LOS CROQUIS. Tres estados, así que es un ciclo y no un
// interruptor: el botón muestra en cuál se está —«2a», «1,5», «2a=»— porque con tres
// opciones «a cuál se va a cambiar» ya no se deduce de un solo rótulo.
//
// ⚠ VA EN LA BARRA SUPERIOR Y NO EN LA BARRA DE CADA CROQUIS, y es una decisión, no una
// comodidad: el modo es UNO para todas las láminas. Puesto en cada croquis, cambiarlo en la
// planta cambiaría también la elevación y la pared de al lado, y el control diría que es
// local cuando no lo es. Acá, al lado del tema, dice lo que es: una preferencia de vista
// que vale para toda la app.
function Rotulacion() {
  const { rotulos, setRotulos } = useUi();
  const siguiente = { simbolo: "medida", medida: "ambos", ambos: "simbolo" };
  const cara = { simbolo: "2a", medida: "1,5", ambos: "2a=" };
  return (
    <Tip texto={`Cotas de los croquis: ${ETIQUETA_ROTULOS[rotulos].toLowerCase()}. `
      + `Tocá para pasar a ${ETIQUETA_ROTULOS[siguiente[rotulos]].toLowerCase()}. `
      + AYUDA_ROTULOS}>
      <button onClick={() => setRotulos(siguiente[rotulos])}
        aria-label={`Cotas de los croquis: ${ETIQUETA_ROTULOS[rotulos]}`}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          minWidth: 38, height: 30, padding: "0 6px", borderRadius: R.md, cursor: "pointer",
          background: c.canvas, border: `1px solid ${c.border}`, color: c.txt2,
          fontFamily: MONO, fontSize: 12, lineHeight: 1,
          transition: `background ${TRANS}, color ${TRANS}`,
        }}>{cara[rotulos]}</button>
    </Tip>
  );
}

export function BarraSuperior() {
  const { proyecto, setProyecto, conteo, irA, guardadoEn, nuevo, exportar, importar,
    fileRef, avisos } = useProyecto();
  const toast = useToast();

  // El estado de la barra resume los AVISOS, no una verificación: esta app no verifica
  // nada, entrega presiones. Lo único que puede decir de un vistazo es si hay hipótesis
  // que el usuario todavía no confirmó, y cuántas.
  const estado = rotuloConteo(conteo);
  const tip = avisos.find(a => a.tono === estado.tono)?.titulo
    ?? "Ninguna hipótesis del modelo quedó sin confirmar.";

  return (
    <header className="vw-noPrint" style={{
      display: "flex", alignItems: "center", gap: SP.md, flexWrap: "wrap",
      padding: `${SP.sm + 2}px ${SP.lg}px`, background: c.surface,
      borderBottom: `1px solid ${c.border}`, position: "sticky", top: 0, zIndex: 40,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: SP.sm + 2, minWidth: 0 }}>
        <Hamburguesa />
        {/* Marca discreta: un cuadrado con borde. En una herramienta de cálculo un
            degradado de dos colores es decoración pura y no aporta nada. */}
        <span aria-hidden style={{ width: 18, height: 18, borderRadius: 3, flexShrink: 0,
          border: `1px solid ${c.txt3}`, background: c.overlay }} />
        <input value={proyecto} onChange={e => setProyecto(e.target.value)}
          aria-label="Nombre del proyecto"
          style={{
            ...t.h2, background: "transparent", border: "1px solid transparent",
            borderRadius: R.sm + 2, padding: "4px 8px", width: 260, minWidth: 120,
            transition: `background ${TRANS}, border-color ${TRANS}`,
          }}
          onFocus={e => { e.target.style.background = c.canvas; e.target.style.borderColor = c.border; }}
          onBlur={e => { e.target.style.background = "transparent"; e.target.style.borderColor = "transparent"; }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: SP.md, flexWrap: "wrap", minWidth: 0 }}>
        <Tip texto="Procedimiento direccional del Capítulo 2, Parte 1, para el sistema principal resistente a la fuerza del viento. Los coeficientes de fuerza del Capítulo 4 y los de componentes y revestimientos del Capítulo 5 no están implementados.">
          <span style={{ ...t.micro, whiteSpace: "nowrap" }}>CIRSOC 102-2025 · direccional · SPRFV</span>
        </Tip>
        <Tip texto={guardadoEn
          ? "El caso se guarda solo en este navegador. «Guardar» descarga el archivo para llevártelo."
          : "Todavía no se guardó nada en esta sesión: el autoguardado corre al primer cambio."}>
          <span style={{ ...t.micro, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
            <span aria-hidden style={{ width: 5, height: 5, borderRadius: R.full,
              background: guardadoEn ? c.verde : c.txt3 }} />
            {guardadoEn ? `guardado ${hora(guardadoEn)}` : "sin cambios"}
          </span>
        </Tip>
      </div>

      <div style={{ flex: 1 }} />

      {/* El badge es CLICABLE y lleva a la Guía, donde está la lista completa de avisos.
          Un indicador que dice «3 a revisar» y no ofrece forma de verlos obliga a buscar
          en ocho pantallas cuáles son. */}
      <button onClick={() => irA("Guía")} title="Ver la lista completa en la Guía"
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
        <Badge tono={estado.tono} punto tip={tip}>{estado.txt}</Badge>
      </button>
      <Rotulacion />
      <Tema />

      <div style={{ display: "flex", gap: SP.sm }}>
        <Boton onClick={nuevo} title="Descarta el autoguardado y vuelve al caso de ejemplo">Nuevo</Boton>
        <Boton onClick={() => fileRef.current?.click()} title="Abrir un caso guardado como archivo">Abrir</Boton>
        <Boton variante="primario" onClick={() => { exportar(); toast("Caso descargado como archivo.", "ok"); }}>
          Guardar
        </Boton>
        <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={importar} />
      </div>
    </header>
  );
}
