# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # dev server (Next.js)
npm run build            # prisma generate && next build
npm run lint             # eslint .
npx tsc --noEmit         # typecheck (CI runs lint + tsc + build; no test suite exists)
npm run prisma:generate  # regenerate Prisma client after schema changes
npm run prisma:migrate   # prisma migrate dev
npx prisma db seed       # seed demo users (see prisma/seed.ts)
```

Migrations use `DIRECT_URL` (Supabase direct connection, port 5432) via `prisma.config.ts`; the app itself uses `DATABASE_URL` (Supabase pooler, port 6543). Copy `.env.example` to `.env` before running anything.

## What this is

B2B portal ("Portal Empresarial Desarrolla360") that manages companies, their employees, and course progress from **Tutor LMS Pro running on a separate WordPress site**. The portal never reads the WordPress database directly — all integration goes through REST APIs. Domain language is Spanish (empresa, empleado, paquete, constancia, cupo) in both the schema and the UI.

## Architecture

### Three role-gated portals

`Rol` enum: `SUPERADMIN` (Desarrolla360 staff), `RH` (company HR manager), `EMPLEADO` (worker). Each has its own route tree under `app/(portal)/superadmin|empresa|empleado`, enforced twice:

- `proxy.ts` (Next 16's middleware) redirects by JWT role per path prefix.
- `auth.ts` — NextAuth v5 credentials provider: bcrypt check, Cloudflare Turnstile captcha, blocks login when the company is suspended/expired (`lib/empresa-status.ts`).

Mutations are server actions colocated per route (`app/(portal)/**/actions.ts`), guarded by helpers in `lib/auth-guards.ts` / `lib/access-control.ts`. Cache invalidation uses tags from `lib/cache-tags.ts` (per-company root tag + global superadmin tag).

### Database

PostgreSQL on **Supabase**, accessed with Prisma 7 through the `pg` driver adapter (`@prisma/adapter-pg`) — singleton in `lib/prisma.ts`. Schema in `prisma/schema.prisma`, tables mapped to Spanish names.

Core idea: the portal is the **source of truth for corporate structure** (usuarios, empresas, paquetes, cupos) and a **cache/mirror of academic data** owned by Tutor LMS. Mirror tables carry `wp_*` link columns and a `ultima_sincronizacion` timestamp:

- `empleado_cursos` — per-employee course progress snapshot + enrollment state machine `acceso_estado`: `PENDING → ACTIVE | ERROR | REQUIRES_REVIEW`.
- `constancias` — issued certificates, portal-generated `folio` (`D360-YYYY-MMDD-empleadoId-cursoId`), link to the Tutor LMS PDF.
- `curso_dc3_metadata` — official DC-3 certificate data per course (duración, área temática, agente capacitador, instructor + firma), source `MANUAL` or `WORDPRESS_BRIDGE`.
- `integracion_estados` — key/value JSON store for webhook diagnostics state (`lib/webhook-monitor.ts`).
- `auditoria_eventos`, `historial_cupos` — audit log and seat-quota history, append-only.

### Tutor LMS / WordPress integration (two clients + two sync paths)

**Clients (outbound):**

1. `lib/wordpress-bridge.ts` → custom WP plugin endpoints `/wp-json/desarrolla360/v1/*`, authenticated by the `X-D360-Portal-Key` shared header. This is the primary channel: employee upsert/delete in WP, batch enrollment, ensure-access, student courses/certificates/diagnostics, course catalog.
2. `lib/tutorlms-api.ts` → official Tutor LMS REST API `/wp-json/tutor/v1/*` with Basic auth (`TUTORLMS_API_KEY`:`TUTORLMS_SECRET`). Fallback used to complete enrollments when the bridge's internal route hits Tutor permission errors.

The plugin source itself lives in `wordpress-plugin/desarrolla360-bridge/` (single ~4200-line PHP file). It is edited in this repo but deployed to WordPress separately — changes there require re-uploading the plugin.

**Sync (inbound):**

1. Webhook `POST /api/internal/webhooks/tutor-learning` — the plugin pushes changed learning snapshots; HMAC-SHA256 signature over `timestamp.body` with `BRIDGE_WEBHOOK_SECRET` (headers `x-d360-webhook-signature` / `-timestamp`, 10-min freshness window).
2. Poll fallback `GET|POST /api/internal/sync/employee-learning` — `Authorization: Bearer CRON_SECRET`, meant for an external scheduler.
3. Page-level background refresh in `lib/employee-learning.ts` (via `next/server` `after()`), throttled by `EMPLOYEE_SYNC_INTERVAL_MS` (min 15s), dedup with in-flight sets.

All three converge on `syncEmployeeLearningFromBridgeSnapshot`, which upserts `empleado_cursos`/`constancias` and fires notifications (`lib/notifications.ts`).

**Enrollment flow** (`lib/course-sync.ts`): assigning a package to an employee upserts `empleado_cursos` rows as `PENDING`, calls bridge enroll + ensure-access, verifies the courses are visible to the student, then marks `ACTIVE` or records the error. Packages can optionally create a private Course Bundle in Tutor LMS (`Paquete.wp_bundle_id`).

**SSO into WordPress**: `buildWordPressCourseLaunchUrl` builds an HMAC-signed auto-login URL (`d360_autologin` params) so employees jump from the portal into their Tutor LMS course without a second login.

### DC-3 constancias

`lib/dc3-pdf.ts` fills the official DC-3 PDF with `pdf-lib` using templates from `public/templates` and metadata from `curso_dc3_metadata`; `lib/dc3.ts` reports which required fields are missing. Instructor signature images upload to Vercel Blob (`app/api/upload/firma-instructor`).

### UI

MUI v9 (theme in `lib/mui-theme.ts` / `lib/theme-tokens.ts`) combined with Tailwind CSS v4. Icons: lucide-react + remixicon. Timezone-sensitive formatting goes through `lib/format.ts` using `PORTAL_TIME_ZONE`.
