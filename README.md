# Desarrolla360 Portal Empresarial

Portal B2B para administrar empresas clientes, sus empleados y el avance en cursos de `Tutor LMS Pro`, sin reemplazar el sitio publico actual en WordPress.

## Documentacion clave

- [Documentacion tecnica](https://docs.google.com/document/d/15FFbeow9qA0egQceBSOO3m3dXgoJnVEd3W8Rf7C33fA/edit?usp=drive_link)
- [Diagrama visual en Excalidraw](https://excalidraw.com/#json=O0WQwOZZu5Y-I4MWcUmW-,Osa6Epzp7T0KP3kt3EvWkA)
- [Portal publico en Vercel](https://desarrolla-sistema.vercel.app/)
- [Repositorio de TutorLMS](https://github.com/themeum/tutor)

## Objetivo

El proyecto separa dos frentes:

- `WordPress + Tutor LMS Pro + WooCommerce`: marketing, venta individual y operacion academica.
- `Portal Empresarial`: empresas, paquetes, cupos, dashboard RH, dashboard empleado y vista SuperAdmin.

## Dashboards

- `SuperAdmin`: alta de empresas, asignacion de paquetes, monitoreo y control de accesos.
- `Empresa / RH`: alta de empleados, seguimiento por curso, reportes y constancias.
- `Empleado`: mis cursos y constancias.

## Stack actual

- `Next.js App Router`
- `NextAuth v5` con credenciales
- `Prisma`
- `PostgreSQL`
- `MUI`

## Estructura recomendada

- `app/`: vistas del portal y autenticacion.
- `components/`: piezas de interfaz reutilizables.
- `docs/`: blueprint tecnico, roadmap y decisiones de arquitectura.
- `prisma/`: modelo de datos del portal.

## Primeros pasos

1. Instala dependencias:

```bash
npm install
```

2. Crea tu archivo local de entorno a partir del ejemplo:

```bash
cp .env.example .env
```

3. Configura variables de entorno:

```bash
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
WP_BRIDGE_BASE_URL=
WP_BRIDGE_PORTAL_KEY=
NEXT_PUBLIC_WORDPRESS_SITE_URL=
BRIDGE_WEBHOOK_SECRET=
TUTORLMS_API_KEY=
TUTORLMS_SECRET=
```

Si tu bridge apunta a `https://desarrolla360.com/wp-json/desarrolla360/v1`, entonces
`NEXT_PUBLIC_WORDPRESS_SITE_URL` debe ser `https://desarrolla360.com`.

Si tu panel de Tutor LMS te entrega la API key con otro nombre interno, por compatibilidad
el portal tambien acepta `TUTORLMS_API_PASSWORD` como alias de `TUTORLMS_API_KEY`.

Si quieres que los paquetes del portal creen automaticamente un `bundle privado` en Tutor LMS,
debes tener activo el addon oficial `Course Bundle` dentro de Tutor LMS Pro en WordPress.

Para jobs en segundo plano puedes usar `CRON_SECRET` o `BACKGROUND_SYNC_SECRET`.
La ruta interna `GET/POST /api/internal/sync/employee-learning` acepta:

```bash
Authorization: Bearer <CRON_SECRET>
```

Si no usas Vercel, puedes conectar cualquier scheduler externo cada minuto o cada 5 minutos.
Para una experiencia mas cercana a tiempo real, usa el webhook del bridge y deja
`EMPLOYEE_SYNC_INTERVAL_MS=15000` como respaldo de refresco en vistas del empleado. Ejemplo:

```bash
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://tu-dominio.com/api/internal/sync/employee-learning?limit=50"
```

Si quieres sincronizacion academica casi en tiempo real, configura tambien el webhook del bridge:

- En el portal define `BRIDGE_WEBHOOK_SECRET`
- En WordPress > `Settings > Desarrolla360 Bridge` define:
  - `Portal Webhook URL`
  - `Portal Webhook Secret`

### Cron jobs en Vercel

El proyecto incluye `vercel.json` con cron jobs (Vercel los detecta y ejecuta
automaticamente al hacer deploy). Todos requieren `CRON_SECRET` configurado como
variable de entorno en el proyecto de Vercel — Vercel manda automaticamente
`Authorization: Bearer $CRON_SECRET` en cada llamada.

El proyecto esta en plan **Pro** de Vercel, asi que no hay limite practico de
cron jobs ni de frecuencia minima. Los cuatro estan activos:

| Ruta                                                 | Horario                      | Que hace                                                                                                                                                                        |
| ---------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/cron/check-expiring-packages`              | diario, 13:00 UTC            | Notifica a superadmin y RH cuando un paquete de empresa esta por vencer (30 dias antes).                                                                                        |
| `GET /api/internal/sync/employee-learning?limit=100` | cada 15 min                  | Respaldo del webhook en tiempo real: sincroniza avances/certificados de hasta 100 alumnos con acceso desactualizado.                                                            |
| `GET                                                 | POST /api/cron/process-jobs` | cada minuto                                                                                                                                                                     | Motor de jobs asincronos (G-2, ver mas abajo). |
| `GET /api/cron/bridge-health`                        | cada hora                    | Revisa que el bridge de WordPress responda y que el webhook no lleve mas de 26h sin recibir eventos, notificando a superadmin con un enfriamiento de 6h entre avisos repetidos. |

Si el proyecto llegara a bajar a Hobby (maximo 2 cron jobs, minimo diario cada
uno), habria que recortar esta lista a los dos mas criticos y considerar un
mecanismo de respaldo para `process-jobs` (por ejemplo, que otro cron ya
activo llame a `processPendingJobs()` de `lib/jobs.ts` en loop, despues de su
propio trabajo) — no es el caso hoy, asi que no esta implementado.

#### `GET|POST /api/cron/process-jobs` — motor de jobs asincronos (G-2)

Procesa la tabla `jobs` en chunks (ver `lib/jobs.ts`): sincronizar el paquete
activo con todos los empleados de una empresa se encola como job en vez de
correr en la misma peticion, y `processPendingJobs()` avanza el siguiente
chunk (20 empleados, concurrencia 5) cada vez que se le llama. Con el cron
corriendo cada minuto, un job tarda `ceil(empleados / 20)` minutos en
completarse — una empresa de 200 empleados termina en ~10 minutos.

La URL esperada del portal es:

```bash
https://tu-dominio.com/api/internal/webhooks/tutor-learning
```

El bridge revisa alumnos vinculados por lotes pequenos cada minuto y solo envia al portal
los snapshots que realmente cambiaron, para no degradar WordPress ni saturar el portal.

`npm install` genera el cliente de Prisma automaticamente (hook `postinstall`). Si mas
adelante cambias `prisma/schema.prisma`, vuelve a generarlo con `npm run prisma:generate`.

4. (Opcional) Carga datos de prueba — crea un SuperAdmin, una empresa demo con su
   usuario HR y un empleado demo, todos con contrasena conocida (ver
   `prisma/seed.ts` para los detalles):

```bash
npm run prisma:seed
```

5. Corre el portal:

```bash
npm run dev
```

## Scripts disponibles

| Script                  | Que hace                                              |
| ------------------------ | ------------------------------------------------------ |
| `npm run dev`            | Levanta el servidor de desarrollo.                     |
| `npm run build`          | Genera el cliente de Prisma y compila para produccion. |
| `npm run start`          | Sirve el build de produccion.                          |
| `npm run lint`           | Corre ESLint.                                          |
| `npm run format`         | Formatea el codigo con Prettier.                       |
| `npm run format:check`   | Verifica el formato sin modificar archivos.            |
| `npx tsc --noEmit`       | Typecheck.                                             |
| `npm run prisma:generate`| Regenera el cliente de Prisma.                         |
| `npm run prisma:migrate` | Crea y aplica una migracion en desarrollo.             |
| `npm run prisma:seed`    | Carga los datos de prueba de `prisma/seed.ts`.         |

## Notas importantes

- El portal no debe leer directo la base de WordPress. La integracion recomendada es por `plugin puente + REST API`.
- La venta de paquetes empresariales se administra fuera de WooCommerce; el portal solo aplica accesos, cupos y seguimiento.
- El empleado puede seguir consumiendo los cursos en Tutor LMS, mientras el portal concentra el control empresarial y el reporting.
