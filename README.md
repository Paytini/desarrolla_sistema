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
- `Tailwind CSS v4`

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

La URL esperada del portal es:

```bash
https://tu-dominio.com/api/internal/webhooks/tutor-learning
```

El bridge revisa alumnos vinculados por lotes pequenos cada minuto y solo envia al portal
los snapshots que realmente cambiaron, para no degradar WordPress ni saturar el portal.

4. Ejecuta Prisma:

```bash
npm run prisma:generate
```

5. Corre el portal:

```bash
npm run dev
```

## Notas importantes

- El portal no debe leer directo la base de WordPress. La integracion recomendada es por `plugin puente + REST API`.
- La venta de paquetes empresariales se administra fuera de WooCommerce; el portal solo aplica accesos, cupos y seguimiento.
- El empleado puede seguir consumiendo los cursos en Tutor LMS, mientras el portal concentra el control empresarial y el reporting.
