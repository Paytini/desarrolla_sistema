# Informe de Capacidad — ¿Cuántos usuarios soporta el portal?

**Fecha:** 2026-08-01
**Base:** hallazgos y plan de fases de [INFORME-RENDIMIENTO.md](INFORME-RENDIMIENTO.md).
**Meta de negocio:** 100,000 usuarios registrados tomando cursos.
**Portal:** https://empresas.desarrolla360.com (interno: https://desarrolla-sistema.vercel.app)

> ⚠️ Estas son **estimaciones de orden de magnitud** derivadas del análisis de código y de las mediciones de latencia, no de una prueba de carga real. Antes de cada fase conviene validar con una prueba k6/artillery contra un entorno de staging (sección 6).

---

## 1. Conceptos y supuestos

**Usuarios registrados ≠ usuarios concurrentes.** En plataformas de e-learning corporativo, la concurrencia pico típica es **2–10% de los registrados** (pico realista: lunes 8–10 AM). Para 100k registrados hay que dimensionar para **~5,000–10,000 concurrentes** en pico.

Supuestos de la estimación:

| Variable | Valor asumido |
|---|---|
| Plan Vercel | Pro (timeout configurable hasta 800 s, escalado automático de funciones) |
| Supabase | Plan Pro o superior; pooler Supavisor ~500–1,000 clientes máx |
| Comportamiento de un usuario navegando | 1 page view cada 10–20 s mientras está activo |
| WordPress/Tutor LMS | responde el bridge en ~300 ms caliente, 6+ s frío (medido) |
| Streaming de video | **no cuenta contra el portal** — lo sirve WordPress directamente (verificado con Playwright) |

**Dónde muere primero la app (en orden, según el análisis):**
1. Conexiones a Postgres (pool sin límite × lambdas concurrentes) — G-3.
2. Invalidación de caché global cada 15 s → la query unbounded del superadmin se re-ejecuta sin parar — G-4.
3. Amplificación del polling: 4 POST/min por pestaña de empleado abierta — G-4.
4. CPU de bcrypt en bursts de login — A-1.
5. WordPress PHP (el bridge) como dependencia lenta sin timeout — G-1.

---

## 2. Capacidad actual (Fase 0 — hoy, sin cambios)

### Navegación (empleados viendo sus cursos/constancias)

Cada pestaña abierta genera 4 POST/min (polling) + page views. A X pestañas concurrentes:
- ~X/15 requests/s de polling + ~X/15 de navegación ≈ **X/7.5 req/s** al portal.
- Cada request ≈ 3–6 queries; lambdas concurrentes ≈ req/s × latencia (~0.4 s) → conexiones ≈ lambdas × hasta 10.

Con el pooler saturándose alrededor de ~500–600 conexiones cliente y el margen para bursts:

| Métrica | Límite estimado hoy |
|---|---|
| **Empleados navegando simultáneamente** | **~300–600** sin degradación seria |
| Bursts de login (inicio de jornada) | ~5–10 logins/s; por encima, riesgo de `max clients reached` en cascada |
| Usuarios registrados operables en la práctica | ~10,000–30,000 (con picos del 2–5%) |

### Operaciones administrativas (límites duros, fallan hoy)

| Operación | Límite actual | Causa |
|---|---|---|
| Sincronizar paquete a empleados | **~30–40 empleados** por operación | 3 llamadas WP secuenciales/empleado, sin `maxDuration` (G-2) |
| Import CSV | **~50–100 filas** confiables (el límite de 200 puede exceder timeout) | 250–400 ms de bcrypt por fila (A-2) |
| ZIP de constancias | **~50–150 constancias** | memoria + generación serial (G-5) |
| Webhooks entrantes | ~5–10/s sostenidos | fila caliente en `integracion_estados` + SES inline (A-5) |

### El otro techo: WordPress

El bridge en frío tarda 6+ s (medido). Todo enrolamiento y sync pasa por ese PHP. Aunque el portal escale, **Tutor LMS es el segundo sistema a dimensionar** (no analizado desde dentro en este informe; ver acciones 16–18 del plan).

---

## 3. Capacidad tras Fase 1 (quick wins, ≈1 semana)

Cambios: timeouts al bridge, pool `pg` con `max: 3` + singleton en prod, poll de empleado a 60 s sin invalidación global, bcrypt nativo, índices, `regions`/`maxDuration`.

