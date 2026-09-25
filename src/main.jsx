import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";

// Ya no se importa ninguna hoja de estilos: los colores de los dos temas y las reglas que
// no se pueden escribir en línea las inyecta `EstilosGlobales`, derivadas de `tokens.js`.
// Con un `.css` aparte había DOS fuentes para el mismo color y se notaba: el fondo de la
// página lo ponía el archivo y el de las tarjetas los estilos en línea.
createRoot(document.getElementById("root")).render(<App />);
