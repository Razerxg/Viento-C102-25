// PREFERENCIAS DE INTERFAZ. Deliberadamente SEPARADO del proyecto.
//
// Acá vive únicamente cómo se ve la app: el tema, si la barra lateral está abierta y si
// la ficha de estado está desplegada. Nada de esto entra en el archivo del proyecto ni se
// exporta con él —que alguien mire la app en oscuro no es un dato del cálculo—, y
// mezclarlo con el contexto del proyecto haría que cambiar una preferencia disparara el
// autoguardado del cálculo.
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { TEMA_DEF } from '../components/tokens.js';

const KEY = "viento_ui_v1";
const UiContext = createContext(null);
export const useUi = () => useContext(UiContext);

const leer = () => {
  try { return JSON.parse(window.localStorage.getItem(KEY) || "{}"); } catch { return {}; }
};

// ── ¿PANTALLA ANGOSTA? ───────────────────────────────────────────────────────────
//
// El mismo corte que usa el CSS (900 px). Hace falta EN JAVASCRIPT y no sólo en una media
// query porque acá hay COMPORTAMIENTO y no sólo apariencia: en angosto la navegación es
// un cajón que se cierra al elegir una pantalla, y eso el CSS no lo puede hacer.
//
// Escucha los cambios en vez de mirar el ancho una sola vez: girar el teléfono cruza el
// umbral con la app ya abierta.
const ANGOSTO = "(max-width: 900px)";
function useAngosto() {
  const [angosto, setAngosto] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia(ANGOSTO).matches : false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(ANGOSTO);
    const f = e => setAngosto(e.matches);
    mq.addEventListener("change", f);
    setAngosto(mq.matches);
    return () => mq.removeEventListener("change", f);
  }, []);
  return angosto;
}

export function UiProvider({ children }) {
  const inicial = typeof window === "undefined" ? {} : leer();
  const angosto = useAngosto();

  // En pantalla ancha la barra lateral va abierta: tener las ocho pantallas a la vista es
  // la razón por la que se hizo vertical. En angosto arranca CERRADA, porque se come
  // media pantalla y no queda nada para leer.
  const [nav, setNav] = useState(() => inicial.nav !== undefined ? !!inicial.nav
    : !(typeof window !== "undefined" && window.matchMedia
      && window.matchMedia(ANGOSTO).matches));
  // Al CRUZAR a angosto el cajón se cierra aunque la preferencia diga abierto: un panel
  // superpuesto que aparece solo tapando el contenido no es lo que nadie espera al girar
  // el teléfono. Al volver a ancho se respeta lo que el usuario haya elegido.
  const cruzo = useRef(angosto);
  useEffect(() => {
    if (angosto && !cruzo.current) setNav(false);
    cruzo.current = angosto;
  }, [angosto]);

  // TEMA. Si el usuario nunca eligió se respeta lo que pide el sistema operativo. Una vez
  // que elige, manda su elección y no se vuelve a mirar el sistema.
  const [tema, setTema] = useState(() => {
    if (inicial.tema === "claro" || inicial.tema === "oscuro") return inicial.tema;
    if (typeof window !== "undefined" && window.matchMedia
      && window.matchMedia("(prefers-color-scheme: dark)").matches) return "oscuro";
    return TEMA_DEF;
  });

  // El tema se aplica poniendo un ATRIBUTO en el elemento raíz: las variables tienen que
  // alcanzar también al <body>, que queda fuera del árbol de React. Puesto en un div
  // interior, el fondo de la página seguiría siendo el del tema por defecto.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.tema = tema;
  }, [tema]);

  useEffect(() => {
    try { window.localStorage.setItem(KEY, JSON.stringify({ tema, nav })); } catch {}
  }, [tema, nav]);

  return (
    <UiContext.Provider value={{
      angosto, nav, setNav, alternarNav: () => setNav(v => !v),
      // Cerrar SÓLO si es un cajón superpuesto. En ancho la barra queda donde está: quien
      // elige una pantalla desde una barra fija espera que la barra siga ahí.
      cerrarNavSiCajon: () => { if (angosto) setNav(false); },
      tema, setTema, oscuro: tema === "oscuro",
      alternarTema: () => setTema(t => t === "oscuro" ? "claro" : "oscuro"),
    }}>{children}</UiContext.Provider>
  );
}
