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

      {/* Orbs de fondo animados */}
      <div className="login-bg-orb login-bg-orb--blue" />
      <div className="login-bg-orb login-bg-orb--purple" />
      <div className="login-bg-orb login-bg-orb--cyan" />
      <div className="login-bg-grid" />

      {/* Tarjeta centrada */}
      <div className="login-card">

        <div className="login-card-logo">
          <Image
            src="/assets/logo_desarrolla_cropped.png"
            alt="Desarrolla360"
            width={220}
            height={66}
            className="h-11 w-auto object-contain"
            priority
          />
        </div>

        <header className="login-form-head">
          <h2 className="login-form-title">Bienvenido de nuevo</h2>
          <p className="login-form-subtitle">
            Ingresa tus credenciales para acceder a tu panel
          </p>
        </header>

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

        <p className="login-card-footer">
          © 2026 Desarrolla360 · Portal Empresarial
        </p>

      </div>
    </div>
  )
}
