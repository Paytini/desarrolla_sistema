// Genera un reporte visual (markdown + mermaid) a partir de los archivos que
// dejan las corridas: JSON de Artillery (reports/raw/*.json) y/o JSONL de
// db-watch (reports/db-watch-*.jsonl).
//
//   node scripts/report.js                       -> toma lo mas reciente de reports/
//   node scripts/report.js <archivo>             -> ese archivo
//   node scripts/report.js <artillery> <dbwatch> -> cruza ambos en un solo reporte
//
// Los numeros los calcula este script, no se estiman a ojo: cualquier lectura
// posterior (humana o de un agente) parte de aqui.

const fs = require("node:fs")
const path = require("node:path")
const config = require("../config")

const MAX_POINTS = 14 // puntos por grafica; mas que esto es ilegible en mermaid

// ---------------------------------------------------------------- utilidades

function fail(msg) {
  console.error(`error: ${msg}`)
  process.exit(1)
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"))
  } catch (e) {
    fail(`no pude leer ${file}: ${e.message}`)
  }
}

function readJsonl(file) {
  return fs
    .readFileSync(file, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l, i) => {
      try {
        return JSON.parse(l)
      } catch {
        console.warn(`aviso: linea ${i + 1} de ${path.basename(file)} corrupta, se omite`)
        return null
      }
    })
    .filter(Boolean)
}

// Reduce una serie a MAX_POINTS promediando por bloques, para que la grafica
// siga siendo legible sin mentir sobre la forma de la curva.
function downsample(points, max = MAX_POINTS) {
  if (points.length <= max) return points
  const size = Math.ceil(points.length / max)
  const out = []
  for (let i = 0; i < points.length; i += size) {
    const chunk = points.slice(i, i + size)
    const merged = { x: chunk[0].x }
    for (const key of Object.keys(chunk[0])) {
      if (key === "x") continue
      const vals = chunk.map((c) => c[key]).filter((v) => typeof v === "number")
      merged[key] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
    }
    out.push(merged)
  }
  return out
}

function detectType(file) {
  if (file.endsWith(".jsonl")) return "db-watch"
  const data = readJson(file)
  if (data && data.aggregate && data.intermediate) return "artillery"
  fail(
    `no reconozco el formato de ${path.basename(file)} (esperaba JSON de Artillery o JSONL de db-watch)`,
  )
}

function newestFile(dir, filter) {
  if (!fs.existsSync(dir)) return null
  const files = fs
    .readdirSync(dir)
    .filter(filter)
    .map((f) => ({ f: path.join(dir, f), t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)
  return files.length ? files[0].f : null
}

// ------------------------------------------------------------------ mermaid

function chart(title, yLabel, xs, series) {
  const all = series.flatMap((s) => s.values)
  const max = Math.max(...all, 1)
  const top = Math.ceil(max * 1.1)
  const lines = [
    "```mermaid",
    "xychart-beta",
    `    title "${title}"`,
    `    x-axis [${xs.join(", ")}]`,
    `    y-axis "${yLabel}" 0 --> ${top}`,
  ]
  for (const s of series) lines.push(`    line [${s.values.join(", ")}]`)
  lines.push("```")
  if (series.length > 1) {
    lines.push("")
    lines.push(`Series en orden de declaración: ${series.map((s) => `**${s.name}**`).join(" → ")}.`)
  }
  return lines.join("\n")
}

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `|${headers.map(() => "---").join("|")}|`,
    ...rows.map((r) => `| ${r.join(" | ")} |`),
  ].join("\n")
}

// --------------------------------------------------------------- artillery

function parseArtillery(file) {
  const data = readJson(file)
  const agg = data.aggregate
  const c = agg.counters || {}
  const rt = (agg.summaries || {})["http.response_time"] || {}

  const created = c["vusers.created"] || 0
  const failed = c["vusers.failed"] || 0
  const completed = c["vusers.completed"] || 0
  const requests = c["http.requests"] || 0

  const codes = Object.entries(c)
    .filter(([k]) => k.startsWith("http.codes."))
    .map(([k, v]) => [k.replace("http.codes.", ""), v])
    .sort((a, b) => b[1] - a[1])

  const errors = Object.entries(c)
    .filter(([k]) => k.startsWith("errors."))
    .map(([k, v]) => [k.replace("errors.", ""), v])
    .sort((a, b) => b[1] - a[1])

  const endpoints = Object.entries(agg.summaries || {})
    .filter(([k]) => k.startsWith("plugins.metrics-by-endpoint.response_time."))
    .map(([k, s]) => ({
      url: k.replace("plugins.metrics-by-endpoint.response_time.", ""),
      count: s.count,
      median: Math.round(s.median),
      p95: Math.round(s.p95),
      p99: Math.round(s.p99),
      max: Math.round(s.max),
    }))
    .sort((a, b) => b.p95 - a.p95)

  const t0 = data.intermediate.length ? data.intermediate[0].period : 0
  const series = data.intermediate.map((w) => {
    const wc = w.counters || {}
    const ws = (w.summaries || {})["http.response_time"] || {}
    const werr = Object.entries(wc)
      .filter(([k]) => k.startsWith("errors."))
      .reduce((a, [, v]) => a + v, 0)
    return {
      x: Math.round((Number(w.period) - Number(t0)) / 1000),
      p50: Math.round(ws.median || 0),
      p95: Math.round(ws.p95 || 0),
      p99: Math.round(ws.p99 || 0),
      rps: Math.round((w.rates || {})["http.request_rate"] || 0),
      errores: werr,
      req: wc["http.requests"] || 0,
    }
  })

  return {
    file,
    name: path.basename(file, ".json"),
    created,
    completed,
    failed,
    requests,
    errorPct: created ? ((failed / created) * 100).toFixed(1) : "0.0",
    p50: Math.round(rt.median || 0),
    p95: Math.round(rt.p95 || 0),
    p99: Math.round(rt.p99 || 0),
    max: Math.round(rt.max || 0),
    codes,
    errors,
    endpoints,
    series,
    durationSec: series.length ? series[series.length - 1].x : 0,
  }
}

