const fs = require("node:fs")
const path = require("node:path")
const { Pool } = require("pg")
const config = require("../config")

function parseArgs(argv) {
  let label = null
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--label") {
      label = argv[i + 1] || null
      i++
    } else if (arg.startsWith("--label=")) {
      label = arg.slice("--label=".length)
    } else if (!arg.startsWith("--") && label === null) {
      // `npm run db:watch --label foo` (no literal `--` before the flag) makes
      // npm swallow `--label` as an unrecognized npm config and forward only
      // the bare value `foo` to the script. Accept a lone positional arg as
      // the label too so that invocation (used in this project's runbooks)
      // still works, not just `node scripts/db-watch.js --label foo`.
      label = arg
    }
  }
  return { label }
}

function isoStampForFilename(d = new Date()) {
  return d.toISOString().replace(/:/g, "-").replace(/\.\d+Z$/, "Z")
}

function buildOutputPath(reportsDir, label) {
  fs.mkdirSync(reportsDir, { recursive: true })
  const stamp = isoStampForFilename()
  const base = label ? `db-watch-${label}-${stamp}` : `db-watch-${stamp}`
  let candidate = path.join(reportsDir, `${base}.jsonl`)
  let n = 2
  while (fs.existsSync(candidate)) {
    candidate = path.join(reportsDir, `${base}-${n}.jsonl`)
    n++
  }
  return candidate
}

// Full view: only visible to roles that are superuser or members of
// pg_read_all_stats (Supabase grants `postgres` membership in `pg_monitor`,
// which includes that). Non-privileged roles get NULL for query/query_start/
// wait_event(_type) on rows that aren't their own backend, but still see
// pid/state/datname cluster-wide — hence the fallback query below.
const SQL_FULL = `
  select
    count(*) filter (where datname = current_database()) as total,
    count(*) filter (where datname = current_database() and state = 'active') as active,
    count(*) filter (where datname = current_database() and state = 'idle') as idle,
    count(*) filter (where datname = current_database() and state = 'idle in transaction') as idle_in_txn,
    count(*) filter (where datname = current_database() and state = 'idle in transaction (aborted)') as idle_in_txn_aborted,
    count(*) filter (where datname = current_database() and wait_event_type is not null) as waiting_total,
    count(*) filter (where datname = current_database() and wait_event_type is not null and wait_event_type <> 'Client') as blocked_non_client,
    count(*) as cluster_total,
    max(extract(epoch from (now() - query_start))) filter (where datname = current_database() and state = 'active') as max_active_query_secs
  from pg_stat_activity
`

const SQL_FALLBACK = `
  select
    count(*) filter (where datname = current_database()) as total,
    count(*) filter (where datname = current_database() and state = 'active') as active,
    count(*) filter (where datname = current_database() and state = 'idle') as idle,
    count(*) filter (where datname = current_database() and state = 'idle in transaction') as idle_in_txn,
    count(*) as cluster_total
  from pg_stat_activity
`

async function detectMode(pool) {
  try {
    await pool.query(SQL_FULL)
    return "full"
  } catch (err) {
    console.warn(`[db-watch] full pg_stat_activity columns not visible to this role (${err.message}); falling back to count/state-only query`)
  }
  try {
    await pool.query(SQL_FALLBACK)
    return "restricted"
  } catch (err) {
    console.warn(`[db-watch] pg_stat_activity not queryable at all by this role (${err.message}); DB samples will be reported unavailable`)
    return "unavailable"
  }
}

function toNumOrNull(v) {
  return v === null || v === undefined ? null : Number(v)
}

async function sampleDb(pool, mode) {
  if (mode === "unavailable") {
    return { ok: false, mode, error: "pg_stat_activity not queryable by this role" }
  }
  const sql = mode === "restricted" ? SQL_FALLBACK : SQL_FULL
  const t0 = Date.now()
  try {
    const { rows } = await pool.query(sql)
    const r = rows[0]
    return {
      ok: true,
      mode,
      latencyMs: Date.now() - t0,
      total: toNumOrNull(r.total),
      active: toNumOrNull(r.active),
      idle: toNumOrNull(r.idle),
      idleInTxn: toNumOrNull(r.idle_in_txn),
      idleInTxnAborted: toNumOrNull(r.idle_in_txn_aborted),
      // Literal "blocked" metric requested (wait_event_type IS NOT NULL). Note
      // this also counts every plain-idle connection: idle sessions report
      // wait_event_type='Client' (waiting for the next client query), which is
      // normal and NOT lock contention. blockedNonClient (excludes 'Client')
      // is the metric that actually means "stuck on a lock/IO/extension".
      waitingTotal: toNumOrNull(r.waiting_total),
      blockedNonClient: toNumOrNull(r.blocked_non_client),
      clusterTotal: toNumOrNull(r.cluster_total),
      maxActiveQuerySecs: r.max_active_query_secs === undefined ? null : toNumOrNull(r.max_active_query_secs),
    }
  } catch (err) {
    return { ok: false, mode, latencyMs: Date.now() - t0, error: err.message }
  }
}

async function sampleHealth(targetUrl) {
  const url = `${targetUrl}/api/health`
  const t0 = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeout))
    return { ok: res.ok, status: res.status, latencyMs: Date.now() - t0 }
  } catch (err) {
    return { ok: false, status: null, latencyMs: Date.now() - t0, error: err.message }
  }
}

