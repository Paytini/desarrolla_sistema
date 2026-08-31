# Informe de Optimización — 31 de agosto de 2026

**Qué se hizo:** una sesión de medición y corrección sobre el paso de carga que la suite no lograba pasar. Todo lo de aquí está medido con A/B — misma escala, mismo escenario, una variable cambiada por corrida.

**Escenario de control:** `1:120:6` (1 usuario nuevo por segundo durante 120 s, 6 vueltas de navegación por usuario), del ladder de [load-testing/](../load-testing/). Umbrales de la suite: p95 < 3,000 ms y < 5% de error.

**Punto de partida:** ese paso fallaba con **90-94% de error**. La suite reportaba "ningún paso quedó bajo el umbral" — el ladder no lograba medir nada porque se caía en el primer escalón.

Informes relacionados: [INFORME-LOADTEST-FASE3.md](INFORME-LOADTEST-FASE3.md) (estado anterior) · [PENDIENTES-RENDIMIENTO.md](PENDIENTES-RENDIMIENTO.md) (lista viva).

---

## 1. Resultado

| Métrica                               | Antes           | Después               |
| -------------------------------------- | --------------- | ---------------------- |
| VUs fallidos                           | 109/120 (90.8%) | **0/120 (0.0%)** |
| VUs completados                        | 11              | **120**          |
| p95 global                             | 5,945 ms        | **1,064 ms**     |
| Timeouts de socket                     | 109             | **0**            |
| Peticiones servidas                    | 760             | **3,282**        |
| Login p95                              | 215 ms          | **15 ms**        |
| `/employee/courses` p50              | — (no llegaba) | **8 ms**         |
| `/api/employee/learning/refresh` p95 | 5,272 ms        | **1,653 ms**     |

4.3× más tráfico servido, sin un solo error, en la misma máquina y con los mismos datos.

---

## 2. Cómo se llegó ahí (la cadena de A/B)

Cuatro corridas, cada una con una sola variable distinta respecto a la anterior.

| Corrida          | Cambio                                           | VUs fallidos | p95                |
| ---------------- | ------------------------------------------------ | ------------ | ------------------ |
| **pool3**  | línea base                                      | 109          | 5,945 ms           |
| **pool10** | `pg.Pool({ max: 3 → 10 })`                    | 18           | 1,940 ms           |
| **v2**     | + escritura por diff, + no invalidar sin cambios | 19           | 1,437 ms           |
| **v3**     | + una sola lectura del empleado por poll         | **0**  | **1,064 ms** |

Antes de llegar al pool se descartaron dos hipótesis, cada una con su medición:

**Descartado — WordPress lento.** El mock del bridge inyecta 6 s de "arranque frío" en el 5% de las llamadas. Con `LT_BRIDGE_COLD_RATE=0`, el resultado fue idéntico (109 fallidos vs 111). No era eso.

**Descartado — el poll de `refresh`.** Se construyó [22-http-sin-refresh.yml](../load-testing/artillery/22-http-sin-refresh.yml), copia exacta del escenario sin ese POST. Falló **peor**: 113/120. El handler era caro, pero no era el techo.

**Confirmado — el pool.** Con todo lo demás igual, subir `max` de 3 a 10 pasó de 109 fallidos a 18, y los timeouts de login desaparecieron por completo. La base de datos estuvo ociosa en las tres corridas (`active` máximo 2, query más larga 0.35 ms, `/api/health` en 1-3 ms): el cuello nunca fue Postgres, era **la cola de espera por una conexión libre**.

---

## 3. Por qué el pool de 3 se volvió el techo: el factor RTT

Cada consulta a Supabase desde la laptop de desarrollo cuesta **102-132 ms** de ida y vuelta (medido de forma continua por `db-watch` en las cinco corridas). Con 3 conexiones, el techo aritmético de toda la aplicación es de ~27 consultas por segundo, sin importar cuánta CPU sobre. Un render de página necesita varias; un login, tres.

**En producción ese número no aplica.** `vercel.json` fija `regions: ["iad1"]` y la instancia de Supabase vive en `aws-1-us-east-1` — el mismo centro de datos. Ahí el RTT es de 1-5 ms, así que las mismas 3 conexiones dan del orden de 600-3,000 consultas/s.

