const path = require("node:path")
require("dotenv").config({ path: path.join(__dirname, "..", ".env") })

module.exports = {
  dbUrl: process.env.LT_DATABASE_URL || process.env.DATABASE_URL,
  targetUrl: process.env.LT_TARGET_URL || "http://localhost:3005",
  bridgePort: Number(process.env.LT_BRIDGE_PORT || 4380),
  bridgeKey: process.env.LT_BRIDGE_KEY || "lt-mock-bridge-key",
  bridgeLatencyMs: Number(process.env.LT_BRIDGE_LATENCY_MS || 300),
  bridgeColdMs: Number(process.env.LT_BRIDGE_COLD_MS || 6000),
  bridgeColdRate: Number(process.env.LT_BRIDGE_COLD_RATE || 0.05),
  bridgeErrorRate: Number(process.env.LT_BRIDGE_ERROR_RATE || 0),
  seededPassword: "LoadTest123!",
  turnstileDummyToken: "XXXX.DUMMY.TOKEN.XXXX",
  superadmin: { email: "admin@desarrolla360.com", password: "admin123" },
  scale: {
    companies: Number(process.env.LT_COMPANIES || 10),
    employeesPerCompany: Number(process.env.LT_EMPLOYEES_PER_COMPANY || 200),
    certificateRatio: 0.3,
  },
  namespace: {
    // Bandeja desechable para poder abrir los correos que envie el portal.
    // El criterio de borrado NO es este dominio: son los patrones completos de
    // seeders/lib/emails.js, que exigen ademas el marcador lt-empresa/lt-import.
    emailDomain: "yopmail.com",
    slugPrefix: "lt-",
    packagePrefix: "LT ",
    courseIdBase: 900101,
    courseCount: 5,
    wpUserIdBase: 910000,
  },
  dataDir: path.join(__dirname, "data"),
  reportsDir: path.join(__dirname, "reports"),

  sim: {
    // Modo NAVEGADOR: pocos usuarios, para VER la app funcionando (login por UI,
    // navegacion real). No sirve para medir capacidad — cada Chromium cuesta
    // 150-300 MB y compite por CPU con el servidor.
    browser: {
      vus: Number(process.env.LT_BROWSER_VUS || 2),
      // Por defecto VISIBLE: el proposito de este modo es mirarlo.
      headed: process.env.LT_BROWSER_HEADED !== "false",
      slowMoMs: Number(process.env.LT_BROWSER_SLOWMO_MS || 250),
      durationSec: Number(process.env.LT_BROWSER_DURATION_SEC || 120),
      pagesPerSession: Number(process.env.LT_BROWSER_PAGES || 4),
    },

    // Modo HTTP: sesion reutilizada (login 1 vez, luego N navegaciones), think
    // time realista. Es el modo para medir capacidad — escala a cientos de VUs.
    http: {
      arrivalRate: Number(process.env.LT_HTTP_ARRIVAL_RATE || 3),
      durationSec: Number(process.env.LT_HTTP_DURATION_SEC || 180),
      // Un empleado real entra 1 vez y navega ~30 min. Ratio login:paginas ~1:24.
      pagesPerSession: Number(process.env.LT_PAGES_PER_SESSION || 12),
      thinkMinSec: Number(process.env.LT_THINK_MIN_SEC || 8),
      thinkMaxSec: Number(process.env.LT_THINK_MAX_SEC || 25),
    },

    // Avalancha de las 8:00 AM: arrivalCount reparte N usuarios en `duration`
    // segundos (simultaneidad real), a diferencia de arrivalRate que es por segundo.
    spike: {
      count: Number(process.env.LT_SPIKE_COUNT || 200),
      durationSec: Number(process.env.LT_SPIKE_DURATION_SEC || 10),
    },

    // Muestreo del lado servidor durante las corridas.
    dbSampleIntervalMs: Number(process.env.LT_DB_SAMPLE_MS || 2000),
  },
}
