// CONTROL AUTOMÁTICO DE CROQUIS.
//
// ── QUÉ ES ─────────────────────────────────────────────────────────────────────
// Abre el BUILD DE PRODUCCIÓN en Chromium, carga una a una las geometrías de
// `qa-matriz.js`, recorre las pantallas que dibujan algo en los dos temas —y en las
// cuatro direcciones donde el dibujo cambia—, y mide sobre el resultado renderizado lo
// que un croquis no puede tener: textos montados, números tachados por una línea, dibujo
// fuera del lienzo, letra ilegible, contraste insuficiente, regiones sin rotular y vistas
// del mismo edificio a escalas distintas.
//
// ── POR QUÉ HACE FALTA ─────────────────────────────────────────────────────────
// Los tests de vitest prueban el MOTOR, que es donde vive la ingeniería, y la prueba de
// humo prueba que las pantallas renderizan sin tirar. Ninguna de las dos ve que «h =
// 3,00 m» quedó tachado por su propia línea de cota. Eso se ve mirando, y mirar a mano
// trece geometrías por cinco pantallas por dos temas son ciento treinta pantallas: no se
// hace, y por eso los defectos se acumulan hasta que alguien los junta en una lista.
//
// ── CÓMO SE CORRE ──────────────────────────────────────────────────────────────
//   npm run build:solo && npm run qa:croquis
//
// No entra en `npm run build` a propósito: necesita un Chromium instalado, que en CI no
// está, y una corrida completa lleva minutos. Es un control de ENTREGA de croquis, no de
// cada commit.
//
//   QA_CASOS=referencia,torre   limita la matriz
//   QA_CHROMIUM=/ruta/al/chrome  si no está donde el script lo busca
//
// Salida: `docs/croquis-qa/<caso>.png` —una hoja de contacto por geometría, para mirar—
// y `docs/croquis-qa/resumen.md` con las fallas. Termina con código 1 si hay alguna.
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, rm, readdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MATRIZ, PANTALLAS, DIRECCIONES, estadoDe } from "./qa-matriz.js";
import { chequearEnPagina } from "./qa-chequeos.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(RAIZ, "dist");
const SALIDA = join(RAIZ, "docs", "croquis-qa");
const CFG = { minPx: 11, minContraste: 4.5, tolerancia: 1 };
const TEMAS = ["claro", "oscuro"];
const VISTA = { width: 1440, height: 1100 };

// ── EL CHROMIUM ────────────────────────────────────────────────────────────────
// `playwright-core` no baja navegadores. Se usa el que ya está en la máquina, y si no
// está, el script lo dice con la ruta que probó en vez de fallar con un stack de
// Playwright que no explica nada.
function buscarChromium() {
  if (process.env.QA_CHROMIUM) return process.env.QA_CHROMIUM;
  const base = "/opt/pw-browsers";
  if (!existsSync(base)) return null;
  const candidatos = [];
  for (const d of ["chromium", ...readdirSync(base).filter(x => x.startsWith("chromium-"))]) {
    for (const rel of ["chrome-linux/chrome", "chrome-linux/headless_shell", ""]) {
      const p = rel ? join(base, d, rel) : join(base, d);
      if (existsSync(p) && statSync(p).isFile()) candidatos.push(p);
    }
  }
  return candidatos[0] ?? null;
}
// `readdirSync` sólo se usa acá arriba; se importa así para no cargar `fs` entero.
import { readdirSync } from "node:fs";

// ── SERVIDOR ESTÁTICO SOBRE dist/ ──────────────────────────────────────────────
// Treinta líneas propias en vez de `vite preview` como proceso aparte: no hay que
// adivinar cuándo terminó de levantar ni matarlo si el script se cae.
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json",
  ".woff2": "font/woff2", ".ico": "image/x-icon" };

function servir(dir) {
  const srv = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://x");
      let p = join(dir, decodeURIComponent(url.pathname));
      if (!existsSync(p) || statSync(p).isDirectory()) p = join(dir, "index.html");
      const cuerpo = await readFile(p);
      res.writeHead(200, { "content-type": MIME[extname(p)] ?? "application/octet-stream" });
      res.end(cuerpo);
    } catch { res.writeHead(404); res.end("no"); }
  });
  return new Promise(ok => srv.listen(0, "127.0.0.1", () => ok(
    { srv, url: `http://127.0.0.1:${srv.address().port}/` })));
}

