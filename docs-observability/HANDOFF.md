# Informe de Hand-off — Portal Empresarial Desarrolla360

Fecha: 2026-07-22 · Repo: `desarrolla-sistema-remote` · Rama principal: `main`

## 1. Qué es este sistema

Portal B2B en Next.js que administra empresas clientes, sus empleados y el avance de esos empleados en cursos de **Tutor LMS Pro**, que vive en un sitio WordPress separado (`desarrolla360.com`). El portal **no reemplaza** WordPress: marketing, venta individual y la operación académica siguen en WordPress/Tutor/WooCommerce; el portal concentra el control corporativo (cupos, paquetes, reporting, constancias DC-3).

Tres roles, cada uno con su dashboard:

| Rol | Ruta | Qué hace |
|---|---|---|
| `SUPERADMIN` | `/superadmin` | Alta de empresas, paquetes, asignaciones, monitoreo de integración, DC-3, auditoría |
| `RH` | `/empresa` | Alta/baja de empleados de su empresa, progreso, constancias, exportes CSV |
| `EMPLEADO` | `/empleado` | Sus cursos (con salto directo a Tutor LMS) y sus constancias |

## 2. Stack

- **Next.js 16** (App Router, server actions, `proxy.ts` como middleware de roles)
- **NextAuth v5** con credenciales (bcrypt) + captcha Cloudflare Turnstile, sesión JWT
- **Prisma 7** con driver adapter `@prisma/adapter-pg` sobre `pg.Pool` (`lib/prisma.ts`)
- **PostgreSQL en Supabase** (ver §3)
- **MUI v9 + Tailwind v4** para UI; `pdf-lib` para constancias DC-3; Vercel Blob para firmas
- Deploy del portal en **Vercel**; el plugin WordPress se despliega aparte (ver §4)

## 3. Base de datos: cuál es y qué se guarda

### ¿En qué BDD?

**PostgreSQL alojado en Supabase** (región `aws-1-us-east-1`). Dos cadenas de conexión en `.env`:

- `DATABASE_URL` → pooler de Supabase, puerto **6543** (PgBouncer). La usa la app en runtime.
- `DIRECT_URL` → conexión directa, puerto **5432**. La usan las migraciones (`prisma.config.ts` prefiere `DIRECT_URL`), porque PgBouncer en modo transacción no soporta los locks de migración.

El acceso es siempre vía Prisma; no hay SQL crudo relevante fuera de las migraciones en `prisma/migrations/`.

### ¿Qué se guarda? (esquema en `prisma/schema.prisma`, tablas en español)

**Datos de los que el portal es dueño (fuente de verdad):**

| Tabla | Contenido |
|---|---|
| `usuarios` | Login del portal para los 3 roles: email, `password_hash` (bcrypt), rol, `empresa_id`, `wp_user_id` opcional |
| `empresas` | Clientes: datos de contacto, RFC, **cupos** (`asientos_contratados` vs `asientos_usados`), activo/suspendida, notas internas |
| `paquetes` / `paquete_cursos` | Catálogo de paquetes y qué cursos de Tutor LMS incluye cada uno (`wp_curso_id` + nombre/portada cacheados) |
| `empresa_paquetes` | Qué paquete contrató cada empresa, con fecha de inicio y vencimiento (vencida ⇒ login bloqueado) |
| `empleados` | Padrón por empresa: nombre completo, email, CURP, puesto, clave CNO; `wp_user_id` cuando ya existe en WordPress |
| `notificaciones` | Notificaciones in-app (hoy dirigidas al SuperAdmin, p. ej. constancias nuevas) |
| `auditoria_eventos` | Bitácora append-only de acciones administrativas (quién, qué, sobre qué entidad, metadata JSON) |
| `historial_cupos` | Historial de cambios de cupo por empresa (antes/después, actor, empleados suspendidos) |
| `sesiones_portal` | Tokens de sesión revocables desde el panel SuperAdmin |

**Datos espejo/caché de Tutor LMS** (el dueño real es WordPress; el portal guarda snapshots para no consultar WP en cada página, con `ultima_sincronizacion`):

| Tabla | Contenido |
|---|---|
| `empleado_cursos` | Progreso por empleado×curso: `progreso_pct`, `completado`, fechas, y la **máquina de estados de acceso** `acceso_estado` (`PENDING → ACTIVE / ERROR / REQUIRES_REVIEW`) con `acceso_error` |
| `constancias` | Certificados emitidos: folio propio del portal (`D360-AAAA-MMDD-empleadoId-cursoId`), URL del PDF generado por Tutor LMS |
| `curso_dc3_metadata` | Ficha oficial DC-3 por curso: duración en horas, área temática (nombre+clave), agente capacitador y registro, instructor y URL de su firma. Fuente `MANUAL` o `WORDPRESS_BRIDGE` |
| `integracion_estados` | Store clave/valor JSON con el estado de diagnóstico del webhook (`lib/webhook-monitor.ts`) |

