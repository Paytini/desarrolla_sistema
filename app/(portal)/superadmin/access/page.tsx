import { redirect } from "next/navigation"
import { Stack } from "@mui/material"
import { DismissibleAlert } from "@/components/shared/DismissibleAlert"
import { EMPLOYEES_ACCESS_PAGE_SIZE, getSuperadminAccessSnapshot } from "@/lib/dashboard-cache"
import { formatDate, formatDateTime } from "@/lib/format"
import { readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"
import { AccessTabs, type EmployeeAccessRow, type HrAccessRow } from "@/components/superadmin/AccessTabs"
import { PageHeader } from "@/components/shared/PageHeader"

const successMessages: Record<string, string> = {
  hr_suspendido: "Usuario HR suspendido.",
  hr_activado: "Usuario HR reactivado.",
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
  if (!session || session.user.role !== "SUPERADMIN") redirect("/login")

  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")
  const tab = readSearchParam(params, "tab") === "employees" ? "employees" : "hr"
  const q = readSearchParam(params, "q")?.toLowerCase() ?? ""
  const page = Math.max(1, Number(readSearchParam(params, "page") ?? "1"))

  const { hrUsers, employeeUsers, employees, total: employeesTotal, grandTotal: employeesGrandTotal } =
    await getSuperadminAccessSnapshot(q, page)
  const employeesTotalPages = Math.max(1, Math.ceil(employeesTotal / EMPLOYEES_ACCESS_PAGE_SIZE))
  const employeesCurrentPage = Math.min(page, employeesTotalPages)

  const employeeUserByEmail = new Map(employeeUsers.map((u) => [u.email.toLowerCase(), u]))

  const hrRows: HrAccessRow[] = hrUsers.map((user) => ({
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
        description="Administra usuarios HR, empleados activos y suspensiones."
      />

      {success && (
        <DismissibleAlert severity="success">
          {successMessages[success] ?? success}
        </DismissibleAlert>
      )}
      {error && (
        <DismissibleAlert severity="error">
          {errorMessages[error] ?? error}
        </DismissibleAlert>
      )}

      <AccessTabs
        hrUsers={hrRows}
        employees={employeeRows}
        defaultTab={tab}
        employeeSearch={q}
        employeesGrandTotal={employeesGrandTotal}
        employeePagination={{
          currentPage: employeesCurrentPage,
          totalPages: employeesTotalPages,
          totalResults: employeesTotal,
        }}
      />
    </Stack>
  )
}
