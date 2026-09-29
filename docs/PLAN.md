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
| ⏸ | **postergado por decisión del proyectista** — no es que falte, es que va después |
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
| ✅ | **8** · Casos de carga de la Fig. 2.4-8 y exención del art. 2.4.7 | `engine/envolvente.js` |

El punto 8 se integró a la envolvente de la Fase 2, por decisión del proyectista, y quedó
cerrado con ella.

## Sitio — origen de V y cerramiento calculado 🔄

Adelantado al resto de la Fase 2, por pedido del proyectista.

| Estado | Ítem | Dónde |
|---|---|---|
| ✅ | **(0)** Parseo de inputs | `bc4f593` · `lib/parseo.js` |
| ✅ | **(1)** Origen de V: tabla, interpolación entre isotacas, valor adoptado con fundamento, conversión desde V₅₀ | ↓ · `engine/velocidad.js` |
| ✅ | **(2)** Cerramiento calculado a partir de aberturas | pantalla propia «Cerramiento», en Definición y después de Edificio · `engine/cerramiento.js` |

Decisiones tomadas para (2), ya implementadas:
- **`A_g` de la cubierta = `a·b/cosθ`** en dos aguas, cuatro aguas y vertiente única, y
  `a·b` en plana. Con una sola pendiente, las proyecciones de los faldones cubren la
  planta exactamente, así que no hace falta sumar faldón por faldón. Hay que verificarlo
  con un test que sume los dos trapecios y los dos triángulos de un limatesa.
- La cubierta es **una sola superficie** para cargar aberturas —lucernarios, ventilación
  de cumbrera— y nunca se evalúa como pared a barlovento, así que no se separa por faldón.
- **`V_i` se precarga con el volumen geométrico exacto**, no con planta × altura media:
  en cuatro aguas eso sobreestima el volumen, y un `V_i` mayor da un `R_i` MENOR, o sea
  del lado inseguro. Plana `a·b·h_e` · dos aguas y vertiente única `a·b·(h_e + r/2)` ·
  cuatro aguas `a·b·h_e + r·(a·b/2 − s²/6)` con `s` el lado corto, que con `a = b` da la
  pirámide `a²·r/3`.
- Los voladizos, cuando se implementen, **no suman a la envolvente**: no cierran el
  volumen interior.

## Fase 2 — Robustez del cálculo 🔄

| Estado | Ítem | Nota |
|---|---|---|
| ✅ | `unidades.js`: conversión **en el borde**, motor en N, m, N/m² | `lib/unidades.js`. Tres perfiles: pantalla, memoria (longitudes en mm, presiones en kN/m²) y datos (longitudes en m). El número y su unidad salen del MISMO objeto, y hay un test que recorre `src/components` y falla si reaparece una conversión a mano |
| ✅ | **Avisos de aplicabilidad visibles, nunca silenciosos** | `engine/aplicabilidad.js` + tarjeta en Presiones. Ver abajo qué distingue cada estado |
| ⏸ | n₁ según art. 1.9.2 — **postergado por el proyectista**, se retoma después de la Fase 3 | Baja altura = rígido, no bloquear · `n_a` de 1.9.3 sólo con acero/hormigón/mampostería, h < 90 m y h < 4·L_ef · `G_f` obligatorio si n₁ < 1 Hz. Hoy los tres límites están escritos en un comentario de `engine/factorRafaga.js` y **no se verifican ni se muestran**: el selector ofrece las tres expresiones sin decir si aplican. Falta además la cuarta familia —tabiques de hormigón o mampostería—, que necesita `C_w` y no es dato del modelo |
| ✅ | **Envolvente automática**, los casos de la Fig. 2.4-8 y la exención del art. 2.4.7 | `engine/envolvente.js`. Ver abajo qué quedó decidido y qué falta |
| ✅ | Parseo de inputs | `lib/parseo.js`. Un solo separador = decimal · sin separador de miles · con más de uno se rechaza con el motivo · el valor interpretado al lado del campo · `type="text"` con `inputMode="decimal"`. Reemplaza los tres `num()` del motor, dos de los cuales usaban `parseFloat` pelado y leían «12,5» como 12 |

## Fase 3 — Salidas ⏳

