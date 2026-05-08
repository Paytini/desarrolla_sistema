# Blueprint Tecnico

## Vision

Desarrolla360 necesita un portal B2B multiempresa para vender paquetes de cursos a empresas y darles una vista privada sobre:

- Empleados registrados
- Cursos asignados
- Progreso individual y global
- Trayectorias de aprendizaje
- Constancias por empleado

La decision principal es **no reemplazar Tutor LMS**. El portal debe funcionar como capa de administracion empresarial encima del ecosistema actual:

- `WordPress`: sitio principal, landing pages y login academico.
- `Tutor LMS Pro`: cursos, progreso y constancias.
- `WooCommerce`: venta individual al publico.
- `Portal Empresarial`: empresas, paquetes, cupos, usuarios RH y analitica B2B.

## Arquitectura objetivo

```text
Sitio publico WordPress (Hostinger Business)
|- Marketing y SEO
|- WooCommerce individual
|- Tutor LMS Pro

Portal privado B2B (subdominio)
|- Next.js
|- NextAuth
|- Prisma
|- PostgreSQL

Plugin puente en WordPress
|- Endpoints seguros para usuarios, cursos, inscripciones y constancias
|- JWT o token de servicio
|- Filtros por empresa
```

## Roles y permisos

### SuperAdmin

- Crear, activar, suspender y renovar empresas
- Definir paquete contratado y vigencia
- Definir numero maximo de empleados
- Crear usuarios RH iniciales
- Ver reportes globales y uso por empresa
- Forzar cierre de sesiones o suspender accesos

### Empresa / RH

- Ver resumen de su empresa
- Dar de alta, baja o importar empleados
- Consumir los cupos contratados
- Asignar cursos del paquete activo
- Ver avance, rezago y constancias
- Descargar reportes por empleado o por curso

### Empleado

- Ver cursos asignados
- Acceder al curso correspondiente en Tutor LMS
- Consultar su porcentaje de avance
- Revisar trayectoria
- Descargar sus constancias

## Modulos funcionales

### 1. Gestion de empresas

Responsable: `SuperAdmin`

- Alta de empresa
- Datos fiscales y administrativos
- Estado activo / suspendido
- Vigencia del contrato
- Cupos comprados y usados
- Usuario RH primario

### 2. Gestion de paquetes

Responsable: `SuperAdmin`

- Catalogo de paquetes
- Cursos contenidos por paquete
- Vigencias
- Renovaciones
- Historial de activaciones

### 3. Gestion de empleados

Responsable: `RH`

- Alta manual
- Importacion masiva por Excel/CSV
- Baja logica
- Reasignacion de cupos
- Edicion de datos laborales

### 4. Asignacion academica

Responsable: `RH`

- Asignar cursos del paquete vigente
- Inscripcion del empleado en WordPress/Tutor LMS
- Reglas de reemplazo de empleado
- Reglas de reingreso

### 5. Monitoreo y reportes

Responsable: `RH` y `SuperAdmin`

- Avance promedio por empresa
- Avance por empleado
- Cursos activos, vencidos y completados
- Empleados sin iniciar
- Empleados rezagados
- Constancias emitidas

### 6. Portal del empleado

Responsable: `Empleado`

- Vista de mis cursos
- Vista de progreso
- Enlace controlado a Tutor LMS
- Descarga de constancias

## Integracion con WordPress y Tutor LMS

## Principio rector

El portal **no debe consultar la base de datos de WordPress de forma directa**. La integracion recomendada es:

1. `Plugin puente` en WordPress
2. Endpoints REST propios
3. Autenticacion con token de servicio o JWT
4. Sincronizacion selectiva al portal

## Endpoints recomendados del plugin puente

- `POST /portal/v1/usuarios/empleado`
  Crea o vincula un usuario WordPress para el empleado.

- `POST /portal/v1/inscripciones`
  Inscribe a un empleado en uno o varios cursos.

- `GET /portal/v1/empresas/{empresaId}/progreso`
  Devuelve progreso agregado e individual.

- `GET /portal/v1/empleados/{empleadoId}/cursos`
  Lista cursos asignados y progreso.

- `GET /portal/v1/empleados/{empleadoId}/constancias`
  Lista constancias y URLs disponibles.

- `POST /portal/v1/sync/empresa/{empresaId}`
  Fuerza sincronizacion manual desde SuperAdmin.

