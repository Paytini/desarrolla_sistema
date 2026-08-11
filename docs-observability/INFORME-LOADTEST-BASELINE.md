# Informe de Load Testing — Baseline F0 (antes de optimizar)

**Fecha:** 2026-08-02
**Suite:** [load-testing/](../load-testing/) — Artillery v2.0.33 + engine Playwright, seeders propios, mock del bridge WordPress.
**Objetivo medido:** build de **producción** de la app corriendo en `localhost:3005` (no producción real — ver §1).
**Escala sembrada:** 10 empresas · **2,000 empleados** · 10,000 inscripciones a cursos · 600 constancias.

Informes relacionados: [INFORME-RENDIMIENTO.md](INFORME-RENDIMIENTO.md) (hallazgos) · [INFORME-CAPACIDAD.md](INFORME-CAPACIDAD.md) (estimaciones a validar) · [INFORME-FINANCIERO.md](INFORME-FINANCIERO.md).

---

## 1. Cómo leer estos números (importante)

Las pruebas corrieron **en una sola laptop** que simultáneamente ejecutaba: el servidor Next.js, Artillery, hasta 8 navegadores Chromium headless, el mock del bridge y el cliente de Postgres. La base de datos es la **Supabase real** (plan actual), accedida por internet.

Por lo tanto:

- ✅ **Son válidos y comparables**: el costo relativo de cada operación, el orden de los cuellos de botella, y el punto donde la latencia se dispara. Sirven como **línea base para medir el efecto de la Fase 1**.
- ❌ **NO son la capacidad de producción**: Vercel escala horizontalmente (muchas instancias), esta prueba mide **una sola instancia compartiendo CPU con el generador de carga**. Los números absolutos son un **piso**, no el techo real.
- ⚠️ La corrida completa (`npm run run-all`) reportó 90-100% de error en varios escenarios. Investigado a fondo (§4): **la app no falló ni se cayó** — encoló peticiones hasta superar el timeout por defecto de Artillery. El log del servidor tiene solo 110 líneas en toda la corrida.

---

## 2. Resultados limpios: costo por operación (secuencial, sin contención)

Medido con sesiones reales vía la API de NextAuth, una petición a la vez, con 2,000 empleados en la base.

| Operación | Latencia | Lectura |
|---|---|---|
| **Login completo** (csrf → credentials → session) | **~950 ms** | El más caro con diferencia. Confirma el hallazgo **A-1**: bcryptjs (JS puro, costo 12) + llamada externa a Turnstile + 3 queries secuenciales. |
| Primer login tras arranque (frío) | 7,755 ms | Cold start: construcción del pool de Prisma + TLS a Supabase. Confirma **G-3**. |
| `/employee/courses` | 657 ms | Página más pesada del empleado. |
| `/employee/certificates` | 653 ms | |
| `/company/{slug}/home` (RH) | 312 ms | Confirma **A-4**: carga todos los empleados con cursos y certificados para mostrar 3 números. |
| `/company/{slug}/employees` | 139 ms | |
| `/company/{slug}/certificates` | 131 ms | |
| `/superadmin/companies` | 169 ms | |
| `/superadmin/reports` | **76 ms** | Rápido **porque la caché estaba caliente** — justamente la caché que el hallazgo **G-4** dice que se destruye cada 15 s en cuanto hay empleados navegando. |
| **Descarga DC-3** (`/api/certificates/{id}/dc3`) | **1,162 ms** · PDF de 194 KB | Confirma **A-3**: el PDF se genera de cero en cada descarga (plantilla + pdf-lib + 2 pasadas de sharp + fetch de la firma). |

---

## 3. Techo de throughput por página (sesión ya establecida)

Ráfagas concurrentes contra la misma página, **sin login** (aísla el costo de servir la página):

| Página | 10 concurrentes | 25 | 50 | 100 | Techo observado |
|---|---|---|---|---|---|
| `/employee/courses` | p95 750 ms · 13 rps | p95 1,123 ms · 21 rps | p95 2,758 ms · 17.5 rps | p95 5,614 ms · 17.5 rps | **~17-21 req/s** |
| `/company/{slug}/home` | p95 5,352 ms · 1.9 rps | p95 3,387 ms · 7.4 rps | p95 5,017 ms · 10 rps | — | **~10 req/s** |

