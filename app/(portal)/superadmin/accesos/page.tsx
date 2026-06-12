import { redirect } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConfirmIconButton } from "@/components/ui/confirm-icon-button"
import { DismissibleAlert } from "@/components/ui/dismissible-alert"
import { getInitials } from "@/components/portal/nav-config"
import { getSuperadminAccesosSnapshot } from "@/lib/dashboard-cache"
import { formatDate, formatDateTime } from "@/lib/format"
import { readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle2, Pause, Play, Trash2, Users, UserX, type LucideIcon } from "lucide-react"
import {
  deleteEmployeeAsSuperAdminAction,
  toggleRhUserStatusAction,
} from "./actions"

const successMessages: Record<string, string> = {
  rh_suspendido: "Usuario RH suspendido.",
  rh_activado: "Usuario RH reactivado.",
  empleado_eliminado: "Empleado eliminado del portal.",
}
const errorMessages: Record<string, string> = {
  usuario: "No fue posible actualizar el usuario.",
  empleado: "No fue posible eliminar el empleado.",
}

const thClass = "text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/70"

function StatusBadge({
  active,
  activeLabel,
  inactiveLabel,
  className,
}: {
  active: boolean
  activeLabel: string
  inactiveLabel: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600",
        className
      )}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  )
}

function RowIdentity({ name, email, avatarLabel }: { name: string; email: string; avatarLabel: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[12px] font-bold text-brand">
        {getInitials(avatarLabel)}
      </div>
      <div>
        <p className="text-[13px] font-medium text-foreground">{name}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{email}</p>
      </div>
    </div>
  )
}

function CuposRing({ usados, contratados }: { usados: number; contratados: number }) {
  if (contratados <= 0) {
    return <span className="text-[12px] text-muted-foreground">—</span>
  }
  const pct = Math.min(100, Math.round((usados / contratados) * 100))
  const size = 32
  const stroke = 3
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct / 100)
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="stroke-muted" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-brand"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <p className="text-[11px] text-muted-foreground">
        {usados}/{contratados}
      </p>
    </div>
  )
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="font-[family-name:var(--font-heading)] text-[16px] font-semibold text-foreground">
        {title}
      </h2>
      <div className="mt-1.5 mb-2 h-0.5 w-6 bg-brand" />
      <p className="text-[12px] text-muted-foreground">{description}</p>
    </div>
  )
}

