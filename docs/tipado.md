# Verificación de tipos

`tsc --noEmit` con `checkJs` corre el verificador de TypeScript sobre los `.js` tal como
están. **No hay migración a TypeScript ni paso de compilación nuevo**: las anotaciones van
en JSDoc y el runtime no cambia. Migrar 3.500 líneas de motor y constantes a `.ts` sería
una fase entera con riesgo de regresión sobre código ya validado contra el reglamento, y
sin ninguna ganancia normativa.

## Alcance actual

```
src/engine/**    src/constants/**    src/lib/**
```

Es el **núcleo de cálculo y sus tablas**, que es donde un error de tipos se transforma en
un número equivocado. Hoy da **cero errores**.

## Por qué no está encendido en todo el repositorio

Encenderlo sobre `src/components/**` y `tests/**` da **461 errores**, casi todos de dos
clases que no son defectos:

- Arrays de tuplas heterogéneas de las tablas de la norma —`["clave", "rótulo", 0.85, null]`—
  que TypeScript infiere como `(string|number|null)[]` y después se queja de operar con
  ellos. Se arregla anotando cada tabla, que es trabajo real y vale la pena, pero es su
  propia tarea.
- Uniones inferidas de funciones que devuelven formas distintas según una rama, como
  `factorRafaga`. Se arregla declarando el tipo de retorno.

Encenderlo y suprimir 461 errores con `@ts-ignore` sería teatro: quedaría un verificador
que no verifica nada y un CI en verde que no significa nada. **El alcance se amplía
directorio por directorio, arreglando de verdad**, y cada ampliación se registra acá.

## Cómo se comprobó que verifica

No por lectura de la configuración: se introdujo a propósito un acceso a una propiedad
inexistente en `engine/presionDinamica.js`, `tsc` lo reportó como `TS2339`, y se revirtió.

## Convención de nombres con unidad

En el motor, **todo símbolo con riesgo de mezcla de unidades lleva sufijo**: `z_m`,
`q_Nm2`, `V_ms`, `H_m`, `Lh_m`. El motor trabaja en **N, m, N/m²** —las unidades en que el
reglamento escribe sus expresiones— y la conversión a las unidades de salida ocurre en un
único módulo del borde.

La convención se aplica a los módulos nuevos y a los que se reescriben; el resto se
renombra en su propia tarea, no de a uno suelto.

## Dónde corre

| | |
|---|---|
| `npm run typecheck` | a mano |
| `npm run build` | antes de los tests y del bundle |
| Vercel | mismo `buildCommand`, así que un error de tipos frena el deploy |
| GitHub Actions | paso propio, antes de `npm test` |
