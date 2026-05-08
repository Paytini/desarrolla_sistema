# WordPress Bridge

## Objetivo

Este puente conecta el portal B2B con el WordPress actual donde viven `Tutor LMS Pro` y las constancias. La idea es que el portal no acceda a la base de datos de WordPress de forma directa.

## Estrategia

- Plugin propio en WordPress: `Desarrolla360 Bridge`
- Endpoints REST propios bajo `desarrolla360/v1`
- Autenticacion por `X-D360-Portal-Key` o por `Application Passwords` de WordPress
- Usuario de servicio de WordPress para despachar llamadas internas a Tutor LMS

## Endpoints implementados

- `GET /wp-json/desarrolla360/v1/health`
- `GET /wp-json/desarrolla360/v1/courses`
- `POST /wp-json/desarrolla360/v1/bundles`
- `GET /wp-json/desarrolla360/v1/bundles/{bundleId}/diagnostics`
- `POST /wp-json/desarrolla360/v1/employees/upsert`
- `POST /wp-json/desarrolla360/v1/enrollments/batch`
- `GET /wp-json/desarrolla360/v1/students/{studentId}/courses`
- `GET /wp-json/desarrolla360/v1/students/{studentId}/dashboard`
- `GET /wp-json/desarrolla360/v1/students/{studentId}/certificates`
- `GET /wp-json/desarrolla360/v1/students/{studentId}/diagnostics`

## Variables del portal

```bash
WP_BRIDGE_BASE_URL=https://tusitio.com/wp-json/desarrolla360/v1
WP_BRIDGE_PORTAL_KEY=tu_llave_compartida
NEXT_PUBLIC_WORDPRESS_SITE_URL=https://tusitio.com
BRIDGE_WEBHOOK_SECRET=tu_secreto_del_webhook
```

Alternativa oficial de WordPress:

```bash
WP_BRIDGE_BASE_URL=https://tusitio.com/wp-json/desarrolla360/v1
WP_BRIDGE_BASIC_USER=servicio@tudominio.com
WP_BRIDGE_BASIC_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
NEXT_PUBLIC_WORDPRESS_SITE_URL=https://tusitio.com
```

`NEXT_PUBLIC_WORDPRESS_SITE_URL` debe ser la base publica del WordPress donde vive Tutor LMS.
Ejemplo: si `WP_BRIDGE_BASE_URL` es `https://desarrolla360.com/wp-json/desarrolla360/v1`,
la variable publica debe ser `https://desarrolla360.com`.

## Flujo recomendado

1. RH crea al empleado en el portal.
2. Si el puente esta configurado, el portal crea o vincula el usuario de WordPress.
3. El portal inscribe al empleado en los cursos del paquete activo.
4. El portal consulta la lista de cursos del alumno y cachea el progreso.
5. Mas adelante, una tarea programada podra refrescar progreso y constancias.
6. Opcionalmente, el bridge puede empujar cambios academicos por webhook cada minuto cuando detecta diferencias reales.

Para crear paquetes en el portal:

1. `SuperAdmin` abre la pantalla de paquetes.
2. El portal consulta `GET /courses` en el bridge.
3. Se muestran los cursos reales de Tutor LMS como seleccion multiple.
4. Al guardar, el portal intenta crear un `bundle privado` en Tutor LMS mediante `POST /bundles`.
5. El paquete almacena los cursos seleccionados y tambien cachea el `wp_bundle_id` real devuelto por WordPress.

## Instalacion del plugin

1. Copiar la carpeta `wordpress-plugin/desarrolla360-bridge` al directorio `wp-content/plugins/`.
2. Activar el plugin desde WordPress.
3. Ir a `Settings > Desarrolla360 Bridge`.
4. Configurar la llave compartida y el `Service User ID`.
5. Si quieres sincronizacion casi en tiempo real, configurar `Portal Webhook URL` y `Portal Webhook Secret`.
6. Verificar el endpoint `health`.
7. Si quieres que el portal cree bundles automaticamente, activar el addon oficial `Course Bundle` de Tutor LMS Pro.

## Notas tecnicas

- El plugin usa `register_rest_route()` con namespace propio, como recomienda WordPress.
- Tutor LMS Pro expone REST APIs oficiales para enrolamiento y consultas de cursos de estudiantes.
- `certificates` se construye como una normalizacion defensiva de la respuesta del estudiante; la extraccion exacta puede ajustarse segun el payload real del sitio.
- `diagnostics` sirve para comparar el payload REST de Tutor LMS contra el calculo interno del bridge y las matriculas locales.
- `bundles/{bundleId}/diagnostics` sirve para inspeccionar un bundle manual existente y descubrir que meta/estructura usa realmente Tutor LMS para guardar sus cursos.
- El webhook academico usa firma `HMAC SHA-256` con headers `X-D360-Webhook-Timestamp` y `X-D360-Webhook-Signature`.
- El bridge revisa alumnos vinculados en lotes pequenos cada minuto y solo envia snapshots cuando cambia el hash del aprendizaje del alumno.

Ejemplo rapido:

```bash
curl \
  -H "X-D360-Portal-Key: TU_LLAVE" \
  "https://tusitio.com/wp-json/desarrolla360/v1/bundles/123/diagnostics"
```

## Fuentes oficiales verificadas

- WordPress `register_rest_route()`: https://developer.wordpress.org/reference/functions/register_rest_route/
- WordPress Application Passwords REST reference: https://developer.wordpress.org/rest-api/reference/application-passwords/
- Tutor LMS REST APIs Pro: https://docs.themeum.com/tutor-lms/developer-documentation/rest-apis-for-tutor-lms-pro/
- Tutor LMS REST API introduction: https://docs.themeum.com/tutor-lms/developer-documentation/introduction-to-rest-api/
- Tutor LMS Certificates: https://docs.themeum.com/tutor-lms/addons/certificate/
