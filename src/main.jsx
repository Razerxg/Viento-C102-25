import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./tema.css";

// El tema se fija en la RAÍZ del documento y no en un div: las variables tienen que
// alcanzar también al <body>, que queda fuera del árbol de React.
createRoot(document.getElementById("root")).render(<App />);
