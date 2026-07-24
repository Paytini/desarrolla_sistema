import { redirect } from "next/navigation"
import { Stack } from "@mui/material"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { DismissibleAlert } from "@/components/shared/DismissibleAlert"
import { getSuperadminAccessSnapshot } from "@/lib/dashboard-cache"
import { formatDate, formatDateTime } from "@/lib/format"
import { readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"
import { AccessTabs, type EmployeeAccessRow, type HrAccessRow } from "@/components/superadmin/AccessTabs"
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

export default async function SuperAdminAccessPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")

  const { rhUsers, employeeUsers, employees } = await getSuperadminAccessSnapshot()

  const employeeUserByEmail = new Map(employeeUsers.map((u) => [u.email.toLowerCase(), u]))

  const rhRows: HrAccessRow[] = rhUsers.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    active: user.active,
    companyName: user.company?.name ?? "—",
    lastAccess: formatDateTime(user.last_access),
    createdAt: formatDate(user.created_at),
    usedSeats: user.company?.used_seats ?? null,
    contractedSeats: user.company?.contracted_seats ?? null,
  }))

  const employeeRows: EmployeeAccessRow[] = employees.map((employee) => {
    const portalUser = employeeUserByEmail.get(employee.email.toLowerCase())
    return {
      id: employee.id,
      name: employee.first_name,
      lastName: employee.last_name,
      email: employee.email,
      active: employee.active,
      companyName: employee.company.name,
      wpUserId: employee.wp_user_id,
      createdAt: formatDate(employee.created_at),
      portalActive: portalUser?.active ?? null,
      portalLastAccess: formatDateTime(portalUser?.last_access),
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

      <AccessTabs rhUsers={rhRows} employees={employeeRows} />
    </Stack>
  )
}
