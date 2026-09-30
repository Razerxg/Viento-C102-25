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

## Croquis — reglas comunes y control automático 🔄

Pedido del proyectista en tres partes. Las dos primeras van juntas: el script es lo que
prueba las reglas.

| Estado | Ítem | Dónde |
|---|---|---|
| ✅ | **Control automático de croquis** sobre el build, con Playwright y Chromium | `scripts/qa-croquis.mjs` + `qa-matriz.js` + `qa-chequeos.js` · `npm run qa:croquis` |
| ✅ | **Matriz de 10 geometrías**, cada una con su razón escrita | `scripts/qa-matriz.js` |
| ✅ | **Reglas comunes de dibujo**: texto que no escala, halo, cota que se mide, cadenas apiladas, un rótulo por región conexa, unidades del croquis, escala compartida, `B_X`/`B_Y` | `components/svg/kit.jsx` + `formatoCroquis.js`, con `tests/croquisKit.test.js` |
| ✅ | **Tinta por tokens del tema en los nueve croquis**; las escalas de datos, aparte | `lib/paletaDatos.js` + `lib/escalaPresion.js`, con test que recorre `components/svg/` |
| ✅ | **Contraste**: `txt3` subido a 4,65:1 en oscuro y 5,23:1 en claro | `components/tokens.js` |
| ✅ | **Ampliar, Descargar SVG y control de escala** en cada croquis | `kit.jsx → BarraCroquis` |
| ✅ | **Croquis 2–3× más grandes**: la escala la fija el ancho y el alto sale del dibujo | `kit.jsx → escalaPorAncho` + `ZonasCyR.jsx` + `CroquisTab.jsx` |
| ✅ | **Voladizo de cubierta** — capítulo 5 (art. 5.7 + nota 7) y capítulo 2 (art. 2.4.4) | `engine/voladizo.js` + `engine/cyrPresiones.js` + `engine/edificio.js` + `engine/resultantes.js`, con `tests/voladizo.test.js` (44 tests) |
| ✅ | **Alero adosado a pared** (art. 5.9) — parte 3B | `constants/aleroAdosado.js` + `engine/aleroAdosado.js` + `components/svg/AleroAdosadoSVG.jsx` + `components/tabs/AleroAdosado.jsx`, con `tests/aleroAdosado.test.js` (51 tests) |
| ✅ | **Matriz de 14 geometrías**: dos con voladizo y dos con alero adosado | `scripts/qa-matriz.js` · 564 croquis, 0 fallas |
| 📥 | El **alero adosado en las salidas CSV/JSON** — archivo propio, no mezclado con C&R | `lib/exportar.js` |

**Antes: 7.536 fallas sobre 400 croquis.** 6.298 de letra por debajo de 11 px —el texto
escalaba con el dibujo— y 1.022 de contraste, que era el token `txt3` dando 3,68:1 en
oscuro y 4,10:1 en claro contra el fondo de tarjeta.

Dos hallazgos que costaron una vuelta cada uno:

- **El factor de escala del texto NO se mide por el ancho de la caja.** Con `max-height`
  puesto, un SVG ancho queda limitado por la ALTURA: su caja mide 794 px pero el dibujo va
  a escala 1:1, centrado, con franjas vacías a los costados. Medido por el ancho salía
  0,78 y el texto se dibujaba un 22 % más chico. `getScreenCTM` da la matriz real.
- **`useEscalaTexto` sólo vale DENTRO de `Lienzo`.** Quien renderiza el `Lienzo` está fuera
  de su contexto y lee el valor por defecto, 1. Por eso los rótulos del perfil de q(z) se
  eligen en un componente hijo y no en el que arma el dibujo.

### Voladizos de cubierta — lo que está y lo que falta

**Modelo: CUATRO BORDES, no un vuelo.** El art. 2.4.4 trata distinto el voladizo a
BARLOVENTO, y cuál es depende de la dirección de viento que se analice: con un solo número
«vuelo» esa pregunta no se puede responder. La pantalla los agrupa como se piensa el vuelo
al proyectar —aleros y hastiales, perimetral, alero alto / bajo / laterales— pero eso es
presentación.

**Lo que NO cambia, y es donde está la trampa:** `h`, `a`, `b` y el área de pared. La
altura media se mide sobre la línea de pared. Sumar el vuelo a `b` cambiaría el remonte,
la altura media, el área de las paredes y la relación h/L de las cuatro direcciones.

**Capítulo 5 — completo.** Leído del PDF:

- **art. 5.7**: `p = q_h[(GC_p) − (GC_pi)]`, con `q_h` a la altura MEDIA de cubierta, y
  `(GC_p)` como «la suma de las contribuciones» de la cara superior —la figura de la zona
  de cubierta donde está el voladizo— y la inferior —«tomado igual a la zona de pared
  adyacente según la Figura 5.3-1 y ajustado al área efectiva de viento»—.
  ⚠ **«Suma» no es la suma aritmética de los dos números tal como salen de sus figuras.**
  El comentario C 5.3.2.1 fija la convención de una superficie INFERIOR —positivo = carga
  hacia arriba— que es la opuesta a la de la cara superior. Llevado todo a la convención
  de arriba: levantamiento = (GC_p)⁻cubierta − (GC_p)⁺pared. Las dos contribuciones suman
  en magnitud, que es lo único físicamente razonable: el viento que empuja contra la pared
  entra por debajo del voladizo y lo levanta.
- **art. 5.7, (GC_pi) = 0** «cuando la separación de las superficies superior e inferior
  del voladizo no configure un volumen interno». Es una DECLARACIÓN del proyectista, por
  elemento, y el defecto es que sí lo configura, que es lo conservador.
- **nota 6 de la Fig. 5.3-2A**: con θ ≤ 7° la figura trae curva de ALERO propia y sus
  valores «incluyen las contribuciones de presión de las superficies superior e inferior».
  Ahí no se compone nada: componer sería contarlas dos veces.
