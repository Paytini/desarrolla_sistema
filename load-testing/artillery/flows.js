const path = require("node:path")
const config = require("../config")
const { apiLogin } = require("../scripts/check-target")

async function loginInBrowser(page, email, password) {
  const base = config.targetUrl
  const { cookieHeader } = await apiLogin(base, email, password)
  const url = new URL(base)
  const cookies = cookieHeader.split("; ").map((pair) => {
    const idx = pair.indexOf("=")
    return { name: pair.slice(0, idx), value: pair.slice(idx + 1), domain: url.hostname, path: "/" }
  })
  await page.context().addCookies(cookies)
}

// RH/EMPLEADO layouts mount an onboarding tour dialog (components/layout/OnboardingTour.tsx)
// on first render per browser storage. Every VU is a fresh context (no localStorage), so the
// dialog opens and MUI aria-hides + backdrop-blocks the rest of the page until dismissed.
// goto()-only steps are unaffected, but any step that clicks something must dismiss it first.
async function dismissOnboardingTour(page) {
  // The dialog mounts client-side after hydration, which can lag past the
  // networkidle wait under concurrent VU load — a plain .count() snapshot
  // taken too early reads 0 and misses it, leaving it open to block later
  // clicks. Waiting (briefly) for visibility instead of sampling once made
  // this reliable under concurrency (verified with 3 parallel VUs).
  const skipButton = page.getByRole("button", { name: "Saltar" })
  try {
    await skipButton.waitFor({ state: "visible", timeout: 4000 })
    await skipButton.click()
  } catch (_) {
    // Tour didn't open (already dismissed earlier in this VU's context, or none to show).
  }
}

async function assertRealPage(page, marker) {
  const url = page.url()
  if (url.includes("/login")) {
    throw new Error(`Redirigido a /login en vez de la pagina esperada (url=${url})`)
  }
  if (marker) {
    const bodyText = await page.locator("body").innerText()
    if (!bodyText.includes(marker)) {
      throw new Error(`Contenido esperado "${marker}" no encontrado en ${url}`)
    }
  }
}

async function employeeJourney(page, vuContext, events, test) {
  const { step } = test
  await loginInBrowser(page, vuContext.vars.email, vuContext.vars.password)
  await step("cursos", async () => {
    await page.goto(`${config.targetUrl}/employee/courses`, { waitUntil: "networkidle" })
    await assertRealPage(page, "Tu ruta de capacitación activa")
  })
  await page.waitForTimeout(2000)
  await step("poll_refresh", async () => {
    await page.request.post(`${config.targetUrl}/api/employee/learning/refresh`, { data: { force: false } })
  })
  await step("certificados", async () => {
    await page.goto(`${config.targetUrl}/employee/certificates`, { waitUntil: "networkidle" })
    await assertRealPage(page, "Mis constancias")
  })
  await page.waitForTimeout(1500)
}

async function rhJourney(page, vuContext, events, test) {
  const { step } = test
  const slug = vuContext.vars.slug
  await loginInBrowser(page, vuContext.vars.email, vuContext.vars.password)
  await step("home", async () => {
    await page.goto(`${config.targetUrl}/company/${slug}/home`, { waitUntil: "networkidle" })
    await assertRealPage(page, "Panel de operación académica")
    await dismissOnboardingTour(page)
  })
  await page.waitForTimeout(2000)
  await step("empleados", async () => {
    await page.goto(`${config.targetUrl}/company/${slug}/employees`, { waitUntil: "networkidle" })
    await assertRealPage(page, "Gestión de la plantilla de colaboradores")
    await dismissOnboardingTour(page)
  })
  if (vuContext.vars.$uuid && Math.random() < 0.2) {
    await step("import_csv", async () => {
      // The CSV form lives in a MUI tabpanel that starts hidden (Alta manual is the default
      // tab) — the tab must be activated before the file input/submit button are clickable.
      const csvTab = page.getByRole("tab", { name: /carga csv/i })
      if (await csvTab.count()) {
        await csvTab.click()
        const fileInput = page.locator('input[type="file"]').first()
        if (await fileInput.count()) {
          await fileInput.setInputFiles(path.join(config.dataDir, "import", "rh-import-20.csv"))
          const submit = page.getByRole("button", { name: /importar empleados/i }).first()
          if (await submit.count()) {
            await submit.click()
            // The import is a Next.js Server Action submitted via client-side JS (no
            // full-page navigation), so waitForLoadState('networkidle') right after
            // click() can race and return before the request even starts. The action
            // always redirects back with ?success=... or ?error=... (actions.ts), so
            // wait for that instead of racing on network idle.
            await page
              .waitForURL((url) => url.searchParams.has("success") || url.searchParams.has("error"), {
                timeout: 20000,
              })
              .catch(() => {})
          }
          await page.waitForLoadState("networkidle")
        }
      }
    })
  }
  await step("asignaciones", async () => {
    await page.goto(`${config.targetUrl}/company/${slug}/assignments`, { waitUntil: "networkidle" })
    await assertRealPage(page, "Asignación de cursos")
  })
  await step("constancias", async () => {
    await page.goto(`${config.targetUrl}/company/${slug}/certificates`, { waitUntil: "networkidle" })
    await assertRealPage(page, "Constancias DC-3")
  })
}

async function superadminJourney(page, vuContext, events, test) {
  const { step } = test
  await loginInBrowser(page, config.superadmin.email, config.superadmin.password)
  await step("companies", async () => {
    await page.goto(`${config.targetUrl}/superadmin/companies`, { waitUntil: "networkidle" })
    await assertRealPage(page, "Empresas clientes")
  })
  await page.waitForTimeout(2000)
  await step("reports", async () => {
    await page.goto(`${config.targetUrl}/superadmin/reports`, { waitUntil: "networkidle" })
    await assertRealPage(page, "Reportes globales")
  })
  await page.waitForTimeout(3000)
}

module.exports = { employeeJourney, rhJourney, superadminJourney }