// ── UNA PASADA ─────────────────────────────────────────────────────────────────
const esperar = (p, ms) => p.waitForTimeout(ms);

async function cargarCaso(page, url, caso, tema) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.evaluate(([estado, tema]) => {
    window.localStorage.setItem("viento_proyecto_v1", JSON.stringify(estado));
    window.localStorage.setItem("viento_ui_v1", JSON.stringify({ tema, nav: true }));
  }, [estadoDe(caso), tema]);
  await page.goto(url, { waitUntil: "networkidle" });
  await esperar(page, 350);
}

async function irA(page, pantalla) {
  // El nombre del botón se recorta con puntos suspensivos en la barra angosta, así que se
  // busca por prefijo y no por igualdad.
  const b = page.getByRole("button", { name: new RegExp("^" + pantalla.slice(0, 18)) }).first();
  if (!await b.count()) return false;
  await b.click();
  await esperar(page, 450);
  return true;
}

async function elegirDireccion(page, dir) {
  const b = page.getByRole("button", { name: dir, exact: true }).first();
  if (!await b.count()) return false;
  await b.click();
  await esperar(page, 350);
  return true;
}

/** Captura cada croquis de la pantalla, en base64, junto con su rótulo. */
async function capturar(page) {
  const svgs = await page.locator('svg[role="img"]').all();
  const tomas = [];
  for (const s of svgs) {
    const caja = await s.boundingBox();
    if (!caja || caja.width < 40 || caja.height < 30) continue;
    if (caja.height > 2000) continue;           // una vista 3D interactiva enorme
    const etiqueta = await s.getAttribute("aria-label") ?? "(sin rótulo)";
    try {
      tomas.push({ etiqueta, png: (await s.screenshot({ timeout: 8000 })).toString("base64") });
    } catch { /* un croquis que no se puede capturar se reporta como falla aparte */ }
  }
  return tomas;
}

// ── HOJA DE CONTACTO ───────────────────────────────────────────────────────────
// Se arma como una página y se le saca una captura: componer PNG a mano pediría una
// librería de imágenes, y lo único que hace falta es poner las miniaturas en una grilla
// con su rótulo. La hoja va en el tema claro siempre —es para imprimir y marcar—, con
// las miniaturas de los dos temas una al lado de la otra.
async function hojaDeContacto(browser, caso, bloques, destino) {
  const celdas = bloques.map(b => `
    <figure>
      <figcaption><b>${b.pantalla}</b>${b.dir ? ` · ${b.dir}` : ""} · ${b.tema}
        <span>${b.etiqueta}</span></figcaption>
      <img src="data:image/png;base64,${b.png}" />
    </figure>`).join("");
  const html = `<!doctype html><meta charset="utf-8"><style>
    body { font: 13px/1.4 system-ui, sans-serif; background: #fff; color: #111;
           margin: 0; padding: 22px; }
    h1 { font-size: 17px; margin: 0 0 2px; }
    p.porque { margin: 0 0 18px; color: #555; max-width: 900px; }
    .grilla { display: grid; gap: 14px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    figure { margin: 0; border: 1px solid #d9d9d9; border-radius: 6px; overflow: hidden; }
    figcaption { font-size: 11px; padding: 5px 8px; background: #f3f3f3;
                 border-bottom: 1px solid #e3e3e3; }
    figcaption span { color: #777; display: block; }
    img { display: block; width: 100%; background: #fafafa; }
  </style>
  <h1>${caso.nombre}</h1>
  <p class="porque">${caso.porque}</p>
  <div class="grilla">${celdas}</div>`;
  const p = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  await p.setContent(html, { waitUntil: "load" });
  await p.screenshot({ path: destino, fullPage: true });
  await p.close();
}

