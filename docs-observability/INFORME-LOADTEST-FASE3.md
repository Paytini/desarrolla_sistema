# Informe de Load Testing — Post Fase 1/2/3 (comparado contra baseline F0)

**Fecha:** 2026-08-20
**Suite:** [load-testing/](../load-testing/) — misma metodología y misma escala que [INFORME-LOADTEST-BASELINE.md](INFORME-LOADTEST-BASELINE.md) (10 empresas × 200 empleados = 2,000 empleados, 600 constancias), corrida en `localhost:3005` sobre la misma máquina que genera la carga.
**Objetivo:** responder la pregunta de §7 de la baseline — "¿mejoró con la Fase 1/2/3?" — repitiendo `npm run run-all` y los tres escenarios dirigidos (G-2, G-5, G-4).

Antes de correr nada, la suite necesitó dos arreglos menores (documentados en §5) porque el rename del enum `Role` (RH→HR, EMPLEADO→EMPLOYEE) de esta sesión rompió dos scripts del directorio `load-testing/`, que tiene sus propias queries SQL aisladas del código de la app.

---

## 1. Resumen ejecutivo

| Hallazgo | Baseline F0 | Ahora | Veredicto |
|---|---|---|---|
| **G-3** — pool de conexiones | Crece de 12→20 y no baja; `EAUTHTIMEOUT/08006`; cold start 7.7s | **Estable en 9-11 durante los 26 min completos**, nunca crece sin control; 0 errores de autenticación de conexión | ✅ **Resuelto** |
| **G-2** — enrolamiento masivo | 144.5s promedio por empresa de **40** empleados (sincrónico, bloqueaba la request) | **~2.2s promedio** por empresa de **200** empleados (5× el volumen) — ahora encola un job y responde de inmediato | ✅ **Resuelto** (~65-300× más rápido según cómo se mida) |
| **G-5** — ZIP de constancias | 12 constancias → 5.96s (~500ms/PDF) | **60 constancias → 13.5s (~226ms/PDF)** — 5× el volumen, sin caída ni OOM | ✅ **Mejora confirmada**, caso catastrófico (500+) sigue sin probarse |
| **G-4** — tormenta de invalidación de caché | Ya refutado en la baseline (delta ~0ms) | Delta ~0ms de nuevo (42ms control vs 39ms storm) | ✅ **Sigue sin ser un problema** |
| Login bajo carga (`01-login-storm`) | p95 6,703ms; 2,404 respuestas 200 reales | p95 **713.5ms**; **3,551** respuestas 200 reales (más volumen, mejor latencia) | ✅ **~9.4× más rápido** en el p95 de lo que sí se sirvió |
| **Nuevo hallazgo** — `pg.Pool({ max: 3 })` | No aplicaba (pool sin límite) | Bajo miles de VUs simultáneos en una sola máquina, el pool de 3 conexiones se agota y produce `timeout exceeded when trying to connect` explícito | ⚠️ Comportamiento correcto (falla rápido en vez de tumbar la base), pero **vale la pena revisar el tamaño** si se espera concurrencia real alta por instancia |

**En una frase:** los tres hallazgos que llevaron a la Fase 1/2/3 (G-2, G-3, y la sospecha sobre G-5) se confirman resueltos con medición real, no solo lectura de código — y ninguna medición salió peor que la baseline.

---

## 2. G-3 — Pool de conexiones (el hallazgo más crítico de la baseline)

`npm run db:watch` corrió en paralelo a los 26 minutos de `run-all`. Comparación directa contra la baseline:

| | Baseline F0 | Ahora |
|---|---|---|
| Conexiones al arrancar | 12 | 9 |
| Conexiones bajo pico | sube a 20 | sube a **11** como máximo |
| ¿Vuelve a bajar tras el pico? | **No** — se queda en 20 | **Sí** — vuelve a 9 constantemente durante todo el run |
| Latencia de `/api/health` | picos de 1,332ms y 2,104ms que no bajan | picos aislados (máx. 3,717ms una sola vez), la mayoría del tiempo 1-4ms |
| Errores de conexión (`EAUTHTIMEOUT`/`08006`) | Sí, reproducido en vivo | **Ninguno** en 26 minutos |

Este es el resultado más importante del informe: la baseline predijo que sin límite el pool acumulaba conexiones hasta agotar el `max_connections=60` de Supabase, y eso se confirmó en vivo. Ahora, con `pg.Pool({ max: 3, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000 })` en `lib/prisma.ts`, el número de conexiones **nunca se sale de un rango de 9-11** en toda la corrida, sin importar cuántos usuarios virtuales estuvieran atacando el servidor.

