import KpiCard from "@/components/shared/KpiCard"
import { PageHeader } from "@/components/shared/PageHeader"
import { RingChart } from "@/components/shared/RingChart"
import { Award, BarChart3, ChevronRight, ClipboardList, Package, Users, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { companyPath } from "@/lib/company-routes"

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

export default async function CompanyHome() {
  const session = await getSession()
  if (!session || session.user.rol !== "RH" || !session.user.empresa_id) redirect("/login")

  const companyId = session.user.empresa_id

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      packages: {
        where: { active: true },
        orderBy: { created_at: "desc" },
        include: { package: { include: { courses: true } } },
        take: 1,
      },
    },
  })

  if (!company) redirect("/login")

  const [activeEmployees, totalCertificates, progressAverage] = await Promise.all([
    prisma.employee.count({ where: { company_id: companyId, active: true } }),
    prisma.certificate.count({ where: { employee: { company_id: companyId, active: true } } }),
    prisma.employeeCourse.aggregate({
      where: { employee: { company_id: companyId, active: true } },
      _avg: { progress_pct: true },
    }),
  ])

  const activePackage = company.packages[0]?.package
  const averageProgress = Math.round(progressAverage._avg.progress_pct ?? 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title={company.name}
        description="Panel de operación académica"
        breadcrumbs={[{ label: "Empresa" }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Paquete activo"
          value={activePackage?.name ?? "Sin paquete"}
          sub={`${activePackage?.courses.length ?? 0} cursos`}
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
          value={String(activeEmployees)}
          sub="Accesos vigentes"
          icon={Users}
          borderColor="charcoal"
        />
        <KpiCard
          label="Constancias emitidas"
          value={String(totalCertificates)}
          sub="Total acumulado"
          icon={Award}
          borderColor="emerald"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
        <div className="grid gap-3 sm:grid-cols-2">
          <QuickLink href={companyPath(company.slug, "/employees")} label="Gestión de empleados" Icon={Users} iconCls="bg-[#EAF1FE] text-[#3579F5]" />
          <QuickLink href={companyPath(company.slug, "/assignments")} label="Asignación de cursos" Icon={ClipboardList} iconCls="bg-[#EAF1FE] text-[#3579F5]" />
          <QuickLink
            href={companyPath(company.slug, "/progress")}
            label="Progreso y trayectorias"
            Icon={BarChart3}
            iconCls="bg-[#EAF1FE] text-[#3579F5]"
          />
          <QuickLink
            href={companyPath(company.slug, "/certificates")}
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
