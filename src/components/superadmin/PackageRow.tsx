"use client"

import { useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  Pencil,
} from "lucide-react"

import DeletePackageButton from "@/components/superadmin/DeletePackageButton"
import EyebrowLabel from "@/components/shared/EyebrowLabel"
import { deletePackageAction } from "@/app/(portal)/superadmin/packages/actions"
import { getDc3MissingFields, type Dc3MetadataView } from "@/lib/dc3/fields"
import type { getSuperadminPackagesSnapshot } from "@/lib/dashboard-cache"
import { decodeHtmlEntities, formatDate } from "@/lib/format"

export type Package = Awaited<ReturnType<typeof getSuperadminPackagesSnapshot>>["paquetes"][number]
export type Dc3MetadataByCourseId = Awaited<
  ReturnType<typeof getSuperadminPackagesSnapshot>
>["dc3MetadataByCourseId"]

export function PackageRow({
  pkg,
  dc3Complete,
  dc3Total,
  dc3AllOk,
  companyNames,
  dc3MetadataByCourseId,
}: {
  pkg: Package
  dc3Complete: number
  dc3Total: number
  dc3AllOk: boolean
  companyNames: string[]
  dc3MetadataByCourseId: Dc3MetadataByCourseId
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <tr
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer bg-white transition-colors hover:bg-gray-50"
      >
        <td className="w-8 rounded-l-lg py-3 pl-2">
          <span className="inline-flex size-6 items-center justify-center text-slate-400">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm font-semibold text-slate-950">{pkg.name}</p>
          {pkg.description && (
            <p className="mt-0.5 max-w-[360px] truncate text-[11.5px] text-slate-500">
              {pkg.description}
            </p>
          )}
        </td>
        <td className="hidden px-4 py-3 sm:table-cell">
          <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-slate-100 px-2 text-[11px] text-slate-600">
            <BookOpen size={11} className="text-slate-400" />
            {dc3Total} curso{dc3Total !== 1 ? "s" : ""}
          </span>
        </td>
        <td className="hidden px-4 py-3 md:table-cell">
          <span
            className={`inline-flex h-[22px] max-w-[220px] items-center gap-1 truncate rounded-full px-2 text-[11px] ${
              companyNames.length > 0
                ? "bg-portal-blue-soft text-portal-blue"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            <Building2 size={11} />
            <span className="truncate">
              {companyNames.length > 0 ? companyNames.join(", ") : "Sin asignar"}
            </span>
          </span>
        </td>
        <td className="px-4 py-3">
          {dc3Total > 0 ? (
            <span
              className={`inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-[11px] ${
                dc3AllOk ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"
              }`}
            >
              {dc3AllOk ? (
                <CheckCircle2 size={11} className="text-slate-400" />
              ) : (
                <CircleAlert size={11} className="text-amber-500" />
              )}
              {dc3AllOk ? "Completo" : `${dc3Complete}/${dc3Total}`}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">Sin cursos</span>
          )}
        </td>
        <td className="hidden px-4 py-3 text-xs text-slate-500 lg:table-cell">
          {formatDate(pkg.created_at)}
        </td>
        <td className="rounded-r-lg py-3 pr-2 text-right" onClick={(e) => e.stopPropagation()}>
          <div className="inline-flex items-center gap-0.5">
            <Link
              href={`/superadmin/packages/${pkg.id}/edit`}
              aria-label="Editar paquete"
              className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-gray-100 hover:text-slate-700"
            >
              <Pencil size={14} />
            </Link>
            <DeletePackageButton
              action={deletePackageAction}
              packageId={pkg.id}
              packageName={pkg.name}
              assignedCompaniesCount={pkg.companies.length}
            />
          </div>
        </td>
      </tr>

      {open && (
        <tr>
          <td className="p-0" colSpan={7}>
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              {pkg.operational_notes && (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                  {pkg.operational_notes}
                </div>
              )}

              <EyebrowLabel sx={{ mb: 0.75 }}>Cursos y estado DC-3</EyebrowLabel>

              {pkg.courses.length === 0 ? (
                <p className="py-1 text-xs text-slate-500">
                  Este paquete no tiene cursos asignados.
                </p>
              ) : (
                <div className="overflow-hidden rounded-[10px] border border-slate-200 bg-white">
                  {pkg.courses.map((course, index) => {
                    const dc3Metadata = dc3MetadataByCourseId[String(course.wp_course_id)] as
                      | Dc3MetadataView
                      | undefined
                    const missingCount = getDc3MissingFields(dc3Metadata).length
                    const isDc3Ready = missingCount === 0

                    return (
                      <div
                        key={course.id}
                        className={`flex items-center gap-3 px-3.5 py-2 ${
                          index < pkg.courses.length - 1 ? "border-b border-slate-100" : ""
                        }`}
                      >
                        <span
                          className={`size-[7px] shrink-0 rounded-full ${
                            isDc3Ready ? "bg-portal-blue" : "bg-amber-400"
                          }`}
                        />
                        <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-900">
                          {decodeHtmlEntities(course.course_name ?? "")}
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={`text-[10px] font-semibold ${
                              isDc3Ready ? "text-slate-500" : "text-amber-700"
                            }`}
                          >
                            {isDc3Ready
                              ? "DC-3 ✓"
                              : `${missingCount} pendiente${missingCount !== 1 ? "s" : ""}`}
                          </span>
                          <Link
                            href={`/superadmin/courses?open=${course.wp_course_id}`}
                            className="flex text-slate-300 hover:text-slate-500"
                          >
                            <ExternalLink size={12} />
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <p className="mt-2.5 text-[11px] text-slate-400">
                {pkg.delivery_mode === "PRIVATE_BUNDLE_REFERENCE"
                  ? "Bundle privado"
                  : "Matrícula directa"}
                {pkg.wp_bundle_id ? ` · WP #${pkg.wp_bundle_id}` : ""}
              </p>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