| Estado | Ítem | Dónde |
|---|---|---|
| ✅ | **Modelo de traza único** y panel que lo renderiza | `lib/traza.js` + `lib/consolidar.js` + `components/PanelTraza.jsx`, en la pantalla Salidas |
| ✅ | **Memoria en Markdown** con la estructura clásica | `lib/memoria.js` + `lib/memoriaCapitulos.js`, en la pantalla Salidas. Índice aprobado por el proyectista |
| ⏳ | Memoria en Word (`docx.js`): A4, márgenes 2,5/1,5 cm, Arial 10,5 pt justificado, TOC por campo, tablas de 9000 dxa | |
| ✅ | Presiones por cara y zona en CSV y JSON, con esquema documentado y campo `unidades` | `lib/exportar.js` + pantalla **Salidas** |
| ✅ | Guardar y abrir proyectos como JSON, con el **esquema versionado** | `lib/proyecto.js` |
| ✅ | Versión de la app, «CIRSOC 102-2025» y aviso de responsabilidad profesional en cada salida | `constants/version.js` |

## Fase 4 — Capítulo 5, componentes y revestimientos ⏳

Zonas y `GC_p`, con la exposición más desfavorable según el art. 1.7.4.4. Uso previsto:
LSF, correas y chapas. El capítulo **no está leído todavía**.

## Memorias de otras estructuras ⏳ — siguiente

Mismo generador, mismos capítulos de sitio, **capítulos de cálculo propios**: carteles y
paredes libres, chimeneas y tanques, torres reticuladas, silos, y las secciones del
Anexo I. Son **otro objeto**, no otra salida del mismo cálculo: el capítulo 2 reparte
presiones sobre las superficies de un edificio y el 4 da una fuerza resultante sobre algo
que no tiene interior ni presión interna.

**Excepción: «Equipo o estructura sobre cubierta» (art. 4.5.1)**, que ya está
implementada. Carga **al edificio** y usa su `h`, así que va como capítulo opcional de la
memoria del edificio —sólo si hay uno cargado— y no en una separada.

## Roadmap — después de la Fase 2

Pedido por el proyectista junto con las correcciones del módulo edificios. Va después de
la Fase 2 y no antes.

| Estado | Ítem | Qué incluye |
|---|---|---|
| ⏳ | **Cubiertas aisladas**, Figs. 2.4-4 a 2.4-7 | Exposición más desfavorable (art. 1.7.4.1) · flujo libre y obstruido, calculando AMBOS si el uso bajo cubierta es incierto · cenefas y parapetos con `q_p = q_h` y fricción según la Tabla 2.4-1 (art. 2.4.3.1) · mínimo de 0,75 kN/m² × A_f |
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

## Cambio de criterio — la app no pide fundamentar ✅

**Decisión del proyectista.** Las hipótesis se declaran y figuran en la memoria; los
fundamentos los agrega él a mano.

Había **cinco campos de texto libre** pidiéndolos, y **dos producían avisos de nivel
ERROR** por estar vacíos: un proyecto correcto se anunciaba como «a revisar» —y la memoria
arrancaba con el recuadro **NO APTA PARA EMISIÓN**— por no haber escrito una frase que el
cálculo no usa.

| Eliminado | En su lugar |
|---|---|
| `riesgoFundamento` + campo en Sitio + su aviso | El cap. 7.1 informa la categoría **y el mapa que selecciona** |
| `FUNDAMENTOS_V`, `CONDICIONES_1_5_3`, `vManual.fundamento`, `vManual.documento` y sus dos avisos | La comparación contra el mapa, con la diferencia porcentual |
| `cerrFundamento` + campo + aviso de error | El modo **declarado** ya es la declaración |
| `env.fundamento247` + campo + `sinFundamento` | Qué **artículo** se invocó |
| Filas de fundamento del cap. 3 de la memoria | Tabla para completar a mano |

**Lo que se conserva, sin pedir nada:** todas las declaraciones técnicas —modo de
cerramiento, casillas del 2.4.7, piso solidario, pórticos de la nota 7, `R_i`,
diafragma—, que siguen en «Condiciones de uso y control operativo» como hipótesis del
cálculo.

**Reglas que cambiaron:**

- ⚠ **V menor que la del mapa: «aviso», no «error».** Apartarse hacia abajo está
  contemplado por el art. 1.5.3; la app no sabe si el estudio existe y no lo pregunta.
- La **referencia de V en la traza** sale del **origen** y no de un fundamento.
- La **discrepancia de cerramiento** pasa a `hayDiscrepancia()`: modo declarado +
  aberturas cargadas + clasificaciones distintas. Se extrajo del contexto a
  `engine/cerramiento.js` porque una regla escrita en un `useMemo` no se puede probar.

