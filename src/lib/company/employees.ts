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

  const fields = [
    employee.first_name,
    employee.last_name,
    employee.email,
    employee.department ?? "",
    employee.position ?? "",
  ]

  return fields.some((field) => field.toLowerCase().includes(query))
}

export type EmployeeEditValidation = { ok: true } | { ok: false; error: string }

export function validateEmployeeEdit(input: {
  nombre: string
  apellido: string
  curp: string
}): EmployeeEditValidation {
  if (!input.nombre.trim()) {
    return { ok: false, error: "El nombre es obligatorio." }
  }
  if (!input.apellido.trim()) {
    return { ok: false, error: "El apellido es obligatorio." }
  }
  if (input.curp.trim() && input.curp.trim().length !== 18) {
    return { ok: false, error: "La CURP debe tener 18 caracteres." }
  }
  return { ok: true }
}
