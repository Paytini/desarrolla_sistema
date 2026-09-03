"use client"

import { useRouter } from "next/navigation"

type CompanyOption = {
  id: string
  name: string
}

type AreaOption = {
  id: string
  label: string
}

type ConsultingFiltersProps = {
  companies: CompanyOption[]
  areas: AreaOption[]
  selectedCompany: string
  selectedArea: string
  basePath: string
}

export function ConsultingFilters({
  companies,
  areas,
  selectedCompany,
  selectedArea,
  basePath,
}: ConsultingFiltersProps) {
  const router = useRouter()

  function navigate(company: string, area: string) {
    const searchParams = new URLSearchParams()
    if (company) searchParams.set("empresa", company)
    if (area) searchParams.set("area", area)
    const serialized = searchParams.toString()
    router.push(serialized ? `${basePath}?${serialized}` : basePath)
  }

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={selectedCompany}
        onChange={(event) => navigate(event.target.value, selectedArea)}
        aria-label="Filtrar por empresa"
        className="rounded-lg border border-portal-border px-3 py-2 text-sm text-slate-600 outline-none"
      >
        <option value="">Todas las empresas</option>
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>

      <select
        value={selectedArea}
        onChange={(event) => navigate(selectedCompany, event.target.value)}
        aria-label="Filtrar por área"
        className="rounded-lg border border-portal-border px-3 py-2 text-sm text-slate-600 outline-none"
      >
        <option value="">Todas las áreas</option>
        {areas.map((area) => (
          <option key={area.id} value={area.id}>
            {area.label}
          </option>
        ))}
      </select>
    </div>
  )
}