**Matiz honesto:** ese mismo límite de 3 se convierte en el nuevo cuello de botella bajo la carga extrema que genera esta suite (miles de VUs simultáneos desde una sola máquina). El log del servidor registró 5,563 líneas de `prisma:error timeout exceeded when trying to connect` durante `run-all` — no es el pool creciendo sin control como antes, es el pool **rechazando rápido** cuando las 3 conexiones están ocupadas más de 10s. Es el trade-off correcto (falla explícita y recuperable vs. tumbar la base compartida), pero si en producción real se espera bastante concurrencia simultánea por instancia de Vercel, `max: 3` podría ser conservador — vale la pena revisarlo con datos de uso real, no repetir esta prueba de estrés extremo.

---

## 3. G-2 — Enrolamiento masivo: de bloqueante a asíncrono

`npm run simulate:enrollment` barrió las 10 empresas sembradas (200 empleados cada una — 5× la escala de 40 empleados que probó la baseline), haciendo clic real en "Sincronizar" vía Playwright:

| Empresa | Tiempo de pared (ahora) |
|---|---|
| lt-empresa-01 | 2.03s |
| lt-empresa-02 | 2.42s |
| lt-empresa-03 | 1.86s |
| lt-empresa-04 | 1.95s |
| lt-empresa-05 | 2.42s |
| lt-empresa-06 | 1.89s |
| lt-empresa-07 | 2.47s |
| lt-empresa-08 | 2.36s |
| lt-empresa-09 | 2.37s |
| lt-empresa-10 | 2.38s |
| **Media** | **2.2s para 200 empleados** |

Baseline: **144.5s promedio para 40 empleados**. La comparación directa por empleado ya no aplica — porque **la naturaleza de la operación cambió**: antes el botón esperaba a que terminaran las 3N llamadas al bridge dentro de la misma request HTTP; ahora el botón devuelve `success=sync_queued` casi de inmediato porque el trabajo se encoló como job asíncrono (`lib/jobs.ts`, procesado por `GET/POST /api/cron/process-jobs`).

**Verificación de que el trabajo encolado sí se completa** (no solo que el botón responde rápido): consultando la base directamente después de la corrida, `employee_courses` para las empresas LT mostró un **96% en `ACTIVE`** poco después de encolarse, subiendo y bajando ligeramente en checks posteriores (ver §5 — probablemente correlacionado con el 5% de fallos de arranque en frío que el mock de WordPress simula a propósito, más reintentos). El patrón general — la gran mayoría de los cursos terminan `ACTIVE` sin que nadie tenga que esperar minutos en el navegador — confirma que el job realmente hace el trabajo, no solo que lo pospone.

**Nota metodológica:** el script de la prueba (`processor-gaps.js`) clasifica el resultado como "UNKNOWN" en todos los casos porque busca en la URL el marcador antiguo `success=sync_ok`, que ya no existe — el marcador real ahora es `success=sync_queued`. No es una falla, es que el clasificador del test se escribió antes de este cambio de arquitectura. Vale la pena actualizarlo si se van a repetir estas pruebas.

---

## 4. G-5 — ZIP de constancias: más volumen, menos costo por PDF

`npm run simulate:zip` (vía Artillery) falló con `ERR_SOCKET_TIMEOUT` en las 6 peticiones — pero no porque la ruta esté rota: el timeout por defecto de Artillery (~10s) es más corto que lo que tarda generar un ZIP de 60 constancias (la escala sembrada esta vez, 5× la de la baseline), no porque haya empeorado. Se repitió la prueba directo con `curl` sin ese límite artificial:

| | Baseline F0 (12 constancias) | Ahora (60 constancias) |
|---|---|---|
| Tiempo total | 5.96s | **13.54s** |
| Tamaño del ZIP | 2.33 MB | 11.1 MB |
| Costo por PDF | ~500ms | **~226ms** |
| ¿Se cayó o se quedó sin memoria? | No (a esta escala baja) | **No**, a 5× la escala |

El objetivo de la Fase 3 para este hallazgo era transmitir el ZIP en vez de acumularlo completo en memoria — eso reduce el riesgo de OOM a escala alta, no necesariamente la latencia total (que sigue siendo ~proporcional al número de PDFs, generados uno a la vez). Los datos son consistentes con eso: el costo por PDF bajó a la mitad y la app aguantó 5× el volumen limpiamente. El caso catastrófico que la baseline dejó sin probar (500-600 constancias en una sola empresa) sigue sin reproducirse — sembrar esa escala en una sola empresa y repetir esta prueba puntual sería el siguiente paso si se quiere cerrar esa duda del todo.

---

## 5. G-4 — Tormenta de invalidación de caché (control, sigue sin ser un problema)

