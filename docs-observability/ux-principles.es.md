---
trigger: model_decision
---

# Principios de Diseño UX para el Desarrollo de Interfaces con IA

## Instrucción Principal

Al diseñar o modificar cualquier interfaz de usuario, DEBES aplicar estos principios de UX basados en evidencia. Cada decisión de diseño debe estar justificada por al menos un principio de este documento.

---

## Leyes Fundamentales de UX

### 1. Ley de Hick

**Principio:** El tiempo de decisión aumenta logarítmicamente con el número de opciones.

**Instrucciones:**

- Limita las opciones a 3-5 por grupo de decisión
- Prioriza UNA acción primaria sobre múltiples opciones secundarias
- Agrupa opciones relacionadas para reducir la carga cognitiva
- Usa revelación progresiva para funciones avanzadas

**Implementación:**

```
❌ EVITA: 7 botones al mismo nivel
✅ USA: 1 botón primario + 2 secundarios + el resto en un menú
```

---

### 2. Ley de Fitts

**Principio:** El tiempo para alcanzar un objetivo depende de su tamaño y distancia.

**Instrucciones:**

- Haz los botones importantes más grandes (mínimo 44x44px para táctil)
- Coloca los CTAs primarios cerca del contenido relevante
- Los elementos de uso frecuente deben ser fácilmente accesibles
- Aumenta el tamaño del objetivo para acciones críticas

**Implementación:**

```
❌ EVITA: Botón pequeño (24px) lejos del contenido
✅ USA: Botón grande (48px) adyacente al contenido relacionado
```

---

### 3. Ley de Miller

**Principio:** La memoria de trabajo puede retener 7±2 elementos simultáneamente.

**Instrucciones:**

- Limita listas/menús a un máximo de 5-9 elementos
- Divide la información en grupos de 3-5 elementos
- Usa categorización para listas largas
- Implementa paginación o scroll infinito para conjuntos de datos grandes

**Implementación:**

```
❌ EVITA: Lista de 15 opciones sin agrupar
✅ USA: 3 categorías con 5 opciones cada una
```

---

### 4. Patrón de Lectura en F

**Principio:** Los usuarios escanean el contenido en un patrón con forma de F (horizontal arriba, luego vertical a la izquierda).

**Instrucciones:**

- Coloca la información más importante arriba a la izquierda
- Posiciona los CTAs en la zona de alta atención (arriba)
- Alinea títulos y subtítulos a la izquierda
- Pon el contenido crítico en las primeras líneas

**Implementación:**

```
✅ Estructura óptima:
┌─────────────────────┐
│ [TÍTULO]     [CTA]  │ ← Zona caliente
│ Descripción...      │
│ • Punto 1           │ ← Escaneo vertical
│ • Punto 2           │
└─────────────────────┘
```

---

### 5. Ley de Jakob

**Principio:** Los usuarios prefieren que tu sitio funcione como todos los demás sitios que ya conocen.

**Instrucciones:**

- Usa patrones de diseño establecidos (menú hamburguesa, pestañas, tarjetas)
- Nunca reinventes controles básicos (checkboxes, dropdowns)
- Mantén las convenciones de navegación (logo arriba a la izquierda)
- Usa iconos estándar para acciones comunes (🔍 buscar, 🏠 inicio, ⚙️ ajustes)

**Implementación:**

```
❌ EVITA: Botón "X" para confirmar, "✓" para cancelar
✅ USA: "✓" confirmar, "X" cancelar (convención universal)
```

---

### 6. Ley de Proximidad (Gestalt)

**Principio:** Los elementos cercanos entre sí se perciben como relacionados.

**Instrucciones:**

- Agrupa visualmente los elementos relacionados
- Usa el espaciado para separar secciones
- Coloca las etiquetas cerca de sus inputs
- Posiciona los botones de acción cerca del contenido que afectan

**Implementación:**

```
❌ EVITA:
[Input]
[Otro Input]
[Etiqueta del primer input]

✅ USA:
[Etiqueta]
[Input]

[Otra Etiqueta]
[Otro Input]
```

---

### 7. Revelación Progresiva

**Principio:** Muestra solo la información necesaria para la tarea actual.

**Instrucciones:**