- **nota 7 de la Fig. 5.3-2A**: «la dimensión horizontal menor del edificio no incluirá
  ninguna dimensión de voladizo, pero la distancia al borde, a, se medirá desde el borde
  exterior del voladizo». Son DOS cosas en dos lugares: `a` se calcula con la planta del
  edificio y se aplica sobre la planta de la CUBIERTA.

**Capítulo 2 — ✅ completo, con tres definiciones del proyectista.** El art. 2.4.4 completo
dice:

> La presión externa positiva en la superficie inferior de voladizos de cubierta a
> barlovento se debe calcular usando **C_p = +0,8** y combinada con las presiones en la
> superficie superior calculadas usando la **Figura 2.4-1**.

Eso es todo: no tiene comentario (C 2.4.4 no existe) y las siete notas de la Fig. 2.4-1
no mencionan voladizos. Lo que el artículo NO escribe y el proyectista definió —anotado acá
y en `constants/presionesExternas.js` para distinguir lo transcripto de lo decidido—:

1. **con qué presión dinámica** se evalúa la cara inferior → **`q_h`**, la misma del resto
   de la cubierta. La columna «Usar con» de la Fig. 2.4-1 da `q_z` sólo para la pared a
   barlovento y `q_h` para todo lo demás, y el artículo trata la cara inferior como una
   superficie de cubierta más;
2. **la zonificación** → **sólo el borde a barlovento**. Los otros tres vuelos aportan área
   de cubierta al levantamiento, pero no la presión positiva de la cara inferior: el viento
   entra por debajo del vuelo que enfrenta, no por los que están a sotavento;
3. **si el factor de ráfaga G multiplica** → **sí**: `p = q·G·C_p`. Es un `C_p`, no un
   `(GC_p)`; la Fig. 2.4-1 los da todos así y el capítulo entero los multiplica por `G`.

⚠ **La cara inferior NO es una superficie de cubierta**, aunque el coeficiente salga del
capítulo de cubiertas. Nació con `tipo: "cubierta"` y el reparto de franjas la barrió como
una parte sobre toda la planta: el levantamiento cambiaba de signo. Lleva
`tipo: "voladizo"`, y en `resultantes.js` una parte con `caraInferior` aporta su presión al
eje vertical con signo opuesto y nada al horizontal.

⚠ **`normalizarVoladizo` tiene que ser idempotente.** `normalizarGeo` corre sobre
geometrías ya normalizadas en más de un camino, y un voladizo normalizado trae `grupos` como
ARREGLO: leído como objeto daba `undefined` en cada grupo, los cuatro vuelos se iban a cero
y el voladizo desaparecía en silencio. Hay test que normaliza dos veces y compara campo por
campo.

### Aleros adosados a paredes — art. 5.9 ✅

**No es un voladizo de cubierta**, y el comentario lo separa con todas las letras: «Los
aleros adosados son diferentes de los voladizos de cubierta, que son simplemente extensiones
de las cubiertas, de igual pendiente» (C 5.9). Otra expresión, otras figuras:

```
p = q_h (GC_p)                              (5.9-1)
```

⚠ **La (5.9-1) NO lleva `(GC_pi)`.** El artículo escribe la expresión con un solo término y
su lista de símbolos tiene tres entradas —`p`, `q_h`, `(GC_p)`—. Un alero adosado no encierra
un recinto. Copiar la (5.3-1), que sí resta presión interna, es el error fácil, y hay test
que lo impide: con `(GC_pi)` el número seguiría siendo plausible.

⚠ **`q_h` se evalúa a la altura media de cubierta del EDIFICIO, no del alero.** «q_h presión
dinámica del artículo 1.13 evaluada a la altura media de cubierta, h». Un alero a 3 m colgado
de un edificio de 25 se carga con la presión dinámica de los 25 m y con las figuras de
h > 20 m. Es la trampa del artículo, y la notación de las figuras distingue las tres alturas:
`h` (del edificio), `h_c` (media del alero adosado) y `h_e` (media del alero de la cubierta).
`h_c/h_e` no entra en `q_h`: entra sólo en elegir la banda de las figuras netas.

**Cuatro figuras, dos preguntas distintas** (C 5.9):

| Figura | Tabla | Qué da | Para qué |
|---|---|---|---|
| 5.9-1A | C 5.9-1 | coeficientes sobre cada superficie, `h ≤ 20 m` | fijaciones de la cara superior y de la inferior |
| 5.9-1B | C 5.9-2 | coeficiente **neto**, `h ≤ 20 m` | estructura del alero: vigas, columnas, fijación al edificio |
| 5.9-2A | C 5.9-3 | superficies, `h > 20 m` | ídem, edificio alto |
| 5.9-2B | C 5.9-4 | neto, `h > 20 m` | ídem, edificio alto |

Con dos superficies físicas «se necesita aplicar ambas Figuras»; **con una sola superficie,
«solo se aplica la Figura 5.9-1B»**. No son dos caminos entre los que elegir el peor: son dos
elementos distintos del mismo alero, y el motor devuelve las dos en paralelo.

Las curvas salen de las **Tablas C 5.9-1 a C 5.9-4** —«los valores de (GC_p) de las figuras
se dan en formato de ecuación»—, transcriptas como poligonales de puntos de quiebre igual que
las de la 5.3, con `tests/aleroAdosado.test.js` transcribiendo las cuatro tablas otra vez
como ecuaciones y cruzándolas en diez áreas.

**Las bandas de `h_c/h_e` sólo existen en las figuras netas.** La nota 1 de las 5.9-1A y
5.9-2A dice que sus valores «se basan en los valores más críticos para todas las relaciones
de h_c/h_e»: ya son la envolvente. Y los bordes se comparan como los escribe la tabla —
`0,9 ≤ r ≤ 1` contra `0,5 < r < 0,9`—: `r = 0,9` cae en la banda alta, y un `<=` por un `<`
ahí baja la succión un 36 %.

