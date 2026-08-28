import Link from "next/link"
import { ExternalLink } from "lucide-react"

import { SeatDonut } from "@/components/superadmin/SeatDonut"
import { SuspendCompanyButton } from "@/components/superadmin/SuspendCompanyButton"
import StatusBadge from "@/components/shared/StatusBadge"
import type { getSuperadminCompaniesSnapshot } from "@/lib/dashboard-cache"
import { formatDate } from "@/lib/format"

type Company = Awaited<ReturnType<typeof getSuperadminCompaniesSnapshot>>["empresas"][number]

export function CompanyRow({ company }: { company: Company }) {
  const packageName = company.packages[0]?.package?.name ?? "—"
  const activeEmployeesCount = company.employees.filter((e) => e.active).length

  return (
    <tr className="bg-white transition-colors hover:bg-gray-50">
      <td className="min-w-0 rounded-l-lg py-3 pl-4">
        <p className="truncate text-sm font-medium text-slate-950">{company.name}</p>
        <p className="truncate text-[11px] text-slate-500">{company.hr_email}</p>
      </td>

      <td className="hidden px-4 py-3 font-mono text-xs text-slate-500 sm:table-cell">
        {company.rfc ?? "—"}
      </td>

      <td className="hidden px-4 py-3 md:table-cell">
        <span className="inline-flex h-5 items-center rounded-full bg-slate-100 px-2 text-[11px] text-slate-600">
          {packageName}
        </span>
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <SeatDonut used={activeEmployeesCount} total={company.contracted_seats} size={48} />
          <span className="text-xs font-medium text-slate-900">
            {activeEmployeesCount}
            <span className="text-slate-500">/{company.contracted_seats}</span>
          </span>
        </div>
      </td>

      <td className="hidden px-4 py-3 text-xs text-slate-500 lg:table-cell">
        {formatDate(company.created_at)}
      </td>

      <td className="px-4 py-3">
        <StatusBadge variant={company.active ? "green" : "red"} dot>
          {company.active ? "Activa" : "Suspendida"}
        </StatusBadge>
      </td>

      <td className="rounded-r-lg py-3 pr-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/superadmin/companies/${company.id}`}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
          >
            <ExternalLink size={11} strokeWidth={2} />
            Ver
          </Link>
          <SuspendCompanyButton
            companyId={company.id}
            active={company.active}
            name={company.name}
          />
        </div>
      </td>
    </tr>
  )
}
