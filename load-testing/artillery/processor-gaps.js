const fs = require("node:fs")
const path = require("node:path")
const config = require("../config")
const { apiLogin } = require("../scripts/check-target")

function loadLtCompanies() {
  const raw = fs.readFileSync(path.join(config.dataDir, "companies.json"), "utf8")
  const companies = JSON.parse(raw)
  if (!Array.isArray(companies) || companies.length === 0) {
    throw new Error("data/companies.json esta vacio o no existe — corre `npm run seed` primero")
  }
  return companies
}

function loadCsvRows(relativePath) {
  const raw = fs.readFileSync(path.join(config.dataDir, relativePath), "utf8")
  return raw
    .trim()
    .split("\n")
    .slice(1)
    .filter(Boolean)
    .map((line) => line.split(","))
}

function loadEmployeeCredentials() {
  return loadCsvRows(path.join("payloads", "employee-credentials.csv")).map(
    ([email, password]) => ({
      email,
      password,
    }),
  )
}

function cookiesFromHeader(cookieHeader, targetUrl) {
  const url = new URL(targetUrl)
  return cookieHeader
    .split("; ")
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf("=")
      return {
        name: pair.slice(0, idx),
        value: pair.slice(idx + 1),
        domain: url.hostname,
        path: "/",
      }
    })
}

function writeJsonReport(basename, data) {
  const outDir = path.join(config.reportsDir, "raw")
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, basename)
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2))
  return outPath
}

function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return null
  const idx = Math.min(sortedAsc.length - 1, Math.floor((p / 100) * sortedAsc.length))
  return sortedAsc[idx]
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const current = cursor++
      results[current] = await fn(items[current], current)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

// ---------------------------------------------------------------------------
// G-2 — 30-mass-enrollment.yml (Playwright engine)
//
// syncCompanyPackageEnrollments (lib/course-sync.ts) is invoked from a real
// <form action={syncPackageToCompanyEmployeesAction}> in the superadmin
// packages page — a Next.js Server Action bound directly to a form, not a
// REST endpoint. Reproducing that over raw HTTP was tried first (see task
// notes) and rejected: the wire format requires a `Next-Action` header AND a
// hidden `_<n>_$ACTION_ID_<hash>` field whose numeric prefix depends on the
// position of the target company's row among ALL forms rendered on the page
// (confirmed by capturing a real browser submission with Playwright request
// interception — the prefix was `_1_` for the 2nd company row and would shift
// for any other row/company or if the company list changes). Hardcoding that
// prefix per company is exactly the fragility the task warned about, so this
// scenario drives the real button via Playwright instead, which is robust to
// row order and survives future rebuilds (action ids are content-addressed
// and only change if course-sync.ts's call site changes).
async function massEnrollmentSweep(page, vuContext, events, test) {
  const { step } = test
  const companies = loadLtCompanies()

  const { cookieHeader } = await apiLogin(
    config.targetUrl,
    config.superadmin.email,
    config.superadmin.password,
  )
  await page.context().addCookies(cookiesFromHeader(cookieHeader, config.targetUrl))

  const results = []

  for (const company of companies) {
    await step(`goto_packages_${company.slug}`, async () => {
      await page.goto(`${config.targetUrl}/superadmin/packages`, { waitUntil: "domcontentloaded" })
    })

    const row = page
      .locator("tr")
      .filter({ has: page.locator(`input[name="empresa_id"][value="${company.id}"]`) })
    const syncButton = row.getByRole("button", { name: /Sincronizar/i })
    await syncButton.waitFor({ state: "visible", timeout: 15_000 })

    const startedAt = Date.now()
    let clientTimedOut = false

    await step(`sync_${company.slug}`, async () => {
      try {
        await Promise.all([
          page.waitForURL(
            (url) => url.searchParams.has("success") || url.searchParams.has("error"),
            {
              timeout: 300_000,
            },
          ),
          syncButton.click(),
        ])
      } catch (err) {
        clientTimedOut = true
        console.error(
          `[mass-enrollment] empresa=${company.slug} el cliente dejo de esperar: ${err.message}`,
        )
      }
    })

    const elapsedMs = Date.now() - startedAt
    const finalUrl = page.url()
    const outcome = clientTimedOut
      ? "CLIENT_TIMEOUT"
      : finalUrl.includes("error=sync")
        ? "SERVER_ERROR"
        : finalUrl.includes("success=sync_ok")
          ? "OK"
          : "UNKNOWN"

    events.emit("counter", `enrollment.${company.slug}.outcome.${outcome}`, 1)
    events.emit("histogram", "enrollment.wall_time_ms", elapsedMs)
    console.log(
      `[mass-enrollment] empresa=${company.slug} (id=${company.id}) outcome=${outcome} wall_time_ms=${elapsedMs} url=${finalUrl}`,
    )
    results.push({ slug: company.slug, companyId: company.id, outcome, elapsedMs, finalUrl })
  }

  const outPath = writeJsonReport("30-mass-enrollment-results.json", {
    generatedAt: new Date().toISOString(),
    results,
  })
  console.log(`[mass-enrollment] resultados escritos en ${outPath}`)
}