**Excepciones 1 y 2 — la interpolación entre 20 y 30 m.** «Como alternativa al uso de (GC_p)
de la Figura 5.9-2A/B para edificios con altura media de cubierta entre 20 m y 30 m, el valor
puede ser interpolado linealmente» entre el de la figura de 20 m y el de la de 30 m, «para
cada relación h_c/h_e». Da coeficientes MENORES que la figura de h > 20 m sola, así que el
defecto es NO usarla: el proyectista la declara. La curva interpolada se arma sobre la UNIÓN
de las dos abscisas —las de h ≤ 20 m quiebran en 1 y 10, las de h > 20 m en 1, 10 y 100—
porque casándolas por índice se uniría el quiebre de 10 de una con el de 100 de la otra.

**Pendiente ≤ 2 %, y está en el comentario, no en el artículo.** C 5.9: «Los datos
experimentales que se disponen para esta tipología son limitados y por ello se restringe la
aplicabilidad de esta sección a aleros planos con pendiente menor o igual a 2 %». Es una
restricción de ALCANCE: el motor la informa como error y no la corrige.

**El mínimo de 0,80 kN/m² del art. 5.2.2 SÍ aplica**: está en «REQUISITOS GENERALES» del
capítulo, antes de las partes, y habla de «componentes y revestimientos de edificios y otras
estructuras», sin restringirlo a una parte.

#### Dos cosas que el reglamento no cierra, avisadas y no resueltas en silencio

1. ⚠ **La Tabla C 5.9-4 no cubre `h_c/h_e ≤ 0,1`.** Sus bandas son `0,9 ≤ r ≤ 1` y
   `0,1 < r < 0,9`, y no hay tercera fila; su par de `h ≤ 20 m`, la C 5.9-2, sí cubre el
   fondo con `r ≤ 0,5`. Se extiende la banda contigua hacia abajo y **se avisa**. Es lo
   coherente con la tendencia que muestran las dos tablas —cuanto más bajo el alero respecto
   del alero de la cubierta, menos succión—; tomar la banda alta sería conservador pero diría
   lo contrario de lo que el reglamento muestra. Con el aviso, el proyectista decide.
2. ⚠ **La nota 5 de las Figs. 5.9-1B y 5.9-2B pide «interpolación lineal para valores
   intermedios de h_c/h_e»**, pero las tablas del comentario no dan curvas de un `h_c/h_e`
   puntual: dan curvas válidas en todo un rango, y los rangos cubren el dominio sin huecos.
   No queda ningún «valor intermedio» entre ellos: la nota y la tabla no dicen lo mismo. Se
   adopta la tabla —la nota sin curvas puntuales no es aplicable— y el coeficiente salta en
   `h_c/h_e = 0,5` y `0,9`. Interpolar entre los centros de banda sería suavizarlo con una
   regla que nadie escribió.

Y una propiedad de las tablas que conviene tener anotada porque parece un error y no lo es:
⚠ **la cara inferior se cruza en A ≈ 31,6 m².** En general la figura de `h > 20 m` succiona
más que la de `h ≤ 20 m`, pero la cara inferior es la excepción: la C 5.9-1 la congela en
−0,65 desde A = 10 m² y el último tramo de la C 5.9-3 —`−1,1 + 0,3 log A`— la cruza en
10^1,5 = 31,6 m² y llega a −0,50 en A = 100 m². Y los negativos de las Tablas C 5.9-3 y
C 5.9-4 terminan en A = 100 m² sin meseta: la poligonal congela ahí el valor, que es lo
conservador —esos tramos crecen con el área— y el motor lo avisa.

## Fase 4 — Capítulo 5, componentes y revestimientos 🔄

Capítulo leído entero (74 págs., Reglamento + Comentario). Uso previsto: LSF, correas y
chapas.

**Un solo método: la Parte 1 (art. 5.3)**, para `h ≤ 20 m` o edificio de baja altura
(art. 1.2). La **Parte 6** —procedimiento simplificado, Tabla 5.13-2— **no se implementa
como método**: esa tabla se obtiene de la Parte 1 con `h = 10 m`, exposición B,
`K_z = 0,71`, `K_d = 0,85`, `K_zt = 1`, `K_e = 1` (C 5.13), así que entra como
**verificación cruzada** y no como una segunda vía de cálculo que haya que mantener.

### Lo que no cambia respecto del SPRFV

| | |
|---|---|
| `p = q_h·[(GC_p) − (GC_pi)]`, expr. (5.3-1) | En la Parte 1 `q_h` rige **también en las paredes**, a diferencia del capítulo 2 |
| `(GC_p)` incluye `G` | Art. 5.2.4: no se separan. `G` no interviene en C&R |
| Los dos signos de `GC_pi`, siempre | Tabla 1.11-1, nota 3. El `R_i` elegido en Cerramiento ya viene aplicado |
| `K_d` de la fila **edificio_cyr** | No la del SPRFV |
| `K_zt` = máximo de `K_zt(h)` entre direcciones | C&R es envolvente de todas las direcciones |
| Exposición | La que dé las mayores cargas en cualquier dirección (art. 1.7.4.4). Hoy hay una sola |
| Mínimo **0,80 kN/m² neto** (art. 5.2.2) | No es el 0,75 del art. 2.1.5. Se marca en la salida cuándo gobierna |
| Área tributaria > 65 m² | Aviso **info**: el art. 5.2.3 permite diseñarlo como SPRFV |

Pantalla nueva **«Componentes y revestimientos»**, en el grupo de cálculo, después de
Resultantes. Toma `V`, exposición, `K_zt`, geometría y `GC_pi` de Sitio, Edificio y
Cerramiento: **no se repite ningún dato**. Los resultados se dan **por elemento y para
todas las zonas** de la figura aplicable; la zona elegida sólo filtra la vista. El dibujo
informa, no interviene en la cuenta. Sin campos de fundamento, como el resto de la app.