**Dato clave: 0 errores en todos los casos** (100% HTTP 200 incluso con 100 peticiones simultáneas). La app **no falla bajo carga: encola**. La latencia crece linealmente mientras el throughput se estanca — firma clásica de saturación de CPU/conexiones, no de errores lógicos.

La página del RH (`home`) tiene la mitad del techo de la del empleado, coherente con que carga empleados + cursos + certificados completos para calcular 3 KPIs.

---

## 4. Qué pasó en la corrida completa (y por qué el 95% de error)

Resultados crudos generados por la suite (`load-testing/reports/INFORME-LOADTEST-2026-08-02.md`):

| Escenario | Requests | p50 | p95 | VUs ok | VUs fail | Error % |
|---|---|---|---|---|---|---|
| 01-login-storm | 5,975 | 837 ms | 6,703 ms | 147 | 3,273 | 95.7% |
| 02-employee-navigation | 0 | — | — | 0 | 780 | 100% |
| 03-rh-journey | 0 | — | — | 0 | 360 | 100% |
| 04-superadmin-dashboard | — | — | — | 120 | 0 | 0% |
| 05-certificates | 2,105 | 1,086 ms | 6,440 ms | 110 | 910 | 89.2% |
| 06-peak-mixed | 4,891 | 1,755 ms | 6,703 ms | 2 | 3,598 | 99.9% |

**Diagnóstico de las causas** (contadores de Artillery + log del servidor):

1. **`ERR_SOCKET_TIMEOUT` (3,273 en login-storm, 3,121 en peak-mixed)** — timeouts **del cliente Artillery**, no errores de la app. La app sirvió 2,404 respuestas 200 en ese mismo escenario. Las peticiones se encolaron detrás del trabajo de CPU del login.
2. **`prisma:error (EAUTHTIMEOUT) ... code 08006`** — apareció en el log del servidor durante el pico. **Es la saturación de conexiones a Postgres predicha en el hallazgo G-3**, reproducida en vivo: el driver no logró autenticar nuevas conexiones.
3. **`Turnstile verification request failed { message: 'fetch failed' }`** + `errors.fetch failed` (469 en peak-mixed, 780 en employee-navigation) — bajo concurrencia alta, las llamadas salientes a Cloudflare fallaron. Medida en reposo, esa llamada tarda solo **65-150 ms**; el problema es que **cada login depende de una llamada HTTPS externa sin timeout** (patrón del hallazgo G-1) y cientos simultáneas agotan sockets.
4. **Contención del generador de carga**: Chromium + Artillery + Next.js en la misma máquina. Los escenarios Playwright (02, 03) reportaron 100% de fallo, pero en corridas aisladas los mismos flujos pasaron 15/15 sin errores.

**Conclusión honesta:** el 95% de error mide el límite de *esta máquina de prueba*, no el de la app. Lo que sí es señal legítima y reproducible es: **el login satura primero, la conexión a Postgres se agota bajo pico, y la app degrada encolando en vez de fallar.**

---

## 5. Confrontación con las predicciones del informe de rendimiento

| Hallazgo predicho | ¿Se reprodujo? | Evidencia |
|---|---|---|
| **G-3** Pool de conexiones sin límites → agotamiento | ✅ **Sí** | `EAUTHTIMEOUT / 08006` en el log bajo pico; cold start de 7.7 s construyendo el pool |
| **A-1** Login caro (bcryptjs + Turnstile + queries seriales) | ✅ **Sí** | 950 ms secuencial; es la operación que satura primero |
| **A-3** DC-3 regenerado en cada descarga | ✅ **Sí** | 1,162 ms y 194 KB por PDF, sin caché |
| **A-4** Dashboards con queries sin límite | ✅ **Parcial** | RH `home` tiene la mitad del techo (10 rps) que la página del empleado |
| **G-4** Caché global del superadmin frágil | ⚠️ **No medido aún** | `/superadmin/reports` respondió en 76 ms con caché caliente; falta el escenario que mide el efecto del polling invalidándola |
| **G-1** Llamadas externas sin timeout | ✅ **Sí (vía Turnstile)** | `fetch failed` masivo bajo carga en la llamada a Cloudflare |
| **G-2** Enrolamiento masivo secuencial | ❌ **No medido** | Requiere escenario que dispare `syncCompanyPackageEnrollments` |
| **G-5** ZIP de constancias en memoria | ⚠️ **Solo a escala baja** | ZIP devolvió 200 con 6 constancias; falta probarlo con 600 |

