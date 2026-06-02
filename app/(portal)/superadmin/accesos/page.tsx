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
import { AlertCircle, CheckCircle2, ShieldCheck, UserX, Users } from "lucide-react"
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

  const stats = [
    { label: "Usuarios RH activos", value: String(rhActivos), sub: "Administradores de empresa", icon: ShieldCheck, color: "#F5853F" },
    { label: "Empleados activos", value: String(empleadosActivos), sub: "Con acceso vigente", icon: Users, color: "#000022" },
    { label: "Cuentas suspendidas", value: String(suspendidos), sub: "RH + empleados", icon: UserX, color: suspendidos > 0 ? "#f43f5e" : "#94a3b8" },
    { label: "Cuentas empleado", value: String(employeeUsers.length), sub: "Registradas en el portal", icon: Users, color: "#000022" },
  ]

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <p className="text-[10.5px] font-bold uppercase tracking-[1.5px]" style={{ color: "#F5853F" }}>SuperAdmin</p>
        <h1 className="mt-0.5 text-[26px] font-bold leading-tight" style={{ color: "#130303" }}>Control de accesos</h1>
        <p className="mt-1 text-sm text-slate-500">Administra usuarios RH, empleados activos y suspensiones.</p>
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

      {/* Stat bar */}
      <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-4 lg:divide-y-0">
        {stats.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-4 px-6 py-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}18` }}>
              <Icon size={18} strokeWidth={2} style={{ color }} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="text-2xl font-bold leading-none" style={{ color: "#130303" }}>{value}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rh">
        <TabsList>
          <TabsTrigger value="rh">
            Usuarios RH <Badge variant="secondary" className="ml-2">{rhUsers.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="empleados">
            Empleados <Badge variant="secondary" className="ml-2">{employees.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rh" className="mt-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white" style={{ boxShadow: "0 1px 3px rgba(0,0,34,0.04)" }}>
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-[15px] font-semibold" style={{ color: "#130303" }}>Usuarios RH por empresa</h2>
              <p className="text-sm text-slate-500">Pausa o reactiva accesos sin buscar en listas.</p>
            </div>
            {rhUsers.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-400">Aún no hay usuarios RH.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Estado usuario</TableHead>
                    <TableHead>Empresa</TableHead>
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
                          <p className="font-medium" style={{ color: "#130303" }}>{user.nombre}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-slate-700">{user.empresa?.nombre ?? "—"}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={user.activo ? "bg-green-50 text-green-700 hover:bg-green-50" : "bg-slate-100 text-slate-500 hover:bg-slate-100"}>
                          {user.activo ? "Activo" : "Suspendido"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={user.empresa?.activo ? "bg-amber-50 text-amber-700 hover:bg-amber-50" : "bg-rose-50 text-rose-700 hover:bg-rose-50"}>
                          {user.empresa?.activo ? "Activa" : "Suspendida"}
                        </Badge>
                      </TableCell>
                      <TableCell><span className="text-xs text-slate-500">{formatDateTime(user.ultimo_acceso)}</span></TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-500">
                          {user.empresa ? `${user.empresa.asientos_usados}/${user.empresa.asientos_contratados}` : "—"}
                        </span>
                      </TableCell>
                      <TableCell><span className="text-xs text-slate-400">{formatDate(user.created_at)}</span></TableCell>
                      <TableCell className="text-right">
                        <form action={toggleRhUserStatusAction}>
                          <input type="hidden" name="user_id" value={user.id} />
                          <Button
                            size="sm"
                            type="submit"
                            className="h-7 px-2.5 text-xs"
                            style={user.activo ? { background: "#130303", color: "#fff" } : { background: "#F5853F", color: "#fff" }}
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

        <TabsContent value="empleados" className="mt-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white" style={{ boxShadow: "0 1px 3px rgba(0,0,34,0.04)" }}>
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-[15px] font-semibold" style={{ color: "#130303" }}>Empleados del portal</h2>
              <p className="text-sm text-slate-500">Elimina accesos cuando sea necesario liberar una cuenta.</p>
            </div>
            {employees.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-400">Aún no hay empleados.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Portal</TableHead>
                    <TableHead>WP ID</TableHead>
                    <TableHead>Último acceso</TableHead>
                    <TableHead>Alta</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => {
                    const portalUser = employeeUserByEmail.get(emp.email.toLowerCase())
                    return (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium" style={{ color: "#130303" }}>{emp.nombre} {emp.apellido}</p>
                            <p className="text-xs text-slate-400">{emp.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm text-slate-700">{emp.empresa.nombre}</p>
                            <Badge className={emp.empresa.activo ? "mt-0.5 bg-amber-50 text-amber-700 hover:bg-amber-50" : "mt-0.5 bg-rose-50 text-rose-700 hover:bg-rose-50"}>
                              {emp.empresa.activo ? "Activa" : "Suspendida"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={emp.activo ? "bg-green-50 text-green-700 hover:bg-green-50" : "bg-slate-100 text-slate-500 hover:bg-slate-100"}>
                            {emp.activo ? "Activo" : "Suspendido"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {portalUser ? (
                            <Badge className={portalUser.activo ? "bg-green-50 text-green-700 hover:bg-green-50" : "bg-slate-100 text-slate-500 hover:bg-slate-100"}>
                              {portalUser.activo ? "Activo" : "Suspendido"}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">Sin cuenta</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-slate-500">{emp.wp_user_id ?? "—"}</span>
                        </TableCell>
                        <TableCell><span className="text-xs text-slate-500">{formatDateTime(portalUser?.ultimo_acceso)}</span></TableCell>
                        <TableCell><span className="text-xs text-slate-400">{formatDate(emp.created_at)}</span></TableCell>
                        <TableCell className="text-right">
                          <form action={deleteEmployeeAsSuperAdminAction}>
                            <input type="hidden" name="empleado_id" value={emp.id} />
                            <Button variant="destructive" size="sm" type="submit" className="h-7 px-2.5 text-xs">
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