// ---------------------------------------------------------------------------
// G-4 — 32-cache-invalidation-storm.yml (http engine, custom function step)
//
// Artillery's weighted scenario picker selects a scenario per-VU-arrival
// globally across the whole run, not per phase — there is no native way to
// say "only scenario A may arrive during phase 1". Measuring a clean
// zero-pollers control immediately before a many-pollers storm therefore
// can't be done with two ordinary weighted scenarios sharing one file. This
// runs as a single custom `function` step that owns the whole timeline
// itself: superadmin keeps polling /superadmin/reports + /superadmin/companies
// for the entire run, tagging each sample "control" or "storm" depending on
// whether the poller loops have been started yet.
const POLLER_COUNT = Math.max(1, Number(process.env.LT_STORM_POLLER_COUNT || 60))
const CONTROL_WINDOW_MS = Math.max(1, Number(process.env.LT_STORM_CONTROL_SEC || 40)) * 1000
const STORM_WINDOW_MS = Math.max(1, Number(process.env.LT_STORM_DURATION_SEC || 60)) * 1000
// Matches the real (pre-fix) client poll interval documented in
// docs-observability/INFORME-RENDIMIENTO.md G-4 (`pollIntervalMs={15_000}`).
const POLL_INTERVAL_MS = Math.max(1000, Number(process.env.LT_STORM_POLL_INTERVAL_MS || 15_000))
const SUPERADMIN_THINK_MS = Math.max(0, Number(process.env.LT_STORM_SUPERADMIN_THINK_MS || 2000))
const LOGIN_CONCURRENCY = 10