- Revela opciones avanzadas bajo demanda
- Usa asistentes/steppers para procesos complejos
- Implementa tooltips para información adicional
- Usa acordeones para contenido opcional

**Implementación:**

```
✅ Onboarding:
Paso 1: Información básica
Paso 2: Detalles (solo si es necesario)
Paso 3: Configuración avanzada (opcional)
```

---

### 8. Efecto de Posición Serial

**Principio:** Los usuarios recuerdan mejor el primer y último elemento de una lista.

**Instrucciones:**

- Coloca la información crítica al principio y al final
- Posiciona el CTA primario al final del proceso
- Muestra un resumen al inicio de formularios largos
- Proporciona confirmación al final de las transacciones

**Implementación:**

```
✅ Lista de precios:
1. Plan Básico (se recuerda)
2. Plan Estándar
3. Plan Pro
4. Plan Enterprise (se recuerda)
```

---

### 9. Ley de Parkinson

**Principio:** El trabajo se expande hasta llenar el tiempo disponible.

**Instrucciones:**

- Formularios cortos = mayor tasa de finalización
- Usa límites de tiempo en ofertas (crea urgencia)
- Muestra barras de progreso para motivar la finalización
- Marca claramente los campos opcionales

**Implementación:**

```
❌ EVITA: Formulario de 20 campos sin indicador de progreso
✅ USA: 3 pasos con 5-7 campos cada uno + barra de progreso
```

---

### 10. Principio de Consistencia

**Principio:** Los elementos similares deben verse y comportarse de forma similar.

**Instrucciones:**

- Usa el mismo estilo para todos los botones primarios
- Mantén una iconografía consistente en toda la app
- Aplica los mismos patrones de interacción (hover, clic, arrastrar)
- Usa terminología uniforme (no "Eliminar" en un lugar y "Borrar" en otro)

**Implementación:**

```
✅ Consistencia:
- Todos los botones primarios: verdes, 48px de alto, redondeados
- Todos los botones secundarios: con borde, 48px de alto
- Todos los botones de texto: sin borde, 48px de alto
```

---

## Jerarquía de la Información

### Pirámide de Prioridad Visual

```
        [CTA Primario]            ← Máxima prominencia
       /              \
   [Título]        [Imagen]       ← Alta prominencia
      |                |
[Descripción]    [Subtítulos]    ← Prominencia media
      |                |
[Detalles]      [Metadatos]      ← Baja prominencia
```

**Instrucciones:**

1. **Nivel 1:** Acción primaria (solo 1 elemento)
2. **Nivel 2:** Contexto crítico (2-3 elementos)
3. **Nivel 3:** Información de apoyo (3-5 elementos)
4. **Nivel 4:** Detalles opcionales (el resto)

---

## Patrones de Conversión

### Embudo de Conversión Óptimo

```
1. Atención    → Título + Visual impactante
2. Interés     → Descripción de beneficios
3. Deseo       → Prueba social + características
4. Acción      → CTA claro y prominente
5. Retención   → Siguientes pasos / onboarding
```

**Instrucciones:**

- Cada paso debe tener UN objetivo claro
- Elimina la fricción (campos innecesarios, pasos extra)
- Usa urgencia ética (stock limitado, ofertas con tiempo límite)
- Confirma la acción completada (feedback inmediato)

---

## Principios de Diseño de Formularios

### Diseño de Formularios de Alta Conversión

**1. Estructura:**

```
✅ Orden lógico:
- Información personal
- Información de contacto
- Preferencias
- Confirmación
```

**2. Validación:**

- Usa validación inline (en tiempo real)
- Proporciona mensajes de error específicos y accionables
- Muestra indicadores visuales claros (rojo = error, verde = éxito)
- Nunca borres los datos del usuario al validar

**3. Asistencia:**

- Mantén las etiquetas siempre visibles (no solo el placeholder)
- Añade tooltips para campos complejos
- Muestra ejemplos de formato (ej. "DD/MM/AAAA")
- Habilita el autocompletado cuando sea posible

**4. Longitud:**

```
❌ EVITA: 1 página con 30 campos
✅ USA: 3 pasos con 10 campos cada uno
✅ MEJOR: 5 pasos con 6 campos cada uno
```

