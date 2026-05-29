import { getSession } from "@/lib/session"
import {
  Clock,
  Database,
  Info,
  Link2,
  Server,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react"
import { type ReactNode } from "react"
import { redirect } from "next/navigation"
import AlertBanner from "@/components/portal/AlertBanner"

type InfoRowProps = { label: string; value: string; mono?: boolean }

function InfoRow({ label, value, mono }: InfoRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <p className="text-sm text-slate-500">{label}</p>
      <p
        className={`max-w-[60%] break-all text-right text-sm font-medium text-slate-900 ${
          mono ? "font-mono text-[12px]" : ""
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function SectionCard({
  title,
  description,
  Icon,
  iconCls,
  children,
}: {
  title: string
  description: string
  Icon: LucideIcon
  iconCls: string
  children: ReactNode
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-start gap-4 border-b border-slate-100 p-6">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
          <Icon size={16} strokeWidth={2} />
        </span>
        <div className="space-y-0.5">
          <h2 className="text-[15px] font-semibold text-slate-950">{title}</h2>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>
      <div className="divide-y divide-slate-50 px-6">{children}</div>
    </article>
  )
}

export default async function ConfiguracionPage() {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const timezone =
    process.env.PORTAL_TIME_ZONE ||
    process.env.NEXT_PUBLIC_PORTAL_TIME_ZONE ||
    "America/Tijuana"

  const bridgeBase = process.env.WP_BRIDGE_BASE_URL
    ? process.env.WP_BRIDGE_BASE_URL.replace(/^https?:\/\//, "").split("/")[0]
    : "No configurado"

  const env = process.env.NODE_ENV ?? "development"
  const vercelEnv = process.env.VERCEL_ENV ?? env

  return (
    <div className="space-y-7">
      {/* Header */}
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#E8761A]">
          SuperAdmin
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Configuración</h1>
        <p className="text-sm text-slate-400">
          Parámetros del portal, integraciones y límites operativos.
        </p>
      </header>

      <AlertBanner
        tone="blue"
        title="Configuración de solo lectura"
        description="Estos valores vienen de variables de entorno en Vercel. Para modificarlos, edita el proyecto en el dashboard de Vercel."
      />

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Sistema */}
        <SectionCard
          title="Información del sistema"
          description="Entorno de ejecución y versiones del portal."
          Icon={Server}
          iconCls="bg-slate-100 text-slate-600"
        >
          <InfoRow label="Entorno" value={vercelEnv} />
          <InfoRow label="Framework" value="Next.js 15 · App Router" />
          <InfoRow label="ORM" value="Prisma 7" />
          <InfoRow label="Deploy" value="Vercel Pro" />
          <InfoRow label="Auth" value="NextAuth v5 · JWT" />
        </SectionCard>

        {/* Zona horaria */}
        <SectionCard
          title="Zona horaria"
          description="Usada para fechas en DC-3, reportes y auditorías."
          Icon={Clock}
          iconCls="bg-[#fff5ed] text-[#E8761A]"
        >
          <InfoRow label="Zona horaria activa" value={timezone} mono />
          <InfoRow
            label="Offset actual"
            value={new Intl.DateTimeFormat("es-MX", {
              timeZone: timezone,
              timeZoneName: "short",
            })
              .format(new Date())
              .split(" ")
              .pop() ?? "—"}
            mono
          />
          <InfoRow
            label="Fecha/hora local"
            value={new Intl.DateTimeFormat("es-MX", {
              timeZone: timezone,
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date())}
          />
          <div className="py-3">
            <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
              Para cambiar la zona horaria, actualiza la variable de entorno{" "}
              <code className="font-mono font-semibold">PORTAL_TIME_ZONE</code> en Vercel.
            </p>
          </div>
        </SectionCard>

        {/* Bridge WordPress */}
        <SectionCard
          title="Integración WordPress"
          description="Configuración del bridge que conecta con Tutor LMS Pro."
          Icon={Link2}
          iconCls="bg-orange-50 text-orange-600"
        >
          <InfoRow label="Dominio del bridge" value={bridgeBase} mono />
          <InfoRow
            label="Clave de portal"
            value={process.env.WP_BRIDGE_PORTAL_KEY ? "••••••••••••" : "No configurado"}
            mono
          />
          <InfoRow
            label="URL pública WP"
            value={
              process.env.NEXT_PUBLIC_WORDPRESS_SITE_URL
                ? process.env.NEXT_PUBLIC_WORDPRESS_SITE_URL.replace("https://", "")
                : "No configurado"
            }
            mono
          />
          <div className="py-3">
            <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
              Diagnóstico detallado disponible en{" "}
              <a
                href="/superadmin/integracion"
                className="font-semibold text-[#E8761A] hover:underline"
              >
                Integración →
              </a>
            </p>
          </div>
        </SectionCard>

        {/* Límites del plan */}
        <SectionCard
          title="Límites del plan empresarial"
          description="Valores por defecto al crear empresas (configurables por empresa)."
          Icon={Users}
          iconCls="bg-violet-50 text-violet-600"
        >
          <InfoRow label="Empleados máx. por empresa" value="100" />
          <InfoRow label="Admins RH máx. por empresa" value="3" />
          <InfoRow label="Accesos simultáneos" value="Sin restricción" />
          <InfoRow label="Importación masiva CSV" value="Incluida" />
          <div className="py-3">
            <p className="rounded-xl bg-violet-50 px-3 py-2.5 text-xs text-violet-700">
              Los cupos por empresa se ajustan individualmente desde la sección Empresas.
            </p>
          </div>
        </SectionCard>

        {/* Constancias DC-3 */}
        <SectionCard
          title="Constancias DC-3"
          description="Motor de generación de constancias oficiales STPS."
          Icon={ShieldCheck}
          iconCls="bg-[#fff5ed] text-[#E8761A]"
        >
          <InfoRow label="Generador" value="pdf-lib (portal)" />
          <InfoRow label="Plantilla" value="Oficial STPS" />
          <InfoRow label="Storage firmas" value="Vercel Blob" />
          <InfoRow label="Formato folio" value="D360-YYYY-MMDD-NNN" mono />
        </SectionCard>

        {/* Base de datos */}
        <SectionCard
          title="Base de datos"
          description="Configuración del backend de datos del portal."
          Icon={Database}
          iconCls="bg-amber-50 text-amber-600"
        >
          <InfoRow label="Motor" value="PostgreSQL · Supabase" />
          <InfoRow label="Modelo" value="Multitenant · BD compartida" />
          <InfoRow label="Aislamiento" value="campo empresaId + RLS" />
          <InfoRow label="ORM" value="Prisma Client" />
          <div className="py-3">
            <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
              Row Level Security (RLS) activo en Supabase como capa adicional de aislamiento.
            </p>
          </div>
        </SectionCard>
      </div>

      {/* Nota de versión */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
        <Info size={15} className="mt-0.5 shrink-0 text-slate-400" strokeWidth={2} />
        <p className="text-xs leading-relaxed text-slate-500">
          Esta página es de solo lectura. Para modificar variables de entorno, accede al panel de
          Vercel. Para cambios en el plan o en la estructura de datos, contacta al equipo técnico de
          Desarrolla360.
        </p>
      </div>
    </div>
  )
}