**Esquema v3.** La migración descarta los cinco campos **en silencio**: ninguno entraba en
ningún número. Sube de versión aunque «sólo» se borren campos porque la fusión contra el
inicial **no borra**, y volverían a entrar como claves huérfanas.

**Hallazgo de las mutaciones:** el borrado estaba **duplicado** —en la migración y en un
barrido posterior a la fusión— y anular cualquiera de los dos no rompía ningún test,
porque el otro tapaba el agujero. Quedó el de la migración, que es el que corresponde.

`tests/sinFundamentos.test.js` persigue la reaparición de cualquier entrada de fundamento
en `src/`, **sacando los comentarios antes de mirar**: si leyera el archivo entero, la
explicación de por qué el campo ya no está lo haría fallar.

Verificación: 26 tests nuevos, **13 mutaciones y las 13 muertas**.

## Memoria en Markdown ✅

`lib/memoria.js` tiene el formato y `lib/memoriaCapitulos.js` los capítulos: dos cosas que
cambian por razones distintas —el formato lo fija el estudio, y los capítulos, el
reglamento—.

**Es una memoria de ACCIONES.** Determina cargas, no verifica elementos: por eso
«Materiales» dice *No corresponde* y **no hay filas de aprovechamiento**. Inventar una
`η | VERIFICA` haría creer que algo se verificó.

### Los 19 capítulos

Sitio en el orden de la **Tabla 2.2-1** —ráfaga antes que cerramiento, que no es el orden
en que la app calcula— y cálculo en el orden acordado: presiones → resultantes → **carga
mínima** → casos de carga y envolvente. La aplicabilidad de la Fig. 2.4-1 es el **12.3**.
La categoría de riesgo es el **7.1**, con su fundamento: es la que elige el mapa de V, y
entre categoría II y IV hay un período de retorno distinto para el mismo sitio.

| Decisión | Por qué |
|---|---|
| La memoria **vuelve a consolidar** el árbol con el perfil «memoria» | Es la misma función, pero la conversión ocurre en el borde y el borde de la memoria no es el de la pantalla: mm y kN/m² contra m y N/m² |
| `num()` propio, **no `toLocaleString`** | El separador de miles del navegador depende del idioma del SISTEMA: la misma memoria abierta en una máquina en inglés saldría con «1,224.45». Un documento de cálculo no puede cambiar de notación según quién lo abra |
| El **alcance declara las exclusiones** | Una memoria que sólo dice lo que hizo invita a suponer que lo demás está adentro. El modo de falla real no es que se rompa: es que alguien use un número correcto para algo que ese número no cubre |
| «Condiciones de uso» lista las **hipótesis declaradas** | Si alguna deja de cumplirse en obra o en operación, el cálculo deja de ser válido y **no hay nada en los números que lo delate** |
| El recuadro **NO APTA PARA EMISIÓN va primero** | La memoria se sigue pudiendo descargar —es un borrador y sirve para trabajar— pero tiene que decirlo antes de que alguien transcriba el primer número. Sólo los avisos de nivel **error**: con los demás adentro dejaría de significar |
| Bibliografía **sólo de lo citado** | El INPRES-CIRSOC 103 entra únicamente si se invocó el art. 2.4.7.3 |

**Hallazgo del test de numeración:** las figuras salían **3, 1, 2**. Los capítulos de
cálculo se arman en un arreglo aparte y recién después se intercalan, así que la figura
del capítulo 6 pedía su número *después* que las de los capítulos 13 y 16. El contador
vive en el generador justamente para que esto sea detectable.

## Carga mínima dentro de la envolvente ✅

⚠ **No es un piso por magnitud: el C 2.1.5 dice que se AGREGA a los casos de carga
normal.** Hasta acá se calculaba, se informaba en su tarjeta y se comparaba a mano contra
el corte; `envolvente.js` no la conocía, así que el máximo que informaba **podía quedar
por debajo de un caso que el reglamento exige considerar**.

- Un estado por dirección, **sólo horizontal**: `levantamiento = 0` y `M_T = 0`. El
  artículo la define sobre las áreas proyectadas en un plano vertical normal al viento.
- **No depende de `GC_pi` ni del caso de la nota 3** —es una presión prescripta—, así que
  no se repite ocho veces idéntico.
- El momento sale de los **baricentros de cada área**: la de cubierta está más arriba pero
  paga 0,40 kN/m² contra 0,75, y pesar por área correría el punto de aplicación.
