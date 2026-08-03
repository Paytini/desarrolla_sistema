# Informe de Rendimiento — Portal Empresarial Desarrolla360

**Fecha:** 2026-08-01
**Alcance:** análisis de código de las rutas críticas (login, registro de empleados, enrolamiento, certificados DC-3, sincronización con Tutor LMS, dashboards) + mediciones reales del portal y de los sitios WordPress con Playwright y curl.
**Meta:** escalar de MVP funcional a empresa mediana (~100,000 usuarios tomando cursos).

**URLs del sistema:**
- Portal en producción: **https://empresas.desarrolla360.com** (login: `/login`)
- Despliegue interno Vercel: https://desarrolla-sistema.vercel.app
- WordPress / Tutor LMS (beta): https://betatutorlms.desarrolla360.com
- Sitio público WordPress: https://desarrolla360.com

Informe complementario: [INFORME-CAPACIDAD.md](INFORME-CAPACIDAD.md) — estimación de carga soportada por fase.

---

## 1. Resumen ejecutivo

> **Estado de validación (2026-08-02).** Los hallazgos de este informe se sometieron después a pruebas de carga reales ([INFORME-LOADTEST-BASELINE.md](INFORME-LOADTEST-BASELINE.md)). Resultado: **G-1, G-2, G-3, A-1, A-3 confirmados con medición**; **G-4 refutado** y rebajado a Media (ver su sección); **G-5 confirmado en dirección** pero sin llegar al caso catastrófico. Las secciones corregidas están marcadas.

El MVP tiene una arquitectura de base **correcta** (espejo local de datos académicos, JWT sin estado, streaming de cursos delegado a Tutor LMS), pero hay **4 hallazgos graves** que hoy limitan la app y hacen fallar operaciones administrativas medianas (sincronizar un paquete a 40+ empleados, importar CSV de 200 filas, descargar ZIP de constancias de una empresa grande):

1. **Ninguna llamada HTTP a WordPress tiene timeout** — un WP lento congela la petición del usuario hasta que Vercel mata la función. ✅ *Confirmado: bajo carga, las llamadas salientes fallaron masivamente.*
2. **Enrolamiento masivo secuencial**: 3 llamadas HTTP a WP *por empleado*, una tras otra, sin `maxDuration`. ✅ *Confirmado y peor de lo estimado: **144 s de media** para 40 empleados.*
3. **Pool de conexiones a Supabase sin límites reales** — `connection_limit=1` en la URL es ignorado por el adapter `pg`; cada lambda abre hasta 10 conexiones y en producción ni siquiera se reutiliza el singleton. ✅ *Confirmado: conexiones acumulándose de 12 a 20 sin liberarse, y error `EAUTHTIMEOUT / 08006` en el log. La instancia tiene `max_connections = 60`.*
4. **Ruta ZIP de constancias**: genera N PDFs en serie, sin tope, todo en memoria. ⚠️ *Confirmado en dirección (~500 ms por PDF, sin paralelismo), no se reprodujo el OOM por falta de datos a escala.*

~~5. La caché del dashboard superadmin se destruye cada 15 segundos por el polling.~~ **Refutado por medición** — ver G-4.

Nada de esto requiere romper el monolito. Las soluciones recomendadas son cambios dentro de la misma app Next.js + configuración de Vercel (crons, `after()`, tabla de jobs), más un endpoint batch en el plugin de WordPress.

---

## 2. Lo que está bien hecho (conservar)

