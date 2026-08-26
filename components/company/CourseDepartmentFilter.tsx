"use client"

import { useRouter } from "next/navigation"

type CourseDepartmentFilterProps = {
  departments: string[]
  selected: string
  basePath: string
}

export function CourseDepartmentFilter({
  departments,
  selected,
  basePath,
}: CourseDepartmentFilterProps) {
  const router = useRouter()

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value
    router.push(value ? `${basePath}?departamento=${encodeURIComponent(value)}` : basePath)
  }

  return (
    <select
      value={selected}
      onChange={handleChange}
      aria-label="Filtrar por departamento"
      className="rounded-lg border border-portal-border px-3 py-2 text-sm text-slate-600 outline-none"
    >
      <option value="">Todos los departamentos</option>
      {departments.map((department) => (
        <option key={department} value={department}>
          {department}
        </option>
      ))}
    </select>
  )
}