- `envolventeCritica()` marca **por magnitud** cuándo gobierna: puede gobernar el corte y
  no el vuelco, porque su punto de aplicación no es el del caso calculado.
- El identificador es la **cadena `"min"`** y no un `5`: los cuatro casos de la figura se
  filtran por número, y un 5 se colaría en esos filtros sin que nadie lo notara.

Verificación: 36 tests de memoria + 7 del caso 2.1.5, con **18 mutaciones y las 18
muertas**.

## Modelo de traza único ✅

`lib/traza.js` define la estructura y `lib/consolidar.js` arma el árbol. **El panel, la
memoria en Markdown y el Word renderizan lo mismo**: con tres recorridos separados, la
primera vez que se agregue un paso a uno de los tres los otros dos quedan atrás sin que
nada falle, y dos salidas de la misma corrida dicen cosas distintas.

**Qué lleva un paso:** título · artículo · fórmula en línea propia · bloque «donde:» con
**todos** los símbolos · valor con unidad · puntos de tabla si hubo interpolación. El
«donde:» no es decorativo: una fórmula con seis símbolos y tres explicados es una fórmula
que hay que ir a buscar a otro lado.

| Decisión | Por qué |
|---|---|
| `paso()` **normaliza** todos los campos | Los tres renderizadores pueden confiar en que `donde` es un arreglo. Si cada origen decidiera, uno que devolviera `null` rompería una sola de las tres salidas |
| Un **diccionario de símbolos** (`SIM`), no cadenas sueltas | El mismo `K_zt` aparece en tres lugares; con tres descripciones distintas el lector no sabe si son tres cosas |
| `valorDe()` y `puntosDe()` viven en el modelo | Con tres consumidores escribiendo el formato a mano, un día el panel dice «1.224,5 kN·m» y la memoria «1224.45» |
| Las trazas viejas se **adaptan**, no se reescriben | `edificio.js` y el capítulo 4 ya están probados contra el reglamento; tocarlos sería arriesgar una regresión en código validado para ganar prolijidad |
| El `detalle` viejo va como **nota**, no como «donde:» | Es prosa que explica de dónde sale el número. Los símbolos se declaran donde se escribe la fórmula |
| `consolidar()` **no calcula nada** | Cualquier cuenta ahí sería una segunda definición de algo que el motor ya resolvió, y el día que se separen la memoria informa un número que el cálculo nunca usó |
| La **traza del motor se conserva aparte** | Sirve para contrastar el árbol consolidado contra lo que el motor realmente hizo: si discrepan, la consolidación está reordenando algo que el motor ya no calcula así |

Seis bloques, en el orden del cálculo: **velocidad · sitio · cerramiento · ráfaga ·
presiones · resultantes**. Consolida lo que estaba repartido en `edificio.js`
(lista de pasos), `topografia.js` (`trazas: {K1,K2,K3}`), `velocidad.js` (`cuenta` de
texto), `cerramiento.js` (tabla por pared) y `factorRafaga.js` (intermedios sueltos).

Verificación: 19 tests en `tests/traza.test.js`. Verificado en navegador.

## Revisión del proyectista — correcciones ✅

Revisadas por fuera desde `720463b`. Las tres correcciones y las dos menores, en orden.

### 1 · `R_i` se mostraba y no se aplicaba

`edificio.js` tomaba `GC_pi = gcpiDe(cerramiento)` sin `R_i`: con una puerta abierta la
pantalla informaba `R_i` y las presiones usaban el ±0,55 de tabla. Las dos cosas son
defendibles por separado —adoptar 1,0 es admisible y conservador— pero juntas **la
pantalla se contradecía a sí misma**: el número estaba a la vista y no era el que se usó.

- Selector en Cerramiento, **por defecto `R_i = 1,0`** (art. 1.11.1).
- El valor elegido llega a **todos** los consumidores: presiones, resultantes, envolvente,
  silos, capítulo 4 y exportación. El silo comparte la envolvente del edificio, así que
  comparte su `R_i`: con el GC_pi sin reducir, dos pantallas informarían presiones
  internas distintas para el mismo cerramiento.
- La pantalla, la traza y el CSV/JSON dicen **cuál se aplicó**. Con 1,0 se sigue mostrando
  el valor de la expresión, rotulado *no aplicado*, y cuánto más alta queda la presión
  interna por adoptarlo.
