// app/(portal)/superadmin/page.tsx
import { getSuperadminEmpresasSnapshot } from "@/lib/dashboard-cache"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { AccesoEmpresasPanel } from "./_components/AccesoEmpresasPanel"
import { DashboardTopBar } from "./_components/DashboardTopBar"
import { KpiStrip } from "./_components/KpiStrip"
import { OcupacionCard } from "./_components/OcupacionCard"
import { RenovacionesTable } from "./_components/RenovacionesTable"

const DAY_MS = 1000 * 60 * 60 * 24

export default async function SuperadminDashboardPage() {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const { empresas } = await getSuperadminEmpresasSnapshot()
  const now = Date.now()

  const empresasActivas = empresas.filter((e) => e.activo).length
  const totalEmpleadosActivos = empresas.reduce(
    (s, e) => s + e.empleados.filter((emp) => emp.activo).length, 0
  )
  const totalContratados = empresas.reduce((s, e) => s + e.asientos_contratados, 0)
  const totalUsados = empresas.reduce((s, e) => s + e.asientos_usados, 0)
  const ocupacionPct = totalContratados ? Math.round((totalUsados / totalContratados) * 100) : 0

  const renewals = empresas
    .filter((e) => {
      const exp = e.paquetes[0]?.fecha_vencimiento
      if (!exp) return false
      return Math.floor((new Date(exp).getTime() - now) / DAY_MS) <= 30
    })
    .map((e) => ({
      empresa: e,
      days: Math.floor(
        (new Date(e.paquetes[0]!.fecha_vencimiento as Date).getTime() - now) / DAY_MS
      ),
    }))
    .sort((a, b) => a.days - b.days)

  const nombre = session.user.nombre as string

  return (
    <div className="space-y-5">
      <DashboardTopBar nombre={nombre} />
      <KpiStrip
        empresasActivas={empresasActivas}
        totalEmpresas={empresas.length}
        totalEmpleadosActivos={totalEmpleadosActivos}
        ocupacionPct={ocupacionPct}
        totalUsados={totalUsados}
        totalContratados={totalContratados}
        renovacionesCount={renewals.length}
      />
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr_1fr]">
        <OcupacionCard ocupacionPct={ocupacionPct} empresas={empresas} />
        <RenovacionesTable renewals={renewals} />
        <AccesoEmpresasPanel empresas={empresas} />
      </div>
    </div>
  )
}