// ---------------------------------------------------------------- db-watch

function parseDbWatch(file) {
  const rows = readJsonl(file)
  if (!rows.length) fail(`${path.basename(file)} no tiene muestras`)

  const series = rows.map((r) => ({
    x: r.elapsedSec,
    conexiones: r.db?.total ?? 0,
    activas: r.db?.active ?? 0,
    cluster: r.db?.clusterTotal ?? 0,
    health: r.health?.latencyMs ?? 0,
  }))

  const peak = (k) => Math.max(...series.map((s) => s[k]))
  return {
    file,
    name: path.basename(file, ".jsonl"),
    label: rows[0].label || "sin etiqueta",
    samples: rows.length,
    durationSec: series[series.length - 1].x,
    picoConexiones: peak("conexiones"),
    picoActivas: peak("activas"),
    picoCluster: peak("cluster"),
    picoHealth: peak("health"),
    healthErrores: rows.filter((r) => !r.health?.ok).length,
    series,
  }
}

// ----------------------------------------------------------------- reporte

function renderArtillery(a) {
  const pts = downsample(a.series)
  const xs = pts.map((p) => p.x)
  const out = []

  out.push(`## Carga · \`${a.name}\``)
  out.push("")
  out.push(
    table(
      ["Usuarios", "Completados", "Fallidos", "% error", "Peticiones", "p50", "p95", "p99"],
      [
        [
          a.created,
          a.completed || 0,
          a.failed,
          `${a.errorPct}%`,
          a.requests,
          `${a.p50} ms`,
          `${a.p95} ms`,
          `${a.p99} ms`,
        ],
      ],
    ),
  )
  out.push("")

  if (pts.length > 1) {
    out.push(
      chart("Latencia por ventana de 10 s", "ms", xs, [
        { name: "p50", values: pts.map((p) => p.p50) },
        { name: "p95", values: pts.map((p) => p.p95) },
        { name: "p99", values: pts.map((p) => p.p99) },
      ]),
    )
    out.push("")
    out.push(
      chart("Throughput (req/s)", "req/s", xs, [{ name: "req/s", values: pts.map((p) => p.rps) }]),
    )
    out.push("")
    if (pts.some((p) => p.errores > 0)) {
      out.push(
        chart("Errores por ventana", "errores", xs, [
          { name: "errores", values: pts.map((p) => p.errores) },
        ]),
      )
      out.push("")
    }
  }

  if (a.codes.length) {
    out.push("**Códigos de respuesta:** " + a.codes.map(([k, v]) => `\`${k}\` ${v}`).join(" · "))
    out.push("")
  }
  if (a.errors.length) {
    out.push("**Errores:** " + a.errors.map(([k, v]) => `\`${k}\` ${v}`).join(" · "))
    out.push("")
  }

  if (a.endpoints.length) {
    out.push("### Por endpoint (ordenado por p95)")
    out.push("")
    out.push(
      table(
        ["Endpoint", "Peticiones", "p50", "p95", "p99", "máx"],
        a.endpoints.map((e) => [
          `\`${e.url}\``,
          e.count,
          `${e.median} ms`,
          `${e.p95} ms`,
          `${e.p99} ms`,
          `${e.max} ms`,
        ]),
      ),
    )
    out.push("")
  }
  return out.join("\n")
}

