export type EmployeeFilterStatus = "all" | "active" | "inactive"

type EmployeeSearchable = {
  nombre: string
  apellido: string
  email: string
  departamento: string | null
  puesto: string | null
  activo: boolean
}

export function normalizeEmployeeFilterStatus(value: string | null | undefined): EmployeeFilterStatus {
  if (value === "active" || value === "inactive") {
    return value
  }

  return "all"
}

export function normalizeEmployeeSearchQuery(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase()
}

export function matchesEmployeeFilters(
  employee: EmployeeSearchable,
  options: {
    query?: string | null | undefined
    status?: EmployeeFilterStatus
  }
) {
  const query = normalizeEmployeeSearchQuery(options.query)
  const status = options.status ?? "all"

  if (status === "active" && !employee.activo) {
    return false
  }

  if (status === "inactive" && employee.activo) {
    return false
  }

  if (!query) {
    return true
  }

  const haystack = [
    employee.nombre,
    employee.apellido,
    employee.email,
    employee.departamento ?? "",
    employee.puesto ?? "",
  ]
    .join(" ")
    .toLowerCase()

  return haystack.includes(query)
}
