// ÓRBITA DE UNA ESCENA 3D — girar arrastrando, acercar con la rueda, vistas ortogonales.
//
// Portada de la app de bases, con las mismas constantes: las dos aplicaciones se usan una
// al lado de la otra y la cámara tiene que sentirse igual.
//
// LAS VISTAS ORTOGONALES VAN EN ÁNGULO EXACTO, NO «CASI». Un frente con pitch 8° sigue
// mostrando un pedazo de la tapa, que es justo lo que una elevación no debe mostrar: una
// vista ortogonal que no es ortogonal no sirve para lo que sirve una vista ortogonal.
//
// El caso degenerado no existe: con pitch = 0 la proyección queda
// [x·cos(yaw) − y·sen(yaw), −z], que es una elevación exacta, y el descarte por normal
// saca sola la tapa y el fondo porque quedan de canto.
import { useState, useRef } from 'react';

const GR = Math.PI / 180;

export const VISTAS = {
  iso:     { yaw: 45 * GR, pitch: 30 * GR, lab: "Isométrica" },
  planta:  { yaw: 0,       pitch: 90 * GR, lab: "Planta" },
  frenteX: { yaw: 0,       pitch: 0,       lab: "Frente · X–Z" },
  frenteY: { yaw: 90 * GR, pitch: 0,       lab: "Lateral · Y–Z" },
  bajo:    { yaw: 45 * GR, pitch: -25 * GR, lab: "Desde abajo" },
};

export const SENS_YAW = 0.008, SENS_PITCH = 0.006;
export const PITCH_MAX = 90 * GR;
export const ZOOM_MIN = 0.5, ZOOM_MAX = 4, ZOOM_PASO = 1.12;

export const acotarPitch = (p) => Math.max(-PITCH_MAX, Math.min(PITCH_MAX, p));
export const acotarZoom = (z) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));

// Devuelve los `props` listos para pegar en el `<svg>`: así quien la usa no puede
// olvidarse `touchAction: none` —sin eso el dedo hace scroll de la página en vez de
// girar— ni `userSelect: none` —sin eso arrastrar selecciona los rótulos del croquis—.
export function useOrbita(vistaInicial = "iso") {
  const [vista, setVista] = useState({ ...VISTAS[vistaInicial] });
  const [zoom, setZoom] = useState(1);
  const arrastre = useRef(null);

  const irA = (k) => {
    const v = VISTAS[k];
    if (v) { setVista({ yaw: v.yaw, pitch: v.pitch }); setZoom(1); }
  };

  const props = {
    onPointerDown: (ev) => {
      ev.currentTarget.setPointerCapture?.(ev.pointerId);
      arrastre.current = { x: ev.clientX, y: ev.clientY, ...vista };
    },
    onPointerMove: (ev) => {
      const a = arrastre.current; if (!a) return;
      setVista({
        yaw: a.yaw + (ev.clientX - a.x) * SENS_YAW,
        pitch: acotarPitch(a.pitch - (ev.clientY - a.y) * SENS_PITCH),
      });
    },
    onPointerUp: (ev) => { arrastre.current = null; ev.currentTarget.releasePointerCapture?.(ev.pointerId); },
    onPointerCancel: () => { arrastre.current = null; },
    onWheel: (ev) => setZoom(z => acotarZoom(z * (ev.deltaY < 0 ? ZOOM_PASO : 1 / ZOOM_PASO))),
  };

  const estilo = {
    touchAction: "none", userSelect: "none", WebkitUserSelect: "none",
    cursor: arrastre.current ? "grabbing" : "grab",
  };

  return { vista, setVista, zoom, setZoom, irA, props, estilo };
}
