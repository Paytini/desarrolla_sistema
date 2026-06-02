import { redirect } from "next/navigation"
import PageHeader from "@/components/portal/PageHeader"
import StatusNotice from "@/components/portal/StatusNotice"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getSuperadminAccesosSnapshot } from "@/lib/dashboard-cache"
import { formatDate, formatDateTime } from "@/lib/format"
import { readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"
import { AlertCircle, CheckCircle2, ShieldCheck, UserX, Users } from "lucide-react"
import {
  deleteEmployeeAsSuperAdminAction,
  toggleRhUserStatusAction,
} from "./actions"

const successMessages: Record<string, string> = {
  rh_suspendido: "El usuario RH fue suspendido correctamente.",
  rh_activado: "El usuario RH fue reactivado correctamente.",
  empleado_eliminado: "El empleado se eliminó del portal.",
}

const errorMessages: Record<string, string> = {
  usuario: "No fue posible actualizar el usuario solicitado.",
  empleado: "No fue posible eliminar el empleado solicitado.",
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
  const usuariosSuspendidos =
    rhUsers.filter((u) => !u.activo).length +
    employeeUsers.filter((u) => !u.activo).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">SuperAdmin</p>
        <h1 className="text-2xl font-bold text-slate-950">Control de accesos</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Administra usuarios RH, empleados activos y suspensiones por empresa.
        </p>
      </div>

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

      {/* KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Usuarios RH activos", value: rhActivos, sub: "Administradores de empresa", icon: ShieldCheck, cls: "bg-[#fff2eb] text-[#F5853F]" },
          { label: "Empleados activos", value: empleadosActivos, sub: "Con acceso vigente al portal", icon: Users, cls: "bg-teal-50 text-teal-600" },
          { label: "Cuentas suspendidas", value: usuariosSuspendidos, sub: "RH + empleados inhabilitados", icon: UserX, cls: usuariosSuspendidos > 0 ? "bg-rose-50 text-rose-500" : "bg-slate-100 text-slate-500" },
          { label: "Cuentas empleado", value: employeeUsers.length, sub: "Registradas en el portal", icon: Users, cls: "bg-slate-100 text-slate-600" },
        ].map(({ label, value, sub, icon: Icon, cls }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-3xl font-bold text-slate-950">{value}</p>
                  <p className="mt-1 text-xs text-slate-500">{sub}</p>
                </div>
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${cls}`}>
                  <Icon size={16} strokeWidth={2} />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rh">
        <TabsList className="mb-4">
          <TabsTrigger value="rh">
            Usuarios RH
            <Badge variant="secondary" className="ml-2">{rhUsers.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="empleados">
            Empleados
            <Badge variant="secondary" className="ml-2">{employees.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* RH Users Tab */}
        <TabsContent value="rh">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px]">Usuarios RH por empresa</CardTitle>
              <CardDescription>
                Pausa o reactiva accesos RH sin recorrer una lista interminable.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {rhUsers.length === 0 ? (
                <div className="px-6 pb-6">
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
                    <ShieldCheck size={28} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-sm text-slate-400">Aún no hay usuarios RH registrados.</p>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Último acceso</TableHead>
                      <TableHead>Cupos</TableHead>
                      <TableHead>Alta</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rhUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-950">{user.nombre}</p>
                            <p className="text-xs text-slate-400">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm text-slate-700">{user.empresa?.nombre ?? "—"}</p>
                            <Badge
                              className={
                                user.empresa?.activo
                                  ? "mt-0.5 bg-amber-50 text-amber-700 hover:bg-amber-50"
                                  : "mt-0.5 bg-rose-50 text-rose-700 hover:bg-rose-50"
                              }
                            >
                              {user.empresa?.activo ? "Empresa activa" : "Empresa suspendida"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              user.activo
                                ? "bg-green-50 text-green-700 hover:bg-green-50"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-100"
                            }
                          >
                            {user.activo ? "Activo" : "Suspendido"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-slate-500">{formatDateTime(user.ultimo_acceso)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-slate-500">
                            {user.empresa
                              ? `${user.empresa.asientos_usados}/${user.empresa.asientos_contratados}`
                              : "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-slate-400">{formatDate(user.created_at)}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <form action={toggleRhUserStatusAction}>
                            <input type="hidden" name="user_id" value={user.id} />
                            <Button
                              variant={user.activo ? "destructive" : "default"}
                              size="sm"
                              type="submit"
                              className={user.activo ? "" : "bg-[#F5853F] hover:bg-[#D96B20]"}
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employees Tab */}
        <TabsContent value="empleados">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px]">Empleados del portal</CardTitle>
              <CardDescription>
                Revisa empleados por empresa y elimina accesos cuando sea necesario.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {employees.length === 0 ? (
                <div className="px-6 pb-6">
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
                    <Users size={28} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-sm text-slate-400">Aún no hay empleados registrados.</p>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Portal</TableHead>
                      <TableHead>WP user ID</TableHead>
                      <TableHead>Último acceso</TableHead>
                      <TableHead>Alta</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((empleado) => {
                      const portalUser = employeeUserByEmail.get(empleado.email.toLowerCase())
                      return (
                        <TableRow key={empleado.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-950">
                                {empleado.nombre} {empleado.apellido}
                              </p>
                              <p className="text-xs text-slate-400">{empleado.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm text-slate-700">{empleado.empresa.nombre}</p>
                              <Badge
                                className={
                                  empleado.empresa.activo
                                    ? "mt-0.5 bg-amber-50 text-amber-700 hover:bg-amber-50"
                                    : "mt-0.5 bg-rose-50 text-rose-700 hover:bg-rose-50"
                                }
                              >
                                {empleado.empresa.activo ? "Empresa activa" : "Suspendida"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                empleado.activo
                                  ? "bg-green-50 text-green-700 hover:bg-green-50"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-100"
                              }
                            >
                              {empleado.activo ? "Activo" : "Suspendido"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {portalUser ? (
                              <Badge
                                className={
                                  portalUser.activo
                                    ? "bg-green-50 text-green-700 hover:bg-green-50"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-100"
                                }
                              >
                                {portalUser.activo ? "Activo" : "Suspendido"}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400">Sin cuenta</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs text-slate-500">
                              {empleado.wp_user_id ?? <span className="text-slate-300">—</span>}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-slate-500">
                              {formatDateTime(portalUser?.ultimo_acceso)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-slate-400">{formatDate(empleado.created_at)}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <form action={deleteEmployeeAsSuperAdminAction}>
                              <input type="hidden" name="empleado_id" value={empleado.id} />
                              <Button variant="destructive" size="sm" type="submit">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