- Donde la expresión **no interviene** —cualquier clasificación que no sea parcialmente
  cerrado— se dice eso, en vez de informar un `1,0` pelado que parecería un resultado.

### 2 · Ciudad incoherente con el origen de `V`

`resolverV()` y `regionDetritus()` usaban `d.ciudad` cualquiera fuera el origen.

| Origen | Antes | Ahora |
|---|---|---|
| tabla | ciudad | ciudad |
| **interpolado** | ciudad quedada del paso anterior | **sin ciudad**: el sitio está fuera de la tabla por definición y la V interpolada ES la lectura del mapa |
| **v50** | ciudad | ciudad si la hay; para detritus, `V_A = v₅₀·√1,5`, **exacto** por la misma expresión |
| **manual** | «Localidad» | **«Ciudad de referencia (mapa)»**, con «sin referencia» |

Para la región con detritus fuera de la tabla, la V del sitio se lleva a la Figura 1.5-1A
por la proporción entre mapas de la **C 1.5-6.1**: `V_A = V_cat·√(1,00/I_cat)`, con
`I = 0,87 / 1,00 / 1,15`; y a la 1.5-1B con `V_B = V_A·√1,15`. Antes esto era siempre una
declaración, aunque la app ya tuviera la lectura del mapa.

La conversión se **contrasta contra la propia tabla de ciudades** —las 29—, que es una
verificación cruzada y no una cuenta escrita dos veces: Bahía Blanca da
`72,2/√1,15 = 67,33` contra los 67,4 tabulados, 0,11 % de diferencia. La tabla está
redondeada a 0,1 m/s, así que la tolerancia del test es relativa.

⚠ **Una cifra del pedido sale distinta.** Categoría III interpolada con 63,0 m/s da
`63,0/√1,15 = 58,75` → **58,7 m/s**, no 58,8. La conclusión no cambia: está por debajo de
los 63 m/s y **no es región con detritus**. El `v50 = 48 → 58,8` sí cierra exacto
(`48·√1,5 = 58,79`).

### 3 · Definición de abertura

El texto decía «lo que define a una abertura es que deje pasar el aire», que es **la mitad
de la definición**. Va el texto literal del art. 1.2, y con él la decisión que la pantalla
tiene que hacer explícita: una puerta o portón **diseñados para la presión del Capítulo 5
y que se mantienen cerrados durante el viento de diseño NO son abertura** (art. 1.10.2.1).
Las dos condiciones van juntas.

### 4a · La envolvente de cubierta, en los dos sentidos

«La mayor presión sobre cada área» de la nota 2 **no dice «la mayor succión»**. Con las
dos direcciones succionando, envolver hacia arriba es lo que manda; cuando el faldón a
barlovento recibe **presión**, quedarse sólo con ésa toma en cada celda la **menor** de las
dos presiones descendentes, que es lo contrario de envolver. Los casos 3 y 4 generan ahora
los dos estados. La de arriba gobierna el levantamiento y el anclaje; la de abajo, la
compresión de correas y la flexión de los pórticos.

### 4b · El tramo de extensión nula, resuelto en el motor

`perfilBarlovento` devuelve `puntos` —las cotas con su `q_z`, `z = 0` incluido, para
tablas y diagramas— y `tramos` —sólo con `hasta > desde`, para integrar y exportar—.
Antes se filtraba en la exportación, y eso obligaba a que **cada salida nueva se acordara
de saltearlo**: la que se olvidara mostraría un tramo fantasma sin que nada fallara.

Verificación: 47 tests nuevos, **17 mutaciones corridas y 16 muertas**. La que sobrevive
es un reordenamiento de `deTabla ?? conv?.V` que el propio guardián vuelve inalcanzable.

## Fase 3 — procedencia, esquema y exportación ✅ (primer bloque)

### Procedencia en toda salida

`constants/version.js` es el único lugar donde viven la versión, la edición del reglamento
—**CIRSOC 102-2025**—, el procedimiento y el aviso de responsabilidad profesional. De ahí
salen el sobre del archivo de proyecto, la cabecera del CSV y el encabezado del JSON, en
versión objeto y en versión texto: **escritas aparte, un día la memoria informa una versión
y el JSON otra, y las dos salieron de la misma corrida**.

La versión está repetida en `package.json` a propósito —no se importa el manifiesto para no
arrastrarlo al bundle— y lo que impide que se separen es un test. Al escribirlo encontró la
primera discrepancia: la app decía 0.2.0 y el manifiesto 0.1.0.