Efectos directos:
- Conexiones por lambda: 10 → 3 (techo de lambdas concurrentes ×3.3).
- Tráfico de polling: ÷4; la caché superadmin por fin vive sus 45–90 s.
- Login: ~1–2 s → **<500 ms**; CPU por login ÷10 → bursts de 30–50 logins/s.
- Un WP colgado ya no acumula lambdas zombis (timeout 15 s).

| Métrica | Fase 0 | **Fase 1** |
|---|---|---|
| Empleados navegando simultáneamente | 300–600 | **~1,500–3,000** |
| Bursts de login | 5–10/s | **30–50/s** |
| Usuarios registrados operables | 10–30k | **~50,000** (picos 3–5%) |
| Sync de paquete | 30–40 empleados | ~100–200 (solo por timeout ampliado; sigue secuencial) |

---

## 4. Capacidad tras Fase 2 (estructural, ≈1 mes)

Cambios: tabla `jobs` + cron (enrolamiento e import como trabajos en background), DC-3 almacenado en Blob, KPIs en SQL con índices, `email_outbox`, webhook idempotente con SES diferido, cachés de status/branding.

Efectos directos:
- Las operaciones admin dejan de tener límite por request — se procesan en chunks de fondo. **Onboarding de 10,000 empleados pasa de imposible a un job de ~1–2 h.**
- Dashboards: de "serializar 500k filas" a counts indexados en milisegundos → el costo por page view de superadmin/RH cae ~10–100×.
- Descarga de constancia: de ~500 ms de CPU a un redirect al Blob (~0 costo de cómputo).
- Webhooks: respuesta <100 ms, sostenibles ~50/s.

| Métrica | Fase 1 | **Fase 2** |
|---|---|---|
| Empleados navegando simultáneamente | 1,500–3,000 | **~8,000–15,000** |
| Usuarios registrados operables | ~50k | **100,000** (picos del 5–8% dentro del margen) |
| Sync de paquete / import | 100–200 por request | **ilimitado** (job en chunks) |
| ZIP constancias | 50–150 | miles (streaming desde Blob) |
| Webhooks | 5–10/s | ~50/s |

**Con Fase 2 completa, la meta de 100k usuarios registrados es alcanzable del lado del portal.** El riesgo restante se traslada a WordPress.

---

## 5. Fase 3 — consolidar 100k (WordPress + batch)

Cambios: endpoints batch en el plugin (enroll de N empleados en 1 llamada; webhooks agrupados), onboarding sin password, Cloudflare + Redis object cache delante de WordPress, tabla de resumen para dashboards si hace falta.

- Enrolar 10,000 empleados: de ~30,000 llamadas HTTP a ~200 llamadas batch → el job pasa de horas a minutos.
- Los picos de webhooks (curso masivo completado) se agrupan 50×.
- WordPress deja de ser el eslabón frágil para catálogo y media (CDN).

| Métrica | **Fase 3 (objetivo final)** |
|---|---|
| Usuarios registrados | **100,000+ cómodos** |
| Concurrencia pico sostenible | ~10,000–15,000 navegando |
| Onboarding de un cliente de 10k empleados | mismo día |

---

## 6. Cómo validar (antes de confiar en estos números)

1. **Staging** con datos sintéticos: 100 empresas × 1,000 empleados × 5 cursos (script de seed).
2. **k6 o artillery** con 3 escenarios: (a) rampa de logins 0→50/s; (b) 2,000 usuarios virtuales navegando páginas de empleado con polling; (c) ráfaga de 500 webhooks firmados.
3. Métricas a observar: `pg_stat_activity` (conexiones), p95 de respuesta en Vercel Analytics, errores 5xx, duración de funciones, y en Supabase el uso del pooler.
4. Repetir la prueba al cerrar cada fase — los números de este informe son hipótesis a confirmar, y la prueba dirá cuál es el siguiente cuello real.

---

## 7. Resumen en una tabla

| | Hoy (F0) | F1 (~1 sem) | F2 (~1 mes) | F3 (~2 meses) |
|---|---|---|---|---|
| Concurrentes navegando | 300–600 | 1,500–3,000 | 8,000–15,000 | 10,000–15,000 |
| Registrados operables | 10–30k | ~50k | **100k** | 100k+ |
| Logins/s en burst | 5–10 | 30–50 | 50+ | 50+ |
| Enrolar 10k empleados | ❌ imposible | ❌ | ✅ ~1–2 h | ✅ minutos |
| Riesgo dominante | conexiones DB | queries dashboard | WordPress | — |
