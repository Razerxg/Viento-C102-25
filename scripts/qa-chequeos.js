// LOS CHEQUEOS DE UN CROQUIS, TAL COMO CORREN DENTRO DEL NAVEGADOR.
//
// ── POR QUÉ SE MIDE EN EL NAVEGADOR Y NO SOBRE EL SVG COMO TEXTO ────────────────
// Un `<text>` no tiene ancho hasta que un motor de texto lo mide con una fuente concreta.
// Todos los defectos que este control busca —un rótulo que se monta sobre otro, una línea
// que tacha un número, una letra que quedó chica porque el dibujo se escaló— son del
// resultado RENDERIZADO. Leer el SVG como cadena encuentra otra cosa, y no ésta.
//
// La función se serializa y se ejecuta con `page.evaluate`, así que NO puede cerrar sobre
// nada de este módulo: todo lo que necesita entra por argumento o está definido adentro.
// Es fea por eso, no por gusto.

/**
 * @typedef {object} Falla
 * @property {string} tipo
 * @property {string} donde     el croquis, por su `aria-label`
 * @property {string} detalle
 */

/**
 * Corre todos los chequeos sobre los croquis visibles de la pantalla.
 *
 * @param {{minPx: number, minContraste: number, tolerancia: number}} cfg
 * @returns {Falla[]}
 */