### Las figuras y de dónde sale cada curva

La página del PDF del capítulo y la del Reglamento se corresponden con `Cap. 5-(N+134)`.

| Figura | Qué cubre | PDF | Cap. 5 | Fuente de la curva | Etapa |
|---|---|---|---|---|---|
| 5.3-1 | Paredes, `h ≤ 20 m`, zonas 4 y 5 | 32 | 166 | Ecuaciones de la **Tabla C 5.3-1** | 5.1 |
| 5.3-2A | Dos aguas y planas, `θ ≤ 7°` | 34 | 168 | **Tabla C 5.3-2** | 5.1 |
| 5.3-2B | Dos aguas, 7°–20° | 35 | 169 | **Tabla C 5.3-3** | 5.1 |
| 5.3-2C | Dos aguas, 20°–27° | 36 | 170 | **Tabla C 5.3-4** | 5.1 |
| 5.3-2D | Dos aguas, 27°–45° | 37 | 171 | **Tabla C 5.3-5** | 5.1 |
| 5.3-2E | Cuatro aguas, 7°–20° | 38 | 172 | **Tabla C 5.3-6** | 5.1 |
| 5.3-2F | Cuatro aguas, 20°–27° | 39 | 173 | **Tabla C 5.3-7** — zonas 2 y 3 comparten curva | 5.1 |
| 5.3-2G | Cuatro aguas, `θ = 45°` | 40 | 174 | **Tabla C 5.3-8** | 5.1 |
| 5.3-5A | Vertiente única, 3°–10° | 43 | 177 | **No tiene ecuación** — transcripción del gráfico, ✅ verificada | 5.1 |
| 5.3-5B | Vertiente única, 10°–30° | 44 | 178 | **No tiene ecuación** — transcripción del gráfico, ✅ verificada | 5.1 |
| C 5-1 | Los cuatro escenarios de zonas de cubierta | 70 | 204 | Leída de la figura | 5.1 |
| C 5.3-2 | Plantas irregulares: `X ≤ a` y esquinas ≥ 135° | 72 | 206 | Leída de la figura | 5.1 |
| Tabla 5.13-2 | Presiones del procedimiento simplificado | 65–69 | 199–203 | Transcripción — **test cruzado**, no método | 5.1 |
| 5.3-1A | Superficie inferior de edificios elevados, zona 4⁺ | 33 | 167 | Remite a la curva positiva de zona 4 de la 5.3-1 | 5.4 |
| 5.3-3 · 5.3-4 · 5.3-6 · 5.3-7 · 5.3-8 | Escalonadas · dos aguas múltiples · diente de sierra · cúpula · abovedada | 41–47 | 175–181 | — | 5.4 |
| 5.4-1 · 5.4-1A | Paredes y cubiertas con `h > 20 m` | 48–49 | 182–183 | — | 5.3 |
| 5.5-1 a 5.5-3 | Edificios abiertos, `C_N` | 50–52 | 184–186 | Tablas de la propia figura | 5.3 |
| 5.6-1 · 5.7-1 | Parapetos · voladizos de cubierta | 53–54 | 187–188 | — | 5.2 |
| 5.9-1A/B · 5.9-2A/B | Aleros adosados a paredes | 55–58 | 189–192 | Ecuaciones de las **Tablas C 5.9-1 a C 5.9-4** | 5.2 |
| 5.10-1 a 5.10-4 | Silos, tanques y recipientes cilíndricos | 59–64 | 193–198 | — | 5.4 |

### 5.1 — Paredes y cubiertas por la Parte 1 🔄

| Estado | Ítem | Dónde |
|---|---|---|
| ✅ | Las 72 curvas de las Figs. 5.3-1, 5.3-2A a 2G y 5.3-5A/5B, y el evaluador | `constants/cyrCurvas.js` + `engine/cyr.js`, con `tests/cyrCurvas.test.js` (28 tests, 10 mutantes sin sobrevivientes) |
| ✅ | Clasificador de zonas por punto, `a`, y las siete zonificaciones | `engine/cyrZonas.js`, con `tests/cyrZonas.test.js` (50 tests, 12 mutantes sin sobrevivientes) |
| ✅ | Selección de figura, interpolación 27°–45°, altura y reducción de pared | `engine/cyrFiguras.js`, con `tests/cyrFiguras.test.js` (39 tests, 15 mutantes sin sobrevivientes) |
| ✅ | Área efectiva por tipo de elemento | `engine/cyrElementos.js` |
| ✅ | Presiones, mínimo del art. 5.2.2, nota de parapeto y verificación por elemento | `engine/cyrPresiones.js`, con `tests/cyrPresiones.test.js` |
| ✅ | **Verificación cruzada contra la Tabla 5.13-2 — 960 valores** | `tests/casos/tabla5132.js` + `tests/cyrTabla5132.test.js` |
| ✅ | `analizarCyR` — del proyecto a los elementos verificados | `engine/cyrPresiones.js` |
| ✅ | Pantalla «Componentes y revestimientos» y croquis de zonas | `components/tabs/CyRTab.jsx` + `components/svg/ZonasCyR.jsx` |
| ✅ | Los SVG de las configuraciones de zonas, **verificados por el proyectista** contra el PDF | `docs/zonas/` — los cinco escenarios, la 2B/2C, la 2D y las de cuatro aguas |
| ✅ | Exportación CSV/JSON y capítulo de memoria | `lib/exportar.js` + `lib/memoriaCapitulos.js` |
| ✅ | **Figs. 5.3-5A y 5B — verificadas por el proyectista y ACTIVADAS** | `docs/verificar-cyr.md`. Están en `FIGURAS` y `FIGURAS_LISTA`, con sus dos layouts (`UNA_AGUA_PRIMADA` y `UNA_AGUA`) y sus tests de regiones. `FIGURAS_PENDIENTES` quedó vacío. Corrección del proyectista: la franja de zona 2 contra el alero BAJO de la 5A mide `a`, no 2a |