---

## 6. Hallazgo adicional (no previsto): la app no compilaba — ✅ RESUELTO

> **Actualización 2026-08-02:** resuelto por el equipo poco después de detectarlo. Se deja el registro porque explica por qué la baseline se corrió con un `npm install --no-save`.

Al preparar el entorno, `npm run build` **falló**:

```
Module not found: Can't resolve '@aws-sdk/client-ses'
```

Estado verificado de las dos dependencias que se importan sin declarar:

| Paquete | Importado en | Estado hoy |
|---|---|---|
| `@aws-sdk/client-ses` | `lib/ses.ts:1` | ✅ **Declarado** en `package.json` (`^3.1097.0`). Corregido. |
| `sharp` | `lib/dc3-pdf.ts:3`, `app/api/upload/company-logo/route.ts:2`, `app/api/upload/instructor-signature/route.ts:2` | ⚠️ Sigue sin declarar, pero **resuelve** como `optionalDependency` de Next.js (0.34.5). El build funciona. |

**Qué queda pendiente, y con qué gravedad real:** importar `sharp` sin declararlo funciona hoy solo porque Next lo arrastra. Se rompería con `npm install --no-optional`, en un entorno donde el binario nativo no compile, o si una versión futura de Next dejara de incluirlo. No es un bloqueo — es una dependencia implícita que conviene hacer explícita con `npm install sharp`.

Esto matiza el hallazgo **M-6** del informe de rendimiento: era correcto que `sharp` no está declarado, pero la consecuencia es fragilidad latente, no un build roto.

---

## 6-bis. Segunda iteración de la metodología (2026-08-02, misma jornada)

La baseline de arriba tenía dos defectos de método que se corrigieron. Quedan documentados porque cambian cómo hay que leer los números.

### Defecto 1: login en cada iteración

Los escenarios `01`-`06` hacen login y luego ~4 peticiones. Ratio real de un empleado: entra **una vez** y navega 30-45 min. Como el login cuesta 950 ms y una página 130-650 ms, el test medía *"cuántos logins por segundo aguanta"*, no *"cuántos usuarios navegando aguanta"*.

**Corrección:** `artillery/21-http-user-session.yml` hace login una sola vez por usuario virtual y repite la navegación en un `loop` con pausas aleatorias. Cada página del loop verifica con `matchesRegexp` contra texto que solo existe en la versión autenticada, porque el middleware redirige a `/login` con un 200 y una comprobación de status no detectaría la sesión perdida.

**Efecto medido** (misma máquina, mismos datos):

| | Escenario antiguo (login por iteración) | Nuevo (sesión reutilizada) |
|---|---|---|
| Ratio peticiones por login | ~4 : 1 | **14.7 : 1** (con `pagesPerSession=4`; ~40:1 con el default de 12) |
| p95 | 6,703 ms ❌ | **2,322 ms** ✅ |
| p99 | 7,710 ms | **3,012 ms** ✅ |
| Verificaciones de contenido autenticado | — | 332 OK |

Con el mismo hardware y el mismo tráfico de fondo, el p95 pasa de fallar el umbral a cumplirlo. La diferencia no es que la app mejorara: es que antes se medía la operación equivocada.

### Defecto 2: no se miraba el servidor

Se añadió `scripts/db-watch.js`, que muestrea `pg_stat_activity` y la latencia de `/api/health` durante la corrida. **Confirma G-3 con evidencia directa:**

