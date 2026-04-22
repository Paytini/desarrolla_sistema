import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function EmpresasPage() {
  const session = await auth()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-medium mb-1">
          Desarrolla<span className="text-purple-600">360</span>
        </h1>
        <p className="text-sm text-gray-500 mb-8">Panel SuperAdmin</p>
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-lg font-medium mb-4">✅ Login exitoso</h2>
          <p className="text-sm text-gray-600">
            Bienvenido, <strong>{session.user.nombre}</strong>
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Rol: <span className="text-purple-600 font-medium">{session.user.rol}</span>
          </p>
        </div>
      </div>
    </div>
  )
}