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

## Módulo edificios — correcciones ✅

Fue **antes** de la Fase 2: las resultantes alimentan fundaciones, y la envolvente se
construye sobre ellas.

| Estado | Ítem | Dónde |
|---|---|---|
| ✅ | Aclarado: `q_h` usa `K_z(h)·K_zt(h)` con la `h` del edificio analizado | `7787343` |
| ✅ | **1** · Signo de la componente horizontal de cubierta, estaba invertido | `fffbe65` |
| ✅ | **1** · `H` sólo con presiones externas, en todos los modos | `fffbe65` |
| ✅ | **1** · Los dos casos de la nota 3, con el mayor corte en la envolvente | `fffbe65` |
| ✅ | **2** · Forma real de cada fachada por dirección | `fffbe65` · `engine/fachadas.js` |
| ✅ | **2** · `q_z` integrado hasta la cota real, hastial incluido | `fffbe65` |
| ✅ | **3** · Vuelco con la resultante vertical; `V`, `x_V` y los tres momentos | `fffbe65` |
| ✅ | **4** · Carga mínima del art. 2.1.5 como caso aparte; fuera `aplicarMinimoPared` | ↓ |
| ✅ | **5** · Fig. 2.4-1 entre 45° y 60°: nodo fijo de 0,6 y succión 0 | ↓ |
| ✅ | **6** · Declaración de pórticos resistentes a momento, con el piso por defecto | ↓ |
| ✅ | **7** · Cerramiento abierto: aviso de error y resultantes no válidas | ↓ |
| ✅ | **9** · Detalle de `G` según `modoG`, comentario de `q_i`, aviso de limatesa | ↓ |
| ✅ | **Casos de la nota 3 consistentes**: terna completa por caso, envolvente sobre casos | ↓ |
| ✅ | **Presión interna con piso solidario**, declarable y desactivada por defecto | ↓ |
| ✅ | Cita de la excepción de la nota 7 corregida —está en la propia nota 7, no en el C 2.1.5— | ↓ |
| ✅ | `cargaMinima()` con punto de aplicación y momento en la base | `17168a7` |
| ✅ | Cifras del aviso de piso solidario corregidas (17–30 % / 38–57 %) | ↓ |
| ✅ | **Cuatro aguas**: cumbrera derivada del lado largo, remonte sobre el lado corto, largo `\|a − b\|` | ↓ |
| ✅ | Silueta del limatesa EXACTA, por el trapecio `(B + Lc)/2·r` | ↓ |
| ✅ | `H` de cuatro aguas sobre el área trapecial de los faldones | ↓ |
| ✅ | Proyectos viejos con la cumbrera sobre el lado corto: se reorientan y avisan | ↓ |
| ⏳ | **8** · Casos de carga de la Fig. 2.4-8 y exención del art. 2.4.7 | va con la envolvente de la Fase 2 |

El punto 8 se integra a la envolvente de la Fase 2, por decisión del proyectista.

## Fase 2 — Robustez del cálculo 🔄