---

## Microinteracciones Críticas

### Estados de los Elementos Interactivos

**Botones:**

```css
Default:   Estado normal
Hover:     Cambio sutil (color, elevación)
Active:    Feedback inmediato (presionado)
Disabled:  50% de opacidad, cursor not-allowed
Loading:   Spinner + texto "Procesando..."
Success:   Checkmark + color de éxito (temporal)
```

**Inputs:**

```css
Default:   Borde gris claro
Focus:     Borde de color primario + outline
Error:     Borde rojo + mensaje específico
Success:   Borde verde + checkmark
Disabled:  Fondo gris + cursor not-allowed
```

---

## Principios de Accesibilidad (A11y)

### Esenciales de WCAG 2.1

**Instrucciones:**

**1. Contraste de Color:**

- Texto normal: mínimo 4.5:1
- Texto grande (18pt+): mínimo 3:1
- Elementos de UI: mínimo 3:1

**2. Navegación por Teclado:**

- Todos los elementos interactivos accesibles vía Tab
- Foco visible (outline claro)
- Skip links para navegación rápida
- Documenta todos los atajos

**3. Lectores de Pantalla:**

- Texto alternativo descriptivo en imágenes
- Etiquetas en todos los inputs
- Etiquetas ARIA cuando sea necesario
- Estructura semántica (h1, h2, nav, main, etc.)

**4. Objetivos Táctiles:**

- Mínimo 44x44px para elementos táctiles
- Mínimo 8px de espaciado entre elementos
- Áreas de clic generosas

---

## Psicología del Color en UI

### Significados Culturales (Contexto Occidental)

```
🔴 Rojo:     Error, urgencia, peligro, detener
🟢 Verde:    Éxito, confirmación, seguro, continuar
🔵 Azul:     Confianza, profesional, información
🟡 Amarillo: Advertencia, atención, precaución
🟣 Morado:   Premium, lujo, creatividad
🟠 Naranja:  Acción, energía, llamada a la acción
⚫ Negro:    Elegancia, poder, sofisticación
⚪ Blanco:   Limpieza, simplicidad, espacio
```

**Instrucciones:**

- Botones destructivos: rojo
- Botones de confirmación: verde/azul
- Alertas de advertencia: amarillo/naranja
- Información neutral: azul/gris

---

## Tiempos y Animaciones

### Duraciones Óptimas

```
Micro-interacciones: 100-200ms  (hover, clic)
Transiciones:        200-400ms  (modales, dropdowns)
Animaciones:         400-600ms  (transiciones de página)
Loaders:             >1000ms    (mostrar después de 1s)
```

**Instrucciones:**

- Más rápido = sensación de mayor respuesta
- Más lento = más dramático/importante
- Usa easing natural (ease-out para entradas, ease-in para salidas)
- Nunca bloquees la UI con animaciones

---

## Estados de Carga

### Estrategias según Tiempo de Espera

```
<200ms:     Sin indicador (imperceptible)
200-1000ms: Spinner simple
1-3s:       Skeleton screens
3-10s:      Barra de progreso + mensaje
>10s:       Barra de progreso + tiempo estimado + opción de cancelar
```

**Instrucciones:**

- Skeleton screens > spinners (percepción de velocidad)
- Muestra contenido parcial mientras carga el resto
- Nunca uses un genérico "Cargando..." (sé específico)
- UI optimista: asume el éxito y revierte si falla

---

## Checklist de Validación de Diseño

Antes de proponer cualquier diseño, verifica:

### ✅ Jerarquía Visual

- [ ] ¿Hay UN elemento primario claramente dominante?
- [ ] ¿Los elementos secundarios están visualmente subordinados?
- [ ] ¿El flujo visual guía hacia el objetivo deseado?

### ✅ Accesibilidad

- [ ] ¿Contraste de color suficiente (4.5:1)?
- [ ] ¿Todos los elementos navegables por teclado?
- [ ] ¿Etiquetas descriptivas en todos los inputs?
- [ ] ¿Tamaños táctiles mínimos (44x44px)?

### ✅ Usabilidad