function renderDbWatch(d) {
  const pts = downsample(d.series)
  const xs = pts.map((p) => p.x)
  const out = []

  out.push(`## Servidor · \`${d.name}\``)
  out.push("")
  out.push(
    table(
      [
        "Muestras",
        "Duración",
        "Pico conexiones",
        "Pico activas",
        "Pico cluster",
        "Pico latencia health",
      ],
      [
        [
          d.samples,
          `${d.durationSec}s`,
          d.picoConexiones,
          d.picoActivas,
          d.picoCluster,
          `${d.picoHealth} ms`,
        ],
      ],
    ),
  )
  out.push("")
  out.push(
    chart("Conexiones a Postgres", "conexiones", xs, [
      { name: "totales", values: pts.map((p) => p.conexiones) },
      { name: "activas", values: pts.map((p) => p.activas) },
    ]),
  )
  out.push("")
  out.push(
    chart("Latencia de /api/health", "ms", xs, [
      { name: "health", values: pts.map((p) => p.health) },
    ]),
  )
  out.push("")

  const first = d.series[0].conexiones
  const last = d.series[d.series.length - 1].conexiones
  const crecimiento = last - first
  // Solo se avisa si el crecimiento es significativo; +1 conexion es ruido y
  // convertirlo en alarma haria que el aviso se ignore cuando de verdad importe.
  if (crecimiento >= 4 || (first > 0 && crecimiento / first >= 0.5)) {
    out.push(
      `> Las conexiones empezaron en **${first}** y terminaron en **${last}** (pico ${d.picoConexiones}), ` +
        `sin liberarse al bajar la carga. Eso es acumulación, no uso transitorio — el síntoma del hallazgo G-3.`,
    )
    out.push("")
  } else {
    out.push(
      `> Conexiones estables (${first} → ${last}, pico ${d.picoConexiones}). ` +
        `Sin señal de acumulación en esta corrida.`,
    )
    out.push("")
  }
  return out.join("\n")
}

// -------------------------------------------------------------------- main

function main() {
  const args = process.argv.slice(2)
  let artilleryFile = null
  let dbWatchFile = null

  if (args.length === 0) {
    artilleryFile = newestFile(path.join(config.reportsDir, "raw"), (f) => f.endsWith(".json"))
    dbWatchFile = newestFile(
      config.reportsDir,
      (f) => f.startsWith("db-watch") && f.endsWith(".jsonl"),
    )
    if (!artilleryFile && !dbWatchFile)
      fail("no encontre resultados en reports/. Corre un escenario primero.")
    console.log("sin argumentos: tomando lo mas reciente de reports/")
  } else {
    for (const a of args) {
      if (!fs.existsSync(a)) fail(`no existe ${a}`)
      const t = detectType(a)
      if (t === "artillery") artilleryFile = a
      else dbWatchFile = a
    }
  }

  const parts = ["# Reporte de carga — Portal Desarrolla360", ""]
  const stamp = []
  if (artilleryFile) stamp.push(`Artillery: \`${path.basename(artilleryFile)}\``)
  if (dbWatchFile) stamp.push(`db-watch: \`${path.basename(dbWatchFile)}\``)
  parts.push(stamp.join(" · "))
  parts.push("")
  parts.push(`Target: \`${config.targetUrl}\``)
  parts.push("")
  parts.push("---")
  parts.push("")

  let a = null
  if (artilleryFile) {
    a = parseArtillery(artilleryFile)
    parts.push(renderArtillery(a))
    parts.push("---")
    parts.push("")
  }
  let d = null
  if (dbWatchFile) {
    d = parseDbWatch(dbWatchFile)
    parts.push(renderDbWatch(d))
    parts.push("---")
    parts.push("")
  }

  parts.push("## Lectura")
  parts.push("")
  if (a) {
    if (Number(a.errorPct) >= 50) {
      parts.push(
        `- **${a.errorPct}% de usuarios fallaron.** Con esta tasa no se mide capacidad, solo se confirma saturación. ` +
          `Baja \`LT_HTTP_ARRIVAL_RATE\` hasta que \`vusers.failed\` sea 0 y sube desde ahí.`,
      )
    } else if (Number(a.errorPct) > 5) {
      parts.push(
        `- **${a.errorPct}% de error**: por encima del umbral del 5%. Estás cerca del techo de la máquina.`,
      )
    } else {
      parts.push(
        `- **${a.errorPct}% de error**: dentro del umbral. Este punto de carga es sostenible.`,
      )
    }
    if (a.p95 > 3000) parts.push(`- **p95 de ${a.p95} ms**, por encima del umbral de 3000 ms.`)
    else parts.push(`- **p95 de ${a.p95} ms**, dentro del umbral de 3000 ms.`)
    if (a.endpoints.length) {
      const worst = a.endpoints[0]
      parts.push(`- Endpoint más lento: \`${worst.url}\` con p95 de ${worst.p95} ms.`)
    }
  }
  if (d) {
    parts.push(
      `- Conexiones a Postgres: pico de **${d.picoConexiones}** (cluster ${d.picoCluster}). ` +
        `El límite de la instancia es 60.`,
    )
    if (d.picoHealth > 1000)
      parts.push(`- \`/api/health\` llegó a **${d.picoHealth} ms** — el servidor estaba encolando.`)
  }
  parts.push("")
  parts.push(
    "> Estos números salen de una máquina que corre la app **y** el generador de carga a la vez. " +
      "Sirven para comparar antes/después de un cambio, no como capacidad de producción " +
      "(ver [TARGET-REMOTO.md](../TARGET-REMOTO.md)).",
  )
  parts.push("")

  const name = a ? a.name : d.name
  const outPath = path.join(config.reportsDir, `REPORTE-${name}.md`)
  fs.mkdirSync(config.reportsDir, { recursive: true })
  fs.writeFileSync(outPath, parts.join("\n"))
  console.log(`OK reporte: ${outPath}`)
}

main()
