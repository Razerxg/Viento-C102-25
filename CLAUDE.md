# Acción del viento sobre las construcciones — CIRSOC 102-2025

App React + Vite para calcular la acción del viento sobre edificios según el
**método direccional** del CIRSOC 102-2025, para el **sistema principal resistente a la
fuerza del viento (SRFV)**.

---

## ⚠ LO PRIMERO: LAS TABLAS DE LA NORMA NO ESTÁN EN LA MEMORIA DEL MODELO

El CIRSOC 102-**2005** es conocido. El **2025 no**: ni sus valores de tabla, ni su
numeración de artículos, ni qué cambió respecto de la edición anterior.

**Por lo tanto: no se transcribe ni un solo coeficiente sin tener el documento a la vista.**
No es una formalidad. Un `Kz` inventado da una presión plausible y un cálculo entero
equivocado, y ningún control de ingeniería lo detecta —el número "parece bien"—. Es
exactamente el modo de falla contra el que se escribió el test de los 228 espesores del
catálogo de caños en `soporte-elevado-v4`.

Reglas que siguen de ahí:

- Cada tabla transcrita lleva **test de verificación** contra los valores de la norma.
- Cada tabla declara **de qué tabla y qué página** del reglamento salió.
- Donde la norma no define un valor, el código pone `null` y la app lo dice. **No se
  interpola ni se extrapola en silencio.**
- Si un valor se leyó de un escaneo por OCR, se verifica a mano contra la imagen antes de
  entrar al repositorio.

**Indicio ya detectado sobre la filiación de la edición 2025:** el usuario menciona la
clasificación de cerramiento **«parcialmente abierto»**, que el 102-2005 no tiene y que
ASCE 7-16 sí introdujo. Eso sugiere que el 2025 sigue a ASCE 7-16 o posterior, y no al
7-98 del que venía el 2005. **Hay que verificarlo en el documento**, junto con:
si aparece el factor `Ke` de elevación, si los mapas de velocidad pasaron a ser por
categoría de riesgo, y qué cambió en las categorías de exposición.

## Entorno de trabajo — leer antes de proponer comandos

- **No hay Node ni npm en la máquina del autor.** No proponer `npm install`, `npm run dev`
  ni levantar un server local: nada de eso es ejecutable ahí.
- **El flujo es: editar código → commit → push a `main` → Vercel deploya solo.**
- **Los tests corren en GitHub Actions**, en cada push a `main` y en cada PR
  (`.github/workflows/test.yml`). Es la única forma de que se ejecuten.
- Al no poder verificar en runtime desde la máquina de desarrollo, conviene **leer bien
  imports, firmas y usos existentes antes de editar**, y avisar explícitamente qué quedó
  sin verificar.

## Alcance

### Dentro de la versión 1

| | |
|---|---|
| Norma | CIRSOC 102-2025 |
| Procedimiento | **Direccional** |
| Sistema | **SRFV** — sistema principal resistente a la fuerza del viento |
| Tipología | **Edificios**, en las cuatro clasificaciones de cerramiento: cerrado, parcialmente cerrado, parcialmente abierto y abierto |
| Salida | **Presiones por zona y por superficie** (`p` en cada pared y cada zona de cubierta, con su `Cp` y su `GCpi`) |

### Fuera de la versión 1, previsto para después

- **Elementos aislados por coeficiente de fuerza** (`Cf`): carteles, superficies exentas,
  estructuras reticuladas, recipientes cilíndricos.
- **Componentes y revestimientos (C&R)**: es otro sistema, con otras áreas tributarias y
  otros coeficientes. No confundir con el SRFV.
- **Fuerzas por nivel, cortante y momento en la base, reparto por pórtico.** No se
  implementan, pero el modelo de datos se diseña para que entren sin rehacerlo.
