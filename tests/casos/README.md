# Casos de regresión

Cada archivo `.json` de un subdirectorio de acá es un **caso resuelto a mano** contra el
que la app se verifica en cada `npm test`, y por lo tanto en cada deploy.

**Los valores esperados los carga el proyectista, no el motor.** Un valor esperado
generado por el mismo código que se quiere verificar no verifica nada: congela el
comportamiento actual, incluido el error. Por eso los `esperado` arrancan en `null`, el
runner los reporta como `todo` —quedan a la vista en la salida de la suite, sin romperla—
y recién cuentan como verificación cuando tienen un número puesto a mano.

## Tolerancia

**Relativa del 0,5 %**, salvo que el caso declare otra en `tolerancia_rel`. Para valores
esperados de cero se usa una absoluta de `1e-9`, porque la relativa no está definida ahí.

## Esquema

Un archivo de casos es un array. Cada elemento:

```jsonc
{
  "id": "escarpa_sotavento",        // único dentro del archivo; sale en el nombre del test
  "descripcion": "…",               // opcional, para el que lee la salida
  "entrada": { … },                 // lo que recibe la función bajo prueba
  "esperado": { "Kzt": 1.53, … },   // null = todavía no cargado → test.todo
  "tolerancia_rel": 0.005,          // opcional, por caso
  "fuente": "calculado a mano, 2026-09-26"   // opcional pero recomendado
}
```

Un archivo de **parámetros de tabla** —como `kzt/figura_1_8_1.json`— no es un array sino
un objeto, y no lo consume el runner de casos sino el test de la tabla correspondiente.
Lleva `fuente` y `transcripcion_verificada_por`, que queda vacío hasta que alguien
controla la transcripción contra el PDF y firma.

## Cómo se agrega un caso

1. Resolver el caso a mano, con el reglamento a la vista.
2. Agregarlo al `.json` que corresponda, con los `esperado` completos y la `fuente`.
3. `npm test`. Si el caso pasa de `todo` a verde, quedó verificado; si sale en rojo,
   discrepan la app y el cálculo a mano, y hay que resolver cuál de los dos está mal
   **antes** de tocar la tolerancia.

## Directorios

| Ruta | Qué verifica | Runner |
|---|---|---|
| `kzt/` | Factor topográfico, art. 1.8 | `tests/kzt.test.js` |
