# Informe Financiero — Costos de Infraestructura por Fase

**Fecha:** 2026-08-01 · Precios verificados en las páginas oficiales ese día. Todos los montos en **USD/mes**.
**Base:** fases y volúmenes de [INFORME-CAPACIDAD.md](INFORME-CAPACIDAD.md); hallazgos de [INFORME-RENDIMIENTO.md](INFORME-RENDIMIENTO.md).

> ⚠️ Los costos de uso (cómputo, requests, correos) son **estimaciones** derivadas del modelo de tráfico de cada fase. Los precios unitarios sí son los oficiales vigentes. Configurar *Spend Management* en Vercel (alertas + pausa automática) desde el día 1.

---

## 1. Resumen ejecutivo

| | F0 · Hoy (~10k usuarios) | F1 · Quick wins (~50k) | F2 · Estructural (100k) | F3 · Consolidación (100k+) |
|---|---|---|---|---|
| Vercel | $20–25 | $60–125 | $150–300 | $140–280 |
| Supabase | $25–30 | $30–75 | $125–235 | $125–235 |
| AWS SES | $1–3 | $10–16 | $30–80 | $30–80 |
| Vercel Blob | <$1 | <$1 | $2–5 | $2–5 |
| Cloudflare (WP) | $0 | $0 | $0 | $5–25 |
| Hosting WP (externo) | actual | actual | actual | +$30–150 (dimensionar) |
| **Total portal** | **~$50–60** | **~$100–215** | **~$310–620** | **~$300–625 + WP** |

**Conclusiones clave:**
1. Escalar a 100k usuarios cuesta **~$300–600/mes de infraestructura** — el costo dominante no es el cómputo sino la **base de datos (Supabase Large/XL)** y los **edge requests de Vercel**.
2. La estrategia monolítica recomendada (tabla `jobs` + crons de Vercel) tiene **costo marginal ~$0**: los crons están incluidos (100 por proyecto en Pro) y sus ejecuciones se facturan como funciones normales que el crédito de $20 absorbe en gran parte. Las alternativas gestionadas (Inngest $99/mes, QStash, Accelerate $49+/mes) **no son necesarias** hasta que los números digan lo contrario.
3. Varias de las optimizaciones del plan de rendimiento **reducen** la factura: bajar el polling ÷4 (menos invocaciones y edge requests), DC-3 almacenado en Blob (CPU → casi cero por descarga), KPIs en SQL (menos CPU y menos tier de DB).

---

## 2. Tarjeta de precios de referencia (verificados 2026-08-01)

### Vercel — plan Pro ([pricing](https://vercel.com/pricing), [docs de funciones](https://vercel.com/docs/functions/usage-and-pricing))

| Concepto | Precio (región iad1, la más barata — coincide con la DB en us-east-1) | Incluido en Pro |
|---|---|---|
| Base Pro | **$20/mes por asiento** (viewer gratis) | crédito de uso de $20/mes (no acumulable) |
| CPU activa (Fluid) | $0.128/hora — solo mientras el código ejecuta, no durante I/O | — (todo on-demand, compensado por el crédito) |
| Memoria aprovisionada | $0.0106/GB-hora | — |
| Invocaciones | $0.60 / millón | — |
| Edge requests (CDN) | $2.00 / millón tras lo incluido | **10 M/mes** |
| Transferencia rápida | $0.15/GB tras lo incluido | **1 TB/mes** |
| **Cron jobs** | ejecuciones = funciones normales (sin cargo extra por el cron) | **100 crons/proyecto**, mínimo cada 1 min |
| **Vercel Queues** | $0.60 / millón de operaciones (mensajes en chunks de 4 KiB) | — |
| Blob: almacenamiento | $0.023/GB-mes | ~5 GB |
| Blob: ops simples (lecturas con cache miss) | ~$0.40 / millón | ~100 K |
| Blob: ops avanzadas (`put`/`list`) | ~$5.00 / millón | ~10 K |
| Blob: transferencia | $0.05/GB | ~100 GB |
| ISR/Runtime cache | lecturas $0.40/M unidades · escrituras $4.00/M (1 unidad = 8 KB) | — |
| `maxDuration` | hasta **800 s GA** (1800 s beta) — sin fee: se paga la CPU/memoria consumida | default 300 s |