**Las zonas salen de un clasificador por punto, no de una tabla de escenarios.** Los cuatro
dibujos de la Fig. C 5-1 son *consecuencia* de la geometría, no casos a codificar:
`zonaEn(x, y, geo)` devuelve la zona de un punto de la planta y los escenarios aparecen
solos. El croquis dibuja las regiones que devuelve esa función y el motor la usa para saber
qué zonas existen; el dibujo no calcula nada. Hay un quinto escenario que **no está en la
Fig. C 5-1** y sí en el comentario C 5.1 —mayor dimensión < 0,4·h, toda la cubierta en zona
3—, que también tiene que salir de la geometría.

**Plantas irregulares: fuera del alcance.** La Fig. C 5.3-2 (plantas en L, en T, esquinas
≥ 135°, la regla de `X ≤ a`) no se implementa, porque la geometría de la app es
rectangular. Va declarado en el Alcance de la memoria, no como un ⏳.

#### Un error que sólo apareció al dibujar

`zonaEn` clasificaba las **paredes** con `min(dx, dy) ≤ a` sobre la planta. Parece
razonable y está mal: todo punto que esté *sobre* una pared tiene distancia cero al borde
de la planta, así que **el punto medio de una nave de 40 m —zona 4 sin ninguna duda— salía
zona 5**.

Pasó dos tandas de tests porque **los dos controles miraban lo mismo**: `zonasPresentes` y
el barrido denso usaban esa misma función, así que coincidían entre sí estando los dos
equivocados. Lo destapó armar el croquis.

De ahí sale el criterio para las regiones del dibujo: `regionesDe` es una **segunda
representación independiente** de la misma regla —una responde «¿qué zona es este punto?» y
la otra «¿qué figura ocupa cada zona?»—, y hay un test que las cruza sobre 11 geometrías y
151² puntos cada una, **sin una sola discrepancia en el interior**. Las únicas admitidas
son las de la línea divisoria misma, donde el clasificador usa `≤` y el dibujo pinta encima
el rectángulo siguiente: un conjunto de área cero, identificado por que el clasificador
salta al mover el punto un infinitésimo —en los ocho sentidos, porque en la esquina de un
anillo mover una sola coordenada no cambia nada—.

Las paredes se clasifican ahora con `zonaEnPared(s, largo, a)`, que es lo que son: una
posición **a lo largo** de esa pared.

#### La verificación cruzada contra la Tabla 5.13-2 ✅ — cerrada

Las cuatro páginas de la tabla (Cap. 5-200 a 5-203) **tienen capa de texto**, así que los
960 valores se extrajeron con `pdftotext -layout` y no a ojo. El motor los regenera con los
parámetros que declara C 5.13, y el resultado es: **63 celdas fuera del 0,5 %, en
exactamente las tres familias que el proyectista había anticipado, y ninguna más.**

| Excepción | Celdas | Desvío | Qué es |
|---|---|---|---|
| Cubierta zona 1, `A = 2 m²` | 32 | tabla +1,1 % a +1,4 % | Sólo esa área y esa zona. No es la curva: es ese punto |
| Paredes zona 5, `A = 5 m²`, positivo | 30 | tabla +1,6 % a +2,2 % | La tabla distingue el positivo de la zona 5 del de la 4; la Tabla C 5.3-1 les da la **misma** ecuación |
| **Errata** cubierta zona 2, `A = 1 m²`, `V = 42,9 m/s`, cerrado | 1 | +15,0 % | La tabla repite el −1.468 N/m² de la columna de 40 m/s; corresponde **−1.689**. Con `GC_pi = ±0,55` la misma celda cierra bien |

Cada excepción se reconoce **por nombre y con su banda de desvío**, nunca ampliando la
tolerancia: si el desvío cambia, el test falla. Y hay un test que exige que cada excepción
**siga siendo necesaria**, para que no quede como una exención permanente que nadie
revisa. La zona 4 de pared en `A = 5 m²` queda por debajo del 0,5 % y no necesita excepción.

Dos cosas más que el control dejó fijadas:

- **La tabla no aplica la reducción del 10 % de la nota 5 de la Fig. 5.3-1.** No es una
  suposición del test: aplicándola, las 192 celdas de pared se separan un 10 % y casi
  ninguna entra en tolerancia. Hay test que lo mide.
- **`K_z` se fija en 0,71, que es lo que declara C 5.13.** La expresión continua del motor
  da 0,7058 —que redondea a 0,71, o sea que son consistentes—, pero esa diferencia del
  0,59 % se comería la tolerancia y convertiría el control del capítulo 5 en uno de `K_z`.

Es la única verificación **verdaderamente independiente** del capítulo: los tests contra las
Tablas C 5.3-1 a 8 comparan dos transcripciones propias de la misma fuente, y éste compara
contra números que calcularon los autores de la norma. Verifica de una sola vez la lectura
del PDF, la interpolación en log A, la combinación de los dos signos de `GC_pi` y el mínimo
del art. 5.2.2 —que gobierna más de la mitad de las celdas positivas—.

#### Selección de figura — lo que quedó decidido

- **Cuatro aguas con θ ≤ 7°** → Fig. 5.3-2A, que se titula «cubiertas a dos aguas». Es una
  decisión de lectura, así que va con aviso **info** visible: las figuras de cuatro aguas
  arrancan en 7°, y el **paso 6 del art. 5.3** agrupa «cubiertas planas, cubiertas a dos y
  a cuatro aguas» bajo la Figura 5.3-2.