```
[+75s]   total=12  active=1  health: 200 (2ms)
[+149s]  total=13  active=1  health: 200 (1332ms)
[+159s]  total=17  active=1  health: 200 (1ms)
[+169s]  total=17  active=1  health: 200 (2104ms)
[+204s]  total=20  active=1  health: 200 (97ms)
[+231s]  total=20  active=1  health: 200 (1ms)     ← latencia recuperada, conexiones NO
```

Las conexiones subieron de 12 a 20 siguiendo la carga y **no volvieron a bajar** cuando la latencia ya se había normalizado. Eso es acumulación de conexiones, no uso transitorio.

Dato adicional del muestreo: **la instancia de Supabase tiene `max_connections = 60`** — corresponde al tier más bajo. Con el pool de la app sin límite (default 10 por instancia) bastan ~6 instancias lambda concurrentes para agotarla.

> Matiz honesto: `DATABASE_URL` apunta al pooler Supavisor, así que lo que se cuenta son los backends del pooler, no los sockets crudos del `pg.Pool` de la app. Por eso una carga ligera no movió la aguja y sí lo hizo una fuerte.

### Avalancha real de las 8:00 AM

`arrivalRate: 40` significa "40 usuarios nuevos **por segundo**", que no es lo que pasa a las 8 AM. `sim:spike` usa `arrivalCount`, que reparte N usuarios en una ventana: 30 usuarios llegando en 5 s dieron **p95 de login de 5,379 ms**. Ese es el costo de la simultaneidad, no del volumen sostenido.

### Modo navegador, ahora separado

`npm run sim:browser` abre Chromium **con ventana visible** y hace el login real por la interfaz (escribe el correo y la contraseña, espera a que Turnstile habilite el botón, lo pulsa). Sirve para ver la app y validar flujos, no para medir capacidad — cada navegador cuesta 150-300 MB y compite con el servidor por CPU. Está limitado a 10 usuarios virtuales con aviso.

Medición de un recorrido de RH con navegador real: login 3,706 ms (incluye el tecleo lento deliberado), página de progreso 5,344 ms.

---

## 6-ter. Escenarios dirigidos: G-2, G-4, G-5

Tres escenarios construidos específicamente para poner a prueba los hallazgos que la corrida general no ejercitaba.

### G-2 — Enrolamiento masivo: ✅ CONFIRMADO, peor de lo estimado

`npm run sim:enrollment` ([30-mass-enrollment.yml](../load-testing/artillery/30-mass-enrollment.yml)). Se invoca por Playwright (un superadmin pulsa el botón de sincronizar) porque los Server Actions de Next no se pueden llamar por HTTP de forma fiable: el nombre del campo del formulario (`_1_$ACTION_ID_...`) depende de la posición en el DOM.

Barrido real sobre las 3 empresas sembradas, 40 empleados cada una:

| Empresa | Tiempo de pared |
|---|---|
| lt-empresa-01 | 158.2 s |
| lt-empresa-02 | 134.9 s |
| lt-empresa-03 | 140.3 s |
| **Media** | **144.5 s para 40 empleados** |

Son **~4× la estimación conservadora** del propio informe (36 s). Extrapolando linealmente, 200 empleados ≈ 12 minutos, y 1,000 ≈ una hora — en una operación que hoy vive dentro de una petición HTTP.

**Hallazgo adicional:** cerrar el navegador a mitad de la sincronización **no abortó la acción del servidor** (siguió hasta la fila 195 de 200). En local no hay `maxDuration` que la corte; en Vercel sí la mataría, dejando el estado a medias — que es exactamente el riesgo descrito.

### G-5 — ZIP de constancias: ⚠️ confirmado en dirección, caso catastrófico no reproducido

`npm run sim:zip` ([31-zip-constancias.yml](../load-testing/artillery/31-zip-constancias.yml)).

| Prueba | Resultado |
|---|---|
| 1 petición, 12 constancias | 5.96 s · 2.33 MB |
| 3 peticiones concurrentes | 6.7-7.1 s cada una (~15% más lentas), sin fallos |

