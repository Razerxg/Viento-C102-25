// SHELL DE LA APLICACIÓN.
//
// Barra superior fija, navegación lateral, contenido al centro y ficha del caso al
// costado. Es la misma estructura que la aplicación de bases, y no por parecido: es lo que
// permite que cada pantalla se ocupe de UNA cosa.
//
// Lo que había antes era una sola pantalla con nueve recuadros apilados —mapa, cuatro
// croquis, resultantes, traza, tabla de cargas, ráfaga y resumen— en una columna de 1.240
// px. Toda esa información hace falta; el problema era que estaba toda al mismo tiempo, sin
// jerarquía y sin forma de volver a nada. Mirar un croquis y su tabla de cargas obligaba a
// scrollear tres pantallas entre uno y otro.
import { ProyectoProvider, useProyecto } from "./context/ProyectoContext.jsx";
import { UiProvider } from "./context/UiContext.jsx";
import { EstilosGlobales } from "./components/EstilosGlobales.jsx";
import { ProveedorToast, Aviso, Boton } from "./components/ui.jsx";
import { BarraSuperior } from "./components/shell/BarraSuperior.jsx";
import { Sidebar } from "./components/shell/Sidebar.jsx";
import { FichaEstado } from "./components/shell/FichaEstado.jsx";
import { SelectorDireccion } from "./components/shell/SelectorDireccion.jsx";
import { c, SP, ANCHO_CONTENIDO } from "./components/tokens.js";
import { SIN_DIRECCION, SIN_FICHA } from "./constants/tabs.js";
import { GuiaTab } from "./components/tabs/GuiaTab.jsx";
import { SitioTab } from "./components/tabs/SitioTab.jsx";
import { EdificioTab } from "./components/tabs/EdificioTab.jsx";
import { CerramientoTab } from "./components/tabs/CerramientoTab.jsx";
import { RafagaTab } from "./components/tabs/RafagaTab.jsx";
import { PresionesTab } from "./components/tabs/PresionesTab.jsx";
import { CroquisTab } from "./components/tabs/CroquisTab.jsx";
import { ResultantesTab } from "./components/tabs/ResultantesTab.jsx";
import { ResumenTab } from "./components/tabs/ResumenTab.jsx";
import { SalidasTab } from "./components/tabs/SalidasTab.jsx";
import { AccesoriosTab } from "./components/tabs/AccesoriosTab.jsx";
import { SilosTab } from "./components/tabs/SilosTab.jsx";
import { SeccionesTab } from "./components/tabs/SeccionesTab.jsx";

// El mapa vive acá y no en `constants/tabs.js` a propósito: ese archivo lo importa el
// contexto y lo importarán los tests, y no tiene por qué arrastrar ocho componentes de
// React —ni el motor de croquis— para responder en qué orden van las pantallas.
const PANTALLAS = {
  "Guía": GuiaTab, "Sitio": SitioTab, "Edificio": EdificioTab,
  "Cerramiento": CerramientoTab, "Ráfaga": RafagaTab,
  "Presiones": PresionesTab, "Croquis": CroquisTab, "Resultantes": ResultantesTab,
  "Resumen": ResumenTab, "Salidas": SalidasTab,
  "Accesorios": AccesoriosTab, "Silos y tanques": SilosTab,
  "Secciones uniformes": SeccionesTab,
};

/**
 * Lo que hubo que hacer para abrir el caso: migración de esquema, archivo de otra
 * aplicación, archivo más nuevo que esta versión.
 *
 * ⚠ NO ES UN TOAST. Un aviso que se va solo a los tres segundos no sirve para decir «este
 * proyecto se migró y al guardarlo cambia de formato»: el usuario puede estar mirando otra
 * ventana cuando aparece. Queda hasta que lo cierre.
 */
function AvisosDeApertura() {
  const { aperturaAvisos, descartarAperturaAvisos } = useProyecto();
  if (!aperturaAvisos?.length) return null;
  return (
    <div style={{ marginBottom: SP.lg }}>
      <Aviso tono="info" titulo="Al abrir este proyecto">
        {aperturaAvisos.map((x, i) => <div key={i} style={{ marginBottom: 4 }}>{x}</div>)}
        <div style={{ marginTop: SP.sm }}>
          <Boton onClick={descartarAperturaAvisos}>Entendido</Boton>
        </div>
      </Aviso>
    </div>
  );
}

function Shell() {
  const { nombreTab } = useProyecto();
  const Pantalla = PANTALLAS[nombreTab] ?? GuiaTab;
  const conFicha = !SIN_FICHA.has(nombreTab);

  return (
    <div style={{ minHeight: "100vh", background: c.canvas, color: c.txt }}>
      <BarraSuperior />
      <div className="vw-shell" style={{ display: "flex", alignItems: "flex-start" }}>
        <Sidebar />
        <main className="vw-main" style={{ flex: 1, minWidth: 0, padding: `${SP.lg}px ${SP.lg}px ${SP.xxl}px` }}>
          {/* El contenido se centra y se acota: líneas de 1.500 px no se leen. Con ficha,
              la grilla es contenido + ficha; sin ficha, una sola columna. */}
          <div className="vw-conPanel" style={{
            maxWidth: ANCHO_CONTENIDO, margin: "0 auto",
            display: "grid", gap: SP.lg,
            gridTemplateColumns: conFicha ? "minmax(0,1fr) auto" : "minmax(0,1fr)",
            alignItems: "start",
          }}>
            {/* `key` fuerza el remount al cambiar de pantalla: reinicia el scroll interno
                y dispara la animación de entrada, así el cambio se percibe. */}
            <div key={nombreTab} className="vw-entra" style={{ minWidth: 0 }}>
              <AvisosDeApertura />
              {!SIN_DIRECCION.has(nombreTab) && <SelectorDireccion />}
              <Pantalla />
            </div>
            {conFicha && <FichaEstado />}
          </div>
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <UiProvider>
      <ProyectoProvider>
        <ProveedorToast>
          <EstilosGlobales />
          <Shell />
        </ProveedorToast>
      </ProyectoProvider>
    </UiProvider>
  );
}
