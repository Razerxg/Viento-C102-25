// SALIDAS — lo que se lleva afuera de la aplicación.
//
// Está separada del Resumen a propósito. El Resumen es para MIRAR: una tabla por
// dirección y la envolvente. Esto es para EXPORTAR, y lo que hay que decidir acá es otra
// cosa —unidades, dialecto del CSV, qué archivo—, no qué edificio se calculó.
//
// ⚠ TODA SALIDA LLEVA PROCEDENCIA. Versión de la aplicación, edición del reglamento,
// procedimiento, fecha y aviso de responsabilidad profesional. Un listado de presiones sin
// eso es un papel sin origen: dentro de dos años nadie puede decir si salió de la edición
// 2005 o de la 2025, y las dos dan números plausibles para el mismo edificio.
import { useState } from 'react';
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { Encabezado, Card, Campo, Sel, Aviso, Nota, Tabla, Th, Td, Boton, Divisor,
  Acordeon, useToast } from '../ui.jsx';
import { c, SP, t, MONO } from '../tokens.js';
import { PERFILES, UNIDADES } from '../../lib/unidades.js';
import { APP, ESQUEMA, RESPONSABILIDAD, procedenciaTexto } from '../../constants/version.js';
import { DIALECTOS, COLUMNAS, tituloColumna, csvPresiones,
  jsonPresiones } from '../../lib/exportar.js';
import { PanelTraza } from '../PanelTraza.jsx';