Consecuencia práctica: **todo número absoluto de este informe está inflado ~30× por la latencia de red local.** Lo que sí es transferible es el orden de los cuellos y el efecto relativo de cada cambio.

Esto también responde el pendiente que dejó abierto el informe de Fase 3 ("revisar `max: 3` con datos reales"): el 3 no está mal en producción, pero **es el primer parámetro a mirar cuando aparezcan `timeout exceeded when trying to connect`**, y ahora se puede cambiar sin recompilar.

---

## 4. Cambios aplicados

Todos dentro del stack actual. Sin dependencias nuevas, sin servicios nuevos, sin migraciones.

### 4.1 Pool configurable — [lib/prisma.ts](../lib/prisma.ts)

```ts
const POOL_MAX = Number(process.env.DB_POOL_MAX ?? 3)
```

El default sigue siendo 3. Lo que cambia es que ahora se puede ajustar por variable de entorno en Vercel y medir el efecto sin desplegar código.

### 4.2 Timeout en Turnstile — [lib/turnstile.ts](../lib/turnstile.ts)

`AbortSignal.timeout(4000)` en la verificación del captcha. Cierra el punto 1 de [PENDIENTES-RENDIMIENTO.md](PENDIENTES-RENDIMIENTO.md): era la última llamada saliente del camino crítico sin acotar. **La política sigue siendo fail-closed** — si Cloudflare no responde, no se entra; el timeout solo evita que la petición quede colgada hasta que la mate la función.

### 4.3 Escribir solo lo que cambió — [lib/employee-learning.ts](../lib/employee-learning.ts)

Las tres funciones de upsert (`cursos`, `intentos de examen`, `lecciones completadas`) ahora leen una vez lo que ya está en la base, comparan campo por campo y solo escriben las filas distintas. Antes escribían **todas** las filas en cada sincronización, aunque el snapshot fuera idéntico al anterior.

Como el throttle de sincronización se mide con `last_synced_at` de los cursos, se añadió `touchEmployeeCoursesSyncedAt` — un solo `updateMany` que avanza la marca aunque no se haya escrito nada. Sin eso, una sync sin novedades se repetiría en cada poll.

`syncEmployeeLearningFromBridgeSnapshot` ahora devuelve `changed` con el número real de filas escritas (antes devolvía cuántos cursos venían del bridge, que siempre era > 0).

**Verificado a mano, no solo por la prueba de carga:**

| Prueba                                                                        | Resultado                                      |
| ----------------------------------------------------------------------------- | ---------------------------------------------- |
| Ensuciar una fila (`progress_pct=7`, `access_status=ERROR`) y sincronizar | Reparada a`21` / `ACTIVE`, `changed=5`   |
| Repetir la sync con los mismos datos                                          | `changed=0`, cero escrituras, filas intactas |
| `last_synced_at` tras una sync sin cambios                                  | Avanza igual (el throttle sigue vivo)          |

### 4.4 No invalidar la caché cuando no cambió nada — [app/api/employee/learning/refresh/route.ts](../app/api/employee/learning/refresh/route.ts)

Este handler es el poll de cada pestaña abierta. En **cada** llamada hacía cinco `revalidatePath()` — las dos páginas del empleado y las tres de su empresa — más una consulta de branding, aunque la sincronización no hubiera traído nada nuevo. Ahora, si `changed === 0`, responde y no invalida nada.

El efecto se ve directo en las páginas, que por fin viven de la caché:

| Endpoint                       | Antes  | Después        |
| ------------------------------ | ------ | --------------- |
| `/employee/courses` p50      | 166 ms | **8 ms**  |
| `/employee/certificates` p50 | 153 ms | **8 ms**  |
| `/company/{slug}/home` p95   | 408 ms | **13 ms** |

> **Nota sobre G-4.** El informe de rendimiento predijo una "tormenta de invalidación de caché" por el polling y la baseline la **refutó** midiendo `revalidateTag(tag, "max")`, que es stale-while-revalidate. Esa refutación sigue siendo correcta. Lo que nadie miró fue que el mismo handler hacía además cinco `revalidatePath()`, que **no** son SWR. El hallazgo G-4 era falso en su mecanismo y real en su efecto, por otra vía.

### 4.5 Una sola lectura del empleado por poll — [lib/employee-learning.ts](../lib/employee-learning.ts)

