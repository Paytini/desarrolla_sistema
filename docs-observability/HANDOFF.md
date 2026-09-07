# Informe de Hand-off — Portal Empresarial Desarrolla360

Fecha: 2026-07-22 · **Actualizado: 2026-08-31** · Repo: `desarrolla-sistema-remote` · Rama principal: `main`

> Este documento describe el sistema **como está hoy**, no como estaba cuando se escribió. Se actualiza cuando cambia la arquitectura. Para el estado de rendimiento y lo que queda abierto, ver [PENDIENTES-RENDIMIENTO.md](PENDIENTES-RENDIMIENTO.md).

## 1. Qué es este sistema

Portal B2B en Next.js que administra empresas clientes, sus empleados y el avance de esos empleados en cursos de **Tutor LMS Pro**, que vive en un sitio WordPress separado (`desarrolla360.com`). El portal **no reemplaza** WordPress: marketing, venta individual y la operación académica siguen en WordPress/Tutor/WooCommerce; el portal concentra el control corporativo (cupos, paquetes, reporting, constancias DC-3).

Tres roles, cada uno con su dashboard:

| Rol (enum `Role`) | Ruta               | Qué hace                                                                            |
| ----------------- | ------------------ | ----------------------------------------------------------------------------------- |
| `SUPERADMIN`      | `/superadmin`      | Alta de empresas, paquetes, asignaciones, monitoreo de integración, DC-3, auditoría |
| `HR`              | `/company/{slug}`  | Alta/baja de empleados de su empresa, progreso, constancias, exportes CSV           |
| `EMPLOYEE`        | `/employee`        | Sus cursos (con salto directo a Tutor LMS) y sus constancias                        |

> El enum se renombró del español al inglés en agosto de 2026 (migraciones `20260724100000_rename_schema_to_english` y `20260820184347_rename_role_enum_values_to_english`). Si encuentras `RH` o `EMPLEADO` en algún sitio, es código o documentación sin actualizar.

## 2. Stack

- **Next.js 16** (App Router, server actions, `proxy.ts` como middleware de roles)
- **NextAuth v5** con credenciales (bcrypt) + captcha Cloudflare Turnstile, sesión JWT
- **Prisma 7** con driver adapter `@prisma/adapter-pg` sobre `pg.Pool` (`lib/prisma.ts`)
- **PostgreSQL en Supabase** (ver sección 3)
- **MUI v9 + Tailwind v4** para UI; `pdf-lib` para constancias DC-3; Vercel Blob para firmas
- Deploy del portal en **Vercel**; el plugin WordPress se despliega aparte (ver sección 4)

## 3. Base de datos: cuál es y qué se guarda

### ¿En qué BDD?

**PostgreSQL alojado en Supabase** (región `aws-1-us-east-1`). Dos cadenas de conexión en `.env`:

- `DATABASE_URL` → pooler de Supabase, puerto **6543** (PgBouncer). La usa la app en runtime.
- `DIRECT_URL` → conexión directa, puerto **5432**. La usan las migraciones (`prisma.config.ts` prefiere `DIRECT_URL`), porque PgBouncer en modo transacción no soporta los locks de migración.

El acceso es siempre vía Prisma; no hay SQL crudo relevante fuera de las migraciones en `prisma/migrations/`.

### ¿Qué se guarda? (esquema en `prisma/schema.prisma`, tablas y columnas en inglés desde agosto de 2026)

**Datos de los que el portal es dueño (fuente de verdad):**

