# PLAN DE TRABAJO — estado vivo

Este archivo es **el plan, no un registro**. Dice qué falta, qué está hecho y qué está
frenado esperando un dato. Se actualiza **al cerrar cada tanda**, en el mismo commit que
el código, para que el plan sobreviva entre sesiones: una sesión nueva arranca leyendo
esto y no reconstruyendo el contexto a partir del `git log`.

**Prioridad declarada por el proyectista: exactitud y trazabilidad normativa por encima
de funcionalidades nuevas.**

## Cómo leer los estados

| | |
|---|---|
| ✅ | hecho y verificado, con tests que caen bajo mutación |
| 🔄 | en curso |
| ⏳ | pendiente |
| 📥 | **esperando un dato del proyectista** — no avanza solo |
| ⛔ | bloqueado por algo que no depende de este repositorio |

> **Regla que gobierna todos los 📥:** no se inventa ni se completa de memoria un
> coeficiente, una tabla o un mapa del reglamento, y **no se generan los valores esperados
> de un caso de regresión**. Si falta un dato, queda acá anotado con su artículo y se
> pregunta.

---

## Fase 0 — Andamiaje ✅

| Estado | Ítem | Dónde |
|---|---|---|
| ✅ | Quitar dependencias muertas (`katex`, `marked`) | `9653a75` |
| ✅ | `build` = `lint && typecheck && test && vite build`, igual en `vercel.json` y en el CI | `f77f395`, `2373371` |
| ✅ | Andamiaje de casos de regresión: esquema, runner, tolerancia relativa 0,5 % | `9c28dd9` · `tests/casos/` |
| ✅ | JSDoc + `checkJs` con `tsc --noEmit` en CI, alcance `engine`/`constants`/`lib` | `dfa87fd` · `docs/tipado.md` |
| ✅ | ESLint con `no-undef`, `react/jsx-no-undef`, `react-hooks/rules-of-hooks` | `2373371` · `eslint.config.js` |
| ✅ | Smoke test de las once pantallas, que falla ante cualquier `console.error` | `2373371` · `tests/pantallas.test.jsx` |

El alcance del typecheck es deliberado: el repo entero daba 461 errores, casi todos de
props de React y ninguno un defecto real. El agujero que eso dejaba en la UI lo tapan
ESLint y el smoke test, y no por precaución: ya se había materializado.

## K_zt — art. 1.8 ✅ (salvo casos de regresión)

| Estado | Ítem | Dónde |
|---|---|---|
| ✅ | Motor con los dos métodos del art. 1.8.2, las tres condiciones del 1.8.1 y trazabilidad | `eb95b14` · `engine/topografia.js` |
| ✅ | Formulario, croquis del accidente y aplicación por dirección | `6266f5e` |
| ✅ | **K_zt(z)**: perfil en altura, no un número. Extremo gobernante por tramo | `3eca6ea` |
| ✅ | Corte del perfil en los máximos locales de K_z·K_zt | `3eca6ea` |
| ✅ | K_zt a la altura propia en capítulo 4 y Anexo I | `3eca6ea` |
| 📥 | **5 casos de regresión con `esperado: null`** → corren como `test.todo` | `tests/casos/kzt/casos.json` |

Los cinco que faltan: `escarpa_sotavento`, `escarpa_barlovento`, `HLh_mayor_0_5`,
`exposicion_D`, `tabla_interpolada`. Hay que cargarles K1, K2, K3 y Kzt calculados a mano.
Los dos que sí verifican (`H_bajo_minimo`, `HLh_bajo_0_2`) pasan.

## Fase 1 — Validación ✅

| Estado | Ítem | Dónde |
|---|---|---|
| ✅ | Vitest configurado y corriendo en CI | `.github/workflows/test.yml` |
| ✅ | Una sola interpolación, que devuelve los puntos de tabla usados | `4839b56` · `engine/interpolacion.js` |
| ✅ | Tests de interpolación en punto, entre puntos, en los dos bordes y fuera | `tests/interpolacion.test.js` |
| ✅ | `KE_TABLA` contra la expresión de su nota 2, con la tolerancia justificada | `4839b56` |
| ✅ | Runner de regresión con tolerancia relativa 0,5 % | `tests/casos/runner.js` |

## Módulo edificios — correcciones 🔄

Va **antes** de la Fase 2: las resultantes alimentan fundaciones, y la envolvente se
construye sobre ellas.

| Estado | Ítem |
|---|---|
| 📥 | **La lista de correcciones no llegó.** El mensaje que las anunciaba no las incluyó. |
| ✅ | Aclarado: `q_h` usa `K_z(h)·K_zt(h)` con la `h` del edificio analizado, con test |

El punto 8 de esa lista —casos de carga de la Figura 2.4-8 y exención del art. 2.4.7— se
integra a la envolvente de la Fase 2, por decisión del proyectista.

