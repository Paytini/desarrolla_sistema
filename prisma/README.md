# Base de datos

Prisma 7 sobre PostgreSQL (Supabase), accedido con el driver adapter `@prisma/adapter-pg` (no el motor Rust). Cliente singleton en `src/lib/prisma.ts`.

## Convenciones del schema

- Modelos y campos en inglés (`Company`, `Employee`, `first_name`); cada modelo mapea a una tabla `snake_case` en inglés vía `@@map` (ej. `Company` → `companies`).
- El dominio del portal sigue siendo español en la UI y en los nombres de negocio (empresa, empleado, paquete, constancia, cupo) — la traducción quedó solo en el schema.
- Tablas mirror de datos académicos (`employee_courses`, `certificates`, `course_dc3_metadata`) llevan columnas `wp_*` de enlace y un timestamp de última sincronización — el portal es la fuente de verdad de la estructura corporativa, pero un caché de lo que vive en Tutor LMS.

## Dos connection strings

- `DATABASE_URL`: pooler de Supabase (puerto 6543), usado por la app en runtime.
- `DIRECT_URL`: conexión directa (puerto 5432), usada por `prisma migrate` — ver `prisma.config.ts`.

## Migraciones

```bash
npm run prisma:migrate     # prisma migrate dev — desarrollo local
```

**Advertencia:** `prisma migrate dev` valida el historial completo contra una shadow database, y una migración antigua (`20260529_fix_rutas_constraints`) no se reproduce limpia ahí (referencia una tabla que otra migración ya había eliminado). Si `migrate dev` falla con error P3006/P3018 por esa migración, generar el SQL a mano y aplicarlo sin shadow DB:

```bash
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
# crear prisma/migrations/<timestamp>_<nombre>/migration.sql con ese SQL
npx prisma migrate deploy   # aplica migraciones pendientes directo contra la base, sin shadow DB
```

## Seed

`npm run prisma:seed` (o `npx prisma db seed`) carga un SuperAdmin, una empresa demo con su usuario HR y un empleado demo — contraseñas fijas, ver `seed.ts` para los detalles. Pensado para desarrollo local, no para producción.