| Tabla (modelo Prisma)              | Contenido                                                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `users` (`User`)                   | Login del portal para los 3 roles: email, `password_hash` (bcrypt), `role`, `company_id`, `must_change_password`   |
| `companies` (`Company`)            | Clientes: contacto, RFC, **cupos** (`contracted_seats` vs `used_seats`), `slug` para las URLs, logo, activa/suspendida |
| `packages` / `package_courses`     | Catálogo de paquetes y qué cursos de Tutor LMS incluye cada uno (`wp_course_id` + nombre/portada cacheados)         |
| `company_packages`                 | Qué paquete contrató cada empresa, con fecha de inicio y vencimiento (vencida ⇒ login bloqueado)                    |
| `employees` (`Employee`)           | Padrón por empresa: nombre, email, CURP, puesto, clave CNO; `wp_user_id`, `sync_lock_until`                        |
| `notifications`                    | Notificaciones in-app, con archivado                                                                                |
| `consulting_requests`              | Solicitudes de consultoría (área, método de contacto, estado)                                                       |
| `jobs` (`Job`)                     | Cola de trabajos en background — enrolamiento masivo, import CSV. Estado `PENDING → PROCESSING → DONE / ERROR`     |
| `audit_events`                     | Bitácora append-only de acciones administrativas                                                                    |
| `seat_history`                     | Historial de cambios de cupo por empresa                                                                            |
| `portal_sessions`                  | Tokens de sesión revocables desde el panel SuperAdmin                                                               |

> **Aislamiento entre empresas:** `lib/prisma.ts` monta una extensión de Prisma ("tenant guard") que fuerza `company_id` en toda consulta a `Employee`, `CompanyPackage` y `ConsultingRequest` mientras hay una petición de HR activa (`lib/tenant-context.ts`). Es una red de seguridad por si alguna consulta se escribe sin el filtro a mano — no sustituye escribirlo, lo respalda.

**Datos espejo/caché de Tutor LMS** (el dueño real es WordPress; el portal guarda snapshots para no consultar WP en cada página, con `last_synced_at`):

| Tabla                   | Contenido                                                                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `employee_courses`      | Progreso por empleado×curso: `progress_pct`, `completed`, fechas, y la **máquina de estados de acceso** `access_status` (`PENDING → ACTIVE / ERROR / REQUIRES_REVIEW`) con `access_error` |
| `quiz_attempts`         | Intentos de examen que devuelve Tutor LMS: preguntas, puntos, resultado, fechas                                                                                                       |
| `lesson_completions`    | Lecciones completadas por empleado y curso                                                                                                                                           |
| `certificates`          | Certificados emitidos: folio propio (`D360-AAAA-MMDD-{folio}-{curso}`), URL del PDF de Tutor LMS y **`dc3_pdf_url`** (el DC-3 del portal, ya generado, en Vercel Blob)               |
| `course_dc3_metadata`   | Ficha oficial DC-3 por curso: duración, área temática, agente capacitador, instructor y firma. Fuente `MANUAL` o `WORDPRESS_BRIDGE`                                                  |
| `integration_states`    | Store clave/valor JSON con el estado de diagnóstico del webhook (`lib/webhook-monitor.ts`)                                                                                           |

El DC-3 **se genera una sola vez** con `pdf-lib` (`lib/dc3-pdf.ts`, plantillas en `public/templates`) y se guarda en **Vercel Blob**; las descargas siguientes leen de ahí vía `dc3_pdf_url`. Las firmas de instructor también viven en Blob.

### Trabajo en background

Lo que antes corría dentro de la petición HTTP ahora se encola en la tabla `jobs` (`lib/jobs.ts`) y lo drena un cron. Los crons están declarados en `vercel.json`:

| Ruta                                     | Frecuencia   | Para qué                                                    |
| ---------------------------------------- | ------------ | ----------------------------------------------------------- |
| `/api/cron/process-jobs`                 | cada minuto  | Enrolamiento masivo e import CSV, en chunks de 20           |
| `/api/internal/sync/employee-learning`   | cada minuto  | Respaldo del webhook: trae avance de quien lleva rato sin sincronizar |
| `/api/cron/check-expiring-packages`      | diario 13:00 | Avisa de paquetes por vencer                                |
| `/api/cron/bridge-health`                | cada hora    | Comprueba que el bridge de WordPress responde               |

## 4. Conexión con TutorLMS / WordPress

