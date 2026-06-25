import { redirect } from "next/navigation"
import { Stack } from "@mui/material"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { DismissibleAlert } from "@/components/shared/DismissibleAlert"
import { getSuperadminAccesosSnapshot } from "@/lib/dashboard-cache"
import { formatDate, formatDateTime } from "@/lib/format"
import { readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"
import { AccesosTabs, type EmployeeAccessRow, type RhAccessRow } from "@/components/superadmin/AccesosTabs"
import { PageHeader } from "@/components/shared/PageHeader"

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

  const employeeUserByEmail = new Map(employeeUsers.map((u) => [u.email.toLowerCase(), u]))

  const rhRows: RhAccessRow[] = rhUsers.map((user) => ({
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    activo: user.activo,
    empresaNombre: user.empresa?.nombre ?? "—",
    ultimoAcceso: formatDateTime(user.ultimo_acceso),
    altaFecha: formatDate(user.created_at),
    cuposUsados: user.empresa?.asientos_usados ?? null,
    cuposContratados: user.empresa?.asientos_contratados ?? null,
  }))

  const employeeRows: EmployeeAccessRow[] = employees.map((emp) => {
    const portalUser = employeeUserByEmail.get(emp.email.toLowerCase())
    return {
      id: emp.id,
      nombre: emp.nombre,
      apellido: emp.apellido,
      email: emp.email,
      activo: emp.activo,
      empresaNombre: emp.empresa.nombre,
      wpUserId: emp.wp_user_id,
      altaFecha: formatDate(emp.created_at),
      portalActivo: portalUser?.activo ?? null,
      portalUltimoAcceso: formatDateTime(portalUser?.ultimo_acceso),
    }
  })

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Control de accesos"
        description="Administra usuarios RH, empleados activos y suspensiones."
      />

      {success && (
        <DismissibleAlert icon={<CheckCircle2 size={16} />} severity="success">
          {successMessages[success] ?? success}
        </DismissibleAlert>
      )}
      {error && (
        <DismissibleAlert icon={<AlertCircle size={16} />} severity="error">
          {errorMessages[error] ?? error}
        </DismissibleAlert>
      )}

      <AccesosTabs rhUsers={rhRows} employees={employeeRows} />
    </Stack>
  )
}
