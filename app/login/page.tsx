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
    else if (rol === "RH")         router.push("/empresa/inicio")
    else if (rol === "EMPLEADO")   router.push("/empleado/cursos")
    else                           setError("Rol no reconocido")
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — flat blue color block */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden bg-[#3B82F6] p-12">
        <GeometricDecor
          shapes={[
            { type: 'circle', color: '#FFFFFF', size: 320, top: -80,    right: -80,   opacity: 0.07 },
            { type: 'circle', color: '#FFFFFF', size: 200, bottom: 40,  left: -60,    opacity: 0.05 },
            { type: 'square', color: '#FFFFFF', size: 120, bottom: 160, right: '10%', opacity: 0.06, rotate: 45 },
          ]}
        />

        <div className="relative z-10">
          <Image
            src="/assets/logo_desarrolla_cropped.png"
            alt="Desarrolla360"
            width={180}
            height={48}
            className="h-10 w-auto object-contain"
            style={{ filter: 'brightness(0) invert(1)' }}
            priority
          />
        </div>

        <div className="relative z-10">
          <p
            className="text-4xl font-bold text-white leading-tight"
            style={{ letterSpacing: '-0.02em', fontFamily: '"Outfit", system-ui, sans-serif' }}
          >
            Capacitación<br />con cumplimiento<br />STPS integrado.
          </p>
          <p className="mt-4 text-blue-100 text-base font-medium">
            DC-3 automático · Progreso en tiempo real · Portal B2B
          </p>
        </div>

        <div className="relative z-10 text-blue-200 text-xs">
          © 2026 Desarrolla360
        </div>
      </div>

      {/* Right panel — white form */}
      <div className="flex flex-1 items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile-only logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Image
              src="/assets/logo_desarrolla_cropped.png"
              alt="Desarrolla360"
              width={160}
              height={48}
              className="h-10 w-auto object-contain"
              priority
            />
          </div>

          <header className="mb-8">
            <h1
              className="text-3xl font-bold text-[#111827]"
              style={{ letterSpacing: '-0.02em', fontFamily: '"Outfit", system-ui, sans-serif' }}
            >
              Bienvenido de nuevo
            </h1>
            <p className="mt-2 text-sm text-[#6B7280]">
              Ingresa tus credenciales para acceder a tu panel
            </p>
          </header>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="lp-email"
                className="text-[11px] font-semibold uppercase tracking-wider text-[#111827]"
              >
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
                className="h-12 w-full rounded-md bg-gray-100 px-4 text-sm text-[#111827] outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#3B82F6] transition-all duration-200"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="lp-password"
                className="text-[11px] font-semibold uppercase tracking-wider text-[#111827]"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="lp-password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="h-12 w-full rounded-md bg-gray-100 px-4 pr-11 text-sm text-[#111827] outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#3B82F6] transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPw ? "Ocultar contraseña" : "Ver contraseña"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>
            </div>

            {error ? (
              <div role="alert" className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertIcon />
                <span>{error}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#3B82F6] text-sm font-semibold text-white transition-all duration-200 hover:bg-blue-600 hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading
                ? <span className="d360-spinner" aria-hidden />
                : <><span>Entrar al portal</span><ArrowIcon /></>
              }
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            © 2026 Desarrolla360 · Portal Empresarial
          </p>
        </div>
      </div>
    </div>
  )
}
