export type EmployeeFilterStatus = "all" | "active" | "inactive"

type EmployeeSearchable = {
  first_name: string
  last_name: string
  email: string
  department: string | null
  position: string | null
  active: boolean
}

export function normalizeEmployeeFilterStatus(
  value: string | null | undefined,
): EmployeeFilterStatus {
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
  },
) {
  const query = normalizeEmployeeSearchQuery(options.query)
  const status = options.status ?? "all"

  if (status === "active" && !employee.active) {
    return false
  }

  if (status === "inactive" && employee.active) {
    return false
  }

  if (!query) {
    return true
  }

  const haystack = [
    employee.first_name,
    employee.last_name,
    employee.email,
    employee.department ?? "",
    employee.position ?? "",
  ]
    .join(" ")
    .toLowerCase()

  return haystack.includes(query)
}
