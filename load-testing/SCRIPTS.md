# Cómo funciona cada script

Referencia de todo lo que hay en `load-testing/`: qué hace cada pieza, qué escribe, y en qué orden se usan.

Manual completo del suite. El [README](README.md) es solo la puerta de entrada; todo lo operativo vive aquí.

Índice: [Orden de uso](#orden-de-uso) · [Runbooks por escenario](#runbooks-por-escenario) · [Diagnóstico rápido](#diagnóstico-rápido) · [Configuración](#configuración) · [Seeders](#seeders) · [Mock del bridge](#mock-del-bridge) · [Scripts](#scripts) · [Escenarios](#escenarios) · [Datos generados](#datos-generados) · [Seguridad de los datos](#seguridad-de-los-datos)

---

## Orden de uso

```
config.js ──► seeders/ ──► data/payloads/*.csv ──► artillery/*.yml ──► reports/
                 │                                       │
                 └── necesita: mock-bridge + app         └── ejecutados por: scripts/run-*.js
```

1. `npm run verify` — comprueba que la base responde y las tablas existen
2. `npm run mock-bridge` — sustituto de WordPress (terminal aparte)
3. `./scripts/start-target.sh` — la app en `:3005` (terminal aparte)
4. `npm run seed` — crea empresas, usuarios y datos académicos
5. `npm run check-target` — confirma que los 3 roles pueden entrar
6. `npm run simulate:http` / `simulate:browser` / lo que quieras medir
7. `npm run teardown` — borra todo lo sembrado

---

## Runbooks por escenario

### Base común (siempre, antes de cualquier escenario)

Necesitas **tres terminales**, todas con `cd load-testing`. Las dos primeras quedan ocupadas mientras dure la sesión de pruebas.

**Solo la primera vez:**
```bash
npm install
cp .env.app.example .env.app
npm run verify              # confirma que la base responde
```

**Terminal A — mock de WordPress** (se queda corriendo):
```bash
npm run mock-bridge
```
Espera ver: `lt-mock-bridge en http://localhost:4380/... (latencia 300ms, frio 5%)`

**Terminal B — la app** (se queda corriendo):
```bash
./scripts/start-target.sh
```
Compila y arranca en `:3005`. Tarda ~2 minutos por el build. Si ya compilaste y no tocaste `.env.app`, puedes saltarte el build:
```bash
cd .. && set -a && . ./.env && . ./load-testing/.env.app && set +a && npx next start -p 3005
```
Espera ver: `✓ Ready` y que `curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/api/health` devuelva `200`.

**Terminal C — datos y verificación:**
```bash
npm run seed
npm run check-target
```

> **No sigas si `check-target` falla.** Es la puerta de entrada: si no pasa, ningún escenario va a funcionar. Ver [diagnóstico rápido](#diagnóstico-rápido) más abajo.

A partir de aquí, todo ocurre en la terminal C.

> **Ojo con la escala al resembrar.** Los seeders son idempotentes hacia arriba, no hacia abajo: si ya tienes 10 empresas × 200 empleados y siembras con `LT_COMPANIES=1 LT_EMPLOYEES_PER_COMPANY=5`, **no se borra nada** — los 2,000 empleados siguen ahí. Además el contador que imprime (`OK empleados: 5`) cuenta los que intentó crear en esa pasada, no el total de la base. Si quieres una escala exacta, corre `npm run teardown` antes de sembrar.

---

### Modo navegador — ver la app funcionando

Siembra pequeña, basta con unos pocos usuarios:

```bash
LT_COMPANIES=2 LT_EMPLOYEES_PER_COMPANY=10 npm run seed
npm run check-target
LT_BROWSER_VUS=1 LT_BROWSER_SLOWMO_MS=600 LT_BROWSER_DURATION_SEC=60 npm run simulate:browser
```

Con `LT_BROWSER_VUS=1` la ventana aparece de inmediato. Con el default (2) Artillery los reparte a lo largo de la duración, así que el segundo tarda en salir.

Para los tres roles con más ventanas: `LT_BROWSER_VUS=3 npm run simulate:browser`.

---

### Modo HTTP — medir capacidad

```bash
LT_COMPANIES=5 LT_EMPLOYEES_PER_COMPANY=100 npm run seed
npm run check-target
```

Terminal D en paralelo (opcional pero recomendado — es lo que revela el agotamiento de conexiones):
```bash
npm run db:watch -- --label http
```

Terminal C:
```bash
npm run simulate:http
```

Ajustes habituales:
```bash
# corrida corta de prueba
LT_HTTP_DURATION_SEC=30 LT_HTTP_ARRIVAL_RATE=2 LT_PAGES_PER_SESSION=4 npm run simulate:http

# más presión
LT_HTTP_ARRIVAL_RATE=10 LT_HTTP_DURATION_SEC=300 npm run simulate:http
```

Al terminar, corta `db:watch` con Ctrl-C para ver el resumen de picos.

---

### Avalancha de las 8:00 AM

Siembra suficientes usuarios distintos para que la avalancha no reutilice siempre los mismos (Artillery cicla el CSV si se le acaban):

```bash
LT_COMPANIES=5 LT_EMPLOYEES_PER_COMPANY=100 npm run seed   # 500 empleados
npm run check-target
npm run db:watch -- --label spike                          # terminal D
LT_SPIKE_COUNT=200 LT_SPIKE_DURATION_SEC=10 npm run simulate:spike
```

`arrivalCount` reparte los 200 usuarios dentro de la ventana de 10 s — llegada casi simultánea, no 200/segundo.

---

### G-2 · Enrolamiento masivo

Es el escenario **más lento** del suite: ~145 segundos por empresa de 40 empleados. Empieza con poco.

```bash
LT_COMPANIES=1 LT_EMPLOYEES_PER_COMPANY=40 npm run seed
npm run check-target
npm run simulate:enrollment
```

Usa Playwright (un superadmin pulsa el botón de sincronizar), así que abrirá un navegador. Sube `LT_COMPANIES` solo si quieres ver cómo escala — cada empresa suma otros ~2.5 minutos.

Para ver cómo empeora con un WordPress lento:
```bash
LT_BRIDGE_LATENCY_MS=800 npm run mock-bridge   # reinicia el mock en la terminal A
```

---

### G-5 · ZIP de constancias

Solo el 30% de los empleados recibe constancia, así que para tener volumen hay que sembrar de más:

```bash
LT_COMPANIES=2 LT_EMPLOYEES_PER_COMPANY=200 npm run seed   # ≈120 constancias
npm run check-target
npm run simulate:zip
```

Mide tiempo de pared y tamaño del ZIP. Con 12 constancias tarda ~6 s; el interés está en ver cómo crece.

---

### G-4 · Tormenta de invalidación de caché

Necesita muchos empleados haciendo poll a la vez:

```bash
LT_COMPANIES=3 LT_EMPLOYEES_PER_COMPANY=50 npm run seed    # 150 empleados
npm run check-target
npm run simulate:cache-storm
```

El escenario corre su propio control interno (superadmin sin pollers) y compara. El dato que importa es el **delta** entre ambas mitades, no los tiempos absolutos.

---

### Corrida completa (baseline comparable)

Los 6 escenarios originales en secuencia, ~25-30 minutos:

```bash
npm run teardown                                            # empieza limpio
LT_COMPANIES=10 LT_EMPLOYEES_PER_COMPANY=200 npm run seed   # 2,000 empleados
npm run check-target
npm run db:watch -- --label baseline                        # terminal D
npm run run-all
```

Genera `reports/INFORME-LOADTEST-<fecha>.md` con la tabla comparativa.

---

### Al terminar, siempre

```bash
npm run teardown
```

Debe imprimir `residuo namespace: 0`. Luego puedes cortar las terminales A y B.

---

### Diagnóstico rápido

| Síntoma | Causa | Solución |
|---|---|---|
| `ECONNREFUSED` en `localhost:3005`, el navegador se abre y cierra al instante | La app no está corriendo | Arranca la terminal B |
| `check-target` falla con `fetch failed` | Igual que el anterior | Igual |
| Login falla con `CredentialsSignin` | Datos no sembrados, o Turnstile sin las claves de prueba | `npm run seed`, y revisa que `.env.app` tenga las claves `1x0000...` **y** que la app se compilara con ese archivo cargado |
| `401` del mock del bridge | Terminal A caída o clave distinta | Reinicia el mock; `LT_BRIDGE_KEY` debe coincidir con `WP_BRIDGE_PORTAL_KEY` de `.env.app` |
| El build falla con `Can't resolve '@aws-sdk/client-ses'` | Dependencias no declaradas en el `package.json` de la app | `cd .. && npm install @aws-sdk/client-ses sharp` |
| `residuo namespace` distinto de 0 | Algo quedó fuera de los patrones de borrado | No lo ignores — revisa qué quedó antes de volver a sembrar |
| Muchos `ERR_SOCKET_TIMEOUT` en modo navegador | Demasiados Chromium compitiendo con la app | Baja `LT_BROWSER_VUS`, o usa `simulate:http` si lo que quieres es medir |

---

## Configuración

### `config.js`

Único punto de configuración. Lee el `.env` de la raíz del repo y acepta variables `LT_*` que lo sobrescriben. Todo lo demás lo importa con `require("../config")`.

Bloques que expone: conexión (`dbUrl`, `targetUrl`), mock del bridge (`bridgePort`, latencias), escala del sembrado (`scale`), namespace de datos (`namespace`), y los perfiles de simulación (`sim.browser`, `sim.http`, `sim.spike`).

#### Variables de entorno

| Variable | Default | Para qué |
|---|---|---|
| `LT_DATABASE_URL` | `DATABASE_URL` del `.env` | Base de datos objetivo (usa otra para apuntar a un preview) |
| `LT_TARGET_URL` | `http://localhost:3005` | URL de la app. Los runners la inyectan como override |
| `LT_BRIDGE_PORT` | `4380` | Puerto del mock de WordPress |
| `LT_BRIDGE_KEY` | `lt-mock-bridge-key` | Clave compartida con el mock |
| `LT_BRIDGE_LATENCY_MS` | `300` | Latencia simulada del bridge |
| `LT_BRIDGE_COLD_MS` / `LT_BRIDGE_COLD_RATE` | `6000` / `0.05` | Arranque en frío del WP real (medido: 6+ s) |
| `LT_BRIDGE_ERROR_RATE` | `0` | Fracción de llamadas al bridge que fallan |

#### Datos sembrados

| Variable | Default | Para qué |
|---|---|---|
| `LT_COMPANIES` | `10` | Empresas a crear |
| `LT_EMPLOYEES_PER_COMPANY` | `200` | Empleados por empresa |

#### Modo navegador

| Variable | Default | Para qué |
|---|---|---|
| `LT_BROWSER_VUS` | `2` | Navegadores concurrentes (avisa por encima de 5, tope 10) |
| `LT_BROWSER_HEADED` | `true` | Ventana visible |
| `LT_BROWSER_SLOWMO_MS` | `250` | Ralentiza cada acción para poder seguirla |
| `LT_BROWSER_DURATION_SEC` | `120` | Duración |
| `LT_BROWSER_PAGES` | `4` | Páginas por sesión |

#### Modo HTTP

| Variable | Default | Para qué |
|---|---|---|
| `LT_HTTP_ARRIVAL_RATE` | `3` | Usuarios nuevos por segundo |
| `LT_HTTP_DURATION_SEC` | `180` | Duración |
| `LT_PAGES_PER_SESSION` | `12` | Ciclos de navegación **por login** |
| `LT_THINK_MIN_SEC` / `LT_THINK_MAX_SEC` | `8` / `25` | Pausa aleatoria entre páginas |
| `LT_SPIKE_COUNT` / `LT_SPIKE_DURATION_SEC` | `200` / `10` | Avalancha: N usuarios en D segundos |
| `LT_DB_SAMPLE_MS` | `2000` | Intervalo de muestreo de `db:watch` |

### `.env.app` (copiado de `.env.app.example`)

Variables con las que arranca **la app objetivo**, no los scripts. Lo importante:

- Claves de prueba de Turnstile (las oficiales de Cloudflare, siempre pasan) — sin esto ningún login scriptado funciona.
- `WP_BRIDGE_BASE_URL` apuntando al mock en `localhost:4380`, nunca al WordPress real.

Ojo: `NEXT_PUBLIC_*` se hornea en tiempo de build, así que la app tiene que **compilarse** con este archivo cargado. Eso lo hace `start-target.sh`.

---

## Seeders

Todos escriben en la base real, siempre dentro del namespace aislado (ver [Seguridad de los datos](#seguridad-de-los-datos)). Son idempotentes: correrlos dos veces no duplica nada.

### `seeders/lib/db.js`
Pool de `pg` y tres ayudantes: `query()`, `getPool()` y `bulkInsert(tabla, columnas, filas, onConflict)` — que arma un `INSERT` multi-fila parametrizado. Sin él, sembrar 10,000 filas serían 10,000 viajes a la base.

### `seeders/lib/names.js`
Nombres deterministas por índice: 20 nombres × 20 apellidos que se ciclan, más nombres de empresa y CURP sintéticos. Determinista a propósito: el mismo índice da siempre la misma persona, así que dos corridas son comparables.

### `seeders/lib/emails.js`
**Fuente única de verdad de los correos.** Define los tres formatos y —lo importante— los patrones exactos que usa el teardown para borrar. Si cambias un formato aquí, el borrado se mantiene consistente solo.

```
RH        rh-lt-empresa-01@yopmail.com
Empleado  emp001-lt-empresa-01@yopmail.com
Import    imp-lt-import-1785681101688-0@yopmail.com
```

### `seeders/00-verify-connection.js` — `npm run verify`
Solo lectura. Cuenta filas de las 9 tablas que usa el suite y confirma que existen. Es lo primero que hay que correr cuando algo falla: descarta problemas de conexión antes de mirar nada más.

### `seeders/01-seed-catalog.js`
Crea el catálogo académico:
- 1 paquete `LT Paquete Masivo`
- 5 filas en `package_courses` con `wp_course_id` **900101–900105**
- 5 filas en `curso_dc3_metadata` (duración, área temática, agente capacitador, instructor)

> ⚠️ Esos `wp_course_id` son **inventados**. No existe ningún curso en Tutor LMS con esos identificadores. Son referencias que solo viven en Postgres, y el mock del bridge finge que existen cuando la app pregunta.

Escribe `data/catalog.json` con `{packageId, courseIds}`, que leen los seeders 02 y 03.

### `seeders/02-seed-companies.js`
Por cada empresa (`LT_COMPANIES`):
- Una fila en `companies` con slug `lt-empresa-NN`, RFC sintético y `contracted_seats` = empleados + 10
- Un usuario RH con rol `RH`
- Una fila en `company_packages` ligando la empresa al paquete LT

Escribe `data/companies.json` y `data/payloads/rh-credentials.csv`.

### `seeders/03-seed-employees.js`
El pesado. Por cada empresa crea `LT_EMPLOYEES_PER_COMPANY` empleados, y por cada empleado:
- Una fila en `employees` (departamento "Operaciones", puesto "Analista", ocupación "07.2 / Supervision de seguridad", `wp_user_id` desde 910000)
- Una fila en `users` con rol `EMPLEADO`
- **5 filas en `employee_courses`** — una por curso del paquete, con progreso variado (`(índice × 7 + curso × 23) % 101`) y ~20% marcados como completados
- Una constancia para el **30% de los empleados**, con folio `LT-D360-{empresaId}-{empleadoId}`

Detalle que importa: la contraseña se hashea con bcrypt **una sola vez** y se reutiliza. Con costo 12, hacer 2,000 hashes tomaría ~10 minutos.

> Las filas de `employee_courses` **no son inscripciones reales en Tutor LMS**. Son el espejo local que normalmente llenaría la sincronización con WordPress; aquí se escriben directo para tener volumen que renderizar.

Escribe `data/payloads/employee-credentials.csv` y `certificates.csv` (con los IDs reales de constancia, para poder pedir sus PDFs).

### `seeders/04-generate-csv.js`
Genera los CSV que un RH sube por la interfaz durante las pruebas: `data/import/rh-import-20.csv` y `rh-import-100.csv`. Usan la cabecera exacta de la plantilla real de la app y correos únicos por corrida (con marca de tiempo), para que reimportar no choque con duplicados.

### `seeders/99-teardown.js` — `npm run teardown`
Borra todo lo sembrado, en orden de llaves foráneas (notificaciones → constancias → cursos → empleados → sesiones → usuarios → auditoría → empresas → catálogo).

Termina verificando que el residuo sea **0** y sale con código 1 si no lo es. Si alguna vez ves un residuo distinto de cero, no lo ignores: significa que algo quedó fuera de los patrones y el siguiente sembrado partirá de un estado sucio.

---

## Mock del bridge

### `mock-bridge/server.js` — `npm run mock-bridge`

Servidor HTTP en `:4380` que imita los endpoints del plugin de WordPress (`/wp-json/desarrolla360/v1/*`) con las formas de respuesta exactas que la app espera. Exige el header `X-D360-Portal-Key`; sin él devuelve 401.

Existe por dos razones: golpear el WordPress real con miles de peticiones lo degradaría para usuarios reales, y sin mock no habría forma de simular condiciones adversas.

Simula latencia configurable:

| Variable | Default | Qué simula |
|---|---|---|
| `LT_BRIDGE_LATENCY_MS` | 300 | Respuesta normal del bridge |
| `LT_BRIDGE_COLD_RATE` / `LT_BRIDGE_COLD_MS` | 0.05 / 6000 | 5% de llamadas en frío a 6 s — el arranque real de PHP que medí |
| `LT_BRIDGE_ERROR_RATE` | 0 | Fracción de llamadas que devuelven 500 |

Sube `LT_BRIDGE_ERROR_RATE` para probar cómo degrada la app cuando WordPress falla.

---

## Scripts

### `scripts/start-target.sh`
Carga `.env.app`, compila (`npm run build`) y arranca la app en `:3005`. Compila cada vez a propósito: las variables `NEXT_PUBLIC_*` se incrustan en el build, así que cambiarlas exige recompilar.

### `scripts/check-target.js` — `npm run check-target`
Puerta de entrada a cualquier corrida: hace login por HTTP con los tres roles (superadmin real, un RH sembrado, un empleado sembrado) y falla ruidosamente si alguno no obtiene sesión.

Corre esto **siempre** antes de una carga larga. Un fallo aquí significa datos mal sembrados o Turnstile mal configurado; descubrirlo después de 30 minutos de corrida es tiempo perdido.

También exporta `apiLogin(baseUrl, email, password)`, que reutilizan los flujos de Playwright y cualquier script suelto.

### `scripts/run-http.js` — `npm run simulate:http` / `npm run simulate:spike`
Modo capacidad. Lee `config.sim.http`, construye los `--overrides` de Artillery e imprime la configuración efectiva antes de arrancar.

Con `--spike` cambia a `config.sim.spike` y usa `arrivalCount` en vez de `arrivalRate`. La diferencia importa: `arrivalRate: 40` son "40 usuarios nuevos **por segundo**"; `arrivalCount: 200, duration: 10` son 200 usuarios repartidos en una ventana de 10 segundos — la avalancha real del inicio de jornada.

Si defines `LT_TARGET_URL`, la inyecta como override para poder apuntar a un despliegue remoto sin editar los `.yml` (ver [TARGET-REMOTO.md](TARGET-REMOTO.md)).

### `scripts/run-browser.js` — `npm run simulate:browser`
Modo observación. Traduce `config.sim.browser` a las opciones de lanzamiento de Playwright (`headless`, `slowMo`) y avisa de que este modo **no sirve para medir capacidad**. Limita a 10 navegadores: por encima de eso la máquina sufre y los números pierden sentido.

### `scripts/run-scenario.js` — `npm run simulate:enrollment` / `simulate:zip` / `simulate:cache-storm`
Runner genérico: valida que el escenario exista, lo corre con `--output`, y **no** falla el proceso cuando un umbral `ensure` se incumple — un umbral roto es un dato, no un error de ejecución.

### `scripts/run-all.js` — `npm run run-all`
Ejecuta los 6 escenarios originales en secuencia y llama a `summarize.js`. Tarda ~25-30 minutos.

### `scripts/summarize.js`
Convierte los JSON de `reports/raw/` en una tabla markdown con p50/p95/p99, throughput, tasa de error y veredicto contra umbrales. Tolera archivos corruptos o incompletos: avisa y sigue, en vez de tumbar el informe entero.

### `scripts/db-watch.js` — `npm run db:watch`
Instrumentación del lado servidor, para correr **en paralelo** a una carga. Cada 2 segundos consulta `pg_stat_activity` (conexiones totales, por estado, consulta más larga, bloqueadas) y cronometra `GET /api/health`.

Imprime una línea por muestra y escribe un `.jsonl` en `reports/`. Al pararlo con Ctrl-C resume los picos.

Su propio pool está limitado a **1 conexión** a propósito: un medidor que consuma conexiones distorsiona justo lo que mide.

```bash
npm run db:watch -- --label mi-corrida
```

Es la única forma de ver el agotamiento de conexiones desde el servidor, en vez de inferirlo por los timeouts que ve el cliente.

---

## Escenarios

Los `.yml` de `artillery/` tienen el target **fijado a `localhost:3005`**. Es deliberado: evita apuntar a producción por accidente. Solo los runners pueden cambiarlo, y solo vía `LT_TARGET_URL`.

| Archivo | Comando | Qué mide |
|---|---|---|
| `01-login-storm.yml` | — | Logins en ráfaga |
| `02-employee-navigation.yml` | — | Navegación de empleado (Playwright) |
| `03-rh-journey.yml` | — | Recorrido de RH incluyendo import CSV |
| `04-superadmin-dashboard.yml` | — | Dashboards de superadmin |
| `05-certificates.yml` | — | Descarga de DC-3 y ZIP |
| `06-peak-mixed.yml` | — | Pico mixto con pesos por rol |
| `20-browser-visual.yml` | `simulate:browser` | **Observación**: login real por UI, navegador visible |
| `21-http-user-session.yml` | `simulate:http` | **Capacidad**: login 1 vez + navegación en bucle |
| `30-mass-enrollment.yml` | `simulate:enrollment` | Enrolamiento masivo (hallazgo G-2) |
| `31-zip-constancias.yml` | `simulate:zip` | ZIP de constancias (G-5) |
| `32-cache-invalidation-storm.yml` | `simulate:cache-storm` | Polling vs caché de superadmin (G-4) |

> Los escenarios `01`-`06` hacen login **en cada iteración**, lo que sobrepondera la operación más cara y acaba midiendo "cuántos logins por segundo aguanta". `21` corrige eso. Se conservan los originales para poder comparar contra la baseline; para medir capacidad usa `21`.

### Procesadores

- `processor.js` — token dummy de Turnstile y el envoltorio del recorrido de RH en navegador
- `flows.js` — recorridos Playwright que inyectan la cookie de sesión (saltan la UI de login)
- `flows-visual.js` — recorridos que hacen el login **real por la interfaz**, para el modo observación
- `processor-http-session.js` — genera los tiempos de espera aleatorios del modo HTTP
- `processor-gaps.js` — lógica de los escenarios 30-32

---

## Datos generados

Todo bajo `data/` y `reports/`, ambos ignorados por git.

| Archivo | Lo escribe | Lo consume |
|---|---|---|
| `data/catalog.json` | seeder 01 | seeders 02, 03 |
| `data/companies.json` | seeder 02 | seeder 03 |
| `data/payloads/rh-credentials.csv` | seeder 02 | escenarios con rol RH |
| `data/payloads/employee-credentials.csv` | seeder 03 | escenarios con rol empleado |
| `data/payloads/certificates.csv` | seeder 03 | escenario 05 (descarga de DC-3) |
| `data/import/rh-import-*.csv` | seeder 04 | recorrido de RH (import por UI) |
| `reports/raw/*.json` | Artillery | `summarize.js` |
| `reports/db-watch-*.jsonl` | `db-watch.js` | análisis manual |
| `reports/INFORME-LOADTEST-*.md` | `summarize.js` | lectura humana |

---

## Seguridad de los datos

Los scripts escriben en la **base real**. Lo que los hace seguros es que todo lo sembrado lleva un marcador y el borrado solo actúa sobre esos marcadores:

| Entidad | Marcador |
|---|---|
| Empresas | `slug` empieza con `lt-` |
| Usuarios y empleados | correo con `lt-empresa-NN` o `lt-import` **y** dominio `yopmail.com` |
| Cursos | `wp_course_id` entre 900101 y 900199 |
| Paquetes | `name` empieza con `LT ` |
| Constancias | `reference_number` empieza con `LT-D360-` |

**El dominio por sí solo nunca es criterio de borrado.** Si el teardown borrara por `@yopmail.com`, se llevaría por delante cualquier usuario real que use esa bandeja desechable — algo perfectamente posible en un entorno de pruebas. Por eso cada patrón exige también el marcador estructural.

Antes de borrar en un entorno nuevo, comprueba qué coincide:

```bash
node -e "
const{query,getPool}=require('./seeders/lib/db');
const{TEARDOWN_EMAIL_PATTERNS:P}=require('./seeders/lib/emails');
const M=P.map((_,i)=>'email LIKE \$'+(i+1)).join(' OR ');
(async()=>{
  const r=await query('SELECT email,role FROM users WHERE '+M,P);
  console.log('usuarios que se borrarian:',r.rowCount,r.rows);
  await getPool().end()})()"
```

Si aparece algún correo que no reconoces como sembrado, **no ejecutes el teardown** hasta entenderlo.

### Sobre yopmail

Se eligió porque son bandejas públicas que puedes abrir en `yopmail.com` sin registrarte, útil para ver los correos que manda el portal (credenciales, aviso de constancia lista). Dos consecuencias: cualquiera puede leer esas bandejas si adivina la dirección, así que no siembres nada sensible; y si SES llega a estar configurado en el entorno de pruebas, esos correos **se envían de verdad** y cuentan para tu cuota.
