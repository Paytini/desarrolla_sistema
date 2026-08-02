const { spawnSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")
const config = require("../config")

const ROOT = path.join(__dirname, "..")
const SCENARIO = path.join(ROOT, "artillery", "20-browser-visual.yml")

const WARN_ABOVE = 5
const HARD_CAP = 10

function buildEffectiveSettings() {
  const raw = config.sim.browser
  let vus = Number(raw.vus) || 1
  const capped = vus > HARD_CAP

  if (capped) {
    console.warn("")
    console.warn("!".repeat(70))
    console.warn(`! LT_BROWSER_VUS=${vus} is above the hard cap of ${HARD_CAP} for this mode.`)
    console.warn(`! Clamping to ${HARD_CAP} real Chromium windows — this mode is NOT a load`)
    console.warn("! generator, it's a way to watch a handful of sessions at once.")
    console.warn("!".repeat(70))
    vus = HARD_CAP
  } else if (vus > WARN_ABOVE) {
    console.warn("")
    console.warn("!".repeat(70))
    console.warn(`! LT_BROWSER_VUS=${vus} — more than ${WARN_ABOVE} concurrent real browsers.`)
    console.warn("! Each Chromium instance costs ~150-300MB RAM and competes with the")
    console.warn("! Next.js server + mock bridge for CPU on this same machine. Proceeding,")
    console.warn("! but expect the app itself to slow down as a side effect.")
    console.warn("!".repeat(70))
  }

  return {
    vus,
    headed: raw.headed !== false,
    slowMoMs: Number(raw.slowMoMs) || 0,
    durationSec: Number(raw.durationSec) || 60,
    pagesPerSession: Number(raw.pagesPerSession) || 1,
  }
}

function printHeader(settings) {
  const lines = [
    "",
    "=".repeat(70),
    " VISUAL BROWSER MODE — Desarrolla360 load-testing suite",
    "=".repeat(70),
    "",
    " This mode does a REAL login through the UI (types email/password,",
    " waits for Cloudflare Turnstile, clicks submit) so you can WATCH the",
    " app work. It is explicitly NOT for measuring capacity — for that,",
    " use `npm run simulate:http` (HTTP-only, session cookies, hundreds of VUs).",
    "",
    ` Target ............ ${config.targetUrl}`,
    ` Browsers (VUs) .... ${settings.vus}`,
    ` Mode ............... ${settings.headed ? "HEADED (visible windows)" : "headless"}`,
    ` Slow-motion ........ ${settings.slowMoMs}ms per action`,
    ` Duration ........... ${settings.durationSec}s`,
    ` Pages per session .. ${settings.pagesPerSession} (incl. the post-login landing page)`,
    "",
    " Tune with env vars: LT_BROWSER_VUS, LT_BROWSER_HEADED (true/false),",
    " LT_BROWSER_SLOWMO_MS, LT_BROWSER_DURATION_SEC, LT_BROWSER_PAGES.",
    "",
    " WARNING: each Chromium window costs ~150-300MB RAM and competes for",
    " CPU with the app server and mock bridge running on this machine.",
    " Keep VU counts small (this script warns above 5, hard-caps at 10).",
    "=".repeat(70),
    "",
  ]
  console.log(lines.join("\n"))
}

function main() {
  const settings = buildEffectiveSettings()
  printHeader(settings)

  const rawDir = path.join(config.reportsDir, "raw")
  fs.mkdirSync(rawDir, { recursive: true })
  const outputPath = path.join(rawDir, "20-browser-visual.json")

  const overrides = {
    config: {
      phases: [
        {
          duration: settings.durationSec,
          arrivalCount: settings.vus,
          name: "browser-watch",
        },
      ],
      engines: {
        playwright: {
          launchOptions: {
            headless: !settings.headed,
            slowMo: settings.slowMoMs,
          },
        },
      },
    },
  }

  // El .yml deja el target fijado a localhost para que nadie apunte a produccion
  // por accidente. Solo LT_TARGET_URL puede cambiarlo, y solo desde aqui.
  if (process.env.LT_TARGET_URL) {
    overrides.config.target = process.env.LT_TARGET_URL
  }

  const args = [
    "artillery",
    "run",
    path.relative(ROOT, SCENARIO),
    "--overrides",
    JSON.stringify(overrides),
    "--output",
    outputPath,
  ]

  console.log(`> npx ${args.join(" ")}\n`)
  const result = spawnSync("npx", args, { cwd: ROOT, stdio: "inherit" })

  if (result.error) {
    console.error("Failed to launch artillery:", result.error)
    process.exit(1)
  }
  process.exit(result.status ?? 1)
}

main()
