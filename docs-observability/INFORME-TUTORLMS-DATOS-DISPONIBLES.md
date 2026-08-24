# Informe: Datos disponibles en Tutor LMS para el Portal

**Fecha:** 2026-08-21
**Alcance:** análisis del código fuente abierto de Tutor LMS ([github.com/themeum/tutor](https://github.com/themeum/tutor), versión core/gratuita) comparado contra lo que el plugin puente del portal (`wordpress-plugin/desarrolla360-bridge/`) extrae hoy.
**Meta:** identificar qué información adicional de estudiantes y progreso de cursos se puede mostrar en el portal, y qué tan fácil es obtenerla.
**Limitación del análisis:** Tutor LMS Pro (la versión de paga, que es la que corre en producción) no es de código abierto. Este informe solo pudo verificar la versión gratuita/core — algunas funciones Pro (constancias, tareas/assignments) no se pudieron confirmar y se marcan explícitamente abajo.

---

## 1. Resumen ejecutivo

El plugin puente actual solo trae un **resumen agregado** por curso: porcentaje de avance general y conteo de lecciones completadas. Tutor LMS internamente guarda información mucho más detallada que hoy **no se usa**: en qué lección exacta se quedó cada empleado, cuándo la terminó, resultados de exámenes con puntaje y tiempo invertido, y la fecha real en la que alguien empezó un curso (distinta de cuándo se le dio acceso).

Ninguno de estos datos nuevos está disponible por la API REST estándar de Tutor LMS — todos requieren que el plugin puente haga una consulta directa a la base de datos de WordPress, igual que ya hace hoy para lo que sí extrae. Es decir: no es una limitación técnica nueva, es extender el mismo patrón que ya existe.

---

## 2. Lo que el portal ya extrae hoy

- Porcentaje de avance general del curso (`progress_pct`)
- Estado de finalización (`completed`)
- Estado de acceso al curso (`PENDING` / `ACTIVE` / `ERROR` / `REQUIRES_REVIEW`)
- Fecha de inicio de curso y fecha de finalización (campos cacheados)
- Enlace a la constancia (PDF), cuando existe

---

## 3. Datos nuevos disponibles

### 3.1 Progreso granular por lección

| Dato | Qué muestra en el portal | Origen | Dificultad |
|---|---|---|---|
| Fecha de finalización por lección individual | En qué lección específica se quedó atorado un empleado, y cuándo terminó cada una — no solo el % general | Consulta directa (usermeta de WordPress) | **Fácil** |
| Posición de lectura/avance de video por lección | Si el empleado realmente está viendo el contenido o solo lo marca como visto sin consumirlo | Consulta directa | Media (el formato varía según el tipo de lección) |

### 3.2 Inscripción real

| Dato | Qué muestra en el portal | Origen | Dificultad |
|---|---|---|---|
| Fecha y estado real de inscripción (pendiente / completado / cancelado) | Cuánto tiempo tarda un empleado en *empezar* un curso después de que se le asigna — hoy solo se sabe cuándo se le dio acceso, no cuándo realmente arrancó | Consulta directa (registro de inscripción de Tutor) | **Fácil** |
| Fecha de finalización de curso con registro verificable | Fecha de término más confiable que el campo cacheado actual | Consulta directa | Fácil |

### 3.3 Exámenes / quizzes

| Dato | Qué muestra en el portal | Origen | Dificultad |
|---|---|---|---|
| Resultado de cada intento de examen: puntaje, aprobado/reprobado, tiempo invertido | Evidencia real de que la capacitación se cumplió, no solo que "vio" el curso — clave para temas de cumplimiento normativo | Consulta directa (tabla de intentos de examen) | **Fácil-Media** (un JOIN) |
| Respuesta por cada pregunta del examen | Identificar en qué temas específicos falla la gente, útil para ajustar contenido de capacitación | Consulta directa | Media-Alta (más filas que modelar y guardar) |

### 3.4 Perfil del estudiante

| Dato | Qué muestra en el portal | Origen | Dificultad |
|---|---|---|---|
| Biografía / puesto de trabajo (llenado por el propio empleado en WordPress) | Enriquecer tarjetas de perfil — bajo valor salvo que se quiera ese detalle | Consulta directa | Fácil |

### 3.5 Constancias — sin novedad verificable

La generación y el registro estructurado de constancias vive en Tutor LMS Pro, cuyo código no es público. El código abierto solo trae las plantillas visuales (imágenes/SVG), no la lógica de emisión. **No hay nada nuevo que se pueda confirmar aquí** — lo que el portal ya hace (enlazar al PDF generado por WordPress) es probablemente el límite práctico sin acceso al código fuente de la versión Pro.

### 3.6 Tareas/assignments — no existen en la versión gratuita

No se encontró modelo de datos ni tabla para tareas/assignments en el código abierto de Tutor LMS. Es una función exclusiva de Pro o de un complemento aparte; no se pudo verificar desde este análisis.

---

## 4. Recomendación priorizada

Los 3 más valiosos y más fáciles de agregar primero, en este orden:

1. **Fecha de finalización por lección** — consulta trivial contra WordPress, muestra de inmediato dónde se atoró cada empleado dentro de un curso.
2. **Resultados de exámenes** (puntaje, aprobado/reprobado, tiempo por intento) — una sola consulta con JOIN, señal fuerte para verificar que la capacitación realmente se cumplió, no solo que se "vio" el curso.
3. **Fecha y estado real de inscripción** — consulta barata, resuelve la ambigüedad entre "se le dio acceso" y "realmente empezó" el curso.

Como segunda ola, con más esfuerzo de implementación: respuestas por pregunta de examen (análisis de brechas de conocimiento) y posición de video/lectura por lección (el formato de datos varía según el tipo de contenido).

Todos requieren extender el plugin puente (`wordpress-plugin/desarrolla360-bridge/`) con nuevas consultas directas a la base de datos de WordPress — no hay endpoint de la API REST estándar de Tutor LMS que ya exponga esta información.