| Estado | Ítem | Nota |
|---|---|---|
| ✅ | `unidades.js`: conversión **en el borde**, motor en N, m, N/m² | `lib/unidades.js`. Tres perfiles: pantalla, memoria (longitudes en mm, presiones en kN/m²) y datos (longitudes en m). El número y su unidad salen del MISMO objeto, y hay un test que recorre `src/components` y falla si reaparece una conversión a mano |
| ⏳ | Avisos de aplicabilidad visibles, nunca silenciosos | h/L, h/B, pendientes, ángulos |
| ⏳ | n₁ según art. 1.9.2 | Baja altura = rígido, no bloquear · `n_a` de 1.9.3 sólo con acero/hormigón/mampostería, h < 90 m y h < 4·L_ef · `G_f` obligatorio si n₁ < 1 Hz |
| ⏳ | Envolvente automática: 4 direcciones × 2 signos de `GC_pi` | Con el caso torsional en el resumen de críticos |
| ⏳ | **Casos de carga de la Fig. 2.4-8** (punto 8 del módulo edificios) | Caso 2: paredes y cubierta al 75 % del caso 1 · Casos 3 y 4 (nota 2): cubierta al 100 % de la mayor presión de los casos 1 y 2 sobre cada área, en las dos direcciones principales · Caso 4: `M_T = 0,563·(P_WX+P_LX)·B_X·e_X + 0,563·(P_WY+P_LY)·B_Y·e_Y` — hoy `momentoTorsor` cubre un solo eje · `e = ±0,15·B` en rígidas con el signo más desfavorable, expr. (2.4-5) en flexibles · nota 3: paredes laterales omitibles en los casos 1 y 2 con diafragma rígido continuo · nota 4: `M_T` sobre diafragmas rígidos; con diafragma flexible o sin diafragma, bloque de presión distribuida sobre las paredes con presión normal |
| ⏳ | **Exención del art. 2.4.7** | Selector con las condiciones del 2.4.7.2 —una planta con h ≤ 10 m; hasta dos plantas de entramado liviano; hasta dos plantas con diafragmas flexibles— ⇒ sólo casos 1 y 3. Las del 2.4.7.3 a 2.4.7.5, como declaración del usuario con cita del artículo. Corregir el comentario de `CASOS_CARGA` |
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

## Roadmap — después de la Fase 2

Pedido por el proyectista junto con las correcciones del módulo edificios. Va después de
la Fase 2 y no antes.

| Estado | Ítem | Qué incluye |
|---|---|---|
| ⏳ | **Cubiertas aisladas**, Figs. 2.4-4 a 2.4-7 | Exposición más desfavorable (art. 1.7.4.1) · flujo libre y obstruido, calculando AMBOS si el uso bajo cubierta es incierto · cenefas y parapetos con `q_p = q_h` y fricción según la Tabla 2.4-1 (art. 2.4.3.1) · mínimo de 0,75 kN/m² × A_f |
| ⏳ | **Clasificación de cerramiento calculada** | Con `A_o`, `A_g`, `A_oi` y `A_gi` por pared, definiciones del art. 1.2 y art. 1.10.5, y de ahí `GC_pi` y `R_i` |
| ⏳ | **Parapetos**, art. 2.4.5 | `p_p = q_p·GC_pn`, con +1,5 a barlovento y −1,0 a sotavento, `q_p` evaluado en el borde superior |
| ⏳ | **Voladizos**, art. 2.4.4 | `C_p = +0,8` en la cara inferior a barlovento, combinado con la superior |
| ⏳ | **Exposición por sector** | 8 sectores, C 1.7-8 |

Las cubiertas aisladas son además lo que desbloquea el cerramiento **abierto**, que hoy
devuelve resultantes marcadas como no válidas.

---

## TODO normativos — transcripto pero sin cablear

| Estado | Ítem | Dónde |
|---|---|---|
| ⏳ | `CP_VOLADIZO_INFERIOR`, art. 2.4.4 | `constants/presionesExternas.js` |
| ⏳ | `GCPN_PARAPETO`, art. 2.4.5 | `constants/presionesExternas.js` |
| ⏳ | `CASOS_CARGA` y `momentoTorsor`, Fig. 2.4-8 | `engine/edificio.js` — va con la envolvente de la Fase 2. `momentoTorsor` cubre un solo eje; el caso 4 necesita los dos |
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

## Registro — cuánto cambió la corrección de cuatro aguas

Medido por el proyectista corriendo el código real de `17168a7` (cuatro aguas con la
cumbrera declarada sobre el lado corto) contra `5ca74e9`. **20 × 30 m, alero 6 m,
V = 45 m/s, exposición C, cerrado.** Formato **corte kN / vuelco kNm / levantamiento kN**;
`Wx−` y `Wy−` iguales por simetría.

