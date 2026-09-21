import Link from "next/link"
import { Eye } from "lucide-react"

import { SeatDonut } from "@/components/superadmin/SeatDonut"
import { SuspendCompanyButton } from "@/components/superadmin/SuspendCompanyButton"
import StatusBadge from "@/components/shared/StatusBadge"
import type { getSuperadminCompaniesListSnapshot } from "@/lib/dashboard-cache"
import { formatDate } from "@/lib/format"

type Company = Awaited<ReturnType<typeof getSuperadminCompaniesListSnapshot>>["companies"][number]

export function CompanyRow({ company, index }: { company: Company; index: number }) {
  const packageName = company.packages[0]?.package?.name ?? "—"
  const activeEmployeesCount = company._count.employees

  return (
    <tr
      className={
        index % 2 === 0
          ? "bg-white transition-colors hover:bg-slate-100"
          : "bg-slate-50 transition-colors hover:bg-slate-100"
      }
    >
      <td className="rounded-l-lg py-3 pl-4 text-sm text-slate-400">
        {String(index + 1).padStart(2, "0")}
      </td>
      <td className="min-w-0 py-3">
        <p className="truncate text-base font-medium text-slate-950">{company.name}</p>
        <p className="truncate text-xs text-slate-500">{company.hr_email}</p>
      </td>

      <td className="hidden px-4 py-3 font-mono text-sm text-slate-500 sm:table-cell">
        {company.rfc ?? "—"}
      </td>

      <td className="hidden px-4 py-3 md:table-cell">
        <span className="inline-flex h-6 items-center rounded-full bg-slate-100 px-2 text-xs text-slate-600">
          {packageName}
        </span>
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <SeatDonut used={activeEmployeesCount} total={company.contracted_seats} size={48} />
          <span className="text-sm font-medium text-slate-900">
            {activeEmployeesCount}
            <span className="text-slate-500">/{company.contracted_seats}</span>
          </span>
        </div>
      </td>

      <td className="hidden px-4 py-3 text-sm text-slate-500 lg:table-cell">
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
            aria-label={`Ver ${company.name}`}
            className="inline-flex size-8 items-center justify-center rounded-lg text-blue-500 transition hover:bg-blue-50"
          >
            <Eye size={16} strokeWidth={2} />
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