function EmptyState({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon size={20} className="text-muted-foreground/40" />
      </div>
      <p className="text-[13px] text-muted-foreground">{label}</p>
    </div>
  )
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function SuperAdminAccesosPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")

  const { rhUsers, employeeUsers, employees } = await getSuperadminAccesosSnapshot()

  const employeeUserByEmail = new Map(
    employeeUsers.map((u) => [u.email.toLowerCase(), u])
  )

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          SuperAdmin · Sistema
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-heading)] text-[28px] font-bold leading-tight text-foreground">
          Control de accesos
        </h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Administra usuarios RH, empleados activos y suspensiones.
        </p>
      </div>

      {/* Alerts */}
      {success && (
        <DismissibleAlert icon={<CheckCircle2 className="size-4" />} className="border-green-200 bg-green-50 text-green-800">
          {successMessages[success] ?? success}
        </DismissibleAlert>
      )}
      {error && (
        <DismissibleAlert icon={<AlertCircle className="size-4" />} variant="destructive">
          {errorMessages[error] ?? error}
        </DismissibleAlert>
      )}

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        {/* Tabs */}
        <Tabs defaultValue="rh">
          <TabsList variant="line">
            <TabsTrigger value="rh" className="after:bg-brand">
              Usuarios RH <span className="text-muted-foreground/70">({rhUsers.length})</span>
            </TabsTrigger>
            <TabsTrigger value="empleados" className="after:bg-brand">
              Empleados <span className="text-muted-foreground/70">({employees.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* RH tab */}
          <TabsContent value="rh" className="mt-6 space-y-4">
            <SectionHeader
              title="Usuarios RH por empresa"
              description="Pausa o reactiva accesos sin necesidad de eliminar la cuenta."
            />

            {rhUsers.length === 0 ? (
              <EmptyState icon={Users} label="Aún no hay usuarios RH registrados." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-transparent">
                    <TableHead className={thClass}>Nombre</TableHead>
                    <TableHead className={thClass}>Empresa</TableHead>
                    <TableHead className={thClass}>Estado</TableHead>
                    <TableHead className={thClass}>Último acceso</TableHead>
                    <TableHead className={thClass}>Cupos</TableHead>
                    <TableHead className={thClass}>Alta</TableHead>
                    <TableHead className={cn(thClass, "text-right")}>Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rhUsers.map((user) => (
                    <TableRow key={user.id} className="border-border/60 hover:bg-muted/30">
                      <TableCell className="px-3 py-4">
                        <RowIdentity name={user.nombre} email={user.email} avatarLabel={user.nombre} />
                      </TableCell>
                      <TableCell className="px-3 py-4">
                        <p className="text-[13px] text-foreground">{user.empresa?.nombre ?? "—"}</p>
                      </TableCell>
                      <TableCell className="px-3 py-4">
                        <StatusBadge active={user.activo} activeLabel="Activo" inactiveLabel="Suspendido" />
                      </TableCell>
                      <TableCell className="px-3 py-4">
                        <span className="text-[12px] text-muted-foreground">
                          {formatDateTime(user.ultimo_acceso)}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-4">
                        {user.empresa ? (
                          <CuposRing
                            usados={user.empresa.asientos_usados}
                            contratados={user.empresa.asientos_contratados}
                          />
                        ) : (
                          <span className="text-[12px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-4">
                        <span className="text-[12px] text-muted-foreground">{formatDate(user.created_at)}</span>
                      </TableCell>
                      <TableCell className="px-3 py-4 text-right">
                        <ConfirmIconButton
                          tone={user.activo ? "outline" : "brand"}
                          icon={user.activo ? <Pause size={14} /> : <Play size={14} />}
                          label={user.activo ? "Suspender" : "Reactivar"}
                          title={user.activo ? `¿Suspender a ${user.nombre}?` : `¿Reactivar a ${user.nombre}?`}
                          description={
                            user.activo
                              ? "El usuario perderá acceso al portal de inmediato."
                              : "El usuario recuperará acceso al portal de inmediato."
                          }
                          confirmLabel={user.activo ? "Sí, suspender" : "Sí, reactivar"}
                          action={toggleRhUserStatusAction}
                          hiddenFields={{ user_id: user.id }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* Empleados tab */}
          <TabsContent value="empleados" className="mt-6 space-y-4">
            <SectionHeader
              title="Empleados del portal"
              description="Elimina accesos cuando sea necesario liberar una cuenta."
            />

            {employees.length === 0 ? (
              <EmptyState icon={UserX} label="Aún no hay empleados registrados." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-transparent">
                    <TableHead className={thClass}>Empleado</TableHead>
                    <TableHead className={thClass}>Empresa</TableHead>
                    <TableHead className={thClass}>Estado</TableHead>
                    <TableHead className={thClass}>Portal</TableHead>
                    <TableHead className={thClass}>WP ID</TableHead>
                    <TableHead className={thClass}>Último acceso</TableHead>
                    <TableHead className={thClass}>Alta</TableHead>
                    <TableHead className={cn(thClass, "text-right")}>Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => {
                    const portalUser = employeeUserByEmail.get(emp.email.toLowerCase())
                    return (
                      <TableRow key={emp.id} className="border-border/60 hover:bg-muted/30">
                        <TableCell className="px-3 py-4">
                          <RowIdentity
                            name={`${emp.nombre} ${emp.apellido}`}
                            email={emp.email}
                            avatarLabel={`${emp.nombre} ${emp.apellido}`}
                          />
                        </TableCell>
                        <TableCell className="px-3 py-4">
                          <p className="text-[13px] text-foreground">{emp.empresa.nombre}</p>
                        </TableCell>
                        <TableCell className="px-3 py-4">
                          <StatusBadge active={emp.activo} activeLabel="Activo" inactiveLabel="Suspendido" />
                        </TableCell>
                        <TableCell className="px-3 py-4">
                          {portalUser ? (
                            <StatusBadge active={portalUser.activo} activeLabel="Activo" inactiveLabel="Suspendido" />
                          ) : (
                            <span className="text-[12px] text-muted-foreground">Sin cuenta</span>
                          )}
                        </TableCell>
                        <TableCell className="px-3 py-4">
                          <span className="font-mono text-[12px] text-muted-foreground">
                            {emp.wp_user_id ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-4">
                          <span className="text-[12px] text-muted-foreground">
                            {formatDateTime(portalUser?.ultimo_acceso)}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-4">
                          <span className="text-[12px] text-muted-foreground">{formatDate(emp.created_at)}</span>
                        </TableCell>
                        <TableCell className="px-3 py-4 text-right">
                          <ConfirmIconButton
                            tone="outline-destructive"
                            icon={<Trash2 size={14} />}
                            label="Eliminar"
                            title={`¿Eliminar a ${emp.nombre} ${emp.apellido}?`}
                            description="Esta acción eliminará al empleado del portal y también intentará remover su usuario en WordPress/Tutor LMS."
                            confirmLabel="Sí, eliminar"
                            action={deleteEmployeeAsSuperAdminAction}
                            hiddenFields={{ empleado_id: emp.id }}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
