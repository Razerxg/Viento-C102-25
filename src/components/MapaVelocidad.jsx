// EL MAPA DE VELOCIDAD BÁSICA, Figuras 1.5-1 A · B · C.
//
// Se muestra el que corresponde a la categoría de riesgo elegida —no hay un mapa único:
// el 102-2025 eliminó el factor de importancia y lo reemplazó por TRES mapas, uno por
// período de retorno—. Poder ver el mapa es lo que permite controlar el valor de la tabla
// de ciudades contra las isolíneas, o sacar una velocidad de un lugar que no es ninguna de
// las 29 ciudades.
import { useState } from 'react';

const MAPAS = {
  I:   { archivo: "riesgo-I",      fig: "1.5-1C", retorno: "300 años" },
  II:  { archivo: "riesgo-II",     fig: "1.5-1A", retorno: "700 años" },
  III: { archivo: "riesgo-III-IV", fig: "1.5-1B", retorno: "1.700 años" },
  IV:  { archivo: "riesgo-III-IV", fig: "1.5-1B", retorno: "1.700 años" },
};

export function MapaVelocidad({ riesgo, ciudad, V, fmt }) {
  const [abierto, setAbierto] = useState(false);
  const m = MAPAS[riesgo] ?? MAPAS.II;
  const boton = {
    fontSize: 12, padding: "5px 10px", borderRadius: 5, cursor: "pointer",
    border: "1px solid var(--borde)", background: "var(--fondo)", color: "var(--txt)",
  };
  return (
    <div>
      <button style={boton} onClick={() => setAbierto(a => !a)}>
        {abierto ? "Ocultar el mapa" : `Ver el mapa — Figura ${m.fig}`}
      </button>
      {abierto && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, color: "var(--txt2)", lineHeight: 1.6, marginBottom: 8 }}>
            <b style={{ color: "var(--txt)" }}>Figura {m.fig}</b> — categoría de riesgo {riesgo},
            período de retorno {m.retorno}. El valor que usa el cálculo,
            <b style={{ color: "var(--txt)" }}> {fmt} para {ciudad}</b>, sale de la tabla de
            ciudades de la Figura 1.5-1D; el mapa sirve para controlarlo contra las
            isolíneas y para sacar la velocidad de un sitio que no esté en la tabla.
          </div>
          {/* `background` blanco fijo: el escaneo es en tinta negra sobre papel y en modo
              oscuro sobre fondo oscuro no se leería. */}
          <img src={`mapas/${m.archivo}.png`} alt={`Figura ${m.fig} — velocidad básica del viento`}
            style={{ width: "100%", maxWidth: 480, display: "block", margin: "0 auto",
              background: "#fff", borderRadius: 4, border: "1px solid var(--borde)" }} />
          <div style={{ fontSize: 11, color: "var(--txt2)", marginTop: 8, lineHeight: 1.5 }}>
            Nota 2 de la figura: se admite interpolación lineal entre contornos. Nota 4: en
            terrenos montañosos, quebradas, promontorios marinos y regiones especiales de
            viento hay que examinar condiciones inusuales — el mapa no las cubre.
          </div>
        </div>
      )}
    </div>
  );
}
