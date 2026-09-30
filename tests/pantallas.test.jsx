/**
 * @vitest-environment jsdom
 *
 * SMOKE TEST DE LAS PANTALLAS.
 *
 * ── QUÉ AGUJERO TAPA ───────────────────────────────────────────────────────────
 * El motor tiene 700 tests y el typecheck cubre `engine`, `constants` y `lib`. Los
 * componentes no estaban cubiertos por nada: en `SitioTab` se usaron `Divisor` y `t` sin
 * importarlos, el build pasó limpio, los 685 tests pasaron, y la pantalla explotaba recién
 * al abrirla en el navegador. ESLint atrapa ese caso concreto; esto atrapa la familia
 * entera —un `undefined.map`, una prop que cambió de nombre, un hook mal ordenado, un
 * `toFixed` sobre un string— que sólo aparece RENDERIZANDO.
 *
 * ── POR QUÉ FALLA ANTE CUALQUIER `console.error` ───────────────────────────────
 * React no tira una excepción por una key repetida, por una prop inválida ni por un
 * `<div>` adentro de un `<p>`: lo escribe en la consola y sigue. En un test eso pasaría
 * desapercibido, que es exactamente como esos defectos llegan a producción.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react';
import { App } from '../src/App.jsx';
import { TABS } from '../src/constants/tabs.js';

// ── EL PROYECTO DE EJEMPLO ──────────────────────────────────────────────────────
//
// No es el estado inicial: es un caso que ENCIENDE las ramas que el inicial deja apagadas
// —cubierta a dos aguas en vez de plana, topografía declarada y cumpliendo las tres
// condiciones, edificio flexible, exposición D—. Un smoke test sobre el caso por defecto
// verifica el camino que ya se mira a diario y ninguno de los otros.
const EJEMPLO = {
  proyecto: "Caso de prueba",
  ciudad: "Comodoro Rivadavia", riesgo: "III", exposicion: "D",
  altitud: "250", usarKe: true, cerramiento: "parc_cerrado",
  topo: {
    forma: "loma_2D", exposicionLocal: "", H_m: "40", Lh_m: "60", x_m: "15",
    lado: "barlovento", cond1: true, metodo: "expresiones",
    todasLasDirecciones: false, direcciones: ["Wx+", "Wy-"],
  },
  geo: { a: "18", b: "42", hAlero: "9", theta: "22", cumbrera: "Y",
    tipo: "dos_aguas", pendienteHacia: "+Y" },
  n1: "0.8", beta: "0.015", modoG: "flexible", tipoFrec: "", puntosPerfil: "8",
};

const errores = [];
let spyError, spyWarn;

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem("viento_proyecto_v1", JSON.stringify(EJEMPLO));
  errores.length = 0;
  spyError = vi.spyOn(console, "error").mockImplementation((...a) => errores.push(a.join(" ")));
  spyWarn = vi.spyOn(console, "warn").mockImplementation((...a) => errores.push(a.join(" ")));
});

afterEach(() => {
  spyError.mockRestore();
  spyWarn.mockRestore();
  cleanup();
});

/**
 * Abre una pantalla por su nombre en la navegación lateral y CONFIRMA que se abrió.
 *
 * ⚠ La confirmación no es celo: con un `.click()` crudo —sin `fireEvent`, que envuelve el
 * evento en `act()`— React no alcanza a reconciliar y el `<main>` sigue mostrando la
 * pantalla anterior. El test pasaba igual, porque «hay texto y no hay errores» lo cumple
 * la Guía once veces seguidas. `aria-current` es lo que distingue navegar de no navegar.
 */
const abrir = (nombre) => {
  const nav = document.querySelector("nav") ?? document.body;
  const boton = within(nav).getByRole("button", { name: nombre });
  fireEvent.click(boton);
  expect(boton.getAttribute("aria-current"), `no se abrió «${nombre}»`).toBe("page");
  return document.querySelector("main").textContent;
};

