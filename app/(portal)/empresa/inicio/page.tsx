import { Award, BarChart3, ChevronRight, ClipboardList, Package, Users, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"

function KpiCard({
  label,
  value,
  sub,
  Icon,
  iconCls,
}: {
  label: string
  value: string
  sub?: string
  Icon: LucideIcon
  iconCls: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-slate-950">{value}</p>
          {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
          <Icon size={16} strokeWidth={2} />
        </span>
      </div>
    </div>
  )
}

function RingChart({ pct }: { pct: number }) {
  const r = 38
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  const color = pct >= 80 ? "#0d9488" : pct >= 50 ? "#f59e0b" : "#f43f5e"
  return (
    <svg width={96} height={96} viewBox="0 0 96 96" aria-hidden="true">
      <circle cx={48} cy={48} r={r} fill="none" stroke="#e2e8f0" strokeWidth={9} />
      <circle
        cx={48}
        cy={48}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={9}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 48 48)"
      />
      <text x={48} y={53} textAnchor="middle" fill="#0f172a" fontSize={16} fontWeight={700}>
        {pct}%
      </text>
    </svg>
  )
}

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
      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-slate-300 hover:shadow-sm"
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
      <header className="space-y-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-600">
          RH / Empresa
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{empresa.nombre}</h1>
        <p className="text-sm text-slate-400">Panel de operación académica</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Paquete activo"
          value={paqueteActivo?.nombre ?? "Sin paquete"}
          sub={`${paqueteActivo?.cursos.length ?? 0} cursos`}
          Icon={Package}
          iconCls="bg-violet-50 text-violet-600"
        />
        <KpiCard
          label="Avance promedio"
          value={`${averageProgress}%`}
          sub="Todos los cursos"
          Icon={BarChart3}
          iconCls="bg-teal-50 text-teal-600"
        />
        <KpiCard
          label="Empleados activos"
          value={String(empleadosActivos)}
          sub="Accesos vigentes"
          Icon={Users}
          iconCls="bg-blue-50 text-blue-600"
        />
        <KpiCard
          label="Constancias emitidas"
          value={String(totalConstancias)}
          sub="Total acumulado"
          Icon={Award}
          iconCls="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
        <div className="grid gap-3 sm:grid-cols-2">
          <QuickLink
            href="/empresa/empleados"
            label="Gestión de empleados"
            Icon={Users}
            iconCls="bg-violet-50 text-violet-600"
          />
          <QuickLink
            href="/empresa/asignaciones"
            label="Asignación de cursos"
            Icon={ClipboardList}
            iconCls="bg-teal-50 text-teal-600"
          />
          <QuickLink
            href="/empresa/progreso"
            label="Progreso y trayectorias"
            Icon={BarChart3}
            iconCls="bg-slate-100 text-slate-600"
          />
          <QuickLink
            href="/empresa/constancias"
            label="Constancias DC-3"
            Icon={Award}
            iconCls="bg-amber-50 text-amber-600"
          />
        </div>

        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-10 py-6">
          <RingChart pct={averageProgress} />
          <p className="text-xs font-medium text-slate-500">Avance global</p>
        </div>
      </div>
    </div>
  )
}