`syncEmployeeLearningByEmail` traía el árbol completo del empleado (cursos + constancias + empresa) solo para decidir si tocaba sincronizar, y después `syncEmployeeLearningRecord` volvía a traer exactamente lo mismo. Ahora la primera lectura es un `select` mínimo y el registro se pasa hacia adentro en vez de releerse.

Efecto en una sincronización forzada, medida directa: **2,175 ms → 1,209 ms**.

---

## 5. Límite del banco de pruebas que hay que conocer

El mock del bridge guarda las inscripciones **en memoria** (`enrollments = new Map()` en [mock-bridge/server.js](../load-testing/mock-bridge/server.js)), y se pierden al reiniciarlo. Durante estas corridas, `students/{id}/courses` devolvía `courses: []` para casi todos los empleados.

Consecuencia: **el costo de sincronizar datos reales nunca se ha medido** — ni en esta sesión ni en las corridas anteriores. Lo que se midió es el costo fijo del handler, que es justamente lo que se bajó.

Ese costo real importa, y es el próximo número a conseguir. Con datos de verdad, cada sincronización de un empleado con 5 cursos, 10 intentos de examen y 40 lecciones completadas dispara del orden de **60 round trips** a la base, porque cada `upsert` dentro de un `prisma.$transaction([...])` es su propio viaje. A 2 ms (producción) son 120 ms; a 110 ms (laptop) son 6.6 s. Con el cambio 4.3 eso solo ocurre cuando de verdad hay novedades, pero la primera sincronización de cada empleado sigue pagándolo entero.

Para medirlo: sembrar, correr `npm run simulate:enrollment` (que llena el mock vía `/enrollments/batch`) y **luego** el escenario de navegación, sin reiniciar el mock entre ambos.

---

## 6. Infraestructura: qué hace falta y qué no

Contexto que cambia las recomendaciones de [INFORME-CAPACIDAD.md](INFORME-CAPACIDAD.md): **hoy el WordPress atiende ~150 estudiantes y va bien.** Las estimaciones de ese informe apuntan a 100,000 usuarios registrados; entre una cosa y la otra hay tres órdenes de magnitud, y la infraestructura que conviene hoy no es la de esa meta.

### Lo que ya está bien y no hay que tocar

| Pieza                                               | Estado   | Por qué importa                                                                                                                                                      |
| --------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `regions: ["iad1"]` en `vercel.json`            | Correcto | Pone las funciones en el mismo centro de datos que Supabase. Es lo que convierte 110 ms de RTT en 1-5 ms. Es la decisión de infraestructura más rentable ya tomada. |
| Pooler de Supabase (puerto 6543) en`DATABASE_URL` | Correcto | Sin él, cada instancia de Vercel pelearía por las 60 conexiones directas.                                                                                           |
| Streaming de video en WordPress                     | Correcto | El contenido pesado no pasa por Vercel. Conservar.                                                                                                                    |
| Crons en`vercel.json`                             | Correcto | Los jobs de F2 ya corren ahí; no hace falta un scheduler externo.                                                                                                    |

### Lo que conviene ajustar, por orden de rentabilidad

1. **`DB_POOL_MAX` en Vercel — gratis.** Dejarlo en 3 mientras no aparezcan errores. La regla es `pool_max × instancias concurrentes ≤ límite de clientes del pooler`. Si en los logs de producción salen `timeout exceeded when trying to connect`, subir a 5 y volver a medir. Si en cambio sale `max clients reached`, el problema es el contrario y hay que bajarlo o subir el plan de Supabase.
2. **Tier de Supabase — el primer gasto real, si hace falta.** La instancia actual tiene `max_connections = 60` (medido), que corresponde al plan más bajo. Mientras el portal atienda cientos de usuarios no es un problema. Se vuelve el cuello cuando haya muchas instancias de Vercel concurrentes, no antes.
3. **Vercel Pro — solo por `maxDuration`.** El único punto que hoy lo necesita es el ZIP de constancias a escala grande (punto 2 de [PENDIENTES-RENDIMIENTO.md](PENDIENTES-RENDIMIENTO.md)): una descarga de 500-600 constancias tardó ~15 min en local, y el techo de Pro son 800 s. Ni con Pro cabe — ese caso necesita el patrón de job asíncrono, no un plan más caro.

### Redis: no hace falta

Se evaluó explícitamente. **No se instaló y no se recomienda todavía**, por tres razones:

- El cuello medido era la cola por conexiones a Postgres y la invalidación de caché, no lecturas repetidas que un caché externo pudiera absorber.
- La caché por tags de Next.js con `"max"` ya se comporta como stale-while-revalidate, y con el cambio 4.4 dejó de destruirse en cada poll. En una sola instancia, la caché en memoria ya hace el trabajo.
- Redis se justifica cuando hay **muchas instancias** que necesitan compartir estado — caché entre lambdas, rate limiting global, deduplicación de syncs. A 150 estudiantes no hay muchas instancias.

Cuándo reconsiderarlo: si el tráfico crece hasta que Vercel mantenga varias instancias calientes en paralelo **y** las métricas muestren que cada una está recalculando la misma caché. Antes de eso, es un servicio más que operar sin beneficio medible.

### El techo real hoy es WordPress

El portal, después de estos cambios, sirvió 3,282 peticiones con 120 usuarios virtuales y **cero errores**, en una laptop que a la vez corría el generador de carga y pagaba 30× de penalización en cada consulta. Para 150 estudiantes no es el cuello.

El PHP de WordPress, en cambio, tarda **6+ segundos en frío** (medido, y sigue vigente), y todo enrolamiento y toda sincronización pasan por él. Es el sistema a dimensionar cuando el número de estudiantes suba, y el único costo fuera del control del portal.

---

## 7. El techo ahora es el banco de pruebas, no la aplicación

Con los cambios aplicados se buscó el techo nuevo subiendo la escalera.

| Paso        | Usuarios/s | VUs | Fallidos           | p95      | Veredicto                    |
| ----------- | ---------- | --- | ------------------ | -------- | ---------------------------- |
| `1:120:6` | 1          | 120 | **0 (0.0%)** | 1,064 ms | ✅ limpio                    |
| `2:180:8` | 2          | 360 | 239 (66.4%)        | 1,653 ms | ❌ supera el umbral de error |

Lo interesante es **cómo** falla el paso de 2/s, porque no se parece a saturación:

| Señal                         | Valor durante el paso de 2/s                                                    |
| ------------------------------ | ------------------------------------------------------------------------------- |
| Peticiones servidas            | 5,402 (vs 3,282 en el paso limpio)                                              |
| p95 de las páginas            | 12-13 ms (`courses`, `certificates`, las tres de empresa)                   |
| p95 global                     | 1,653 ms —**por debajo** del umbral de 3,000                             |
| Errores en el log del servidor | **0**                                                                     |
| Conexiones a Postgres          | 17,`active` máx 4, query más larga 0.16 s                                   |
| `/api/health`                | 200 siempre, máx 23 ms                                                         |
| Fallos                         | 239`ERR_SOCKET_TIMEOUT` — 151 en login, 67 en `courses`, 21 en `refresh` |

La distribución es bimodal: la enorme mayoría de las peticiones se sirven en milisegundos de un dígito, y un subconjunto queda colgado hasta que el cliente se rinde a los 8 s. La aplicación no registró ni un error, la base no se inmutó, y las páginas que sí respondieron lo hicieron más rápido que nunca.

**Interpretación honesta:** a 360 usuarios virtuales, esta laptop está corriendo a la vez el servidor Next.js, el generador de carga, el mock del bridge y el monitor de base de datos. Los timeouts se concentran en las dos operaciones que abren conexiones salientes (login → Cloudflare, `refresh` → bridge) y en la página que dispara una sincronización en segundo plano. No se puede separar cuánto de eso es la app y cuánto es la máquina compartida sin **correr la carga desde otro equipo** — que es exactamente el punto 6 de [PENDIENTES-RENDIMIENTO.md](PENDIENTES-RENDIMIENTO.md), pendiente desde la baseline.

Lo que sí se puede afirmar: **el techo dejó de ser un problema de la aplicación**. Antes fallaba con la base ociosa porque tenía 3 conexiones; ahora, cuando falla, la app ni se entera.

---

## 8. Separar el login del resto: qué se rompe después

Mezclar el login con la navegación impide ver el segundo cuello, porque el login se come el presupuesto de la corrida. Se añadieron dos piezas para separarlos:

- **`npm run prelogin`** ([scripts/prelogin.js](../load-testing/scripts/prelogin.js)) autentica N usuarios por la API, mide **esa fase sola** y guarda las cookies en `data/payloads/sessions-*.csv`.
- **`npm run simulate:sessions`** ([23-http-sesion-precargada.yml](../load-testing/artillery/23-http-sesion-precargada.yml)) navega con esas sesiones. No contiene un solo login.

### La fase de login, aislada

| | Resultado |
| --- | --- |
| Empleados autenticados | 400/400 en 39.4 s → **10.2 logins/s** |
| Latencia | p50 964 ms · p95 1,036 ms |
| Fallos | **0** |

### La navegación, sin logins

540 usuarios virtuales, 5,476 peticiones. Latencias de lo servido:

| Endpoint | p50 | p95 |
| --- | --- | --- |
| **`/api/employee/learning/refresh`** | **1,940 ms** | 4,493 ms |
| **`/api/internal/notifications`** | **633 ms** | 1,466 ms |
| `/company/{slug}/home` | 8 ms | 16 ms |
| `/employee/courses` | 7 ms | 15 ms |
| `/company/{slug}/employees` | 8 ms | 14 ms |
| `/company/{slug}/certificates` | 8 ms | 13 ms |
| `/employee/certificates` | 7 ms | 12 ms |

**Las siete páginas están entre 12 y 16 ms de p95.** Hay exactamente dos puntos débiles después del login, separados del resto por un orden de magnitud.

El modelo que explica los tres: el costo de cada endpoint ≈ (viajes a la base) × RTT, más la cola. Las páginas son rápidas porque sirven de caché desde el cambio 4.4; las rutas de API pagan el RTT completo, y `refresh` suma además dos llamadas al bridge.

### La palanca: `EMPLOYEE_SYNC_INTERVAL_MS`

El navegador hace poll cada 60 s y el throttle está en 15 s, así que **cada poll dispara una sincronización completa**. Subiéndolo a 300 s, misma corrida:

| | 15 s | 300 s |
| --- | --- | --- |
| `refresh` p50 | 1,940 ms | **207 ms** |
| `notifications` p50 | 633 ms | **105 ms** |
| p95 global | 3,328 ms | **925 ms** |
| Timeouts en `refresh` | 31 | **1** |

−89% en el endpoint que era el cuello, con una variable de entorno. **El valor correcto es una decisión de producto**, no de medición: depende de cuán fresco deba verse el progreso. Y depende de arreglar antes el webhook de producción (punto 11 de [PENDIENTES-RENDIMIENTO.md](PENDIENTES-RENDIMIENTO.md)) — con el webhook vivo, el poll es solo una red de seguridad y 300 s sobra; con el webhook caído, es una de las dos únicas vías.

### Confirmación de que el techo es el banco de pruebas

En la corrida con 300 s, los fallos siguieron (419 VUs) pero la línea de tiempo los delata:

```
02:36:50  creados 30  fallidos  0  req 137  p95 1023
02:37:20  creados 30  fallidos 47  req 137  p95 4493
02:37:40  creados 30  fallidos 57  req 101  p95 6187
02:38:10  creados 30  fallidos 52  req  77  p95   25   ← p95 de 25 ms
02:38:30  creados 30  fallidos 38  req  29  p95   26
```

El throughput se desploma (173 → 29 peticiones por ventana) **mientras la latencia de lo servido cae a 25 ms**. El servidor está ocioso y las peticiones no llegan. Con 0 errores en el log de la app, `active` máximo 2 en la base y la query más larga en 6 ms, la conclusión es que se ahoga el generador de carga, no el portal.

---

## 9. Qué sigue

1. **Correr la suite desde otra máquina** contra un preview de Vercel. Pasó de ser deseable a ser lo único que falta: el banco de pruebas local ya no puede distinguir entre un límite de la app y uno de la laptop (sección 7).
2. Medir el costo de sincronización con el mock **poblado** (sección 5). Es el otro número que falta.
3. Colapsar los `prisma.$transaction([...])` de la sincronización en un `INSERT ... ON CONFLICT DO UPDATE` por bloque: de ~60 round trips a 4. Solo después de medir sección 5 — sin ese número no se sabe cuánto se gana, y es SQL crudo sobre la tabla espejo.
4. Actualizar las cifras de [INFORME-CAPACIDAD.md](INFORME-CAPACIDAD.md) cuando exista la medición del punto 1. Hoy siguen apoyadas en estimaciones de lectura de código.
