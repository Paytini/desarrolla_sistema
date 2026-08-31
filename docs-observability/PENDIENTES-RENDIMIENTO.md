# Pendientes de Rendimiento — qué falta después de F1/F2/F3

**Fecha:** 2026-08-31
**Para qué sirve este documento:** los informes de `docs-observability/` son registros fechados de lo que se analizó o midió ese día — no dicen qué queda abierto **hoy**. Este sí. Es la única lista viva; se actualiza al cerrar cada punto.

**Contexto:** las tres fases del plan de [INFORME-RENDIMIENTO.md](INFORME-RENDIMIENTO.md) se aplicaron entre el 19 y el 21 de agosto de 2026 y se validaron con medición real en [INFORME-LOADTEST-FASE3.md](INFORME-LOADTEST-FASE3.md). Los hallazgos graves G-1 (bridge), G-2, G-3, G-5, A-1 y A-3 están cerrados; G-4 quedó **refutado por medición** y no requiere trabajo. Lo de abajo es el resto.

**Estado del esquema:** 32 migraciones, `Database schema is up to date`. **Ninguna migración necesita corrección** — la deriva que existe es de documentación (punto 8).

> **Actualización 2026-08-31.** Una sesión de medición y corrección cerró los puntos 1 y 3 y añadió el 9 y el 10. Detalle completo, con la cadena de A/B: [INFORME-OPTIMIZACION-2026-08-31.md](INFORME-OPTIMIZACION-2026-08-31.md).

---

## Resumen

| #   | Pendiente                                        | Gravedad  | Esfuerzo | Bloquea escala |
| --- | ------------------------------------------------ | --------- | -------- | -------------- |
| 1   | ~~`verifyTurnstileToken` sin timeout~~           | ✅ Resuelto | —      | —              |
| 2   | ZIP de 500-600 constancias no cabe en la request | 🔴 Alta   | Media    | Sí (RH grande) |
| 3   | ~~`pg.Pool({ max: 3 })` — revisar~~              | ✅ Medido  | —       | —              |
| 4   | `email_outbox` de F2 sin construir               | 🟡 Media  | Media    | No             |
| 5   | Enrolamiento batch de N empleados en el plugin   | 🟡 Media  | Alta     | Sí a 10k       |
| 6   | Load test contra un preview de Vercel            | 🟡 Media  | Media    | No (mide)      |
| 7   | `processor-gaps.js` clasifica mal el resultado   | 🟢 Baja   | 1 línea  | No             |
| 8   | ~~`CLAUDE.md` y `HANDOFF.md` describen el esquema viejo~~ | ✅ Corregido | — | —          |
| 9   | El mock del bridge pierde las inscripciones — el costo real de sincronizar nunca se ha medido | 🔴 Alta | Baja | Sí (punto ciego) |
| 10  | ~60 round trips por sincronización (`$transaction` de upserts uno a uno) | 🟡 Media | Media | Depende del 9 |
| 11  | **Producción sin `BRIDGE_WEBHOOK_SECRET` — el webhook está caído** | 🔴 Alta | 1 variable | No (pero rompe la sincronización) |
| 12  | `EMPLOYEE_SYNC_INTERVAL_MS` en 15 s con poll de 60 s — decisión pendiente | 🟡 Media | 1 variable | Sí (es el 2º cuello) |

---

## 1. `verifyTurnstileToken` sin timeout — ✅ CERRADO (2026-08-31)

Aplicado `signal: AbortSignal.timeout(4000)` en [lib/turnstile.ts](../lib/turnstile.ts). Era la última llamada saliente del camino crítico sin acotar.

La política sigue siendo **fail-closed**: si Cloudflare no responde, nadie entra. El timeout solo evita que la petición quede colgada. Se descartó explícitamente la variante fail-open (dejar pasar cuando falla la red) porque quien pueda bloquear esa salida se saltaría el captcha entero, y el login no tiene rate limiting que lo compense.

---

## 2. ZIP de constancias a escala real — 🔴 el caso que la Fase 3 no cerró

**Dónde:** [app/api/certificates/zip/route.ts](../app/api/certificates/zip/route.ts)

La Fase 3 hizo lo que prometió — streaming en vez de acumular en memoria, concurrencia 5 en la generación, tope duro — y la medición lo confirmó: 60 constancias en 13.5 s, ~226 ms por PDF, la mitad del costo de la baseline. Pero el caso grande sigue sin caber:

| Tope actual                                                              | Consecuencia                                                                              |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `MAX_ZIP_CERTIFICATES = 100` ([:19](../app/api/certificates/zip/route.ts#L19)) | Con 500-600 solicitadas, el ZIP trae **las primeras 100** y un `LEEME.txt` explicándolo |
| `maxDuration = 300` ([:17](../app/api/certificates/zip/route.ts#L17))         | 5 minutos. El techo del plan Pro de Vercel son 800 s (13.3 min)                          |

**Dato nuevo (prueba manual, agosto 2026):** una corrida con **500-600 constancias tardó ~15 minutos**. Eso solo es posible en local, donde `next start` no aplica `maxDuration`. En Vercel la función muere a los 5 min — y ni subiendo `maxDuration` a su máximo de 800 s cabrían 15 minutos de trabajo.

**Antes de decidir el arreglo, falta un dato.** Los PDF se cachean en Vercel Blob (`Certificate.dc3_pdf_url`, [lib/dc3-pdf.ts:250](../lib/dc3-pdf.ts#L250)), así que esos 15 minutos son de **generación en frío**. Repetir la misma descarga con los PDF ya en Blob debería bajar mucho — es fetch, no `pdf-lib` + `sharp`. Medir eso primero: decide si el problema es de generación o de empaquetado.

**Arreglo si aun cacheado no cabe:** mismo patrón que resolvió G-2 — encolar un job (`lib/jobs.ts`), generar en chunks desde el cron, subir el ZIP terminado a Blob y notificar al usuario con el enlace. Deja de ser una operación con presupuesto de request.

---

## 3. `pg.Pool({ max: 3 })` — ✅ CERRADO (2026-08-31)

El pool de 3 **era** el techo en local: con todo lo demás igual, subirlo a 10 pasó de 109 VUs fallidos a 18 y los timeouts de login desaparecieron. La base estuvo ociosa en ambas corridas, así que el cuello era la cola por una conexión libre, no Postgres.

Ese número **no se traslada a producción**: desde la laptop cada consulta cuesta 102-132 ms de ida y vuelta; en Vercel `iad1`, junto a Supabase en `aws-1-us-east-1`, son 1-5 ms. Las mismas 3 conexiones rinden ~30× más allá.

Aplicado: `DB_POOL_MAX`, default 3 ([lib/prisma.ts](../lib/prisma.ts)), ajustable sin desplegar. Cómo elegir el valor en producción: sección 6 de [INFORME-OPTIMIZACION-2026-08-31.md](INFORME-OPTIMIZACION-2026-08-31.md).

---

## 4. `email_outbox` — item de Fase 2 que no se construyó

No existe la tabla ni el cron; los correos se envían inline con [lib/ses.ts](../lib/ses.ts). El commit `chore: remove enqueueEmailSendJobs, orphaned by CSV email removal` (2026-08-24) quitó lo único que había en esa dirección.

**Por qué importa menos de lo que parece:** los envíos masivos (alta por CSV) ya viven dentro de jobs asíncronos, así que un SES lento no bloquea a un usuario esperando en el navegador. El riesgo que queda es de **entrega**: sin outbox no hay reintento ni rastro de un correo que SES rechazó. Es fiabilidad, no rendimiento.

**Qué haría falta:** tabla `EmailOutbox` (destinatario, plantilla, payload, intentos, estado), escribir ahí en vez de llamar a SES, y drenar desde `/api/cron/process-jobs`.

---

## 5. Enrolamiento batch de N empleados en el plugin — item de Fase 3

El plugin **sí** tiene `/enrollments/batch`, pero batchea **los cursos de un solo alumno**: [bridgeEnrollCourses(userId, courseIds)](../lib/wordpress-bridge.ts#L446). Por empleado siguen saliendo 3 llamadas HTTP a WordPress — enroll, `access/ensure`, `students/{id}/courses` ([lib/course-sync.ts:220-232](../lib/course-sync.ts#L220-L232)).

La Fase 3 sí entregó el batching en la **dirección entrante** (webhook agrupado en vez de un POST por alumno, PR `perf/fase3-webhook-batching`). Lo que falta es el saliente: un endpoint que acepte N empleados en una llamada.

**Impacto:** hoy no duele porque el trabajo corre en background en chunks de 20 con concurrencia 5 ([lib/jobs.ts](../lib/jobs.ts)). A escala de onboarding de 10,000 empleados son ~30,000 llamadas HTTP a un PHP que en frío tarda 6+ s. Ese es el número que la Fase 3 quería bajar a ~200 llamadas.

**Coste:** alto — es PHP en el plugin, y el plugin **se despliega a mano en WordPress**, así que exige coordinar ambos lados.

---

## 6. Medir capacidad de producción de verdad

Todos los números que existen —baseline y post-fases— salen de **una sola laptop que corre a la vez el servidor Next.js, Artillery, los navegadores Chromium y el cliente de Postgres**. Sirven para comparar antes/después, que es para lo que se usaron. No dicen cuánto aguanta producción: Vercel escala horizontalmente y aquí se midió una instancia compitiendo por CPU con su propio generador de carga.

Los porcentajes de error del 95-99% de `run-all` son de esa contención (`ERR_SOCKET_TIMEOUT` del cliente Artillery), no de la app cayéndose — está explicado en sección 4 de la baseline y sección 6 del informe de Fase 3.

**Qué falta:** correr la suite **desde otra máquina** apuntando a un preview de Vercel con una base de datos de staging. Lo señalan como pendiente los dos informes. Sin eso, las cifras de [INFORME-CAPACIDAD.md](INFORME-CAPACIDAD.md) (1,500-3,000 concurrentes tras F1, 100k registrados tras F2) siguen siendo estimaciones sin confirmar.

Advertencia operativa: `empresas.desarrolla360.com` está en modo de prueba pero **usa la base de datos real y el WordPress real**. Leer [load-testing/TARGET-REMOTO.md](../load-testing/TARGET-REMOTO.md) antes de apuntarle nada.

---

## 7. `processor-gaps.js` clasifica todo como UNKNOWN

**Dónde:** `load-testing/artillery/processor-gaps.js`

Busca en la URL el marcador `success=sync_ok`, que dejó de existir cuando el enrolamiento pasó a job asíncrono — ahora el marcador es `success=sync_queued`. Por eso el escenario de G-2 reporta "UNKNOWN" en los 10 casos aunque la sincronización funcione. No es un fallo de la app, es el clasificador del test escrito antes del cambio de arquitectura.

Arreglarlo antes de la próxima corrida de `simulate:enrollment`, o los resultados vuelven a salir ilegibles.

---

## 8. Deriva de documentación — ✅ CORREGIDO (2026-08-31)

`CLAUDE.md` y `HANDOFF.md` describían tablas y roles en español, que dejaron de existir con las migraciones `20260724100000_rename_schema_to_english` y `20260820184347_rename_role_enum_values_to_english`. Ambos quedaron actualizados: nombres en inglés, y se documentó lo que las fases 2 y 3 añadieron y nadie había escrito — la tabla `jobs` con sus crons, el DC-3 cacheado en Blob, y el tenant guard de `lib/prisma.ts` que fuerza `company_id` en las consultas de HR.

**Criterio que se siguió, y que conviene mantener:** `CLAUDE.md` y `HANDOFF.md` describen el sistema **como está hoy** y se corrigen cuando cambia. Los `INFORME-*.md` son registros fechados de lo que se midió ese día y **no se tocan** — corregirlos hacia el presente borra la historia que los hace útiles. Cuando un informe queda superado, se marca con una nota que apunta al que lo reemplaza.

---

## 9. El mock del bridge pierde las inscripciones — hay un punto ciego en toda la medición

**Dónde:** [load-testing/mock-bridge/server.js](../load-testing/mock-bridge/server.js) — `const enrollments = new Map()`.

El mock aprende qué cursos tiene cada alumno solo cuando alguien llama a `/enrollments/batch`, y lo guarda en memoria. Al reiniciarlo, `students/{id}/courses` devuelve `courses: []` para todos.

**Consecuencia, y es seria:** en las corridas de esta sesión —y probablemente en las del informe de Fase 3— el endpoint de sincronización hacía sus dos llamadas al bridge y recibía una lista vacía. **El costo de sincronizar datos reales nunca se ha medido.** Lo medido es el costo fijo del handler.

**Cómo cerrarlo:** sembrar, correr `npm run simulate:enrollment` (que puebla el mock) y **después** el escenario de navegación, sin reiniciar el mock entre ambos. O hacer que el mock derive los cursos de la base sembrada en vez de depender de la memoria.

---

## 10. ~60 round trips por sincronización

**Dónde:** [lib/employee-learning.ts](../lib/employee-learning.ts) — cuatro `prisma.$transaction([...])`, cada `upsert` del arreglo es su propio viaje a la base.

Un empleado con 5 cursos, 10 intentos de examen y 40 lecciones completadas dispara del orden de 60 round trips. A 2 ms (producción) son ~120 ms; a 110 ms (laptop) son 6.6 s.

El cambio del 2026-08-31 (escribir solo las filas que cambiaron) hace que esto ocurra **solo cuando de verdad hay novedades** — en régimen estable ya no pasa. Pero la primera sincronización de cada empleado sigue pagándolo entero, y un empleado activo genera novedades a menudo.

**Arreglo, dentro del stack:** un `INSERT ... ON CONFLICT DO UPDATE` con lista de `VALUES` por bloque, vía `prisma.$executeRaw`. De ~60 viajes a 4.

**No hacerlo todavía:** sin el punto 9 resuelto no hay forma de saber cuánto se gana, y es un cambio con riesgo real de corrección (SQL crudo sobre la tabla espejo). Medir primero.

---

## 11. Producción no tiene `BRIDGE_WEBHOOK_SECRET` — el webhook está caído

Verificado el 2026-08-31 contra el sitio publicado:

```
GET https://empresas.desarrolla360.com/api/health → 503
{"ok":false,"missing":["BRIDGE_WEBHOOK_SECRET"]}
```

**No es cosmético.** [tutor-learning/route.ts:195-201](../app/api/internal/webhooks/tutor-learning/route.ts#L195-L201) corta con 503 antes de validar nada cuando falta el secreto, así que **cada push de WordPress se rechaza**. El canal de sincronización casi en tiempo real no funciona en producción; el progreso solo llega por el cron de respaldo, cada minuto.

**Arreglo:** definir `BRIDGE_WEBHOOK_SECRET` en el scope Production de Vercel, con el mismo valor que tiene el plugin en WordPress (Settings → Desarrolla360 Bridge). Si no coinciden, la firma HMAC no valida y el resultado es un 401 en vez de un 503 — igual de roto.

Los demás env vars requeridos sí están: `/api/health` solo lista ese.

---

## 12. `EMPLOYEE_SYNC_INTERVAL_MS`: el segundo cuello, y es una decisión de producto

El navegador hace poll cada 60 s ([EmployeeLearningRefresh.tsx:16](../components/employee/EmployeeLearningRefresh.tsx#L16)) y el throttle de sincronización está en 15 s por defecto ([lib/employee-learning.ts:14](../lib/employee-learning.ts#L14)). Como 60 > 15, **cada poll dispara una sincronización completa** — dos llamadas al bridge más varios viajes a la base.

Medido el 2026-08-31 con las sesiones ya autenticadas (escenario `23-http-sesion-precargada`), subiéndolo a 300 s:

| | 15 s | 300 s |
| --- | --- | --- |
| `refresh` p50 | 1,940 ms | **207 ms** |
| `notifications` p50 | 633 ms | **105 ms** |
| p95 global | 3,328 ms | **925 ms** |
| Timeouts en `refresh` | 31 | **1** |

**Por qué no se deja fijado aquí:** el número correcto depende de cuán fresco tiene que verse el progreso, y eso lo decide el negocio, no la medición. Con el webhook funcionando (punto 11), el progreso llega casi en tiempo real por ese canal y el poll es solo una red de seguridad — 300 s sobra. Con el webhook caído, el poll es una de las dos únicas vías, y bajarle la frecuencia se nota.

**Orden correcto:** arreglar el punto 11 primero; después subir este intervalo.

---

## Qué NO está pendiente (para no re-litigarlo)

- **G-4, la tormenta de invalidación de caché del superadmin.** Refutado por medición dos veces (delta ~0 ms). `revalidateTag(tag, "max")` en Next.js 16 es _stale-while-revalidate_, no expiración bloqueante. El mecanismo predicho no existe. **Matiz añadido el 2026-08-31:** el mismo handler del poll hacía además cinco `revalidatePath()`, que no son SWR — eso sí costaba, y ya está corregido. La refutación de G-4 sigue siendo válida; lo que faltaba era mirar la otra mitad del handler.
- **Inngest, QStash, Prisma Accelerate y Redis gestionado.** Descartados por costo; la tabla `Job` + Vercel Cron es la decisión tomada y funcionó (G-2 pasó de 144 s a ~2 s de respuesta).
- **Streaming de video.** Lo sirve WordPress directamente, verificado; no pasa por Vercel. Conservarlo así.