### Supabase ([pricing](https://supabase.com/pricing), [compute](https://supabase.com/docs/guides/platform/compute-and-disk))

Plan **Pro: $25/mes** (incluye $10 de crédito de cómputo, 8 GB disco, 250 GB egress). El cómputo se suma por tier — el dato crítico para este proyecto es el **límite de clientes del pooler** (el techo identificado en G-3):

| Tier | ~$/mes (bruto) | RAM | Conexiones directas | **Clientes pooler** |
|---|---|---|---|---|
| Micro | $10 (cubierto por el crédito) | 1 GB | 60 | **200** |
| Small | $15 | 2 GB | 90 | **400** |
| Medium | $60 | 4 GB | 120 | **600** |
| Large | $110 | 8 GB | 160 | **800** |
| XL | $210 | 16 GB | 240 | **1,000** |
| 2XL | $410 | 32 GB | 380 | **1,500** |

Extras: disco $0.125/GB-mes · egress $0.09/GB · PITR (backup punto-en-tiempo) desde **$100/mes** — recomendado a partir de F2, cuando la DB es el sistema de registro de 100k personas.

### AWS SES ([pricing](https://aws.amazon.com/ses/pricing/))

| Concepto | Precio |
|---|---|
| Envío (cuentas existentes, à la carte) | **$0.10 / 1,000 correos** |
| Envío (cuentas nuevas desde jul-2026, plan "Essentials") | **~$0.16 / 1,000** ⚠️ verificar en la calculadora |
| Free tier | ya no existe para cuentas nuevas (solo $200 de crédito general AWS por 6 meses) |
| Subir cuota/tasa de envío | **gratis** (solicitud a soporte) — default de producción típico ~14 correos/s |
| IP dedicada (opcional, no necesaria aún) | $24.95/mes |

⚠️ **Nota para este proyecto:** el `.env` actual no tiene credenciales AWS — si la cuenta SES es nueva, presupuestar $0.16/1,000, no $0.10.

### Servicios opcionales evaluados (solo si el monolito se queda corto)

| Servicio | Precio | Veredicto para este proyecto |
|---|---|---|
| Cloudflare Free + APO WordPress | $0 + **$5/mes** | ✅ **Recomendado en F3** para el sitio WP (CDN + caché de página). 10 cache rules gratis alcanzan. |
| Cloudflare Pro | $20–25/mes | Solo si se quiere Polish/WAF extra; APO viene incluido. |
| Cloudflare Turnstile | **Gratis** (ilimitado, hasta 20 widgets) | ✅ Ya en uso; seguirá gratis. |
| Vercel Queues | $0.60/M ops | Alternativa nativa si la tabla `jobs`+cron se queda corta. Barata, pero el cron es $0. |
| Upstash QStash | $1 / 100k mensajes | Alternativa a Queues; innecesaria teniendo crons. |
| Upstash Redis | pay-as-you-go $0.20/100k comandos | Solo si en F3 hiciera falta lock/cache cross-instance; el lock en Postgres (M-5) es gratis. |
| Inngest | desde **$99/mes** | ❌ No justificado: el patrón jobs+cron cubre lo mismo a costo ~$0. |
| Prisma Accelerate | base $10–49/mes + $8–18/M queries | ❌ No justificado: configurar el pool `pg` (G-3) es gratis y resuelve el mismo problema hasta ~10k concurrentes. |

---

## 3. Modelo de uso por fase (supuestos del cálculo)

Comportamiento asumido por usuario activo: **4 sesiones/mes × ~10 páginas × ~10 min por sesión**. El polling y el peso por página cambian según la fase (las optimizaciones lo reducen).

| Driver mensual | F0 (10k usuarios) | F1 (50k) | F2 (100k) | F3 (100k+) |
|---|---|---|---|---|
| Page views (RSC) | 0.4 M | 2 M | 4 M | 4 M |
| Polling de empleados | 1.6 M (4/min) | 2 M (1/min) | 4 M | 3 M (dirigido) |
| Logins (requests auth) | 0.16 M | 0.6 M | 1.2 M | 1.2 M |
| Webhooks Tutor LMS | 0.1 M | 0.5 M | 1 M | 0.3 M (batch 50×) |
| Ejecuciones de jobs/crons | ~60 | ~60 | ~45 k (cron/min) | ~45 k |
| **Invocaciones de función** | **~2.5 M** | **~5.5 M** | **~11 M** | **~9 M** |
| Edge requests (assets+páginas, ~15/pv) | ~12 M | ~30–60 M | ~60–75 M | ~60–75 M |
| Transferencia | ~0.1 TB | ~0.4 TB | ~1.2 TB | ~1.2 TB |
| Correos SES | ~15 k | ~100 k | ~400 k | ~400 k |