describe('todas las pantallas renderizan sin errores de consola', () => {
  for (const nombre of TABS) {
    it(nombre, () => {
      render(<App />);
      const texto = abrir(nombre);
      // Algo se dibujó: si el árbol quedara vacío, «sin errores» no querría decir nada.
      expect(texto.length).toBeGreaterThan(200);
      expect(errores, `${nombre}:\n${errores.join("\n")}`).toEqual([]);
    });
  }

  // Y son pantallas DISTINTAS. Sin esto, una navegación rota que dejara siempre la misma
  // pantalla en el `<main>` pasaría todos los casos de arriba sin tocar ninguna otra.
  it('todas muestran contenidos distintos entre sí', () => {
    render(<App />);
    const textos = TABS.map(t => abrir(t).slice(0, 400));
    expect(new Set(textos).size).toBe(TABS.length);
    expect(errores, errores.join("\n")).toEqual([]);
  });
});

describe('el proyecto de ejemplo llega efectivamente a la pantalla', () => {
  // Si el `localStorage` no se leyera —una clave mal escrita, una fusión que lo pisa— el
  // test de arriba seguiría pasando, pero sobre el caso por defecto: verificaría el camino
  // que justamente no se quería verificar.
  it('la barra superior muestra el nombre del proyecto de ejemplo', () => {
    render(<App />);
    expect(screen.getAllByDisplayValue("Caso de prueba").length).toBeGreaterThan(0);
  });

  it('la pantalla Sitio informa el K_zt de la loma declarada, no 1,0', () => {
    render(<App />);
    const main = abrir("Sitio");
    expect(main).toContain("K_zt al nivel del terreno");
    expect(main).not.toContain("sin efecto topográfico");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('el alero adosado en pantalla — art. 5.9', () => {
  // ⚠ EL SMOKE TEST DE ARRIBA NO CUBRE ESTA SECCIÓN. El alero adosado arranca APAGADO, así
  // que en el recorrido de las pantallas su formulario, su croquis y sus dos tablas no se
  // renderizan nunca: el caso que el test creía cubrir es el único que no ejercita. Acá se
  // enciende, que es la mitad del código de esa pantalla.
  const conAlero = (extra = {}) => {
    window.localStorage.setItem("viento_proyecto_v1", JSON.stringify({
      ...EJEMPLO,
      aleroAdosado: { hay: true, pared: "+X", ancho: "8", vuelo: "3", hc: "3.2", he: "",
        pendiente: "0.01", dosSuperficies: true, interpolarH: false, ...extra },
      elementosAlero: [
        { id: "al-1", nombre: "Viga del alero", tipo: "correa", L: "2.5", s: "1.2", area: "" },
      ],
    }));
  };

  it('con el alero encendido, la pantalla de C&R lo dibuja y lo tabula', () => {
    conAlero();
    render(<App />);
    const main = abrir("Componentes y revestimientos");
    expect(main).toContain("Alero adosado a pared");
    expect(main).toContain("h_c / h_e");
    // Las dos verificaciones que C 5.9 pide con dos superficies físicas.
    expect(main).toContain("Fijaciones de las superficies superior e inferior");
    expect(main).toContain("Estructura del alero");
    expect(errores, errores.join("\n")).toEqual([]);
  });

  it('con una sola superficie sólo aparece la verificación de la estructura', () => {
    conAlero({ dosSuperficies: false });
    render(<App />);
    const main = abrir("Componentes y revestimientos");
    expect(main).toContain("Estructura del alero");
    expect(main).not.toContain("Fijaciones de las superficies");
    expect(errores, errores.join("\n")).toEqual([]);
  });

  it('el croquis del alero se renderiza sin errores y trae sus tres alturas', () => {
    conAlero();
    render(<App />);
    abrir("Componentes y revestimientos");
    const svg = [...document.querySelectorAll("svg")]
      .find(x => x.getAttribute("data-edificio") === "alero-adosado");
    expect(svg, "no se encontró el croquis del alero adosado").toBeTruthy();
    const texto = svg.textContent;
    expect(texto).toMatch(/h = /);
    expect(texto).toMatch(/h_e = /);
    expect(texto).toMatch(/h_c = /);
    expect(errores, errores.join("\n")).toEqual([]);
  });
});