export function chequearEnPagina(cfg) {
  const { minPx, minContraste, tolerancia } = cfg;
  /** @type {any[]} */
  const fallas = [];
  const svgs = [...document.querySelectorAll('svg[role="img"]')]
    .filter(s => s.getBoundingClientRect().width > 0);

  // ── utilidades ────────────────────────────────────────────────────────────
  const nombre = (svg) => svg.getAttribute("aria-label") || "(sin aria-label)";
  const F = (tipo, svg, detalle) => fallas.push({ tipo, donde: nombre(svg), detalle });
  const r2 = (n) => Math.round(n * 10) / 10;
  const recorte = (t) => (t.length > 40 ? t.slice(0, 38) + "…" : t);

  /** Intersección de dos rectángulos con tolerancia: negativo = separados. */
  const solapan = (a, b, tol) => (
    a.left < b.right - tol && b.left < a.right - tol
    && a.top < b.bottom - tol && b.top < a.bottom - tol);

  /** rgb(a) → [r,g,b,a]; devuelve null si es transparente o no se entiende. */
  const rgb = (s) => {
    if (!s || s === "none" || s === "transparent") return null;
    const m = String(s).match(/-?[\d.]+/g);
    if (!m || m.length < 3) return null;
    const [r, g, b] = m.map(Number);
    return [r, g, b, m.length > 3 ? Number(m[3]) : 1];
  };

  /** Luminancia relativa de la WCAG. */
  const lum = ([r, g, b]) => {
    const c = [r, g, b].map(v => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const contraste = (a, b) => {
    const [l1, l2] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (l1 + 0.05) / (l2 + 0.05);
  };
  /** Mezcla `frente` con alfa sobre `fondo` opaco. */
  const sobre = (frente, fondo) => {
    const a = frente[3] ?? 1;
    return [0, 1, 2].map(i => frente[i] * a + fondo[i] * (1 - a));
  };

  /** El primer fondo opaco subiendo por el DOM. */
  const fondoDe = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const c = rgb(getComputedStyle(n).backgroundColor);
      if (c && (c[3] ?? 1) > 0.95) return c;
    }
    const c = rgb(getComputedStyle(document.body).backgroundColor);
    return c || [255, 255, 255, 1];
  };

  /**
   * La figura opaca que respalda a un texto, si la tiene. Es el patrón que usan `Rotulo`
   * y `Cota` —un `<rect fill="var(--sup)">` justo antes del `<text>`— y también `Zona`,
   * que usa un `<circle>` en vez de un rectángulo. Mirar sólo rectángulos daba por
   * tachado todo número de zona: el círculo que lo respalda existe y es opaco.
   */
  const respaldoDe = (t) => {
    const padre = t.parentElement;
    if (!padre) return null;
    const caja = t.getBoundingClientRect();
    for (const r of padre.children) {
      const et = r.tagName.toLowerCase();
      if (r === t || (et !== "rect" && et !== "circle")) continue;
      const cr = r.getBoundingClientRect();
      const relleno = rgb(getComputedStyle(r).fill);
      if (!relleno) continue;
      const opac = Number(getComputedStyle(r).fillOpacity || 1)
        * Number(getComputedStyle(r).opacity || 1);
      if (opac < 0.85) continue;
      if (cr.left <= caja.left + 1 && cr.right >= caja.right - 1
        && cr.top <= caja.top + 1 && cr.bottom >= caja.bottom - 1) return { el: r, relleno };
    }
    return null;
  };

  /** Un texto con halo: `paint-order: stroke` y un trazo del color del fondo. */
  const conHalo = (t) => {
    const cs = getComputedStyle(t);
    return /stroke/.test(cs.paintOrder || "")
      && cs.stroke !== "none" && parseFloat(cs.strokeWidth || "0") > 0;
  };

  // ── el recorrido ──────────────────────────────────────────────────────────
  for (const svg of svgs) {
    const textos = [...svg.querySelectorAll("text")]
      .filter(t => (t.textContent || "").trim() !== "")
      .filter(t => t.getBoundingClientRect().width > 0);

    // 1 · SOLAPE ENTRE TEXTOS, Y ENTRE TEXTO Y CÍRCULO DE RÓTULO ─────────────
    for (let i = 0; i < textos.length; i++) {
      for (let j = i + 1; j < textos.length; j++) {
        const [a, b] = [textos[i], textos[j]];
        if (a.closest("g") === b.closest("g") && a.parentElement === b.parentElement
          && a.previousElementSibling === b) continue;
        if (!solapan(a.getBoundingClientRect(), b.getBoundingClientRect(), tolerancia)) continue;
        F("solape-texto", svg,
          `«${recorte(a.textContent)}» y «${recorte(b.textContent)}»`);
      }
    }
    for (const t of textos) {
      const caja = t.getBoundingClientRect();
      for (const cir of svg.querySelectorAll("circle")) {
        if (cir.parentElement === t.parentElement) continue;   // su propio círculo de zona
        if (parseFloat(cir.getAttribute("r") || "0") < 4) continue;   // puntos de cota
        if (!solapan(caja, cir.getBoundingClientRect(), tolerancia)) continue;
        F("solape-texto-circulo", svg, `«${recorte(t.textContent)}» sobre un círculo`);
      }
    }

    // 2 · TEXTO TACHADO POR UNA LÍNEA ────────────────────────────────────────
    // Se muestrea el trazo con `getPointAtLength` y se pregunta si algún punto cae
    // adentro del texto. El bbox de la línea no sirve: el de una diagonal larga cubre
    // media pantalla sin tocar nada.
    const trazos = [...svg.querySelectorAll("path, line, polyline")]
      .filter(el => typeof el.getTotalLength === "function");
    for (const t of textos) {
      if (conHalo(t) || respaldoDe(t)) continue;               // está protegido
      const caja = t.getBoundingClientRect();
      const propio = t.parentElement;
      let cruzado = null;
      for (const el of trazos) {
        if (el.parentElement === propio) continue;             // su propia línea guía
        let largo = 0;
        try { largo = el.getTotalLength(); } catch { continue; }
        if (!(largo > 0)) continue;
        const ctm = el.getScreenCTM();
        if (!ctm) continue;
        const n = Math.min(400, Math.max(8, Math.ceil(largo / 2)));
        for (let k = 0; k <= n; k++) {
          const p = el.getPointAtLength(largo * k / n);
          const s = new DOMPoint(p.x, p.y).matrixTransform(ctm);
          if (s.x > caja.left + 1 && s.x < caja.right - 1
            && s.y > caja.top + 1 && s.y < caja.bottom - 1) { cruzado = el; break; }
        }
        if (cruzado) break;
      }
      if (cruzado) {
        F("texto-tachado", svg,
          `«${recorte(t.textContent)}» cruzado por un <${cruzado.tagName.toLowerCase()}> `
          + "y sin halo ni fondo");
      }
    }

    // 3 · FUERA DEL viewBox ──────────────────────────────────────────────────
    const vb = svg.viewBox?.baseVal;
    const raizCTM = svg.getScreenCTM();
    if (vb && vb.width > 0 && raizCTM) {
      const inv = raizCTM.inverse();
      for (const el of svg.querySelectorAll("text, rect, circle, line, polyline, polygon, path")) {
        let bb;
        try { bb = el.getBBox(); } catch { continue; }
        if (!(bb.width > 0 || bb.height > 0)) continue;
        const ctm = el.getScreenCTM();
        if (!ctm) continue;
        const aRaiz = inv.multiply(ctm);
        const esquinas = [[bb.x, bb.y], [bb.x + bb.width, bb.y],
          [bb.x, bb.y + bb.height], [bb.x + bb.width, bb.y + bb.height]]
          .map(([x, y]) => new DOMPoint(x, y).matrixTransform(aRaiz));
        const excesos = esquinas.flatMap(p => [
          vb.x - p.x, vb.y - p.y, p.x - (vb.x + vb.width), p.y - (vb.y + vb.height)]);
        const exceso = Math.max(...excesos);
        if (exceso <= 0.5) continue;
        const que = el.tagName.toLowerCase() === "text"
          ? `«${recorte(el.textContent)}»` : `un <${el.tagName.toLowerCase()}>`;
        F("fuera-del-viewbox", svg, `${que} se sale ${r2(exceso)} unidades del lienzo`);
        break;   // uno por croquis alcanza: si se sale uno, se salen varios
      }
    }

    // 4 · EL SVG MÁS ANCHO DE LO QUE DECLARA ─────────────────────────────────
    //
    // ⚠ EL LÍMITE NO ES EL ANCHO DE LA TARJETA, ES EL ANCHO POR EL FACTOR DECLARADO. Los
    // croquis se dibujan a `data-zoom` veces el ancho de su columna —hoy 1,5 para todos— y
    // el envoltorio los desplaza a lo ancho en vez de recortarlos: ese desborde es
    // intencional y está resuelto. Comparado contra el ancho pelado, el control marcaba los
    // 144 croquis de cada geometría y dejaba de servir para lo que existe, que es encontrar
    // el croquis que se sale POR OTRO MOTIVO —un viewBox mal calculado, una tarjeta más
    // angosta de lo previsto—.
    const cont = svg.parentElement;
    if (cont) {
      const [a, b] = [svg.getBoundingClientRect(), cont.getBoundingClientRect()];
      const factor = Number(svg.dataset.zoom) || 1;
      const tope = b.width * factor + 1;
      if (a.width > tope) {
        F("desborda-el-contenedor", svg,
          `${r2(a.width)} px de dibujo contra ${r2(tope)} px permitidos `
          + `(${r2(b.width)} px de tarjeta × ${factor})`);
      }
    }

    // 5 · LETRA MENOR AL MÍNIMO, YA RENDERIZADA ──────────────────────────────
    // Lo que importa es el tamaño EN PANTALLA: un `font-size` de 11 dentro de un grupo
    // escalado a 0,6 se lee como 6,6 px. Por eso se mide con la matriz aplicada.
    for (const t of textos) {
      const cs = getComputedStyle(t);
      const ctm = t.getScreenCTM();
      const escala = ctm ? Math.hypot(ctm.a, ctm.b) : 1;
      const px = parseFloat(cs.fontSize) * escala;
      if (px < minPx - 0.05) {
        F("letra-chica", svg, `«${recorte(t.textContent)}» a ${r2(px)} px (mínimo ${minPx})`);
      }
    }

    // 6 · CONTRASTE ──────────────────────────────────────────────────────────
    for (const t of textos) {
      const cs = getComputedStyle(t);
      const tinta = rgb(cs.fill) || rgb(cs.color);
      if (!tinta) continue;
      const resp = respaldoDe(t);
      const base = fondoDe(svg.parentElement || svg);
      const fondo = resp && resp.relleno ? sobre(resp.relleno, base) : base;
      const k = contraste(sobre(tinta, fondo), fondo);
      if (k < minContraste) {
        F("contraste", svg, `«${recorte(t.textContent)}» a ${r2(k)}:1 (mínimo ${minContraste})`);
      }
    }

    // 7 · REGIÓN DE ZONA SIN RÓTULO ──────────────────────────────────────────
    // Se apoya en la instrumentación del dibujo: cada región conexa lleva
    // `data-zona="<zona>#<n>"` y cada rótulo `data-rotulo="<zona>#<n>"`. Sin eso no se
    // puede saber qué es una región y qué es una línea auxiliar, y el control lo dice
    // en vez de dar por buena una pantalla que no miró.
    const regiones = [...svg.querySelectorAll("[data-zona]")].map(e => e.dataset.zona);
    const rotulos = new Set([...svg.querySelectorAll("[data-rotulo]")]
      .map(e => e.dataset.rotulo));
    if (regiones.length === 0) {
      if (svg.dataset.zonificado === "si") F("sin-instrumentar", svg, "declara zonas y no las marca");
    } else {
      for (const z of new Set(regiones)) {
        if (!rotulos.has(z)) F("region-sin-rotulo", svg, `la región ${z} no tiene número`);
      }
    }
  }

  // 8 · ESCALA DISTINTA ENTRE VISTAS DEL MISMO EDIFICIO ──────────────────────
  // `data-escala` es px de pantalla por metro. Dos vistas del mismo edificio que no
  // comparten escala no se pueden comparar de un vistazo, que es para lo que están.
  const porEdificio = {};
  for (const svg of svgs) {
    const grupo = svg.dataset.edificio;
    const esc = Number(svg.dataset.escala);
    if (!grupo || !Number.isFinite(esc) || esc <= 0) continue;
    // De unidades de `viewBox` a píxeles de pantalla.
    const vb = svg.viewBox?.baseVal;
    const aPx = vb && vb.width > 0 ? svg.getBoundingClientRect().width / vb.width : 1;
    (porEdificio[grupo] ??= []).push({ n: nombre(svg), esc: esc * aPx, svg });
  }
  for (const [grupo, vistas] of Object.entries(porEdificio)) {
    if (vistas.length < 2) continue;
    const ref = vistas[0].esc;
    for (const v of vistas.slice(1)) {
      if (Math.abs(v.esc - ref) / ref <= 0.01) continue;
      F("escala-distinta", v.svg,
        `${grupo}: ${r2(v.esc)} px/m contra ${r2(ref)} px/m de «${vistas[0].n}»`);
    }
  }

  return fallas;
}