---

## 4. Detalle por fase

### F0 — Hoy (~10,000 usuarios registrados) · **~$50–60/mes**

| Partida | Cálculo | Costo |
|---|---|---|
| Vercel Pro base (1 asiento) | | $20.00 |
| · Invocaciones | 2.5 M × $0.60/M | $1.50 |
| · CPU activa | ~40 h (bcryptjs 0.3–0.6 s/login pesa aquí) × $0.128 | $5.10 |
| · Memoria | ~500 GB-h × $0.0106 | $5.30 |
| · Edge requests | ~2 M sobre los 10 M incluidos × $2 | $4.00 |
| · Crédito Pro | | −$15.90 (absorbe el uso) |
| **Vercel subtotal** | | **~$20–25** |
| Supabase Pro + Micro/Small | $25 + ($0–15 − $10 crédito) | **$25–30** |
| SES | 15 k × $0.10–0.16/1k | **$1.50–2.40** |
| Blob (firmas, logos) | <1 GB | **<$1** |
| **TOTAL F0** | | **≈ $50–60** |

*Lectura:* hoy la infraestructura es barata — el problema de F0 no es el costo sino que **se cae** con los límites descritos en el informe de rendimiento (pooler de 200 clientes con Micro, timeouts, etc.).

### F1 — Quick wins (~50,000 usuarios) · **~$100–215/mes**

| Partida | Cálculo | Costo |
|---|---|---|
| Vercel Pro base | | $20.00 |
| · Invocaciones | 5.5 M × $0.60/M | $3.30 |
| · CPU activa | ~80 h (bcrypt nativo baja el login a ~30 ms; índices bajan queries) | $10.20 |
| · Memoria | ~1,000 GB-h | $10.60 |
| · Edge requests | 20–50 M sobre incluido × $2 | $40–100 |
| · Crédito | | −$20.00 |
| **Vercel subtotal** | | **~$60–125** |
| Supabase Pro + Small/Medium | $25 + ($5–50 neto) — pooler 400–600 clientes; con pool `max:3` configurado alcanza | **$30–75** |
| SES | 100 k × $0.10–0.16/1k | **$10–16** |
| Blob | | **<$1** |
| **TOTAL F1** | | **≈ $100–215** |

*Palanca de ahorro:* el mayor rubro variable son los **edge requests** (assets estáticos). Mitigación gratuita: `Cache-Control: immutable` largo en assets (Next ya lo hace) y evitar re-navegaciones innecesarias (el `router.refresh()` del polling actual re-descarga payloads RSC — arreglarlo en G-4 también ahorra dinero).

### F2 — Estructural (100,000 usuarios) · **~$310–620/mes**

| Partida | Cálculo | Costo |
|---|---|---|
| Vercel Pro base (1–2 asientos) | | $20–40 |
| · Invocaciones | 11 M × $0.60/M | $6.60 |
| · CPU activa | ~200 h (jobs de enrolamiento/import; KPIs ya en SQL) | $25.60 |
| · Memoria | ~2,500 GB-h (jobs con esperas I/O a WP facturan memoria, no CPU) | $26.50 |
| · Edge requests | 50–65 M sobre incluido × $2 | $100–130 |
| · Transferencia | ~0.2 TB sobre 1 TB × $0.15/GB | $30.00 |
| · ISR/Runtime cache | lecturas de snapshots cacheados | $2–5 |
| · Crédito | | −$20.00 |
| **Vercel subtotal** | | **~$150–300** |
| Supabase Pro + Large/XL | $25 + ($100–200 neto) — pooler 800–1,000 clientes para picos de 8–15k concurrentes | **$125–235** |
| · PITR (recomendado ya) | | +$100 opcional |
| SES | 400 k × $0.10–0.16/1k (outbox con rate limit ≤14/s) | **$30–80** |
| Blob (DC-3 almacenados) | 100 k PDFs ≈ 20 GB × $0.023 + puts + descargas 20 GB × $0.05 | **$2–5** |
| **TOTAL F2** | | **≈ $310–620** (+$100 con PITR) |

