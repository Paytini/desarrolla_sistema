import KpiCard from "@/components/shared/KpiCard"
import { PageHeader } from "@/components/shared/PageHeader"
import { RingChart } from "@/components/shared/RingChart"
import { Award, BarChart3, ChevronRight, ClipboardList, Package, Users, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { checkAndNotifyExpiringPackages } from "@/lib/notifications"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"

function QuickLink({
  href,
  label,
  Icon,
  iconCls,
}: {
  href: string
  label: string
  Icon: LucideIcon
  iconCls: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg bg-white px-4 py-3.5 transition-all duration-200 hover:bg-gray-100 hover:scale-[1.02]"
    >
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconCls}`}>
        <Icon size={15} strokeWidth={2} />
      </span>
      <span className="flex-1 text-sm font-medium text-slate-800">{label}</span>
      <ChevronRight size={14} className="shrink-0 text-slate-400" />
    </Link>
  )
}

export default async function EmpresaInicio() {
  const session = await getSession()
  if (!session || session.user.rol !== "RH" || !session.user.empresa_id) redirect("/login")

  await checkAndNotifyExpiringPackages().catch(() => {})

  const empresa = await prisma.empresa.findUnique({
    where: { id: session.user.empresa_id },
    include: {
      paquetes: {
        where: { activo: true },
        orderBy: { created_at: "desc" },
        include: { paquete: { include: { cursos: true } } },
        take: 1,
      },
      empleados: {
        where: { activo: true },
        include: { cursos: true, constancias: true },
      },
    },
  })

  if (!empresa) redirect("/login")

  const paqueteActivo = empresa.paquetes[0]?.paquete
  const empleadosActivos = empresa.empleados.length
  const totalConstancias = empresa.empleados.reduce(
    (sum, emp) => sum + emp.constancias.length,
    0
  )
  const allProgress = empresa.empleados.flatMap((emp) => emp.cursos.map((c) => c.progreso_pct))
  const averageProgress = allProgress.length
    ? Math.round(allProgress.reduce((sum, p) => sum + p, 0) / allProgress.length)
    : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={empresa.nombre}
        description="Panel de operación académica"
        breadcrumbs={[{ label: "Empresa" }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Paquete activo"
          value={paqueteActivo?.nombre ?? "Sin paquete"}
          sub={`${paqueteActivo?.cursos.length ?? 0} cursos`}
          icon={Package}
          borderColor="amber"
        />
        <KpiCard
          label="Avance promedio"
          value={`${averageProgress}%`}
          sub="Todos los cursos"
          icon={BarChart3}
          borderColor="orange"
        />
        <KpiCard
          label="Empleados activos"
          value={String(empleadosActivos)}
          sub="Accesos vigentes"
          icon={Users}
          borderColor="charcoal"
        />
        <KpiCard
          label="Constancias emitidas"
          value={String(totalConstancias)}
          sub="Total acumulado"
          icon={Award}
          borderColor="emerald"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
        <div className="grid gap-3 sm:grid-cols-2">
          <QuickLink href="/company/employees" label="Gestión de empleados" Icon={Users} iconCls="bg-[#EAF1FE] text-[#3579F5]" />
          <QuickLink href="/company/assignments" label="Asignación de cursos" Icon={ClipboardList} iconCls="bg-[#EAF1FE] text-[#3579F5]" />
          <QuickLink
            href="/company/progress"
            label="Progreso y trayectorias"
            Icon={BarChart3}
            iconCls="bg-[#EAF1FE] text-[#3579F5]"
          />
          <QuickLink
            href="/company/certificates"
            label="Constancias DC-3"
            Icon={Award}
            iconCls="bg-[#EAF1FE] text-[#3579F5]"
          />
        </div>

        <div className="flex flex-col items-center justify-center gap-3 rounded-lg bg-white px-10 py-6">
          <RingChart
            pct={averageProgress}
            size={96}
            sw={9}
            color="#3579F5"
          />
          <p className="text-xs font-medium text-slate-500">Avance global</p>
        </div>
      </div>
    </div>
  )
}
