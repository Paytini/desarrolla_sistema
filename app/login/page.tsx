"use client"

import Image from "next/image"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { GeometricDecor } from "@/components/shared/GeometricDecor"

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
  const [email, setEmail]     = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw]   = useState(false)
  const [error, setError]     = useState("")
  const [loading, setLoading] = useState(false)
  const [btnHover, setBtnHover]   = useState(false)
  const [btnActive, setBtnActive] = useState(false)

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
    else if (rol === "RH")         router.push("/empresa/inicio")
    else if (rol === "EMPLEADO")   router.push("/empleado/cursos")
    else                           setError("Rol no reconocido")
  }


  const btnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    width: '100%',
    padding: '12px 24px',
    borderRadius: '9999px',
    backgroundColor: '#F5853F',
    color: '#FFFFFF',
    fontFamily: 'var(--font-outfit, "Outfit", system-ui, sans-serif)',
    fontSize: '1rem',
    fontWeight: 700,
    border: '2px solid #1E293B',
    boxShadow: btnActive
      ? '2px 2px 0px 0px #1E293B'
      : btnHover
        ? '6px 6px 0px 0px #1E293B'
        : '4px 4px 0px 0px #1E293B',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    transition: 'transform 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms cubic-bezier(0.34,1.56,0.64,1)',
    transform: btnActive
      ? 'translate(2px, 2px)'
      : btnHover
        ? 'translate(-2px, -2px)'
        : 'translate(0, 0)',
    marginTop: '0.35rem',
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        backgroundColor: '#F8FAFC',
        backgroundImage: 'radial-gradient(circle, #CBD5E1 1.5px, transparent 1.5px)',
        backgroundSize: '28px 28px',
      }}
    >
      <GeometricDecor
        shapes={[
          { type: 'circle',   color: '#8B5CF6', size: 260, top: -80,   left: -80,  opacity: 0.10 },
          { type: 'triangle', color: '#F5853F', size: 100, top: 60,    right: 40,  opacity: 0.14, rotate: 15 },
          { type: 'circle',   color: '#F472B6', size: 140, bottom: 60, right: -40, opacity: 0.09 },
          { type: 'square',   color: '#34D399', size: 70,  bottom: 100,left: 40,   opacity: 0.10, rotate: 30 },
        ]}
      />

      {/* Main layout: illustration · card · illustration */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '1120px',
        padding: '2rem 1.5rem',
        gap: '2.5rem',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Left illustration */}
        <div className="hidden lg:flex" style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/illustrations/studying.svg"
            alt=""
            aria-hidden
            style={{ width: 300, height: 'auto', transform: 'scaleX(-1)', opacity: 0.92 }}
          />
        </div>

        {/* Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '2px solid #1E293B',
          borderRadius: '20px',
          boxShadow: '8px 8px 0px 0px #1E293B',
          width: '100%',
          maxWidth: '420px',
          flexShrink: 0,
          overflow: 'hidden',
        }}>

          {/* Orange header strip with logo */}
          <div style={{
            backgroundColor: '#F5853F',
            borderBottom: '2px solid #1E293B',
            padding: '24px 40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Image
              src="/assets/logo_desarrolla_cropped.png"
              alt="Desarrolla360"
              width={200}
              height={60}
              className="h-10 w-auto object-contain"
              style={{ filter: 'brightness(0) invert(1)' }}
              priority
            />
          </div>

          {/* Form body */}
          <div style={{ padding: '36px 40px 32px' }}>
            <header style={{ marginBottom: '28px' }}>
              <h2 style={{
                fontFamily: 'var(--font-outfit, "Outfit", system-ui, sans-serif)',
                fontSize: '1.875rem',
                fontWeight: 800,
                color: '#1E293B',
                marginBottom: '6px',
                lineHeight: 1.1,
              }}>
                Bienvenido de nuevo
              </h2>
              <p className="login-form-subtitle">
                Ingresa tus credenciales para acceder a tu panel
              </p>
            </header>

            <form onSubmit={handleSubmit} className="login-form-body">
              <div className="login-field-group">
                <label htmlFor="lp-email" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1E293B', marginBottom: '6px', display: 'block' }}>
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
                <label htmlFor="lp-password" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1E293B', marginBottom: '6px', display: 'block' }}>
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
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="login-pw-toggle" tabIndex={-1} aria-label={showPw ? "Ocultar contraseña" : "Ver contraseña"}>
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
                style={btnStyle}
                onMouseEnter={() => { if (!loading) setBtnHover(true) }}
                onMouseLeave={() => { setBtnHover(false); setBtnActive(false) }}
                onMouseDown={() => { if (!loading) setBtnActive(true) }}
                onMouseUp={() => setBtnActive(false)}
              >
                {loading ? <span className="login-btn-spinner" aria-hidden /> : <><span>Entrar al portal</span><ArrowIcon /></>}
              </button>
            </form>

            <p className="login-card-footer">© 2026 Desarrolla360 · Portal Empresarial</p>
          </div>
        </div>

        {/* Right illustration */}
        <div className="hidden lg:flex" style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/illustrations/certificate.svg"
            alt=""
            aria-hidden
            style={{ width: 260, height: 'auto', opacity: 0.92 }}
          />
        </div>

      </div>
    </div>
  )
}