- [ ] ¿Menos de 7 opciones por grupo de decisión?
- [ ] ¿Patrones familiares (Ley de Jakob)?
- [ ] ¿Feedback inmediato en todas las acciones?
- [ ] ¿Estados de error claros y accionables?

### ✅ Conversión

- [ ] ¿CTA primario visible sin hacer scroll?
- [ ] ¿Formularios mínimos (solo campos necesarios)?
- [ ] ¿Progreso visible en procesos multi-paso?
- [ ] ¿Confirmación clara de acciones completadas?

### ✅ Rendimiento Percibido

- [ ] ¿Skeleton screens para cargas >1s?
- [ ] ¿UI optimista donde sea posible?
- [ ] ¿Animaciones <400ms?
- [ ] ¿Lazy loading para contenido below-the-fold?

---

## Anti-Patrones Comunes a Evitar

### ❌ Errores Frecuentes

**1. Dark Patterns (manipulación)**

- Ocultar la opción de cancelar suscripción
- Preseleccionar opciones caras
- Usar dobles negaciones ("No, no quiero ahorrar")

**2. Sobrecarga Cognitiva**

- Demasiadas opciones simultáneamente
- Formularios de 20+ campos en una página
- Información crítica enterrada en texto largo

**3. Falta de Feedback**

- Botones sin estado de carga
- Acciones sin confirmación visual
- Errores sin mensaje específico

**4. Inconsistencia**

- Botones primarios con estilos diferentes
- Terminología variable ("Eliminar" vs "Borrar")
- Patrones de navegación distintos por sección

**5. Accesibilidad Ignorada**

- Contraste insuficiente
- Elementos no navegables por teclado
- Imágenes sin texto alternativo

---

## Resumen Ejecutivo para la IA

**Al diseñar una interfaz, SIEMPRE:**

1. **Prioriza UNA acción primaria** (Ley de Hick)
2. **Coloca elementos críticos arriba a la izquierda** (Patrón F)
3. **Usa patrones familiares** (Ley de Jakob)
4. **Agrupa elementos relacionados** (Proximidad)
5. **Limita las opciones a 5-7** (Ley de Miller)
6. **Proporciona feedback inmediato** (Microinteracciones)
7. **Mantén consistencia visual** (Principio de Consistencia)
8. **Diseña para la accesibilidad** (WCAG 2.1)
9. **Optimiza para la conversión** (Embudo AIDA)
10. **Valida con el checklist** (Antes de proponer)

---

## Marco de Decisión Crítica

### Al Ubicar Elementos en una Página

**Pregunta:** ¿Los Siguientes Pasos deben ir antes o después de los botones de acción?

**Respuesta:** DESPUÉS de los botones

**Razonamiento:**

1. **Prioridad de Acción:** El usuario acaba de completar algo → acción inmediata (Vista previa) > planificación futura (Siguientes Pasos)
2. **Flujo de Decisión:** "¿Y ahora qué?" → [Botones] → "¿Qué sigue?" → [Siguientes Pasos]
3. **Evitar Parálisis por Análisis:** Leer 3 tarjetas antes de actuar = distracción del CTA primario
4. **Optimización de Conversión:** CTA primero = mayor tasa de conversión

**Estructura:**

```
✅ CORRECTO:
🚀 Celebración
📝 Título + Descripción
🔘 Botones de Acción    ← El usuario actúa de inmediato
━━━━━━━━━━━━━━━━━━━
📋 Siguientes Pasos     ← El usuario lee después de actuar
```

---

## Verdad Incómoda

Un diseño "bonito" que no convierte es un fracaso. Prioriza la usabilidad sobre la estética, pero aspira a ambas.

Cada decisión de diseño debe estar respaldada por al menos un principio de este documento. Si no puedes justificar una decisión de diseño con principios de UX, reconsidérala.

---

## Instrucciones de Aplicación

1. **Antes de diseñar:** Revisa los principios relevantes para el tipo de componente
2. **Durante el diseño:** Aplica al menos 3 principios para justificar decisiones
3. **Después del diseño:** Repasa el checklist de validación
4. **Ante la duda:** Elige la opción que siga más principios
5. **En caso de conflicto:** Prioriza accesibilidad y usabilidad sobre estética

Este documento es tu referencia constante al diseñar cualquier interfaz. Úsalo.