Regla de oro (README): **el portal nunca lee la base de datos de WordPress**. Todo pasa por REST. Hay dos canales de salida, dos de entrada y un SSO:

### 4.1 Plugin puente (canal principal, saliente)

`wordpress-plugin/desarrolla360-bridge/desarrolla360-bridge.php` (~4,200 líneas) es un plugin propio instalado en WordPress. Expone `/wp-json/desarrolla360/v1/*` y el portal lo consume desde `lib/wordpress-bridge.ts` autenticándose con el header **`X-D360-Portal-Key`** (llave compartida `WP_BRIDGE_PORTAL_KEY`; hay fallback a Basic Auth con application password).

Endpoints usados: `/health`, `/courses` y `/courses/{id}` (catálogo + ficha DC-3), `/employees/upsert` y `/employees/delete` (crea/borra el usuario WP del empleado), `/bundles` (crea Course Bundle privado, requiere addon oficial de Tutor Pro), `/enrollments/batch`, `/students/{id}/access/ensure`, `/students/{id}/courses|certificates|diagnostics`.

⚠️ El plugin se versiona en este repo pero **se despliega a mano en WordPress** (Settings → Desarrolla360 Bridge para configurar Shared Key, Service User ID y credenciales Tutor). Si cambias el PHP aquí, no olvides resubirlo.

### 4.2 API oficial de Tutor LMS (respaldo, saliente)

`lib/tutorlms-api.ts` habla directo con `/wp-json/tutor/v1/*` usando Basic Auth `TUTORLMS_API_KEY:TUTORLMS_SECRET` (alias aceptado: `TUTORLMS_API_PASSWORD`). Se usa como plan B cuando Tutor niega permisos por la ruta interna del plugin ("no tienes permisos para hacer eso"): lista matrículas por curso y las marca `completed` para habilitar el acceso académico.

### 4.3 Webhook (entrante, casi tiempo real)

WordPress empuja cambios académicos a `POST /api/internal/webhooks/tutor-learning`. Seguridad: HMAC-SHA256 de `timestamp.body` con `BRIDGE_WEBHOOK_SECRET`, headers `x-d360-webhook-signature` y `x-d360-webhook-timestamp`, ventana de frescura de 10 minutos y comparación en tiempo constante. El plugin revisa alumnos vinculados por lotes cada minuto y solo envía snapshots que cambiaron.

### 4.4 Sync por poll (entrante, respaldo)

`GET|POST /api/internal/sync/employee-learning?limit=50` con `Authorization: Bearer CRON_SECRET` (o `BACKGROUND_SYNC_SECRET`). Pensado para un cron externo (Vercel Cron u otro scheduler) cada 1–5 min. Además, las vistas del empleado refrescan en segundo plano (`lib/employee-learning.ts`, `after()` de Next) con throttle `EMPLOYEE_SYNC_INTERVAL_MS` (mínimo 15 s).

Los tres caminos convergen en `syncEmployeeLearningFromBridgeSnapshot`: upsert de `employee_courses` y `certificates`, notificaciones y revalidación de caché por tags (`lib/cache-tags.ts`).

### 4.5 SSO portal → WordPress

`buildWordPressCourseLaunchUrl` (`lib/wordpress-bridge.ts`) genera una URL de auto-login firmada con HMAC sobre `WP_BRIDGE_PORTAL_KEY` (`?d360_autologin=1&uid&exp&redirect_to&sig`, expira en 5 min). El plugin la valida y deja al empleado dentro de su curso en Tutor sin segundo login.

### 4.6 Flujo completo de inscripción (lo que pasa al asignar un paquete)