// NOTE: this must NOT declare a 3rd (`done`) parameter. Artillery's http
// engine only treats plain `function` declarations as callback-style (calling
// them as (context, events, done)); an `async function` has a different
// constructor name so the engine wraps it with Node's `util.callbackify`
// instead, which invokes it as (context, events) — with NO callback — and
// converts the returned promise into the real done() call itself. Accepting a
// 3rd param here would just be `undefined`, so any error path must throw
// (rejecting the promise) rather than call a non-existent `done(err)`.
async function runCacheInvalidationStorm(context, events) {
  try {
    const allEmployees = loadEmployeeCredentials()
    const pollerCount = Math.min(POLLER_COUNT, allEmployees.length)
    const pollerAccounts = allEmployees.slice(0, pollerCount)

    console.log(
      `[cache-storm] setup: superadmin + ${pollerCount} empleados (login concurrencia ${LOGIN_CONCURRENCY})...`,
    )
    const setupStartedAt = Date.now()

    const superadminSession = await apiLogin(
      config.targetUrl,
      config.superadmin.email,
      config.superadmin.password,
    )
    const pollerSessions = await mapWithConcurrency(
      pollerAccounts,
      LOGIN_CONCURRENCY,
      async (emp) => {
        const session = await apiLogin(config.targetUrl, emp.email, emp.password)
        return { email: emp.email, cookieHeader: session.cookieHeader }
      },
    )

    console.log(`[cache-storm] setup completo en ${Date.now() - setupStartedAt}ms`)

    const samples = []
    const testStartedAt = Date.now()
    let pollersActive = false
    let stopSuperadmin = false
    let pollCount = 0
    let pollErrorCount = 0

    async function fetchTimed(pathName, cookieHeader) {
      const t0 = Date.now()
      const res = await fetch(`${config.targetUrl}${pathName}`, {
        headers: { Cookie: cookieHeader },
      })
      await res.text()
      return { ms: Date.now() - t0, status: res.status }
    }

    async function superadminLoop() {
      while (!stopSuperadmin) {
        const phase = pollersActive ? "storm" : "control"
        try {
          const reports = await fetchTimed("/superadmin/reports", superadminSession.cookieHeader)
          samples.push({ t_ms: Date.now() - testStartedAt, phase, page: "reports", ...reports })
        } catch (err) {
          console.error(`[cache-storm] error consultando /superadmin/reports: ${err.message}`)
        }
        if (stopSuperadmin) break
        await sleep(300)
        try {
          const companies = await fetchTimed(
            "/superadmin/companies",
            superadminSession.cookieHeader,
          )
          samples.push({ t_ms: Date.now() - testStartedAt, phase, page: "companies", ...companies })
        } catch (err) {
          console.error(`[cache-storm] error consultando /superadmin/companies: ${err.message}`)
        }
        await sleep(SUPERADMIN_THINK_MS)
      }
    }

    async function pollerLoop(session) {
      while (pollersActive) {
        try {
          await fetch(`${config.targetUrl}/api/employee/learning/refresh`, {
            method: "POST",
            headers: { Cookie: session.cookieHeader, "Content-Type": "application/json" },
            body: JSON.stringify({ force: false }),
          })
          pollCount++
        } catch (err) {
          pollErrorCount++
          console.error(`[cache-storm] poller error (${session.email}): ${err.message}`)
        }
        await sleep(POLL_INTERVAL_MS)
      }
    }

    const superadminPromise = superadminLoop()

    console.log(`[cache-storm] ventana CONTROL (sin pollers) por ${CONTROL_WINDOW_MS / 1000}s...`)
    await sleep(CONTROL_WINDOW_MS)

    console.log(
      `[cache-storm] ventana STORM: ${pollerSessions.length} pollers cada ${POLL_INTERVAL_MS}ms por ${STORM_WINDOW_MS / 1000}s...`,
    )
    pollersActive = true
    const pollerPromises = pollerSessions.map((session) => pollerLoop(session))

    await sleep(STORM_WINDOW_MS)

    pollersActive = false
    stopSuperadmin = true
    await Promise.all(pollerPromises)
    await superadminPromise

    function bucketStats(phase, page) {
      const values = samples
        .filter((s) => s.phase === phase && s.page === page && s.status === 200)
        .map((s) => s.ms)
        .sort((a, b) => a - b)
      return {
        count: values.length,
        p50: percentile(values, 50),
        p95: percentile(values, 95),
        max: values.length > 0 ? values[values.length - 1] : null,
      }
    }

    const summary = {
      pollerCount: pollerSessions.length,
      pollIntervalMs: POLL_INTERVAL_MS,
      controlWindowMs: CONTROL_WINDOW_MS,
      stormWindowMs: STORM_WINDOW_MS,
      pollCount,
      pollErrorCount,
      reports: {
        control: bucketStats("control", "reports"),
        storm: bucketStats("storm", "reports"),
      },
      companies: {
        control: bucketStats("control", "companies"),
        storm: bucketStats("storm", "companies"),
      },
    }

    console.log("[cache-storm] === RESUMEN control vs storm ===")
    console.log(JSON.stringify(summary, null, 2))

    for (const page of ["reports", "companies"]) {
      const control = summary[page].control
      const storm = summary[page].storm
      if (control.p50 != null)
        events.emit("histogram", `cache_storm.${page}.control.ms`, control.p50)
      if (storm.p50 != null) events.emit("histogram", `cache_storm.${page}.storm.ms`, storm.p50)
    }
    events.emit("counter", "cache_storm.poll_count", pollCount)
    events.emit("counter", "cache_storm.poll_error_count", pollErrorCount)

    const outPath = writeJsonReport("32-cache-invalidation-storm-results.json", {
      generatedAt: new Date().toISOString(),
      summary,
      samples,
    })
    console.log(`[cache-storm] resultados escritos en ${outPath}`)
  } catch (err) {
    console.error("[cache-storm] ERROR", err)
    throw err
  }
}

module.exports = {
  massEnrollmentSweep,
  runCacheInvalidationStorm,
}