/** Descarga un texto como archivo. Un solo lugar: el `revokeObjectURL` se olvida solo. */
function bajar(nombre, texto, tipo) {
  const url = URL.createObjectURL(new Blob([texto], { type: `${tipo};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url; a.download = nombre; a.click();
  URL.revokeObjectURL(url);
}

const limpio = (s) => String(s || "viento").replace(/[^\w\- ]+/g, "").trim() || "viento";

export function SalidasTab() {
  const { todas, resDe, envCasos, sitio, geoN, cerr, gDe, d, aplic,
    traza, trazaMotor } = useProyecto();
  const toast = useToast();
  const [dial, setDial] = useState("programa");
  const [perfilId, setPerfilId] = useState("datos");
  const perfil = PERFILES[perfilId];
  const dialecto = DIALECTOS[dial];

  // ⚠ SE PASA EL OBJETO `cerr` ENTERO, NO LA CLASIFICACIÓN PELADA. Con R_i aplicado el
  // GC_pi usado NO es el de la Tabla 1.11-1, y un archivo que informe «parcialmente
  // cerrado» sin decir el R_i deja a quien lo recibe reconstruyendo un ±0,55 que el
  // cálculo nunca usó.
  const comun = { todas, perfil, proyecto: d.proyecto, cerramiento: cerr };
  const csv = () => csvPresiones({ ...comun, dialecto });
  const json = () => jsonPresiones({ ...comun, resDe, envCasos, sitio, geoN, gDe });

  // Las primeras filas del CSV, para mirar antes de bajarlo. Se genera el archivo REAL y
  // se cortan sus renglones: una vista previa armada aparte terminaría mostrando algo que
  // el archivo no dice.
  const vista = csv().split("\n").filter(x => !x.startsWith("#")).slice(0, 6);
  const cabeceraCerr = csv().split("\n").filter(x => x.startsWith("# GC_pi"));

  return (
    <>
      <Encabezado titulo="Salidas"
        desc="Las presiones de cada cara y cada zona, en las cuatro direcciones y con los
          dos signos de la presión interna, más las resultantes y la envolvente de la
          Figura 2.4-8. Todo lleva la procedencia adentro del archivo." />

      {/* ── PROCEDENCIA ──────────────────────────────────────────────────────── */}
      <Card titulo="Lo que va en la cabecera de todo archivo"
        desc="No es un adorno: es lo que permite auditar el número dentro de dos años.">
        <Tabla minWidth={520}>
          <tbody>
            {procedenciaTexto({ proyecto: d.proyecto }).map(([k, v]) => (
              <tr key={k}>
                <Td nowrap tono={c.txt2}>{k}</Td>
                <Td>{v}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Card>

      {/* ── OPCIONES ─────────────────────────────────────────────────────────── */}
      <Card titulo="Formato"
        desc="Las dos decisiones que cambian el archivo y que no se pueden deducir: en qué
          unidades sale y para qué programa.">
        <Campo label="Unidades"
          ayuda="El motor trabaja en N, m y N/m². La conversión ocurre acá, en el borde, y el archivo dice en qué unidades salió.">
          <Sel v={perfilId} set={setPerfilId} w={260}
            opciones={[["datos", "Para datos — kN, m, kN/m²"],
              ["memoria", "Como la memoria — kN, mm, kN/m²"],
              ["pantalla", "Como la pantalla — kN, m, N/m²"]]} />
        </Campo>
        <Campo label="Dialecto del CSV"
          ayuda="Abrir el dialecto equivocado NO da error: da una columna sola con todo el renglón adentro, o números partidos en dos.">
          <Sel v={dial} set={setDial} w={300}
            opciones={Object.values(DIALECTOS).map(x => [x.id, x.label])} />
        </Campo>
        <Nota>
          En el CSV la unidad va <b style={{ color: c.txt }}>pegada al nombre de la
          columna</b> —<code style={{ fontFamily: MONO }}>p_gobernante_kNm2</code>— y no en
          una línea aparte: un CSV se abre en cualquier cosa y lo primero que se pierde son
          las líneas de encabezado. En el JSON, además, hay un campo{" "}
          <code style={{ fontFamily: MONO }}>unidades</code>.
        </Nota>
        {cabeceraCerr.length > 0 && (
          <Nota>
            El archivo informa el <b style={{ color: c.txt }}>GC_pi que se aplicó</b>, con
            su R_i: <code style={{ fontFamily: MONO }}>{cabeceraCerr[0].replace(/^# /, "")}</code>.
            Sin eso, las dos columnas de presión interna no se pueden reproducir.
          </Nota>
        )}
        <Divisor>Cómo empieza el archivo</Divisor>
        <pre style={{ ...t.micro, fontFamily: MONO, background: c.raised, padding: SP.md,
          borderRadius: 8, border: `1px solid ${c.border}`, overflowX: "auto",
          margin: 0, lineHeight: 1.7 }}>{vista.join("\n")}</pre>
      </Card>

      {/* ── DESCARGAS ────────────────────────────────────────────────────────── */}
      <Card titulo="Descargar"
        desc="Presiones por cara y por zona en las cuatro direcciones. La pared a barlovento
          sale TRAMO POR TRAMO, cada uno con su q_z: exportarla con un q_h único borra
          justamente lo que la distingue de las demás caras.">
        <div style={{ display: "flex", gap: SP.md, flexWrap: "wrap" }}>
          <Boton variante="primario" onClick={() => {
            bajar(`${limpio(d.proyecto)}.presiones.csv`, csv(), "text/csv");
            toast("CSV de presiones descargado.", "ok");
          }}>Presiones en CSV</Boton>
          <Boton onClick={() => {
            bajar(`${limpio(d.proyecto)}.presiones.json`,
              JSON.stringify(json(), null, 2), "application/json");
            toast("JSON de presiones y resultantes descargado.", "ok");
          }}>Presiones y resultantes en JSON</Boton>
        </div>
        <Nota>
          El JSON agrega las <b style={{ color: c.txt }}>resultantes por dirección</b> y la{" "}
          <b style={{ color: c.txt }}>envolvente de la Figura 2.4-8</b> con la combinación
          que gobierna cada magnitud. ⚠ La envolvente no es el máximo por columna de la
          tabla de presiones: cada magnitud sale de un estado de carga completo, y el
          estado viaja con ella.
        </Nota>
        {aplic?.extendidas?.length > 0 && (
          <Aviso tono="aviso" titulo="Hay lecturas extendidas en este caso">
            {aplic.extendidas.length === 1 ? "Una lectura" : `${aplic.extendidas.length} lecturas`}
            {" "}de la Figura 2.4-1 no están escritas en la figura y las resolvió el motor.
            Está explicado en Presiones, y conviene que quede dicho en lo que se entregue.
          </Aviso>
        )}
        {!envCasos?.conTorsion && (
          <Aviso tono="aviso" titulo="Los casos torsionales no se verificaron">
            Se declaró la exención del art. 2.4.7, así que el archivo lleva M_T = 0. No
            significa que el edificio no torsione: significa que no se verificó.
          </Aviso>
        )}
      </Card>

      {/* ── ESQUEMA ──────────────────────────────────────────────────────────── */}
      <Card titulo="Esquema de las columnas"
        desc="Va también adentro del JSON, en el campo «columnas»: el archivo trae la
          descripción de sus propias columnas y no hace falta buscar un documento aparte
          que dentro de dos años puede no existir.">
        <Tabla minWidth={680}>
          <thead><tr>
            <Th>Columna en el CSV</Th><Th>Campo en el JSON</Th><Th>Unidad</Th><Th>Qué es</Th>
          </tr></thead>
          <tbody>
            {COLUMNAS.map(col => (
              <tr key={col.id}>
                <Td nowrap><code style={{ fontFamily: MONO }}>{tituloColumna(col, perfil)}</code></Td>
                <Td nowrap tono={c.txt3}><code style={{ fontFamily: MONO }}>{col.id}</code></Td>
                <Td nowrap tono={c.txt3}>{col.magnitud ? perfil[col.magnitud] : "—"}</Td>
                <Td tono={c.txt3}>{col.desc}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
        <Acordeon titulo="Unidades internas del motor">
          <Tabla minWidth={420}>
            <thead><tr><Th>Magnitud</Th><Th>Interna</Th><Th>En este archivo</Th></tr></thead>
            <tbody>
              {Object.entries(UNIDADES).map(([m, def]) => (
                <tr key={m}>
                  <Td nowrap>{m}</Td>
                  <Td nowrap tono={c.txt3}>{def.interna}</Td>
                  <Td nowrap>{perfil[m] ?? def.interna}</Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
          <Nota>
            El motor trabaja siempre en N, m y N/m², que son las unidades en las que el
            reglamento escribe sus expresiones: adentro del cálculo no hay ninguna
            conversión y no puede haber un factor 1000 perdido entre dos pasos.
          </Nota>
        </Acordeon>
      </Card>

      {/* ── TRAZABILIDAD ─────────────────────────────────────────────────────
          El mismo árbol que van a renderizar la memoria en Markdown y el Word. Está acá y
          no en una pantalla propia porque es una SALIDA: lo que se entrega junto con los
          números para que alguien pueda rehacerlos. */}
      <Divisor>Trazabilidad del cálculo</Divisor>
      <Nota>
        Cada paso con su artículo, su fórmula y el bloque «donde:» con todos los símbolos.
        Es <b style={{ color: c.txt }}>el mismo árbol</b> que usan la memoria y el
        documento de Word: con tres recorridos separados, el día que se agregue un paso a
        uno los otros dos quedan atrás sin que nada falle.
      </Nota>
      <PanelTraza traza={traza} trazaMotor={trazaMotor} />

      {/* ── ARCHIVO DE PROYECTO ──────────────────────────────────────────────── */}
      <Card titulo="Archivo de proyecto"
        desc="El caso completo, para volver a abrirlo. Se descarga con «Guardar» en la barra
          de arriba.">
        <Nota>
          Esquema <b style={{ color: c.txt }}>v{ESQUEMA}</b> de{" "}
          <b style={{ color: c.txt }}>{APP.id}</b>. Un archivo de un esquema anterior se
          migra al abrirlo y la aplicación lo dice; uno de un esquema más nuevo se abre en
          lo que se entienda, con aviso. Los campos que un archivo viejo no traiga se
          completan con el valor por defecto, <b style={{ color: c.txt }}>sub-objeto por
          sub-objeto</b>: reemplazarlos enteros dejaba claves en «sin definir», que entran
          al motor como NaN y salen como «—» sin ningún error.
        </Nota>
        <Aviso tono="info" titulo="Responsabilidad profesional">{RESPONSABILIDAD}</Aviso>
      </Card>
    </>
  );
}
