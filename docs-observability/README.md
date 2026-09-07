# Informes de rendimiento y observabilidad

Análisis, mediciones y planes relacionados con escalar el portal de MVP a ~100,000 usuarios tomando cursos. Cada informe indica su fecha; léelos como una fotografía del sistema en ese momento, no como estado actual garantizado — el código pudo cambiar desde entonces.

| Archivo | Contenido |
| --- | --- |
| [`INFORME-RENDIMIENTO.md`](INFORME-RENDIMIENTO.md) | Análisis de código de las rutas críticas + mediciones reales; plan de fases con hallazgos numerados (G-1, G-2, …) |
| [`INFORME-CAPACIDAD.md`](INFORME-CAPACIDAD.md) | Cuántos usuarios soporta el portal por fase de infraestructura |
| [`INFORME-LOADTEST-BASELINE.md`](INFORME-LOADTEST-BASELINE.md) | Resultados medidos con la suite de [`load-testing/`](../load-testing/README.md) antes de optimizar |
| [`INFORME-FINANCIERO.md`](INFORME-FINANCIERO.md) | Costo de infraestructura en USD/mes por fase de capacidad |
| [`PLAN-COLA-ASIGNACIONES.md`](PLAN-COLA-ASIGNACIONES.md) | Mover la asignación de cursos a trabajo en segundo plano: qué existe hoy en la tabla `jobs`, qué falta, tres alternativas en Vercel y Supabase, y la opción recomendada |
| [`ANALISIS-PLUGIN-TUTOR.md`](ANALISIS-PLUGIN-TUTOR.md) | Revisión del plugin puente con Tutor LMS: qué está bien resuelto, ocho hallazgos ordenados por impacto, plan de mejora y alternativas de mercado para sincronizar |
| [`HANDOFF.md`](HANDOFF.md) | Resumen de hand-off del sistema: qué es, cómo está armado, qué falta |
| [`ux-principles.md`](ux-principles.md) / [`ux-principles.es.md`](ux-principles.es.md) | Principios de diseño UX usados como guía al construir interfaces con asistencia de IA |