- **Cuatro aguas entre 27° y 45°** → interpolación lineal en θ entre la 2F y la 2G,
  **zona por zona y después de leer cada curva con el área del elemento** (C 5.3.2).
  Mezclar las curvas y leer después daría otro número, porque la lectura es lineal en log A.
- **Vertiente única con θ ≤ 3°** → Fig. 5.3-2A, por la nota 5 de la Fig. 5.3-5A.
- **Lo que no está, no se aproxima.** Dos aguas > 45°, vertiente única > 30°, mansarda,
  diente de sierra: aviso **error** y ningún número. El evaluador tira si se lo llama
  igual. El motivo distingue «no está en el reglamento» de «no está transcripta todavía»,
  que para el proyectista son dos situaciones distintas.
- **Plantas irregulares (Fig. C 5.3-2): fuera del alcance**, al Alcance de la memoria.

#### La regla del tercio esconde su propio error

`A = L · máx(s; L/3)`. Olvidarse del tercio **achica** el área y por lo tanto **agranda** el
`(GC_p)` —las curvas pierden magnitud con A—: el error queda del lado seguro y no lo
detecta ningún control de resultados. Hay test que lo muestra con la correa de 6 m cada
1,50 m (12 m² efectivos contra 9 m² tributarios). Y son **dos áreas distintas**: el `(GC_p)`
se lee con A, la presión se aplica sobre el área tributaria real (C 1.2). Se devuelven las
dos y la pantalla lo dice.

#### Las zonificaciones son CINCO y no una, y la 2C y la 2D no se parecen

Leídas de los diagramas de cada figura, una por una. La diferencia entre la 5.3-2C y la
5.3-2D es exactamente la que se deduciría mal:

| Zonificación | Figuras | Zona 3 | Zona 2 | Zona 1 |
|---|---|---|---|---|
| `planaH` | 5.3-2A | L de esquina de `0,6h × 0,2h` | franja de `0,6h` | anillo de `0,6h` a `1,2h`, y `1′` más adentro |
| `dosAguasCumbrera` | 5.3-2B · 2C | **extremos de la cumbrera** (`a × a`) | resto de las franjas de hastial y de cumbrera | el resto, **aleros incluidos** |
| `dosAguasEsquinas` | 5.3-2D | **las cuatro esquinas** | resto de la franja de hastial | el resto — **no hay franja de cumbrera** |
| `cuatroAguas` | 5.3-2E · 2F · 2G | **todo el perímetro** | franja `a` sobre cumbrera y limatesas | interior de cada faldón |
| `pared` | 5.3-1 | — (zona 5) | — | — (zona 4) |

Pasados los 27° en dos aguas el pico se va de la cumbrera a las esquinas, y en cuatro aguas
la zona más succionada es el **alero**, no la cumbrera. Son cuatro dibujos distintos, no
uno con otros números; por eso hay una zonificación por dibujo y un test que exige que la
2B ponga zona 2 —y no 3— en la esquina del edificio.

**Los aleros de las Figs. 5.3-2B, 2C y 2D no están zonificados**: en el diagrama la zona 1
llega hasta el borde. No es una omisión de lectura — la nota 5 de esas figuras manda los
voladizos de cubierta al art. 5.7, que es la etapa 5.2.

#### Dos cosas que se midieron sobre las curvas y conviene no volver a discutir

**1. Los dos gráficos de la Fig. 5.3-2A son UBICACIONES DEL ELEMENTO, no variantes del
edificio.** CUBIERTAS es un elemento de cubierta sobre el recinto cerrado; ALERO es un
elemento ubicado **en el voladizo**, cuyo `(GC_p)` ya incluye las dos caras (nota 6) y cuya
presión interna sale del art. 5.7 —`GC_pi = 0` si las caras no configuran volumen interno—.
Un edificio con voladizo **no** pasa a calcular toda su cubierta con la curva del alero.

Por eso la clave del modelo es `ubicacion` (`pared` · `cubierta` · `voladizo`) y no
`sinVoladizo / conVoladizo`: con ese nombre el modelo invitaba al error, porque «¿tiene
voladizo?» es una pregunta del edificio y la respuesta correcta es del elemento. Hay una
guarda en `gcpDeFuente` y un test: ningún elemento de cubierta sobre el recinto puede leer
la curva del alero, y las Figs. 5.3-2B a 2G se niegan a dar una curva de alero que no
tienen —ahí el voladizo se arma por suma, art. 5.7—.

Los números de las dos curvas, que sí son dato y están fijados con test: en el alero las
zonas 1 y 1′ llegan más abajo que en la cubierta (0,80 y 0,31) y las zonas 2 y 3 menos
(hasta 0,30), porque su meseta final es −1,1 contra −1,4. **Eso no se lee como «el voladizo
agrava o alivia»**: son elementos distintos.

**2. Las zonas 1 y 2 del alero se cruzan, y el cruce es ruido de redondeo.** Es la única
excepción al orden de severidad `3 ≤ 2 ≤ 1 ≤ 1′` en todo el capítulo: entre `A = 9,76` y
`11,0 m²` la zona 1 queda por debajo de la zona 2, hasta **0,0063** en `A = 10 m²`. Sale de
los coeficientes tal como los imprime el comentario (`−1,7 + 0,1000 log A` contra
`−2,3 + 0,7063 log A`, iguales en `A = 9,7627`) y está un orden de magnitud por debajo del
0,1 con que el reglamento redondea sus `(GC_p)`. Queda fijado con test para que no se lo
vuelva a mirar de cero, y para que se note si algún día cambia un coeficiente.

Módulos nuevos:

