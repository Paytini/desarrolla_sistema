# Desarrolla360 Bridge

Plugin de WordPress para conectar el portal empresarial de Desarrolla360 con WordPress y Tutor LMS Pro mediante endpoints REST propios.

## Endpoints

- `GET /wp-json/desarrolla360/v1/health`
- `GET /wp-json/desarrolla360/v1/courses`
- `POST /wp-json/desarrolla360/v1/employees/upsert`
- `POST /wp-json/desarrolla360/v1/enrollments/batch`
- `GET /wp-json/desarrolla360/v1/students/{studentId}/courses`
- `GET /wp-json/desarrolla360/v1/students/{studentId}/dashboard`
- `GET /wp-json/desarrolla360/v1/students/{studentId}/certificates`
- `GET /wp-json/desarrolla360/v1/students/{studentId}/diagnostics`
- `POST /wp-json/desarrolla360/v1/students/{studentId}/access/ensure`

## Configuracion

Activa el plugin y despues ve a `Settings > Desarrolla360 Bridge`.

- `Portal Shared Key`: llave que enviara el portal en `X-D360-Portal-Key`
- `Service User ID`: usuario admin de WordPress que se usara para despachar llamadas internas a Tutor LMS
- `Tutor API Key`: opcional, API key oficial de Tutor LMS para respaldo HTTP en endpoints de enrollments
- `Tutor API Secret`: opcional, secret oficial de Tutor LMS para respaldo HTTP en endpoints de enrollments

Tambien puedes definir constantes en `wp-config.php`:

```php
define('D360_PORTAL_SHARED_KEY', 'tu_llave_compartida');
define('D360_BRIDGE_SERVICE_USER_ID', 1);
define('D360_TUTOR_API_KEY', 'tu_api_key_oficial');
define('D360_TUTOR_API_SECRET', 'tu_secret_oficial');
```

## Flujo de acceso corporativo

Para paquetes corporativos, el plugin intenta primero una ruta directa dentro de WordPress/Tutor LMS:

1. Localiza o crea la matricula `tutor_enrolled` del alumno
2. Marca la matricula con estado `completed` para habilitar acceso academico
3. Si Tutor REST niega permisos al consultar cursos del alumno, reconstruye la lista desde las matriculas locales

## Respaldo para permisos de enrollments

Si Tutor LMS responde con mensajes como `Lo siento, no tienes permisos para hacer eso`
al consultar o completar enrollments, el plugin intenta dos rutas:

1. Ruta directa por `tutor_utils()->do_enroll()` y actualizacion local de la matricula
2. `Service User ID` con llamadas internas a WordPress/Tutor
3. `Tutor API Key` + `Tutor API Secret` como respaldo HTTP oficial contra `/wp-json/tutor/v1/...`

La ruta `POST /students/{studentId}/access/ensure` usa primero la ruta interna y,
si recibe un error de permisos, reintenta automaticamente con las credenciales oficiales de Tutor LMS.

## Diagnostico de progreso

La ruta `GET /students/{studentId}/diagnostics` devuelve, por curso:

1. `rest_snapshot`: lo que logro devolver Tutor LMS por REST
2. `direct_snapshot`: el respaldo basado en matriculas locales `tutor_enrolled`
3. `calculated`: el calculo del bridge con lecciones completadas, lecciones totales y porcentaje final
4. `enrollment`: datos de la matricula local encontrada
5. `certificate`: hash del certificado, URL publica, `page_probe` con paginas inspeccionadas y fallback por attachment si aplica

Puedes filtrar por un curso concreto con `?course_id=28528`.