### Esquema del archivo de proyecto — v2

| | v1 | v2 |
|---|---|---|
| Forma | `{ app, v: 1, ...estado }` | `{ app, esquema, version, norma, generado, datos }` |
| Problema | un campo del proyecto llamado `app` o `v` pisaba la identificación del archivo | los dos niveles separados |

⚠ **Y arregla un error que estaba a la vista.** `leer()` de `localStorage` fusionaba
sub-objeto por sub-objeto, pero **`importar()` de un archivo no**: hacía
`{ ...INICIAL, ...v, geo: {...} }` y nada más. Un archivo con un `topo` de tres claves
**reemplazaba el objeto entero**, y las que faltaban quedaban en `undefined`.
`num(undefined)` da NaN, y un NaN que entra al motor sale como «—» en la pantalla sin
ningún error: el caso se abre «bien» y el cálculo está roto. Las dos rutas pasan ahora por
la misma función pura.

La lista de sub-objetos se **deriva de `INICIAL`** y hay un test que la contrasta: uno
nuevo que no estuviera en la lista volvería a producir el mismo agujero.

### Exportación de presiones

Pantalla **Salidas**, al final del grupo de resultados. CSV y JSON con la presión de
**cada cara y cada zona**, en las cuatro direcciones y con **los dos signos de la presión
interna** —que son casos de carga separados, no un ± del que se elige el peor—.

| Decisión | Por qué |
|---|---|
| La unidad va **pegada al nombre de la columna** (`p_gobernante_kN_m2`) | Un CSV se abre en cualquier cosa y lo primero que se pierde son las líneas de encabezado. Una columna que dice `presion` a secas es una columna que alguien va a leer en las unidades que supone |
| **Dos dialectos** de CSV, no una constante | Abrir el equivocado NO da error: da una columna sola con todo el renglón adentro, o números partidos en dos |
| El escape se decide **contra el separador del dialecto** | Las referencias traen comas —«h/L = 0,28»—. Sin comillas, en el dialecto de coma correrían todas las columnas un lugar: el archivo se lee «bien» con los números cambiados de lugar |
| La pared a barlovento sale **tramo por tramo**, con su `q_z` | Exportarla con un `q_h` único borra justamente lo que la distingue de las demás caras |
| Dos columnas de área: **real** y **proyección en planta** | La presión actúa sobre la real (`planta / cos θ`); la componente vertical sale de la proyección. Con una sola, el que recibe el archivo tiene que adivinar cuál es |
| Las áreas de cubierta salen de `aporteCubierta`, no se recalculan | Recalcular la partición acá sería una segunda definición de la misma cosa, y el día que una cambie la exportación informa un área que el cálculo no usó |
| El JSON trae **la descripción de sus propias columnas** | No hace falta buscar un documento aparte que dentro de dos años puede no existir |
| La envolvente viaja **con el estado de carga que la gobierna** | No es el máximo por columna de la tabla de presiones: cada magnitud sale de un estado completo de la Figura 2.4-8 |

**Hallazgo menor:** el perfil de la pared a barlovento trae un tramo de **extensión nula en
z = 0**. Al motor no le molesta —área cero, fuerza cero— pero en un archivo es un renglón
con área 0 al lado de otros con área real, y eso invita a sumarlo o a dividir por él. Se
saltea en la exportación, no en el motor, que lo usa como extremo del perfil.

Verificación: 52 tests entre `tests/proyecto.test.js` y `tests/exportar.test.js`, con **23
mutaciones corridas y las 23 muertas**. Verificado en navegador descargando los dos
archivos y leyéndolos, y abriendo un proyecto del esquema 1 para ver la migración.

## Hallazgo — el factor de ráfaga se calculaba una vez para las cuatro direcciones

Apareció al abrir el ítem de `n₁` de la Fase 2. **No estaba en la lista: es un error de
cálculo, no una mejora.**

En (1.9-8) `B` es la dimensión **normal** al viento y en (1.9-15) `L` la **paralela** —las
mismas que usa la Figura 2.4-1, y se intercambian al girar el viento 90°—. La app llamaba
a `factorRafaga` **una sola vez** con `B = max(a, b)` y `L = min(a, b)`, y aplicaba ese `G`
a las cuatro direcciones. Como `Q` baja cuando `B` crece, ésa es exactamente la elección
que da el **`G` más chico de las dos**, o sea la que menos presión produce.

Medido en una nave de **20 × 100 m, h = 8, exposición B**, con el `G` calculado adoptado:

| Dirección | B | L | `G` antes | `G` ahora |
|---|---|---|---|---|
| Wx± (sopla contra la cara de 100 m) | 100 | 20 | 0,790 | 0,790 |
| Wy± (sopla contra la cara de 20 m) | 20 | 100 | 0,790 | **0,854** |

**8,1 % de menos en todas las presiones de esas dos direcciones, del lado inseguro**, sin
nada en el resultado que lo delatara. Sólo el 0,85 del art. 1.9.1 es igual en las cuatro
—no depende de la geometría—, y por eso el error era invisible mientras nadie eligiera otra
vía.

Arreglado: `G` se calcula por dirección, `dimensionesDe(planta, dir)` es la única
definición de la correspondencia, el barrido de altura lo recalcula en cada punto junto con
el sitio, y al capítulo 4 le viaja el mayor de las cuatro.

### Y de paso, la corrección de un hallazgo anterior

La sección «el G calculado no siempre es menor que 0,85» de `CLAUDE.md` afirmaba que eso
**sólo pasaba en exposición C y D**, y que en B quedaba entre 0,826 y 0,836. Era una
medición de una planta con `B = max(a, b)`. `Q` depende de `(B + h)/L_z̄`, así que el
**tamaño pesa tanto como la turbulencia**: un galpón de 20 × 30 con h = 6 supera el 0,85
**hasta en exposición B** (0,857 en la dirección angosta) y una nave de 200 × 120 queda por
debajo **hasta en D** (0,834). La tabla completa quedó en `CLAUDE.md` y en el comentario de
`engine/factorRafaga.js`.

## Aplicabilidad de la Figura 2.4-1 ✅ — dónde cayó cada lectura

`engine/aplicabilidad.js`. El motor lee las tablas con **los extremos congelados**, que es
lo que la figura manda —sus filas dicen «≤ 0,25», «≥ 1,0», «L/B ≥ 4»—. El problema no era
el número: era que una lectura interpolada y una leída en el extremo salían escritas
igual, y sólo la primera se puede controlar contra el papel reproduciendo la
interpolación.

**Cuatro estados, que no son grados de un mismo eje:**

| Estado | Tono | Qué significa |
|---|---|---|
| `dentro` | info | cayó entre dos filas tabuladas y se interpoló |
| `extremo` | **info** | quedó fuera del rango y se adoptó el extremo, que es lo que la figura manda. **No es un aviso**: marcarlo en amarillo llenaría de alertas cualquier galpón largo y haría que se dejen de leer las reales |
| `extendido` | **aviso** | el motor hizo una lectura que la figura NO escribe |
| `fuera` | error | el caso no está cubierto por lo implementado |

**Las dos lecturas extendidas que hay hoy:**

- **45° < θ < 60°.** La figura escribe el nodo de 60° como EXPRESIÓN (`0,01·θ`) y no como
  número. Se interpola hacia `0,01·60 = 0,60` —el valor fijo del nodo, no el `0,01·θ` del
  ángulo que se está calculando— y el caso de succión vale 0 en todo el tramo.
- **θ > 80°.** La nota manda tratar la cubierta como PARED y el faldón a barlovento toma
  `Cp = 0,80`, pero **el faldón a sotavento se sigue leyendo de la tabla de cubierta**
  (−0,60) en vez de la de pared a sotavento (−0,50 a −0,20). La figura no resuelve esa
  contradicción; se adopta la lectura literal y queda dicho.

**Lo que se informa además:** `h/B`, que **no indexa ninguna fila** de la figura —el Cp de
sotavento va por `L/B` y el de cubierta por `h/L`— y sólo entra en el factor de respuesta
de fondo `Q` del art. 1.9; y si el edificio es **de baja altura** (art. 1.2: `h ≤ 18 m` y
`h ≤` la menor dimensión en planta), porque entonces existe además el **método de la
envolvente**, que da otras cargas y NO está implementado acá. Callarlo haría creer que el
camino que la app recorre es el único disponible.

El rótulo de la tarjeta **cuenta los extremos aparte del tono**. Es un bug que encontró la
verificación en navegador y no los tests: como los extremos son «info» a propósito, una
nave de 100 × 20 con `L/B = 5` y `h/L = 0,06` —las dos filas leídas en el extremo— se
anunciaba como «todo dentro de tabla».

