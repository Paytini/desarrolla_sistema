const fs = require("node:fs")
const path = require("node:path")
const config = require("../config")

const THRESHOLDS = { p95: 3000, p99: 8000, errorRatePct: 5 }

function summarizeFile(file) {
  const name = path.basename(file, ".json")
  let data
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"))
  } catch (err) {
    console.warn(
      `WARN ${name}: no se pudo leer/parsear el JSON (${err.message}), se omite del informe`,
    )
    return null
  }

  const agg = data.aggregate
  if (!agg) {
    console.warn(
      `WARN ${name}: el JSON no tiene "aggregate" (¿no es un output de artillery run --output?), se omite`,
    )
    return null
  }

  const rt = agg.summaries?.["http.response_time"]
  if (!rt) {
    console.warn(
      `WARN ${name}: falta aggregate.summaries["http.response_time"] (posible corrida sin requests HTTP completados)`,
    )
  }

  const counters = agg.counters ?? {}
  const total = counters["http.requests"] ?? 0
  const completed = counters["vusers.completed"] ?? 0
  const failed = counters["vusers.failed"] ?? 0
  const codes = Object.entries(counters)
    .filter(([k]) => k.startsWith("http.codes."))
    .map(([k, v]) => `${k.replace("http.codes.", "")}:${v}`)
    .join(" ")
  const errorRate = completed + failed ? (failed / (completed + failed)) * 100 : 0
  const p50 = rt?.median ?? rt?.p50
  const p95 = rt?.p95
  const p99 = rt?.p99
  const pass = (p95 ?? 0) <= THRESHOLDS.p95 && errorRate <= THRESHOLDS.errorRatePct

  return {
    name,
    requests: total,
    p50,
    p95,
    p99,
    completed,
    failed,
    errorRate: errorRate.toFixed(1),
    codes: codes || "—",
    pass,
  }
}

function main() {
  const rawDir = path.join(config.reportsDir, "raw")
  if (!fs.existsSync(rawDir)) {
    console.warn(`WARN: no existe ${rawDir}, nada que resumir`)
    fs.mkdirSync(rawDir, { recursive: true })
  }
  const files = fs
    .readdirSync(rawDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(rawDir, f))

  const rows = files.map(summarizeFile).filter(Boolean)

  if (rows.length === 0) {
    console.warn(
      "WARN: no se generaron filas validas (todos los JSON fallaron o no habia ninguno en reports/raw)",
    )
  }

  const date = new Date().toISOString().slice(0, 10)
  const lines = [
    `# Informe de Load Testing — ${date}`,
    "",
    `Target: ${config.targetUrl} · Escala: ${config.scale.companies} empresas × ${config.scale.employeesPerCompany} empleados · Bridge: mock ${config.bridgeLatencyMs}ms (${config.bridgeColdRate * 100}% frio ${config.bridgeColdMs}ms)`,
    "",
    "| Escenario | Requests | p50 ms | p95 ms | p99 ms | VUs ok | VUs fail | Error % | Codigos | Veredicto |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...rows.map(
      (r) =>
        `| ${r.name} | ${r.requests} | ${r.p50 ?? "—"} | ${r.p95 ?? "—"} | ${r.p99 ?? "—"} | ${r.completed} | ${r.failed} | ${r.errorRate} | ${r.codes} | ${r.pass ? "✅" : "❌"} |`,
    ),
    "",
    `Umbrales: p95 ≤ ${THRESHOLDS.p95} ms, error ≤ ${THRESHOLDS.errorRatePct}%. Comparar contra docs-observability/INFORME-CAPACIDAD.md (F0: 300-600 concurrentes estimados).`,
  ]
  const out = path.join(config.reportsDir, `INFORME-LOADTEST-${date}.md`)
  fs.writeFileSync(out, lines.join("\n"))
  console.log(`OK reporte: ${out}`)
  rows.forEach((r) =>
    console.log(`${r.pass ? "PASS" : "FAIL"} ${r.name} p95=${r.p95}ms err=${r.errorRate}%`),
  )
}

main()
