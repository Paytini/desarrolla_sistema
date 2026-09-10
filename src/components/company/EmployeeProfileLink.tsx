"use client"

import Tooltip from "@mui/material/Tooltip"
import { Eye } from "lucide-react"
import Link from "next/link"

import { companyPath } from "@/lib/company/routes"

export default function EmployeeProfileLink({
  slug,
  employeeId,
  employeeName,
}: {
  slug: string
  employeeId: string
  employeeName: string
}) {
  return (
    <Tooltip title="Ver perfil">
      <Link
        href={companyPath(slug, `/employees/${employeeId}`)}
        aria-label={`Ver perfil de ${employeeName}`}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] text-slate-500 transition hover:bg-gray-100 hover:text-slate-700"
      >
        <Eye size={18} strokeWidth={2} />
      </Link>
    </Tooltip>
  )
}
