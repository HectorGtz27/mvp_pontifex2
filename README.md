# Pontifex — Mockup de evaluación crediticia

Mockup con **flujo completo** que resuelve los 3 problemas principales del reto de Financiación del Desarrollo Sostenible:

1. **Datos confiables desde documentos** — Carga, extracción y validación de PDFs.
2. **Decisiones humanas consistentes** — Score A/B/C/D, KPIs, recomendación del sistema y acción del analista.
3. **Monitoreo post-desembolso** — Covenants y triggers con alertas y bloqueos automáticos.

## Flujo completo (una sola pantalla)

En la ruta `/` se muestra un **flujo único** con tres pasos y un stepper en la parte superior:

1. **Documentos** — Checklist de documentos por solicitud, simulación de subida de PDF y resultado de extracción/validación. Al terminar, "Documentos listos → Ir a evaluación".
2. **Evaluación y decisión** — Resumen de la solicitud, KPIs calculados, score (A/B/C/D), recomendación del sistema y botones para que el analista Aprobar / Aprobar con ajustes / Rechazar. Solo si aprueba (o aprueba con ajustes) se habilita continuar.
3. **Monitoreo de covenants** — Cartera de créditos con estado de cada covenant (DSCR, Deuda/EBIT, capital de trabajo, mora) y alertas. El crédito recién aprobado en el paso 2 aparece aquí como "Recién desembolsado".

- **Reiniciar flujo** (arriba) vuelve al paso 1 y limpia el estado.
- Se puede saltar entre pasos ya desbloqueados usando el stepper.

## Tecnologías

- **React 18** + **Vite** — Frontend
- **Tailwind CSS** — Estilos
- **React Router** — Navegación
- Datos **mock** en `src/data/mock.js` (sin backend)

## Cómo correr

```bash
npm install
npm run dev
```

Abre en el navegador la URL que indique Vite (por ejemplo `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview   # previsualizar build
```
