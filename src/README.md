# Código de la aplicación

Mapa de alto nivel. Para arquitectura en profundidad (roles, flujo de enrolamiento, integración con WordPress) ver [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md); para convenciones de trabajo del día a día, `CLAUDE.md` en la raíz del repo.

| Carpeta | Contenido |
| --- | --- |
| `app/` | Rutas del App Router. `(portal)/superadmin\|company\|employee` son los tres portales, cada uno gateado por rol; `api/` son las rutas de API (internas, cron, webhooks, uploads) |
| `components/` | UI reutilizable, organizada por dueño: `shared/` es genérica, el resto (`superadmin/`, `company/`, `employee/`, …) es específica de cada portal |
| `lib/` | Lógica de dominio, acceso a datos e integraciones — cada archivo suele mapear 1:1 a un tema (`jobs.ts` = cola de trabajos en segundo plano, `access-control.ts` = suspender/eliminar cuentas, `wordpress/` = clientes hacia el bridge y Tutor LMS, `dc3/` = generación de constancias) |
| `types/` | Tipos compartidos que no viven junto a su módulo |
| `auth.ts` / `auth.config.ts` | Configuración de NextAuth v5 (credenciales, JWT, Turnstile) |
| `proxy.ts` | Middleware de Next 16 — redirige por rol según el prefijo de ruta |

## Reglas que no son obvias leyendo un archivo suelto

- **Mutaciones son server actions** colocadas junto a su ruta (`app/**/actions.ts`), nunca en `lib/`.
- **Multi-tenant por `AsyncLocalStorage`** (`lib/tenant-context.ts`): las queries quedan implícitamente acotadas a la empresa de la sesión; usar `withoutCompanyContext()` para las pocas consultas que deben cruzar empresas (ej. verificar que un email es único a nivel plataforma).
- **Invalidación de caché por tags** (`lib/cache-tags.ts`): tag raíz por empresa + tag global de superadmin — revalidar el tag equivocado dejará vistas desactualizadas sin errores visibles.
- **El portal es la fuente de verdad de la estructura corporativa** (empresas, usuarios, cupos) y un **caché de los datos académicos** que vive en Tutor LMS — nunca al revés.
