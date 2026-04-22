"use client"

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-sm shadow-sm">
        <h1 className="text-xl font-medium text-center mb-1">
          Desarrolla<span className="text-purple-600">360</span>
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">Portal empresarial</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-purple-700 disabled:opacity-60 transition-colors"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  )
}