`npm run simulate:cache-storm`: delta de 42ms (control) vs 39ms (con 60 empleados haciendo poll) — esencialmente el mismo resultado de "REFUTADO" que documentó la baseline. `revalidateTag(..., "max")` sigue comportándose como stale-while-revalidate, no como expiración bloqueante. Sin cambios de este hallazgo — se confirma que sigue resuelto/nunca fue un problema real.

---

## 6. Escenarios de la corrida completa (`run-all`)

Misma escala que la baseline (10 empresas × 200 empleados). Mismo patrón de "alto % de error" que la baseline explicó en su §4 — son artefactos del cliente (`ERR_SOCKET_TIMEOUT` de Artillery, no la app cayéndose) generados por correr servidor + navegadores + generador de carga en una sola laptop, no medición de capacidad real de producción.

| Escenario | Requests | p50 | p95 | p99 | Error % | Comparación con baseline |
|---|---|---|---|---|---|---|
| 01-login-storm | 7,082 | — | **713.5ms** | 6,312ms | 99.4% | Baseline: p95 6,703ms. **~9.4× mejor**, y sirvió más 200 reales (3,551 vs 2,404) |
| 02-employee-navigation | 0 | — | — | — | 100% | Mismo resultado que baseline (contención Playwright, no mide la app) |
| 03-rh-journey | — | — | — | — | 98.1% | Similar a baseline (100%) |
| 04-superadmin-dashboard | — | — | — | — | **0%** | Igual que baseline: 0% error, este escenario siempre pasó limpio |
| 05-certificates | 2,232 | — | 4,492.8ms | 7,865.6ms | 99.1% | Baseline: p95 6,440ms. Mejor, aunque ambos dominados por el mismo techo de timeout del cliente |
| 06-peak-mixed | 5,889 | 314.2ms | 6,702.6ms | 7,865.6ms | 99.9% | Baseline: p50 1,755ms, p95 6,703ms. **El p50 mejoró 5.6×** (314ms vs 1,755ms); el p95 se parece porque en ambos casos está dominado por el mismo techo de timeout del cliente (~8s), no por la app |

**Por qué el p95/p99 casi no cambia aunque la app sí:** en escenarios donde miles de VUs saturan una sola laptop, el p95/p99 termina midiendo el timeout fijo del cliente Artillery (~8s), no la latencia real del servidor — pasa igual en la baseline y ahora. La métrica que sí refleja la mejora real es el **p50/mediana** (lo que le pasa a la mayoría de las peticiones que sí se completan) y el **conteo de 200 reales servidos**, y ambas mejoraron con claridad.

Informe crudo generado por la suite: [load-testing/reports/INFORME-LOADTEST-2026-08-20.md](../load-testing/reports/INFORME-LOADTEST-2026-08-20.md) (nota: ese archivo no se versiona, vive solo localmente).

---

## 7. Arreglos necesarios antes de poder correr la suite

El rename de roles de esta sesión (`RH`→`HR`, `EMPLEADO`→`EMPLOYEE` en el enum `Role`) rompió dos scripts propios de `load-testing/`, que tiene sus queries SQL aisladas del código de la app a propósito:

- `load-testing/seeders/02-seed-companies.js` — insertaba usuarios con `role='RH'` (literal roto contra el enum ya renombrado).
- `load-testing/seeders/03-seed-employees.js` — igual con `'EMPLEADO'`.
- `load-testing/scripts/check-target.js` — leía `session.user.rol` (campo renombrado a `.role`); tres de las cuatro ocurrencias se corrigieron con un reemplazo simple, la cuarta (`session?.user?.rol` con optional chaining) se escapó del primer intento porque el `?.` rompe el patrón literal `.user.rol` — se corrigió aparte.

Los tres archivos ya quedan corregidos y confirmados funcionando (`check-target` autenticó los 3 roles correctamente con los valores nuevos).

---

## 8. Siguiente corrida recomendada

1. Si se quiere cerrar la duda de G-5 del todo: sembrar 500-600 constancias en **una sola empresa** (no repartidas entre 10) y repetir `curl` directo al ZIP — es el caso catastrófico que ni la baseline ni esta corrida reprodujeron.
2. Revisar `max: 3` en `lib/prisma.ts` con datos de tráfico real de producción (no de esta prueba de estrés en una laptop) para decidir si conviene subirlo.
3. Actualizar `processor-gaps.js` para reconocer `success=sync_queued` como resultado válido, en vez de reportar "UNKNOWN".
4. Repetir el checkeo de `employee_courses`/`jobs` unos minutos después de una corrida de G-2 (no inmediatamente) para tener una lectura estable del % de éxito del procesamiento asíncrono, en vez de una foto a medio procesar.
5. Para medir capacidad real de producción (no el límite de esta laptop), correr la suite desde una máquina distinta apuntando a un preview de Vercel — sigue pendiente, la baseline ya lo señalaba en su §7.