## Fase 2 — Robustez del cálculo ⏳

| Estado | Ítem | Nota |
|---|---|---|
| ⏳ | `unidades.js`: conversión **en el borde**, motor en N, m, N/m² | Salida por defecto: kN, kN/m², kNm; longitud configurable (mm en memoria, m en CSV/JSON) |
| ⏳ | Avisos de aplicabilidad visibles, nunca silenciosos | h/L, h/B, pendientes, ángulos |
| ⏳ | n₁ según art. 1.9.2 | Baja altura = rígido, no bloquear · `n_a` de 1.9.3 sólo con acero/hormigón/mampostería, h < 90 m y h < 4·L_ef · `G_f` obligatorio si n₁ < 1 Hz |
| ⏳ | Envolvente automática: 4 direcciones × 2 signos de `GC_pi` | Más `CASOS_CARGA` y `momentoTorsor` de la Fig. 2.4-8, con el caso torsional en el resumen de críticos |
| ⏳ | Parseo de inputs | Un solo separador (coma o punto) = decimal · **sin separador de miles** · con más de uno se rechaza con aviso · mostrar al lado el valor interpretado |

## Fase 3 — Salidas ⏳

| Estado | Ítem |
|---|---|
| ⏳ | Panel de trazabilidad expandible por paso |
| ⏳ | Memoria en Markdown con la estructura clásica pedida |
| ⏳ | Memoria en Word (`docx.js`): A4, márgenes 2,5/1,5 cm, Arial 10,5 pt justificado, TOC por campo, tablas de 9000 dxa |
| ⏳ | Presiones por cara y zona en CSV y JSON, con esquema documentado y campo `unidades` |
| 🔄 | Guardar y abrir proyectos como JSON — existe; **falta versionar el esquema** |
| ⏳ | Versión de la app, «CIRSOC 102-2025» y aviso de responsabilidad profesional en cada salida |

## Fase 4 — Capítulo 5, componentes y revestimientos ⏳

Zonas y `GC_p`, con la exposición más desfavorable según el art. 1.7.4.4. Uso previsto:
LSF, correas y chapas. El capítulo **no está leído todavía**.

---

## TODO normativos — transcripto pero sin cablear

| Estado | Ítem | Dónde |
|---|---|---|
| ⏳ | `CP_VOLADIZO_INFERIOR`, art. 2.4.4 | `constants/presionesExternas.js` |
| ⏳ | `GCPN_PARAPETO`, art. 2.4.5 | `constants/presionesExternas.js` |
| ⏳ | `CASOS_CARGA` y `momentoTorsor`, Fig. 2.4-8 | `engine/edificio.js` — va con la envolvente de la Fase 2 |
| ⏳ | `R_i`, expr. (1.11-1), reducción por gran volumen | `constants/presionInterna.js` — hoy 1,0, admisible y conservador |
| ⏳ | Presión interna positiva a la altura de la abertura más alta, art. 2.4.1 | Hoy `q_h`, que es lo conservador que el propio artículo admite |

## Sin leer del reglamento

Capítulo 5 entero · Figs. 2.4-2 (cúpula) y 2.4-3 (abovedada) · Figs. 2.4-4 a 2.4-7
(edificios abiertos, tratamiento por `C_N`) · mansarda.

## ⛔ Bloqueado

**Paneles solares, art. 4.5.3 a 4.5.5.** Sus coeficientes no están tabulados: las Figuras
4.5-7, 4.5-10 y 4.5-11 son **once gráficos de curvas** sobre ejes logarítmicos. Sacar un
valor intermedio exige digitalizar la curva de un escaneo, y un coeficiente leído a ojo da
una presión plausible y un cálculo equivocado que ningún control detecta. El art. 4.5.4
además necesita el `(GC_p)` del Capítulo 5, que no está en el repositorio. Sí están en
`constants/cap4.js → SOLAR` los factores que el reglamento da como expresión cerrada
(`γ_p`, `γ_c`, `γ_E`, `A_n`, `N_s`) y `γ_a` de la Figura 4.5-8, la única curva de la serie
transcribible exacto porque sus quiebres caen sobre líneas de grilla.

---

## Limitaciones declaradas del cálculo actual

No son pendientes: son decisiones tomadas, conservadoras, que conviene tener presentes.

- **El perfil de la pared a barlovento converge por arriba.** Los tramos son los cortes
  equiespaciados más las alturas tabuladas más los máximos locales de K_z·K_zt. Subir
  `puntosPerfil` afina el resultado, y siempre hacia abajo: nunca lo deja inseguro.
- **`C_b = 1`** — conservador.
- **`K_e` por la expresión y no por la tabla.** El art. 1.12 admite las dos; difieren hasta
  0,007 y hay test que lo fija.
