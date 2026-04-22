# Roadmap de Implementacion

## Estado actual

La base del portal ya cuenta con:

- Autenticacion con `NextAuth`
- Esquema inicial en `Prisma`
- Sidebar por rol
- Rutas base del portal

## Brechas actuales

- Falta CRUD real de empresas
- Faltan dashboards completos
- No existe integracion con WordPress/Tutor LMS
- No existe importacion de empleados
- No existen reportes ni constancias sincronizadas

## Plan por entregables

### Entregable 1. Fundamentos del portal

- Corregir sesiones y layout por rol
- Terminar navegacion y pantallas base
- Seed con `SuperAdmin`, empresa demo, RH demo y empleado demo
- Middleware por rol y tenant

### Entregable 2. Backoffice SuperAdmin

- CRUD de empresas
- CRUD de paquetes
- Asignacion de vigencias y cupos
- Alta de usuario RH inicial

### Entregable 3. Backoffice RH

- Alta manual de empleados
- Importacion CSV/Excel
- Control de cupos
- Vista de progreso por empleado

### Entregable 4. Portal empleado

- Mis cursos
- Mi progreso
- Mis constancias
- Enlaces a Tutor LMS

### Entregable 5. Integracion WordPress

- Plugin puente
- Provision de usuarios
- Inscripciones
- Progreso y constancias

### Entregable 6. Operacion

- Logs
- Reportes globales
- Monitoreo de sincronizacion
- Hardening de seguridad

## Siguiente sprint recomendado

1. Cerrar el esquema de datos final del portal.
2. Implementar CRUD de `Empresa`, `Usuario RH` y `Empleado`.
3. Crear middleware de permisos por rol.
4. Diseñar el contrato del plugin puente para WordPress.
5. Crear sincronizacion inicial de cursos y constancias.