- **Exportación a `soporte-elevado-v4` y `bases-v-0.1`** con las hipótesis
  `Wx+ / Wx- / Wy+ / Wy-`. Ídem: el modelo de datos lo contempla, la función no se escribe
  todavía.

## Decisiones tomadas — no revertir sin conversarlo

- **`G = 0,85` por defecto, editable a mano.** No se implementa el factor de ráfaga `Gf`
  con respuesta resonante de edificios flexibles: exige frecuencia natural `n1`,
  amortiguamiento y escalas de turbulencia, datos que rara vez están a mano. Quien los
  tenga calcula `G` aparte y lo carga.
- **`Kzt = 1,0` fijo, CON AVISO.** Cubre el terreno llano, que es la mayoría de los casos.
  Lo que no puede pasar es que el 1,0 se asuma callado: la app tiene que **decir cuándo NO
  corresponde** —loma, escarpa, colina— para que la omisión sea una decisión y no un
  descuido. Un `Kzt` que debía ser 1,3 y quedó en 1,0 subestima la presión un 30 %.
- **Velocidad básica por MAPA INTERACTIVO de localidades.** Es la decisión que más empuja
  hacia lo gráfico, que es el pedido explícito del autor. Depende de que el reglamento
  traiga la tabla de localidades; si no, se digitaliza el mapa.
- **La memoria de cálculo es un entregable, no un extra.** Mismo criterio que la de
  `bases-v-0.1`: estructura de capítulos, tablas `Concepto · Símbolo · Valor · Unidad`,
  figuras numeradas y las fórmulas en LaTeX.

## Croquis — los cuatro pedidos

El costado gráfico es prioridad declarada del autor, no un adorno. Los cuatro:

1. **Perfil de `q(z)` en altura** — la presión dinámica escalonada según `Kz`, con las
   cotas de cada tramo. Es el que delata de un vistazo una exposición o una altura mal
   cargadas.
2. **Planta con zonas y presiones** — barlovento, sotavento y laterales, cada una con su
   presión y su signo, y la dirección de análisis.
3. **Elevación con las zonas de cubierta** — las franjas con sus `Cp`. Es donde más se
   equivoca uno leyendo las tablas.
4. **3D del edificio coloreado por presión** — el mejor para detectar un signo invertido
   de un golpe de vista.

## Estructura prevista

| Ruta | Contenido |
|---|---|
| `src/engine/` | cálculo puro, sin React. Es donde vive la ingeniería. |
| `src/constants/` | **las tablas de la norma**, cada una con su referencia y su test |
| `src/components/` | pestañas y croquis SVG |
| `src/context/` | estado global, autoguardado en `localStorage`, export/import JSON |
| `tests/` | vitest |
| `docs/` | memoria de cálculo |

## Estilo

- **Español**, tanto en el código como en los textos de la app.
- Los comentarios explican **por qué**, no qué hace la línea.
- Mensajes de commit descriptivos: qué cambió, qué decisión se tomó y qué se rompería si se
  revierte. Es lo que permite reconstruir el contexto en una sesión nueva.
- **Los campos de formulario son STRINGS**, no números: vienen de `<input type="number">`.
  Hay que pasarlos por `num()` antes de formatearlos o de operar.
- **`""` en un campo numérico significa «automático»** y el motor cae a un valor derivado.
  Es distinto de un cero declarado, y el resto del programa tiene que saber leer la
  diferencia.

## Pendientes conocidos

- **Falta el PDF del CIRSOC 102-2025.** Sin él no se escribe el motor: ver la advertencia
  del encabezado.
- **Confirmar la lectura del alcance.** «Estructuras abiertas y parcialmente abiertas» se
  interpretó como las **clasificaciones de cerramiento del edificio**, y no como
  estructuras reticuladas abiertas, que irían por coeficiente de fuerza y son otro motor.
  La interpretación se apoya en que los elementos aislados por `Cf` quedaron declarados
  para más adelante. **Verificar con el autor antes de escribir el modelo de datos.**