| Archivo | Qué contiene |
|---|---|
| `constants/cyrCurvas.js` | Las curvas `(GC_p)` como **puntos de quiebre** `[[A, GC_p], …]`, una entrada por figura · zona · signo, con su artículo y su tabla de origen |
| `engine/cyrFiguras.js` | Selección automática de figura a partir de forma de cubierta y `θ`, con el motivo a la vista; la interpolación 27°–45° en cuatro aguas; el aviso **error** cuando la figura no está implementada |
| `engine/cyrZonas.js` | La dimensión `a`, la geometría de las zonas de pared y de cubierta y el escenario de la Fig. C 5-1 que corresponde |
| `engine/cyr.js` | El evaluador genérico de curvas, la nota 5 de parapeto, la reducción del 10 % en paredes, `p = q_h[(GC_p) − (GC_pi)]`, el mínimo de 800 N/m² y la envolvente por elemento |
| `engine/cyrElementos.js` | Área efectiva `A` por tipo de elemento, con la cuenta a la vista |
| `components/tabs/CyRTab.jsx` | La pantalla |
| `components/svg/ZonasCyR.jsx` | Planta de cubierta y elevaciones con las zonas acotadas en mm |
| `docs/verificar-cyr.md` | Tabla `zona · tramo · A · GC_p` de las Figs. 5.3-5A y 5B, ✅ verificada contra el PDF. Queda como el registro de cómo se leyeron: son las únicas curvas del alcance sin ecuación |

Tocan además `lib/exportar.js` (CSV y JSON de C&R), `lib/consolidar.js` (bloque de traza),
`lib/memoriaCapitulos.js` (capítulo «Componentes y revestimientos (Cap. 5)», después de los
del SPRFV, y el Alcance, que pasa a listar qué figuras están y cuáles no) y
`constants/inicial.js` (la lista de elementos, con su migración de esquema).

**Estructura de las curvas.** Cada curva es una lista de puntos de quiebre `[A, GC_p]` con
**interpolación lineal en `log A`** y valor constante fuera de los extremos. Un solo
evaluador para todas las figuras; la continuidad queda por construcción y no por un `if`.
Las ecuaciones de las Tablas C 5.3-1 a C 5.3-8 son rectas en `log A` entre dos cotas, así
que la conversión es exacta: el punto de quiebre es el extremo del tramo.

**Dos erratas del comentario, registradas en el código:**

- **Tabla C 5.3-2**, zona 2 con voladizo: dice `(GC_p) = −1,1 para A > 5,0 m²` y es **50,0**
  —la recta `−2,3 + 0,7063·log A` llega a `−1,100` justo en `A = 50`—.
- **Tabla C 5.3-4**, zona 3: `−1.4` con punto es `−1,4`, y coincide con
  `−3,0 + 1,600·log 10`.

**Zonas.** La Fig. 5.3-2A zonifica por `h` y no por `a`: franja de zona 2 de `0,6h` desde
el borde, zona 3 en **L de `0,6h` de largo por `0,2h` de ancho** en cada esquina, zona 1
entre `0,6h` y `1,2h`, zona 1′ en el interior. La Fig. C 5-1 da los cuatro escenarios, y se
leyeron de la figura:

| Escenario | Condición | Zonas presentes |
|---|---|---|
| a | Menor dimensión en planta **> 2,4h** | 3 · 2 · 1 · 1′ |
| b | Menor dimensión **entre 1,2h y 2,4h** | 3 · 2 · 1 (sin 1′) |
| c | Menor **< 1,2h** y mayor **> 1,2h** | 3 · 2 |
| d | Mayor dimensión en planta **< 1,2h** | 3 · 2 |

Las Figs. 5.3-2B a 2G zonifican por `a` = 10 % de la menor dimensión horizontal o `0,4h`,
la menor, pero no menos del 4 % de la menor dimensión ni de 1 m; con `θ` de 0° a 7° y menor
dimensión mayor que 90 m, `a ≤ 0,8h`. Con voladizo, la menor dimensión no lo incluye y la
distancia al borde se mide desde su borde exterior (nota 7 de la Fig. 5.3-2A).

**`h` es la altura media de cubierta, salvo `θ ≤ 10°`, donde es la altura del alero** —lo
dicen las notaciones de las Figs. 5.3-2A, 2B, 2E y 2F—.

**Nota 5 de la Fig. 5.3-2A** (parapeto de 1 m o más en todo el perímetro): los `(GC_p)`
negativos de la zona 3 se igualan a los de la zona 2, y los positivos de las zonas 2 y 3 a
los de las zonas de pared 4 y 5 de la Fig. 5.3-1. Es una casilla en la pantalla.

**Nota 5 de la Fig. 5.3-1:** con `θ ≤ 10°` los `(GC_p)` de pared se reducen un 10 %.

**Área efectiva** (art. 1.2 y su comentario): el `(GC_p)` se lee con `A`, pero la carga se
aplica sobre el **área tributaria real** (C 1.2). Se dice en la pantalla.

| Tipo | `A` |
|---|---|
| Chapa de cubierta o de pared, correa, larguero, montante LSF | `L · máx(s; L/3)` |
| Fijación de revestimiento | Área tributaria de **una** fijación, sin la regla de `L/3` |
| Puerta o ventana apoyada en tres o más lados | Área del elemento |
| Otro | A mano |

**Validación**, en este orden:

1. Las ecuaciones de las Tablas C 5.3-1 a 8 contra los puntos de quiebre, en
   `A = 0,5 · 1 · 1,5 · 2 · 5 · 10 · 20 · 30 · 50 · 100 m²`, tolerancia 0,005.
2. **Cruzada contra la Tabla 5.13-2** (960 valores transcriptos del PDF), regenerada con el
   motor de la Parte 1 y los parámetros de C 5.13, zona 1 de cubierta como interior, mínimo
   de 800 N/m², tolerancia **0,5 %**. Las excepciones se reconocen **por nombre**, nunca
   ampliando la tolerancia: la tabla no aplica la reducción del 10 % en paredes; cubierta
   zona 1 con `A = 2 m²` da entre +1,2 % y +1,5 %; paredes con `A = 5 m²` dan hasta +0,5 %
   en zona 4, entre +1,7 % y +2,3 % en zona 5 positiva y −0,3 % en zona 5 negativa; y la
   errata de `V = 42,9 m/s`, cubierta zona 2, `A = 1 m²`, donde la tabla repite el −1.468
   N/m² de la columna de 40 m/s y corresponde −1.689.
