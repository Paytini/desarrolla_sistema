"use client"

import Image from "next/image"
import { useState, useEffect } from "react"
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

const QUOTES = [
  {
    text: "La capacitación es el puente entre el talento que ya tienes y los resultados que todavía no has alcanzado.",
    author: "Peter Drucker",
    role: "Padre de la administración moderna",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=960&q=75",
  },
  {
    text: "Invertir en el conocimiento de tu equipo es la única inversión que ninguna crisis puede quitarte.",
    author: "Benjamin Franklin",
    role: "Empresario y estadista",
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=960&q=75",
  },
  {
    text: "Los equipos que aprenden juntos son los que construyen empresas que perduran.",
    author: "Peter Senge",
    role: "La Quinta Disciplina",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=960&q=75",
  },
  {
    text: "La diferencia entre una empresa ordinaria y una extraordinaria está en el desarrollo de su gente.",
    author: "Jack Welch",
    role: "Ex CEO de General Electric",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=960&q=75",
  },
  {
    text: "El cumplimiento normativo no es una carga: es la base sobre la que se construye una empresa confiable.",
    author: "Desarrolla360",
    role: "Portal Empresarial",
    image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=960&q=75",
  },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]               = useState("")
  const [password, setPassword]         = useState("")
  const [showPw, setShowPw]             = useState(false)
  const [error, setError]               = useState("")
  const [loading, setLoading]           = useState(false)
  const [activeIdx, setActiveIdx]       = useState(0)
  const [quoteVisible, setQuoteVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteVisible(false)
      setTimeout(() => {
        setActiveIdx(i => (i + 1) % QUOTES.length)
        setQuoteVisible(true)
      }, 600)
    }, 6500)
    return () => clearInterval(interval)
  }, [])

  function jumpTo(i: number) {
    if (i === activeIdx) return
    setQuoteVisible(false)
    setTimeout(() => { setActiveIdx(i); setQuoteVisible(true) }, 350)
  }

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

  const quote = QUOTES[activeIdx]

  return (
    <div className="login-root">

      <aside className="login-quotes-panel">
        <div
          className="login-ql-bg-image"
          style={{
            backgroundImage: `url(${quote.image})`,
            opacity: quoteVisible ? 0.38 : 0,
            transition: "opacity 1s ease",
          }}
        />
        <div className="login-ql-overlay" />
        <div className="login-bg-grid" />
        <div className="login-ql-edge" />

        <div className="login-ql-inner">

          <div className="login-ql-top">
            <Image
              src="/assets/logo_desarrolla_cropped.png"
              alt="Desarrolla360"
              width={240}
              height={72}
              className="h-12 w-auto object-contain"
              priority
            />
          </div>

          <div className="login-ql-body">
            <span className="login-ql-mark">&ldquo;</span>

            <div className="login-ql-quote-card">
              <div
                style={{
                  opacity:    quoteVisible ? 1 : 0,
                  transform:  quoteVisible ? "translateY(0)" : "translateY(0.75rem)",
                  transition: "opacity 0.6s cubic-bezier(0.4,0,0.2,1), transform 0.6s cubic-bezier(0.4,0,0.2,1)",
                }}
              >
                <p className="login-ql-text">{quote.text}</p>
                <div className="login-ql-author">
                  <span className="login-ql-name">{quote.author}</span>
                  <span className="login-ql-role">{quote.role}</span>
                </div>
              </div>

              <div className="login-ql-dots">
                {QUOTES.map((_, i) => (
                  <button
                    key={i}
                    className={`login-ql-dot${i === activeIdx ? " login-ql-dot--active" : ""}`}
                    onClick={() => jumpTo(i)}
                    aria-label={`Frase ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Wave divider — visible solo en escritorio */}
      <div className="login-wave-divider" aria-hidden="true">
        <svg
          viewBox="0 0 180 800"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M 90 0 C 0 200, 0 600, 90 800 L 180 800 L 180 0 Z" fill="white" />
        </svg>
      </div>

      <main className="login-form-panel">
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
      </main>

    </div>
  )
}
