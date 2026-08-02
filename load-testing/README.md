# Load Testing Suite — Portal Desarrolla360

Seeders y pruebas de carga (Artillery + Playwright) para el Portal Empresarial Desarrolla360. Este directorio es **aislado**: no modifica nada del código de la app.

📖 **[SCRIPTS.md](SCRIPTS.md) es el manual completo** — runbooks paso a paso, referencia de cada script, variables y diagnóstico. Este README solo te orienta.

## Nunca apuntar a producción

No ejecutes nada de aquí contra `https://empresas.desarrolla360.com` ni contra el WordPress real. Los escenarios tienen el target fijado a `localhost:3005` a propósito. Para medir contra un despliegue real, lee [TARGET-REMOTO.md](TARGET-REMOTO.md) — usa un *preview* de Vercel, nunca producción.

---

## Los dos modos de simulación

La decisión de diseño central del suite: son **preguntas distintas**, por eso son comandos distintos.

| | `npm run simulate:browser` | `npm run simulate:http` |
|---|---|---|
| **Pregunta** | ¿Cómo se ve y se siente la app para un usuario? | ¿Cuántos usuarios aguanta el servidor? |
| **Cómo** | Chromium real, login escribiendo en el formulario, Turnstile incluido | Peticiones HTTP puras, login por API, cookie reutilizada |
| **Escala** | 1-5 navegadores (cada uno cuesta 150-300 MB y CPU) | Cientos de usuarios virtuales |
| **Ventana visible** | Sí por defecto | No aplica |
| **Sirve para medir capacidad** | **No** — compite por CPU con el servidor | **Sí** |

Al servidor le da igual si el cliente es un navegador o `curl`: ve las mismas peticiones HTTP. El navegador solo añade valor para ver la experiencia del cliente.

Un matiz que cambia los números: el modo HTTP hace login **una sola vez por usuario** y luego navega en bucle, porque así es como se comporta una persona real (entra una vez, navega 30-45 min). Los escenarios originales `01`-`06` hacen login en cada iteración, lo que sobrepondera la operación más cara y acaba midiendo "cuántos logins por segundo aguanta". Detalle en [SCRIPTS.md → Escenarios](SCRIPTS.md#escenarios).

---

## Arranque rápido

Tres terminales, todas con `cd load-testing`:

```bash
# primera vez
npm install && cp .env.app.example .env.app && npm run verify

npm run mock-bridge          # terminal A — sustituye a WordPress
./scripts/start-target.sh    # terminal B — la app en :3005

npm run seed                 # terminal C
npm run check-target         # ← si esto falla, para y revisa el diagnóstico
npm run simulate:ladder      # Comenzar por aquí: encuentra cuánto aguanta tu máquina
npm run teardown             # al terminar si se desea limpiar los datos sembrados
```

Secuencias completas por escenario (con la escala de siembra que le conviene a cada uno) y tabla de errores comunes: **[SCRIPTS.md → Runbooks](SCRIPTS.md#runbooks-por-escenario)**.

---

## Todos los comandos

| Comando | Qué hace |
|---|---|
| `npm run verify` | Comprueba conexión a la base y que existen las tablas |
| `npm run seed` | Siembra empresas, usuarios, cursos y constancias |
| `npm run teardown` | Borra todo lo sembrado (verifica residuo 0) |
| `npm run mock-bridge` | Levanta el sustituto de WordPress en `:4380` |
| `npm run check-target` | Verifica que los 3 roles pueden autenticarse |
| `npm run simulate:browser` | Observación: navegador visible, login por UI |
| `npm run simulate:http` | Capacidad: HTTP puro con sesión reutilizada |
| `npm run simulate:ladder` | **Escalera**: sube la carga por pasos y para al encontrar el techo |
| `npm run simulate:spike` | Avalancha de las 8:00 AM (llegada simultánea) |
| `npm run simulate:enrollment` | Enrolamiento masivo — hallazgo G-2 |
| `npm run simulate:zip` | ZIP de constancias — hallazgo G-5 |
| `npm run simulate:cache-storm` | Polling vs caché de superadmin — hallazgo G-4 |
| `npm run db:watch` | Muestrea conexiones de Postgres durante una carga — hallazgo G-3 |
| `npm run report` | Reporte visual con gráficas a partir de los resultados de una corrida |
| `npm run run-all` | Los 6 escenarios originales + informe (~25-30 min) |

Los hallazgos G-* son de [../docs-observability/INFORME-RENDIMIENTO.md](../docs-observability/INFORME-RENDIMIENTO.md); los resultados medidos están en [INFORME-LOADTEST-BASELINE.md](../docs-observability/INFORME-LOADTEST-BASELINE.md).

---

## Estructura

```
seeders/       siembra y teardown (namespace aislado)
mock-bridge/   servidor que sustituye al plugin de WordPress
artillery/     escenarios .yml + processors
  01-06        escenarios originales (login en cada iteración)
  20           modo navegador visual
  21           modo HTTP con sesión reutilizada
  30-32        escenarios dirigidos a G-2, G-5, G-4
scripts/       runners, check-target, db-watch, summarize
data/          payloads y CSVs generados — gitignored
reports/       resultados — gitignored
```

---

## Seguridad de los datos (resumen)

Los scripts escriben en la **base real**. Lo que los hace seguros: todo lo sembrado lleva un marcador (empresas `lt-*`, cursos `900101-900199`, correos tipo `emp001-lt-empresa-01@yopmail.com`) y el teardown solo borra por esos marcadores — nunca por el dominio suelto, que se llevaría por delante cualquier usuario real con yopmail.

Probado: deja residuo 0 sin tocar ninguna fila real. Los patrones exactos y cómo comprobarlos antes de borrar en un entorno nuevo: **[SCRIPTS.md → Seguridad de los datos](SCRIPTS.md#seguridad-de-los-datos)**.