function fmtDb(db) {
  if (!db.ok) return `db: ERROR ${db.error}`
  const maxQuery = db.maxActiveQuerySecs === null ? "n/a" : `${db.maxActiveQuerySecs.toFixed(1)}s`
  if (db.mode === "restricted") {
    return `db[restricted]: total=${db.total} active=${db.active} idle=${db.idle} idle_txn=${db.idleInTxn} cluster=${db.clusterTotal} (${db.latencyMs}ms)`
  }
  return `db: total=${db.total} active=${db.active} idle=${db.idle} idle_txn=${db.idleInTxn} waiting=${db.waitingTotal}(non-client=${db.blockedNonClient}) max_query=${maxQuery} cluster=${db.clusterTotal} (${db.latencyMs}ms)`
}

function fmtHealth(health) {
  if (!health.ok && health.status === null) return `health: ERROR ${health.error} (${health.latencyMs}ms)`
  return `health: ${health.status} (${health.latencyMs}ms)`
}

async function main() {
  const { label } = parseArgs(process.argv.slice(2))
  const intervalMs = config.sim.dbSampleIntervalMs
  const outFile = buildOutputPath(config.reportsDir, label)

  // Deliberately max:1 and not shared with any other pool in this repo: this
  // watcher's whole purpose is to observe the app pool exhausting Postgres
  // connections, so it must not itself add meaningful connection pressure —
  // opening a multi-connection pool here would distort the very metric it
  // is trying to measure honestly.
  const pool = new Pool({ connectionString: config.dbUrl, max: 1 })

  const maskedDbUrl = String(config.dbUrl || "").replace(/:[^:@/]+@/, ":***@")
  console.log(`[db-watch] label=${label || "(none)"} interval=${intervalMs}ms target=${config.targetUrl}`)
  console.log(`[db-watch] db=${maskedDbUrl}`)
  console.log(`[db-watch] output=${outFile}`)

  const mode = await detectMode(pool)
  console.log(`[db-watch] pg_stat_activity visibility mode: ${mode}`)
  if (mode === "full") {
    console.log("[db-watch] role can see cluster-wide session state (pg_monitor or superuser) — full metrics available")
  } else if (mode === "restricted") {
    console.log("[db-watch] role can only see counts/state, not query timing/wait_event for other sessions — reporting what IS visible")
  } else {
    console.log("[db-watch] role cannot query pg_stat_activity at all — DB samples will be marked unavailable every tick")
  }

  let stopped = false
  let shuttingDown = false
  let sampleCount = 0
  let peakTotal = 0
  let peakActive = 0
  let peakHealthLatency = 0
  const startedAt = Date.now()

  function appendRecord(record) {
    try {
      fs.appendFileSync(outFile, `${JSON.stringify(record)}\n`)
    } catch (err) {
      console.warn(`[db-watch] warning: failed to write sample to ${outFile}: ${err.message}`)
    }
  }

  async function tick() {
    if (stopped) return
    const ts = new Date()
    let db
    let health
    try {
      ;[db, health] = await Promise.all([sampleDb(pool, mode), sampleHealth(config.targetUrl)])
    } catch (err) {
      console.warn(`[db-watch] warning: sample failed unexpectedly: ${err.message}`)
      db = { ok: false, error: err.message }
      health = { ok: false, status: null, latencyMs: null, error: err.message }
    }

    sampleCount++
    if (db.ok) {
      peakTotal = Math.max(peakTotal, db.total ?? 0)
      peakActive = Math.max(peakActive, db.active ?? 0)
    }
    if (typeof health.latencyMs === "number") peakHealthLatency = Math.max(peakHealthLatency, health.latencyMs)

    const record = {
      ts: ts.toISOString(),
      elapsedSec: Math.round((Date.now() - startedAt) / 1000),
      label: label || null,
      db,
      health,
    }
    appendRecord(record)

    const hhmmss = ts.toISOString().slice(11, 19)
    console.log(`[${hhmmss}] +${record.elapsedSec}s  ${fmtDb(db)}  |  ${fmtHealth(health)}`)

    if (!stopped) setTimeout(tick, intervalMs)
  }

  function finalize() {
    if (shuttingDown) return
    shuttingDown = true
    stopped = true
    console.log(`\n${"=".repeat(60)}`)
    console.log("db-watch stopped — final summary")
    console.log(`  samples taken:          ${sampleCount}`)
    console.log(`  peak total connections: ${peakTotal}`)
    console.log(`  peak active queries:    ${peakActive}`)
    console.log(`  peak health latency:    ${peakHealthLatency}ms`)
    console.log(`  output file:            ${outFile}`)
    console.log("=".repeat(60))
    pool
      .end()
      .catch(() => {})
      .finally(() => process.exit(0))
  }

  process.on("SIGINT", finalize)
  process.on("SIGTERM", finalize)
  process.on("unhandledRejection", (err) => {
    console.warn(`[db-watch] warning: unhandled rejection (ignored, continuing): ${err && err.message ? err.message : err}`)
  })
  process.on("uncaughtException", (err) => {
    console.warn(`[db-watch] warning: uncaught exception (ignored, continuing): ${err.message}`)
  })

  tick()
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[db-watch] fatal startup error:", err)
    process.exit(1)
  })
}

module.exports = { parseArgs, buildOutputPath, isoStampForFilename }
