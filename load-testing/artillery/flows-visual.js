const config = require("../config")

// Unlike flows.js (which injects session cookies obtained via the HTTP API and
// skips the login screen entirely), every journey here drives the real login
// UI: type email, type password, wait for Turnstile to hand back a token, then
// click submit. That's the whole point of this file — it's for WATCHING the
// app, not for cheap/fast capacity setup.

async function uiLogin(page, step, email, password) {
  await step("login_page", async () => {
    // NOT networkidle: the login screen has a rotating Unsplash background
    // carousel that keeps firing new image requests indefinitely, so
    // "networkidle" (500ms of silence) never arrives and the goto times out.
    // domcontentloaded is enough — the form is server-rendered, and the
    // subsequent explicit waits (fill, Turnstile poll) cover the rest.
    await page.goto(`${config.targetUrl}/login`, { waitUntil: "domcontentloaded" })
  })

  await step("login_type_credentials", async () => {
    const emailInput = page.locator("#lp-email")
    await emailInput.click()
    await emailInput.pressSequentially(email, { delay: 55 })

    const passwordInput = page.locator("#lp-password")
    await passwordInput.click()
    await passwordInput.pressSequentially(password, { delay: 55 })
  })

  await step("login_wait_turnstile", async () => {
    // app/login/page.tsx: <button type="submit" disabled={loading || !turnstileToken}>.
    // The Cloudflare test sitekey (1x00000000000000000000AA) auto-resolves, but
    // only after its script loads and the widget renders — poll instead of
    // clicking immediately.
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('button[type="submit"]')
        return !!btn && !btn.disabled
      },
      { timeout: 20000 },
    )
  })

  await step("login_submit", async () => {
    await page.locator('button[type="submit"]').click()
  })
}

// RH/EMPLEADO layouts mount an onboarding tour dialog (components/layout/OnboardingTour.tsx)
// on first render per browser storage. Every VU is a fresh context (no localStorage), so the
// dialog opens and MUI aria-hides + backdrop-blocks the rest of the page until dismissed.
// (Same fix as artillery/flows.js — duplicated here since this file must stand alone.)
async function dismissOnboardingTour(page) {
  const skipButton = page.getByRole("button", { name: "Saltar" })
  try {
    await skipButton.waitFor({ state: "visible", timeout: 4000 })
    await skipButton.click()
  } catch (_) {
    // Tour didn't open (already dismissed earlier in this VU's context, or none to show).
  }
}

// The post-login landing (and every same-origin link click) is a Next.js
// client-side transition (router.push), not a full navigation — waitForURL
// resolves as soon as the URL changes, before the new route's content has
// necessarily rendered. Poll for the marker text instead of snapshotting
// body.innerText() once right after the URL settles, which races the render.
async function assertRealPage(page, marker, timeoutMs = 10000) {
  if (page.url().includes("/login")) {
    throw new Error(`Redirigido a /login en vez de la pagina esperada (url=${page.url()})`)
  }
  try {
    await page.waitForFunction((m) => document.body.innerText.includes(m), marker, { timeout: timeoutMs })
  } catch (_err) {
    const url = page.url()
    if (url.includes("/login")) {
      throw new Error(`Redirigido a /login en vez de la pagina esperada (url=${url})`)
    }
    throw new Error(`Contenido esperado "${marker}" no aparecio a tiempo en ${url}`)
  }
}

// Pure "look at it" pause — separate from launchOptions.slowMo (which only
// slows down individual Playwright actions like clicks/fills). Without this,
// pages would flash by even in headed mode.
async function watch(page, ms) {
  await page.waitForTimeout(ms)
}

function pagesAfterLanding() {
  const n = Number(config.sim.browser.pagesPerSession) || 1
  return Math.max(0, n - 1)
}

async function employeeVisualJourney(page, vuContext, events, test) {
  const { step } = test
  await uiLogin(page, step, vuContext.vars.email, vuContext.vars.password)

  await step("cursos", async () => {
    await page.waitForURL("**/employee/courses", { timeout: 15000 })
    await assertRealPage(page, "Tu ruta de capacitación activa")
    await dismissOnboardingTour(page)
  })
  await watch(page, 3000)

  const destinations = [
    { name: "certificados", path: "/employee/certificates", marker: "Mis constancias" },
    { name: "cursos_revisita", path: "/employee/courses", marker: "Tu ruta de capacitación activa" },
  ]
  const extra = pagesAfterLanding()
  for (let i = 0; i < extra; i++) {
    const dest = destinations[i % destinations.length]
    await step(dest.name, async () => {
      await page.goto(`${config.targetUrl}${dest.path}`, { waitUntil: "networkidle" })
      await assertRealPage(page, dest.marker)
      await dismissOnboardingTour(page)
    })
    await watch(page, 2500)
  }
}

async function rhVisualJourney(page, vuContext, events, test) {
  const { step } = test
  const slug = vuContext.vars.rhSlug
  await uiLogin(page, step, vuContext.vars.rhEmail, vuContext.vars.rhPassword)

  await step("home", async () => {
    await page.waitForURL(`**/company/${slug}/home`, { timeout: 15000 })
    await assertRealPage(page, "Panel de operación académica")
    await dismissOnboardingTour(page)
  })
  await watch(page, 3000)

  const destinations = [
    { name: "empleados", path: `/company/${slug}/employees`, marker: "Gestión de la plantilla de colaboradores" },
    { name: "asignaciones", path: `/company/${slug}/assignments`, marker: "Asignación de cursos" },
    { name: "progreso", path: `/company/${slug}/progress`, marker: "Avance y actividad de cursos por colaborador" },
    { name: "constancias", path: `/company/${slug}/certificates`, marker: "Constancias DC-3" },
  ]
  const extra = Math.min(pagesAfterLanding(), destinations.length)
  for (let i = 0; i < extra; i++) {
    const dest = destinations[i]
    await step(dest.name, async () => {
      await page.goto(`${config.targetUrl}${dest.path}`, { waitUntil: "networkidle" })
      await assertRealPage(page, dest.marker)
      await dismissOnboardingTour(page)
    })
    await watch(page, 2500)
  }
}

async function superadminVisualJourney(page, vuContext, events, test) {
  const { step } = test
  await uiLogin(page, step, config.superadmin.email, config.superadmin.password)

  await step("companies", async () => {
    await page.waitForURL("**/superadmin/companies", { timeout: 15000 })
    await assertRealPage(page, "Empresas clientes")
  })
  await watch(page, 3000)

  const destinations = [
    { name: "reports", path: "/superadmin/reports", marker: "Reportes globales" },
    { name: "packages", path: "/superadmin/packages", marker: "Gestión de paquetes" },
    { name: "access", path: "/superadmin/access", marker: "Control de accesos" },
    { name: "integration", path: "/superadmin/integration", marker: "Integración WordPress / Tutor" },
  ]
  const extra = Math.min(pagesAfterLanding(), destinations.length)
  for (let i = 0; i < extra; i++) {
    const dest = destinations[i]
    await step(dest.name, async () => {
      await page.goto(`${config.targetUrl}${dest.path}`, { waitUntil: "networkidle" })
      await assertRealPage(page, dest.marker)
    })
    await watch(page, 2500)
  }
}

module.exports = { employeeVisualJourney, rhVisualJourney, superadminVisualJourney }