1. SuperAdmin asigna paquete a empresa; RH da de alta al empleado (valida cupo contra `contracted_seats`).
2. Portal llama `employees/upsert` → el plugin crea/vincula el usuario WP y devuelve `wp_user_id` (se guarda en `empleados`).
3. `lib/course-sync.ts` crea filas `employee_courses` en `PENDING`, llama `enrollments/batch` y luego `access/ensure` (con reintento vía API oficial de Tutor si hay error de permisos).
4. Verifica que los cursos sean visibles para el alumno (`students/{id}/courses`); si todo cuadra ⇒ `ACTIVE`, si no ⇒ `ERROR`/`REQUIRES_REVIEW` con el mensaje en `acceso_error`.
5. El progreso posterior llega por webhook/poll y se refleja en dashboards; al completar, se registra la constancia con folio propio.

## 5. Variables de entorno (`.env.example`)

| Grupo         | Variables                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| BDD           | `DATABASE_URL` (pooler 6543), `DIRECT_URL` (5432, migraciones)                                              |
| Auth          | `NEXTAUTH_SECRET`/`AUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`   |
| Bridge WP     | `WP_BRIDGE_BASE_URL` (…/wp-json/desarrolla360/v1), `WP_BRIDGE_PORTAL_KEY`, `NEXT_PUBLIC_WORDPRESS_SITE_URL` |
| Tutor oficial | `TUTORLMS_API_KEY` (alias `TUTORLMS_API_PASSWORD`), `TUTORLMS_SECRET`                                       |
| Sync          | `BRIDGE_WEBHOOK_SECRET`, `CRON_SECRET`, `BACKGROUND_SYNC_SECRET`, `EMPLOYEE_SYNC_INTERVAL_MS`               |
| Zona horaria  | `PORTAL_TIME_ZONE`, `NEXT_PUBLIC_PORTAL_TIME_ZONE` (América/Tijuana)                                        |

## 6. Cómo levantar el proyecto

```bash
npm install
cp .env.example .env    # llenar valores reales
npm run prisma:generate
npm run dev
```

Seed de demo (`npx prisma db seed`): `admin@desarrolla360.com/admin123` (SUPERADMIN), `rh@empresa-demo.com/rh123456` (HR), empleado demo `empleado123`. **Cambiar en producción.**

CI (`.github/workflows/ci.yml`): `npm ci` → `prisma generate` → `lint` → `tsc --noEmit` → `build`. **No hay suite de tests.**

## 7. Puntos de atención para quien recibe

- **Plugin ≠ portal en deploy.** El PHP del bridge vive en el repo pero se sube a WordPress manualmente; un cambio de contrato (payloads, firmas) exige desplegar ambos lados coordinados.
- **La caché académica puede quedar obsoleta** si el webhook falla en silencio: revisar `/superadmin/integracion` y `integration_states` (diagnóstico del webhook) antes de culpar a la BDD. **Primer sitio a mirar: `GET /api/health`** — si devuelve 503 con `missing: ["BRIDGE_WEBHOOK_SECRET"]`, el webhook está rechazando todo y el progreso solo llega por el cron de respaldo. Era el caso en producción el 2026-08-31.
- **`access_status = ERROR / REQUIRES_REVIEW`** en `employee_courses` es la señal de que la inscripción en Tutor falló; el mensaje exacto queda en `access_error` y hay endpoint de diagnóstico por alumno (`/students/{id}/diagnostics`, filtrable por `?course_id=`).
- **Permisos de Tutor LMS** son la fuente #1 de fricción histórica: por eso existen tres rutas de inscripción encadenadas (interna → service user → API oficial). Si aparecen errores "no tienes permisos", revisar Service User ID y credenciales Tutor en el plugin.
- **Cupos:** `used_seats` se mantiene por código en las server actions; `seat_history` audita cada cambio. No tocar a mano en BDD.
- **Login bloqueado por empresa:** suspensión o paquete vencido bloquean el login de HR/EMPLOYEE (`lib/company-status.ts`); el usuario ve `/cuenta-suspendida`.
- **DC-3 incompleta:** si a un curso le falta metadata (duración, área temática, agente, instructor, firma), `lib/dc3.ts` lo reporta y la constancia no sale completa; se captura en `/superadmin/dc3`.
- Documentación externa: doc técnico en Google Docs y diagrama Excalidraw (links en `README.md`).
