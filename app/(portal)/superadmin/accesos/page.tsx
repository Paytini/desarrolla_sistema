import { redirect } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getSuperadminAccesosSnapshot } from "@/lib/dashboard-cache"
import { formatDate, formatDateTime } from "@/lib/format"
import { readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"
import { PageHeader } from "@/components/superadmin/PageHeader"
import { AlertCircle, CheckCircle2 } from "lucide-react"
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

  const rhActivos = rhUsers.filter((u) => u.activo).length
  const empleadosActivos = employees.filter((e) => e.activo).length
  const suspendidos = rhUsers.filter((u) => !u.activo).length + employeeUsers.filter((u) => !u.activo).length

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="SuperAdmin · Sistema"
        title="Control de accesos"
        description="Administra usuarios RH, empleados activos y suspensiones."
      />

      {/* Alerts */}
      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle2 className="size-4" />
          <AlertDescription>{successMessages[success] ?? success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{errorMessages[error] ?? error}</AlertDescription>
        </Alert>
      )}

      {/* KPI bar */}
      <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-200 bg-white lg:grid-cols-4 lg:divide-y-0">
        {[
          { label: "Usuarios RH activos",    value: String(rhActivos),                         sub: "Administradores de empresa" },
          { label: "Empleados activos",       value: String(empleadosActivos),                   sub: "Con acceso vigente" },
          { label: "Cuentas suspendidas",     value: String(suspendidos),                        sub: "RH + empleados inactivos" },
          { label: "Cuentas empleado",        value: String(employeeUsers.length),               sub: "Registradas en el portal" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="px-6 py-5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p>
            <p className="mt-2 text-[36px] font-semibold leading-none tabular-nums text-slate-950">{value}</p>
            <p className="mt-1.5 text-[12px] text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rh">
        <TabsList className="h-9">
          <TabsTrigger value="rh" className="text-[13px]">
            Usuarios RH{" "}
            <Badge variant="secondary" className="ml-2 text-[11px]">
              {rhUsers.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="empleados" className="text-[13px]">
            Empleados{" "}
            <Badge variant="secondary" className="ml-2 text-[11px]">
              {employees.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* RH tab */}
        <TabsContent value="rh" className="mt-4">
          <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-6 py-4">
              <p className="text-[14px] font-medium text-slate-900">Usuarios RH por empresa</p>
              <p className="text-[12px] text-slate-400">
                Pausa o reactiva accesos sin necesidad de eliminar la cuenta.
              </p>
            </div>
            {rhUsers.length === 0 ? (
              <div className="py-16 text-center text-[13px] text-slate-400">
                Aún no hay usuarios RH registrados.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Nombre
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Empresa
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Usuario
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Empresa
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Último acceso
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Cupos
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Alta
                    </TableHead>
                    <TableHead className="text-right text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Acción
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rhUsers.map((user) => (
                    <TableRow key={user.id} className="h-12">
                      <TableCell>
                        <div>
                          <p className="text-[13px] font-medium text-slate-900">{user.nombre}</p>
                          <p className="text-[11px] text-slate-400">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-[13px] text-slate-700">{user.empresa?.nombre ?? "—"}</p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            user.activo
                              ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-50"
                              : "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-100"
                          }
                        >
                          {user.activo ? "Activo" : "Suspendido"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            user.empresa?.activo
                              ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50"
                              : "border-red-200 bg-red-50 text-red-600 hover:bg-red-50"
                          }
                        >
                          {user.empresa?.activo ? "Activa" : "Suspendida"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-[12px] text-slate-500">
                          {formatDateTime(user.ultimo_acceso)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[12px] text-slate-500">
                          {user.empresa
                            ? `${user.empresa.asientos_usados}/${user.empresa.asientos_contratados}`
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[12px] text-slate-400">{formatDate(user.created_at)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <form action={toggleRhUserStatusAction}>
                          <input type="hidden" name="user_id" value={user.id} />
                          <Button
                            size="sm"
                            type="submit"
                            className="h-7 px-2.5 text-[12px]"
                            style={
                              user.activo
                                ? { background: "#0f172a", color: "#fff" }
                                : { background: "#3730a3", color: "#fff" }
                            }
                          >
                            {user.activo ? "Suspender" : "Reactivar"}
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* Empleados tab */}
        <TabsContent value="empleados" className="mt-4">
          <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-6 py-4">
              <p className="text-[14px] font-medium text-slate-900">Empleados del portal</p>
              <p className="text-[12px] text-slate-400">
                Elimina accesos cuando sea necesario liberar una cuenta.
              </p>
            </div>
            {employees.length === 0 ? (
              <div className="py-16 text-center text-[13px] text-slate-400">
                Aún no hay empleados registrados.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Empleado
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Empresa
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Estado
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Portal
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      WP ID
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Último acceso
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Alta
                    </TableHead>
                    <TableHead className="text-right text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Acción
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => {
                    const portalUser = employeeUserByEmail.get(emp.email.toLowerCase())
                    return (
                      <TableRow key={emp.id} className="h-12">
                        <TableCell>
                          <div>
                            <p className="text-[13px] font-medium text-slate-900">
                              {emp.nombre} {emp.apellido}
                            </p>
                            <p className="text-[11px] text-slate-400">{emp.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-[13px] text-slate-700">{emp.empresa.nombre}</p>
                            <Badge
                              className={
                                emp.empresa.activo
                                  ? "mt-0.5 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50"
                                  : "mt-0.5 border-red-200 bg-red-50 text-red-600 hover:bg-red-50"
                              }
                            >
                              {emp.empresa.activo ? "Activa" : "Suspendida"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              emp.activo
                                ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-50"
                                : "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-100"
                            }
                          >
                            {emp.activo ? "Activo" : "Suspendido"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {portalUser ? (
                            <Badge
                              className={
                                portalUser.activo
                                  ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-50"
                                  : "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-100"
                              }
                            >
                              {portalUser.activo ? "Activo" : "Suspendido"}
                            </Badge>
                          ) : (
                            <span className="text-[12px] text-slate-400">Sin cuenta</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-[12px] text-slate-500">
                            {emp.wp_user_id ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-[12px] text-slate-500">
                            {formatDateTime(portalUser?.ultimo_acceso)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-[12px] text-slate-400">{formatDate(emp.created_at)}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <form action={deleteEmployeeAsSuperAdminAction}>
                            <input type="hidden" name="empleado_id" value={emp.id} />
                            <Button variant="destructive" size="sm" type="submit" className="h-7 px-2.5 text-[12px]">
                              Eliminar
                            </Button>
                          </form>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