Da **~500 ms por PDF**, generados en serie y retenidos en memoria — el mecanismo es el descrito. Pero los datos sembrados solo tenían 12 constancias por empresa, lejos de las 500 del caso que preocupa. **El OOM/timeout no se observó**; la extrapolación (500 × 500 ms ≈ 4 min y cientos de MB en memoria) es aritmética, no medición.

### G-4 — Tormenta de invalidación de caché: ❌ REFUTADO

`npm run sim:cache-storm` ([32-cache-invalidation-storm.yml](../load-testing/artillery/32-cache-invalidation-storm.yml)). Diseño: 60 empleados haciendo poll al intervalo real de 15 s durante 60 s, mientras un superadmin recarga sus dashboards; contra una corrida de control de 40 s sin ningún poller.

**Resultado: delta de latencia ~0 ms.** Dos corridas completas, mismo resultado.

**Causa raíz:** el código llama `revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")`. En Next.js 16 ese segundo argumento cambia el mecanismo por completo — marca el tag como *stale* y aplica *stale-while-revalidate*: sirve el contenido viejo al instante y refresca en segundo plano. La expiración inmediata y bloqueante que asumió el informe solo ocurre **sin** ese segundo argumento (forma deprecada). Verificado en la documentación oficial de Next.js y en el código de `revalidate.ts`. El `git blame` muestra que `"max"` está ahí desde mayo de 2026, antes de la auditoría.

**Consecuencia:** el hallazgo G-4 baja de 🔴 Grave a 🟡 Media en [INFORME-RENDIMIENTO.md](INFORME-RENDIMIENTO.md), y el plan de Fase 1 ya no necesita tocar `revalidateTag` — solo bajar la frecuencia del polling, que sigue siendo tráfico desperdiciado.

**Este es el resultado más valioso de toda la campaña de pruebas:** una predicción hecha por lectura de código que la medición desmintió. Justifica por sí sola el costo de construir el suite.

---

## 7. Siguiente corrida recomendada

Esta baseline sirve para comparar. Después de aplicar la **Fase 1** del plan de acción (bcrypt nativo, pool `pg` configurado, poll a 60 s sin invalidación global, índices, timeouts al bridge):

1. Repetir exactamente los mismos comandos: `npm run seed` (misma escala) → `npm run run-all`.
2. Métricas a comparar contra esta tabla: login secuencial (objetivo **< 300 ms**, hoy 950 ms), techo de `/employee/courses` (objetivo **> 40 rps**, hoy 17-21), techo de `/company/home` (objetivo **> 30 rps**, hoy 10), descarga DC-3 (objetivo **< 100 ms** con el PDF ya almacenado, hoy 1,162 ms).
3. Para medir capacidad **de producción** de verdad, correr la suite desde una máquina distinta apuntando a un despliegue de staging en Vercel — no desde la misma máquina que ejecuta la app.
4. Escenarios que faltan por construir: enrolamiento masivo (G-2), ZIP con 600 constancias (G-5), y uno que mida la invalidación de caché por polling (G-4).

---

## 8. Cómo reproducir

```bash
cd load-testing
npm install
cp .env.app.example .env.app

# terminal A
npm run mock-bridge
# terminal B  (build de produccion con claves Turnstile de prueba)
./scripts/start-target.sh

npm run seed          # 10 empresas x 200 empleados (configurable con LT_COMPANIES / LT_EMPLOYEES_PER_COMPANY)
npm run check-target  # verifica login de los 3 roles
npm run run-all       # 6 escenarios + informe markdown en reports/
npm run teardown      # borra TODO lo sembrado (verifica residuo 0)
```

Los datos sembrados viven en un namespace aislado (empresas `lt-*`, correos tipo `emp001-lt-empresa-01@yopmail.com`, cursos 900101-900199) y el teardown fue verificado: deja **residuo 0** sin tocar ninguna fila real.

> Nota: la corrida baseline documentada arriba se hizo con el formato de correo anterior (`emp1@lt-empresa-01.lt.d360.test`). El cambio a yopmail es posterior y solo afecta a los identificadores, no a los tiempos medidos.

Detalle de cada script del suite: [load-testing/SCRIPTS.md](../load-testing/SCRIPTS.md).
