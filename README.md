# Viento CIRSOC 102-2025

Cálculo de la acción del viento sobre edificios por el **método direccional** del CIRSOC
102-2025, para el sistema principal resistente a la fuerza del viento (SRFV).

Estado: **esqueleto**. El motor de cálculo está pendiente del documento de la norma —ver
la advertencia del encabezado de `CLAUDE.md`, que explica por qué no se transcribe ningún
coeficiente sin tenerlo a la vista.

## Desarrollo

```
npm install
npm run dev      # servidor local
npm test         # suite (vitest)
npm run build    # producción
```

Los tests corren además en GitHub Actions en cada push a `main` y en cada pull request.