Verificación: 26 tests en `tests/aplicabilidad.test.js`, **31 mutaciones corridas y las 31
mueren**, con control de línea de base —sin él, una suite ya en rojo da «0 sobrevivientes»
sin haber probado nada—. Verificado en navegador sobre cinco geometrías.

## Envolvente de la Figura 2.4-8 ✅ — qué quedó decidido

`engine/envolvente.js`. El barrido es **4 direcciones × 2 signos de `GC_pi` × 2 casos de
la nota 3 × los casos de la figura**, con los dos signos de la excentricidad en los
torsionales: **144 estados** sin exención, 48 con ella. Cada estado viaja entero —corte,
levantamiento, vuelco y `M_T` del MISMO estado— y la envolvente informa de qué combinación
salió cada máximo.

| Decisión | Por qué |
|---|---|
| **En los casos 3 y 4 la cubierta NO va al 75 %** | La nota 2 la deja al 100 % de la mayor presión —del caso 1 para el 3, del caso 2 para el 4— **sobre cada área**, considerando las dos direcciones. Leyendo «75 % en los dos ejes» uno le pone 0,75 a todo y subestima el levantamiento |
| **La envolvente de cubierta es POR ÁREA, no el mayor de los dos totales** | Las dos direcciones zonifican la planta en franjas desde **su propio** borde de barlovento, así que son ortogonales: la grilla es el producto y la integración, exacta. En el galpón de control de 20 × 30 el levantamiento del caso 3 da 417,3 kN contra 373,6 del caso 1 |
| **Los dos casos de la nota 3 entran al barrido** | Una primera versión elegía para la cubierta el caso que gobernaba el CORTE y con ese armaba también el levantamiento: el estado no era ninguno de los dos |
| **`M_T = f·F_paredes·e`** | `(P_W + P_L)·B` integrado en altura **es** la fuerza total de las paredes, así que el momento total sale de la fuerza total. No hace falta integrar el torsor aparte |
| **En el caso 4 los dos ejes SUMAN** | Es lo que le faltaba al `momentoTorsor` viejo, que cubría un eje solo |
| **La exención del 2.4.7.2 se contrasta con la geometría** | `h ≤ 10 m` la verifica la app: una condición de una planta declarada en un edificio de 24 m se marca como desmentida y **no exime**. Las otras dos —plantas, entramado— no son datos del modelo y no se desmienten nunca |
| **El texto de los art. 2.4.7.3 a 2.4.7.5 no se transcribe** | Son condiciones sobre rigideces y regularidad torsional, que dependen del modelo estructural. Se registran como declaración con la cita y el fundamento; poner un resumen invitaría a tildar la casilla sin abrir el reglamento |
| **La nota 4 cambia cómo se aplica `M_T`, no cuánto vale** | Con diafragma flexible o sin diafragma se avisa que va como bloque de presión distribuida. **Esa distribución no la arma la app**: depende de los planos resistentes |
| **La nota 3 no cambia estas resultantes** | Las paredes laterales son paralelas al viento y no tienen componente en la dirección analizada. Importa para el reparto entre planos resistentes, que es del modelo estructural |
| **`flexible` sale del mismo criterio que `G`** | n₁ < 1 Hz, art. 1.2. Dos definiciones de «edificio flexible» en la misma app es cómo se llega a un `G_f` de flexible con una excentricidad de rígido |
| **Fuera `CASOS_CARGA` y `momentoTorsor` de `engine/edificio.js`** | Estaban exportados y no los llamaba nadie más que sus tests, y su `factor` único por caso es incorrecto —paredes y cubierta no lo comparten—. Dos definiciones del mismo caso de carga, una usada y otra no, es cómo la memoria informa un número que el motor nunca calculó |

Verificación: 39 tests en `tests/envolvente.test.js`, **28 mutaciones corridas y las 28
mueren**. Verificado además en navegador sobre `vite preview`, sin errores de consola.

### 📥 Lo que falta y es del proyectista

**La expresión (2.4-5) no está transcripta.** En estructuras flexibles la Figura 2.4-8
remite a ella para la excentricidad, y necesita `e_Q`, `e_R`, `g_Q`, `g_R` y los factores
de respuesta de fondo y resonante del art. 1.9.5, que hoy no son datos del modelo.
Mientras tanto se adopta `e = ±0,15·B`, que es el valor de estructuras **rígidas**, y la
app lo avisa en rojo en Resultantes y en Resumen: **puede quedar del lado inseguro**. Con
el edificio rígido —que es el caso de casi todo lo que esta app calcula— no cambia nada.

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