Los PDFs no se guardan en la BDD: la constancia DC-3 se genera al vuelo con `pdf-lib` (`lib/dc3-pdf.ts`, plantillas en `public/templates`) y las firmas de instructor se suben a **Vercel Blob**.

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

Los tres caminos convergen en `syncEmployeeLearningFromBridgeSnapshot`: upsert de `empleado_cursos` y `constancias`, notificaciones y revalidación de caché por tags (`lib/cache-tags.ts`).

### 4.5 SSO portal → WordPress

`buildWordPressCourseLaunchUrl` (`lib/wordpress-bridge.ts`) genera una URL de auto-login firmada con HMAC sobre `WP_BRIDGE_PORTAL_KEY` (`?d360_autologin=1&uid&exp&redirect_to&sig`, expira en 5 min). El plugin la valida y deja al empleado dentro de su curso en Tutor sin segundo login.

### 4.6 Flujo completo de inscripción (lo que pasa al asignar un paquete)

1. SuperAdmin asigna paquete a empresa; RH da de alta al empleado (valida cupo contra `asientos_contratados`).
2. Portal llama `employees/upsert` → el plugin crea/vincula el usuario WP y devuelve `wp_user_id` (se guarda en `empleados`).
3. `lib/course-sync.ts` crea filas `empleado_cursos` en `PENDING`, llama `enrollments/batch` y luego `access/ensure` (con reintento vía API oficial de Tutor si hay error de permisos).
4. Verifica que los cursos sean visibles para el alumno (`students/{id}/courses`); si todo cuadra ⇒ `ACTIVE`, si no ⇒ `ERROR`/`REQUIRES_REVIEW` con el mensaje en `acceso_error`.
5. El progreso posterior llega por webhook/poll y se refleja en dashboards; al completar, se registra la constancia con folio propio.

## 5. Variables de entorno (`.env.example`)

| Grupo | Variables |
|---|---|
| BDD | `DATABASE_URL` (pooler 6543), `DIRECT_URL` (5432, migraciones) |
| Auth | `NEXTAUTH_SECRET`/`AUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` |
| Bridge WP | `WP_BRIDGE_BASE_URL` (…/wp-json/desarrolla360/v1), `WP_BRIDGE_PORTAL_KEY`, `NEXT_PUBLIC_WORDPRESS_SITE_URL` |
| Tutor oficial | `TUTORLMS_API_KEY` (alias `TUTORLMS_API_PASSWORD`), `TUTORLMS_SECRET` |
| Sync | `BRIDGE_WEBHOOK_SECRET`, `CRON_SECRET`, `BACKGROUND_SYNC_SECRET`, `EMPLOYEE_SYNC_INTERVAL_MS` |
| Zona horaria | `PORTAL_TIME_ZONE`, `NEXT_PUBLIC_PORTAL_TIME_ZONE` (América/Tijuana) |

## 6. Cómo levantar el proyecto

```bash
npm install
cp .env.example .env    # llenar valores reales
npm run prisma:generate
npm run dev
```

Seed de demo (`npx prisma db seed`): `admin@desarrolla360.com/admin123` (SUPERADMIN), `rh@empresa-demo.com/rh123456` (RH), empleado demo `empleado123`. **Cambiar en producción.**

CI (`.github/workflows/ci.yml`): `npm ci` → `prisma generate` → `lint` → `tsc --noEmit` → `build`. **No hay suite de tests.**

## 7. Puntos de atención para quien recibe

- **Plugin ≠ portal en deploy.** El PHP del bridge vive en el repo pero se sube a WordPress manualmente; un cambio de contrato (payloads, firmas) exige desplegar ambos lados coordinados.
- **La caché académica puede quedar obsoleta** si el webhook falla en silencio: revisar `/superadmin/integracion` y `integracion_estados` (diagnóstico del webhook) antes de culpar a la BDD.
- **`acceso_estado = ERROR / REQUIRES_REVIEW`** en `empleado_cursos` es la señal de que la inscripción en Tutor falló; el mensaje exacto queda en `acceso_error` y hay endpoint de diagnóstico por alumno (`/students/{id}/diagnostics`, filtrable por `?course_id=`).
- **Permisos de Tutor LMS** son la fuente #1 de fricción histórica: por eso existen tres rutas de inscripción encadenadas (interna → service user → API oficial). Si aparecen errores "no tienes permisos", revisar Service User ID y credenciales Tutor en el plugin.
- **Cupos:** `asientos_usados` se mantiene por código en las server actions; `historial_cupos` audita cada cambio. No tocar a mano en BDD.
- **Login bloqueado por empresa:** suspensión o paquete vencido bloquean el login de RH/EMPLEADO (`lib/empresa-status.ts`); el usuario ve `/cuenta-suspendida`.
- **DC-3 incompleta:** si a un curso le falta metadata (duración, área temática, agente, instructor, firma), `lib/dc3.ts` lo reporta y la constancia no sale completa; se captura en `/superadmin/dc3`.
- Documentación externa: doc técnico en Google Docs y diagrama Excalidraw (links en `README.md`).