3. ✅ Los escenarios de la Fig. C 5-1 dibujados y controlados contra la figura por el
   proyectista, incluido el quinto del comentario C 5.1 que la figura no dibuja.
4. `tests/casos/cyr/`, con `esperado: null` — 📥 los carga el proyectista.

#### Las Figs. 5.3-5A y 5B, leídas midiendo la imagen

No tienen ecuación en el comentario: la única fuente es el gráfico. Se rasterizó la página
a **300 y a 600 dpi** y se midió, calibrando los ejes con las líneas de grilla. Las dos
lecturas coinciden dentro de **0,003**, el residuo de la calibración vertical es **0,005**,
y la poligonal de dos puntos reproduce el trazo en 29 áreas con un desvío máximo de
**0,02** —el ancho de la propia línea del gráfico—.

La herramienta quedó en `docs/lectura-figuras/leer-grafico.py`: una transcripción que no se
puede repetir no se puede auditar. Dos trampas que costaron una versión del script:

- **La grilla se distingue del trazo por COLOR, no por cuánta fila ocupa.** Una curva plana
  es un renglón largo de píxeles oscuros: entraba como línea de grilla y corría toda la
  calibración del eje.
- **Los renglones tapados por una curva se identifican por su ÍNDICE**, no por su posición
  en la lista. Con la lista sola, un renglón faltante corre todos los de abajo 0,2 y el
  error es invisible.

Hallazgo de la lectura: **en la 5.3-5A las curvas 3 y 2′ se cruzan** en A = 10^0,4 ≈ 2,5 m² —la 3
arranca más succionada, −1,8 contra −1,6, y termina menos, −1,2 contra −1,5—. Es lo que
dibuja la figura, y es justo donde un trazado a ojo se equivoca de curva. Queda fijado con
test.

**Verificadas por el proyectista**, con una corrección de la zonificación de la 5.3-5A: la
franja de zona 2 contra el alero **BAJO** mide **`a`, no 2a**. Medido a 240 dpi sobre la
planta de la pág. Cap. 5-177 —301 px de ancho total—: franja del alero alto 66 px y
laterales 64 y 66 (2a), cuadrados de zona 3 del alero bajo 67 × 65 (2a × 2a), franja de
zona 2 del alero bajo **33 px**. Con 2a, la zona 1 de una nave de 20 m arrancaba 2 m más
adentro de lo que dibuja la figura.

Dos cosas que aparecieron al implementar la zonificación y quedaron con test:

- **El orden de los chequeos importa en la 5.3-5A.** En la esquina del alero bajo se
  cumplen a la vez «cuadrado de zona 3» y «franja lateral de zona 2′», y la figura dibuja
  el cuadrado: si se prueba primero la franja, en una planta angosta la zona 3 no aparece
  nunca.
- **La misma distancia vale distinto en cada figura:** la franja lateral mide 2a en la 5A y
  `a` en la 5B. Por eso tanto la grilla de celdas del croquis como los puntos testigo de
  `zonasPresentes` cortan en `a`, `2a` y `4a` en los dos ejes. No es prolijidad: muestrear
  sólo por distancia al borde más cercano dejaba bandas sin visitar —una nave de 11 m con
  a = 3,5 tiene la zona 1 encerrada entre y = 3,5 e y = 4— y `zonasPresentes` se perdía una
  zona entera.

### 5.2 — Accesorios ⏳

- **Parapetos** (art. 5.6): `q_p` en el borde superior, casos A y B de la Fig. 5.6-1, los
  dos signos de `GC_pi`.
- **Voladizos** (art. 5.7): `(GC_p)` de la cubierta en la zona del voladizo más el de la
  pared adyacente para la cara inferior, ajustado al área; `GC_pi = 0` si no configuran
  volumen interno.
- **Equipos sobre cubierta** (art. 5.8): a partir del 4.5.1, que ya está implementado.

### 5.3 — Alcance mayor ⏳

- **`h > 20 m`** (Fig. 5.4-1, expr. 5.4-1): `q_z` para el `(GC_p)` positivo en paredes y
  `q_h` para el resto; excepción de `20 m < h < 30 m` con `h ≤` menor dimensión horizontal.
- **Edificios abiertos** (Figs. 5.5-1 a 5.5-3): `C_N` por rangos de área
  (`≤ a²`, `≤ 4a²`, `> 4a²`), sin y con bloqueo, `p = q_h·G·C_N`, exposición más
  desfavorable.
- **Aleros adosados** (art. 5.9): ecuaciones de las Tablas C 5.9-1 a C 5.9-4. Las C 5.9-3 y
  C 5.9-4 terminan en `A ≤ 100 m²` sin tramo final: constante más allá, como en la figura.

### 5.4 — A demanda ⏳

Cubiertas escalonadas (5.3-3) · a dos aguas múltiples (5.3-4) · diente de sierra (5.3-6) ·
cúpulas (5.3-7) · abovedadas (5.3-8) · superficie inferior de edificios elevados (5.3.2.1 y
5.4.2.1) · silos y tanques (5.10) · solados (5.12).

### Paneles solares (art. 5.11) ⛔

Siguen bloqueados: remiten al art. 4.5.3, que son once gráficos de curvas. Ver el bloque
⛔ más abajo.

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

Figs. 2.4-2 (cúpula) y 2.4-3 (abovedada) · Figs. 2.4-4 a 2.4-7 (edificios abiertos,
tratamiento por `C_N`) · mansarda. El **capítulo 5 ya está leído**: qué se implementa y en
qué etapa está en la Fase 4.

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
