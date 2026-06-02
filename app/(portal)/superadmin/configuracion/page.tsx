import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getSession } from "@/lib/session"
import {
  Clock, Database, Info, Link2, Server, ShieldCheck, Users, type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`max-w-[60%] break-all text-right text-sm font-medium text-slate-900 ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </p>
    </div>
  )
}

function SectionCard({
  title, description, Icon, iconCls, children, note,
}: {
  title: string; description: string; Icon: LucideIcon; iconCls: string; children: React.ReactNode; note?: { tone: string; text: React.ReactNode }
}) {
  const noteCls: Record<string, string> = {
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-50 text-slate-500",
    violet: "bg-violet-50 text-violet-700",
    orange: "bg-[#fff5ed] text-[#C45F0A]",
  }
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
            <Icon size={16} strokeWidth={2} />
          </span>
          <div>
            <CardTitle className="text-[15px]">{title}</CardTitle>
            <CardDescription className="mt-0.5">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Separator className="mb-1" />
        <div className="divide-y divide-slate-50">{children}</div>
        {note && (
          <p className={`mt-3 rounded-lg px-3 py-2.5 text-xs ${noteCls[note.tone] ?? "bg-slate-50 text-slate-500"}`}>
            {note.text}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default async function ConfiguracionPage() {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const timezone = process.env.PORTAL_TIME_ZONE || process.env.NEXT_PUBLIC_PORTAL_TIME_ZONE || "America/Tijuana"
  const bridgeBase = process.env.WP_BRIDGE_BASE_URL
    ? process.env.WP_BRIDGE_BASE_URL.replace(/^https?:\/\//, "").split("/")[0]
    : "No configurado"
  const vercelEnv = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">SuperAdmin</p>
        <h1 className="text-2xl font-bold text-slate-950">Configuración</h1>
        <p className="mt-0.5 text-sm text-slate-500">Parámetros del portal, integraciones y límites operativos.</p>
      </div>

      <Alert className="border-blue-200 bg-blue-50 text-blue-800">
        <Info className="size-4" />
        <AlertTitle>Configuración de solo lectura</AlertTitle>
        <AlertDescription>
          Estos valores vienen de variables de entorno en Vercel. Para modificarlos, edita el proyecto en el dashboard de Vercel.
        </AlertDescription>
      </Alert>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Información del sistema" description="Entorno de ejecución y versiones del portal." Icon={Server} iconCls="bg-slate-100 text-slate-600">
          <InfoRow label="Entorno" value={vercelEnv} />
          <InfoRow label="Framework" value="Next.js 15 · App Router" />
          <InfoRow label="ORM" value="Prisma 7" />
          <InfoRow label="Deploy" value="Vercel Pro" />
          <InfoRow label="Auth" value="NextAuth v5 · JWT" />
        </SectionCard>

        <SectionCard
          title="Zona horaria"
          description="Usada para fechas en DC-3, reportes y auditorías."
          Icon={Clock}
          iconCls="bg-[#fff5ed] text-[#E8761A]"
          note={{
            tone: "amber",
            text: <>Para cambiar la zona horaria, actualiza <code className="font-mono font-semibold">PORTAL_TIME_ZONE</code> en Vercel.</>,
          }}
        >
          <InfoRow label="Zona horaria activa" value={timezone} mono />
          <InfoRow
            label="Offset actual"
            value={new Intl.DateTimeFormat("es-MX", { timeZone: timezone, timeZoneName: "short" }).format(new Date()).split(" ").pop() ?? "—"}
            mono
          />
          <InfoRow
            label="Fecha/hora local"
            value={new Intl.DateTimeFormat("es-MX", { timeZone: timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date())}
          />
        </SectionCard>

        <SectionCard
          title="Integración WordPress"
          description="Configuración del bridge con Tutor LMS Pro."
          Icon={Link2}
          iconCls="bg-[#fff5ed] text-[#E8761A]"
          note={{
            tone: "slate",
            text: <Link href="/superadmin/integracion" className="font-semibold text-[#E8761A] hover:underline">Ver diagnóstico detallado →</Link>,
          }}
        >
          <InfoRow label="Dominio del bridge" value={bridgeBase} mono />
          <InfoRow label="Clave de portal" value={process.env.WP_BRIDGE_PORTAL_KEY ? "••••••••••••" : "No configurado"} mono />
          <InfoRow
            label="URL pública WP"
            value={process.env.NEXT_PUBLIC_WORDPRESS_SITE_URL?.replace("https://", "") ?? "No configurado"}
            mono
          />
        </SectionCard>

        <SectionCard
          title="Límites del plan empresarial"
          description="Valores por defecto al crear empresas."
          Icon={Users}
          iconCls="bg-violet-50 text-violet-600"
          note={{ tone: "violet", text: "Los cupos por empresa se ajustan individualmente desde la sección Empresas." }}
        >
          <InfoRow label="Empleados máx. por empresa" value="100" />
          <InfoRow label="Admins RH máx. por empresa" value="3" />
          <InfoRow label="Accesos simultáneos" value="Sin restricción" />
          <InfoRow label="Importación masiva CSV" value="Incluida" />
        </SectionCard>

        <SectionCard title="Constancias DC-3" description="Motor de generación de constancias oficiales STPS." Icon={ShieldCheck} iconCls="bg-[#fff5ed] text-[#E8761A]">
          <InfoRow label="Generador" value="pdf-lib (portal)" />
          <InfoRow label="Plantilla" value="Oficial STPS" />
          <InfoRow label="Storage firmas" value="Vercel Blob" />
          <InfoRow label="Formato folio" value="D360-YYYY-MMDD-NNN" mono />
        </SectionCard>

        <SectionCard
          title="Base de datos"
          description="Configuración del backend de datos del portal."
          Icon={Database}
          iconCls="bg-amber-50 text-amber-600"
          note={{ tone: "amber", text: "Row Level Security (RLS) activo en Supabase como capa adicional de aislamiento." }}
        >
          <InfoRow label="Motor" value="PostgreSQL · Supabase" />
          <InfoRow label="Modelo" value="Multitenant · BD compartida" />
          <InfoRow label="Aislamiento" value="campo empresaId + RLS" />
          <InfoRow label="ORM" value="Prisma Client" />
        </SectionCard>
      </div>
    </div>
  )
}