## Estrategia de sincronizacion

- `Lectura en caliente` solo para eventos especificos.
- `Cache local` en PostgreSQL para dashboards.
- `Jobs programados` para refrescar progreso y constancias.
- `Polling corto recomendado` cada 60 segundos para mantener el portal casi en tiempo real sin depender de webhooks de Tutor LMS.

## Modelo de datos

El esquema actual ya cubre buena parte de la base:

- `Empresa`
- `Usuario`
- `Paquete`
- `PaqueteCurso`
- `EmpresaPaquete`
- `Empleado`
- `EmpleadoCurso`
- `Constancia`
- `SesionPortal`

## Ajustes recomendados al modelo

### Alta prioridad

- Relacionar `Empleado` con `Usuario` del portal para evitar doble identidad local.
- Crear una tabla `AsignacionCurso` si se quiere separar "curso asignado" de "curso ya sincronizado".
- Agregar `AuditLog` para altas, bajas, importaciones y cambios de cupo.
- Agregar tabla `InvitacionRH` o `InvitacionUsuario` para onboarding controlado.

### Media prioridad

- Tabla `ImportacionEmpleado` para historial de cargas Excel.
- Tabla `EmpresaConfiguracion` para branding, idioma, politicas y caducidad.
- Tabla `Notificacion` para avisos internos del portal.

## Flujo operativo

### Venta de paquete

1. Desarrolla360 vende el paquete de forma presencial o comercial.
2. SuperAdmin crea la empresa.
3. SuperAdmin asigna cupos, vigencia y paquete.
4. SuperAdmin crea el usuario RH inicial.

### Alta de empleados

1. RH inicia sesion.
2. RH crea empleados o importa archivo.
3. El sistema valida cupos disponibles.
4. El portal crea o vincula usuario WordPress.
5. El portal inscribe al empleado en los cursos definidos.

### Consumo del empleado

1. Empleado entra al portal.
2. Ve cursos y progreso sincronizado.
3. Usa enlace controlado a Tutor LMS para estudiar.
4. Al completar, Tutor LMS genera constancia.
5. El portal sincroniza avance y constancia.

## Infraestructura recomendada

## Opcion MVP recomendada

- `WordPress` se mantiene en Hostinger Business
- `Portal Next.js` en subdominio separado
- `Base de datos PostgreSQL` en VPS Hostinger
- `Nginx + PM2` para el portal si se usa VPS

## Opcion de bajo esfuerzo operativo

Si el trafico inicial es moderado, el portal puede iniciar en entorno administrado compatible con Node.js y migrar a VPS despues.

## Separacion por dominio

- `www.desarrolla360.com`: sitio publico
- `portal.desarrolla360.com`: portal B2B
- `api.desarrolla360.com` o ruta interna WordPress: plugin puente

## Seguridad

- Aislamiento por `empresa_id` en todas las consultas
- Middleware por rol y por tenant
- Sesiones revocables
- Registro de auditoria
- Rate limiting para login e importaciones
- Webhooks o jobs firmados para sincronizacion
- Tokens de integracion separados por entorno

## Riesgos a cuidar

- Doble login entre portal y WordPress
- Falta de sincronizacion de progreso en tiempo real
- Cupos mal consumidos si se permite reactivar empleados sin reglas
- RH viendo datos de otra empresa por filtros mal implementados
- Dependencia excesiva de endpoints no oficiales de Tutor LMS

## Estrategia recomendada de implementacion

### Fase 1. Fundacion

- Modelo de datos del portal
- Login por roles
- Dashboard base por rol
- CRUD de empresas
- CRUD de empleados

### Fase 2. Integracion academica

- Plugin puente WordPress
- Alta automatica de usuarios WP
- Inscripcion en cursos
- Sincronizacion de progreso

### Fase 3. Reporteo y constancias

- KPIs por empresa
- Exportables
- Vista de constancias
- Alertas por rezago

### Fase 4. Operacion y escalamiento

- Importaciones masivas
- Auditoria
- Monitoreo
- SSO o login unificado

## Decisiones para este repo

- Mantener `Next.js + Prisma + NextAuth`
- Usar `PostgreSQL` como base del portal
- Mantener el sitio publico fuera del repo
- Construir el plugin puente como proyecto hermano o plugin WP dedicado