// ── PRINCIPAL ──────────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(join(DIST, "index.html"))) {
    console.error("No hay build en dist/. Corré antes:  npm run build:solo");
    process.exit(2);
  }
  const exe = buscarChromium();
  if (!exe) {
    console.error("No encontré Chromium. Pasá la ruta en QA_CHROMIUM=/ruta/al/chrome.");
    process.exit(2);
  }

  const filtro = (process.env.QA_CASOS || "").split(",").map(s => s.trim()).filter(Boolean);
  const casos = filtro.length ? MATRIZ.filter(c => filtro.includes(c.id)) : MATRIZ;
  if (!casos.length) { console.error("La matriz quedó vacía con ese filtro."); process.exit(2); }

  await rm(SALIDA, { recursive: true, force: true });
  await mkdir(SALIDA, { recursive: true });
  const { srv, url } = await servir(DIST);
  const browser = await chromium.launch({ executablePath: exe });

  /** @type {any[]} */
  const fallas = [];
  const erroresConsola = [];
  let capturas = 0;

  for (const caso of casos) {
    const bloques = [];
    for (const tema of TEMAS) {
      const page = await browser.newPage({ viewport: VISTA });
      page.on("pageerror", e => erroresConsola.push(`${caso.id}/${tema}: ${e.message}`));
      page.on("console", m => { if (m.type() === "error") erroresConsola.push(`${caso.id}/${tema}: ${m.text()}`); });
      await cargarCaso(page, url, caso, tema);

      for (const pant of PANTALLAS) {
        if (!await irA(page, pant.nombre)) {
          fallas.push({ caso: caso.id, tema, tipo: "pantalla-ausente",
            donde: pant.nombre, detalle: "no encontré el botón de la pantalla" });
          continue;
        }
        const dirs = pant.porDireccion ? DIRECCIONES : [null];
        for (const dir of dirs) {
          if (dir && !await elegirDireccion(page, dir)) continue;
          const nuevas = await page.evaluate(chequearEnPagina, CFG);
          for (const f of nuevas) fallas.push({ caso: caso.id, tema, dir, ...f });
          for (const t of await capturar(page)) {
            bloques.push({ pantalla: pant.nombre, dir, tema, ...t });
            capturas++;
          }
        }
      }
      await page.close();
    }
    const destino = join(SALIDA, `${caso.id}.png`);
    await hojaDeContacto(browser, caso, bloques, destino);
    const propias = fallas.filter(f => f.caso === caso.id).length;
    console.log(`${caso.id.padEnd(16)} ${String(bloques.length).padStart(3)} croquis · `
      + `${propias ? `${propias} fallas` : "sin fallas"}`);
  }

  await browser.close();
  srv.close();

  // ── RESUMEN ────────────────────────────────────────────────────────────────
  const porTipo = {};
  for (const f of fallas) (porTipo[f.tipo] ??= []).push(f);
  const md = [
    "# Control automático de croquis",
    "",
    `Corrida sobre ${casos.length} geometrías · ${capturas} croquis capturados · `
    + `${fallas.length} fallas.`,
    "",
    "Las hojas de contacto están al lado de este archivo, una por geometría.",
    "",
    fallas.length ? "## Fallas por tipo" : "## Sin fallas",
    "",
  ];
  for (const [tipo, lista] of Object.entries(porTipo).sort((a, b) => b[1].length - a[1].length)) {
    md.push(`### ${tipo} — ${lista.length}`, "");
    md.push("| Caso | Tema | Dir. | Croquis | Detalle |", "|---|---|---|---|---|");
    for (const f of lista.slice(0, 60)) {
      md.push(`| ${f.caso} | ${f.tema} | ${f.dir ?? "—"} | ${f.donde} | ${f.detalle} |`);
    }
    if (lista.length > 60) md.push(`| … | | | | y ${lista.length - 60} más |`);
    md.push("");
  }
  if (erroresConsola.length) {
    md.push("## Errores de consola", "");
    for (const e of [...new Set(erroresConsola)].slice(0, 30)) md.push(`- \`${e}\``);
    md.push("");
  }
  await writeFile(join(SALIDA, "resumen.md"), md.join("\n"), "utf8");

  console.log(`\n${fallas.length} fallas · ${capturas} croquis · ${SALIDA}/resumen.md`);
  process.exit(fallas.length ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