| Aspecto | Evidencia | Por qué importa |
|---|---|---|
| **Streaming de cursos delegado a Tutor LMS** | Playwright: el video de la portada (7.2 MB) lo sirve directamente `betatutorlms.desarrolla360.com`; el portal nunca proxya media | Confirmado: el contenido pesado (video de cursos) **no pasa por Vercel ni por la DB del portal**. Es la decisión que más protege la escalabilidad. Mantenerla. |
| **Espejo local de datos académicos** | `empleado_cursos`, `constancias` con `ultima_sincronizacion` | Las páginas leen Postgres local, no WordPress en caliente. Sin esto, cada page view dependería de la latencia de WP. |
| **Sesión JWT sin estado** | `auth.ts:22`, callbacks sin queries ([auth.ts:23-42](../auth.ts#L23-L42)) | El middleware (`proxy.ts`) no toca la DB en ninguna navegación. Cero costo de sesión por request. |
| **Caché con tags en dashboards** | `lib/dashboard-cache.ts` (7 snapshots con `unstable_cache` + tags de `lib/cache-tags.ts`) | La infraestructura de invalidación por tags ya existe — solo hay que afinar granularidad (ver H-4). |
| **Inserciones batch donde cuenta** | CSV: `createMany` + checks con `email: { in: [...] }` ([employees/actions.ts:622-738](<../app/(portal)/company/[slug]/employees/actions.ts#L622>)) | Sin N+1 en la escritura DB del import. |
| **Llamadas a WP fuera de transacciones DB** | `course-sync.ts` | Un WP lento no mantiene transacciones Postgres abiertas. |
| **Webhook con HMAC + ventana de frescura** | [tutor-learning/route.ts:40-61](../app/api/internal/webhooks/tutor-learning/route.ts#L40) | Seguridad correcta en el canal de sync entrante. |
| **`after()` ya en uso** | `lib/employee-learning.ts:451-472` | El patrón de trabajo post-respuesta ya está adoptado; es la base para diferir emails y syncs (ver plan). |
| **Buffers binarios en el pipeline PDF** | `lib/dc3-pdf.ts` usa `Buffer`/`Uint8Array`, nunca base64 | Evita el 33% de sobrecosto de memoria de base64. |
| **`react.cache` en sesión y branding** | `lib/session.ts:4`, `lib/company-branding.ts:7` | Deduplicación intra-request correcta (aunque hay bypass, ver M-3). |

---

## 3. Mediciones reales (Playwright + curl, 2026-08-01)

| Sitio | TTFB | Carga completa | Peso | Notas |
|---|---|---|---|---|
| **`empresas.desarrolla360.com/login` (el portal)** | **0.15–0.17 s** (constante, 3 muestras; igual vía `desarrolla-sistema.vercel.app`) | — | 15 KB el documento | El shell de login responde rápido y estable desde el edge de Vercel. Los cuellos de este informe están en las rutas autenticadas (queries, bridge, bcrypt), no en la entrega estática. |
| `desarrolla360.com` | **1.1–1.4 s** (constante, 3 muestras) | 3.0 s (FCP 1.9 s) | ~1.9–2.5 MB, 108 recursos | TTFB alto y estable ⇒ **no hay caché de página completa / CDN** delante de WordPress. 30 hojas de estilo + 40 scripts. |
| `betatutorlms.desarrolla360.com` | **0.3 s caliente / 6.5–7.6 s frío** | 7.7 s en frío | ~8 MB (7.2 MB es el video, servido por WP — ver "lo que está bien") | La variación 0.3 s ↔ 7.6 s indica caché de página que expira; cuando expira, PHP tarda ~6+ s en generar. Ese mismo servidor PHP atiende las llamadas del bridge. |
| `betatutorlms/wp-json/` | 0.14–7.6 s | — | **2 MB** el índice | El índice REST completo está expuesto y pesa 2 MB; síntoma de muchos plugins registrando rutas. |

**Implicación clave:** toda la integración (enroll, sync, upsert de empleados) depende de ese PHP que en frío tarda 6+ s. Cualquier estrategia de escala necesita (a) timeouts del lado del portal y (b) caché de objetos/página + CDN del lado de WordPress.

---

## 4. Hallazgos por severidad

Escala: 🔴 **Grave** (rompe operaciones hoy o tumba el servicio bajo carga) · 🟠 **Alta** (limita capacidad de forma directa) · 🟡 **Media** (fricción/costo, no tumba) · 🟢 **Baja** (limpieza).

---

### 🔴 G-1. Llamadas HTTP a WordPress sin timeout ni reintentos

**Evidencia:** [lib/wordpress-bridge.ts:292-322](../lib/wordpress-bridge.ts#L292) — `fetch` sin `AbortSignal`; igual en [lib/tutorlms-api.ts:59](../lib/tutorlms-api.ts#L59). Grep repo completo: **cero** ocurrencias de `AbortSignal`, `AbortController` o retry/backoff.

**Impacto:** el bridge está en el camino crítico de crear empleado, asignar cursos, borrar empleado (que además **bloquea el borrado** si WP no responde — `lib/access-control.ts:54-64`), sync batch y webhook. Con el TTFB de 6.5 s en frío medido arriba, una petición de usuario puede colgarse minutos (undici no tiene timeout de request por defecto) hasta que Vercel mata la función. Bajo carga, las lambdas colgadas se acumulan y agotan concurrencia + conexiones DB.

**Soluciones (elegir 1; ordenadas por preferencia monolítica):**
1. **(Recomendada)** En `bridgeRequest`: `signal: AbortSignal.timeout(15_000)` + 1 reintento con backoff (500 ms → 2 s) solo para métodos idempotentes (GET, upsert). ~20 líneas, cero infra nueva.
2. Lo anterior + **circuit breaker** persistido en `integracion_estados`: tras 5 fallos consecutivos, marcar el bridge "caído" 60 s y degradar rápido (las acciones ya degradan bien: `empleado_creado_bridge_error`). Evita tormentas de timeouts.
3. Mover toda llamada al bridge a una cola gestionada (QStash/Inngest). Más robusto pero rompe la preferencia monolítica; dejar para Fase 3 si hace falta.

---

### 🔴 G-2. Enrolamiento masivo: 3N llamadas HTTP secuenciales, sin `maxDuration`

**Evidencia:** [lib/course-sync.ts:170-192](../lib/course-sync.ts#L170) — `for` secuencial sobre **todos** los empleados activos (sin `take`); por empleado: `bridgeEnrollCourses` + `bridgeEnsureStudentAccess` + `bridgeGetStudentCourses`, en serie. El plugin además itera cursos del lado WP con timeouts internos de 12–20 s (`desarrolla360-bridge.php:2155`, `:2423`). No existe `maxDuration` ni bloque `functions` en `vercel.json`.

**Impacto:** 50 empleados × 3 llamadas × ~1 s = **150 s** en una sola server action → Vercel la mata mucho antes → estado mitad-sincronizado (el catch por-empleado marca `ERROR`, pero los empleados después del corte quedan `PENDING` sin intento). Es la operación que un cliente mediano ejecuta el primer día.

**Soluciones:**
1. **(Recomendada — patrón job monolítico)** Convertir en job asíncrono: la action inserta un registro en una tabla `jobs` (o en `integracion_estados`) y responde de inmediato; un **Vercel Cron cada minuto** (ya usan crons) procesa chunks de ~20 empleados con concurrencia 5 (`mapWithConcurrency` ya existe en el codebase) y `maxDuration: 300`. La UI de reports ya muestra estados `PENDING/ERROR` — solo hay que leerlos.
2. **Endpoint batch en el plugin**: un solo `POST /enrollments/company-batch` que reciba N empleados × C cursos y haga el loop en PHP (allí los timeouts internos ya existen). Reduce 3N round-trips a ⌈N/50⌉. Combina bien con la opción 1.
3. Paralelizar en la misma action con `Promise.allSettled` en chunks de 5 + `export const maxDuration = 300`. Arreglo mínimo (una tarde), aguanta hasta ~200 empleados; insuficiente para 1,000+.

---

### 🔴 G-3. Pool de Postgres sin configurar; `connection_limit=1` ignorado; singleton solo en dev

**Evidencia:** [lib/prisma.ts:11-15](../lib/prisma.ts#L11) — `new Pool({ connectionString })` sin `max`, `idleTimeoutMillis` ni `connectionTimeoutMillis`. `connection_limit=1&pgbouncer=true` en `DATABASE_URL` son parámetros **de Prisma-URL** que `pg-connection-string` no entiende — **no tienen ningún efecto** con el driver adapter. Además [lib/prisma.ts:81-84](../lib/prisma.ts#L81): el singleton `globalThis` solo se asigna cuando `NODE_ENV !== "production"`, y `proxy.ts → auth.ts → lib/prisma.ts` construye un pool **dentro del bundle del proxy que nunca lo usa**.

**Impacto:** cada instancia lambda puede abrir hasta 10 conexiones (default de `pg`). Con 60 lambdas concurrentes (un pico de logins de inicio de jornada) son ~600 conexiones cliente contra el pooler de Supabase → `max clients reached` → **errores 500 en cascada justo en el momento de más tráfico**. Este es el techo duro de escala actual.

**Soluciones:**
1. **(Recomendada)** Configurar el pool: `max: 3, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000`; asignar el singleton `globalThis` **también en producción**; sacar el import de Prisma del camino del proxy (el proxy solo necesita `auth` sin adapter — separar la config de NextAuth en `auth.config.ts` sin Prisma, patrón estándar de NextAuth v5 para edge/proxy).
2. Lo anterior + subir el límite de clientes de Supavisor en Supabase (plan Pro lo permite) y monitorear `pg_stat_activity`.
3. Prisma Accelerate (pooling gestionado + caché). Costo extra; solo si la opción 1 se queda corta más allá de 10k concurrentes.

---

### 🟡 G-4. Polling de empleados — ~~invalida la caché global del superadmin~~ **CORREGIDO: refutado por medición**

> ⚠️ **Corrección del 2026-08-02.** Este hallazgo se publicó como 🔴 Grave. La prueba de carga [`32-cache-invalidation-storm`](../load-testing/artillery/32-cache-invalidation-storm.yml) lo **refutó** y se rebaja a 🟡 Media. Se deja el texto corregido en vez de borrarlo para que quede el registro.

**Lo que se afirmó:** que cada poll de empleado destruía la caché de los 5 dashboards de superadmin, obligando a re-ejecutar la query más pesada de la app cada 15 s.

**Por qué era incorrecto:** la llamada es `revalidateTag(SUPERADMIN_GLOBAL_TAG, **"max"**)` ([refresh/route.ts:60](../app/api/employee/learning/refresh/route.ts#L60)). En Next.js 16 ese segundo argumento cambia por completo el mecanismo: con un perfil (`"max"`) el tag se marca **stale** y se sirve con *stale-while-revalidate* — el contenido viejo sale de inmediato y la actualización ocurre en segundo plano. Solo **sin** el segundo argumento (forma ya deprecada) se produce la expiración inmediata y el fallo de caché bloqueante que yo asumí. Verificado en la documentación oficial de Next.js y en el código fuente de `revalidate.ts`.

**Medición que lo confirma:** dos corridas completas con 60 empleados haciendo poll al intervalo real de 15 s, contra una corrida de control sin ningún poller. **Delta en la latencia de las páginas de superadmin: ~0 ms.** El `git blame` confirma que el argumento `"max"` está en el código desde mayo de 2026, o sea antes de esta auditoría.

**Lo que sí queda en pie (por eso Media y no Baja):**
- El **volumen de polling** es real y desperdiciado: cada pestaña de empleado abierta genera 4 POST/min, cada uno con sus queries de cooldown y su recálculo. Con 10,000 pestañas son 40,000 POST/min que no aportan nada mientras no haya cambios.
- El **recálculo en segundo plano** de la query sin `take` sigue costando CPU y base de datos; simplemente no bloquea al usuario que pide la página. No se midió su costo — haría falta instrumentación del lado de la base de datos.

**Soluciones (revisadas a la baja):**
1. **(Recomendada)** Subir el poll a 60 s + jitter y pausarlo con la pestaña oculta (ya detectan visibilidad). Reduce el tráfico inútil ÷4 sin tocar el mecanismo de caché.
2. Refresco dirigido por webhook en vez de polling: el webhook de Tutor ya avisa cuándo cambió algo; el cliente solo consulta cuando `latestSyncAt` cambia (endpoint ligero con ETag).
3. Acotar la query de [dashboard-cache.ts:18-54](../lib/dashboard-cache.ts#L18) (ver A-4) para que el recálculo en segundo plano sea barato. Es la solución de fondo.

---

### 🔴 G-5. ZIP de constancias: N PDFs en serie, sin tope, todo en memoria

**Evidencia:** [app/api/certificates/zip/route.ts:42-75](../app/api/certificates/zip/route.ts#L42) — query sin `take` (todas las constancias de todos los empleados activos de la empresa), loop **serial** de `generateDc3Pdf()` (cada uno: 3 queries + lectura de template en disco + parse pdf-lib + 2 pasadas de sharp + fetch al Blob de la firma), todos los PDFs retenidos en JSZip y materializados con `generateAsync` antes de responder. Sin `maxDuration`.

**Impacto:** empresa con 500 constancias ≈ 500 × (~300–800 ms + varios MB) → timeout y/o OOM de la función. Falla justo para los clientes grandes que son la meta.

**Soluciones:**
1. **(Recomendada)** Combinar con la solución de A-3 (PDF almacenado en Blob): el ZIP pasa a ser "descargar N archivos ya generados del Blob y empaquetar en streaming" (`archiver` en modo stream, en vez de JSZip en memoria) + `maxDuration: 300` + tope de N con paginación (ej. por rango de fechas).
2. Job asíncrono (misma tabla `jobs` de G-2): generar el ZIP en background, subirlo a Blob, notificar al RH con el link (patrón "tu descarga está lista").
3. Tope duro inmediato (`take: 100` + mensaje) mientras llega 1 o 2 — parche de un día que elimina el riesgo de OOM.

---

### 🟠 A-1. Login: ~1–2 s por diseño; bcryptjs puro JS es el mayor término

**Evidencia:** secuencia estrictamente serial en [auth.ts:55-113](../auth.ts#L55): Turnstile (HTTPS externo, sin timeout) → `user.findUnique` → `bcrypt.compare` **costo 12 con `bcryptjs` puro JS** (~250–600 ms de CPU bloqueante) → `getCompanyAccessStatus` (query que re-consulta la company ya traída en el paso 2) → `user.update({last_access})` **esperado antes de responder**. En el cliente: 3 round-trips seriales (`csrf` → `callback` → un `fetch("/api/auth/session")` redundante en [login/page.tsx:132](../app/login/page.tsx#L132)).

**Impacto:** latencia de login percibida 1–2 s+; en bursts (8:00 AM de un cliente de 10k empleados) el costo CPU de bcrypt multiplica lambdas concurrentes → presión directa sobre G-3.

**Soluciones:**
1. **(Recomendada)** Paquete de 4 cambios en el monolito: (a) cambiar `bcryptjs` → `bcrypt` nativo (API compatible, ~10× más rápido; ya está en `serverExternalPackages` el patrón) — o argon2id; (b) mover `last_access` a `after()`; (c) eliminar la query duplicada añadiendo `active` + paquete activo al `include` del paso 2; (d) quitar el `fetch("/api/auth/session")` del cliente usando el callback de NextAuth para devolver el rol en la URL de redirect. Resultado esperado: login < 500 ms.
2. Solo bajar el costo de bcrypt a 10 (sigue siendo OWASP-aceptable) sin cambiar de librería — mejora 4×, cero riesgo de build nativo.
3. Paralelizar Turnstile con el lookup de usuario (`Promise.all`) — ahorra 50–200 ms extra; combinable con 1 o 2.

---

### 🟠 A-2. Import CSV: 200 hashes bcrypt = 50–80 s de CPU en una invocación

**Evidencia:** [employees/actions.ts:670-674](<../app/(portal)/company/[slug]/employees/actions.ts#L670>) — 1 `bcrypt.hash(…, 12)` por fila; `mapWithConcurrency(8)` no ayuda porque bcryptjs es single-thread. Luego 1 POST a WP por fila (concurrencia 5) y una transacción final de 2×N statements.

**Impacto:** con el límite actual de 200 filas, la action excede cualquier `maxDuration` razonable; el onboarding masivo (el caso de negocio de 100k usuarios) es imposible vía UI.

**Soluciones:**
1. **(Recomendada)** bcrypt nativo (de A-1) baja los 200 hashes a ~5–8 s; + `maxDuration: 300` en la action; + el upsert a WP movido al job asíncrono de G-2 (el import ya tolera `bridgeWarnings`).
2. Diferir la provisión: importar filas sin password (hash al primer login vía flujo "establecer contraseña" con token) — elimina el 100% del costo bcrypt del import y es mejor práctica de seguridad (RH deja de conocer contraseñas).
3. Elevar el límite por archivo pero procesar el CSV completo como job en chunks de 50 (tabla `jobs` + cron) con barra de progreso — necesario de todas formas para importar 10,000 empleados.

---

### 🟠 A-3. DC-3 regenerado desde cero en cada visualización/descarga

**Evidencia:** [lib/dc3-pdf.ts:55-196](../lib/dc3-pdf.ts#L55) — por cada request: 3 queries, lectura del template (90 KB) desde disco, parse pdf-lib completo, sharp sobre el logo (94 KB) **siempre**, fetch en vivo al Blob privado por la firma + sharp de nuevo. La ruta responde `Cache-Control: no-store` ([dc3/route.ts:55](../app/api/certificates/[id]/dc3/route.ts#L55)). Ver + descargar = 2 generaciones.

**Impacto:** ~300–800 ms de CPU + red por PDF. Con 100k usuarios descargando su constancia, es carga repetida sin valor (el PDF es inmutable una vez emitido).

**Soluciones:**
1. **(Recomendada)** Generar **una vez al emitir** la constancia, subir a Vercel Blob, guardar la URL en `constancias` (columna nueva), servir con `Cache-Control: private, max-age=31536000, immutable`. Regenerar solo si cambia la metadata DC-3 (invalidación explícita).
2. Cachés a nivel módulo sin almacenar: template bytes + logo procesado en variables de módulo (sobreviven entre invocaciones calientes), y `Cache-Control: private, max-age=3600` en la respuesta. Mejora 3–4× con ~15 líneas; no elimina el costo en frío.
3. Ambas: 2 ahora (una tarde), 1 en Fase 2.

---

### 🟠 A-4. Dashboards: agregación en JS sobre queries sin límite

**Evidencia:** cero `count`/`groupBy`/`aggregate` en rutas de lectura. [dashboard-cache.ts:18-54](../lib/dashboard-cache.ts#L18) materializa empresas × empleados × cursos completos para producir KPIs; paginación de companies hecha en JS después de cargar todo; página home de RH carga todos los empleados con cursos y certificados para mostrar **3 números** ([home/page.tsx:40-67](<../app/(portal)/company/[slug]/home/page.tsx#L40>)).

**Impacto:** el costo crece linealmente con el total de datos del sistema, no con lo que se muestra. A 100k empleados × ~5 cursos = 500k filas serializadas por render de dashboard (cuando la caché está fría — que con G-4 es siempre).

**Soluciones:**
1. Reescribir KPIs con `prisma.$queryRaw` o `groupBy`/`count` (Postgres hace esto en milisegundos con los índices de M-2) y paginar en SQL (`take/skip` + `where` de búsqueda). Mantener `unstable_cache` encima.
2. **(Recomendada)** Tabla de resumen (`empresa_stats`) actualizada por el cron existente cada 5 min — lectura O(1) por dashboard; acepta 5 min de staleness en KPIs.
3. Vistas materializadas de Postgres refrescadas por cron — igual que 2 pero en la DB; menos código de app, más operación de DB.

---

### 🟠 A-5. Webhook: 1 POST por estudiante, hotspot de escritura y SES bloqueante

**Evidencia:** [tutor-learning/route.ts](../app/api/internal/webhooks/tutor-learning/route.ts) — el payload es un solo estudiante; N upserts individuales en transacción; **cada webhook escribe la misma fila** de `integracion_estados` (`webhook-monitor.ts:21-30` — lock serializado); si hay constancia nueva, **email SES síncrono dentro del request** (`notifications.ts:84`); `source_hash` se recibe pero nunca se compara (sin idempotencia); e invalida el tag global (ver G-4).

**Impacto:** un curso completado por 1,000 alumnos ⇒ 1,000 POSTs con ~6–9 statements cada uno, serializados en una fila caliente, con hasta 1,000 llamadas SES inline (límite SES: 14/s por defecto) → colas de webhooks lentos → el plugin de WP reintenta o descarta.

**Soluciones:**
1. **(Recomendada)** (a) mover el envío SES a `after()` (1 línea de concepto, el patrón ya existe); (b) muestrear la escritura de diagnóstico (escribir 1 de cada N o solo si cambió el estado); (c) guardar y comparar `source_hash` para descartar duplicados sin escribir; (d) invalidar solo tags de la empresa afectada.
2. Endpoint batch en el plugin: agrupar snapshots (hasta 50 estudiantes por POST) — reduce requests 50×; requiere tocar PHP.
3. Encolar el payload crudo (tabla `webhook_inbox` + cron que procesa) — respuesta del webhook en <50 ms siempre; el patrón outbox/inbox monolítico de G-2 reutilizado.

---

### 🟡 M-1. Emails SES sin cola ni reintentos — se pierden en silencio

**Evidencia:** todos los call sites tragan el error (`notifications.ts:85-90`, `employee-learning.ts:206` con `.catch(() => {})`); envío 1 a 1, inline. Un throttle de SES durante un batch descarta esos correos para siempre.

**Soluciones:** (1) **Recomendada:** tabla `email_outbox` (destinatario, payload, intentos, estado) + cron cada minuto que envía con reintentos/backoff — monolítico puro y da visibilidad de fallos; (2) `after()` + reintento in-process (mejora, no resuelve pérdida); (3) Resend/SendGrid con colas gestionadas.

### 🟡 M-2. Índices faltantes en Postgres

Los que las queries actuales necesitan (evidencia en el análisis de `prisma/schema.prisma` vs queries):

| Modelo | Índice | Query que lo necesita |
|---|---|---|
| `Employee` | `(company_id, active)` | todas las páginas de empresa |
| `Employee` | parcial `(active) WHERE wp_user_id IS NOT NULL` | scan del sync batch |
| `EmployeeCourse` | `(employee_id, last_synced_at)` | staleness check por vista de página |
| `EmployeeCourse` | `(access_status)`, `(completed)` | KPIs cuando pasen a SQL (A-4) |
| `CompanyPackage` | `(company_id, active, created_at)` | paquete activo — repetido en 7 sitios |
| `CompanyPackage` | `(expiration_date)` | cron de expiración |
| `User` | `(role, active)` | notificaciones a superadmins/RH |
| `Notification` | `(type, entity_id)` | dedupe del cron (hoy N+1 sin índice) |
| `PackageCourse` | `(wp_course_id)` | lookup por curso en página de empleado |
| `Certificate` | `(wp_course_id)` | reconciliación de constancias |

Una sola migración; riesgo nulo. Sin ellos, A-4 no rinde.

### 🟡 M-3. Overhead por navegación: queries duplicadas y `auth()` doble

**Evidencia:** `getCompanyAccessStatus` sin `react.cache` se ejecuta en cada layout **y** cada server action; `lib/auth-guards.ts:7,16` llama `auth()` directo saltándose el memo de `lib/session.ts:4` (2 descifrados JWE por request); branding es 1 query por request. ≈ 2–3 queries de puro overhead por navegación RH/empleado.
**Soluciones:** (1) **Recomendada:** envolver `getCompanyAccessStatus` en `react.cache` + usar `getSession()` en los guards + `unstable_cache` con tag de empresa para branding (la invalidación ya existe en las actions de branding); (2) fusionar status+branding en una sola query por layout.

### 🟡 M-4. Sin `maxDuration`, `memory` ni región en Vercel

**Evidencia:** `vercel.json` solo tiene crons; cero `export const maxDuration` en el repo. La DB está en `us-east-1` (URL del pooler); sin `regions`, las funciones pueden aterrizar lejos y pagar RTT × cada round-trip de Prisma (y los dashboards hacen muchos).
**Solución (única razonable):** fijar `regions: ["iad1"]` (junto a la DB), `maxDuration: 60` como base y `300` en rutas pesadas (sync, zip, import, webhook batch). 10 líneas de config.

### 🟡 M-5. Dedup de syncs en memoria por instancia

**Evidencia:** `Set`s a nivel módulo (`employee-learning.ts:23-24`) — en serverless cada instancia tiene el suyo; el mismo empleado puede sincronizarse en paralelo desde 2 lambdas (escrituras duplicadas, carga duplicada al bridge).
**Soluciones:** (1) **Recomendada:** lock optimista en DB — `UPDATE ... WHERE last_synced_at < now() - interval` como compare-and-set antes de sincronizar (1 query, sin infra); (2) columna `sync_lock_until` en `empleados`; (3) Redis/Upstash — innecesario aún.

### 🟡 M-6. `sharp` no está declarado en `package.json`

Se importa en `lib/dc3-pdf.ts:3` y en el upload de firmas sin estar declarado. Verificado (2026-08-02): resuelve como **`optionalDependency` de Next.js** (0.34.5 en el lockfile, marcada `optional: true`). El build funciona hoy; se rompería con `npm install --no-optional`, en un entorno donde el binario nativo no compile, o si una versión futura de Next dejara de incluirlo. **Solución:** `npm i sharp` explícito (+ considerar añadirlo a `serverExternalPackages`).

> Nota: durante las pruebas de carga se detectó que `@aws-sdk/client-ses` tenía el mismo problema **y sí rompía el build**. Ya fue corregido — está declarado en `package.json`. Ver [INFORME-LOADTEST-BASELINE.md §6](INFORME-LOADTEST-BASELINE.md).

### 🟢 B-1. `lib/tutorlms-api.ts` es código muerto en la app Next (cero imports; la lógica vive en el plugin PHP). Borrarlo o documentarlo como reserva.
### 🟢 B-2. Imágenes sin `next/image` (thumbnails de cursos con `<img>` crudo; `remotePatterns` solo permite `avatar.iran.liara.run`). Añadir el host de WP y migrar a `next/image`.
### 🟢 B-3. ~40 `revalidatePath` que no purgan nada (todas las rutas son dinámicas por cookies); solo los `revalidateTag` trabajan. Limpieza cosmética.
### 🟢 B-4. WordPress: índice `wp-json` de 2 MB expuesto; `desarrolla360.com` sin CDN/caché de página (TTFB 1.2 s constante). Recomendar Cloudflare + object cache Redis + revisar plugins que registran REST.

---

## 5. ¿Lambdas / jobs de Vercel para descargar la app? — Sí

Pregunta directa del negocio: **sí se puede, y sin salir del monolito.** Herramientas disponibles hoy en Vercel, de menor a mayor complejidad:

1. **`after()` (ya en uso)** — trabajo post-respuesta dentro de la misma invocación. Ideal para: emails, `last_access`, telemetría. Límite: sigue contando en la duración de la función.
2. **Vercel Cron (ya tienen 2)** + **tabla `jobs` en Postgres** — el patrón recomendado en este informe (G-2, A-2, A-5, M-1): las actions encolan filas, un cron por minuto procesa chunks con `maxDuration: 300`. Es el "job queue monolítico": sin infra nueva, transaccional con los datos, visible en SQL.
3. **Funciones dedicadas con `maxDuration`/`memory` propios** — rutas pesadas (ZIP, import, sync) declaran sus límites; Vercel las escala independiente del resto.
4. **Vercel Queues / QStash / Inngest** — colas gestionadas con reintentos. Solo si en Fase 3 el volumen de webhooks/jobs supera lo que el cron-por-minuto procesa cómodamente.

**Regla de decisión:** todo lo que hable con WordPress o SES debe poder ejecutarse fuera del request del usuario. El request solo escribe en Postgres y responde.

---

## 6. Plan de acción priorizado

### Fase 1 — Quick wins (≈1 semana de trabajo, sin cambios de arquitectura)
| # | Acción | Resuelve |
|---|---|---|
| 1 | Timeout + retry en `bridgeRequest` | G-1 |
| 2 | Pool `pg` configurado + singleton en prod + Prisma fuera del proxy | G-3 |
| 3 | Poll a 60 s + jitter + pausa con pestaña oculta (ya NO hace falta tocar `revalidateTag`: ver corrección en G-4) | G-4 |
| 4 | `bcrypt` nativo + `last_access` en `after()` + quitar fetch de sesión redundante | A-1, A-2 (parcial) |
| 5 | Migración de índices | M-2 |
| 6 | `regions` + `maxDuration` en vercel.json/rutas | M-4 |
| 7 | Tope `take: 100` en ruta ZIP (parche) | G-5 (parcial) |
| 8 | `npm i sharp` | M-6 |

### Fase 2 — Escalabilidad estructural (≈3-4 semanas)
| # | Acción | Resuelve |
|---|---|---|
| 9 | Tabla `jobs` + cron procesador (enrolamiento masivo, import CSV en chunks) | G-2, A-2 |
| 10 | DC-3 generado una vez → Vercel Blob → ZIP en streaming desde Blob | A-3, G-5 |
| 11 | KPIs a SQL (`count`/`groupBy`) + paginación en SQL | A-4 |
| 12 | `email_outbox` + cron de envío | M-1, A-5 (parcial) |
| 13 | Webhook: SES a `after()`, idempotencia por `source_hash`, diagnóstico muestreado, tags por empresa | A-5 |
| 14 | `react.cache`/`unstable_cache` en status y branding | M-3 |
| 15 | Lock de sync en DB | M-5 |

### Fase 3 — Camino a 100k (≈1-2 meses, coordinado con WordPress)
| # | Acción | Resuelve |
|---|---|---|
| 16 | Endpoints batch en el plugin (enroll y webhook agrupados) | G-2, A-5 |
| 17 | Onboarding sin password (link de activación) | A-2 |
| 18 | WordPress: Cloudflare delante, object cache Redis, PHP workers dimensionados | mediciones §3 |
| 19 | Tabla de resumen para dashboards si A-4 no basta | A-4 |
| 20 | Evaluar Vercel Queues/Inngest solo si el cron-por-minuto satura | — |

**Estimación de capacidad en cada fase:** ver [INFORME-CAPACIDAD.md](INFORME-CAPACIDAD.md).