*Lectura:* aquí la DB pasa a ser el rubro #1. La alternativa a subir de tier sería Prisma Accelerate, pero a 15–30 M queries/mes costaría $130–500 — **subir el tier de Supabase es más barato y más simple.**

### F3 — Consolidación 100k+ · **~$300–625/mes + WordPress**

| Partida | Cambio vs F2 | Costo |
|---|---|---|
| Vercel | webhooks batch (÷50) y polling dirigido reducen invocaciones/edge ~15% | **$140–280** |
| Supabase | igual (Large/XL) | **$125–235** |
| SES | igual | **$30–80** |
| Blob | igual | **$2–5** |
| **Cloudflare para WordPress** | Free + APO ($5) o Pro ($20–25) — CDN + caché de página para Tutor LMS | **$5–25** |
| **Hosting WordPress** | dimensionar PHP workers + Redis object cache — depende del proveedor actual (no analizado desde dentro) | **+$30–150 estimado** |
| **TOTAL F3** | | **≈ $300–625 + WP** |

*Nota WordPress:* es el único costo que no controla el portal. El streaming de video ya lo absorbe WP (decisión correcta — ver informe de rendimiento §2); con CDN de Cloudflare delante, la mayor parte de ese tráfico pasa a la caché y el hosting WP no necesita crecer proporcionalmente a los usuarios.

---

## 5. Costo por usuario y decisiones

| Fase | Usuarios | Costo total | **Costo por usuario registrado/mes** |
|---|---|---|---|
| F0 | 10 k | ~$55 | $0.0055 |
| F1 | 50 k | ~$160 | $0.0032 |
| F2 | 100 k | ~$465 | $0.0047 |
| F3 | 100 k+ | ~$550 (con WP) | ~$0.0055 |

**El costo de infraestructura es ~medio centavo por usuario al mes** — irrelevante frente a cualquier precio B2B por cupo. La decisión financiera importante no es optimizar centavos sino:

1. **No comprar lo que no hace falta:** Inngest ($99), Accelerate ($49+), Redis gestionado — el plan monolítico los evita; revisar solo si las pruebas de carga de cada fase muestran un cuello que el cron-por-minuto no cubre.
2. **Sí pagar a tiempo:** el tier de Supabase **antes** del pico (los límites de pooler son duros y el upgrade tiene ~minutos de ventana), y PITR cuando la DB sea el registro de clientes enterprise.
3. **Vigilar los edge requests** — es el rubro Vercel que crece más rápido y el más sensible al polling; las optimizaciones de G-4 son también las de mayor ahorro.
4. **Spend Management de Vercel activado** con alerta a ~2× el presupuesto de la fase (un bug de polling puede multiplicar invocaciones — hoy mismo el poll de 15 s es un ejemplo).

---

## 6. Fuentes

Precios verificados el 2026-08-01 en: [Vercel pricing](https://vercel.com/pricing) · [Vercel functions](https://vercel.com/docs/functions/usage-and-pricing) · [Vercel regional pricing](https://vercel.com/docs/pricing/regional-pricing) · [Vercel cron](https://vercel.com/docs/cron-jobs/usage-and-pricing) · [Vercel Queues](https://vercel.com/docs/queues/pricing) · [Vercel Blob](https://vercel.com/docs/vercel-blob/usage-and-pricing) · [Supabase pricing](https://supabase.com/pricing) · [Supabase compute](https://supabase.com/docs/guides/platform/compute-and-disk) · [AWS SES pricing](https://aws.amazon.com/ses/pricing/) · [Cloudflare plans](https://www.cloudflare.com/plans/) · [Turnstile](https://developers.cloudflare.com/turnstile/plans/) · [Upstash QStash](https://upstash.com/pricing/qstash) · [Upstash Redis](https://upstash.com/pricing/redis) · [Inngest](https://www.inngest.com/pricing) · [Prisma](https://www.prisma.io/pricing)