| θ | Dir. | Viejo | Nuevo |
|---|---|---|---|
| 15° | Wx+ | franjas · 189,5 / 1.226,9 / 427,3 | faldones · 206,9 / 684,0 / 382,7 |
| 15° | Wy+ | faldones · 149,6 / 375,4 / 369,0 | franjas · 115,4 / 1.284,5 / 356,9 |
| 25° | Wx+ | 192,3 / 1.159,3 / 474,1 | 257,2 / 363,9 / 333,9 |
| 25° | Wy+ | 225,8 / 359,5 / 332,3 | 116,4 / 1.356,7 / 379,9 |
| 35° | Wx+ | 195,1 / 1.144,1 / 525,5 | 305,2 / 515,1 / 320,0 |
| 35° | Wy+ | 302,1 / 457,0 / 309,2 | 117,5 / 1.414,4 / 406,8 |

**Envolvente, viejo contra nuevo**, para θ = 15 / 25 / 35°:

| Magnitud | Diferencia |
|---|---|
| Corte | −8 / −12 / −1 % |
| Vuelco | −4 / −15 / −19 % |
| Levantamiento | +12 / +25 / +29 % |

La declaración errónea quedaba **del lado inseguro en corte y en vuelco**.

> **Por qué esto es un registro y no un test.** Comparar contra el código viejo obliga a
> emularlo, y una emulación que no reproduzca *también* sus paredes no sirve: el limatesa
> viejo usaba paredes rectangulares de 180 m² donde un caballete de cumbrera X tiene
> hastial —240 / 285 / 338 m² para θ = 15 / 25 / 35°—. Una primera emulación con caballete
> hizo coincidir el levantamiento, que sólo ve la cubierta e igual en los dos modelos, y
> eso pareció confirmar la fidelidad sin confirmarla: el corte y el vuelco salían con el
> signo cambiado. Lo que protege la corrección son los tests de remonte, de reorientación
> de proyectos guardados y de silueta, que son propiedades del motor.

---

## Limitaciones declaradas del cálculo actual

No son pendientes: son decisiones tomadas, conservadoras, que conviene tener presentes.

- **El perfil de la pared a barlovento converge por arriba.** Los tramos son los cortes
  equiespaciados más las alturas tabuladas más los máximos locales de K_z·K_zt. Subir
  `puntosPerfil` afina el resultado, y siempre hacia abajo: nunca lo deja inseguro.
- **`C_b = 1`** — conservador.
- **`K_e` por la expresión y no por la tabla.** El art. 1.12 admite las dos; difieren hasta
  0,007 y hay test que lo fija.
- **Los dos casos de la nota 3 son ESTADOS DE CARGA completos.** La envolvente toma
  máximos sobre casos, no por componente, e informa cuál gobierna cada magnitud. Es la
  estructura que necesitan la envolvente de la Fase 2 y las reacciones de base de la
  Fase 3: ahí cada caso viaja entero.
- **El momento respecto del CENTRO de la base no depende de `GC_pi`, en ninguna
  geometría.** La presión interna es uniforme sobre toda la planta de cubierta, así que su
  resultante vertical cae en el baricentro de la planta y su brazo respecto del centro es
  cero. Respecto de un borde no se cancela. Hay test, y sirve además de control cruzado
  del signo de `V` y del brazo en planta.
- **`q_i` usa `q_h`.** El art. 2.4.1 permite evaluar la presión interna POSITIVA con `q_z`
  a la altura de la abertura más alta en parcialmente cerrados y parcialmente abiertos,
  pero eso exige declarar esa abertura. `q_h` es la opción conservadora de las dos.
- **En cuatro aguas la cumbrera NO es dato**: sale del lado largo, el remonte sube sobre
  media luz del lado corto y el largo de cumbrera es `|a − b|`. Con `a = b` es una
  pirámide y las cuatro direcciones se tratan como viento normal. Un proyecto guardado con
  la cumbrera sobre el lado corto se reorienta al abrir, con aviso en pantalla y en la
  traza: el cambio da vuelta qué dirección va en faldones.
- **Cuatro aguas con viento paralelo a la cumbrera**: la Figura 2.4-1 dibuja ese caso para
  dos aguas. Se mantiene la zonificación en franjas, que es la extensión razonable, con un
  aviso que dice que es una extensión y no una transcripción.
