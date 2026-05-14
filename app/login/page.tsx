"use client"

import Image from "next/image"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Correo o contraseña incorrectos")
      setLoading(false)
      return
    }

    const res = await fetch("/api/auth/session")
    const session = await res.json()
    const rol = session?.user?.rol

    if (rol === "SUPERADMIN")     router.push("/superadmin/empresas")
    else if (rol === "RH")        router.push("/empresa/inicio")
    else if (rol === "EMPLEADO")  router.push("/empleado/cursos")
    else                          setError("Rol no reconocido")
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.22),transparent_28rem),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.16),transparent_24rem)]" />

      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-white p-8 shadow-2xl shadow-slate-950/40">
        <div className="mb-8 grid justify-items-center gap-3">
          <div className="flex h-24 w-full items-center justify-center rounded-[1.5rem] border border-slate-200 bg-white px-8 shadow-sm">
            <Image
              src="/assets/logo_desarrolla.png"
              alt="DesarrollaMX 360"
              width={280}
              height={120}
              className="h-20 w-full object-contain"
              priority
            />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-slate-950">Portal empresarial</h1>
            <p className="mt-1 text-sm text-slate-500">Acceso corporativo a cursos y constancias</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-center text-xs text-rose-700">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-950 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  )
}
