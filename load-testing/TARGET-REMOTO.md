# Correr la suite contra un despliegue remoto (preview de Vercel)

Medir contra `localhost` tiene un techo artificial: la app, Artillery y (en modo navegador) Chromium comparten la misma CPU. Los números sirven para **comparar antes/después de una optimización**, pero no dicen la capacidad real.

Para medir capacidad de verdad hay que apuntar la suite a un **despliegue real en Vercel**, desde una máquina que no sea la que corre la app.

---

## Preview o producción: qué cambia

| | Preview | `empresas.desarrolla360.com` |
|---|---|---|
| Base de datos | Puedes usar una branch de Supabase aparte | **La base real** — aunque el portal esté en modo de prueba |
| Turnstile | Despliegas con las claves de prueba | Depende de cómo esté configurado hoy |
| Bridge WordPress | Lo apuntas al mock | Apunta al WordPress real salvo que lo cambies |
| Impacto de un error | Ninguno | Datos y servicio reales |

**Estado actual (2026-08-02):** `empresas.desarrolla360.com` está en modo de prueba, sin clientes reales usándolo. Eso hace que apuntarle una carga sea **posible**, no automáticamente inocuo. Antes de hacerlo, comprueba tres cosas:

1. **¿A qué base apunta?** Si es la misma Supabase de siempre, los seeders escribirán ahí. El namespace aislado protege los datos reales (ya hay filas reales en esa base — empresas y empleados de pruebas comerciales), pero cualquier error de configuración se paga con datos de verdad.
2. **¿A qué bridge apunta?** Si `WP_BRIDGE_BASE_URL` sigue apuntando a `betatutorlms.desarrolla360.com`, toda la carga cae sobre ese WordPress — que en frío tarda 6+ s. Para una prueba de capacidad del portal, quieres el mock.
3. **¿Turnstile en modo prueba?** Con el captcha real, ningún login scriptado pasa y la corrida no mide nada.

Si las tres respuestas te convienen, adelante. Si alguna no, un preview te da el mismo dato sin el riesgo.

> Los `.yml` tienen el target fijado a `localhost:3005` a propósito: apuntar fuera exige poner `LT_TARGET_URL` de forma explícita. Es una decisión consciente, no un accidente.

**Cuando el portal salga de modo de prueba**, esta sección deja de aplicar: vuelve a ser preview siempre.

---

## Preparación del preview

### 1. Variables de entorno del preview (en el dashboard de Vercel, scope *Preview*)

```bash
# Turnstile: claves de PRUEBA de Cloudflare (siempre pasan)
NEXT_PUBLIC_TURNSTILE_SITE_KEY="1x00000000000000000000AA"
TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"

# Bridge: apuntar al mock expuesto (ver paso 2), NUNCA a betatutorlms de produccion
WP_BRIDGE_BASE_URL="https://<tu-tunel>/wp-json/desarrolla360/v1"
WP_BRIDGE_PORTAL_KEY="lt-mock-bridge-key"
NEXT_PUBLIC_WORDPRESS_SITE_URL="https://<tu-tunel>"

# Base de datos: idealmente una branch de Supabase, no la principal
DATABASE_URL="..."
DIRECT_URL="..."

BRIDGE_WEBHOOK_SECRET="lt-webhook-secret"
CRON_SECRET="lt-cron-secret"
```

### 2. Exponer el mock del bridge

El preview corre en la nube y no alcanza tu `localhost:4380`. Dos opciones:

```bash
# a) Tunel temporal (mas simple)
npm run mock-bridge          # terminal A
npx cloudflared tunnel --url http://localhost:4380    # terminal B → da una URL publica
```

```bash
# b) Desplegar el mock como su propio proyecto en Vercel/Render y usar esa URL fija
```

La opción (a) es suficiente para una sesión de pruebas; la (b) conviene si vas a repetir las corridas seguido.

### 3. Sembrar datos contra la base del preview

```bash
cd load-testing
LT_DATABASE_URL="<url de la base del preview>" npm run seed
```

`config.js` usa `LT_DATABASE_URL` con prioridad sobre `DATABASE_URL`, así que los seeders escriben en la base del preview sin tocar tu `.env` local.

---

## Correr la suite contra el preview

Todos los runners aceptan `LT_TARGET_URL`:

```bash
export LT_TARGET_URL="https://desarrolla-sistema-git-<rama>-<org>.vercel.app"
export LT_DATABASE_URL="<url de la base del preview>"

npm run check-target      # primero: verifica que los 3 roles autentican
npm run simulate:http          # capacidad (sesion reutilizada)
npm run simulate:spike         # avalancha de las 8:00 AM
npm run db:watch          # en otra terminal, durante la corrida
```

Los `.yml` tienen el target fijado a localhost por seguridad; los runners lo sobrescriben vía `--overrides` cuando `LT_TARGET_URL` está presente. Si lanzas `npx artillery run` a mano, pasa el override tú mismo:

```bash
npx artillery run artillery/21-http-user-session.yml \
  --overrides "{\"config\":{\"target\":\"$LT_TARGET_URL\"}}"
```

---

## Qué cambia en la interpretación

Contra un preview de Vercel mides la arquitectura real, y aparecen efectos que en localhost no existen:

- **Cold starts**: la primera petición a cada función serverless paga la construcción del pool de Prisma (~7 s medidos en local). Con muchas instancias arrancando a la vez durante un pico, esto se multiplica.
- **Conexiones al pooler**: cada instancia lambda abre su propio pool (hasta 10 por defecto). Es exactamente el hallazgo G-3 — y solo se reproduce de verdad con escalado horizontal. `npm run db:watch` apuntando a la base del preview es la forma de verlo.
- **Latencia de red**: suma el RTT cliente→Vercel. Compara p95 relativos, no absolutos contra los de localhost.
- **Región**: si las funciones no están en la misma región que Supabase (`us-east-1`), cada round-trip de Prisma paga la distancia. Con dashboards que hacen muchas queries, se nota.

## Limpieza

```bash
LT_DATABASE_URL="<url de la base del preview>" npm run teardown
```

Verifica que imprima `residuo namespace: 0`. Si usaste una branch de Supabase dedicada, puedes simplemente borrarla.
