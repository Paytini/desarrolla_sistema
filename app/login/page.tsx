"use client"

import Image from "next/image"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
        <line strokeLinecap="round" x1="1" y1="1" x2="23" y2="23" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="shrink-0">
      <circle cx="12" cy="12" r="10" />
      <line strokeLinecap="round" x1="12" y1="8" x2="12" y2="12" />
      <line strokeLinecap="round" x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

const ROLES = [
  { tag: "SuperAdmin", tagClass: "login-role-tag--superadmin", desc: "Alta de empresas y control global" },
  { tag: "RH",         tagClass: "login-role-tag--rh",         desc: "Empleados, asignaciones y constancias" },
  { tag: "Empleado",   tagClass: "login-role-tag--empleado",   desc: "Mis cursos y mi progreso" },
]

const FEATURES = [
  { n: "01", label: "Constancias DC-3 automáticas STPS" },
  { n: "02", label: "Dashboard de progreso por empleado" },
  { n: "03", label: "Cumplimiento normativo integrado" },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", { email, password, redirect: false })

    if (result?.error) {
      setError("Correo o contraseña incorrectos")
      setLoading(false)
      return
    }

    const res     = await fetch("/api/auth/session")
    const session = await res.json()
    const rol     = session?.user?.rol

    if      (rol === "SUPERADMIN") router.push("/superadmin/empresas")
    else if (rol === "RH")        router.push("/empresa/inicio")
    else if (rol === "EMPLEADO")  router.push("/empleado/cursos")
    else                          setError("Rol no reconocido")
  }

  return (
    <div className="login-root">

      {/* ══════════════════════════════════
          PANEL IZQUIERDO — Marca
          ══════════════════════════════════ */}
      <aside className="login-panel-brand">
        <div className="login-brand-orb login-brand-orb--teal" />
        <div className="login-brand-orb login-brand-orb--orange" />
        <div className="login-brand-dots" />
        <div className="login-brand-edge" />

        <div className="login-brand-content">

          {/* Top: chip de estado */}
          <div>
            <div className="login-brand-chip">Portal Empresarial</div>
          </div>

          {/* Centro: titular + copy */}
          <div className="login-brand-center">
            <p className="login-brand-eyebrow">Desarrolla360</p>
            <h1 className="login-brand-headline">
              Capacitación que cumple.<br />
              <em>Equipos que crecen.</em>
            </h1>
            <p className="login-brand-body">
              Administra la capacitación corporativa de tu empresa: cursos, progreso y constancias DC&#8209;3 en un solo lugar.
            </p>

            <div className="login-brand-divider" />

            {/* Features */}
            <div className="login-brand-features">
              {FEATURES.map((f) => (
                <div key={f.n} className="login-feature-row">
                  <span className="login-feature-num">{f.n}</span>
                  <span className="login-feature-text">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Logo + copyright */}
          <div className="login-brand-bottom">
            <Image
              src="/assets/logo_desarrolla_cropped.png"
              alt="Desarrolla360"
              width={130}
              height={40}
              className="h-7 w-auto object-contain opacity-40 mb-3"
              priority
            />
            <p>© 2026 Desarrolla360 · Portal Empresarial</p>
          </div>

        </div>
      </aside>

      {/* ══════════════════════════════════
          PANEL DERECHO — Formulario
          ══════════════════════════════════ */}
      <main className="login-panel-form">

        {/* Logo mobile */}
        <div className="login-mobile-logo">
          <Image
            src="/assets/logo_desarrolla_cropped.png"
            alt="Desarrolla360"
            width={160}
            height={48}
            className="h-9 w-auto object-contain"
            priority
          />
        </div>

        <div className="login-form-shell">

          {/* Header */}
          <header className="login-form-head">
            <p className="login-form-eyebrow">Bienvenido</p>
            <h2 className="login-form-title">Entra a tu panel</h2>
            <p className="login-form-subtitle">
              Ingresa tus credenciales para continuar
            </p>
          </header>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="login-form-body">

            <div className="login-field-group">
              <label className="login-field-label" htmlFor="lp-email">
                Correo electrónico
              </label>
              <input
                id="lp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@empresa.com"
                required
                autoComplete="email"
                className="login-field-input"
              />
            </div>

            <div className="login-field-group">
              <label className="login-field-label" htmlFor="lp-password">
                Contraseña
              </label>
              <div className="login-pw-wrap">
                <input
                  id="lp-password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="login-field-input login-field-input--pw"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="login-pw-toggle"
                  tabIndex={-1}
                  aria-label={showPw ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>
            </div>

            {error ? (
              <div className="login-error-box" role="alert">
                <AlertIcon />
                <span>{error}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="login-submit-btn"
            >
              {loading ? (
                <span className="login-btn-spinner" aria-hidden />
              ) : (
                <>
                  <span>Entrar al portal</span>
                  <ArrowIcon />
                </>
              )}
            </button>

          </form>

          {/* Guía de roles */}
          <div className="login-role-guide">
            <p className="login-role-guide-title">Accesos del portal</p>
            <div className="login-role-list">
              {ROLES.map((r) => (
                <div key={r.tag} className="login-role-item">
                  <span className={`login-role-tag ${r.tagClass}`}>{r.tag}</span>
                  <span className="login-role-item-desc">{r.desc}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

    </div>
  )
}
